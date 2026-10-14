/** 产品列表页数据（前端镜像，与 gh-server 的 products.ts 同源）：光魂 OLED 电竞显示器 + 少量周边 */
import type { DeviceVariant } from '../components/ui/DeviceArt'

export type ProductCategory = 'OLED旗舰' | '双模高刷' | '电竞IPS' | '周边'
/** 视频接口规格（显示器主接口） */
export type ProductConnection = 'DP 2.1' | 'HDMI 2.1' | 'USB-C'

/** 结构化参数项（面板 / 分辨率 / 刷新率 / 响应时间 / 亮度 / 接口等） */
export type ProductAttribute = { label: string; value: string }

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
  /** 一句话卖点（运营维护，详情页标题下方展示） */
  tagline?: string
  /** 库存数量（0 视为缺货；仅用于展示） */
  stock?: number
  /** 卖点 / 亮点列表 */
  features?: string[]
  /** 结构化参数（面板 / 分辨率 / 刷新率 / 响应时间 / 亮度 / 接口等） */
  attributes?: ProductAttribute[]
  /** 包装清单 */
  inBox?: string[]
  /** 保修政策 */
  warranty?: string
  /** 兼容系统 */
  os?: string[]
  /** 整机重量（克） */
  weight?: number
}

export const PRODUCTS: Product[] = [
  {
    id: 'gh-54027x1qe', model: '54027X1QE-W54', name: '闪电 540Hz 电竞OLED显示器', category: 'OLED旗舰', connection: 'DP 2.1',
    specs: ['26.5 英寸', '2K 540Hz', '0.03 ms', 'W-OLED'], status: { level: 'success', text: '在售' },
    price: '¥4,999', priceValue: 4999, releasedAt: '2026-09-20', variant: 'monitor', flag: '旗舰',
    tagline: '26.5 英寸 2K@540Hz · 第四代 W-OLED · 0.03 ms GTG 响应',
    features: ['第四代 W-OLED 面板，2K 540Hz 满速刷新', '0.03 ms GTG 灰阶响应，告别拖影', '368 万像素级控光，原生 100 万:1 对比度', '满速 DP 2.1（80 Gbps）· 原厂石墨烯散热', 'CNC 阳极氧化铝背板 · AR 光面抗反涂层', '三年质保，含 OLED 烧屏保护'],
    attributes: [
      { label: '面板', value: '第四代 W-OLED' },
      { label: '尺寸 / 分辨率', value: '26.5 英寸 · 2560×1440' },
      { label: '刷新率', value: '540 Hz' },
      { label: '响应时间', value: '0.03 ms (GTG)' },
      { label: '对比度', value: '1,000,000:1' },
      { label: '色域', value: '99% DCI-P3 · 原生 10bit' },
      { label: '接口', value: 'DP 2.1 (UHBR20) · HDMI 2.1 · USB-C' },
      { label: '同步技术', value: 'G-SYNC 兼容 · FreeSync · VRR+' },
    ],
    inBox: ['显示器 × 1', 'DP 2.1 线 × 1', '电源适配器 × 1', '说明书 / 保修卡 × 1'],
    warranty: '整机三年质保（含 OLED 烧屏保护），全国联保',
    os: ['Windows 10 / 11', 'macOS', 'PS5 / Xbox Series X'],
    weight: 6500,
  },
  { id: 'gh-28027x1qe', model: '28027X1QE-W28', name: '闪电 280Hz 电竞OLED显示器', category: 'OLED旗舰', connection: 'DP 2.1', specs: ['26.5 英寸', '2K 280Hz', '1500 nit', 'W-OLED'], status: { level: 'success', text: '在售' }, price: '¥2,699', priceValue: 2699, releasedAt: '2026-08-15', variant: 'monitor', flag: '热销' },
  { id: 'gh-32x1ue', model: '32X1UE-W16', name: 'Meta 双模 4K 电竞显示器', category: '双模高刷', connection: 'DP 2.1', specs: ['31.5 英寸', '4K@165 / FHD@330', 'META OLED'], status: { level: 'success', text: '在售' }, price: '¥5,499', priceValue: 5499, releasedAt: '2026-09-05', variant: 'monitor', flag: '双模' },
  { id: 'gh-27x1u', model: '27X1U', name: '27 英寸 2K OLED 显示器', category: '双模高刷', connection: 'DP 2.1', specs: ['27 英寸', '2K 240Hz', 'QD-OLED'], status: { level: 'success', text: '在售' }, price: '¥2,199', priceValue: 2199, releasedAt: '2026-06-18', variant: 'monitor' },
  { id: 'gh-27q1f', model: '27Q1F', name: '27 英寸 2K 电竞显示器', category: '电竞IPS', connection: 'HDMI 2.1', specs: ['27 英寸', '2K 200Hz', 'Fast IPS'], status: { level: 'success', text: '在售' }, price: '¥1,299', priceValue: 1299, releasedAt: '2026-04-10', variant: 'monitor' },
  { id: 'gh-24h1', model: '24H1', name: '24 英寸 200Hz 电竞显示器', category: '电竞IPS', connection: 'HDMI 2.1', specs: ['23.8 英寸', 'FHD 200Hz', 'HDR400'], status: { level: 'success', text: '在售' }, price: '¥799', priceValue: 799, releasedAt: '2026-02-26', variant: 'monitor', flag: '入门' },
  { id: 'gh-25s1fp', model: '25S1FP', name: '24.5 英寸 高刷电竞显示器', category: '电竞IPS', connection: 'HDMI 2.1', specs: ['24.5 英寸', 'FHD 240Hz', 'IPS'], status: { level: 'warning', text: '缺货' }, price: '¥999', priceValue: 999, releasedAt: '2025-12-08', variant: 'monitor' },
  { id: 'gh-arm01', model: 'GH-ARM01', name: '显示器悬臂支架', category: '周边', specs: ['单臂', '承重 9 kg', 'VESA 75/100'], status: { level: 'success', text: '在售' }, price: '¥299', priceValue: 299, releasedAt: '2026-05-20', variant: 'pad' },
]

/** 筛选与排序选项 */
export const CATEGORY_FILTERS: Array<'全部' | ProductCategory> = ['全部', 'OLED旗舰', '双模高刷', '电竞IPS', '周边']
export const CONNECTION_FILTERS: ProductConnection[] = ['DP 2.1', 'HDMI 2.1', 'USB-C']
export const SORT_OPTIONS = ['综合排序', '价格从低到高', '价格从高到低', '上新时间']

/** 更多筛选：价格区间（元） */
export type PriceRange = { id: string; label: string; min: number; max: number }
export const PRICE_RANGES: PriceRange[] = [
  { id: 'all', label: '不限', min: 0, max: Infinity },
  { id: 'lt1000', label: '1000 元以下', min: 0, max: 999 },
  { id: '1000-3000', label: '1000–3000 元', min: 1000, max: 3000 },
  { id: 'gt3000', label: '3000 元以上', min: 3001, max: Infinity },
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
  /** 运营可维护的扩展字段（缺省则前端不展示） */
  tagline?: string
  features?: string[]
  attributes?: ProductAttribute[]
  inBox?: string[]
  warranty?: string
  os?: string[]
  weight?: number
}

/** 详情页占位数据（以旗舰 540Hz OLED 为完整示例，其余型号复用同一结构） */
export const PRODUCT_DETAILS: Record<string, ProductDetail> = {
  'gh-54027x1qe': {
    id: 'gh-54027x1qe',
    model: '54027X1QE-W54',
    name: '闪电 540Hz 电竞OLED显示器',
    badges: ['旗舰', 'W-OLED · DP 2.1'],
    status: { level: 'success', text: '在售' },
    price: '¥4,999',
    tag: 'OLED旗舰',
    summary: [
      {
        title: '标称参数（厂商公布）',
        rows: [
          { label: '刷新率', value: '540 Hz' },
          { label: '响应时间', value: '0.03 ms (GTG)' },
          { label: '对比度', value: '1,000,000:1' },
        ],
      },
      {
        title: '实测参数（小雪人评测实验室 · 2026-09-25 · n=3）',
        rows: [
          { label: 'HDR 峰值亮度', value: '1,320 nit' },
          { label: 'SDR 亮度', value: '468 nit' },
          { label: '运动响应 BET', value: '1.8 ms' },
          { label: '均匀度（9 点）', value: '未测量', missing: true },
        ],
      },
    ],
    specTable: [
      { name: '刷新率', nominal: '540 Hz', measured: '540 Hz', note: 'DP 2.1 满速下达成' },
      { name: '响应时间', nominal: '0.03 ms', measured: '0.04 ms (GTG)', note: '过驱档位「标准」' },
      { name: 'HDR 峰值亮度', nominal: '1500 nit', measured: '1,320 nit', note: '10% 窗口' },
      { name: '色域容积', nominal: '99% DCI-P3', measured: '97.6% DCI-P3', note: '实测色域容积' },
      { name: '对比度', nominal: '1,000,000:1', measured: '∞', note: 'OLED 纯黑，仪器底噪以下' },
      { name: '均匀度（9 点）', nominal: '—', measured: '未测量', note: '测试方法审核中', missing: true },
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
