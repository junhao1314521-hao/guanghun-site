/**
 * 接口层 · 后台会员管理
 * ================================
 * 后端契约：`gh-server/src/routes/membersRouter.ts`（前缀 `/api/admin/members`）。
 * 列表与详情默认脱敏；明文联系方式需显式调用 reveal（服务端写审计）。
 */
import { ApiError, transport } from './client'
import { getAdminToken } from '../lib/adminAuth'

export type MemberStatus = 'active' | 'frozen'

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
  /** 运营标签（后台内部） */
  tags: string[]
  /** 内部备注 */
  note: string
}

export type AdminMemberDetail = AdminMember & {
  sessions: Array<{ createdAt: string; expiresAt: string }>
  devices: Array<{ id: string; model: string; sn: string; status: string; createdAt: string }>
}

export type AdminMemberList = {
  items: AdminMember[]
  total: number
  page: number
  pageSize: number
}

export type AdminMemberQuery = { q?: string; status?: string; tag?: string; page?: number; pageSize?: number }

/** 会员列表：GET /api/admin/members */
export function fetchAdminMembers(query: AdminMemberQuery, signal?: AbortSignal): Promise<AdminMemberList> {
  return transport(
    {
      path: '/api/admin/members',
      query: {
        q: query.q || undefined,
        status: query.status || undefined,
        tag: query.tag || undefined,
        page: query.page,
        pageSize: query.pageSize,
      },
      signal,
      token: getAdminToken() ?? undefined,
    },
    () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
  )
}

/** 会员详情（脱敏）：GET /api/admin/members/:id */
export function fetchAdminMember(id: string, signal?: AbortSignal): Promise<AdminMemberDetail> {
  return transport<{ item: AdminMemberDetail }>(
    { path: `/api/admin/members/${encodeURIComponent(id)}`, signal, token: getAdminToken() ?? undefined },
    () => {
      throw new ApiError('会员详情接口不可用', 503)
    },
  ).then((res) => res.item)
}

/** 明文联系方式（服务端写审计）：GET /api/admin/members/:id/contact */
export function revealMemberContact(id: string): Promise<{ email: string; phone: string }> {
  return transport(
    { path: `/api/admin/members/${encodeURIComponent(id)}/contact`, token: getAdminToken() ?? undefined },
    () => {
      throw new ApiError('联系方式接口不可用', 503)
    },
  )
}

/** 冻结 / 解冻：POST /api/admin/members/:id/status */
export function setMemberStatus(id: string, status: MemberStatus): Promise<{ ok: boolean; item: AdminMember }> {
  return transport(
    {
      path: `/api/admin/members/${encodeURIComponent(id)}/status`,
      method: 'POST',
      body: { status },
      token: getAdminToken() ?? undefined,
    },
    () => {
      throw new ApiError('会员状态接口不可用', 503)
    },
  )
}

/** 重置密码：POST /api/admin/members/:id/reset-password（临时密码仅返回一次） */
export function resetMemberPassword(id: string): Promise<{ ok: boolean; tempPassword: string }> {
  return transport(
    {
      path: `/api/admin/members/${encodeURIComponent(id)}/reset-password`,
      method: 'POST',
      token: getAdminToken() ?? undefined,
    },
    () => {
      throw new ApiError('重置密码接口不可用', 503)
    },
  )
}

/** 强制下线：POST /api/admin/members/:id/logout */
export function forceLogoutMember(id: string): Promise<{ ok: boolean; removed: number }> {
  return transport(
    {
      path: `/api/admin/members/${encodeURIComponent(id)}/logout`,
      method: 'POST',
      token: getAdminToken() ?? undefined,
    },
    () => {
      throw new ApiError('强制下线接口不可用', 503)
    },
  )
}

/** 全部运营标签：GET /api/admin/members-tags */
export function fetchMemberTags(signal?: AbortSignal): Promise<{ items: string[] }> {
  return transport({ path: '/api/admin/members-tags', signal, token: getAdminToken() ?? undefined }, () => ({ items: [] }))
}

/** 更新运营标签 / 内部备注：PUT /api/admin/members/:id/ops */
export function updateMemberOps(
  id: string,
  body: { tags?: string[]; note?: string },
): Promise<{ ok: boolean; item: AdminMemberDetail }> {
  return transport(
    {
      path: `/api/admin/members/${encodeURIComponent(id)}/ops`,
      method: 'PUT',
      body,
      token: getAdminToken() ?? undefined,
    },
    () => {
      throw new ApiError('会员运营接口不可用', 503)
    },
  )
}
