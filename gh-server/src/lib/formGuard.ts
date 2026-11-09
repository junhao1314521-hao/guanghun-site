/**
 * 公开表单反垃圾守卫（限流 + 图形验证码 + 蜜罐字段三件套的统一入口）。
 * ============================================================
 * 用途：登录 / 注册 / 咨询 / 预约等**公开表单**在写入前统一过闸：
 *   1. 限流：由全局 `/api` 限流中间件（app.ts）承担，单 IP 滑窗；
 *   2. 图形验证码：`checkCaptcha` 校验前端随表单回传的 `captchaToken` + `captchaCode`，
 *      开关由环境总开关（`CAPTCHA_ENABLED`）与后台站点配置（`site.auth.captcha`）共同决定；
 *   3. 蜜罐字段：`honeypotHit` 检测隐藏字段（`website`）是否被填写——真人看不见、机器人会填，
 *      命中即按「疑似机器人」静默成功（不落库），避免给爬虫可观测的成功/失败信号。
 *
 * 失败处理约定：`checkCaptcha` 返回 false 时**已写入响应**（400 + 可读文案），调用方直接 return。
 */
import type { Request, Response } from 'express'
import { getSiteConfig } from '../data/contentStore'
import { captchaNeeded, verifyCaptcha } from '../data/captchaStore'

/** 读取字符串字段并去除首尾空白，非字符串一律视为空 */
function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/* ---------- 验证码策略：失败计数（进程内滑窗） ---------- */

/** 连续失败计数：key = 用途 + 来源 IP */
const failures = new Map<string, { count: number; at: number }>()
/** 计数滑窗与阈值（与后台「连续失败 3 次后出现」文案保持一致） */
const WINDOW_MS = 10 * 60 * 1000
const THRESHOLD = 3

function clientKey(req: Request | undefined, purpose: string): string {
  const ip = req?.ip || req?.socket?.remoteAddress || 'unknown'
  return `${purpose}:${ip}`
}

/** 当前验证码策略：后台配置优先，缺省按 captcha 开关推导 */
export function captchaMode(): 'off' | 'always' | 'after3' {
  const auth = getSiteConfig().auth
  if (auth?.captchaMode === 'off' || auth?.captchaMode === 'always' || auth?.captchaMode === 'after3') {
    return auth.captchaMode
  }
  return auth?.captcha === false ? 'off' : 'always'
}

/** 本次提交是否需要验证码（after3：同一来源 10 分钟内失败满 3 次后需要） */
export function shouldRequireCaptcha(req: Request | undefined, purpose = 'form'): boolean {
  // 环境总开关 / 后台 captcha=false 仍然一票否决
  if (!captchaNeeded(getSiteConfig().auth?.captcha)) return false
  const mode = captchaMode()
  if (mode === 'always') return true
  if (mode === 'off') return false
  const entry = failures.get(clientKey(req, purpose))
  if (!entry) return false
  if (Date.now() - entry.at > WINDOW_MS) {
    failures.delete(clientKey(req, purpose))
    return false
  }
  return entry.count >= THRESHOLD
}

/** 记录一次表单失败（仅 after3 策略需要；成功后应调用 clearFormFailures） */
export function recordFormFailure(req: Request | undefined, purpose = 'form'): void {
  if (captchaMode() !== 'after3') return
  const key = clientKey(req, purpose)
  const now = Date.now()
  const entry = failures.get(key)
  if (!entry || now - entry.at > WINDOW_MS) failures.set(key, { count: 1, at: now })
  else failures.set(key, { count: entry.count + 1, at: now })
}

/** 登录 / 注册成功后清零该来源的失败计数 */
export function clearFormFailures(req: Request | undefined, purpose = 'form'): void {
  failures.delete(clientKey(req, purpose))
}

/**
 * 校验图形验证码。
 * @param req 用于按来源统计失败次数（after3 策略）；省略时按 always / off 处理
 * @param purpose 用途（login / register / inquiry …），失败计数按用途隔离
 * @returns true = 放行；false = 已写入 400 响应（调用方立即 return）。
 */
export function checkCaptcha(
  body: Record<string, unknown>,
  res: Response,
  req?: Request,
  purpose = 'form',
): boolean {
  if (!shouldRequireCaptcha(req, purpose)) return true
  const token = readString(body.captchaToken)
  const code = readString(body.captchaCode)
  if (!verifyCaptcha(token, code)) {
    res.status(400).json({ error: '验证码不正确或已过期，请刷新后重试', captchaRequired: true })
    return false
  }
  return true
}

/**
 * 蜜罐字段命中判定：隐藏字段 `website`（表单里视觉不可见）被填写即视为机器人。
 * 真人看不到该字段故不会填；命中时不可给爬虫「失败」信号，应按成功处理但**不落库**。
 */
export function honeypotHit(body: Record<string, unknown>): boolean {
  return readString(body.website) !== ''
}
