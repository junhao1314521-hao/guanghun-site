/**
 * 接口层 · 后台成员与权限
 * ================================
 * 后端契约：`gh-server/src/routes/adminUsersRouter.ts`（前缀 `/api/admin/admin-users`）。
 * 数据真源为 `admin_users`；角色选项来自 `/api/admin/roles`。
 */
import { ApiError, transport } from './client'
import { getAdminToken } from '../lib/adminAuth'

export type AdminTeamMember = {
  id: string
  username: string
  name: string
  role: string
  roleName: string
  scopes: string[]
  createdAt: string
  sessionCount: number
  builtin: boolean
}

/** 成员列表：GET /api/admin/admin-users */
export function fetchAdminUsers(signal?: AbortSignal): Promise<{ items: AdminTeamMember[] }> {
  return transport(
    { path: '/api/admin/admin-users', signal, token: getAdminToken() ?? undefined },
    () => ({ items: [] }),
  )
}

/** 新建成员：POST /api/admin/admin-users */
export function createAdminUser(body: {
  username: string
  name: string
  role: string
  password: string
}): Promise<{ ok: boolean; item: AdminTeamMember }> {
  return transport(
    { path: '/api/admin/admin-users', method: 'POST', body, token: getAdminToken() ?? undefined },
    () => {
      throw new ApiError('新建成员接口不可用', 503)
    },
  )
}

/** 更新成员姓名 / 角色：PUT /api/admin/admin-users/:id */
export function updateAdminUser(
  id: string,
  body: { name?: string; role?: string },
): Promise<{ ok: boolean; item: AdminTeamMember }> {
  return transport(
    {
      path: `/api/admin/admin-users/${encodeURIComponent(id)}`,
      method: 'PUT',
      body,
      token: getAdminToken() ?? undefined,
    },
    () => {
      throw new ApiError('更新成员接口不可用', 503)
    },
  )
}

/** 重置成员密码：POST /api/admin/admin-users/:id/reset-password */
export function resetAdminUserPassword(id: string): Promise<{ ok: boolean; tempPassword: string }> {
  return transport(
    {
      path: `/api/admin/admin-users/${encodeURIComponent(id)}/reset-password`,
      method: 'POST',
      token: getAdminToken() ?? undefined,
    },
    () => {
      throw new ApiError('重置密码接口不可用', 503)
    },
  )
}

/** 强制成员下线：POST /api/admin/admin-users/:id/logout */
export function forceLogoutAdminUser(id: string): Promise<{ ok: boolean; removed: number }> {
  return transport(
    {
      path: `/api/admin/admin-users/${encodeURIComponent(id)}/logout`,
      method: 'POST',
      token: getAdminToken() ?? undefined,
    },
    () => {
      throw new ApiError('强制下线接口不可用', 503)
    },
  )
}

/** 删除成员：DELETE /api/admin/admin-users/:id */
export function deleteAdminUser(id: string): Promise<{ ok: boolean }> {
  return transport(
    {
      path: `/api/admin/admin-users/${encodeURIComponent(id)}`,
      method: 'DELETE',
      token: getAdminToken() ?? undefined,
    },
    () => {
      throw new ApiError('删除成员接口不可用', 503)
    },
  )
}
