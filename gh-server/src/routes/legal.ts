import { Router } from 'express'
import { listCollection } from '../data/collectionStore'

/** 法律页：GET /api/legal、GET /api/legal/:slug（数据来自集合存储，后台「法律条款」可维护） */
export const legalRouter = Router()

legalRouter.get('/', (_req, res) => {
  res.json(listCollection('legal'))
})

legalRouter.get('/:slug', (req, res) => {
  const doc = listCollection('legal').find((item) => item.slug === req.params.slug)
  if (!doc) {
    res.status(404).json({ error: '未找到该法律文档' })
    return
  }
  res.json(doc)
})
