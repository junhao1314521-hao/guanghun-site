/** 接口层 · 产品 / 天梯深度线：系列、对比与单项指标榜 */
import { ApiError, transport } from './client'
import {
  compareProducts,
  getLadderMetric,
  getSeries,
  seriesProducts,
  type CompareResult,
  type LadderMetricResult,
  type ProductSeriesResult,
} from '../data/product-extra'

/** 产品系列：按 slug 查询，未命中抛 404 供页面区分「不存在」 */
export function fetchProductSeries(slug: string, signal?: AbortSignal): Promise<ProductSeriesResult> {
  return transport({ path: `/api/products/series/${slug}`, signal }, () => {
    const series = getSeries(slug)
    if (!series) throw new ApiError('未找到该产品系列', 404)
    return { series, items: seriesProducts(slug) }
  })
}

/** 产品对比：ids 以逗号拼接进 query，顺序与请求一致；空 / 未知 id 返回空数组 */
export function fetchCompare(ids: string[], signal?: AbortSignal): Promise<CompareResult> {
  return transport({ path: '/api/compare', query: { ids: ids.join(',') }, signal }, () => ({
    items: compareProducts(ids),
  }))
}

/** 单项指标榜：按 metric 查询，未命中抛 404 供页面区分「指标不存在」 */
export function fetchLadderMetric(metric: string, signal?: AbortSignal): Promise<LadderMetricResult> {
  return transport({ path: `/api/ladder/${metric}`, signal }, () => {
    const detail = getLadderMetric(metric)
    if (!detail) throw new ApiError('未找到该天梯指标', 404)
    return detail
  })
}