/**
 * 产品详情上下文（契约扩展）：
 * 详情页主体区块化后，「展示台 / 参数规格 / 购买咨询」等区块需要读取**当前产品**的数据。
 * 由 `ProductDetailPage` 注入一次（已取到的 detail），区块通过 `useProductDetail()` 消费，
 * 避免每个区块各自重复请求产品详情。
 *
 * 该上下文只承载「当前产品数据」，不含任何装修配置——装修配置仍在内容库的模板页里。
 */
import { createContext, useContext } from 'react'
import type { ProductDetail } from '../data/products'

export const ProductDetailContext = createContext<ProductDetail | null>(null)

/** 当前产品详情；不在产品详情页内渲染时为 null（区块应据此降级为不渲染） */
export function useProductDetail(): ProductDetail | null {
  return useContext(ProductDetailContext)
}
