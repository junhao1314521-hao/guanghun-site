/**
 * 内容库读写与持久化（对齐契约 §7，阶段 5a 起改为 SQLite）。
 *
 * - 存储：单库 `data/gh.sqlite`（`DB_PATH` 可覆盖）中的 `content_pages` + `site_config` 表；
 *   见 `./db.ts`。旧 `data/content-store.json` 仅在首次启动时被一次性导入（不删除）。
 * - 启动：`content_pages` 为空则用 seed 生成并写入；`site_config` 为空则写入 seed 站点配置。
 * - 写入：任一 PUT/POST/DELETE 后**立即事务落库**，保证原子性。
 * - 容错：DB 打开 / 建表失败 → 结构化日志 + 明确错误（不静默降级）；旧 JSON 损坏由 db 迁移层跳过。
 */
import { logger } from '../lib/logger'
import { getDb, runInTransaction } from './db'
import { buildSeed } from './contentSeed'
import { buildSeedEn, SITE_EN } from './contentSeedEn'
import { baseKeyOfKey, enKeyOf, isEnKey, type Locale } from './locale'
import type { Block, Page, PageMeta, SiteConfig } from './contentTypes'

/** 内置页面 key 清单（= seed 页面 key；内置页禁删），懒计算并缓存 */
let builtinKeysCache: string[] | null = null
function builtinKeys(): string[] {
  if (!builtinKeysCache) builtinKeysCache = buildSeed().pages.map((page) => page.key)
  return builtinKeysCache
}

/**
 * 初始化（幂等）：确保表内已有 seed 数据。
 * - `content_pages` 为空 → 写入 seed 页面；
 * - `site_config` 为空 → 写入 seed 站点配置；
 * - **追加式回填英文变体**：逐条检查 `__en` 变体是否存在，缺失才写入（已存在一律保留，
 *   含用户对英文页的编辑）；`site_config` 缺 `.en` 字段时补英文 nav/footer（不覆盖主配置）。
 *   由此实现「结构演进不丢已有写入」——英文 seed 升级不冲掉运营改过的英文内容。
 */
export function initStore(): void {
  const db = getDb()

  const pageCount = (db.prepare('SELECT COUNT(*) AS n FROM content_pages').get() as { n: number }).n
  if (pageCount === 0) {
    const seed = buildSeed()
    runInTransaction((tx) => {
      const insert = tx.prepare('INSERT OR REPLACE INTO content_pages(key, data, updated_at) VALUES(?, ?, ?)')
      for (const page of seed.pages) insert.run(page.key, JSON.stringify(page), page.updatedAt)
    })
    logger.info('内容库已由 seed 初始化', { pages: seed.pages.length })
  }

  const siteCount = (db.prepare('SELECT COUNT(*) AS n FROM site_config').get() as { n: number }).n
  if (siteCount === 0) {
    const { site } = buildSeed()
    runInTransaction((tx) => {
      tx.prepare('INSERT OR REPLACE INTO site_config(id, data) VALUES(1, ?)').run(JSON.stringify(site))
    })
  }

  ensureEnVariants()
}

/** 追加式回填英文变体：缺失的 `__en` 页写入；`site_config` 缺 `.en` 补英文 nav/footer。 */
function ensureEnVariants(): void {
  let enPagesAdded = 0
  let enSitePatched = false
  runInTransaction((tx) => {
    const exists = tx.prepare('SELECT 1 AS x FROM content_pages WHERE key = ?')
    const insert = tx.prepare('INSERT OR REPLACE INTO content_pages(key, data, updated_at) VALUES(?, ?, ?)')
    for (const page of buildSeedEn()) {
      if (exists.get(page.key)) continue
      insert.run(page.key, JSON.stringify(page), page.updatedAt)
      enPagesAdded += 1
    }
    // 站点配置缺 .en → 补英文 nav/footer；已有 .en 则只补「本版本新增且缺失」的英文子字段
    // （公告条 / 顶栏 CTA）。一律不覆盖已有值，保持「追加式演进不丢运营写入」。
    const row = tx.prepare('SELECT data FROM site_config WHERE id = 1').get() as { data: string } | undefined
    if (row) {
      let site: SiteConfig
      try {
        site = JSON.parse(row.data) as SiteConfig
      } catch {
        return
      }
      let changed = false
      if (!site.en) {
        site.en = SITE_EN
        changed = true
      } else {
        if (!site.en.announcement && SITE_EN.announcement) {
          site.en.announcement = SITE_EN.announcement
          changed = true
        }
        if (!site.en.topCta && SITE_EN.topCta) {
          site.en.topCta = SITE_EN.topCta
          changed = true
        }
      }
      if (changed) {
        tx.prepare('UPDATE site_config SET data = ? WHERE id = 1').run(JSON.stringify(site))
        enSitePatched = true
      }
    }
  })
  if (enPagesAdded > 0) logger.info('内容库英文变体已追加式回填', { pages: enPagesAdded })
  if (enSitePatched) logger.info('站点配置英文变体已追加式回填', { fields: 'nav/footer/announcement/topCta' })
}

/** 页面 → 列表项（不含 blocks）；`enabled` 缺省兜底为 true */
function toMeta(page: Page): PageMeta {
  return {
    key: page.key,
    path: page.path,
    title: page.title,
    ...(page.description ? { description: page.description } : {}),
    blockCount: page.blocks.length,
    updatedAt: page.updatedAt,
    enabled: page.enabled !== false,
  }
}

/** 读取兜底：`enabled` 缺省视为 true（不改动 seed 里的每个页面对象，序列化时补齐） */
function normalizePage(page: Page): Page {
  return page.enabled === undefined ? { ...page, enabled: true } : page
}

/** 保存整页时的入参 */
export type PageInput = {
  path?: string
  title?: string
  description?: string
  blocks?: Block[]
  /** 页面启用状态（缺省不修改既有值） */
  enabled?: boolean
}

/* ---------------- 读取 ---------------- */

/**
 * 站点配置。`locale='en'` 且存在 `en` 覆盖时：
 * - nav / footer 取英文变体（缺英文时沿用主配置，保证导航可用）；
 * - announcement / topCta **只取英文变体**，未配置即不展示——不以中文冒充英文。
 */
export function getSiteConfig(locale?: Locale): SiteConfig {
  initStore()
  const row = getDb().prepare('SELECT data FROM site_config WHERE id = 1').get() as { data: string }
  const site = JSON.parse(row.data) as SiteConfig
  if (locale === 'en' && site.en) {
    const merged: SiteConfig = { ...site, nav: site.en.nav, footer: site.en.footer }
    delete merged.announcement
    delete merged.topCta
    if (site.en.announcement) merged.announcement = site.en.announcement
    if (site.en.topCta) merged.topCta = site.en.topCta
    return merged
  }
  return site
}

/** 页面列表（不含 blocks；按插入顺序）。**过滤掉 `__en` 英文变体**——变体由 locale 通道取用，不作为独立路由暴露。 */
export function listPages(): PageMeta[] {
  initStore()
  const rows = getDb().prepare('SELECT key, data FROM content_pages ORDER BY rowid ASC').all() as Array<{ key: string; data: string }>
  const out: PageMeta[] = []
  for (const row of rows) {
    if (isEnKey(row.key)) continue
    out.push(toMeta(JSON.parse(row.data) as Page))
  }
  return out
}

/**
 * 单页；未命中返回 undefined。
 * - locale='en'：优先取 `__en` 变体，未命中回退中文 baseKey；
 * - 其余（含管理端）取 baseKey（若传入 `home__en` 这类变体 key，按其 baseKey 处理）。
 */
export function getPage(key: string, locale?: Locale): Page | undefined {
  initStore()
  const baseKey = baseKeyOfKey(key)
  if (locale === 'en') {
    const enRow = getDb().prepare('SELECT data FROM content_pages WHERE key = ?').get(enKeyOf(baseKey)) as
      | { data: string }
      | undefined
    if (enRow) return normalizePage(JSON.parse(enRow.data) as Page)
  }
  const row = getDb().prepare('SELECT data FROM content_pages WHERE key = ?').get(baseKey) as { data: string } | undefined
  return row ? normalizePage(JSON.parse(row.data) as Page) : undefined
}

/** 是否为内置页面（禁删） */
export function isBuiltinPage(key: string): boolean {
  return builtinKeys().includes(key)
}

/* ---------------- 写入 ---------------- */

/** 保存整页（blocks 全量覆盖）；未命中返回 undefined */
export function savePage(key: string, input: PageInput): Page | undefined {
  initStore()
  const current = getPage(key)
  if (!current) return undefined
  const next: Page = {
    ...current,
    path: input.path?.trim() || current.path,
    title: input.title?.trim() || current.title,
    blocks: Array.isArray(input.blocks) ? input.blocks : current.blocks,
    updatedAt: new Date().toISOString(),
  }
  if (input.description !== undefined) next.description = input.description
  if (input.enabled !== undefined) next.enabled = input.enabled
  runInTransaction((db) => {
    db.prepare('UPDATE content_pages SET data = ?, updated_at = ? WHERE key = ?').run(JSON.stringify(next), next.updatedAt, key)
  })
  return next
}

/** 新建页面；key 冲突时返回 undefined */
export function createPage(input: Required<Pick<PageInput, 'path' | 'title'>> & PageInput & { key: string }): Page | undefined {
  initStore()
  const key = input.key.trim()
  if (!key || getPage(key)) return undefined
  const page: Page = {
    key,
    path: input.path.trim(),
    title: input.title.trim(),
    ...(input.description ? { description: input.description } : {}),
    blocks: Array.isArray(input.blocks) ? input.blocks : [],
    updatedAt: new Date().toISOString(),
    enabled: input.enabled !== false,
  }
  runInTransaction((db) => {
    db.prepare('INSERT INTO content_pages(key, data, updated_at) VALUES(?, ?, ?)').run(key, JSON.stringify(page), page.updatedAt)
  })
  return page
}

/** 删除页面；内置页面禁删，返回失败原因 */
export function deletePage(key: string): { ok: boolean; error?: string } {
  if (builtinKeys().includes(key)) return { ok: false, error: '内置页面不可删除' }
  initStore()
  const result = runInTransaction((db) => db.prepare('DELETE FROM content_pages WHERE key = ?').run(key))
  if (Number(result.changes) === 0) return { ok: false, error: '未找到该页面' }
  return { ok: true }
}

/** 重置为 seed；非 seed 页面返回 undefined。已存在页保留原列表位置。 */
export function resetPage(key: string): Page | undefined {
  // 同时支持中文页与英文变体（key 形如 `xxx__en`）：两套 seed 一起查
  const seedPage = [...buildSeed().pages, ...buildSeedEn()].find((page) => page.key === key)
  if (!seedPage) return undefined
  initStore()
  const next: Page = { ...seedPage, updatedAt: new Date().toISOString() }
  const exists = Boolean(getPage(key))
  runInTransaction((db) => {
    if (exists) db.prepare('UPDATE content_pages SET data = ?, updated_at = ? WHERE key = ?').run(JSON.stringify(next), next.updatedAt, key)
    else db.prepare('INSERT INTO content_pages(key, data, updated_at) VALUES(?, ?, ?)').run(key, JSON.stringify(next), next.updatedAt)
  })
  return next
}

/** 保存站点配置（**浅合并**：仅覆盖提交的字段，保留 enabledBlocks / theme 等未提交项） */
export function saveSiteConfig(input: Partial<SiteConfig>): SiteConfig {
  initStore()
  const next: SiteConfig = { ...getSiteConfig(), ...input }
  runInTransaction((db) => {
    db.prepare('UPDATE site_config SET data = ? WHERE id = 1').run(JSON.stringify(next))
  })
  return next
}

/** 读取已启用的区块类型（缺省 undefined = 全部启用） */
export function getEnabledBlocks(): string[] | undefined {
  return getSiteConfig().enabledBlocks
}

/**
 * 重置整份内容库为 seed：清空 `content_pages` + `site_config` 后按 seed 重建（单事务）。
 * 供后台「重置为初始」使用。
 */
export function resetContentToSeed(): void {
  const seed = buildSeed()
  runInTransaction((db) => {
    db.prepare('DELETE FROM content_pages').run()
    db.prepare('DELETE FROM site_config').run()
    const insertPage = db.prepare('INSERT OR REPLACE INTO content_pages(key, data, updated_at) VALUES(?, ?, ?)')
    for (const page of seed.pages) insertPage.run(page.key, JSON.stringify(page), page.updatedAt)
    db.prepare('INSERT OR REPLACE INTO site_config(id, data) VALUES(1, ?)').run(JSON.stringify(seed.site))
  })
  logger.info('内容库已重置为 seed', { pages: seed.pages.length })
}

/** 设置已启用的区块类型（整体覆盖）；写入后立即事务落库 */
export function setEnabledBlocks(types: string[]): SiteConfig {
  initStore()
  const next: SiteConfig = { ...getSiteConfig(), enabledBlocks: types }
  runInTransaction((db) => {
    db.prepare('UPDATE site_config SET data = ? WHERE id = 1').run(JSON.stringify(next))
  })
  return next
}

/** 设置站点级设计令牌覆盖（整体覆盖）；写入后立即事务落库 */
export function setTheme(theme: Record<string, string>): SiteConfig {
  initStore()
  const next: SiteConfig = { ...getSiteConfig(), theme }
  runInTransaction((db) => {
    db.prepare('UPDATE site_config SET data = ? WHERE id = 1').run(JSON.stringify(next))
  })
  return next
}

/** 设置站点默认主题（浅合并，仅改 defaultTheme）；写入后立即事务落库 */
export function setDefaultTheme(defaultTheme: 'auto' | 'light' | 'dark'): SiteConfig {
  initStore()
  const next: SiteConfig = { ...getSiteConfig(), defaultTheme }
  runInTransaction((db) => {
    db.prepare('UPDATE site_config SET data = ? WHERE id = 1').run(JSON.stringify(next))
  })
  return next
}
