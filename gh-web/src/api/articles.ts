/** 接口层 · 文章资源：页面通过本模块取数，不直接 import data/articles */
import { transport, ApiError } from './client'
import {
  ARTICLES,
  ARTICLE_TOTAL,
  NEWS,
  getArticleDetail,
  type ArticleDetail,
  type ArticleSummary,
  type NewsItem,
} from '../data/articles'

export type ArticleListResult = {
  items: ArticleSummary[]
  total: number
}

export type NewsListResult = {
  items: NewsItem[]
}

/** 文章列表：V1 一次返回全量，分类筛选在前端完成（切换即时，无额外请求） */
export function fetchArticles(signal?: AbortSignal): Promise<ArticleListResult> {
  return transport({ path: '/api/articles', signal }, () => ({ items: ARTICLES, total: ARTICLE_TOTAL }))
}

/** 文章详情：按 id 查询，未命中抛 404 供页面区分「不存在」 */
export function fetchArticle(id: string, signal?: AbortSignal): Promise<ArticleDetail> {
  return transport({ path: `/api/articles/${id}`, signal }, () => {
    const detail = getArticleDetail(id)
    if (!detail) throw new ApiError('未找到该文章', 404)
    return detail
  })
}

/** 新闻与动态：与文章复用同一批内容，返回品牌动态 / 产品发布类条目 */
export function fetchNews(signal?: AbortSignal): Promise<NewsListResult> {
  return transport({ path: '/api/news', signal }, () => ({ items: NEWS }))
}