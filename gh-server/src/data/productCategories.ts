/**
 * 产品分类（前台产品筛选 + 后台「分类与参数」共用）。
 * 自 v? 起纳入结构化集合 `product-categories`，后台改动即时反映到前台产品筛选。
 *
 * 名称与 `products.category`（鼠标 / 键盘 / 耳机 / 配件）保持一致，避免两套枚举对不上。
 */

export type ProductCategoryItem = {
  id: string
  name: string
  /** 语义编码（mouse / keyboard / headset / accessory），供程序关联 */
  code: string
  /** 关联产品数（后台展示用，可手动维护） */
  count: number
  order: number
  status: string
}

export const PRODUCT_CATEGORIES: ProductCategoryItem[] = [
  { id: 'pc-mouse', name: '鼠标', code: 'mouse', count: 3, order: 1, status: '启用' },
  { id: 'pc-keyboard', name: '键盘', code: 'keyboard', count: 2, order: 2, status: '启用' },
  { id: 'pc-headset', name: '耳机', code: 'headset', count: 2, order: 3, status: '启用' },
  { id: 'pc-accessory', name: '配件', code: 'accessory', count: 1, order: 4, status: '启用' },
]

/** 前台产品筛选项：启用中的分类名（按 order 升序） */
export function productCategoryFilters(): string[] {
  return PRODUCT_CATEGORIES.filter((item) => item.status === '启用')
    .sort((a, b) => a.order - b.order)
    .map((item) => item.name)
}
