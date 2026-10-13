/**
 * 接口层 · 后台管理系统
 * ================================
 * 页面只依赖本模块；令牌经 `lib/adminAuth` 读取并随请求发送。
 * 后端契约：`gh-server` 的 `routes/adminRouter.ts`（前缀 `/api/admin`）。
 */
import { ApiError, transport } from './client'
import { getAdminToken } from '../lib/adminAuth'
import type {
  AdminAnalytics,
  AdminDetail,
  AdminList,
  AdminLoginResult,
  AdminOverview,
  AdminProfile,
  AdminRow,
} from '../data/admin'

export type { AdminAnalytics, AdminDetail, AdminList, AdminLoginResult, AdminOverview, AdminProfile, AdminRow }

export type AdminLoginBody = { username: string; password: string }

/** 登录：POST /api/admin/auth/login */
export function adminLogin(body: AdminLoginBody): Promise<AdminLoginResult> {
  return transport({ path: '/api/admin/auth/login', method: 'POST', body }, () => {
    throw new ApiError('登录接口不可用', 503)
  })
}

/** 退出：POST /api/admin/auth/logout（令牌失效） */
export function adminLogout(): Promise<{ ok: boolean }> {
  return transport({ path: '/api/admin/auth/logout', method: 'POST', token: getAdminToken() ?? undefined }, () => ({ ok: true }))
}

/** 当前后台用户：GET /api/admin/auth/me（未登录 / 令牌失效 → 401） */
export function fetchAdminMe(signal?: AbortSignal): Promise<AdminProfile> {
  return transport({ path: '/api/admin/auth/me', signal, token: getAdminToken() ?? undefined }, () => {
    throw new ApiError('未登录', 401)
  })
}

/** 工作台概览：GET /api/admin/overview */
export function fetchAdminOverview(signal?: AbortSignal): Promise<AdminOverview> {
  return transport({ path: '/api/admin/overview', signal, token: getAdminToken() ?? undefined }, () => {
    throw new ApiError('概览接口不可用', 503)
  })
}

/** 资源列表：GET /api/admin/resources/:key */
export function fetchAdminResource(key: string, signal?: AbortSignal): Promise<AdminList> {
  return transport({ path: `/api/admin/resources/${key}`, signal, token: getAdminToken() ?? undefined }, () => ({ items: [], total: 0 }))
}

/** 资源详情：GET /api/admin/resources/:key/:id；未命中 → 404 */
export function fetchAdminResourceDetail(key: string, id: string, signal?: AbortSignal): Promise<AdminDetail> {
  return transport(
    { path: `/api/admin/resources/${key}/${id}`, signal, token: getAdminToken() ?? undefined },
    () => {
      throw new ApiError('未找到该记录', 404)
    },
  )
}

/** 新建 / 编辑：POST（无 id）或 PUT（有 id） */
export function saveAdminResource(
  key: string,
  id: string | undefined,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; item: AdminRow }> {
  const path = id ? `/api/admin/resources/${key}/${id}` : `/api/admin/resources/${key}`
  const method = id ? 'PUT' : 'POST'
  return transport({ path, method, body, token: getAdminToken() ?? undefined }, () => ({
    ok: true,
    item: body as AdminRow,
  }))
}

/** 删除：DELETE /api/admin/resources/:key/:id */
export function deleteAdminResource(key: string, id: string): Promise<{ ok: boolean }> {
  return transport(
    { path: `/api/admin/resources/${key}/${id}`, method: 'DELETE', token: getAdminToken() ?? undefined },
    () => ({ ok: true }),
  )
}

/** 行内动作（发布 / 备份 / 恢复等占位）：POST /api/admin/resources/:key/:id/action */
export function runAdminRowAction(key: string, id: string, action: string): Promise<{ ok: boolean }> {
  return transport(
    { path: `/api/admin/resources/${key}/${id}/action`, method: 'POST', body: { action }, token: getAdminToken() ?? undefined },
    () => ({ ok: true }),
  )
}

/** 数据分析：GET /api/admin/analytics/:scope */
export function fetchAdminAnalytics(scope: string, signal?: AbortSignal): Promise<AdminAnalytics> {
  return transport({ path: `/api/admin/analytics/${scope}`, signal, token: getAdminToken() ?? undefined }, () => {
    throw new ApiError('分析接口不可用', 503)
  })
}

/* ---------------- 回收站（软删除） ---------------- */

/** 回收站条目类型（集合 / 后台资源 / 页面 / 素材） */
export type AdminTrashType = 'collection' | 'resource' | 'page' | 'upload'

/** 回收站条目（与后端 trashStore.TrashItem 一致） */
export type AdminTrashItem = {
  /** 回收站条目 id（用于恢复 / 彻底删除） */
  id: string
  /** 原栏目 key（含 'pages' / 'uploads'） */
  key: string
  /** 条目类型：集合 / 后台资源 / 页面 / 素材 */
  type: AdminTrashType
  /** 原记录 id（页面为页面 key；素材为磁盘文件名） */
  recordId: string
  /** 记录显示名 */
  name: string
  /** 删除时间（ISO 8601） */
  deletedAt: string
  /** 删除人 */
  deletedBy: string
}

export type AdminTrashList = { items: AdminTrashItem[]; total: number }

/** 回收站列表：GET /api/admin/resources/trash */
export function fetchAdminTrash(signal?: AbortSignal): Promise<AdminTrashList> {
  return transport({ path: '/api/admin/resources/trash', signal, token: getAdminToken() ?? undefined }, () => ({
    items: [],
    total: 0,
  }))
}

/** 恢复：POST /api/admin/resources/trash/:id/restore（原 id 被占用 → 409） */
export function restoreAdminTrash(id: string): Promise<{ ok: boolean }> {
  return transport(
    { path: `/api/admin/resources/trash/${encodeURIComponent(id)}/restore`, method: 'POST', token: getAdminToken() ?? undefined },
    () => ({ ok: true }),
  )
}

/** 彻底删除：DELETE /api/admin/resources/trash/:id */
export function purgeAdminTrash(id: string): Promise<{ ok: boolean }> {
  return transport(
    { path: `/api/admin/resources/trash/${encodeURIComponent(id)}`, method: 'DELETE', token: getAdminToken() ?? undefined },
    () => ({ ok: true }),
  )
}