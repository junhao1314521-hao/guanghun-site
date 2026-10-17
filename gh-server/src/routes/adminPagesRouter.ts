import { Router, type Response } from 'express'
import {
  createPage,
  getPage,
  isBuiltinPage,
  listPages,
  resetPage,
  savePage,
  saveSiteConfig,
  setDefaultTheme,
  setEnabledBlocks,
  setTheme,
} from '../data/contentStore'
import { pageReferenceCounts, referencesForPath } from '../data/pageRefs'
import type {
  Block,
  BlockStyle,
  BlockType,
  ShopChannel,
  SiteAnnouncement,
  SiteAuthConfig,
  SiteCta,
  SiteFooterGroup,
  SiteLink,
  SiteSocialConfig,
  SiteWarrantyConfig,
} from '../data/contentTypes'
import { normalizeSocialConfig } from '../data/contentTypes'
import { readParam, requireSession } from '../middleware/adminAuth'
import { requireScope } from '../middleware/rbac'
import { auditWrite } from '../middleware/audit'
import { BLOCK_TYPE_VALUES, getBlockTypeMeta } from '../data/blockCatalog'
import { filterThemeTokens } from '../data/siteTokens'
import { softDeletePage } from '../data/trashStore'

/**
 * 后台内容库端点（挂载于 /api/admin，契约 §6.2，均需 Bearer 会话）：
 *   GET    /pages                    页面列表 { items, total }
 *   GET    /pages/:key               单页 { page }
 *   PUT    /pages/:key               保存整页（blocks 全量覆盖）→ { page }
 *   POST   /pages                    新建页面 → { page }
 *   DELETE /pages/:key               删除页面（**软删除**：非内置页面写入回收站；内置页面禁删）→ { ok: true }
 *   POST   /pages/:key/reset         重置为 seed → { page }
 *   PUT    /site                     保存站点配置（浅合并 nav/footer/enabledBlocks/theme）→ { site }
 *   PUT    /blocks/enabled           保存启用的区块类型 → { enabledBlocks }
 *   PUT    /theme                    保存站点级设计令牌覆盖 → { theme }
 *
 * 写入后由 contentStore 立即原子落盘（契约 §7）。
 */
export const adminPagesRouter = Router()

/** 读取字符串字段并去除首尾空白 */
function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** 当前会话操作者（后台用户名）；未登录记为 anonymous */
function actorOf(res: Response): string {
  const user = res.locals.adminUser as { username?: string } | undefined
  return user?.username ?? 'anonymous'
}

/** 是否为「普通对象」（非 null / 非数组 / 非原始值） */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/** 取正数（非法 / 非正则返回 fallback，向下取整） */
function positiveNumber(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

/** 解析 CTA 按钮：label 与 href 均非空才有效，否则返回 undefined */
function parseCta(raw: unknown): SiteCta | undefined {
  if (!isPlainObject(raw)) return undefined
  const label = readString(raw.label)
  const href = readString(raw.href)
  if (!label || !href) return undefined
  return { label, href }
}

/**
 * 解析站点链接（导航 / 页脚组内链接 / 页脚社交复用）。
 * 保留角标扩展字段：`badge` ∈ {new, hot} 时同时携带 badgeText。
 * 与既有实现一致，label / href 允许为空串（由后台编辑器逐字段校验，不在此强制）。
 */
function parseSiteLink(raw: unknown): SiteLink {
  const link = isPlainObject(raw) ? raw : {}
  const out: SiteLink = { label: readString(link.label), href: readString(link.href) }
  const badge = readString(link.badge)
  if (badge === 'new' || badge === 'hot') {
    out.badge = badge
    const text = readString(link.badgeText)
    if (text) out.badgeText = text
  }
  return out
}

/**
 * 解析店铺渠道数组（顶栏「店铺」按钮下拉）：
 * - `name` 与 `href` 均非空才保留，空项静默丢弃（不报错）；
 * - `icon` / `order` 为可选扩展字段，缺省不写入。
 */
function parseShopChannels(raw: unknown[]): ShopChannel[] {
  const out: ShopChannel[] = []
  for (const entry of raw) {
    if (!isPlainObject(entry)) continue
    const name = readString(entry.name)
    const href = readString(entry.href)
    if (!name || !href) continue
    const channel: ShopChannel = { name, href }
    const icon = readString(entry.icon)
    if (icon) channel.icon = icon
    const order = Number(entry.order)
    if (Number.isFinite(order)) channel.order = order
    out.push(channel)
  }
  return out
}

/** 校验并规整区块数组：非法项直接拒绝（返回 null） */
function parseBlocks(raw: unknown): Block[] | null {
  if (!Array.isArray(raw)) return null
  const blocks: Block[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const entry = item as Record<string, unknown>
    const id = readString(entry.id)
    const type = readString(entry.type) as BlockType
    if (!id || !getBlockTypeMeta(type)) return null
    const props = entry.props && typeof entry.props === 'object' ? (entry.props as Record<string, unknown>) : {}
    const block: Block = { id, type, enabled: entry.enabled !== false, props }
    if (entry.style && typeof entry.style === 'object') {
      const style = { ...(entry.style as BlockStyle) }
      // 锚点仅允许字母 / 数字 / 连字符 / 下划线；空串或非法值直接剔除，避免注入非法 id
      if (typeof style.anchor === 'string') {
        const anchor = style.anchor.trim().replace(/[^A-Za-z0-9_-]/g, '')
        if (anchor) style.anchor = anchor
        else delete style.anchor
      }
      block.style = style
    }
    blocks.push(block)
  }
  return blocks
}

/**
 * 校验站点配置结构：`{ nav, footer }` 为必填；其余为可选扩展字段。
 * - `enabledBlocks`：字符串数组，且每项须为已知区块类型（否则整体不合法 → 400）；
 * - `theme`：对象，保存时按白名单过滤键（非白名单键静默丢弃，避免任意变量注入）；
 * - `announcement` / `topCta` / `auth` / `warranty` / `social` / `shopChannels`：新增扩展字段，结构不合法时整体 400；
 *   合法但字段缺失时按「缺省」处理（如 auth 缺省视为开启验证码）。
 * 返回 `null` 表示结构不合法。
 */
function parseSite(raw: unknown): Partial<{
  nav: SiteLink[]
  footer: SiteFooterGroup[]
  enabledBlocks: string[]
  theme: Record<string, string>
  announcement: SiteAnnouncement
  topCta: { primary?: SiteCta; secondary?: SiteCta }
  auth: SiteAuthConfig
  warranty: SiteWarrantyConfig
  social: SiteSocialConfig
  shopChannels: ShopChannel[]
  defaultTheme: 'auto' | 'light' | 'dark'
  navFeatureEnabled: boolean
  inquiryRouting: boolean
}> | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const nav = Array.isArray(data.nav) ? data.nav.map(parseSiteLink) : null
  const footer = Array.isArray(data.footer)
    ? data.footer.map((group): SiteFooterGroup => {
        const g = (group ?? {}) as Record<string, unknown>
        const links = Array.isArray(g.links) ? g.links.map(parseSiteLink) : []
        return { title: readString(g.title), links }
      })
    : null
  if (!nav || !footer) return null
  const result: Partial<{
    nav: SiteLink[]
    footer: SiteFooterGroup[]
    enabledBlocks: string[]
    theme: Record<string, string>
    announcement: SiteAnnouncement
    topCta: { primary?: SiteCta; secondary?: SiteCta }
    auth: SiteAuthConfig
    warranty: SiteWarrantyConfig
    social: SiteSocialConfig
    shopChannels: ShopChannel[]
    defaultTheme: 'auto' | 'light' | 'dark'
    navFeatureEnabled: boolean
    inquiryRouting: boolean
  }> = { nav, footer }
  if (data.enabledBlocks !== undefined) {
    if (!Array.isArray(data.enabledBlocks)) return null
    const known = new Set<string>(BLOCK_TYPE_VALUES)
    const list = data.enabledBlocks.map((value) => readString(value))
    if (list.some((type) => !known.has(type))) return null
    result.enabledBlocks = list
  }
  if (data.theme !== undefined) {
    if (!data.theme || typeof data.theme !== 'object' || Array.isArray(data.theme)) return null
    result.theme = filterThemeTokens(data.theme)
  }
  // —— 公告条：enabled 布尔 + text 字符串；href / startAt / endAt / dismissible 可选 ——
  if (data.announcement !== undefined) {
    if (!isPlainObject(data.announcement)) return null
    const a = data.announcement
    result.announcement = {
      enabled: a.enabled === true,
      text: readString(a.text),
      ...(readString(a.href) ? { href: readString(a.href) } : {}),
      ...(readString(a.startAt) ? { startAt: readString(a.startAt) } : {}),
      ...(readString(a.endAt) ? { endAt: readString(a.endAt) } : {}),
      dismissible: a.dismissible === true,
    }
  }
  // —— 顶栏 CTA：primary / secondary 各为 { label, href }；空项丢弃 ——
  if (data.topCta !== undefined) {
    if (!isPlainObject(data.topCta)) return null
    const cta: { primary?: SiteCta; secondary?: SiteCta } = {}
    const primary = parseCta(data.topCta.primary)
    const secondary = parseCta(data.topCta.secondary)
    if (primary) cta.primary = primary
    if (secondary) cta.secondary = secondary
    result.topCta = cta
  }
  // —— 安全开关：captcha 缺省 true，thirdParty 缺省 false ——
  if (data.auth !== undefined) {
    if (!isPlainObject(data.auth)) return null
    result.auth = { captcha: data.auth.captcha !== false, thirdParty: data.auth.thirdParty === true }
  }
  // —— 保修参数：年限 / 提醒天数取正数，缺省 3 / 30；SN 解析默认关闭 ——
  if (data.warranty !== undefined) {
    if (!isPlainObject(data.warranty)) return null
    result.warranty = {
      years: positiveNumber(data.warranty.years, 3),
      remindDays: positiveNumber(data.warranty.remindDays, 30),
      snParse: data.warranty.snParse === true,
    }
  }
  // —— 页脚社交（§1.9）：新形态 items / 旧形态 links+qr 两条列表均接受，统一归一化为「每平台一条」——
  if (data.social !== undefined) {
    if (!isPlainObject(data.social)) return null
    result.social = normalizeSocialConfig(data.social)
  }
  // —— 店铺渠道：数组；结构非法（非数组）整体 400，空项静默丢弃 ——
  if (data.shopChannels !== undefined) {
    if (!Array.isArray(data.shopChannels)) return null
    result.shopChannels = parseShopChannels(data.shopChannels)
  }
  // —— 留言轻量分流开关（§1.6）：布尔，缺省 true（开启）——
  if (data.inquiryRouting !== undefined) {
    result.inquiryRouting = data.inquiryRouting !== false
  }
  // —— 下拉面板推荐卡开关：布尔，缺省 false（不渲染）——
  if (data.navFeatureEnabled !== undefined) {
    result.navFeatureEnabled = data.navFeatureEnabled === true
  }
  // —— 默认主题：'auto' | 'light' | 'dark'；非法值整体 400 ——
  if (data.defaultTheme !== undefined) {
    const value = readString(data.defaultTheme)
    if (value !== 'auto' && value !== 'light' && value !== 'dark') return null
    result.defaultTheme = value
  }
  return result
}

/* ---------------- 页面 ---------------- */

adminPagesRouter.get('/pages', requireSession, requireScope('content'), (_req, res) => {
  const counts = pageReferenceCounts()
  const items = listPages().map((meta) => ({ ...meta, refCount: counts[meta.key] ?? 0 }))
  res.json({ items, total: items.length })
})

/** 页面引用清单：指向该页面 path 的导航 / 页脚 / 区块链接（供「当前 N 处引用」展开） */
adminPagesRouter.get('/pages/:key/references', requireSession, requireScope('content'), (req, res) => {
  const page = getPage(readParam(req, 'key'))
  if (!page) {
    res.status(404).json({ error: '未找到该页面' })
    return
  }
  const report = referencesForPath(page.path)
  res.json({ count: report.count, refs: report.refs })
})

adminPagesRouter.get('/pages/:key', requireSession, requireScope('content'), (req, res) => {
  const page = getPage(readParam(req, 'key'))
  if (!page) {
    res.status(404).json({ error: '未找到该页面' })
    return
  }
  res.json({ page })
})

adminPagesRouter.put('/pages/:key', requireSession, requireScope('content'), auditWrite('save-page', (req) => readParam(req, 'key')), (req, res) => {
  const key = readParam(req, 'key')
  if (!getPage(key)) {
    res.status(404).json({ error: '未找到该页面' })
    return
  }
  const body = (req.body ?? {}) as Record<string, unknown>
  let blocks: Block[] | undefined
  if (body.blocks !== undefined) {
    const parsed = parseBlocks(body.blocks)
    if (!parsed) {
      res.status(400).json({ error: '区块数据不合法' })
      return
    }
    blocks = parsed
  }
  const page = savePage(key, {
    path: body.path !== undefined ? readString(body.path) : undefined,
    title: body.title !== undefined ? readString(body.title) : undefined,
    description: body.description !== undefined ? readString(body.description) : undefined,
    blocks,
    enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
  })
  res.json({ page })
})

adminPagesRouter.post(
  '/pages',
  requireSession,
  requireScope('content'),
  auditWrite('create', (req) => readString((req.body as Record<string, unknown>)?.key) || 'page'),
  (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const key = readString(body.key)
  const path = readString(body.path)
  const title = readString(body.title)
  if (!key || !path || !title) {
    res.status(400).json({ error: 'key、path、title 均为必填' })
    return
  }
  let blocks: Block[] | undefined
  if (body.blocks !== undefined) {
    const parsed = parseBlocks(body.blocks)
    if (!parsed) {
      res.status(400).json({ error: '区块数据不合法' })
      return
    }
    blocks = parsed
  }
  const page = createPage({
    key,
    path,
    title,
    description: readString(body.description) || undefined,
    seoTitle: readString(body.seoTitle) || undefined,
    seoDescription: readString(body.seoDescription) || undefined,
    enTitle: readString(body.enTitle) || undefined,
    enDescription: readString(body.enDescription) || undefined,
    blocks,
    enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
  })
  if (!page) {
    res.status(409).json({ error: '页面 key 已存在' })
    return
  }
  res.status(201).json({ page })
})

adminPagesRouter.delete('/pages/:key', requireSession, requireScope('content'), auditWrite('delete', (req) => readParam(req, 'key')), (req, res) => {
  const key = readParam(req, 'key')
  if (isBuiltinPage(key)) {
    res.status(400).json({ error: '内置页面不可删除' })
    return
  }
  // 软删除：非内置页面写入回收站（key='pages'）并从内容库移除，可在回收站恢复或彻底删除
  if (!softDeletePage(key, actorOf(res))) {
    res.status(404).json({ error: '未找到该页面' })
    return
  }
  res.json({ ok: true })
})

adminPagesRouter.post('/pages/:key/reset', requireSession, requireScope('content'), auditWrite('reset', (req) => readParam(req, 'key')), (req, res) => {
  const page = resetPage(readParam(req, 'key'))
  if (!page) {
    res.status(404).json({ error: '该页面无 seed 可重置' })
    return
  }
  res.json({ page })
})

/* ---------------- 站点配置 ---------------- */

adminPagesRouter.put('/site', requireSession, requireScope('content'), auditWrite('save-site', () => 'site'), (req, res) => {
  const site = parseSite(req.body)
  if (!site) {
    res.status(400).json({ error: '站点配置不合法' })
    return
  }
  res.json({ site: saveSiteConfig(site) })
})

/* ---------------- 组件库：启用 / 停用区块类型 ---------------- */

adminPagesRouter.put('/blocks/enabled', requireSession, requireScope('content'), auditWrite('save-blocks-enabled', () => 'site'), (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const raw = body.enabled
  if (!Array.isArray(raw)) {
    res.status(400).json({ error: 'enabled 必须为区块类型数组' })
    return
  }
  const known = new Set<string>(BLOCK_TYPE_VALUES)
  const list = raw.map((value) => readString(value))
  if (list.some((type) => !known.has(type))) {
    res.status(400).json({ error: '存在未知的区块类型' })
    return
  }
  const site = setEnabledBlocks(list)
  res.json({ enabledBlocks: site.enabledBlocks ?? [] })
})

/* ---------------- 样式：站点级设计令牌覆盖 ---------------- */

adminPagesRouter.put('/theme', requireSession, requireScope('content'), auditWrite('save-theme', () => 'site'), (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const raw = body.theme
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    res.status(400).json({ error: 'theme 必须为对象' })
    return
  }
  // 按白名单过滤：仅保留允许覆盖的令牌键（未知键静默丢弃）
  const site = setTheme(filterThemeTokens(raw))
  res.json({ theme: site.theme ?? {} })
})

/* ---------------- 样式：站点默认主题 ---------------- */

adminPagesRouter.put('/default-theme', requireSession, requireScope('content'), auditWrite('save-default-theme', () => 'site'), (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const value = readString(body.defaultTheme)
  if (value !== 'auto' && value !== 'light' && value !== 'dark') {
    res.status(400).json({ error: "defaultTheme 必须为 'auto' | 'light' | 'dark'" })
    return
  }
  const site = setDefaultTheme(value)
  res.json({ defaultTheme: site.defaultTheme ?? 'auto' })
})