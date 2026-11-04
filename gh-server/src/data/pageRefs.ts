/**
 * 页面下线级联的「引用统计」工具。
 *
 * 用于后台页面列表展示「当前 N 处引用」并展开引用清单。引用来源（与需求一致）：
 * - 站点配置 `nav` / `footer` 里的链接（`href`）；
 * - 各页面区块 `props` 中的链接字段（`href` / `to`，递归扫描，含数组与嵌套对象）。
 *
 * 匹配规则：以 `path` 为准，忽略 query / hash；页面 path 可含 `:param` 模板段，
 * 分段匹配（如导航链接 `/brand/guanghun` 命中模板页 `/brand/:slug`）。
 * 本模块只做「通用过滤与引用统计」，不修改任何页面数据。
 */
import { COLLECTION_KEYS, listCollection } from './collectionStore'
import { getPage, getPageDraft, getSiteConfig, listPages } from './contentStore'

/** 一条引用记录：位置描述 + 原始链接（素材引用还会带后台可跳转地址 `to`） */
export type PageRef = { location: string; href: string; to?: string }

/** 引用报告：数量 + 明细 */
export type ReferenceReport = { count: number; refs: PageRef[] }

/** 视为链接字段的 props 键名 */
const LINK_KEYS = ['href', 'to']

/** 去除 query / hash，仅保留路径 */
function stripTarget(url: string): string {
  return url.split('#')[0].split('?')[0].trim()
}

/**
 * 链接路径是否指向目标页面路径：
 * - 完全一致；或
 * - 目标路径为模板（含 `:param`）且分段数一致、逐段匹配。
 */
export function pathMatchesPage(linkPath: string, pagePath: string): boolean {
  const link = stripTarget(linkPath)
  const target = pagePath.trim()
  if (!link || !target) return false
  if (link === target) return true
  if (!target.includes(':')) return false
  const linkSegs = link.split('/')
  const targetSegs = target.split('/')
  if (linkSegs.length !== targetSegs.length) return false
  return targetSegs.every((seg, index) => seg.startsWith(':') || seg === linkSegs[index])
}

/** 递归扫描任意值，命中 `href` / `to` 字符串字段时回调 */
function scanLinks(value: unknown, visit: (href: string) => void): void {
  if (Array.isArray(value)) {
    for (const entry of value) scanLinks(entry, visit)
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (LINK_KEYS.includes(key)) {
      if (typeof val === 'string' && val.trim()) visit(val)
      continue
    }
    scanLinks(val, visit)
  }
}

/** 收集全部链接出现位置（站点配置 nav / footer + 各页面区块 props） */
function collectLinkOccurrences(): Array<{ location: string; target: string }> {
  const occurrences: Array<{ location: string; target: string }> = []
  const site = getSiteConfig()
  for (const link of site.nav ?? []) {
    if (typeof link.href === 'string' && link.href.trim()) {
      occurrences.push({ location: `导航 · ${link.label || link.href}`, target: link.href })
    }
  }
  for (const group of site.footer ?? []) {
    for (const link of group.links ?? []) {
      if (typeof link.href === 'string' && link.href.trim()) {
        occurrences.push({
          location: `页脚 · ${group.title || '未命名组'} · ${link.label || link.href}`,
          target: link.href,
        })
      }
    }
  }
  for (const meta of listPages()) {
    const page = getPage(meta.key)
    if (!page) continue
    page.blocks.forEach((block, index) => {
      scanLinks(block.props, (href) => {
        occurrences.push({ location: `页面 ${page.title} · 区块#${index + 1}`, target: href })
      })
    })
  }
  return occurrences
}

/** 指定页面路径的全部引用明细 */
export function referencesForPath(pagePath: string): ReferenceReport {
  const refs: PageRef[] = []
  for (const occ of collectLinkOccurrences()) {
    if (pathMatchesPage(occ.target, pagePath)) refs.push({ location: occ.location, href: occ.target })
  }
  return { count: refs.length, refs }
}

/** 各页面 key → 引用数（供后台页面列表「当前 N 处引用」批量展示） */
export function pageReferenceCounts(): Record<string, number> {
  const occurrences = collectLinkOccurrences()
  const out: Record<string, number> = {}
  for (const meta of listPages()) {
    out[meta.key] = occurrences.filter((occ) => pathMatchesPage(occ.target, meta.path)).length
  }
  return out
}

/* ============================================================
   素材引用（删除前保护用）
   ============================================================ */

/** 集合 key → 中文名（引用位置展示用） */
const COLLECTION_LABELS: Record<string, string> = {
  products: '产品',
  rankings: '天梯榜',
  articles: '文章',
  downloads: '下载中心',
  faqs: '常见问题',
  models: '型号支持',
  'biz-content': '合作内容',
  'biz-cases': '案例',
  'biz-venues': '体验点',
  inquiries: '咨询工单',
  templates: '模板',
  legal: '法律条款',
  taxonomy: '分类与标签',
  'product-categories': '产品分类',
  'test-records': '测试记录',
  methods: '测评方法',
  'service-info': '服务信息',
  reservations: '预约',
  subscribers: '订阅者',
  'brand-assets': '品牌资料',
}

/** 递归收集任意值里的全部字符串（素材 URL 可能存在数组 / 嵌套对象 / 富文本字段中） */
function scanStrings(value: unknown, visit: (text: string) => void): void {
  if (typeof value === 'string') {
    if (value) visit(value)
    return
  }
  if (Array.isArray(value)) {
    for (const entry of value) scanStrings(entry, visit)
    return
  }
  if (value && typeof value === 'object') {
    for (const val of Object.values(value as Record<string, unknown>)) scanStrings(val, visit)
  }
}

/** 一条素材引用来源：位置描述 + 命中文本 + 后台跳转地址 */
type MediaOccurrence = { location: string; text: string; to?: string }

/** 记录名称：优先常见名称字段，退回 id */
function itemLabelOf(item: unknown): string {
  if (!item || typeof item !== 'object') return ''
  const record = item as Record<string, unknown>
  for (const key of ['name', 'title', 'label', 'model']) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return `「${value.trim()}」`
  }
  const id = record.id
  return typeof id === 'string' && id ? `#${id}` : ''
}

/** 收集所有可能引用素材的位置：页面、页面草稿、站点配置、全部集合记录 */
function collectMediaOccurrences(): MediaOccurrence[] {
  const out: MediaOccurrence[] = []
  for (const meta of listPages()) {
    const page = getPage(meta.key)
    if (!page) continue
    const builderTo = `/admin/pages/${encodeURIComponent(meta.key)}/builder`
    page.blocks.forEach((block, index) => {
      scanStrings(block.props, (text) =>
        out.push({ location: `页面「${page.title}」· 区块#${index + 1}`, text, to: builderTo }),
      )
    })
    const draft = getPageDraft(meta.key)
    draft?.blocks.forEach((block, index) => {
      scanStrings(block.props, (text) =>
        out.push({ location: `页面「${page.title}」· 草稿区块#${index + 1}`, text, to: builderTo }),
      )
    })
  }
  const site = getSiteConfig()
  scanStrings(site.nav, (text) => out.push({ location: '站点配置 · 导航', text, to: '/admin/site' }))
  scanStrings(site.footer, (text) => out.push({ location: '站点配置 · 页脚', text, to: '/admin/site' }))
  for (const key of COLLECTION_KEYS) {
    for (const item of listCollection(key)) {
      const label = `${COLLECTION_LABELS[key] ?? key}${itemLabelOf(item)}`
      const id = (item as { id?: unknown }).id
      const to = typeof id === 'string' && id ? `/admin/${key}/${encodeURIComponent(id)}` : `/admin/${key}`
      scanStrings(item, (text) => out.push({ location: label, text, to }))
    }
  }
  return out
}

/** 统计某素材 URL 被引用的位置数（删除前二次确认用；同一位置多次出现只算一次） */
export function countReferencesToUrl(url: string): number {
  return referencesToUrl(url).count
}

/** 某素材 URL 的引用明细（位置 + 原文片段） */
export function referencesToUrl(url: string): ReferenceReport {
  const needle = url.trim()
  if (!needle) return { count: 0, refs: [] }
  const seen = new Set<string>()
  const refs: PageRef[] = []
  for (const occ of collectMediaOccurrences()) {
    if (!occ.text.includes(needle) || seen.has(occ.location)) continue
    seen.add(occ.location)
    refs.push({ location: occ.location, href: occ.text.slice(0, 160), to: occ.to })
  }
  return { count: refs.length, refs }
}

/**
 * 全部素材的引用数索引（一次扫描全量数据，供素材列表批量展示「被 N 处引用」）。
 * key 为素材 URL（`/uploads/<文件名>`），同一位置内重复引用只计一次。
 */
export function mediaReferenceCounts(): Record<string, number> {
  const perLocation = new Map<string, Set<string>>()
  for (const occ of collectMediaOccurrences()) {
    const matches = occ.text.match(/\/uploads\/[^"'\s?#),]+/g)
    if (!matches) continue
    let set = perLocation.get(occ.location)
    if (!set) {
      set = new Set<string>()
      perLocation.set(occ.location, set)
    }
    for (const match of matches) set.add(match)
  }
  const counts: Record<string, number> = {}
  for (const set of perLocation.values()) {
    for (const url of set) counts[url] = (counts[url] ?? 0) + 1
  }
  return counts
}
