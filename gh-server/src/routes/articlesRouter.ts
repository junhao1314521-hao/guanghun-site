import { Router } from 'express'
import { buildNews, getArticleDetail } from '../data/articles'
import { listCollection } from '../data/collectionStore'
import { readLocale } from '../data/locale'

/**
 * 内容线：文章与新闻（挂载于 /api）
 * GET /api/articles      → { items, total }
 * GET /api/articles/:id  → ArticleDetail；未命中 404
 * GET /api/news          → { items }
 *
 * 文章集合来自集合存储（单一数据源），新闻由文章集合派生。支持 ?locale=en（集合英文覆盖）。
 */
export const articlesRouter = Router()

articlesRouter.get('/articles', (req, res) => {
  // V1：一次返回全量，分类筛选在前端完成（见契约 §1）
  const items = listCollection('articles', readLocale(req))
  res.json({ items, total: items.length })
})

articlesRouter.get('/articles/:id', (req, res) => {
  const detail = getArticleDetail(listCollection('articles', readLocale(req)), req.params.id)
  if (!detail) {
    res.status(404).json({ error: '未找到该文章' })
    return
  }
  res.json(detail)
})

articlesRouter.get('/news', (req, res) => {
  res.json({ items: buildNews(listCollection('articles', readLocale(req))) })
})
