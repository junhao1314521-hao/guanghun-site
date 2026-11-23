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
import { getDb, runInTransaction, type SqliteDatabase } from './db'

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

/** 登录结果：区分密码错误与账号冻结，路由据此给出可读提示 */
export type LoginOutcome = { ok: true; user: UserProfile } | { ok: false; reason: 'invalid' | 'frozen' }

/** 按用户名 / 邮箱 + 密码校验；通过返回资料，否则给出失败原因 */
export function loginUser(identifier: string, password: string): LoginOutcome {
  const key = identifier.trim()
  const row = getDb()
    .prepare(
      'SELECT id, username, email, phone, salt, hash, name, status FROM users WHERE username = ? OR email = ?',
    )
    .get(key, key.toLowerCase()) as (UserRow & { status?: string | null }) | undefined
  if (!row) return { ok: false, reason: 'invalid' }
  if ((row.status ?? 'active') === 'frozen') return { ok: false, reason: 'frozen' }
  if (!verifyUserPasswordHash(password, row.salt, row.hash)) return { ok: false, reason: 'invalid' }
  return { ok: true, user: rowToProfile(row) }
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

/** 签发会话并落库；返回令牌（同时刷新最近登录时间） */
export function createUserSession(userId: string): string {
  const token = randomBytes(24).toString('hex')
  const expiresAt = Date.now() + userSessionTtlMs()
  const now = new Date().toISOString()
  getDb()
    .prepare('INSERT INTO user_sessions(token, user_id, expires_at, created_at) VALUES(?, ?, ?, ?)')
    .run(token, userId, expiresAt, now)
  getDb().prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, userId)
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

/** 修改密码：先校验当前密码，成功后更新盐/哈希并作废该用户全部会话，强制重新登录 */
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

/** 收藏项 */
export type FavoriteItem = { name: string; spec: string; subscribed: boolean }

/** 订阅与通知开关 */
export type NotificationSetting = { id: string; label: string; desc: string; enabled: boolean }

/** 某用户的个人中心数据分区（设备登记已独立落 `device_registrations`，不在此分区） */
type AccountSection = 'favorites' | 'notifications'

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

/** 生成默认收藏项（演示数据） */
function defaultFavorites(): FavoriteItem[] {
  return [
    { name: '27X1QE-W54 电竞OLED显示器', spec: '26.5 英寸 2K 540Hz', subscribed: true },
    { name: '32X1UE-W16 双模 4K 电竞显示器', spec: '4K@165 / FHD@330', subscribed: false },
    { name: '27X1QE-W28 电竞OLED显示器', spec: '26.5 英寸 2K 280Hz', subscribed: true },
  ]
}

/** 生成默认订阅 / 通知开关（演示数据） */
function defaultNotifications(): NotificationSetting[] {
  return [
    { id: 'product', label: '产品动态', desc: '新品发布、型号更新与产品线调整。', enabled: true },
    { id: 'firmware', label: '固件更新', desc: '已登记设备的固件与驱动更新提醒。', enabled: true },
    { id: 'campaign', label: '活动通知', desc: '赛事合作、线下体验与限时活动。', enabled: false },
    { id: 'ticket', label: '工单提醒', desc: '咨询状态变更与需要补充材料时提醒。', enabled: true },
  ]
}

/** 注册时初始化该用户的个人中心数据（收藏 / 通知演示数据；设备不预置，需用户实名登记） */
function seedAccountData(tx: SqliteDatabase, profile: UserProfile): void {
  const insert = tx.prepare('INSERT INTO user_account_data(user_id, section, data, updated_at) VALUES(?, ?, ?, ?)')
  const now = new Date().toISOString()
  insert.run(profile.id, 'favorites', JSON.stringify(defaultFavorites()), now)
  insert.run(profile.id, 'notifications', JSON.stringify(defaultNotifications()), now)
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

/** 删除收藏（按名称）；未命中返回失败 */
export function removeAccountFavorite(userId: string, name: string): { ok: true; items: FavoriteItem[] } | { ok: false; error: string } {
  const items = getAccountFavorites(userId)
  const next = items.filter((item) => item.name !== name)
  if (next.length === items.length) return { ok: false, error: '未找到该收藏' }
  writeSection(userId, 'favorites', next)
  return { ok: true, items: next }
}

/** 新增收藏（按名称去重，已存在则原样返回）；置顶显示 */
export function addAccountFavorite(
  userId: string,
  input: { name: string; spec?: string },
): { ok: true; items: FavoriteItem[] } {
  const name = input.name.trim()
  const items = getAccountFavorites(userId)
  if (!name) return { ok: true, items }
  if (items.some((item) => item.name === name)) return { ok: true, items }
  const next: FavoriteItem[] = [{ name, spec: (input.spec ?? '').trim(), subscribed: true }, ...items]
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

/* ============================================================
   后台 · 会员管理（真实前台账号，只读统计 + 冻结 / 重置 / 强制下线）
   ============================================================ */

/** 会员状态：active 正常 / frozen 已冻结 */
export type MemberStatus = 'active' | 'frozen'

/** 后台会员列表项（含真实设备数与有效会话数） */
export type AdminMember = {
  id: string
  username: string
  name: string
  email: string
  phone: string
  status: MemberStatus
  createdAt: string
  lastLoginAt: string
  frozenAt: string
  sessionCount: number
  deviceCount: number
  /** 运营标签（后台维护，仅内部可见） */
  tags: string[]
  /** 内部备注（后台维护，不对会员展示） */
  note: string
}

/** 后台会员详情（列表项 + 最近会话与设备登记） */
export type AdminMemberDetail = AdminMember & {
  sessions: Array<{ createdAt: string; expiresAt: string }>
  devices: Array<{ id: string; model: string; sn: string; status: string; createdAt: string }>
}

/** 列表查询参数（q 匹配用户名 / 姓名 / 邮箱 / 手机号） */
export type AdminMemberQuery = { q?: string; status?: string; tag?: string; page?: number; pageSize?: number }

/** 会员基础行 */
type MemberRow = {
  id: string
  username: string
  email: string
  phone: string | null
  name: string | null
  status: string | null
  created_at: string | null
  last_login_at: string | null
  frozen_at: string | null
  session_count: number
  device_count: number
  tags: string | null
  note: string | null
}

/** 解析标签 JSON；损坏或空值回退空数组 */
function parseTags(raw: string | null): string[] {
  if (!raw) return []
  try {
    const value = JSON.parse(raw) as unknown
    return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : []
  } catch {
    return []
  }
}

/** 行 → 后台会员 */
function rowToMember(row: MemberRow): AdminMember {
  return {
    id: row.id,
    username: row.username,
    name: row.name ?? row.username,
    email: row.email,
    phone: row.phone ?? '',
    status: row.status === 'frozen' ? 'frozen' : 'active',
    createdAt: row.created_at ?? '',
    lastLoginAt: row.last_login_at ?? '',
    frozenAt: row.frozen_at ?? '',
    sessionCount: Number(row.session_count ?? 0),
    deviceCount: Number(row.device_count ?? 0),
    tags: parseTags(row.tags),
    note: row.note ?? '',
  }
}

/** 列表 SQL 的公共 FROM / 统计子查询（绑定顺序：expiresAt, [搜索参数…], status, limit, offset） */
const MEMBER_SELECT =
  'SELECT u.id, u.username, u.email, u.phone, u.name, u.status, u.created_at, u.last_login_at, u.frozen_at, u.tags, u.note, ' +
  '(SELECT COUNT(*) FROM user_sessions s WHERE s.user_id = u.id AND s.expires_at > ?) AS session_count, ' +
  '(SELECT COUNT(*) FROM device_registrations d WHERE d.user_id = u.id) AS device_count ' +
  'FROM users u'

/** 分页查询会员；返回总数以便前端渲染分页 */
export function listMembersForAdmin(query: AdminMemberQuery = {}): {
  items: AdminMember[]
  total: number
  page: number
  pageSize: number
} {
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100)
  const page = Math.max(Number(query.page) || 1, 1)
  const offset = (page - 1) * pageSize
  const q = (query.q ?? '').trim()
  const status = query.status === 'active' || query.status === 'frozen' ? query.status : ''
  const tag = (query.tag ?? '').trim()

  const where: string[] = []
  const params: unknown[] = [Date.now()]
  if (q) {
    where.push('(u.username LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)')
    const like = `%${q}%`
    params.push(like, like, like, like)
  }
  if (status) {
    where.push('u.status = ?')
    params.push(status)
  }
  if (tag) {
    // 标签以 JSON 数组存储，用带引号的 LIKE 精确匹配单个标签
    where.push('u.tags LIKE ?')
    params.push(`%"${tag}"%`)
  }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : ''

  const total = (
    getDb()
      .prepare(`SELECT COUNT(*) AS n FROM users u${whereSql}`)
      .get(...(params.slice(1) as never[])) as { n: number }
  ).n

  const rows = getDb()
    .prepare(`${MEMBER_SELECT}${whereSql} ORDER BY u.created_at DESC, u.id DESC LIMIT ? OFFSET ?`)
    .all(...(params as never[]), pageSize, offset) as MemberRow[]

  return { items: rows.map(rowToMember), total, page, pageSize }
}

/** 会员详情（含最近会话与设备登记）；不存在返回 undefined */
export function getMemberDetail(id: string): AdminMemberDetail | undefined {
  const row = getDb().prepare(`${MEMBER_SELECT} WHERE u.id = ?`).get(Date.now(), id) as MemberRow | undefined
  if (!row) return undefined
  const sessions = (
    getDb()
      .prepare('SELECT created_at, expires_at FROM user_sessions WHERE user_id = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 10')
      .all(id, Date.now()) as Array<{ created_at: string | null; expires_at: number }>
  ).map((item) => ({
    createdAt: item.created_at ?? '',
    expiresAt: new Date(Number(item.expires_at)).toISOString(),
  }))
  const devices = getDb()
    .prepare('SELECT id, model, sn, status, created_at FROM device_registrations WHERE user_id = ? ORDER BY created_at DESC LIMIT 10')
    .all(id) as Array<{ id: string; model: string; sn: string; status: string; created_at: string }>
  return {
    ...rowToMember(row),
    sessions,
    devices: devices.map((item) => ({
      id: item.id,
      model: item.model,
      sn: item.sn,
      status: item.status,
      createdAt: item.created_at,
    })),
  }
}

/** 设置会员状态；冻结时同时作废其全部会话（立即下线） */
export function setMemberStatus(id: string, status: MemberStatus): { ok: true; member: AdminMember } | { ok: false; error: string } {
  if (!findUserById(id)) return { ok: false, error: '会员不存在' }
  const now = new Date().toISOString()
  runInTransaction((tx) => {
    tx.prepare('UPDATE users SET status = ?, frozen_at = ? WHERE id = ?').run(
      status,
      status === 'frozen' ? now : null,
      id,
    )
    if (status === 'frozen') tx.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(id)
  })
  const detail = getMemberDetail(id)
  if (!detail) return { ok: false, error: '会员不存在' }
  return { ok: true, member: detail }
}

/** 管理员重置会员密码：生成一次性临时密码，返回明文供管理员转交；同时强制下线 */
export function resetMemberPassword(id: string): { ok: true; tempPassword: string } | { ok: false; error: string } {
  if (!findUserById(id)) return { ok: false, error: '会员不存在' }
  const tempPassword = randomBytes(9).toString('base64url')
  const { salt, hash } = hashUserPassword(tempPassword)
  runInTransaction((tx) => {
    tx.prepare('UPDATE users SET salt = ?, hash = ? WHERE id = ?').run(salt, hash, id)
    tx.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(id)
  })
  return { ok: true, tempPassword }
}

/** 强制会员下线（作废全部有效会话） */
export function forceLogoutMember(id: string): { ok: true; removed: number } | { ok: false; error: string } {
  if (!findUserById(id)) return { ok: false, error: '会员不存在' }
  const result = getDb().prepare('DELETE FROM user_sessions WHERE user_id = ?').run(id)
  return { ok: true, removed: Number(result.changes) }
}

/** 更新会员运营信息（标签 / 内部备注）；标签去重、去空、限长 */
export function updateMemberOps(
  id: string,
  patch: { tags?: string[]; note?: string },
): { ok: true; member: AdminMemberDetail } | { ok: false; error: string } {
  if (!findUserById(id)) return { ok: false, error: '会员不存在' }
  const tags = patch.tags
    ? Array.from(new Set(patch.tags.map((item) => item.trim()).filter(Boolean))).slice(0, 20)
    : undefined
  const note = patch.note !== undefined ? patch.note.trim().slice(0, 2000) : undefined
  if (tags) getDb().prepare('UPDATE users SET tags = ? WHERE id = ?').run(JSON.stringify(tags), id)
  if (note !== undefined) getDb().prepare('UPDATE users SET note = ? WHERE id = ?').run(note, id)
  const detail = getMemberDetail(id)
  return detail ? { ok: true, member: detail } : { ok: false, error: '会员不存在' }
}

/** 全量会员标签（供后台筛选下拉） */
export function listMemberTags(): string[] {
  const rows = getDb().prepare('SELECT tags FROM users WHERE tags IS NOT NULL').all() as Array<{ tags: string | null }>
  const set = new Set<string>()
  for (const row of rows) for (const tag of parseTags(row.tags)) set.add(tag)
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
}
