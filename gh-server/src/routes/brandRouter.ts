import { Router } from 'express'
import { getBrandProfile } from '../data/brand'
import { buildBrandProducts } from '../data/aggregate'
import { listCollection } from '../data/collectionStore'

/**
 * 品牌档案：GET /api/brand/:slug（挂载于 /api）
 * 档案主体与内容库 `brand-*` 页 seed 同源；关联产品改为从产品集合派生（单一数据源）。
 */
export const brandRouter = Router()

brandRouter.get('/brand/:slug', (req, res) => {
  const profile = getBrandProfile(req.params.slug)
  if (!profile) {
    res.status(404).json({ error: '未找到该品牌' })
    return
  }
  res.json({ ...profile, products: buildBrandProducts(profile, listCollection('products')) })
})
