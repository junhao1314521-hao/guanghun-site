/**
 * SEO 元信息覆盖（SQLite `seo_overrides`）。
 *
 * 后台可编辑静态路由的标题 / 描述 / 收录开关；未覆盖时回落到 `data/seoDefaults.ts`。
 * 只允许写入已登记的静态路由，避免把任意路径塞进库中影响 404 等页面。
 */
import { getDb } from './db'
import { STATIC_SEO, isEditableSeoPath } from './seoDefaults'

export type SeoOverride = {
  path: string
  title: string
  description: string
  indexable: boolean
  /** 分享图（站点相对路径或 http(s) 绝对地址；空串 = 使用默认分享图） */
  image: string
  updatedAt: string
}

/** 后台列表项：默认值 + 当前生效值 + 是否已覆盖 */
export type SeoAdminItem = {
  path: string
  title: string
  description: string
  indexable: boolean
  image: string
  defaultTitle: string
  defaultDescription: string
  defaultIndexable: boolean
  override: boolean
  updatedAt: string
}

const MAX_TITLE = 80
const MAX_DESCRIPTION = 200

/** 全部覆盖记录（按路径去重，前台启动时一次拉取） */
export function listSeoOverrides(): SeoOverride[] {
  const rows = getDb()
    .prepare('SELECT path, title, description, indexable, image, updated_at FROM seo_overrides ORDER BY path ASC')
    .all() as Array<{
    path: string
    title: string
    description: string
    indexable: number
    image: string | null
    updated_at: string | null
  }>
  return rows.map((row) => ({
    path: row.path,
    title: row.title,
    description: row.description,
    indexable: Number(row.indexable) !== 0,
    image: row.image ?? '',
    updatedAt: row.updated_at ?? '',
  }))
}

/** 单条覆盖（服务端注入 head 时使用） */
export function getSeoOverride(path: string): SeoOverride | undefined {
  const row = getDb()
    .prepare('SELECT path, title, description, indexable, image, updated_at FROM seo_overrides WHERE path = ?')
    .get(path) as
    | {
        path: string
        title: string
        description: string
        indexable: number
        image: string | null
        updated_at: string | null
      }
    | undefined
  if (!row) return undefined
  return {
    path: row.path,
    title: row.title,
    description: row.description,
    indexable: Number(row.indexable) !== 0,
    image: row.image ?? '',
    updatedAt: row.updated_at ?? '',
  }
}

/** 后台列表：静态路由全量 + 覆盖状态 */
export function listSeoAdminItems(): SeoAdminItem[] {
  const overrides = new Map(listSeoOverrides().map((item) => [item.path, item]))
  return Object.entries(STATIC_SEO).map(([path, base]) => {
    const override = overrides.get(path)
    return {
      path,
      title: override?.title ?? base.title,
      description: override?.description ?? base.description,
      indexable: override?.indexable ?? base.indexable,
      image: override?.image ?? '',
      defaultTitle: base.title,
      defaultDescription: base.description,
      defaultIndexable: base.indexable,
      override: Boolean(override),
      updatedAt: override?.updatedAt ?? '',
    }
  })
}

/** 校验并保存覆盖；path 必须是已登记的静态路由 */
export function saveSeoOverride(input: {
  path: string
  title: string
  description: string
  indexable: boolean
  image?: string
}): { ok: true; item: SeoAdminItem } | { ok: false; error: string } {
  const path = input.path.trim()
  if (!isEditableSeoPath(path)) return { ok: false, error: '只能编辑已登记的静态路由' }
  const title = input.title.trim()
  const description = input.description.trim()
  const image = (input.image ?? '').trim()
  if (!title) return { ok: false, error: '请填写页面标题' }
  if (title.length > MAX_TITLE) return { ok: false, error: `标题不能超过 ${MAX_TITLE} 个字符` }
  if (!description) return { ok: false, error: '请填写页面描述' }
  if (description.length > MAX_DESCRIPTION) {
    return { ok: false, error: `描述不能超过 ${MAX_DESCRIPTION} 个字符` }
  }
  if (image && !/^(https?:\/\/|\/)/i.test(image)) {
    return { ok: false, error: '分享图需填写 http(s) 地址或以 / 开头的站内路径' }
  }
  if (image.length > 300) return { ok: false, error: '分享图地址不能超过 300 个字符' }
  getDb()
    .prepare(
      `INSERT INTO seo_overrides(path, title, description, indexable, image, updated_at) VALUES(?, ?, ?, ?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET title = excluded.title, description = excluded.description,
         indexable = excluded.indexable, image = excluded.image, updated_at = excluded.updated_at`,
    )
    .run(path, title, description, input.indexable ? 1 : 0, image || null, new Date().toISOString())
  const item = listSeoAdminItems().find((entry) => entry.path === path)
  if (!item) return { ok: false, error: '保存后读取失败，请重试' }
  return { ok: true, item }
}

/** 恢复默认：删除覆盖记录（不存在也视为成功） */
export function resetSeoOverride(path: string): { ok: true; item: SeoAdminItem } | { ok: false; error: string } {
  if (!isEditableSeoPath(path)) return { ok: false, error: '只能编辑已登记的静态路由' }
  getDb().prepare('DELETE FROM seo_overrides WHERE path = ?').run(path)
  const item = listSeoAdminItems().find((entry) => entry.path === path)
  if (!item) return { ok: false, error: '路由不存在' }
  return { ok: true, item }
}
