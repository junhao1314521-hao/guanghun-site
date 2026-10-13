/** 天梯榜页数据：名次、得分与更新日期均为占位示例，由测试数据接口层替换 */

export type LadderRow = {
  rank: string
  model: string
  name: string
  /** 综合得分，0–100；null 表示尚未测试（与零值严格区分） */
  score: number | null
  /** 是否与上一行并列 */
  tied?: boolean
}

/** 演示用「超长态」榜单行：仅在 ?demo=oversize 时追加到综合榜，用于验证长型号名的截断 */
export const OVERSIZE_LADDER_ROWS: LadderRow[] = [
  { rank: '09', model: 'GH-M900 PRO ULTRA LIMITED EDITION', name: '无线电竞鼠标（联名限量版，超长型号名占位）', score: 68.5 },
]

export type LadderMetric = {
  id: string
  label: string
  /** 该指标下的数值列的单位，如「分」「ms」 */
  unit: string
  /** 尚未完成此项测试的型号数量，用于空状态文案 */
  pending: number
  rows: LadderRow[]
}

export const LADDER_METRICS: LadderMetric[] = [
  {
    id: 'overall',
    label: '综合',
    unit: '分',
    pending: 3,
    rows: [
      { rank: '01', model: 'GH-M900 PRO', name: '无线电竞鼠标', score: 96.4 },
      { rank: '02', model: 'GH-M700', name: '有线电竞鼠标', score: 91.2 },
      { rank: '03', model: 'GH-M500', name: '轻量电竞鼠标', score: 88.7 },
      { rank: '04', model: 'GH-K870', name: '三模机械键盘', score: 85.3 },
      { rank: '05', model: 'GH-H500', name: '电竞头戴耳机', score: 82.9 },
      { rank: '06', model: 'GH-K650', name: '紧凑机械键盘', score: 79.6 },
      { rank: '07', model: 'GH-H300', name: '轻量电竞耳机', score: 74.1 },
      { rank: '08', model: 'GH-P400', name: '超大鼠标垫', score: 70.0, tied: true },
      { rank: '08', model: 'GH-P300', name: '标准鼠标垫', score: 70.0 },
      { rank: '—', model: 'GH-M100', name: '入门电竞鼠标', score: null },
    ],
  },
  {
    id: 'sensor',
    label: '传感器精度',
    unit: '分',
    pending: 5,
    rows: [
      { rank: '01', model: 'GH-M900 PRO', name: '无线电竞鼠标', score: 97.1 },
      { rank: '02', model: 'GH-M700', name: '有线电竞鼠标', score: 92.8 },
      { rank: '03', model: 'GH-M800', name: '旗舰无线电竞鼠标', score: 89.6 },
      { rank: '04', model: 'GH-M500', name: '轻量电竞鼠标', score: 86.4, tied: true },
      { rank: '04', model: 'GH-M600', name: '轻量无线电竞鼠标', score: 86.4 },
      { rank: '—', model: 'GH-M100', name: '入门电竞鼠标', score: null },
    ],
  },
  {
    id: 'battery',
    label: '续航',
    unit: 'h',
    pending: 6,
    rows: [
      { rank: '01', model: 'GH-M900 PRO', name: '无线电竞鼠标', score: 120 },
      { rank: '02', model: 'GH-K870', name: '三模机械键盘', score: 96 },
      { rank: '03', model: 'GH-M800', name: '旗舰无线电竞鼠标', score: 88 },
      { rank: '04', model: 'GH-M600', name: '轻量无线电竞鼠标', score: 58, tied: true },
      { rank: '04', model: 'GH-M500', name: '轻量电竞鼠标', score: 58 },
      { rank: '05', model: 'GH-H500', name: '电竞头戴耳机', score: 42 },
      { rank: '—', model: 'GH-M700', name: '有线电竞鼠标', score: null },
    ],
  },
  {
    id: 'latency',
    label: '延迟',
    unit: 'ms',
    pending: 4,
    rows: [
      { rank: '01', model: 'GH-M900 PRO', name: '无线电竞鼠标', score: 0.6 },
      { rank: '02', model: 'GH-M700', name: '有线电竞鼠标', score: 0.9 },
      { rank: '03', model: 'GH-M800', name: '旗舰无线电竞鼠标', score: 1.2 },
      { rank: '04', model: 'GH-K870', name: '三模机械键盘', score: 1.8 },
      { rank: '05', model: 'GH-M600', name: '轻量无线电竞鼠标', score: 2.4, tied: true },
      { rank: '05', model: 'GH-H300', name: '轻量电竞耳机', score: 2.4 },
      { rank: '06', model: 'GH-H500', name: '电竞头戴耳机', score: 12.4 },
      { rank: '—', model: 'GH-M100', name: '入门电竞鼠标', score: null },
    ],
  },
]

/** 榜单元信息（测试批次与样本量），页眉展示 */
export const LADDER_META = {
  testedAt: '2026-09-18',
  sample: 'n=5',
  updatedAt: '2026-09-20',
}

/**
 * 分值 → 进度条宽度。
 * 综合/精度类为 0–100 分直接映射；延迟与续航为「越小越好 / 越大越好」的量纲，
 * 这里统一按「该指标内的相对占比」展示，避免不同量纲混用造成误读。
 */
export function fillWidth(metric: LadderMetric, score: number | null): number {
  if (score === null) return 0
  if (metric.unit === '分') return Math.max(0, Math.min(100, score))
  const max = Math.max(...metric.rows.map((row) => row.score ?? 0))
  return max > 0 ? Math.round((score / max) * 100) : 0
}
