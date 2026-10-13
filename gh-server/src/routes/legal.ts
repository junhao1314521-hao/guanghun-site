import { Router } from 'express'
import { LEGAL_DOCS } from '../data/legal'

/** 法律页：GET /api/legal、GET /api/legal/:slug */
export const legalRouter = Router()

legalRouter.get('/', (_req, res) => {
  res.json(LEGAL_DOCS)
})

legalRouter.get('/:slug', (req, res) => {
  const doc = LEGAL_DOCS.find((d) => d.slug === req.params.slug)
  if (!doc) {
    res.status(404).json({ error: '未找到该法律文档' })
    return
  }
  res.json(doc)
})