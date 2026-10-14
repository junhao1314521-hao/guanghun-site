/** 接口层 · 账号体系：页面通过本模块取数 / 提交，不直接 import data/auth */
import { transport } from './client'
import type { AuthUser } from '../data/auth'

export type { AuthUser } from '../data/auth'

export type LoginBody = { username: string; password: string; remember?: boolean; captchaToken?: string; captchaCode?: string }
export type RegisterBody = { username: string; email: string; password: string; captchaToken?: string; captchaCode?: string }
export type ForgotBody = { email: string }
export type ResetBody = { token: string; password: string }

export type AuthResult = { user: AuthUser }
export type ForgotResult = { ok: boolean; sentTo?: string; /** 开发环境直出令牌（生产不返回） */ devToken?: string }

/** 占位数据工厂（真实 HTTP 传输器不调用，仅为满足 Transport 签名） */
const EMPTY_USER: AuthUser = { id: '', username: '', name: '', email: '', phone: '' }

/** 登录：POST /api/auth/login */
export function login(body: LoginBody): Promise<AuthResult> {
  return transport({ path: '/api/auth/login', method: 'POST', body }, () => ({ user: EMPTY_USER }))
}

/** 注册（成功后自动登录）：POST /api/auth/register */
export function register(body: RegisterBody): Promise<AuthResult> {
  return transport({ path: '/api/auth/register', method: 'POST', body }, () => ({ user: EMPTY_USER }))
}

/** 退出登录：POST /api/auth/logout */
export function logout(): Promise<{ ok: boolean }> {
  return transport({ path: '/api/auth/logout', method: 'POST' }, () => ({ ok: true }))
}

/** 当前用户：GET /api/auth/me（未登录 401） */
export function fetchMe(signal?: AbortSignal): Promise<AuthUser> {
  return transport<{ user: AuthUser }>({ path: '/api/auth/me', signal }, () => ({ user: EMPTY_USER })).then(
    (res) => res.user,
  )
}

/** 找回密码：POST /api/auth/forgot（开发环境返回 devToken） */
export function forgot(body: ForgotBody): Promise<ForgotResult> {
  return transport({ path: '/api/auth/forgot', method: 'POST', body }, () => ({ ok: true, sentTo: body.email }))
}

/** 用令牌重置密码：POST /api/auth/reset */
export function resetPassword(body: ResetBody): Promise<{ ok: boolean }> {
  return transport({ path: '/api/auth/reset', method: 'POST', body }, () => ({ ok: true }))
}

/** 修改密码（需登录）：POST /api/auth/password */
export function changePassword(body: { currentPassword: string; newPassword: string }): Promise<{ ok: boolean }> {
  return transport({ path: '/api/auth/password', method: 'POST', body }, () => ({ ok: true }))
}
