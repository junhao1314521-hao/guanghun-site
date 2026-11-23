import { Router } from 'express'
import { listCollection } from '../data/collectionStore'
import { readLocale } from '../data/locale'
import { listWallpaperThemes } from '../data/wallpaperThemes'
import { fileStatusOf } from '../lib/fileStatus'
import { wallpaperVariantsOf } from '../lib/wallpaperVariants'

/**
 * 品牌壁纸公开端点（挂载于 /api）：
 * GET /wallpapers → { items, themes }
 *
 * items 来自集合 `wallpapers`（后台「品牌壁纸」同一份数据）；
 * themes 来自实体表 `wallpaper_themes`（仅启用项，按后台排序），附实时数量供前台 chips 使用。
 */
export const wallpapersRouter = Router()

wallpapersRouter.get('/wallpapers', (req, res) => {
  const items = listCollection('wallpapers', readLocale(req)).map((item) => ({
    ...item,
    ...fileStatusOf(item.fileUrl),
    // 前台按此列表提供 4K / 2K / 1080p 下载；仅返回磁盘上真实存在的档位
    variants: wallpaperVariantsOf(item),
  }))
  const counts = new Map<string, number>()
  for (const item of items) counts.set(item.theme, (counts.get(item.theme) ?? 0) + 1)
  // 主题来自实体表（仅启用项）；历史壁纸若引用了未登记主题，仍作为兜底项追加，避免无分类
  const registered = listWallpaperThemes()
  const known = new Set(registered.map((theme) => theme.key))
  const themes = [
    ...registered
      .filter((theme) => theme.active)
      .map((theme) => ({ key: theme.key, label: theme.label, desc: theme.description, count: counts.get(theme.key) ?? 0 })),
    ...[...counts.keys()]
      .filter((key) => !known.has(key))
      .map((key) => ({ key, label: key, desc: '', count: counts.get(key) ?? 0 })),
  ]
  res.json({ items, themes })
})
