/** 接口层 · 公开图形验证码：GET /api/captcha（登录 / 注册 / 咨询 / 预约等公开表单反垃圾用） */
import { transport } from './client'

/** 一次验证码挑战：token 随表单回传服务端一次性校验；svg 为可直接内联的图形字符串 */
export type CaptchaChallenge = {
  token: string
  svg: string
  /** 有效期（秒），用于前端展示与过期提示 */
  expiresInSec: number
}

/** 获取验证码：真实 GET /api/captcha；占位环境返回空图形（开关关闭时不可达） */
export function fetchCaptcha(signal?: AbortSignal): Promise<CaptchaChallenge> {
  return transport({ path: '/api/captcha', signal }, () => ({ token: '', svg: '', expiresInSec: 300 }))
}
