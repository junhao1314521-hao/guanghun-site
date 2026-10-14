/**
 * 前台会员账号、会话与个人中心数据（**与后台 `admin.ts` 完全独立的一套**）。
 *
 * - 账号：落 SQLite `users` 表，密码以 **scrypt 加盐哈希**（与后台同规格：随机 salt + 64 字节
 *   派生密钥，hex 存储）保存，登录用 **timing-safe** 比较。
 * - 会话：落 `user_sessions` 表（独立于后台的进程内内存会话），由路由经 **独立 Cookie `gh_user`**
 *   下发（httpOnly + SameSite=Lax）；与后台 `gh_admin` 互不影响，两个 Cookie 可并存各自生效。
 * - 找回密码：落 `user_reset_tokens` 表；**无邮件服务**，开发环境把令牌直出（生产不返回）。
 * - 个人中心数据：按用户隔离，落 `user_account_data` 表（devices / favorites / notifications）；
 *   基本资料（name / phone）在 `users` 表；我的咨询通过 `inquiries` 集合的 `userId` 字段归属。
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import { getDb, runInTransaction } from './db'

/* ============================================================
   密码哈希（与后台 admin.ts 同规格）
   ============================================================ */

/** scrypt 派生密钥长度（字节） */
const SCRYPT_KEYLEN = 64

/** 生成密码哈希：随机 salt + scrypt 派生密钥（均以 hex 存储） */
export function hashUserPassword(password: string, salt = randomBytes(16).toString('hex')): { salt: string; hash: string } {
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex')
  return { salt, hash }
}

/** 定时安全比较（长度不等直接判否，避免 timingSafeEqual 抛错） */
export function verifyUserPasswordHash(password: string, salt: string, hash: string): boolean {
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN)
  const expected = Buffer.from(hash, 'hex')
  if (expected.length !== derived.length) return false
  return timingSafeEqual(derived, expected)
}

/* ============================================================
   类型
   ============================================================ */

/** 对外返回的会员信息（不含密码哈希） */
export type UserProfile = {
  id: string
  username: string
  name: string
  email: string
  phone: string
}

/** 前台会话 Cookie 名（与后台 `gh_admin` 隔离） */
export const USER_SESSION_COOKIE = 'gh_user'

/** 数据库中的账号行 */
type UserRow = {
  id: string
  username: string
  email: string
  phone: string | null
  salt: string
  hash: string
  name: string | null
}

/** 行 → 对外资料 */
function rowToProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    name: row.name ?? row.username,
    phone: row.phone ?? '',
  }
}

/** 会话存活时长（毫秒）；`USER_SESSION_TTL_MS` 可覆盖，默认 7 天 */
export function userSessionTtlMs(): number {
  const raw = Number(process.env.USER_SESSION_TTL_MS)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 7 * 24 * 60 * 60 * 1000
}

/** 重置令牌存活时长（毫秒）；默认 30 分钟 */
function resetTokenTtlMs(): number {
  const raw = Number(process.env.USER_RESET_TTL_MS)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 30 * 60 * 1000
}

/** 生成可读且稳定的用户名 id */
function newUserId(): string {
  return `u-${randomBytes(8).toString('hex')}`
}

/* ============================================================
   账号读写
   ============================================================ */

/** 按 id 取账号（不存在返回 undefined） */
export function findUserById(id: string): UserProfile | undefined {
  const row = getDb().prepare('SELECT id, username, email, phone, salt, hash, name FROM users WHERE id = ?').get(id) as
    | UserRow
    | undefined
  return row ? rowToProfile(row) : undefined
}

/** 按用户名取账号（唯一） */
export function findUserByUsername(username: string): UserProfile | undefined {
  const row = getDb()
    .prepare('SELECT id, username, email, phone, salt, hash, name FROM users WHERE username = ?')
    .get(username) as UserRow | undefined
  return row ? rowToProfile(row) : undefined
}

/** 按邮箱取账号（唯一，忽略大小写） */
export function findUserByEmail(email: string): UserProfile | undefined {
  const row = getDb()
    .prepare('SELECT id, username, email, phone, salt, hash, name FROM users WHERE email = ?')
    .get(email.trim().toLowerCase()) as UserRow | undefined
  return row ? rowToProfile(row) : undefined
}

export type RegisterOutcome = { ok: true; user: UserProfile } | { ok: false; error: string }

/**
 * 注册账号：唯一性校验（用户名 / 邮箱）+ 密码哈希落库，并初始化该用户的个人中心演示数据。
 * 格式校验由路由层负责（返回 400）；此处冲突返回 `{ ok:false }`（路由映射为 409）。
 */
export function registerUser(input: { username: string; email: string; password: string }): RegisterOutcome {
  const username = input.username.trim()
  const email = input.email.trim().toLowerCase()
  if (findUserByUsername(username)) return { ok: false, error: '该用户名已被注册' }
  if (findUserByEmail(email)) return { ok: false, error: '该邮箱已被注册' }

  const id = newUserId()
  const name = username
  const { salt, hash } = hashUserPassword(input.password)
  const profile: UserProfile = { id, username, name, email, phone: '' }
  try {
    runInTransaction((tx) => {
      tx.prepare(
        'INSERT INTO users(id, username, email, phone, salt, hash, name, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(id, username, email, null, salt, hash, name, new Date().toISOString())
      seedAccountData(tx, profile)
    })
  } catch (err) {
    // 并发下唯一约束兜底：返回可读冲突信息
    return { ok: false, error: (err as Error).message.includes('UNIQUE') ? '用户名或邮箱已被占用' : '注册失败，请稍后重试' }
  }
  return { ok: true, user: profile }
}

/** 按用户名 / 邮箱 + 密码校验；通过返回资料，否则 undefined */
export function loginUser(identifier: string, password: string): UserProfile | undefined {
  const key = identifier.trim()
  const row = getDb()
    .prepare('SELECT id, username, email, phone, salt, hash, name FROM users WHERE username = ? OR email = ?')
    .get(key, key.toLowerCase()) as UserRow | undefined
  if (!row) return undefined
  if (!verifyUserPasswordHash(password, row.salt, row.hash)) return undefined
  return rowToProfile(row)
}

/** 校验某账号当前密码是否正确 */
export function verifyUserPassword(userId: string, password: string): boolean {
  const row = getDb().prepare('SELECT salt, hash FROM users WHERE id = ?').get(userId) as
    | { salt: string; hash: string }
    | undefined
  return row ? verifyUserPasswordHash(password, row.salt, row.hash) : false
}

/** 更新基本资料（name / phone）；返回更新后的资料 */
export function updateUserProfile(userId: string, patch: { name?: string; phone?: string }): UserProfile | undefined {
  const row = getDb()
    .prepare('SELECT id, username, email, phone, salt, hash, name FROM users WHERE id = ?')
    .get(userId) as UserRow | undefined
  if (!row) return undefined
  const nextName = patch.name !== undefined ? patch.name : (row.name ?? '')
  const nextPhone = patch.phone !== undefined ? patch.phone : (row.phone ?? '')
  getDb().prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(nextName, nextPhone, userId)
  return { ...rowToProfile(row), name: nextName || row.username, phone: nextPhone }
}

/* ============================================================
   会话（落库，独立于后台内存会话）
   ============================================================ */

/** 签发会话并落库；返回令牌 */
export function createUserSession(userId: string): string {
  const token = randomBytes(24).toString('hex')
  const expiresAt = Date.now() + userSessionTtlMs()
  getDb()
    .prepare('INSERT INTO user_sessions(token, user_id, expires_at, created_at) VALUES(?, ?, ?, ?)')
    .run(token, userId, expiresAt, new Date().toISOString())
  return token
}

/** 按令牌取用户；无效 / 过期返回 undefined（过期条目顺带清理） */
export function getUserSession(token: string | undefined): UserProfile | undefined {
  if (!token) return undefined
  const row = getDb().prepare('SELECT user_id, expires_at FROM user_sessions WHERE token = ?').get(token) as
    | { user_id: string; expires_at: number }
    | undefined
  if (!row) return undefined
  if (row.expires_at <= Date.now()) {
    destroyUserSession(token)
    return undefined
  }
  return findUserById(row.user_id)
}

/** 注销单个会话 */
export function destroyUserSession(token: string | undefined): void {
  if (token) getDb().prepare('DELETE FROM user_sessions WHERE token = ?').run(token)
}

/** 注销某账号的全部会话（改密 / 重置密码后强制重新登录） */
export function destroyUserSessions(userId: string): void {
  getDb().prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId)
}

/** 某账号的有效会话列表（供「账号设置 · 登录设备」展示） */
export function listUserSessions(userId: string): Array<{ token: string; createdAt: string }> {
  const rows = getDb()
    .prepare('SELECT token, created_at FROM user_sessions WHERE user_id = ? AND expires_at > ? ORDER BY created_at DESC')
    .all(userId, Date.now()) as Array<{ token: string; created_at: string | null }>
  return rows.map((row) => ({ token: row.token, createdAt: row.created_at ?? '' }))
}

/* ============================================================
   找回密码（开发环境直出令牌；生产环境不返回，需接邮件服务）
   ============================================================ */

/** 生成重置令牌并落库；返回明文令牌 */
export function createResetToken(userId: string): string {
  const token = randomBytes(24).toString('hex')
  const expiresAt = Date.now() + resetTokenTtlMs()
  getDb().prepare('INSERT INTO user_reset_tokens(token, user_id, expires_at, used) VALUES(?, ?, ?, 0)').run(
    token,
    userId,
    expiresAt,
  )
  return token
}

export type ResetOutcome = { ok: true } | { ok: false; error: string }

/** 用重置令牌改密：校验有效性与时效，改密并作废该令牌与全部会话 */
export function resetPasswordWithToken(token: string, password: string): ResetOutcome {
  const row = getDb().prepare('SELECT user_id, expires_at, used FROM user_reset_tokens WHERE token = ?').get(token) as
    | { user_id: string; expires_at: number; used: number }
    | undefined
  if (!row || row.used) return { ok: false, error: '重置令牌无效或已使用' }
  if (row.expires_at <= Date.now()) return { ok: false, error: '重置令牌已过期，请重新申请' }
  runInTransaction((tx) => {
    const { salt, hash } = hashUserPassword(password)
    tx.prepare('UPDATE users SET salt = ?, hash = ? WHERE id = ?').run(salt, hash, row.user_id)
    tx.prepare('UPDATE user_reset_tokens SET used = 1 WHERE token = ?').run(token)
    tx.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(row.user_id)
  })
  return { ok: true }
}

/** 修改密码（需校验当前密码）；成功后作废该账号全部会话，强制重新登录 */
export type ChangePasswordOutcome = { ok: true } | { ok: false; error: string }

export function changeUserPassword(userId: string, currentPassword: string, newPassword: string): ChangePasswordOutcome {
  if (!verifyUserPassword(userId, currentPassword)) return { ok: false, error: '当前密码不正确' }
  runInTransaction((tx) => {
    const { salt, hash } = hashUserPassword(newPassword)
    tx.prepare('UPDATE users SET salt = ?, hash = ? WHERE id = ?').run(salt, hash, userId)
    tx.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId)
  })
  return { ok: true }
}

/* ============================================================
   个人中心数据（按用户隔离）
   ============================================================ */

/** 我的设备（形状与前台 `data/account.ts` 的 AccountDevice 一致） */
export type AccountDevice = {
  model: string
  sn: string
  status: 'success' | 'muted'
  statusText: string
  warranty: string
  action: { label: string; variant: 'secondary' | 'ghost'; to?: string }
}

/** 收藏项 */
export type FavoriteItem = { name: string; spec: string; subscribed: boolean }

/** 订阅与通知开关 */
export type NotificationSetting = { id: string; label: string; desc: string; enabled: boolean }

/** 某用户的个人中心数据分区 */
type AccountSection = 'devices' | 'favorites' | 'notifications'

/** 读某分区；缺失或损坏时用 fallback 兜底 */
function readSection<T>(userId: string, section: AccountSection, fallback: () => T): T {
  const row = getDb().prepare('SELECT data FROM user_account_data WHERE user_id = ? AND section = ?').get(userId, section) as
    | { data: string }
    | undefined
  if (!row) return fallback()
  try {
    return JSON.parse(row.data) as T
  } catch {
    return fallback()
  }
}

/** 写某分区（upsert） */
function writeSection(userId: string, section: AccountSection, value: unknown): void {
  getDb()
    .prepare(
      'INSERT INTO user_account_data(user_id, section, data, updated_at) VALUES(?, ?, ?, ?) ' +
        'ON CONFLICT(user_id, section) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
    )
    .run(userId, section, JSON.stringify(value), new Date().toISOString())
}

function defaultDevices(profile: UserProfile): AccountDevice[] {
  const suffix = profile.username.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'MEMBER'
  return [
    {
      model: 'GH-M900 PRO',
      sn: `GH-M900-DEMO-${suffix}`,
      status: 'success',
      statusText: '在保',
      warranty: '365 天',
      action: { label: '申请售后', variant: 'secondary', to: '/support#contact' },
    },
  ]
}

function defaultFavorites(): FavoriteItem[] {
  return [
    { name: 'GH-M900 PRO 无线电竞鼠标', spec: '26,000 DPI · 58 g', subscribed: true },
    { name: 'GH-K870 三模机械键盘', spec: '三模 · 热插拔', subscribed: false },
  ]
}

function defaultNotifications(): NotificationSetting[] {
  return [
    { id: 'product', label: '产品动态', desc: '新品发布、型号更新与产品线调整。', enabled: true },
    { id: 'firmware', label: '固件更新', desc: '已登记设备的固件与驱动更新提醒。', enabled: true },
    { id: 'campaign', label: '活动通知', desc: '赛事合作、线下体验与限时活动。', enabled: false },
    { id: 'ticket', label: '工单提醒', desc: '咨询状态变更与需要补充材料时提醒。', enabled: true },
  ]
}

/** 注册时初始化该用户的个人中心数据（少量演示数据；devices 序列号含用户名以便区分用户） */
function seedAccountData(tx: DatabaseSync, profile: UserProfile): void {
  const insert = tx.prepare('INSERT INTO user_account_data(user_id, section, data, updated_at) VALUES(?, ?, ?, ?)')
  const now = new Date().toISOString()
  insert.run(profile.id, 'devices', JSON.stringify(defaultDevices(profile)), now)
  insert.run(profile.id, 'favorites', JSON.stringify(defaultFavorites()), now)
  insert.run(profile.id, 'notifications', JSON.stringify(defaultNotifications()), now)
}

/** 我的设备 */
export function getAccountDevices(profile: UserProfile): AccountDevice[] {
  return readSection<AccountDevice[]>(profile.id, 'devices', () => defaultDevices(profile))
}

/** 我的收藏 */
export function getAccountFavorites(userId: string): FavoriteItem[] {
  return readSection<FavoriteItem[]>(userId, 'favorites', defaultFavorites)
}

/** 订阅与通知 */
export function getAccountNotifications(userId: string): NotificationSetting[] {
  return readSection<NotificationSetting[]>(userId, 'notifications', defaultNotifications)
}

/** 覆盖保存通知开关（仅接受字符串 id / label / desc 与布尔 enabled 的合法条目） */
export function saveAccountNotifications(userId: string, items: unknown): NotificationSetting[] {
  const source = Array.isArray(items) ? items : []
  const normalized: NotificationSetting[] = source
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: String(item.id ?? ''),
      label: String(item.label ?? ''),
      desc: String(item.desc ?? ''),
      enabled: Boolean(item.enabled),
    }))
    .filter((item) => item.id !== '')
  writeSection(userId, 'notifications', normalized)
  return normalized
}

/* ============================================================
   设备登记（增 / 删）——个人中心「我的设备」真实可用
   ============================================================ */

export type DeviceOutcome = { ok: true; devices: AccountDevice[] } | { ok: false; error: string }

/** 登记设备：型号必填、序列号在本账号内唯一；新登记默认「未验证 / 待激活」 */
export function addAccountDevice(profile: UserProfile, input: { model: string; sn: string }): DeviceOutcome {
  const model = input.model.trim()
  const sn = input.sn.trim()
  if (!model || !sn) return { ok: false, error: '请填写型号与序列号' }
  const devices = getAccountDevices(profile)
  if (devices.some((device) => device.sn === sn)) return { ok: false, error: '该序列号已登记' }
  const next: AccountDevice[] = [
    {
      model,
      sn,
      status: 'muted',
      statusText: '未验证',
      warranty: '待激活',
      action: { label: '申请售后', variant: 'secondary', to: '/support#contact' },
    },
    ...devices,
  ]
  writeSection(profile.id, 'devices', next)
  return { ok: true, devices: next }
}

/** 删除设备（按序列号）；未命中返回失败 */
export function removeAccountDevice(userId: string, sn: string): DeviceOutcome {
  const profile = findUserById(userId)
  if (!profile) return { ok: false, error: '账号不存在' }
  const devices = getAccountDevices(profile)
  const next = devices.filter((device) => device.sn !== sn)
  if (next.length === devices.length) return { ok: false, error: '未找到该设备' }
  writeSection(userId, 'devices', next)
  return { ok: true, devices: next }
}

/** 删除收藏（按名称）；未命中返回失败 */
export function removeAccountFavorite(userId: string, name: string): { ok: true; items: FavoriteItem[] } | { ok: false; error: string } {
  const items = getAccountFavorites(userId)
  const next = items.filter((item) => item.name !== name)
  if (next.length === items.length) return { ok: false, error: '未找到该收藏' }
  writeSection(userId, 'favorites', next)
  return { ok: true, items: next }
}

/* ============================================================
   邮箱更换 / 会话吊销 / 注销账号
   ============================================================ */

/** 更换邮箱（唯一性校验，忽略大小写）；返回更新后的资料 */
export function changeUserEmail(userId: string, email: string): { ok: true; user: UserProfile } | { ok: false; error: string } {
  const next = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) return { ok: false, error: '请输入有效的邮箱地址' }
  const current = findUserById(userId)
  if (!current) return { ok: false, error: '账号不存在' }
  if (current.email.toLowerCase() !== next && findUserByEmail(next)) return { ok: false, error: '该邮箱已被占用' }
  getDb().prepare('UPDATE users SET email = ? WHERE id = ?').run(next, userId)
  return { ok: true, user: { ...current, email: next } }
}

/** 吊销某账号的一个会话（需 token 属于该账号）；返回是否命中 */
export function revokeUserSession(userId: string, token: string): boolean {
  const result = getDb().prepare('DELETE FROM user_sessions WHERE token = ? AND user_id = ?').run(token, userId)
  return Number(result.changes) > 0
}

/** 注销账号：删除账号及其会话、个人中心数据、重置令牌（不可恢复） */
export function deleteUserAccount(userId: string): boolean {
  const exists = findUserById(userId)
  if (!exists) return false
  runInTransaction((tx) => {
    tx.prepare('DELETE FROM users WHERE id = ?').run(userId)
    tx.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId)
    tx.prepare('DELETE FROM user_account_data WHERE user_id = ?').run(userId)
    tx.prepare('DELETE FROM user_reset_tokens WHERE user_id = ?').run(userId)
  })
  return true
}
