import { Router } from 'express'
import { getBizCaseDetail, getBizVenueDetail } from '../data/business-extra'
import { listCollection } from '../data/collectionStore'
import { readLocale } from '../data/locale'

/**
 * 商业合作深度线端点（挂载于 /api）：
 * GET /api/business/scenes、/api/business/cases、/api/business/cases/:id、
 * GET /api/business/venues、/api/business/venues/:id
 *
 * 场景 / 案例 / 体验点集合来自集合存储（单一数据源）；城市筛选在路由层聚合。
 * 支持 ?locale=en（集合英文覆盖）。
 */
export const businessExtraRouter = Router()

businessExtraRouter.get('/business/scenes', (req, res) => {
  res.json({ items: listCollection('biz-content', readLocale(req)) })
})

businessExtraRouter.get('/business/cases', (req, res) => {
  res.json({ items: listCollection('biz-cases', readLocale(req)) })
})

businessExtraRouter.get('/business/cases/:id', (req, res) => {
  const detail = getBizCaseDetail(listCollection('biz-cases', readLocale(req)), req.params.id)
  if (!detail) {
    res.status(404).json({ error: '未找到该合作案例' })
    return
  }
  res.json(detail)
})

businessExtraRouter.get('/business/venues', (req, res) => {
  const items = listCollection('biz-venues', readLocale(req))
  const cities = Array.from(new Set(items.map((venue) => venue.city)))
  // 兼容历史数据缺 province：过滤空值后去重保序
  const provinces = Array.from(
    new Set(items.map((venue) => venue.province).filter((province): province is string => typeof province === 'string' && province.length > 0)),
  )
  res.json({ items, cities, provinces })
})

businessExtraRouter.get('/business/venues/:id', (req, res) => {
  const detail = getBizVenueDetail(listCollection('biz-venues', readLocale(req)), req.params.id)
  if (!detail) {
    res.status(404).json({ error: '未找到该体验点' })
    return
  }
  res.json(detail)
})
