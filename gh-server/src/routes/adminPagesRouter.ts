import { Router, type Response } from 'express'
import {
  createPage,
  getPage,
  isBuiltinPage,
  listPages,
  resetPage,
  savePage,
  saveSiteConfig,
  setEnabledBlocks,
  setTheme,
} from '../data/contentStore'
import type { Block, BlockStyle, BlockType } from '../data/contentTypes'
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
    if (entry.style && typeof entry.style === 'object') block.style = entry.style as BlockStyle
    blocks.push(block)
  }
  return blocks
}

/**
 * 校验站点配置结构：`{ nav, footer }` 为必填；`enabledBlocks` / `theme` 为可选扩展。
 * - `enabledBlocks`：字符串数组，且每项须为已知区块类型（否则整体不合法 → 400）；
 * - `theme`：对象，保存时按白名单过滤键（非白名单键静默丢弃，避免任意变量注入）。
 * 返回 `null` 表示结构不合法。
 */
function parseSite(raw: unknown): Partial<{
  nav: { label: string; href: string }[]
  footer: { title: string; links: { label: string; href: string }[] }[]
  enabledBlocks: string[]
  theme: Record<string, string>
}> | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const nav = Array.isArray(data.nav)
    ? data.nav.map((link) => ({ label: readString((link as Record<string, unknown>)?.label), href: readString((link as Record<string, unknown>)?.href) }))
    : null
  const footer = Array.isArray(data.footer)
    ? data.footer.map((group) => {
        const g = group as Record<string, unknown>
        const links = Array.isArray(g?.links)
          ? g.links.map((link) => ({ label: readString((link as Record<string, unknown>)?.label), href: readString((link as Record<string, unknown>)?.href) }))
          : []
        return { title: readString(g?.title), links }
      })
    : null
  if (!nav || !footer) return null
  const result: Partial<{
    nav: { label: string; href: string }[]
    footer: { title: string; links: { label: string; href: string }[] }[]
    enabledBlocks: string[]
    theme: Record<string, string>
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
  return result
}

/* ---------------- 页面 ---------------- */

adminPagesRouter.get('/pages', requireSession, requireScope('content'), (_req, res) => {
  const items = listPages()
  res.json({ items, total: items.length })
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
  const page = createPage({ key, path, title, description: readString(body.description) || undefined, blocks })
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