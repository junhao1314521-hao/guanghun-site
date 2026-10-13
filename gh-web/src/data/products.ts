/** 产品列表页数据：型号、价格与库存状态均为占位示例，由商品接口层替换 */
import type { DeviceVariant } from '../components/ui/DeviceArt'

export type ProductCategory = '鼠标' | '键盘' | '耳机' | '配件'
export type ProductConnection = '有线' | '无线' | '三模'

export type Product = {
  id: string
  model: string
  name: string
  category: ProductCategory
  connection?: ProductConnection
  specs: string[]
  status: { level: 'success' | 'warning'; text: string }
  price: string
  /** 参考价的数值形式（元），仅用于排序与价格区间筛选 */
  priceValue: number
  /** 上新日期，用于「上新时间」排序 */
  releasedAt: string
  variant: DeviceVariant
  flag?: string
}

export const PRODUCTS: Product[] = [
  { id: 'gh-m900-pro', model: 'GH-M900 PRO', name: '无线电竞鼠标', category: '鼠标', connection: '无线', specs: ['26,000 DPI', '58 g'], status: { level: 'success', text: '在售' }, price: '¥899', priceValue: 899, releasedAt: '2026-09-12', variant: 'mouse', flag: '旗舰' },
  { id: 'gh-m700', model: 'GH-M700', name: '有线电竞鼠标', category: '鼠标', connection: '有线', specs: ['20,000 DPI', '62 g'], status: { level: 'success', text: '在售' }, price: '¥379', priceValue: 379, releasedAt: '2026-05-20', variant: 'mouse' },
  { id: 'gh-m500', model: 'GH-M500', name: '轻量电竞鼠标', category: '鼠标', connection: '有线', specs: ['18,000 DPI', '48 g'], status: { level: 'success', text: '在售' }, price: '¥299', priceValue: 299, releasedAt: '2026-03-08', variant: 'mouse' },
  { id: 'gh-k870', model: 'GH-K870', name: '三模机械键盘', category: '键盘', connection: '三模', specs: ['87 键', '三模'], status: { level: 'success', text: '在售' }, price: '¥649', priceValue: 649, releasedAt: '2026-07-02', variant: 'keyboard' },
  { id: 'gh-k650', model: 'GH-K650', name: '紧凑机械键盘', category: '键盘', connection: '无线', specs: ['65% 配列', '无线'], status: { level: 'warning', text: '缺货' }, price: '¥459', priceValue: 459, releasedAt: '2026-01-15', variant: 'keyboard' },
  { id: 'gh-h500', model: 'GH-H500', name: '电竞头戴耳机', category: '耳机', connection: '无线', specs: ['50 mm', '2.4 G'], status: { level: 'success', text: '在售' }, price: '¥529', priceValue: 529, releasedAt: '2026-06-11', variant: 'headset' },
  { id: 'gh-h300', model: 'GH-H300', name: '轻量电竞耳机', category: '耳机', connection: '有线', specs: ['40 mm', '有线'], status: { level: 'success', text: '在售' }, price: '¥259', priceValue: 259, releasedAt: '2025-11-28', variant: 'headset' },
  { id: 'gh-p400', model: 'GH-P400', name: '超大鼠标垫', category: '配件', specs: ['900×400', '防泼水'], status: { level: 'success', text: '在售' }, price: '¥129', priceValue: 129, releasedAt: '2025-09-30', variant: 'pad' },
]

/** 筛选与排序选项 */
export const CATEGORY_FILTERS: Array<'全部' | ProductCategory> = ['全部', '鼠标', '键盘', '耳机', '配件']
export const CONNECTION_FILTERS: ProductConnection[] = ['有线', '无线', '三模']
export const SORT_OPTIONS = ['综合排序', '价格从低到高', '价格从高到低', '上新时间']

/** 更多筛选：价格区间（元） */
export type PriceRange = { id: string; label: string; min: number; max: number }
export const PRICE_RANGES: PriceRange[] = [
  { id: 'all', label: '不限', min: 0, max: Infinity },
  { id: 'lt300', label: '300 元以下', min: 0, max: 299 },
  { id: '300-600', label: '300–600 元', min: 300, max: 600 },
  { id: 'gt600', label: '600 元以上', min: 601, max: Infinity },
]

/** 更多筛选：库存状态 */
export const STATUS_FILTERS: Array<'全部' | '在售' | '缺货'> = ['全部', '在售', '缺货']

/** 列表页占位的商品总量（分页用），真实值由接口层提供 */
export const PRODUCT_TOTAL = 24

/** 详情页：标称 / 实测严格分区，缺失值以「未测量」显式表达，与零值区分 */
export type SpecSummaryRow = { label: string; value: string; missing?: boolean }
export type SpecSummaryGroup = { title: string; rows: SpecSummaryRow[] }

/** 详情页：参数规格表（标称值 / 实测值 / 备注） */
export type SpecTableRow = { name: string; nominal: string; measured: string; note: string; missing?: boolean }

/** 详情页数据：按产品 id 组织；缺省时由列表数据兜底 */
export type ProductDetail = {
  id: string
  model: string
  name: string
  badges: string[]
  status: Product['status']
  price: string
  tag: string
  summary: SpecSummaryGroup[]
  specTable: SpecTableRow[]
  tabs: string[]
}

/** 详情页占位数据（以旗舰无线电竞鼠标为完整示例，其余型号复用同一结构） */
export const PRODUCT_DETAILS: Record<string, ProductDetail> = {
  'gh-m900-pro': {
    id: 'gh-m900-pro',
    model: 'GH-M900 PRO',
    name: '无线电竞鼠标',
    badges: ['旗舰', '无线 · 2.4 G'],
    status: { level: 'success', text: '在售' },
    price: '¥899',
    tag: '旗舰',
    summary: [
      {
        title: '标称参数（厂商公布）',
        rows: [
          { label: '最高分辨率', value: '26,000 DPI' },
          { label: '最大加速度', value: '50 G' },
          { label: '整机重量', value: '58 g' },
        ],
      },
      {
        title: '实测参数（光魂实验室 · 2026-09-18 · n=5）',
        rows: [
          { label: '端到端延迟', value: '0.6 ms' },
          { label: '续航（1000 Hz）', value: '120 h' },
          { label: '传感器偏移', value: '未测量', missing: true },
        ],
      },
    ],
    specTable: [
      { name: '分辨率', nominal: '26,000 DPI', measured: '25,980 DPI', note: '偏差 0.08%' },
      { name: '最大加速度', nominal: '50 G', measured: '49.6 G', note: '—' },
      { name: '整机重量', nominal: '58 g', measured: '57.9 g', note: '不含线材' },
      { name: '端到端延迟', nominal: '—', measured: '0.6 ms', note: '1000 Hz 上报' },
      { name: '续航', nominal: '130 h', measured: '120 h', note: '1000 Hz 实测' },
      { name: '传感器偏移', nominal: '—', measured: '未测量', note: '测试方法审核中', missing: true },
    ],
    tabs: ['参数规格', '测试记录', '评测文章', '下载资料'],
  },
}

/** 兜底：把列表数据补成详情结构，保证任意型号进入详情页都不空白 */
export function getProductDetail(id: string): ProductDetail | null {
  const base = PRODUCTS.find((item) => item.id === id)
  if (!base) return null
  const detailed = PRODUCT_DETAILS[id]
  if (detailed) return detailed
  return {
    id: base.id,
    model: base.model,
    name: base.name,
    badges: base.flag ? [base.flag, base.specs.join(' · ')] : [base.specs.join(' · ')],
    status: base.status,
    price: base.price,
    tag: base.category,
    summary: [
      { title: '标称参数（厂商公布）', rows: base.specs.map((spec, index) => ({ label: `${base.category}规格 ${index + 1}`, value: spec })) },
    ],
    specTable: base.specs.map((spec) => ({ name: spec, nominal: '—', measured: '未测量', note: '待补测', missing: true })),
    tabs: ['参数规格', '测试记录', '评测文章', '下载资料'],
  }
}
