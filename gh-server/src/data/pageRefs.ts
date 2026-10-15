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
import { getPage, getSiteConfig, listPages } from './contentStore'

/** 一条引用记录：位置描述 + 原始链接 */
export type PageRef = { location: string; href: string }

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

/** 统计某素材 URL 在页面区块 props 中被引用的位置数（删除素材前的二次确认用） */
export function countReferencesToUrl(url: string): number {
  const needle = url.trim()
  if (!needle) return 0
  let count = 0
  const countInValue = (value: unknown) => {
    if (typeof value === 'string') {
      if (value.includes(needle)) count += 1
      return
    }
    if (Array.isArray(value)) {
      for (const entry of value) countInValue(entry)
      return
    }
    if (value && typeof value === 'object') {
      for (const val of Object.values(value as Record<string, unknown>)) countInValue(val)
    }
  }
  for (const meta of listPages()) {
    const page = getPage(meta.key)
    if (!page) continue
    for (const block of page.blocks) countInValue(block.props)
  }
  return count
}
