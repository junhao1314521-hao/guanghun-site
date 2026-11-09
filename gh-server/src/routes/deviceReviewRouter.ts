/**
 * 后台 · 会员设备登记审核（挂载于 /api/admin，需登录 + `system` 权限）。
 *
 * 契约：
 *   GET  /admin/device-registrations?status=pending|active|rejected
 *        → { items: AdminDeviceView[] }（待审核优先）
 *   POST /admin/device-registrations/:id/review
 *        body { action: 'approve' | 'reject', reason?: string }
 *        → { ok: true, item }；非待审核记录 / 缺驳回原因 → 400
 */
import { Router } from 'express'
import { listAllDevices, reviewDevice } from '../data/deviceStore'
import { readParam, requireSession } from '../middleware/adminAuth'
import { requireScope } from '../middleware/rbac'
import { auditWrite } from '../middleware/audit'

export const deviceReviewRouter = Router()

/** 当前后台操作者用户名（审计 / 审核人留痕） */
function reviewerOf(res: import('express').Response): string {
  const user = res.locals.adminUser as { username?: string } | undefined
  return user?.username ?? 'admin'
}

deviceReviewRouter.get('/device-registrations', requireSession, requireScope('system'), (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : ''
  res.json({ items: listAllDevices(status) })
})

deviceReviewRouter.post(
  '/device-registrations/:id/review',
  requireSession,
  requireScope('system'),
  auditWrite('review-device', (req) => readParam(req, 'id')),
  (req, res) => {
    const body = (req.body ?? {}) as { action?: unknown; reason?: unknown }
    const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : ''
    if (!action) {
      res.status(400).json({ error: '审核动作不合法（approve / reject）' })
      return
    }
    const outcome = reviewDevice(
      readParam(req, 'id'),
      reviewerOf(res),
      action,
      typeof body.reason === 'string' ? body.reason : '',
    )
    if (!outcome.ok) {
      res.status(400).json({ error: outcome.error })
      return
    }
    res.json({ ok: true, item: outcome.device })
  },
)
