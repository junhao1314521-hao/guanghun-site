/** 接口层 · 品牌页资源：页面通过本模块取数，不直接 import data/brand */
import { ApiError, transport } from './client'
import { getBrandProfile } from '../data/brand'
import type { BrandProfile } from '../data/brand'

export type { BrandProfile }

/** 品牌档案：按 slug 查询，未命中抛 404 供页面区分「不存在」 */
export function fetchBrand(slug: string, signal?: AbortSignal): Promise<BrandProfile> {
  return transport({ path: `/api/brand/${slug}`, signal }, () => {
    const profile = getBrandProfile(slug)
    if (!profile) throw new ApiError('未找到该品牌', 404)
    return profile
  })
}