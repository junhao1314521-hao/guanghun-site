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
import type { Response } from 'express'
import { getSiteConfig } from '../data/contentStore'
import { captchaNeeded, verifyCaptcha } from '../data/captchaStore'

/** 读取字符串字段并去除首尾空白，非字符串一律视为空 */
function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * 校验图形验证码。
 * @returns true = 放行；false = 已写入 400 响应（调用方立即 return）。
 */
export function checkCaptcha(body: Record<string, unknown>, res: Response): boolean {
  // 后台可在「站点配置 → 安全」关闭验证码（site.auth.captcha === false），此时免校验
  const enabled = getSiteConfig().auth?.captcha
  if (!captchaNeeded(enabled)) return true
  const token = readString(body.captchaToken)
  const code = readString(body.captchaCode)
  if (!verifyCaptcha(token, code)) {
    res.status(400).json({ error: '验证码不正确或已过期，请刷新后重试' })
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
