/** 接口层 · 产品资源：页面通过本模块取数，不直接 import data/products */
import { transport, ApiError } from './client'
import {
  CATEGORY_FILTERS,
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

/** 产品分类（后台「分类与参数」维护，前台用于筛选） */
export type ProductCategoryItem = {
  id: string
  name: string
  code: string
  count: number
  order: number
  status: string
}

/** 测试记录（后台「测试记录」维护，前台产品详情「测试记录」分区展示） */
export type TestRecord = {
  id: string
  title: string
  product: string
  metric: string
  value: string
  method: string
  status: string
  date: string
  conclusion?: string
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

/** 产品分类：后台「分类与参数」维护，前台筛选 chip 依据（离线回退本地枚举） */
export function fetchProductCategories(signal?: AbortSignal): Promise<{ items: ProductCategoryItem[] }> {
  return transport({ path: '/api/product-categories', signal }, () => ({
    items: CATEGORY_FILTERS.filter((name) => name !== '全部').map((name, index) => ({
      id: `local-${index}`,
      name,
      code: '',
      count: 0,
      order: index + 1,
      status: '启用',
    })),
  }))
}

/** 测试记录：按型号查询（空型号返回全部）；后台「测试记录」维护 */
export function fetchTestRecords(product: string, signal?: AbortSignal): Promise<{ items: TestRecord[] }> {
  const query = product ? `?product=${encodeURIComponent(product)}` : ''
  return transport({ path: `/api/test-records${query}`, signal }, () => ({ items: [] }))
}
