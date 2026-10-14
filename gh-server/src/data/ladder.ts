/** 天梯榜页数据：光魂 OLED 电竞显示器实测榜单（数据源为小雪人评测实验室口径） */

export type LadderRow = {
  rank: string
  model: string
  name: string
  /** 该指标下的数值；null 表示尚未测试（与零值严格区分） */
  score: number | null
  /** 是否与上一行并列 */
  tied?: boolean
  /** 上期该指标名次（用于「名次变化 ↑↓」；缺省则不显示箭头） */
  prevRank?: string
  /** 关联产品 id（可点进产品详情；无详情页的型号省略） */
  productId?: string
}

export type LadderMetric = {
  id: string
  label: string
  /** 该指标下的数值列的单位，如「分」「ms」 */
  unit: string
  /** 尚未完成此项测试的型号数量，用于空状态文案 */
  pending: number
  rows: LadderRow[]
}

/** 型号 → 产品 id（有产品详情页的型号） */
const MODEL_PRODUCT_ID: Record<string, string> = {
  '54027X1QE-W54': 'gh-54027x1qe',
  '28027X1QE-W28': 'gh-28027x1qe',
  '32X1UE-W16': 'gh-32x1ue',
  '27X1U': 'gh-27x1u',
  '27Q1F': 'gh-27q1f',
  '24H1': 'gh-24h1',
  '25S1FP': 'gh-25s1fp',
}

/** 榜单原始数据（构造时按型号补齐 productId） */
const RAW_METRICS: LadderMetric[] = [
  {
    id: 'overall',
    label: '综合',
    unit: '分',
    pending: 2,
    rows: [
      { rank: '01', model: '54027X1QE-W54', name: '闪电 540Hz 电竞OLED', score: 96.8, prevRank: '01' },
      { rank: '02', model: '32X1UE-W16', name: 'Meta 双模 4K 电竞OLED', score: 94.2, prevRank: '03' },
      { rank: '03', model: '28027X1QE-W28', name: '闪电 280Hz 电竞OLED', score: 92.5, prevRank: '02' },
      { rank: '04', model: '27X1U', name: '27 英寸 2K OLED', score: 89.6, prevRank: '04' },
      { rank: '05', model: '27Q1F', name: '27 英寸 2K 电竞 IPS', score: 85.1, prevRank: '06' },
      { rank: '06', model: '25S1FP', name: '24.5 英寸 FHD 240Hz IPS', score: 82.4, prevRank: '05' },
      { rank: '07', model: '24H1', name: '24 英寸 FHD 200Hz IPS', score: 79.8, prevRank: '07' },
    ],
  },
  {
    id: 'sensor',
    label: '色准',
    unit: 'ΔE',
    pending: 3,
    rows: [
      { rank: '01', model: '32X1UE-W16', name: 'Meta 双模 4K 电竞OLED', score: 0.9, prevRank: '02' },
      { rank: '02', model: '54027X1QE-W54', name: '闪电 540Hz 电竞OLED', score: 1.1, prevRank: '01' },
      { rank: '03', model: '28027X1QE-W28', name: '闪电 280Hz 电竞OLED', score: 1.3, prevRank: '03' },
      { rank: '04', model: '27X1U', name: '27 英寸 2K OLED', score: 1.6, prevRank: '05' },
      { rank: '05', model: '27Q1F', name: '27 英寸 2K 电竞 IPS', score: 2.1, prevRank: '04' },
      { rank: '06', model: '24H1', name: '24 英寸 FHD 200Hz IPS', score: 2.8, prevRank: '06' },
    ],
  },
  {
    id: 'battery',
    label: '峰值亮度',
    unit: 'nit',
    pending: 2,
    rows: [
      { rank: '01', model: '54027X1QE-W54', name: '闪电 540Hz 电竞OLED', score: 1320, prevRank: '01' },
      { rank: '02', model: '32X1UE-W16', name: 'Meta 双模 4K 电竞OLED', score: 1180, prevRank: '03' },
      { rank: '03', model: '28027X1QE-W28', name: '闪电 280Hz 电竞OLED', score: 1050, prevRank: '02' },
      { rank: '04', model: '27X1U', name: '27 英寸 2K OLED', score: 960, prevRank: '05' },
      { rank: '05', model: '27Q1F', name: '27 英寸 2K 电竞 IPS', score: 480, prevRank: '04' },
      { rank: '06', model: '24H1', name: '24 英寸 FHD 200Hz IPS', score: 430, prevRank: '06' },
    ],
  },
  {
    id: 'latency',
    label: '响应时间',
    unit: 'ms',
    pending: 1,
    rows: [
      { rank: '01', model: '54027X1QE-W54', name: '闪电 540Hz 电竞OLED', score: 0.04, prevRank: '02' },
      { rank: '02', model: '28027X1QE-W28', name: '闪电 280Hz 电竞OLED', score: 0.05, prevRank: '01' },
      { rank: '03', model: '32X1UE-W16', name: 'Meta 双模 4K 电竞OLED', score: 0.06, prevRank: '03' },
      { rank: '04', model: '27X1U', name: '27 英寸 2K OLED', score: 0.08, prevRank: '04' },
      { rank: '05', model: '27Q1F', name: '27 英寸 2K 电竞 IPS', score: 1.2, prevRank: '06' },
      { rank: '06', model: '25S1FP', name: '24.5 英寸 FHD 240Hz IPS', score: 1.8, prevRank: '05' },
      { rank: '07', model: '24H1', name: '24 英寸 FHD 200Hz IPS', score: 2.4, prevRank: '07' },
    ],
  },
]

/** 榜单数据：为有产品详情页的型号补齐 productId，供前台点入产品详情 */
export const LADDER_METRICS: LadderMetric[] = RAW_METRICS.map((metric) => ({
  ...metric,
  rows: metric.rows.map((row) => (MODEL_PRODUCT_ID[row.model] ? { ...row, productId: MODEL_PRODUCT_ID[row.model] } : row)),
}))

/** 榜单元信息（测试批次与样本量），页眉展示 */
export const LADDER_META = {
  testedAt: '2026-09-25',
  sample: 'n=3',
  updatedAt: '2026-10-08',
}

/**
 * 分值 → 进度条宽度。
 * 综合为 0–100 分直接映射；其余指标为「该指标内的相对占比」，
 * 避免不同量纲混用造成误读（延迟 / 响应时间等越小越好的指标同理）。
 */
export function fillWidth(metric: LadderMetric, score: number | null): number {
  if (score === null) return 0
  if (metric.unit === '分') return Math.max(0, Math.min(100, score))
  const max = Math.max(...metric.rows.map((row) => row.score ?? 0))
  return max > 0 ? Math.round((score / max) * 100) : 0
}
