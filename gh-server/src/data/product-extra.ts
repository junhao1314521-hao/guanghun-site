/**
 * 产品 / 天梯深度线数据：系列归类、对比取数与单项指标榜。
 * 均复用 products.ts、ladder.ts 的既有导出派生，不新造产品与榜单事实；
 * 产品列表与榜单列表由集合存储（collectionStore）注入，本模块只负责派生逻辑。
 */
import { LADDER_META, type LadderMetric, type LadderRow } from './ladder'
import { type Product, type ProductCategory } from './products'

/** 产品系列：按产品线归类既有产品 */
export type ProductSeries = {
  slug: string
  name: string
  line: ProductCategory
  desc: string
  /** 主视觉设备类型 key，与 Product.variant 同口径（前端据此取本地位图素材） */
  cover: string
}

export const SERIES: ProductSeries[] = [
  {
    slug: 'mouse',
    name: '电竞鼠标系列',
    line: '鼠标',
    cover: 'mouse',
    desc: '覆盖无线与有线两条线型，从旗舰高精度光学引擎到轻量入门，均按同一套实验室方法完成延迟与精度测试。',
  },
  {
    slug: 'keyboard',
    name: '机械键盘系列',
    line: '键盘',
    cover: 'keyboard',
    desc: '以紧凑配列与多模连接为主，兼顾桌面空间与续航表现，键程与触发点参数随型号标注。',
  },
  {
    slug: 'headset',
    name: '电竞耳机系列',
    line: '耳机',
    cover: 'headset',
    desc: '头戴式电竞耳机，聚焦声场定位与长时间佩戴，标称单元尺寸与实测延迟一并公示。',
  },
  {
    slug: 'accessory',
    name: '桌面配件系列',
    line: '配件',
    cover: 'pad',
    desc: '桌面配件以鼠标垫为主，标注实际尺寸与表面工艺，配合鼠标形成完整的操控链路。',
  },
]

/** 按 slug 取系列；未命中返回 null 供路由区分 404 */
export function getSeries(slug: string): ProductSeries | null {
  return SERIES.find((item) => item.slug === slug) ?? null
}

/** 系列内的产品（按产品线过滤产品集合，保持列表原始顺序） */
export function seriesProducts(slug: string, products: Product[]): Product[] {
  const series = getSeries(slug)
  if (!series) return []
  return products.filter((item) => item.category === series.line)
}

/** 按 id 列表取产品，顺序与请求一致；未知 id 跳过，全部未知时返回空数组 */
export function compareProducts(ids: string[], products: Product[]): Product[] {
  return ids
    .map((id) => products.find((item) => item.id === id))
    .filter((item): item is Product => Boolean(item))
}

/** 单项指标榜的元信息：在 LADDER_META 基础上补充单位与待测数量 */
export type LadderMetricMeta = typeof LADDER_META & { unit: string; pending: number }

export type LadderMetricDetail = {
  metric: string
  metricLabel: string
  rows: LadderRow[]
  meta: LadderMetricMeta
}

function fromMetric(metric: LadderMetric, label?: string): LadderMetricDetail {
  return {
    metric: metric.id,
    metricLabel: label ?? metric.label,
    rows: metric.rows,
    meta: { ...LADDER_META, unit: metric.unit, pending: metric.pending },
  }
}

function findMetric(id: string, metrics: LadderMetric[]): LadderMetric {
  return metrics.find((item) => item.id === id) ?? metrics[0]
}

/** 从产品规格里解析整机重量（克）；规格中「g / g」为克，「G」为无线频段，不参与匹配 */
function weightOf(product: Product): number | null {
  for (const spec of product.specs) {
    const matched = /(\d+(?:\.\d+)?)\s*g/.exec(spec)
    if (matched) return Number(matched[1])
  }
  return null
}

/** 重量榜：由产品规格派生，越轻数值越小；未标注重量的型号计入待测 */
function buildWeightMetric(products: Product[]): LadderMetricDetail {
  const scored = products
    .map((product) => ({ product, weight: weightOf(product) }))
    .filter((entry): entry is { product: Product; weight: number } => entry.weight !== null)
    .sort((a, b) => a.weight - b.weight)
  const rows: LadderRow[] = scored.map((entry, index) => ({
    rank: String(index + 1).padStart(2, '0'),
    model: entry.product.model,
    name: entry.product.name,
    score: entry.weight,
  }))
  return {
    metric: 'weight',
    metricLabel: '重量',
    rows,
    meta: { ...LADDER_META, unit: 'g', pending: products.length - scored.length },
  }
}

/** 单项指标榜：score / latency / battery 复用天梯数据，weight 由产品规格派生（数据均由集合存储注入） */
function buildExtraMetrics(metrics: LadderMetric[], products: Product[]): Record<string, LadderMetricDetail> {
  return {
    score: fromMetric(findMetric('overall', metrics), '综合得分'),
    latency: fromMetric(findMetric('latency', metrics)),
    battery: fromMetric(findMetric('battery', metrics)),
    weight: buildWeightMetric(products),
  }
}

/** 按 slug 取单项指标榜；未命中返回 null 供路由区分 404 */
export function getLadderMetric(metric: string, metrics: LadderMetric[], products: Product[]): LadderMetricDetail | null {
  return buildExtraMetrics(metrics, products)[metric] ?? null
}