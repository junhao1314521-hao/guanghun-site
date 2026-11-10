import { Router } from 'express'
import { listCollection } from '../data/collectionStore'
import { readLocale } from '../data/locale'
import { WALLPAPER_THEMES } from '../data/wallpapers'
import { fileStatusOf } from '../lib/fileStatus'

/**
 * 品牌壁纸公开端点（挂载于 /api）：
 * GET /wallpapers → { items, themes }
 *
 * items 来自集合 `wallpapers`（后台「品牌壁纸」同一份数据）；
 * themes 为固定枚举 + 实时数量，供前台 chips 渲染与禁用空分类。
 */
export const wallpapersRouter = Router()

wallpapersRouter.get('/wallpapers', (req, res) => {
  const items = listCollection('wallpapers', readLocale(req)).map((item) => ({
    ...item,
    ...fileStatusOf(item.fileUrl),
  }))
  const counts = new Map<string, number>()
  for (const item of items) counts.set(item.theme, (counts.get(item.theme) ?? 0) + 1)
  const themes = WALLPAPER_THEMES.map((theme) => ({ ...theme, count: counts.get(theme.key) ?? 0 }))
  res.json({ items, themes })
})
