/**
 * 接口层 · 壁纸主题实体
 * ================================
 * 后端契约：`gh-server/src/routes/wallpaperThemesRouter.ts`（前缀 `/api/admin/wallpaper-themes`）。
 */
import { ApiError, transport } from './client'
import { getAdminToken } from '../lib/adminAuth'

export type WallpaperThemeItem = {
  key: string
  label: string
  description: string
  sort: number
  active: boolean
  count: number
}

/** 主题列表（含使用数量）：GET /api/admin/wallpaper-themes */
export function fetchWallpaperThemes(signal?: AbortSignal): Promise<{ items: WallpaperThemeItem[] }> {
  return transport(
    { path: '/api/admin/wallpaper-themes', signal, token: getAdminToken() ?? undefined },
    () => ({ items: [] }),
  )
}

/** 新建主题：POST /api/admin/wallpaper-themes */
export function createWallpaperTheme(body: {
  key: string
  label?: string
  description?: string
  sort?: number
  active?: boolean
}): Promise<{ ok: boolean; item: WallpaperThemeItem }> {
  return transport(
    { path: '/api/admin/wallpaper-themes', method: 'POST', body, token: getAdminToken() ?? undefined },
    () => {
      throw new ApiError('新建主题接口不可用', 503)
    },
  )
}

/** 更新主题：PUT /api/admin/wallpaper-themes/:key */
export function updateWallpaperTheme(
  key: string,
  body: { label?: string; description?: string; sort?: number; active?: boolean },
): Promise<{ ok: boolean; item: WallpaperThemeItem }> {
  return transport(
    {
      path: `/api/admin/wallpaper-themes/${encodeURIComponent(key)}`,
      method: 'PUT',
      body,
      token: getAdminToken() ?? undefined,
    },
    () => {
      throw new ApiError('更新主题接口不可用', 503)
    },
  )
}

/** 删除主题：DELETE /api/admin/wallpaper-themes/:key（仍被引用 → 400） */
export function deleteWallpaperTheme(key: string): Promise<{ ok: boolean }> {
  return transport(
    {
      path: `/api/admin/wallpaper-themes/${encodeURIComponent(key)}`,
      method: 'DELETE',
      token: getAdminToken() ?? undefined,
    },
    () => {
      throw new ApiError('删除主题接口不可用', 503)
    },
  )
}
