/**
 * 壁纸主题实体（SQLite `wallpaper_themes`）。
 *
 * 取代此前的「固定枚举」：后台可新建 / 改名 / 说明 / 排序 / 停用主题；
 * 壁纸记录仍通过 `theme` 字段引用主题 key（历史数据的中文主题名即 key）。
 * 内置三个主题在首次读取时幂等写入，保证老库升级后前台仍有默认分类。
 */
import { getDb } from './db'
import { listCollection } from './collectionStore'
import { WALLPAPER_THEMES } from './wallpapers'

export type WallpaperThemeRow = {
  key: string
  label: string
  description: string
  sort: number
  active: boolean
}

/** 首次读取时写入内置主题（仅当表为空） */
function ensureSeeded(): void {
  const db = getDb()
  const count = (db.prepare('SELECT COUNT(*) AS n FROM wallpaper_themes').get() as { n: number }).n
  if (count > 0) return
  const insert = db.prepare(
    'INSERT OR IGNORE INTO wallpaper_themes(key, label, description, sort, active, created_at) VALUES(?, ?, ?, ?, 1, ?)',
  )
  const now = new Date().toISOString()
  WALLPAPER_THEMES.forEach((theme, index) => {
    insert.run(theme.key, theme.label, theme.desc, index + 1, now)
  })
}

/** 全部主题（含停用；后台管理用） */
export function listWallpaperThemes(): WallpaperThemeRow[] {
  ensureSeeded()
  const rows = getDb()
    .prepare('SELECT key, label, description, sort, active FROM wallpaper_themes ORDER BY sort ASC, created_at ASC, key ASC')
    .all() as Array<{ key: string; label: string; description: string | null; sort: number; active: number }>
  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    description: row.description ?? '',
    sort: Number(row.sort),
    active: Number(row.active) !== 0,
  }))
}

/** 主题被壁纸引用的数量（key = 壁纸 theme 字段） */
export function wallpaperThemeUsage(): Map<string, number> {
  const counts = new Map<string, number>()
  for (const item of listCollection('wallpapers')) {
    const key = String((item as { theme?: unknown }).theme ?? '')
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/** 主题 key 校验：1–40 位，不含空白与斜杠 */
function themeKeyError(key: string): string | null {
  if (!key) return '请填写主题名称'
  if (key.length > 40) return '主题名称不能超过 40 个字符'
  if (/[\s/]/.test(key)) return '主题名称不能包含空格或斜杠'
  return null
}

/** 新建主题；失败返回可读原因 */
export function createWallpaperTheme(input: {
  key: string
  label?: string
  description?: string
  sort?: number
  active?: boolean
}): { ok: true; item: WallpaperThemeRow } | { ok: false; error: string } {
  ensureSeeded()
  const key = input.key.trim()
  const problem = themeKeyError(key)
  if (problem) return { ok: false, error: problem }
  const exists = getDb().prepare('SELECT 1 FROM wallpaper_themes WHERE key = ?').get(key)
  if (exists) return { ok: false, error: '该主题已存在' }
  const sort = Number.isFinite(input.sort) ? Number(input.sort) : listWallpaperThemes().length + 1
  getDb()
    .prepare('INSERT INTO wallpaper_themes(key, label, description, sort, active, created_at) VALUES(?, ?, ?, ?, ?, ?)')
    .run(key, (input.label ?? key).trim() || key, (input.description ?? '').trim(), sort, input.active === false ? 0 : 1, new Date().toISOString())
  return { ok: true, item: listWallpaperThemes().find((item) => item.key === key)! }
}

/** 更新主题（改名 / 说明 / 排序 / 启停）；key 不可改（壁纸引用它） */
export function updateWallpaperTheme(
  key: string,
  patch: { label?: string; description?: string; sort?: number; active?: boolean },
): { ok: true; item: WallpaperThemeRow } | { ok: false; error: string } {
  ensureSeeded()
  const current = getDb().prepare('SELECT key, label, description, sort, active FROM wallpaper_themes WHERE key = ?').get(key) as
    | { key: string; label: string; description: string | null; sort: number; active: number }
    | undefined
  if (!current) return { ok: false, error: '主题不存在' }
  const label = patch.label !== undefined ? patch.label.trim() : current.label
  if (!label) return { ok: false, error: '请填写主题名称' }
  const description = patch.description !== undefined ? patch.description.trim() : (current.description ?? '')
  const sort = patch.sort !== undefined && Number.isFinite(patch.sort) ? Number(patch.sort) : Number(current.sort)
  const active = patch.active !== undefined ? (patch.active ? 1 : 0) : Number(current.active)
  getDb()
    .prepare('UPDATE wallpaper_themes SET label = ?, description = ?, sort = ?, active = ? WHERE key = ?')
    .run(label, description, sort, active, key)
  return { ok: true, item: listWallpaperThemes().find((item) => item.key === key)! }
}

/** 删除主题：仍被壁纸引用时拒绝（避免前台出现无分类壁纸） */
export function deleteWallpaperTheme(key: string): { ok: true } | { ok: false; error: string } {
  ensureSeeded()
  const exists = getDb().prepare('SELECT 1 FROM wallpaper_themes WHERE key = ?').get(key)
  if (!exists) return { ok: false, error: '主题不存在' }
  const used = wallpaperThemeUsage().get(key) ?? 0
  if (used > 0) return { ok: false, error: `仍有 ${used} 张壁纸使用该主题，请先改到其它主题` }
  getDb().prepare('DELETE FROM wallpaper_themes WHERE key = ?').run(key)
  return { ok: true }
}
