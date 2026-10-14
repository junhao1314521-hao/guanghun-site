import { Router } from 'express'
import { getProductDetail } from '../data/products'
import { listCollection } from '../data/collectionStore'
import { readLocale } from '../data/locale'

/** 产品：GET /api/products、GET /api/products/:id（数据来自集合存储，形状与既有 PRODUCTS 一致）。
 *  支持 ?locale=en：集合英文覆盖层生效，缺覆盖回退中文。 */
export const catalogRouter = Router()

catalogRouter.get('/', (req, res) => {
  // V1：一次返回全量，筛选/排序/分页在前端完成（见契约 §1）
  // total 为当前集合的真实总数（后台增删产品后即同步）
  const items = listCollection('products', readLocale(req))
  res.json({ items, total: items.length })
})

catalogRouter.get('/:id', (req, res) => {
  const locale = readLocale(req)
  const detail = getProductDetail(listCollection('products', locale), req.params.id, locale)
  if (!detail) {
    res.status(404).json({ error: '未找到该产品' })
    return
  }
  res.json(detail)
})
