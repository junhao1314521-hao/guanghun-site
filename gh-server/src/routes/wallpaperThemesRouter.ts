/**
 * 后台 · 壁纸主题管理（挂载于 /api/admin，需 `content` 权限）。
 *
 *   GET    /admin/wallpaper-themes        → { items: [{ key,label,description,sort,active,count }] }
 *   POST   /admin/wallpaper-themes        body { key,label?,description?,sort?,active? }
 *   PUT    /admin/wallpaper-themes/:key   body { label?,description?,sort?,active? }
 *   DELETE /admin/wallpaper-themes/:key   → 仍被壁纸引用 → 400
 */
import { Router } from 'express'
import {
  createWallpaperTheme,
  deleteWallpaperTheme,
  listWallpaperThemes,
  updateWallpaperTheme,
  wallpaperThemeUsage,
} from '../data/wallpaperThemes'
import { readParam, requireSession } from '../middleware/adminAuth'
import { requireScope } from '../middleware/rbac'
import { auditWrite } from '../middleware/audit'

export const wallpaperThemesRouter = Router()

/** 列表：主题 + 实时使用数量 */
function listWithCounts() {
  const counts = wallpaperThemeUsage()
  return listWallpaperThemes().map((theme) => ({ ...theme, count: counts.get(theme.key) ?? 0 }))
}

wallpaperThemesRouter.get('/wallpaper-themes', requireSession, requireScope('content'), (_req, res) => {
  res.json({ items: listWithCounts() })
})

wallpaperThemesRouter.post(
  '/wallpaper-themes',
  requireSession,
  requireScope('content'),
  auditWrite('create-wallpaper-theme', (req) => `壁纸主题 ${String((req.body ?? {}).key ?? '')}`),
  (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>
    const outcome = createWallpaperTheme({
      key: typeof body.key === 'string' ? body.key : '',
      label: typeof body.label === 'string' ? body.label : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      sort: typeof body.sort === 'number' ? body.sort : undefined,
      active: typeof body.active === 'boolean' ? body.active : undefined,
    })
    if (!outcome.ok) {
      res.status(400).json({ error: outcome.error })
      return
    }
    res.status(201).json({ ok: true, item: { ...outcome.item, count: 0 } })
  },
)

wallpaperThemesRouter.put(
  '/wallpaper-themes/:key',
  requireSession,
  requireScope('content'),
  auditWrite('update-wallpaper-theme', (req) => `壁纸主题 ${readParam(req, 'key')}`),
  (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>
    const outcome = updateWallpaperTheme(readParam(req, 'key'), {
      label: typeof body.label === 'string' ? body.label : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      sort: typeof body.sort === 'number' ? body.sort : undefined,
      active: typeof body.active === 'boolean' ? body.active : undefined,
    })
    if (!outcome.ok) {
      res.status(400).json({ error: outcome.error })
      return
    }
    res.json({ ok: true, item: outcome.item })
  },
)

wallpaperThemesRouter.delete(
  '/wallpaper-themes/:key',
  requireSession,
  requireScope('content'),
  auditWrite('delete-wallpaper-theme', (req) => `壁纸主题 ${readParam(req, 'key')}`),
  (req, res) => {
    const outcome = deleteWallpaperTheme(readParam(req, 'key'))
    if (!outcome.ok) {
      res.status(400).json({ error: outcome.error })
      return
    }
    res.json({ ok: true })
  },
)
