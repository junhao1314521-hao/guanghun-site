/** 接口层 · 全站搜索资源 */
import { transport } from './client'
import { KIND_COUNTS, SEARCH_RESULTS, type SearchResult } from '../data/search'

export type SearchResultPayload = {
  items: SearchResult[]
  counts: typeof KIND_COUNTS
}

/**
 * 全站搜索：按关键词查询（关键词为空时返回全部）。
 * 类型筛选与排序在前端对返回结果完成，避免每次点选都发请求。
 */
export function fetchSearchResults(query: string, signal?: AbortSignal): Promise<SearchResultPayload> {
  return transport({ path: '/api/search', query: { q: query }, signal }, () => {
    const q = query.trim().toLowerCase()
    const items = q
      ? SEARCH_RESULTS.filter((result) =>
          `${result.title.join('')} ${result.desc} ${result.source}`.toLowerCase().includes(q),
        )
      : SEARCH_RESULTS
    return { items, counts: KIND_COUNTS }
  })
}
