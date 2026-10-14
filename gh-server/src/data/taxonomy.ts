/**
 * 内容分类与标签（前台文章筛选 + 后台「分类与标签」共用）。
 * 自 v? 起纳入结构化集合 `taxonomy`，后台改动即时反映到前台文章筛选。
 */

export type TaxonomyType = '分类' | '标签'

export type TaxonomyItem = {
  id: string
  name: string
  type: TaxonomyType
  /** 关联内容数（后台展示用，可手动维护） */
  count: number
  status: string
  /** 排序（越小越靠前）；分类决定前台筛选项顺序 */
  order: number
  desc?: string
}

export const TAXONOMY_ITEMS: TaxonomyItem[] = [
  { id: 'tx-001', name: '评测', type: '分类', count: 18, status: '启用', order: 1, desc: '产品评测类文章。' },
  { id: 'tx-002', name: '教程', type: '分类', count: 12, status: '启用', order: 2, desc: '使用教程类文章。' },
  { id: 'tx-003', name: '技术', type: '分类', count: 9, status: '启用', order: 3, desc: '行业趋势观察。' },
  { id: 'tx-004', name: '资讯', type: '分类', count: 7, status: '启用', order: 4, desc: '品牌与活动动态。' },
  { id: 'tx-005', name: '三模', type: '标签', count: 14, status: '启用', order: 1, desc: '' },
  { id: 'tx-006', name: '轻量化', type: '标签', count: 11, status: '启用', order: 2, desc: '' },
]

/** 前台文章筛选项：启用中的分类名（按 order 升序） */
export function taxonomyFilters(): string[] {
  return TAXONOMY_ITEMS.filter((item) => item.type === '分类' && item.status === '启用')
    .sort((a, b) => a.order - b.order)
    .map((item) => item.name)
}
