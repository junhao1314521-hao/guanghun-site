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
import { getCollectionItem } from './data/collectionStore'
import { getSiteConfig, getPage } from './data/contentStore'
import { injectBootstrap, injectPreloadImages, renderIndexHtml, renderStaticHtml, type PreloadImage } from './lib/seoHead'
import { getBrandProfile } from './data/brand'
import { legacyRedirectFor } from './lib/legacyRedirects'
import { registerRoutes } from './routes'

/** 详情页路由 → 集合 key：用于 SPA 回退前判定实体是否存在，不存在时返回真实 404 状态 */
const DETAIL_ROUTES: Array<{ pattern: RegExp; key: 'products' | 'downloads' | 'faqs' | 'articles' | 'biz-cases' | 'biz-venues' }> = [
  { pattern: /^\/products\/([^/]+)$/, key: 'products' },
  { pattern: /^\/downloads\/([^/]+)$/, key: 'downloads' },
  { pattern: /^\/faq\/([^/]+)$/, key: 'faqs' },
  { pattern: /^\/articles\/([^/]+)$/, key: 'articles' },
  { pattern: /^\/business\/cases\/([^/]+)$/, key: 'biz-cases' },
  { pattern: /^\/business\/venues\/([^/]+)$/, key: 'biz-venues' },
]

/**
 * 首屏启动数据：当前只带「此刻有效的公告条」。
 * 判定条件与前台 `useSiteAnnouncement` 一致（启用 / 有文案 / 在时间窗内），
 * 避免服务端注入的公告条挂载后立刻被隐藏，反而造成新的位移。
 */
function siteBootstrap(): { announcement: { text: string; href?: string; dismissible?: boolean } | null } {
  const a = getSiteConfig().announcement
  if (!a || !a.enabled || !a.text) return { announcement: null }
  const now = Date.now()
  if (a.startAt && Date.parse(a.startAt) > now) return { announcement: null }
  if (a.endAt && Date.parse(a.endAt) < now) return { announcement: null }
  return { announcement: { text: a.text, href: a.href, dismissible: a.dismissible } }
}

/**
 * 首屏 LCP 图片（服务端 preload 用）。
 *
 * 这些地址在浏览器里必须等 JS 执行完 + 内容 / 集合接口返回后才能发现，
 * 直接由服务端写进 `<head>` 可把图片下载提前到 HTML 解析阶段。
 * 只覆盖确定是首屏大图的页面；取不到就返回空数组（不注入，避免预加载无用资源）。
 */
function firstScreenImages(cleanPath: string, origin: string): PreloadImage[] {
  const toAbsolute = (value: unknown): string => {
    const url = typeof value === 'string' ? value.trim() : ''
    if (!url) return ''
    if (/^https?:\/\//i.test(url)) return url
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`
  }

  if (cleanPath === '/') {
    const page = getPage('home')
    const block = page?.blocks.find((item) => item.enabled !== false && (item.type === 'carousel' || item.type === 'hero'))
    const props = (block?.props ?? {}) as Record<string, unknown>
    const slides = Array.isArray(props.slides) ? (props.slides as Array<Record<string, unknown>>) : []
    const first = slides[0] ?? props
    const video = first.mediaType === 'video'
    const desktop = toAbsolute(video ? first.poster ?? first.image : first.image ?? first.media)
    const mobile = toAbsolute(first.imageMobile)
    if (!desktop) return []
    // 断点与 PosterSlide 的 <picture> 保持一致（≤900px 用竖版）
    return mobile
      ? [
          { href: desktop, media: '(min-width: 901px)' },
          { href: mobile, media: '(max-width: 900px)' },
        ]
      : [{ href: desktop }]
  }

  const product = /^\/products\/([^/]+)$/.exec(cleanPath)
  if (product) {
    const item = getCollectionItem('products', decodeURIComponent(product[1]))
    const gallery = Array.isArray(item?.gallery) ? (item.gallery as unknown[]) : []
    const href = toAbsolute(gallery[0])
    return href ? [{ href }] : []
  }

  return []
}

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

  // 安全响应头。CSP 先以 Report-Only 下发（不阻断），待收集误报后再转强制：
  // 前端存在内联样式与少量内联脚本（JSON-LD），故暂保留 'unsafe-inline'。
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader(
      'Content-Security-Policy-Report-Only',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "media-src 'self' blob:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
      ].join('; '),
    )
    // HSTS 仅在实际经 HTTPS 提供时下发（由前置终止 TLS，故以 TRUST_PROXY 为判据）
    if (trustProxy) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    next()
  })

  // CORS：同源部署为主。白名单 = CORS_ORIGINS + SITE_ORIGIN；未配置时开发环境放开、生产仅同源。
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  const siteOriginForCors = (process.env.SITE_ORIGIN ?? '').trim().replace(/\/+$/, '')
  const corsAllow = Array.from(new Set([...corsOrigins, siteOriginForCors].filter(Boolean)))
  if (corsAllow.length) {
    app.use(
      cors({
        origin: (origin, callback) => callback(null, !origin || corsAllow.includes(origin)),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
        maxAge: 86400,
      }),
    )
    logger.info('CORS 白名单已启用', { origins: corsAllow })
  } else if (process.env.NODE_ENV !== 'production') {
    app.use(cors())
  } else {
    logger.warn('未配置 CORS_ORIGINS / SITE_ORIGIN，生产环境仅允许同源请求')
  }

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

  // 旧站直链兼容：命中映射表时 301 到新地址；映射文件缺失 / 为空时完全无影响。
  // 映射由 data/legacy-redirects.json（或 LEGACY_REDIRECTS_PATH）提供，等旧站清单确认后填充。
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }
    const target = legacyRedirectFor(req.path)
    if (target) {
      res.redirect(301, target)
      return
    }
    next()
  })

  // 素材库公开访问：/uploads/<文件名>（与 /api 不冲突）。
  // 必须在下方 SPA 回退之前挂载，否则未命中的静态请求会被回退到 index.html。
  const uploadDir = ensureUploadDir()
  // 软限流：正常下载 / 图片浏览不受影响，仅拦截单 IP 批量遍历（默认 120 次/分钟，可调）
  const uploadRlMax = Number(process.env.UPLOAD_RATE_LIMIT_MAX ?? 120)
  app.use('/uploads', rateLimit({ windowMs: 60_000, max: uploadRlMax }))
  // 防盗链：仅拦截**明确的第三方 Referer**；空 Referer（直接访问 / 扫码 / 下载器 / 搜索引擎）一律放行。
  // 生产环境默认开启，可用 UPLOAD_HOTLINK_GUARD=0 关闭；开发联调默认跳过（Vite 代理与本机端口不一致）。
  const hotlinkGuard =
    process.env.UPLOAD_HOTLINK_GUARD === '1' ||
    (process.env.NODE_ENV === 'production' && process.env.UPLOAD_HOTLINK_GUARD !== '0')
  if (hotlinkGuard) {
    const refererAllow = (process.env.DOWNLOAD_REFERER_ALLOW ?? '')
      .split(',')
      .map((s) => s.trim().replace(/\/+$/, ''))
      .filter(Boolean)
    app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
      const referer = req.get('referer') || ''
      // 空 Referer 放行：直接输入地址、扫码、客户端下载器、隐私模式等均不带 Referer
      if (!referer) {
        next()
        return
      }
      let refOrigin = ''
      try {
        refOrigin = new URL(referer).origin
      } catch {
        // 无法解析的 Referer 不作为拦截依据，避免误伤
        next()
        return
      }
      const host = req.get('host') ?? ''
      const siteOrigin = (process.env.SITE_ORIGIN ?? '').trim().replace(/\/+$/, '')
      const allowed =
        refOrigin === `${req.protocol}://${host}` ||
        (siteOrigin !== '' && refOrigin === siteOrigin) ||
        refererAllow.includes(refOrigin)
      if (!allowed) {
        res.status(403).json({ error: '该资源仅限从本站页面下载' })
        return
      }
      next()
    })
  }
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
      setHeaders: (res, filePath) => {
        // 文件名带版本号（如 -1.3.3- / _v2.1）或含哈希段的资源视为不可变，可长缓存并走 CDN；
        // 其余（运营可能原地替换的图片 / 说明书）保持 1 天，避免换版后长时间不生效。
        const versioned = /(?:[._-]v?\d+(?:\.\d+){1,3}|[._-][0-9a-f]{8,})(?:[._-]|\.)/i.test(path.basename(filePath))
        res.setHeader('Cache-Control', versioned ? 'public, max-age=2592000, immutable' : 'public, max-age=86400')
        // SVG 安全加固：公开访问一律强制下载（attachment），避免直开 SVG 执行内联脚本（防 XSS）。
        // 页面内以 <img> 引用 SVG 不受影响（<img> 不执行脚本）；此处不做标签白名单清洗，实现风险更小。
        if (filePath.toLowerCase().endsWith('.svg')) {
          res.setHeader('Content-Disposition', 'attachment')
        }
      },
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
    /** 前端静态资源缓存策略：带 hash 的 assets 长缓存，站点内容图协商，其余 1 小时 */
    const staticCacheControl = (filePath: string): string => {
      if (filePath.endsWith('index.html')) return 'no-cache'
      if (filePath.includes(`${path.sep}assets${path.sep}`)) return 'public, max-age=31536000, immutable'
      // 站点内容图（未带 hash，可能被运营/素材替换）：每次带 ETag 协商，保证改动即时可见
      if (filePath.includes(`${path.sep}media${path.sep}`)) return 'no-cache'
      return 'public, max-age=3600'
    }

    // WebP 内容协商：构建期已为 JPG / PNG 生成同名 .webp（见 scripts/generate-static-webp.ts）。
    // 浏览器声明支持 WebP 时返回体积更小的 `.webp`，否则回退原图；地址与已存内容无需改动。
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next()
      if (!/\.(jpe?g|png)$/i.test(req.path)) return next()
      // 同一地址存在两种表示，必须声明 Vary，避免 CDN / 代理缓存串味
      res.vary('Accept')
      const accept = req.get('accept') ?? ''
      if (!accept.includes('image/webp')) return next()
      let decoded = ''
      try {
        decoded = decodeURIComponent(req.path)
      } catch {
        return next()
      }
      const original = path.resolve(staticDir, `.${decoded}`)
      if (original !== staticDir && !original.startsWith(staticDir + path.sep)) return next()
      const webp = original.replace(/\.(jpe?g|png)$/i, '.webp')
      if (!existsSync(webp)) return next()
      res.setHeader('Cache-Control', staticCacheControl(original))
      res.sendFile(webp, (error) => {
        if (error && !res.headersSent) next(error)
      })
    })

    // 带 hash 的资源长缓存；index.html 不缓存（保证发版即时生效）
    app.use(
      express.static(staticDir, {
        index: false,
        setHeaders: (res, filePath) => {
          res.setHeader('Cache-Control', staticCacheControl(filePath))
        },
      }),
    )
    // Center 页面按 v2 稿原样托管：独立静态页，不走 SPA 渲染。
    // 仅在服务时注入 canonical / robots / OG，不改动页面结构与样式。
    const originOf = (req: Request) =>
      (process.env.SITE_ORIGIN ?? '').trim().replace(/\/+$/, '') ||
      `${req.protocol}://${req.get('host') ?? ''}`
    app.get('/center', (req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache')
      res.type('html').send(renderStaticHtml(path.join(staticDir, 'demo/center-v2.html'), '/center', originOf(req)))
    })
    // Center 的两个新叙事原型：解剖（结构）与光场（场景），独立静态页，暂不进导航
    app.get('/center/anatomy', (req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache')
      res.type('html').send(renderStaticHtml(path.join(staticDir, 'demo/center-anatomy.html'), '/center/anatomy', originOf(req)))
    })
    app.get('/center/light', (req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache')
      res.type('html').send(renderStaticHtml(path.join(staticDir, 'demo/center-light.html'), '/center/light', originOf(req)))
    })
    // SPA 回退：仅业务页面回退到 index.html；静态资源前缀未命中时直接 404，
    // 避免 /uploads、/media 等缺失文件被误判为 200 HTML（会让下载看起来成功）。
    app.get(
      /^\/(?!api(\/|$)|healthz(\/|$)|uploads(\/|$)|assets(\/|$)|media(\/|$)|posters(\/|$)|fonts(\/|$)|shots(\/|$)|favicon\.png$|icons\.svg$|robots\.txt$|sitemap\.xml$).*/,
      (req: Request, res: Response, next: NextFunction) => {
        if (!req.accepts('html')) return next()
        // 详情页实体不存在时返回 404 状态（页面仍由 SPA 渲染“未找到”空态），
        // 避免软 404 被搜索引擎当成有效页面收录。
        const cleanPath = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path
        // /brand 既承载品牌页（/brand/:slug），也承载静态素材（/brand/*.svg|png）。
        // 带扩展名的未命中素材直接 404，避免回退成 200 HTML。
        if (/^\/brand\/[^/]+\.[a-z0-9]+$/i.test(cleanPath)) return next()
        const brandMatch = /^\/brand\/([^/]+)$/.exec(cleanPath)
        if (brandMatch && !getBrandProfile(decodeURIComponent(brandMatch[1]))) res.status(404)
        for (const route of DETAIL_ROUTES) {
          const matched = route.pattern.exec(cleanPath)
          if (!matched) continue
          const id = decodeURIComponent(matched[1])
          if (!getCollectionItem(route.key, id)) res.status(404)
          break
        }
        res.setHeader('Cache-Control', 'no-cache')
        // 服务端注入真实 title / description / canonical / OG / JSON-LD：
        // 不执行 JS 的抓取器也能拿到与页面一致的元信息（浏览器端仍会再写一遍，值相同）。
        const origin =
          (process.env.SITE_ORIGIN ?? '').trim().replace(/\/+$/, '') ||
          `${req.protocol}://${req.get('host') ?? ''}`
        const html = injectPreloadImages(renderIndexHtml(indexFile, cleanPath, origin), firstScreenImages(cleanPath, origin))
        res.type('html').send(injectBootstrap(html, siteBootstrap()))
      },
    )
    logger.info('已启用前端静态托管', { staticDir })
  } else if (staticDir) {
    logger.warn('STATIC_DIR 不存在，已跳过静态托管', { staticDir })
  }

  // 404：未命中的接口
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: `未找到该资源：${req.method} ${req.path}` })
  })

  // 统一错误处理：请求体错误归一为 4xx；其余异常对外只返回通用文案（生产不泄漏内部细节）
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    const type = (err as { type?: string }).type
    if (type === 'entity.parse.failed') {
      res.status(400).json({ error: '请求体不是合法的 JSON' })
      return
    }
    if (type === 'entity.too.large') {
      res.status(413).json({ error: '请求体超过大小限制' })
      return
    }
    logger.error('未捕获请求异常', { requestId: res.getHeader('X-Request-Id'), path: req.originalUrl, error: err.message, stack: err.stack })
    const body: { error: string; detail?: string } = { error: '服务器内部错误' }
    // 仅非生产环境附带 message，便于本地排查；生产环境一律脱敏
    if (process.env.NODE_ENV !== 'production') body.detail = err.message
    res.status(500).json(body)
  })

  return app
}