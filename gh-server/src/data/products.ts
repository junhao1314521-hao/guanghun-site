/** 产品列表页数据：以光魂（小雪人数码）OLED 电竞显示器为主线 + 少量周边，供商品接口层消费 */
import type { DeviceVariant } from './device-variant'

export type ProductCategory = 'OLED旗舰' | '双模高刷' | '电竞IPS' | '周边'
/** 视频接口规格（显示器主接口） */
export type ProductConnection = 'DP 2.1' | 'HDMI 2.1' | 'USB-C'

/** 结构化参数项（如 面板 / 刷新率 / 响应时间 / HDR） */
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
  /** 相册图片地址（按产品单独上传；可排序，不设硬上限，建议 ≤ 20 张）。空 / 缺省时前台回退内置 4 视角图 */
  gallery?: string[]
  /** 详情富文本 HTML（长图 / 图文混排；前台渲染前复用 sanitizeRichText 白名单净化）。空 / 缺省时不渲染 */
  detailHtml?: string
  /** 购买链接（详情页 / 对比页主按钮「立即购买」取此值；未填则回退） */
  buyUrl?: string
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
    buyUrl: 'https://buy.guanghun.example/gh-54027x1qe',
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
  /** 以下为运营可维护的扩展字段（来自产品记录，缺省则不展示） */
  tagline?: string
  features?: string[]
  attributes?: ProductAttribute[]
  inBox?: string[]
  warranty?: string
  os?: string[]
  weight?: number
  /** 相册图片地址（按产品维护；缺省回退内置视角图） */
  gallery?: string[]
  /** 详情富文本 HTML（按产品维护；渲染前经白名单净化） */
  detailHtml?: string
  /** 购买链接（详情页主按钮「立即购买」取此值，见 §4.22 3-2） */
  buyUrl?: string
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

/** 详情页英文标签（数据层双语）：集合英文覆盖层已译 name / specs / flag，此处补齐详情结构 */
const CATEGORY_EN: Record<string, string> = { OLED旗舰: 'OLED Flagship', 双模高刷: 'Dual-mode', 电竞IPS: 'Gaming IPS', 周边: 'Accessories' }
const STATUS_EN: Record<string, string> = { 在售: 'In stock', 缺货: 'Out of stock', 预售: 'Pre-order' }

/** 详情页英文数据（结构与中文一致，仅译文案） */
export const PRODUCT_DETAILS_EN: Record<string, ProductDetail> = {
  'gh-54027x1qe': {
    id: 'gh-54027x1qe',
    model: '54027X1QE-W54',
    name: 'Lightning 540Hz OLED Gaming Monitor',
    badges: ['Flagship', 'W-OLED · DP 2.1'],
    status: { level: 'success', text: 'In stock' },
    price: '¥4,999',
    tag: 'OLED Flagship',
    summary: [
      {
        title: 'Nominal (vendor published)',
        rows: [
          { label: 'Refresh rate', value: '540 Hz' },
          { label: 'Response time', value: '0.03 ms (GTG)' },
          { label: 'Contrast', value: '1,000,000:1' },
        ],
      },
      {
        title: 'Measured (Snowman Lab · 2026-09-25 · n=3)',
        rows: [
          { label: 'HDR peak brightness', value: '1,320 nit' },
          { label: 'SDR brightness', value: '468 nit' },
          { label: 'Motion response (BET)', value: '1.8 ms' },
          { label: 'Uniformity (9-point)', value: 'Not measured', missing: true },
        ],
      },
    ],
    specTable: [
      { name: 'Refresh rate', nominal: '540 Hz', measured: '540 Hz', note: 'At full DP 2.1 bandwidth' },
      { name: 'Response time', nominal: '0.03 ms', measured: '0.04 ms (GTG)', note: 'Overdrive «Standard»' },
      { name: 'HDR peak brightness', nominal: '1500 nit', measured: '1,320 nit', note: '10% window' },
      { name: 'Color gamut', nominal: '99% DCI-P3', measured: '97.6% DCI-P3', note: 'Measured volume' },
      { name: 'Contrast', nominal: '1,000,000:1', measured: '∞', note: 'OLED black, below instrument floor' },
      { name: 'Uniformity (9-point)', nominal: '—', measured: 'Not measured', note: 'Method under review', missing: true },
    ],
    tabs: ['Specifications', 'Test records', 'Reviews', 'Downloads'],
  },
}

/** 从产品记录中取出运营可维护的扩展字段（仅取已定义项，供详情合并） */
function extendedFields(base: Product): Partial<ProductDetail> {
  const out: Partial<ProductDetail> = {}
  if (base.tagline !== undefined) out.tagline = base.tagline
  if (base.features !== undefined) out.features = base.features
  if (base.attributes !== undefined) out.attributes = base.attributes
  if (base.inBox !== undefined) out.inBox = base.inBox
  if (base.warranty !== undefined) out.warranty = base.warranty
  if (base.os !== undefined) out.os = base.os
  if (base.weight !== undefined) out.weight = base.weight
  if (base.gallery !== undefined) out.gallery = base.gallery
  if (base.detailHtml !== undefined) out.detailHtml = base.detailHtml
  if (base.buyUrl !== undefined) out.buyUrl = base.buyUrl
  return out
}

/** 兜底：把列表数据补成详情结构，保证任意型号进入详情页都不空白（列表来自集合存储，形状与 PRODUCTS 一致） */
export function getProductDetail(products: Product[], id: string, locale: string = 'zh'): ProductDetail | null {
  const base = products.find((item) => item.id === id)
  if (!base) return null
  if (locale === 'en') {
    const detailedEn = PRODUCT_DETAILS_EN[id]
    if (detailedEn) return { ...detailedEn, ...extendedFields(base) }
    return {
      id: base.id,
      model: base.model,
      name: base.name,
      badges: base.flag ? [base.flag, base.specs.join(' · ')] : [base.specs.join(' · ')],
      status: { level: base.status.level, text: STATUS_EN[base.status.text] ?? base.status.text },
      price: base.price,
      tag: CATEGORY_EN[base.category] ?? base.category,
      summary: [
        {
          title: 'Nominal (vendor published)',
          rows: base.specs.map((spec, index) => ({ label: `Spec ${index + 1}`, value: spec })),
        },
      ],
      specTable: base.specs.map((spec) => ({ name: spec, nominal: '—', measured: 'Not measured', note: 'Pending', missing: true })),
      tabs: ['Specifications', 'Test records', 'Reviews', 'Downloads'],
      ...extendedFields(base),
    }
  }
  const detailed = PRODUCT_DETAILS[id]
  if (detailed) return { ...detailed, ...extendedFields(base) }
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
    ...extendedFields(base),
  }
}
