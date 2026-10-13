/** 接口层 · 客户中心 / 个人中心资源：页面通过本模块取数，不直接 import data/* */
import { transport, ApiError } from './client'
import {
  ACCOUNT_DEVICES,
  ACCOUNT_NAV,
  ACCOUNT_TICKETS,
  FAVORITES,
  OVERVIEW_ALERT,
  OVERVIEW_STATS,
  PROFILE,
  SECURITY,
  type AccountDevice,
  type FavoriteItem,
  type SecurityItem,
} from '../data/account'
import type { AuthUser, InquiryDetail, InquirySummary, LoginDevice, NotificationSetting } from '../data/auth'

export type { AccountDevice, FavoriteItem } from '../data/account'
export type { AuthUser, InquiryDetail, InquirySummary, LoginDevice, NotificationSetting, SecurityItem } from '../data/auth'

export type AccountPayload = {
  PROFILE: typeof PROFILE
  ACCOUNT_NAV: typeof ACCOUNT_NAV
  OVERVIEW_STATS: typeof OVERVIEW_STATS
  OVERVIEW_ALERT: typeof OVERVIEW_ALERT
  ACCOUNT_DEVICES: typeof ACCOUNT_DEVICES
  ACCOUNT_TICKETS: typeof ACCOUNT_TICKETS
  FAVORITES: typeof FAVORITES
  SECURITY: typeof SECURITY
}

/** 客户中心聚合数据（公开页 `/account`）：账号信息、导航、概览、设备、咨询、收藏与安全 */
export function fetchAccount(signal?: AbortSignal): Promise<AccountPayload> {
  return transport({ path: '/api/account', signal }, () => ({
    PROFILE,
    ACCOUNT_NAV,
    OVERVIEW_STATS,
    OVERVIEW_ALERT,
    ACCOUNT_DEVICES,
    ACCOUNT_TICKETS,
    FAVORITES,
    SECURITY,
  }))
}

/* ============================================================
   个人中心（/me）：全部按当前登录用户隔离，未登录 → 401
   ============================================================ */

/** 个人中心概览：当前用户 + 各分区计数 */
export type AccountOverview = {
  user: AuthUser
  stats: { devices: number; inquiries: number; favorites: number; notifications: number }
}

const EMPTY_USER: AuthUser = { id: '', username: '', name: '', email: '', phone: '' }

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

/** 我的设备：GET /api/account/devices */
export function fetchMyDevices(signal?: AbortSignal): Promise<{ items: AccountDevice[] }> {
  return transport({ path: '/api/account/devices', signal }, () => ({ items: [] }))
}

/** 我的收藏：GET /api/account/favorites */
export function fetchMyFavorites(signal?: AbortSignal): Promise<{ items: FavoriteItem[] }> {
  return transport({ path: '/api/account/favorites', signal }, () => ({ items: [] }))
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
