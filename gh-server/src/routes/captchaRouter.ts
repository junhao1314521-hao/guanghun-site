/**
 * 公开图形验证码端点（无需登录）。
 *
 *   GET /api/captcha → { token, svg, expiresInSec }
 *
 * - `token` 在前端表单提交时随 `captchaToken` 回传，服务端 `verifyCaptcha` 一次性校验；
 * - `svg` 为可直接内联的图形字符串（不落盘、不外链）；
 * - 单 IP 滑窗限流，防批量刷图（默认 60 次 / 60s，可用 CAPTCHA_RATE_MAX / CAPTCHA_RATE_WINDOW_MS 覆盖）；
 * - 响应不缓存（`Cache-Control: no-store`），避免中间层复用同一张图。
 */
import { Router, type Request, type Response } from 'express'
import { createCaptcha } from '../data/captchaStore'

export const captchaRouter = Router()

/** 单 IP 窗口内取图上限（默认 60 / 60s） */
function rateMax(): number {
  const raw = Number(process.env.CAPTCHA_RATE_MAX)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 60
}

/** 限流窗口（毫秒，默认 60s） */
function rateWindowMs(): number {
  const raw = Number(process.env.CAPTCHA_RATE_WINDOW_MS)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 60_000
}

/** 内存滑窗：IP → 最近取图时间戳数组（单实例；多实例请交由网关限流） */
const HITS = new Map<string, number[]>()

/** 取客户端 IP（TRUST_PROXY 生效时含代理链首） */
function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown'
}

/** 滑窗放行判定 */
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

captchaRouter.get('/', (req: Request, res: Response) => {
  if (!allow(clientIp(req))) {
    res.status(429).json({ error: '获取验证码过于频繁，请稍后再试' })
    return
  }
  res.setHeader('Cache-Control', 'no-store')
  res.json(createCaptcha())
})
