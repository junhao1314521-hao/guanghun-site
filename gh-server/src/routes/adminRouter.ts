import { Router, type Response } from 'express'
import {
  ADMIN_OVERVIEW,
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
import { requireResourceScope } from '../middleware/rbac'

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
 *   POST /admin/resources/:key/:id/action            行内动作（发布 / 备份 / 恢复，占位）
 *   GET    /admin/resources/trash                    回收站列表 { items, total }
 *   POST   /admin/resources/trash/:id/restore        恢复回原集合 / 资源 → { ok: true }（原 id 被占用 409）
 *   DELETE /admin/resources/trash/:id                彻底删除 → { ok: true }
 *   GET  /admin/analytics/:scope                     数据分析（真实统计，响应形状不变）
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
  res.json(ADMIN_OVERVIEW)
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

adminRouter.post('/resources/:key/:id/action', requireSession, requireResourceScope, (req, res) => {
  const key = readParam(req, 'key')
  const id = readParam(req, 'id')
  const exists = isCollectionKey(key) ? Boolean(getCollectionItem(key, id)) : Boolean(getResourceItem(key, id))
  if (!exists) {
    res.status(404).json({ error: '未找到该记录' })
    return
  }
  // 行内动作（发布 / 备份 / 恢复等）：占位，返回成功供前端反馈
  res.json({ ok: true })
})

/* ---------------- 数据分析 ---------------- */

adminRouter.get('/analytics/:scope', requireSession, (req, res) => {
  const data = buildAnalytics(readParam(req, 'scope'))
  if (!data) {
    res.status(404).json({ error: '未知分析范围' })
    return
  }
  res.json(data)
})