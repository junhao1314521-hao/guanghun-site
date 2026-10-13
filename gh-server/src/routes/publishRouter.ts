import { Router, type Response } from 'express'
import type { AdminUser } from '../data/admin'
import { createRelease, deleteRelease, listReleases, restoreRelease } from '../data/releaseStore'
import { cancelSchedule, createSchedule, listSchedules } from '../data/publishScheduleStore'
import { readParam, requireSession } from '../middleware/adminAuth'
import { requireScope } from '../middleware/rbac'
import { auditWrite } from '../middleware/audit'

/**
 * 后台「发布记录与回滚 + 定时发布」端点（挂载于 /api/admin，均需会话 + `publish` 权限）。
 *
 * 契约（响应体直出，错误 `{ error }`）：
 *   POST   /admin/publish             生成一条发布记录（快照当前内容版本）→ { item }
 *   GET    /admin/publish             发布记录列表（倒序）→ { items, total }
 *   POST   /admin/publish/:id/restore 按该发布记录回滚内容（先自动留 pre-restore 快照）→ { ok: true }（未命中 404）
 *   DELETE /admin/publish/:id         删除发布记录 → { ok: true }（未命中 404）
 *
 *   定时发布：
 *   POST   /admin/publish/schedules   登记一条定时发布（当场快照当前内容）→ { item }（参数非法 400）
 *   GET    /admin/publish/schedules   定时发布列表（按计划时间倒序）→ { items, total }
 *   DELETE /admin/publish/schedules/:id 取消待应用的定时发布 → { ok: true }（非 pending 返回 409）
 *
 * 说明：真正「部署上线」（构建 + 托管 / 进程与主机操作）由部署环境执行（见《部署 Runbook》）；
 * 本端点负责**版本记录、内容回滚与定时发布**。
 */
export const publishRouter = Router()

/** 读取字符串字段并去除首尾空白 */
function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** 取当前会话用户名（用于发布记录 actor） */
function actorOf(res: Response): string {
  return (res.locals.adminUser as AdminUser | undefined)?.username ?? 'anonymous'
}

publishRouter.post(
  '/publish',
  requireSession,
  requireScope('publish'),
  auditWrite('publish', () => 'publish'),
  (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>
    const note = readString(body.note)
    const item = createRelease({ actor: actorOf(res), note: note || undefined })
    res.status(201).json({ item })
  },
)

publishRouter.get('/publish', requireSession, requireScope('publish'), (_req, res) => {
  const items = listReleases()
  res.json({ items, total: items.length })
})

publishRouter.post(
  '/publish/:id/restore',
  requireSession,
  requireScope('publish'),
  auditWrite('restore-publish', (req) => readParam(req, 'id')),
  (req, res) => {
    if (!restoreRelease(readParam(req, 'id'))) {
      res.status(404).json({ error: '未找到该发布记录' })
      return
    }
    res.json({ ok: true })
  },
)

publishRouter.delete(
  '/publish/:id',
  requireSession,
  requireScope('publish'),
  auditWrite('delete-publish', (req) => readParam(req, 'id')),
  (req, res) => {
    if (!deleteRelease(readParam(req, 'id'))) {
      res.status(404).json({ error: '未找到该发布记录' })
      return
    }
    res.json({ ok: true })
  },
)

/* ---------------- 定时发布 ---------------- */

publishRouter.post(
  '/publish/schedules',
  requireSession,
  requireScope('publish'),
  auditWrite('schedule-publish', () => 'schedule'),
  (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>
    const at = readString(body.at)
    const note = readString(body.note)
    if (!at) {
      res.status(400).json({ error: '缺少计划时间 at' })
      return
    }
    try {
      const item = createSchedule({ at, note: note || undefined, createdBy: actorOf(res) })
      res.status(201).json({ item })
    } catch (err) {
      res.status(400).json({ error: (err as Error).message })
    }
  },
)

publishRouter.get('/publish/schedules', requireSession, requireScope('publish'), (_req, res) => {
  const items = listSchedules()
  res.json({ items, total: items.length })
})

publishRouter.delete(
  '/publish/schedules/:id',
  requireSession,
  requireScope('publish'),
  auditWrite('cancel-schedule-publish', (req) => readParam(req, 'id')),
  (req, res) => {
    if (!cancelSchedule(readParam(req, 'id'))) {
      // 非.pending（已应用 / 失败 / 已取消 / 不存在）→ 不可取消
      res.status(409).json({ error: '该定时发布不可取消（已应用 / 已失败 / 已取消 或不存在）' })
      return
    }
    res.json({ ok: true })
  },
)
