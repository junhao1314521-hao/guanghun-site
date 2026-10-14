import { Router, type Response } from 'express'
import {
  getSessionUser,
  loginAdmin,
  logoutAdmin,
  sessionTtlMs,
  SESSION_COOKIE,
  toProfile,
  type AdminRow,
  type AdminUser,
} from '../data/admin'
import { appendAudit, listAudit } from '../data/auditStore'
import { buildAnalytics } from '../data/analytics'
import { countSince } from '../data/metricsStore'
import { getTrashRecord, listTrash, purgeTrash, restoreTrash, softDelete } from '../data/trashStore'
import { auditWrite, clientIp } from '../middleware/audit'
import {
  createCollectionItem,
  getCollectionItem,
  isCollectionKey,
  listCollection,
  updateCollectionItem,
} from '../data/collectionStore'
import {
  createResourceItem,
  getResourceItem,
  hasResource,
  listResource,
  updateResourceItem,
} from '../data/adminResourceStore'
import { readParam, requireSession, sessionToken } from '../middleware/adminAuth'
import { requireResourceScope, requireScope } from '../middleware/rbac'
import { createRole, deleteRole, listRoles, updateRole } from '../data/roleStore'
import { ALL_SCOPES } from '../data/roles'
import { isSupportedLegalFile, parseLegalDoc } from '../data/legalImport'

/**
 * 后台管理系统端点（挂载于 /api/admin）。
 *
 * 本地鉴权占位：登录签发内存 token，除登录外所有端点要求 `Authorization: Bearer <token>`。
 * 资源数据：
 * - 已纳入结构化集合的栏目（products / rankings / articles / downloads / faqs /
 *   biz-content / biz-cases / biz-venues / inquiries）读写 `collectionStore`（与前台同一份数据）；
 * - 其余栏目（assets / pages / nav / customers / roles 等）走 `adminResourceStore`（内存 + 原子落盘）。
 *
 * 契约：
 *   POST /admin/auth/login | /admin/auth/logout      登录 / 注销
 *   GET  /admin/auth/me                              当前用户（401 表示未登录）
 *   GET  /admin/overview                             工作台概览
 *   GET  /admin/resources/:key                       列表 { items, total }
 *   GET  /admin/resources/:key/:id                   详情 { item }（未命中 404）
 *   POST /admin/resources/:key                       新建 → { ok: true, item }
 *   PUT  /admin/resources/:key/:id                   更新 → { ok: true, item }
 *   DELETE /admin/resources/:key/:id                 删除（软删除 → 回收站）→ { ok: true }
 *   GET    /admin/resources/trash                    回收站列表 { items, total }
 *   POST   /admin/resources/trash/:id/restore        恢复回原集合 / 资源 → { ok: true }（原 id 被占用 409）
 *   DELETE /admin/resources/trash/:id                彻底删除 → { ok: true }
 *   GET  /admin/analytics/:scope                     数据分析（真实统计，需 content 权限）
 *   GET    /admin/roles                              角色列表 { items, allScopes }（system）
 *   POST   /admin/roles                              新建角色（system）→ { item }（201）
 *   PUT    /admin/roles/:key                          编辑角色（system）→ { item }
 *   DELETE /admin/roles/:key                          删除角色（system）→ { ok: true }
 */
export const adminRouter = Router()

/** 读取字符串字段并去除首尾空白 */
function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** 当前会话操作者（后台用户名）；未登录记为 anonymous */
function actorOf(res: Response): string {
  const user = res.locals.adminUser as AdminUser | undefined
  return user?.username ?? 'anonymous'
}

/* ---------------- 鉴权 ---------------- */

/** 会话 Cookie 选项：httpOnly + SameSite=Lax；生产置 COOKIE_SECURE=1 追加 Secure */
function sessionCookieOptions(): {
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
    maxAge: sessionTtlMs(),
  }
}

adminRouter.post('/auth/login', (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const username = readString(body.username)
  const password = readString(body.password)
  if (!username || !password) {
    res.status(400).json({ error: '请输入账号与密码' })
    return
  }
  const result = loginAdmin(username, password)
  if (!result) {
    // 审计：登录失败（actor 记录尝试账号，detail 说明失败原因）
    appendAudit({ actor: username, action: 'login', target: '后台', detail: '登录失败', ip: clientIp(req) })
    res.status(401).json({ error: '账号或密码不正确' })
    return
  }
  appendAudit({ actor: username, action: 'login', target: '后台', ip: clientIp(req) })
  // 同时下发 httpOnly Cookie（主用）并在响应体返回 token（向后兼容 Bearer）
  res.cookie(SESSION_COOKIE, result.token, sessionCookieOptions())
  res.json({ token: result.token, user: toProfile(result.user) })
})

adminRouter.post('/auth/logout', (req, res) => {
  const token = sessionToken(req)
  const user = getSessionUser(token)
  logoutAdmin(token)
  // 清除会话 Cookie（路径须与下发时一致）
  res.clearCookie(SESSION_COOKIE, { path: '/' })
  if (user) appendAudit({ actor: user.username, action: 'logout', target: '后台', ip: clientIp(req) })
  res.json({ ok: true })
})

adminRouter.get('/auth/me', requireSession, (_req, res) => {
  res.json(toProfile(res.locals.adminUser))
})

/* ---------------- 工作台 ---------------- */

adminRouter.get('/overview', requireSession, (_req, res) => {
  res.json(buildOverview())
})

/** 工作台概览（真实统计）：集合计数 + 本月下载埋点 + 审计最近记录 */
function buildOverview() {
  // 「在售产品」按产品状态文案统计；「已发布文章」只计发布状态为已发布的记录（草稿 / 审核中不计）
  const onSaleProducts = listCollection('products').filter((item) => item.status.text === '在售').length
  const publishedArticles = listCollection('articles').filter((item) => (item.status ?? '已发布') === '已发布').length
  const inquiries = listCollection('inquiries')
  const pendingInquiries = inquiries.filter((item) => item.tag !== '已解决' && item.tag !== '已关闭').length
  const waitingInquiries = inquiries.filter((item) => item.tag === '等待补充').length
  const pendingReservations = listCollection('reservations').filter((item) => item.status === '待确认').length

  // 本月（上海时区自然月）起点
  const shanghai = new Date(Date.now() + 8 * 3600 * 1000)
  const ym = `${shanghai.getUTCFullYear()}-${String(shanghai.getUTCMonth() + 1).padStart(2, '0')}`
  const monthDownloads = countSince('download', new Date(`${ym}-01T00:00:00+08:00`).toISOString())

  const recent = listAudit({ limit: 4 }).items.map((entry) => ({
    id: entry.id,
    at: entry.at,
    who: entry.actor,
    action: entry.action,
    target: entry.target,
  }))

  return {
    stats: [
      { key: 'products', label: '在售产品', value: onSaleProducts, delta: '—', trend: 'up' as const },
      { key: 'articles', label: '已发布文章', value: publishedArticles, delta: '—', trend: 'up' as const },
      { key: 'inquiries', label: '待处理咨询', value: pendingInquiries, delta: '—', trend: 'up' as const },
      { key: 'downloads', label: '本月下载量', value: monthDownloads, delta: '—', trend: 'up' as const },
    ],
    todos: [
      { id: 't-inquiry', label: '待处理咨询', count: pendingInquiries, to: '/admin/inquiries', icon: 'chat' },
      { id: 't-waiting', label: '等待补充材料', count: waitingInquiries, to: '/admin/inquiries', icon: 'chat' },
      { id: 't-reservation', label: '待确认预约', count: pendingReservations, to: '/admin/reservations', icon: 'clock' },
    ],
    recent,
  }
}

/* ---------------- 法律条款 · Word 导入解析 ---------------- */

/**
 * POST /admin/legal/parse
 * 请求体：{ filename: string, data: string }（data 为 base64，可由前端 FileReader 读得）。
 * 返回：{ doc: { title, eyebrow, intro, sections } }（仅解析，不落库；由前端确认后保存）。
 * 不支持：老式 .doc（二进制）——返回 415 提示「另存为 .docx」。
 */
adminRouter.post('/legal/parse', requireSession, requireScope('content'), async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const filename = readString(body.filename)
  const data = typeof body.data === 'string' ? body.data : ''
  if (!filename || !data) {
    res.status(400).json({ error: '请提供文件名与文件内容' })
    return
  }
  if (!isSupportedLegalFile(filename)) {
    res.status(415).json({ error: '仅支持 .docx / .docm / .dotx；老式 .doc 请先另存为 .docx' })
    return
  }
  const buffer = Buffer.from(data, 'base64')
  if (buffer.byteLength === 0) {
    res.status(400).json({ error: '文件内容为空' })
    return
  }
  if (buffer.byteLength > 8 * 1024 * 1024) {
    res.status(413).json({ error: '文件过大（上限 8MB）' })
    return
  }
  try {
    const doc = await parseLegalDoc(buffer, filename)
    appendAudit({ actor: actorOf(res), action: 'import-legal', target: `legal/${filename}`, ip: clientIp(req) })
    res.json({ doc })
  } catch {
    res.status(422).json({ error: '无法解析该 Word 文档，请确认文件完整且为 .docx 格式' })
  }
})

/* ---------------- 角色与权限（可新建 / 编辑 / 删除） ---------------- */

adminRouter.get('/roles', requireSession, requireScope('system'), (_req, res) => {
  res.json({ items: listRoles(), allScopes: ALL_SCOPES })
})

adminRouter.post('/roles', requireSession, requireScope('system'), (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const scopes = Array.isArray(body.scopes) ? body.scopes.map(String) : []
  const outcome = createRole({
    key: readString(body.key),
    name: readString(body.name),
    desc: readString(body.desc),
    scopes,
  })
  if (!outcome.ok) {
    res.status(400).json({ error: outcome.error })
    return
  }
  appendAudit({ actor: actorOf(res), action: 'create-role', target: `roles/${outcome.role.key}`, ip: clientIp(req) })
  res.status(201).json({ item: outcome.role })
})

adminRouter.put('/roles/:key', requireSession, requireScope('system'), (req, res) => {
  const key = readParam(req, 'key')
  const body = (req.body ?? {}) as Record<string, unknown>
  const patch: { name?: string; desc?: string; scopes?: string[] } = {}
  if ('name' in body) patch.name = readString(body.name)
  if ('desc' in body) patch.desc = readString(body.desc)
  if (Array.isArray(body.scopes)) patch.scopes = body.scopes.map(String)
  const outcome = updateRole(key, patch)
  if (!outcome.ok) {
    res.status(400).json({ error: outcome.error })
    return
  }
  appendAudit({ actor: actorOf(res), action: 'update-role', target: `roles/${key}`, ip: clientIp(req) })
  res.json({ item: outcome.role })
})

adminRouter.delete('/roles/:key', requireSession, requireScope('system'), (req, res) => {
  const key = readParam(req, 'key')
  const outcome = deleteRole(key)
  if (!outcome.ok) {
    res.status(400).json({ error: outcome.error })
    return
  }
  appendAudit({ actor: actorOf(res), action: 'delete-role', target: `roles/${key}`, ip: clientIp(req) })
  res.json({ ok: true })
})

/* ---------------- 回收站 ---------------- */
// 注意：本段须先于通用 `/resources/:key` 注册，避免 `trash` 被 `:key` 吞掉。
// 权限沿用资源端点口径（key=`trash` → `system`，默认拒绝，仅 admin）。

adminRouter.get('/resources/trash', requireSession, requireResourceScope, (_req, res) => {
  res.json(listTrash())
})

adminRouter.post('/resources/trash/:id/restore', requireSession, requireResourceScope, (req, res) => {
  const id = readParam(req, 'id')
  const record = getTrashRecord(id)
  const result = restoreTrash(id)
  if (result.status === 'missing') {
    res.status(404).json({ error: '回收站未找到该记录' })
    return
  }
  if (result.status === 'conflict') {
    // 原记录 id 已被占用：拒绝覆盖，交由人工处理
    res.status(409).json({
      error: `恢复失败：「${result.key}/${result.recordId}」的 id 已被占用，请先处理冲突记录后再恢复`,
    })
    return
  }
  appendAudit({
    actor: actorOf(res),
    action: 'restore',
    target: record ? `${record.key}/${record.recordId}` : `trash/${id}`,
    ip: clientIp(req),
  })
  res.json({ ok: true })
})

adminRouter.delete('/resources/trash/:id', requireSession, requireResourceScope, (req, res) => {
  const id = readParam(req, 'id')
  const record = getTrashRecord(id)
  if (!purgeTrash(id)) {
    res.status(404).json({ error: '回收站未找到该记录' })
    return
  }
  appendAudit({
    actor: actorOf(res),
    action: 'purge',
    target: record ? `${record.key}/${record.recordId}` : `trash/${id}`,
    ip: clientIp(req),
  })
  res.json({ ok: true })
})

/* ---------------- 资源 ---------------- */

adminRouter.get('/resources/:key', requireSession, requireResourceScope, (req, res) => {
  const key = readParam(req, 'key')
  // 「操作日志」为只读虚拟栏目：直接由审计存储供给真实数据（时间倒序），非资源存储
  if (key === 'logs') {
    const { items, total } = listAudit()
    res.json({ items, total })
    return
  }
  if (isCollectionKey(key)) {
    const items = listCollection(key)
    res.json({ items, total: items.length })
    return
  }
  const items = listResource(key)
  if (!items) {
    res.status(404).json({ error: '未知资源' })
    return
  }
  res.json({ items, total: items.length })
})

adminRouter.get('/resources/:key/:id', requireSession, requireResourceScope, (req, res) => {
  const key = readParam(req, 'key')
  const id = readParam(req, 'id')
  const item = isCollectionKey(key) ? getCollectionItem(key, id) : getResourceItem(key, id)
  if (!item) {
    res.status(404).json({ error: '未找到该记录' })
    return
  }
  res.json({ item })
})

adminRouter.post(
  '/resources/:key',
  requireSession,
  requireResourceScope,
  auditWrite('create', (req) => {
    const key = readParam(req, 'key')
    const body = (req.body ?? {}) as Record<string, unknown>
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    return id ? `${key}/${id}` : key
  }),
  (req, res) => {
    const key = readParam(req, 'key')
    const body = (req.body ?? {}) as Record<string, unknown>
    if (isCollectionKey(key)) {
      res.status(201).json({ ok: true, item: createCollectionItem(key, body) })
      return
    }
    if (!hasResource(key)) {
      res.status(404).json({ error: '未知资源' })
      return
    }
    res.status(201).json({ ok: true, item: createResourceItem(key, body as AdminRow) })
  },
)

adminRouter.put(
  '/resources/:key/:id',
  requireSession,
  requireResourceScope,
  auditWrite('update', (req) => `${readParam(req, 'key')}/${readParam(req, 'id')}`),
  (req, res) => {
    const key = readParam(req, 'key')
    const id = readParam(req, 'id')
    const body = (req.body ?? {}) as Record<string, unknown>
    const item = isCollectionKey(key)
      ? updateCollectionItem(key, id, body)
      : updateResourceItem(key, id, body as AdminRow)
    if (!item) {
      res.status(404).json({ error: '未找到该记录' })
      return
    }
    res.json({ ok: true, item })
  },
)

adminRouter.delete(
  '/resources/:key/:id',
  requireSession,
  requireResourceScope,
  auditWrite('delete', (req) => `${readParam(req, 'key')}/${readParam(req, 'id')}`),
  (req, res) => {
    const key = readParam(req, 'key')
    const id = readParam(req, 'id')
    // 软删除：写入回收站并从原存储（集合 / 后台资源）移除；前台不再返回，可在回收站恢复或彻底删除
    if (!softDelete(key, id, actorOf(res))) {
      res.status(404).json({ error: '未找到该记录' })
      return
    }
    res.json({ ok: true })
  },
)

/* ---------------- 数据分析 ---------------- */

adminRouter.get('/analytics/:scope', requireSession, requireScope('content'), (req, res) => {
  const data = buildAnalytics(readParam(req, 'scope'))
  if (!data) {
    res.status(404).json({ error: '未知分析范围' })
    return
  }
  res.json(data)
})