import { Router } from 'express'
import { listCollection } from '../data/collectionStore'

/**
 * 内容与评测元数据公开端点（数据来自集合存储，后台对应栏目可维护）：
 *   GET /api/taxonomy            内容分类与标签
 *   GET /api/product-categories  产品分类
 *   GET /api/test-records        测试记录（?product=<型号> 过滤）
 *   GET /api/methods             测评方法
 *   GET /api/service-info        服务网点与体验点
 */
export const catalogMetaRouter = Router()

catalogMetaRouter.get('/taxonomy', (_req, res) => {
  res.json({ items: listCollection('taxonomy') })
})

catalogMetaRouter.get('/product-categories', (_req, res) => {
  res.json({ items: listCollection('product-categories') })
})

catalogMetaRouter.get('/test-records', (req, res) => {
  const product = typeof req.query.product === 'string' ? req.query.product.trim() : ''
  const items = listCollection('test-records').filter((record) => (product ? record.product === product : true))
  res.json({ items })
})

catalogMetaRouter.get('/methods', (_req, res) => {
  res.json({ items: listCollection('methods') })
})

catalogMetaRouter.get('/service-info', (_req, res) => {
  res.json({ items: listCollection('service-info') })
})
