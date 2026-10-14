/** 全站搜索页数据：结果与计数均为占位示例，由搜索接口层替换 */

export type SearchKind = '产品' | '文章' | '天梯榜' | '支持资料'

export type SearchResult = {
  id: string
  kind: SearchKind
  /** 标题片段，命中关键词用 em 包裹 */
  title: string[]
  desc: string
  source: string
  date: string
  to: string
}

export const SEARCH_KINDS: Array<'全部' | SearchKind> = ['全部', '产品', '文章', '天梯榜', '支持资料']

/** 各类型结果数（占位） */
export const KIND_COUNTS: Record<'全部' | SearchKind, number> = {
  全部: 128,
  产品: 46,
  文章: 52,
  天梯榜: 12,
  支持资料: 18,
}

export const SEARCH_SORTS = ['相关度', '最新']

export const HOT_QUERIES = ['GH-M900 PRO', '三模键盘', '续航实测', '保修查询', '固件更新', 'Center 下载']

export const SEARCH_RESULTS: SearchResult[] = [
  {
    id: 'r1',
    kind: '产品',
    title: ['GH-M900 ', 'PRO', ' 无线电竞鼠标'],
    desc: '58 g 轻量机身，26,000 DPI 光学引擎，端到端延迟 0.6 ms，支持 8K 回报率。',
    source: '产品库 · 电竞鼠标',
    date: '更新于 2026-09-12',
    to: '/products/gh-m900-pro',
  },
  {
    id: 'r2',
    kind: '文章',
    title: ['无线鼠标', '延迟', '实测：从回报率到端到端'],
    desc: '用示波器与高速相机对比三种无线方案，说明回报率与延迟的真实差距。',
    source: '评测 · 实验室',
    date: '2026-08-25',
    to: '/articles/latency-end-to-end',
  },
  {
    id: 'r3',
    kind: '天梯榜',
    title: ['端到端', '延迟', ' TOP 10 · 综合榜'],
    desc: '按实测延迟排序，含采样方式、测试环境与置信区间，数据来源可查。',
    source: '天梯榜 · 鼠标榜',
    date: '2026-09-01 更新',
    to: '/ladder',
  },
  {
    id: 'r4',
    kind: '支持资料',
    title: ['GH-M900 PRO 驱动与固件下载'],
    desc: '最新驱动 3.2.1 与固件 1.0.7，含变更说明与安装要求；支持 Windows 与 macOS。',
    source: '下载中心 · 驱动',
    date: '2026-09-18',
    to: '/downloads',
  },
  {
    id: 'r5',
    kind: '支持资料',
    title: ['保修政策与', '保修', '状态查询'],
    desc: '整机保修范围、时长与不保修情形；输入序列号可查询剩余保修时间。',
    source: '服务支持 · 保修',
    date: '2026-07-30',
    to: '/support',
  },
  {
    id: 'r6',
    kind: '产品',
    title: ['GH-M900 系列对比：PRO / 标准版 / 无线版'],
    desc: '三款同代产品的重量、续航、传感器与价格差异一览。',
    source: '产品库 · 对比',
    date: '2026-09-05',
    to: '/products',
  },
]

/** 关键词高亮：把查询词在命中片段用 <mark> 包裹（片段自数据层给出） */
export function highlight(text: string, query: string): Array<{ text: string; hit: boolean }> {
  const q = query.trim()
  if (!q) return [{ text, hit: false }]
  const parts: Array<{ text: string; hit: boolean }> = []
  let rest = text
  let index = rest.toLowerCase().indexOf(q.toLowerCase())
  while (index !== -1) {
    if (index > 0) parts.push({ text: rest.slice(0, index), hit: false })
    parts.push({ text: rest.slice(index, index + q.length), hit: true })
    rest = rest.slice(index + q.length)
    index = rest.toLowerCase().indexOf(q.toLowerCase())
  }
  if (rest) parts.push({ text: rest, hit: false })
  return parts
}
