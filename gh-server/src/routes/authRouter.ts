import { Router } from 'express'
import { getInquiryDetail, type InquirySummary } from '../data/auth'
import { listCollection } from '../data/collectionStore'
import {
  changeUserPassword,
  createResetToken,
  createUserSession,
  destroyUserSession,
  findUserByEmail,
  getAccountDevices,
  getAccountFavorites,
  getAccountNotifications,
  getUserSession,
  listUserSessions,
  loginUser,
  registerUser,
  resetPasswordWithToken,
  saveAccountNotifications,
  updateUserProfile,
  USER_SESSION_COOKIE,
  userSessionTtlMs,
  type UserProfile,
} from '../data/userStore'
import { readCookie, readParam } from '../middleware/adminAuth'
import { logger } from '../lib/logger'

/**
 * 前台会员账号体系端点（挂载于 /api）。
 *
 * **真实实现**（阶段 5）：账号落 SQLite `users`，密码 scrypt 加盐哈希，会话落 `user_sessions`
 * 并经**独立 Cookie `gh_user`**（httpOnly + SameSite=Lax）承载；与后台 `gh_admin` 完全隔离。
 * 个人中心 `/account/*` 全部按当前登录用户隔离，未登录一律 401。响应体直出、错误 `{ error }`。
 *
 * 契约：
 *   POST /auth/register  注册（唯一性 + 强度校验）→ 自动登录
 *   POST /auth/login     登录
 *   POST /auth/logout    注销
 *   GET  /auth/me        当前用户（401 表示未登录）
 *   POST /auth/forgot    生成重置令牌（无邮件服务：开发环境直出令牌）
 *   POST /auth/reset     用令牌重置密码
 *   POST /auth/password  修改密码（需登录）
 *   GET  /account/me | inquiries | inquiries/:id | devices | favorites | notifications | settings
 *   PUT  /account/settings | /account/notifications
 */
export const authRouter = Router()

/** 读取字符串字段并去除首尾空白，非字符串一律视为空 */
function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** 读取原始字符串（不改写，用于密码） */
function readRaw(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** 会话 Cookie 选项：httpOnly + SameSite=Lax；生产置 COOKIE_SECURE=1 追加 Secure（与后台一致） */
function userCookieOptions(): {
  httpOnly: boolean
  sameSite: 'lax'
  path: string
  secure: boolean
  maxAge: number
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.COOKIE_SECURE === '1',
    maxAge: userSessionTtlMs(),
  }
}

/** 前台会话令牌（独立 Cookie `gh_user`） */
function userToken(req: Parameters<typeof readCookie>[0]): string | undefined {
  return readCookie(req, USER_SESSION_COOKIE)
}

/** 会话守卫：未登录 / 会话失效 → 401（前端据此跳登录页） */
function requireUser(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction): void {
  const user = getUserSession(userToken(req))
  if (!user) {
    res.status(401).json({ error: '未登录或登录已过期' })
    return
  }
  res.locals.user = user
  next()
}

/** 取守卫注入的当前用户 */
function currentUser(res: import('express').Response): UserProfile {
  return res.locals.user as UserProfile
}

/** 用户名格式校验：3–24 位，允许中英文 / 数字 / 下划线 / 连字符 / 点 */
function validateUsername(username: string): string {
  if (username.length < 3 || username.length > 24) return '用户名需为 3–24 个字符'
  if (!/^[\w.\-\u4e00-\u9fa5]+$/.test(username)) return '用户名仅支持中英文、数字、下划线、连字符与点'
  return ''
}

/** 邮箱格式校验（宽松） */
function validateEmail(email: string): string {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '请输入有效的邮箱地址'
  return ''
}

/** 密码强度校验：6–64 位，且同时包含字母与数字 */
function validatePassword(password: string): string {
  if (password.length < 6 || password.length > 64) return '密码需为 6–64 位'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return '密码需同时包含字母与数字'
  return ''
}

/** 当前用户自己的咨询（按 `inquiries` 集合的 `userId` 归属隔离） */
function inquiriesOf(userId: string): InquirySummary[] {
  return listCollection('inquiries').filter((item) => (item as { userId?: string }).userId === userId)
}

/* ---------------- 账号 ---------------- */

authRouter.post('/auth/register', (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const username = readString(body.username)
  const email = readString(body.email).toLowerCase()
  const password = readRaw(body.password)
  const invalid = validateUsername(username) || validateEmail(email) || validatePassword(password)
  if (invalid) {
    res.status(400).json({ error: invalid })
    return
  }
  const outcome = registerUser({ username, email, password })
  if (!outcome.ok) {
    res.status(409).json({ error: outcome.error })
    return
  }
  // 注册即登录：签发前台会话并下发 gh_user Cookie
  const token = createUserSession(outcome.user.id)
  res.cookie(USER_SESSION_COOKIE, token, userCookieOptions())
  res.status(201).json({ user: outcome.user })
})

authRouter.post('/auth/login', (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const identifier = readString(body.username) || readString(body.account) || readString(body.email)
  const password = readRaw(body.password)
  if (!identifier || !password) {
    res.status(400).json({ error: '请输入账号与密码' })
    return
  }
  const user = loginUser(identifier, password)
  if (!user) {
    res.status(401).json({ error: '账号或密码不正确' })
    return
  }
  const token = createUserSession(user.id)
  res.cookie(USER_SESSION_COOKIE, token, userCookieOptions())
  res.json({ user })
})

authRouter.post('/auth/logout', (req, res) => {
  destroyUserSession(userToken(req))
  res.clearCookie(USER_SESSION_COOKIE, { path: '/' })
  res.json({ ok: true })
})

authRouter.get('/auth/me', requireUser, (_req, res) => {
  res.json({ user: currentUser(res) })
})

/** 找回密码：按邮箱生成重置令牌。无邮件服务 —— 开发环境直出令牌并写日志，生产环境不返回。 */
authRouter.post('/auth/forgot', (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const email = readString(body.email)
  if (!email) {
    res.status(400).json({ error: '请输入注册邮箱' })
    return
  }
  const user = findUserByEmail(email)
  // 不泄露邮箱是否已注册：无论存在与否都返回同一成功回执
  if (!user) {
    res.json({ ok: true })
    return
  }
  const token = createResetToken(user.id)
  const isDev = process.env.NODE_ENV !== 'production'
  if (isDev) {
    logger.info('找回密码重置令牌已生成（开发态直出，仅非生产环境）', { email: user.email, token })
    res.json({ ok: true, sentTo: user.email, devToken: token })
    return
  }
  // 生产：真正投递依赖邮件服务（当前未接入），故不返回令牌
  res.json({ ok: true, sentTo: user.email })
})

authRouter.post('/auth/reset', (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const token = readString(body.token)
  const password = readRaw(body.password)
  if (!token) {
    res.status(400).json({ error: '请输入重置令牌' })
    return
  }
  const weak = validatePassword(password)
  if (weak) {
    res.status(400).json({ error: weak })
    return
  }
  const outcome = resetPasswordWithToken(token, password)
  if (!outcome.ok) {
    res.status(400).json({ error: outcome.error })
    return
  }
  res.json({ ok: true })
})

/** 修改密码（需登录）；成功后作废全部会话，需重新登录 */
authRouter.post('/auth/password', requireUser, (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const currentPassword = readRaw(body.currentPassword)
  const newPassword = readRaw(body.newPassword)
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: '请填写当前密码与新密码' })
    return
  }
  const weak = validatePassword(newPassword)
  if (weak) {
    res.status(400).json({ error: weak })
    return
  }
  const outcome = changeUserPassword(currentUser(res).id, currentPassword, newPassword)
  if (!outcome.ok) {
    res.status(400).json({ error: outcome.error })
    return
  }
  // 会话已作废，清除前台 Cookie
  res.clearCookie(USER_SESSION_COOKIE, { path: '/' })
  res.json({ ok: true })
})

/* ---------------- 个人中心（按用户隔离） ---------------- */

authRouter.get('/account/me', requireUser, (_req, res) => {
  const user = currentUser(res)
  res.json({
    user,
    stats: {
      devices: getAccountDevices(user).length,
      inquiries: inquiriesOf(user.id).length,
      favorites: getAccountFavorites(user.id).length,
      notifications: getAccountNotifications(user.id).length,
    },
  })
})

authRouter.get('/account/inquiries', requireUser, (_req, res) => {
  res.json({ items: inquiriesOf(currentUser(res).id) })
})

authRouter.get('/account/inquiries/:id', requireUser, (req, res) => {
  const detail = getInquiryDetail(inquiriesOf(currentUser(res).id), readParam(req, 'id'))
  if (!detail) {
    res.status(404).json({ error: '未找到该工单' })
    return
  }
  res.json(detail)
})

authRouter.get('/account/devices', requireUser, (_req, res) => {
  res.json({ items: getAccountDevices(currentUser(res)) })
})

authRouter.get('/account/favorites', requireUser, (_req, res) => {
  res.json({ items: getAccountFavorites(currentUser(res).id) })
})

authRouter.get('/account/notifications', requireUser, (_req, res) => {
  res.json({ items: getAccountNotifications(currentUser(res).id) })
})

/** 覆盖保存通知开关 */
authRouter.put('/account/notifications', requireUser, (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const items = saveAccountNotifications(currentUser(res).id, body.items)
  res.json({ ok: true, items })
})

/** 账号设置：基本资料 + 安全项 + 登录设备（有效会话） */
authRouter.get('/account/settings', requireUser, (req, res) => {
  const user = currentUser(res)
  const token = userToken(req)
  const sessions = listUserSessions(user.id)
  const security = [
    { k: '用户名', v: user.username, hint: '登录名，暂不支持修改' },
    { k: '手机号', v: user.phone || '未绑定', hint: user.phone ? '已绑定' : '未绑定' },
    { k: '邮箱', v: user.email, hint: '已绑定' },
    { k: '登录密码', v: '已设置', hint: '可在此页修改' },
  ]
  const loginDevices = sessions.map((session, index) => ({
    name: `Web 会话 ${sessions.length - index}`,
    meta: session.createdAt,
    place: session.token === token ? '当前设备' : '常用设备',
    current: session.token === token,
  }))
  res.json({ user, security, loginDevices })
})

/** 更新基本资料（name / phone） */
authRouter.put('/account/settings', requireUser, (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const updated = updateUserProfile(currentUser(res).id, {
    name: readString(body.name),
    phone: readString(body.phone),
  })
  if (!updated) {
    res.status(404).json({ error: '账号不存在' })
    return
  }
  res.json({ ok: true, user: updated })
})
