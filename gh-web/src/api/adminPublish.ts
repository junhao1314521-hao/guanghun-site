/**
 * 接口层 · 后台「发布记录与回滚」（后端 /api/admin/publish*）。
 * ============================================================
 *   GET    /api/admin/publish              发布记录列表（倒序）→ { items, total }
 *   POST   /api/admin/publish              生成一条发布记录（快照当前内容）→ { item }
 *   POST   /api/admin/publish/:id/restore  按发布记录回滚内容（先自动留 pre-restore 备份）→ { ok: true }
 *   DELETE /api/admin/publish/:id          删除发布记录 → { ok: true }
 *
 * 全部需后台会话（httpOnly Cookie，兼容 Bearer）+ `publish` 权限；
 * 无权限返回 403（前端据此展示「无权限」空态，见 AdminPublishList）。
 */
import { ApiError, transport } from './client'
import { getAdminToken } from '../lib/adminAuth'

/** 发布记录条目（与后端 ReleaseItem 字段逐字一致） */
export type ReleaseItem = {
  id: string
  /** 发布时间（ISO 8601） */
  at: string
  /** 发布操作者（后台用户名） */
  actor: string
  /** 备注（可选） */
  note?: string
  /** 内容版本号（`vYYYYMMDD-序号`） */
  contentVersion: string
  /** 区块总数（全部页面区块求和） */
  blockCount: number
  /** 页面数 */
  pageCount: number
  /** 集合记录数 */
  collectionCount: number
}

export type ReleaseList = { items: ReleaseItem[]; total: number }

/** 定时发布状态机：pending → applied | failed | canceled（终态不可逆） */
export type ScheduleStatus = 'pending' | 'applied' | 'failed' | 'canceled'

/** 定时发布条目（与后端 ScheduleItem 字段逐字一致） */
export type ScheduleItem = {
  id: string
  /** 计划应用时间（ISO 8601） */
  at: string
  note?: string
  status: ScheduleStatus
  createdBy?: string
  createdAt: string
  appliedAt?: string
  error?: string
}

export type ScheduleList = { items: ScheduleItem[]; total: number }

/** 当前令牌（未登录为 undefined，传输器据此省略 Authorization 头） */
function adminToken(): string | undefined {
  return getAdminToken() ?? undefined
}

/** 发布记录列表：GET /api/admin/publish */
export function listReleases(signal?: AbortSignal): Promise<ReleaseList> {
  return transport<ReleaseList>({ path: '/api/admin/publish', signal, token: adminToken() }, () => ({ items: [], total: 0 }))
}

/** 立即发布：POST /api/admin/publish（备注可选） */
export function createRelease(note?: string): Promise<ReleaseItem> {
  return transport<{ item: ReleaseItem }>(
    { path: '/api/admin/publish', method: 'POST', body: { note: note ?? '' }, token: adminToken() },
    () => {
      throw new ApiError('发布接口不可用', 503)
    },
  ).then((res) => res.item)
}

/** 回滚到此版本：POST /api/admin/publish/:id/restore */
export function restoreRelease(id: string): Promise<{ ok: boolean }> {
  return transport<{ ok: boolean }>(
    { path: `/api/admin/publish/${encodeURIComponent(id)}/restore`, method: 'POST', token: adminToken() },
    () => ({ ok: true }),
  )
}

/** 删除发布记录：DELETE /api/admin/publish/:id */
export function deleteRelease(id: string): Promise<{ ok: boolean }> {
  return transport<{ ok: boolean }>(
    { path: `/api/admin/publish/${encodeURIComponent(id)}`, method: 'DELETE', token: adminToken() },
    () => ({ ok: true }),
  )
}

/* ---------------- 定时发布 ---------------- */

/** 定时发布列表：GET /api/admin/publish/schedules */
export function listSchedules(signal?: AbortSignal): Promise<ScheduleList> {
  return transport<ScheduleList>(
    { path: '/api/admin/publish/schedules', signal, token: adminToken() },
    () => ({ items: [], total: 0 }),
  )
}

/** 登记定时发布：POST /api/admin/publish/schedules（创建即快照当前内容） */
export function createSchedule(input: { at: string; note?: string }): Promise<ScheduleItem> {
  return transport<{ item: ScheduleItem }>(
    { path: '/api/admin/publish/schedules', method: 'POST', body: { at: input.at, note: input.note ?? '' }, token: adminToken() },
    () => {
      throw new ApiError('定时发布接口不可用', 503)
    },
  ).then((res) => res.item)
}

/** 取消待应用的定时发布：DELETE /api/admin/publish/schedules/:id */
export function cancelSchedule(id: string): Promise<{ ok: boolean }> {
  return transport<{ ok: boolean }>(
    { path: `/api/admin/publish/schedules/${encodeURIComponent(id)}`, method: 'DELETE', token: adminToken() },
    () => ({ ok: true }),
  )
}
