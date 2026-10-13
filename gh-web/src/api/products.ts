/** 接口层 · 产品资源：页面通过本模块取数，不直接 import data/products */
import { transport, ApiError } from './client'
import {
  PRODUCTS,
  PRODUCT_TOTAL,
  getProductDetail,
  type Product,
  type ProductDetail,
} from '../data/products'

export type ProductListResult = {
  items: Product[]
  total: number
}

/** 产品列表：V1 一次返回全量，筛选与排序在前端完成（切换即时，无额外请求） */
export function fetchProducts(signal?: AbortSignal): Promise<ProductListResult> {
  return transport({ path: '/api/products', signal }, () => ({ items: PRODUCTS, total: PRODUCT_TOTAL }))
}

/** 产品详情：按 id 查询，未命中抛 404 供页面区分「不存在」 */
export function fetchProductDetail(id: string, signal?: AbortSignal): Promise<ProductDetail> {
  return transport({ path: `/api/products/${id}`, signal }, () => {
    const detail = getProductDetail(id)
    if (!detail) throw new ApiError('未找到该产品', 404)
    return detail
  })
}
