import { Router } from 'express'
import { buildSearchData } from '../data/aggregate'
import { listCollection } from '../data/collectionStore'
import { readLocale } from '../data/locale'

/**
 * 全站搜索：GET /api/search?q=（挂载于 /api/search）
 * 结果与计数由产品 / 文章 / 榜单 / 下载四个集合派生（单一数据源）；
 * 关键词过滤仍在路由层完成（标题 / 摘要 / 来源）。支持 ?locale=en（集合英文覆盖）。
 */
export const searchRouter = Router()

searchRouter.get('/', (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase()
  const locale = readLocale(req)
  const { items, counts } = buildSearchData({
    products: listCollection('products', locale),
    articles: listCollection('articles', locale),
    rankings: listCollection('rankings', locale),
    downloads: listCollection('downloads', locale),
  })
  const filtered = q
    ? items.filter((r) => `${r.title.join('')} ${r.desc} ${r.source}`.toLowerCase().includes(q))
    : items
  res.json({ items: filtered, counts })
})
