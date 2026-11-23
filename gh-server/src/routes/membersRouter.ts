/**
 * 后台 · 会员管理（挂载于 /api/admin，需登录 + `system` 权限）。
 *
 * 数据真源为前台账号表 `users`（不是资源集合里的演示数据）：
 *   GET  /admin/members?q=&status=&page=&pageSize=
 *        → { items, total, page, pageSize }；邮箱 / 手机号默认脱敏
 *   GET  /admin/members/:id                 → 详情（含最近会话与设备登记，联系方式脱敏）
 *   GET  /admin/members/:id/contact         → 明文联系方式（一次一查，写审计）
 *   POST /admin/members/:id/status          body { status: 'active' | 'frozen' }
 *   POST /admin/members/:id/reset-password  → { tempPassword }（仅返回一次，并强制下线）
 *   POST /admin/members/:id/logout          → 作废全部会话（强制下线）
 */
import { Router } from 'express'
import {
  forceLogoutMember,
  getMemberDetail,
  listMembersForAdmin,
  listMemberTags,
  resetMemberPassword,
  setMemberStatus,
  updateMemberOps,
  type AdminMember,
  type AdminMemberDetail,
} from '../data/userStore'
import { appendAudit } from '../data/auditStore'
import { readParam, requireSession } from '../middleware/adminAuth'
import { requireScope } from '../middleware/rbac'
import { auditWrite, clientIp } from '../middleware/audit'

export const membersRouter = Router()

/** 邮箱脱敏：保留前 2 位与域名 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email ? '***' : ''
  const head = local.slice(0, Math.min(2, local.length))
  return `${head}${local.length > 2 ? '***' : '*'}@${domain}`
}

/** 手机号脱敏：保留前 3 位与后 2 位 */
function maskPhone(phone: string): string {
  if (!phone) return ''
  if (phone.length <= 5) return '*'.repeat(phone.length)
  return `${phone.slice(0, 3)}${'*'.repeat(Math.max(phone.length - 5, 2))}${phone.slice(-2)}`
}

/** 列表 / 详情共用脱敏（contact 接口例外） */
function maskedMember<T extends AdminMember>(member: T): T {
  return { ...member, email: maskEmail(member.email), phone: maskPhone(member.phone) }
}

/** 审计操作者 */
function actorOf(res: import('express').Response): string {
  const user = res.locals.adminUser as { username?: string } | undefined
  return user?.username ?? 'admin'
}

membersRouter.get('/members', requireSession, requireScope('system'), (req, res) => {
  const query = {
    q: typeof req.query.q === 'string' ? req.query.q : '',
    status: typeof req.query.status === 'string' ? req.query.status : '',
    tag: typeof req.query.tag === 'string' ? req.query.tag : '',
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 20,
  }
  const result = listMembersForAdmin(query)
  res.json({ ...result, items: result.items.map((item) => maskedMember(item)) })
})

/** 会员运营标签全集（供筛选下拉）；须先于 /members/:id 声明 */
membersRouter.get('/members-tags', requireSession, requireScope('system'), (_req, res) => {
  res.json({ items: listMemberTags() })
})

membersRouter.get('/members/:id', requireSession, requireScope('system'), (req, res) => {
  const detail: AdminMemberDetail | undefined = getMemberDetail(readParam(req, 'id'))
  if (!detail) {
    res.status(404).json({ error: '会员不存在' })
    return
  }
  res.json({ item: maskedMember(detail) })
})

membersRouter.get('/members/:id/contact', requireSession, requireScope('system'), (req, res) => {
  const detail = getMemberDetail(readParam(req, 'id'))
  if (!detail) {
    res.status(404).json({ error: '会员不存在' })
    return
  }
  // 明文联系方式属于敏感读取：留痕到审计日志
  appendAudit({
    actor: actorOf(res),
    action: 'view-member-contact',
    target: `会员 ${detail.username}`,
    ip: clientIp(req),
  })
  res.json({ email: detail.email, phone: detail.phone })
})

/** 更新会员运营信息（标签 / 内部备注） */
membersRouter.put(
  '/members/:id/ops',
  requireSession,
  requireScope('system'),
  auditWrite('update-member-ops', (req) => `会员 ${readParam(req, 'id')}`),
  (req, res) => {
    const body = (req.body ?? {}) as { tags?: unknown; note?: unknown }
    const outcome = updateMemberOps(readParam(req, 'id'), {
      tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
      note: typeof body.note === 'string' ? body.note : undefined,
    })
    if (!outcome.ok) {
      res.status(404).json({ error: outcome.error })
      return
    }
    res.json({ ok: true, item: maskedMember(outcome.member) })
  },
)

membersRouter.post(
  '/members/:id/status',
  requireSession,
  requireScope('system'),
  auditWrite('update-member-status', (req) => `会员 ${readParam(req, 'id')}`),
  (req, res) => {
    const body = (req.body ?? {}) as { status?: unknown }
    const status = body.status === 'frozen' ? 'frozen' : body.status === 'active' ? 'active' : ''
    if (!status) {
      res.status(400).json({ error: '状态不合法（active / frozen）' })
      return
    }
    const outcome = setMemberStatus(readParam(req, 'id'), status)
    if (!outcome.ok) {
      res.status(404).json({ error: outcome.error })
      return
    }
    res.json({ ok: true, item: maskedMember(outcome.member) })
  },
)

membersRouter.post(
  '/members/:id/reset-password',
  requireSession,
  requireScope('system'),
  auditWrite('reset-member-password', (req) => `会员 ${readParam(req, 'id')}`),
  (req, res) => {
    const outcome = resetMemberPassword(readParam(req, 'id'))
    if (!outcome.ok) {
      res.status(404).json({ error: outcome.error })
      return
    }
    res.json({ ok: true, tempPassword: outcome.tempPassword })
  },
)

membersRouter.post(
  '/members/:id/logout',
  requireSession,
  requireScope('system'),
  auditWrite('force-logout-member', (req) => `会员 ${readParam(req, 'id')}`),
  (req, res) => {
    const outcome = forceLogoutMember(readParam(req, 'id'))
    if (!outcome.ok) {
      res.status(404).json({ error: outcome.error })
      return
    }
    res.json({ ok: true, removed: outcome.removed })
  },
)
