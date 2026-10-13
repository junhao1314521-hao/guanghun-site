import { Router } from 'express'
import { compareProducts, getLadderMetric, getSeries, seriesProducts } from '../data/product-extra'
import { listCollection } from '../data/collectionStore'
import { readLocale } from '../data/locale'

/**
 * 产品 / 天梯深度线：挂载于 /api。
 * - GET /api/products/series/:slug → { series, items }
 * - GET /api/compare?ids=a,b,c     → { items }（顺序与请求一致，未知 id 跳过，不 404）
 * - GET /api/ladder/:metric        → { metric, metricLabel, rows, meta }（未命中 404）
 *
 * 产品与榜单数据来自集合存储；排序 / 筛选 / 派生仍在路由层完成。支持 ?locale=en。
 */
export const productExtraRouter = Router()

productExtraRouter.get('/products/series/:slug', (req, res) => {
  const series = getSeries(req.params.slug)
  if (!series) {
    res.status(404).json({ error: '未找到该产品系列' })
    return
  }
  res.json({ series, items: seriesProducts(series.slug, listCollection('products', readLocale(req))) })
})

productExtraRouter.get('/compare', (req, res) => {
  const raw = typeof req.query.ids === 'string' ? req.query.ids : ''
  const ids = raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
  res.json({ items: compareProducts(ids, listCollection('products', readLocale(req))) })
})

productExtraRouter.get('/ladder/:metric', (req, res) => {
  const locale = readLocale(req)
  const detail = getLadderMetric(req.params.metric, listCollection('rankings', locale), listCollection('products', locale))
  if (!detail) {
    res.status(404).json({ error: '未找到该天梯指标' })
    return
  }
  res.json(detail)
})
