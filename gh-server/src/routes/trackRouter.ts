/**
 * 公开埋点端点（无需登录）——前端页面浏览 / 下载点击上报。
 *
 *   POST /api/track/view       body `{ path }` → `{ ok: true }`
 *   POST /api/track/download   body `{ id }`   → `{ ok: true }`
 *
 * 加固：
 * - **基础防刷**：单 IP 滑窗限流（`TRACK_RATE_MAX` 默认 120 / `TRACK_RATE_WINDOW_MS` 默认 60s），超限 429；
 * - **输入校验**：`path` 必须以 `/` 开头、`id` 非空，长度受限（超长截断），非法 400；
 * - **上限与开关**：事件量上限与总开关由 `metricsStore`（`METRICS_MAX` / `TRACK_ENABLED`）控制；
 * - **失败静默**：写库异常不影响响应，端点始终返回 `{ ok: true }`（除非校验/限流不通过）。
 */
import { Router, type Request, type Response } from 'express'
import { recordMetric } from '../data/metricsStore'

export const trackRouter = Router()

/** 单 IP 窗口内上报上限（默认 120 / 60s） */
function rateMax(): number {
  const raw = Number(process.env.TRACK_RATE_MAX)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 120
}

/** 限流窗口（毫秒，默认 60s） */
function rateWindowMs(): number {
  const raw = Number(process.env.TRACK_RATE_WINDOW_MS)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 60_000
}

/** 内存滑窗：IP → 最近命中时间戳数组（单实例；多实例请交由网关限流） */
const HITS = new Map<string, number[]>()

/** 取客户端 IP（TRUST_PROXY 生效时含代理链首） */
function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown'
}

/** 滑窗放行判定：清理过期时间戳后判断是否超限 */
function allow(ip: string): boolean {
  const now = Date.now()
  const window = rateWindowMs()
  const list = (HITS.get(ip) ?? []).filter((at) => now - at < window)
  if (list.length >= rateMax()) {
    HITS.set(ip, list)
    return false
  }
  list.push(now)
  HITS.set(ip, list)
  return true
}

/** 读取字符串字段并去除首尾空白 */
function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

trackRouter.post('/view', (req: Request, res: Response) => {
  const path = readString((req.body as Record<string, unknown>)?.path)
  if (!path || !path.startsWith('/') || path.length > 300) {
    res.status(400).json({ error: 'path 不合法' })
    return
  }
  if (!allow(clientIp(req))) {
    res.status(429).json({ error: '上报过于频繁，请稍后再试' })
    return
  }
  recordMetric('view', path)
  res.json({ ok: true })
})

trackRouter.post('/download', (req: Request, res: Response) => {
  const id = readString((req.body as Record<string, unknown>)?.id)
  if (!id || id.length > 200) {
    res.status(400).json({ error: 'id 不合法' })
    return
  }
  if (!allow(clientIp(req))) {
    res.status(429).json({ error: '上报过于频繁，请稍后再试' })
    return
  }
  recordMetric('download', id)
  res.json({ ok: true })
})

/** 允许的通用事件名（与 metricsStore.MetricKind 对应；view/download 另有专用端点） */
const EVENT_NAMES = new Set(['cta', 'reserve', 'compare', 'subscribe'])

trackRouter.post('/event', (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const name = readString(body.name)
  const key = readString(body.key)
  if (!EVENT_NAMES.has(name)) {
    res.status(400).json({ error: 'name 不合法' })
    return
  }
  if (key.length > 200) {
    res.status(400).json({ error: 'key 过长' })
    return
  }
  if (!allow(clientIp(req))) {
    res.status(429).json({ error: '上报过于频繁，请稍后再试' })
    return
  }
  // key 缺省用 `-` 占位：事件计数不依赖具体对象时仍可统计
  recordMetric(name as 'cta' | 'reserve' | 'compare' | 'subscribe', key || '-')
  res.json({ ok: true })
})
