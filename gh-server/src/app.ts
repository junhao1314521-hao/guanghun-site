import compression from 'compression'
import cors from 'cors'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { logger } from './lib/logger'
import { requestLog } from './lib/observability'
import { rateLimit } from './lib/rateLimit'
import { ensureUploadDir } from './data/uploadStore'
import { syncMediaMeta } from './data/mediaStore'
import { hiddenUploadIds } from './data/trashStore'
import { startScheduler } from './data/publishScheduler'
import { registerRoutes } from './routes'

/**
 * 构建 Express 应用。
 * 约定（对齐《光魂官网 · 后端接口契约 v1》）：
 * - 响应体直接返回数据本身，不做 { code, data } 包装；
 * - 未命中的资源返回 404；
 * - 其余异常由统一错误处理返回 500（开发环境附带 message）。
 *
 * 可选静态托管：设置环境变量 `STATIC_DIR` 指向前端构建目录（如 `gh-web/dist`），
 * 即同时托管前端产物并启用 SPA 路由回退（history fallback，深链直达）；
 * 未设置时保持「纯 API」行为不变。
 */
export function createApp(): Express {
  const app = express()

  app.disable('x-powered-by')

  // 反向代理可信度：生产置于 Nginx / CDN 之后时设 TRUST_PROXY=1，使协议 / 客户端 IP 判定正确
  const trustProxy = process.env.TRUST_PROXY === '1'
  if (trustProxy) app.set('trust proxy', 1)

  // 请求可观测性：分配 / 透传 X-Request-Id，并在响应完成时输出结构化访问日志
  app.use(requestLog)

  // gzip 压缩：同源托管模式下需压缩前端产物（JS / CSS）与 JSON，显著降低传输体积
  app.use(compression())

  // 安全响应头（不含 CSP：前端含内联样式与外链图片，CSP 需按实际资源清单单独拟定，避免误伤）
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    // HSTS 仅在实际经 HTTPS 提供时下发（由前置终止 TLS，故以 TRUST_PROXY 为判据）
    if (trustProxy) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    next()
  })

  // CORS：未配置 CORS_ORIGINS 时放开（本地联调）；生产设 CORS_ORIGINS=https://a.com,https://b.com 收敛为白名单
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  app.use(cors(corsOrigins.length ? { origin: corsOrigins } : undefined))
  if (corsOrigins.length) logger.info('CORS 白名单已启用', { origins: corsOrigins })

  // JSON 体积上限放宽到 10MB：后台「法律条款」导入 Word 时会以 base64 提交文件内容
  app.use(express.json({ limit: '10mb' }))

  // API 缓存策略（对齐契约 §5.1 #10）：数据类允许缓存但须回源校验；账号类数据不落盘。
  // ETag 由 express 默认对 res.json 生成（#10 的可选项），故协商缓存开箱可用。
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const isAccount = req.originalUrl.startsWith('/api/account')
    res.setHeader('Cache-Control', isAccount ? 'no-store' : 'no-cache')
    next()
  })

  // 健康检查（存活）与就绪检查（可服务）；均不参与限流
  app.get('/healthz', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'gh-server', time: new Date().toISOString() })
  })
  app.get('/readyz', (_req: Request, res: Response) => {
    res.json({ ok: true, uptimeSec: Math.round(process.uptime()) })
  })

  // API 限流兜底（单实例内存实现；多实例请由网关 / Redis 承担）
  const rlMax = Number(process.env.RATE_LIMIT_MAX ?? 300)
  const rlWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000)
  app.use('/api', rateLimit({ windowMs: rlWindowMs, max: rlMax }))

  // 业务路由（核心内容端点 + 个人中心等）
  registerRoutes(app)

  // 素材库公开访问：/uploads/<文件名>（与 /api 不冲突）。
  // 必须在下方 SPA 回退之前挂载，否则未命中的静态请求会被回退到 index.html。
  const uploadDir = ensureUploadDir()
  // 软删除（回收站中）素材的直链拦截：磁盘文件在彻底删除前保留，
  // 故须在静态托管前按回收站记录拒绝其直链（含变体文件），保证「软删除后前台不可见」。
  app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
    const raw = req.path.startsWith('/') ? req.path.slice(1) : req.path
    if (!raw) {
      next()
      return
    }
    let id = raw
    try {
      id = decodeURIComponent(raw)
    } catch {
      // 解码失败保留原串
    }
    if (hiddenUploadIds().has(id)) {
      res.status(404).json({ error: '未找到该资源' })
      return
    }
    next()
  })
  app.use(
    '/uploads',
    express.static(uploadDir, {
      index: false,
      fallthrough: true,
      // 素材按内容寻址（文件名唯一），设置较长缓存；删除后 URL 不再复用
      setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=86400'),
    }),
  )
  logger.info('素材库目录已就绪', { uploadDir })

  // 素材库元数据同步：为磁盘上已有但缺元数据的文件补「未分类 + 自动推导分类」（幂等）
  syncMediaMeta()

  // 定时发布调度器：周期 tick + 启动补跑（NODE_ENV=test 时自动跳过）
  startScheduler()

  // —— 可选：前端静态托管 + SPA 回退 ——
  const staticDir = process.env.STATIC_DIR ? path.resolve(process.env.STATIC_DIR) : undefined
  if (staticDir && existsSync(staticDir)) {
    const indexFile = path.join(staticDir, 'index.html')
    // 带 hash 的资源长缓存；index.html 不缓存（保证发版即时生效）
    app.use(
      express.static(staticDir, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache')
          else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
          } else res.setHeader('Cache-Control', 'public, max-age=3600')
        },
      }),
    )
    // SPA 回退：非 /api、非 /healthz 的 GET(接受 html) 请求一律回退到 index.html，支持深链直达
    app.get(/^\/(?!api(\/|$)|healthz(\/|$)).*/, (req: Request, res: Response, next: NextFunction) => {
      if (!req.accepts('html')) return next()
      res.setHeader('Cache-Control', 'no-cache')
      res.sendFile(indexFile)
    })
    logger.info('已启用前端静态托管', { staticDir })
  } else if (staticDir) {
    logger.warn('STATIC_DIR 不存在，已跳过静态托管', { staticDir })
  }

  // 404：未命中的接口
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: `未找到该资源：${req.method} ${req.path}` })
  })

  // 统一错误处理
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error('未捕获请求异常', { requestId: res.getHeader('X-Request-Id'), path: req.originalUrl, error: err.message, stack: err.stack })
    res.status(500).json({ error: '服务器内部错误', detail: err.message })
  })

  return app
}