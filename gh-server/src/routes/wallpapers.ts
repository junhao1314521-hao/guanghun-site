import { Router } from 'express'
import { listCollection } from '../data/collectionStore'
import { readLocale } from '../data/locale'
import { WALLPAPER_THEMES } from '../data/wallpapers'
import { fileStatusOf } from '../lib/fileStatus'
import { wallpaperVariantsOf } from '../lib/wallpaperVariants'

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
    // 前台按此列表提供 4K / 2K / 1080p 下载；仅返回磁盘上真实存在的档位
    variants: wallpaperVariantsOf(item),
  }))
  const counts = new Map<string, number>()
  for (const item of items) counts.set(item.theme, (counts.get(item.theme) ?? 0) + 1)
  // 主题不再写死：内置主题保留顺序与说明，后台上传时新填的主题按出现顺序追加
  const builtin = new Set<string>(WALLPAPER_THEMES.map((theme) => theme.key))
  const themes = [
    ...WALLPAPER_THEMES.map((theme) => ({ ...theme, count: counts.get(theme.key) ?? 0 })),
    ...[...counts.keys()]
      .filter((key) => !builtin.has(key))
      .map((key) => ({ key, label: key, desc: '', count: counts.get(key) ?? 0 })),
  ]
  res.json({ items, themes })
})
