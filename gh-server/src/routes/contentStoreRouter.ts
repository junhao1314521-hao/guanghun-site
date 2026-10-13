import { Router } from 'express'
import { BLOCK_TYPES } from '../data/blockCatalog'
import { getPage, getSiteConfig, listPages } from '../data/contentStore'
import { readLocale } from '../data/locale'

/**
 * 内容库公开端点（挂载于 /api/content，契约 §6.1）：
 *   GET /pages              页面列表 { items: PageMeta[], total }（不含 blocks；过滤 __en 变体）
 *   GET /pages/:key         单页 { page: Page }；未命中 404。支持 ?locale=en：取英文变体，未命中回退中文
 *   GET /site               站点配置 { nav, footer, enabledBlocks?, theme? }。支持 ?locale=en：返回英文 nav/footer
 *   GET /blocks/types       区块类型目录 { items: BlockTypeMeta[] }（含 enabled 启用状态）
 *
 * 响应体直接返回数据本身，错误为 { error: string }（与既有约定一致）。
 * `en` 内部覆盖字段不透出给前台（site 端点只显式取 nav/footer/enabledBlocks/theme）。
 */
export const contentStoreRouter = Router()

contentStoreRouter.get('/pages', (_req, res) => {
  const items = listPages()
  res.json({ items, total: items.length })
})

contentStoreRouter.get('/pages/:key', (req, res) => {
  const locale = readLocale(req)
  const page = getPage(req.params.key, locale)
  if (!page) {
    res.status(404).json({ error: '未找到该页面' })
    return
  }
  res.json({ page })
})

contentStoreRouter.get('/site', (req, res) => {
  const locale = readLocale(req)
  const site = getSiteConfig(locale)
  // nav / footer 为契约必含字段；enabledBlocks / theme 为扩展字段（未设置时不返回，缺省即「全部启用 / 无覆盖」）
  res.json({
    nav: site.nav,
    footer: site.footer,
    ...(site.enabledBlocks ? { enabledBlocks: site.enabledBlocks } : {}),
    ...(site.theme ? { theme: site.theme } : {}),
  })
})

contentStoreRouter.get('/blocks/types', (_req, res) => {
  // 站点配置 `enabledBlocks` 缺省 = 全部启用；据此为每个目录项派生 `enabled` 状态。
  // 目录返回全部 19 类（含启用状态），由消费端（装修器选择器）过滤停用项。
  const enabledSet = new Set(getSiteConfig().enabledBlocks ?? BLOCK_TYPES.map((meta) => meta.type))
  const items = BLOCK_TYPES.map((meta) => ({ ...meta, enabled: enabledSet.has(meta.type) }))
  res.json({ items })
})