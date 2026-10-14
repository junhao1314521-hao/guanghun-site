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

export const HOT_QUERIES = ['54027X1QE-W54', '双模切换', '响应实测', '保修查询', '固件更新', 'Center 下载']

export const SEARCH_RESULTS: SearchResult[] = [
  {
    id: 'r1',
    kind: '产品',
    title: ['54027X1QE', '-W54', ' 闪电 540Hz 电竞OLED显示器'],
    desc: '26.5 英寸 2K@540Hz，第四代 W-OLED 面板，0.03 ms GTG 响应，满速 DP 2.1。',
    source: '产品库 · OLED 旗舰',
    date: '更新于 2026-09-20',
    to: '/products/gh-54027x1qe',
  },
  {
    id: 'r2',
    kind: '文章',
    title: ['OLED 电竞显示器', '响应', '实测：从面板到像素'],
    desc: '在同一套条件与仪器下对比多款 OLED 的 GTG 响应与运动清晰度，说明面板与驱动的差异。',
    source: '评测 · 实验室',
    date: '2026-09-25',
    to: '/articles/latency-end-to-end',
  },
  {
    id: 'r3',
    kind: '天梯榜',
    title: ['响应时间', ' TOP 10 · 综合榜'],
    desc: '按实测响应时间排序，含测试环境、样本量与方法版本，数据来源可查。',
    source: '天梯榜 · 显示器榜',
    date: '2026-10-08 更新',
    to: '/ladder',
  },
  {
    id: 'r4',
    kind: '支持资料',
    title: ['54027X1QE-W54 固件与色彩配置下载'],
    desc: '最新固件 v1.6.3 与 ICC 色彩配置，含变更说明与安装要求；支持 Windows 与 macOS。',
    source: '下载中心 · 固件',
    date: '2026-09-15',
    to: '/downloads',
  },
  {
    id: 'r5',
    kind: '支持资料',
    title: ['保修政策与', '烧屏保护', '查询'],
    desc: '整机三年质保范围、期限与不保修情形；输入序列号可查询剩余保修时间。',
    source: '服务支持 · 保修',
    date: '2026-08-30',
    to: '/support',
  },
  {
    id: 'r6',
    kind: '产品',
    title: ['双模显示器对比：32X1UE-W16 / 27X1U'],
    desc: '两款双模产品的分辨率、刷新率、接口与价格差异一览。',
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
