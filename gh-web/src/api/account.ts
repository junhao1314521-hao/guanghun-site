/** 接口层 · 个人中心（/me）：页面通过本模块取数 / 提交，不直接 import data/* */
import { transport, ApiError } from './client'
import type { AuthUser, InquiryDetail, InquirySummary, LoginDevice, NotificationSetting } from '../data/auth'

export type { AuthUser, InquiryDetail, InquirySummary, LoginDevice, NotificationSetting } from '../data/auth'

/** 已登记设备（形状对齐后端 `AccountDevice`） */
export type AccountDevice = {
  model: string
  sn: string
  status: 'success' | 'muted'
  statusText: string
  warranty: string
  action: { label: string; variant: 'secondary' | 'ghost'; to?: string }
}

/** 收藏项 */
export type FavoriteItem = { name: string; spec: string; subscribed: boolean }

/** 账号设置页 · 安全项 */
export type SecurityItem = { k: string; v: string; hint: string }

const EMPTY_USER: AuthUser = { id: '', username: '', name: '', email: '', phone: '' }

/** 个人中心概览：当前用户 + 各分区计数 */
export type AccountOverview = {
  user: AuthUser
  stats: { devices: number; inquiries: number; favorites: number; notifications: number }
}

/** 概览：GET /api/account/me */
export function fetchAccountOverview(signal?: AbortSignal): Promise<AccountOverview> {
  return transport({ path: '/api/account/me', signal }, () => ({
    user: EMPTY_USER,
    stats: { devices: 0, inquiries: 0, favorites: 0, notifications: 0 },
  }))
}

/** 我的工单列表：GET /api/account/inquiries */
export function fetchMyInquiries(signal?: AbortSignal): Promise<{ items: InquirySummary[] }> {
  return transport({ path: '/api/account/inquiries', signal }, () => ({ items: [] }))
}

/** 工单详情：GET /api/account/inquiries/:id；未命中 / 非本人 → 404 */
export function fetchMyInquiry(id: string, signal?: AbortSignal): Promise<InquiryDetail> {
  return transport({ path: `/api/account/inquiries/${id}`, signal }, () => {
    throw new ApiError('未找到该工单', 404)
  })
}

/** 提交工单补充回复：POST /api/account/inquiries/:id/replies */
export function replyMyInquiry(id: string, text: string): Promise<{ ok: boolean; detail: InquiryDetail }> {
  return transport(
    { path: `/api/account/inquiries/${id}/replies`, method: 'POST', body: { text } },
    () => ({ ok: true, detail: { id, title: '', model: '', status: '', createdAt: '', updatedAt: '', timeline: [] } }),
  )
}

/** 我的设备：GET /api/account/devices */
export function fetchMyDevices(signal?: AbortSignal): Promise<{ items: AccountDevice[] }> {
  return transport({ path: '/api/account/devices', signal }, () => ({ items: [] }))
}

/** 登记设备：POST /api/account/devices */
export function addMyDevice(body: { model: string; sn: string }): Promise<{ items: AccountDevice[] }> {
  return transport({ path: '/api/account/devices', method: 'POST', body }, () => ({ items: [] }))
}

/** 删除设备：DELETE /api/account/devices/:sn */
export function removeMyDevice(sn: string): Promise<{ ok: boolean; items: AccountDevice[] }> {
  return transport(
    { path: `/api/account/devices/${encodeURIComponent(sn)}`, method: 'DELETE' },
    () => ({ ok: true, items: [] }),
  )
}

/** 我的收藏：GET /api/account/favorites */
export function fetchMyFavorites(signal?: AbortSignal): Promise<{ items: FavoriteItem[] }> {
  return transport({ path: '/api/account/favorites', signal }, () => ({ items: [] }))
}

/** 取消收藏：DELETE /api/account/favorites/:name */
export function removeMyFavorite(name: string): Promise<{ ok: boolean; items: FavoriteItem[] }> {
  return transport(
    { path: `/api/account/favorites/${encodeURIComponent(name)}`, method: 'DELETE' },
    () => ({ ok: true, items: [] }),
  )
}

/** 新增收藏：POST /api/account/favorites */
export function addMyFavorite(body: { name: string; spec?: string }): Promise<{ items: FavoriteItem[] }> {
  return transport({ path: '/api/account/favorites', method: 'POST', body }, () => ({ items: [] }))
}

/** 订阅与通知：GET /api/account/notifications */
export function fetchMyNotifications(signal?: AbortSignal): Promise<{ items: NotificationSetting[] }> {
  return transport({ path: '/api/account/notifications', signal }, () => ({ items: [] }))
}

/** 保存订阅与通知：PUT /api/account/notifications */
export function updateMyNotifications(
  items: NotificationSetting[],
): Promise<{ ok: boolean; items: NotificationSetting[] }> {
  return transport({ path: '/api/account/notifications', method: 'PUT', body: { items } }, () => ({ ok: true, items }))
}

/** 账号设置载荷：基本资料 + 安全项 + 登录设备 */
export type AccountSettings = {
  user: AuthUser
  security: SecurityItem[]
  loginDevices: LoginDevice[]
}

/** 账号设置：GET /api/account/settings */
export function fetchMySettings(signal?: AbortSignal): Promise<AccountSettings> {
  return transport({ path: '/api/account/settings', signal }, () => ({
    user: EMPTY_USER,
    security: [],
    loginDevices: [],
  }))
}

/** 更新基本资料：PUT /api/account/settings */
export function updateMySettings(body: { name?: string; phone?: string }): Promise<{ ok: boolean; user: AuthUser }> {
  return transport({ path: '/api/account/settings', method: 'PUT', body }, () => ({ ok: true, user: EMPTY_USER }))
}

/** 更换邮箱：POST /api/account/email */
export function changeMyEmail(email: string): Promise<{ ok: boolean; user: AuthUser }> {
  return transport({ path: '/api/account/email', method: 'POST', body: { email } }, () => ({ ok: true, user: EMPTY_USER }))
}

/** 退出指定登录设备（吊销会话）：DELETE /api/account/sessions/:token */
export function revokeMySession(token: string): Promise<{ ok: boolean }> {
  return transport({ path: `/api/account/sessions/${encodeURIComponent(token)}`, method: 'DELETE' }, () => ({ ok: true }))
}

/** 注销账号：POST /api/account/delete */
export function deleteMyAccount(): Promise<{ ok: boolean }> {
  return transport({ path: '/api/account/delete', method: 'POST' }, () => ({ ok: true }))
}
