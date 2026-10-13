import type { NextFunction, Request, Response } from 'express'

type Options = {
  /** 窗口长度（毫秒） */
  windowMs: number
  /** 单窗口内单 IP 允许的请求数 */
  max: number
}

/**
 * 固定窗口限流（内存实现，零依赖）。
 * 用于兜底防护 —— 单实例进程内生效；多实例部署时应改由前置网关 / Redis 承担。
 */
export function rateLimit({ windowMs, max }: Options) {
  const hits = new Map<string, { count: number; resetAt: number }>()

  // 周期性清理过期条目，避免 Map 无界增长（unref 以免阻止进程退出）
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key)
  }, windowMs)
  timer.unref()

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const key = req.ip ?? 'unknown'
    const now = Date.now()
    const entry = hits.get(key)

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    entry.count += 1
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
      res.status(429).json({ error: '请求过于频繁，请稍后重试' })
      return
    }
    next()
  }
}