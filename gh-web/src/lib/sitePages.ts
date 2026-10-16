/**
 * 前台「页面停用集合」来源与链接存活判断（下线级联的通用工具）。
 * ============================================================
 * 数据来自内容库页面列表 `GET /api/content/pages`：`enabled === false` 的页面 key / path
 * 进入停用集合。任意组件可用 `isPathLive(path)` / `isKeyLive(key)` 判断目标是否仍在线，
 * 从而在渲染链接处统一过滤指向已下线页面的死链（导航 / 页脚 / 区块复用同一判断）。
 *
 * 采用模块级 store + 订阅：页面列表在前台仅拉取一次，加载完成后通知订阅者重渲染。
 * 匹配规则与后端 `pageRefs.ts` 保持一致：忽略 query / hash；页面 path 可含 `:param`
 * 模板段并分段匹配（如 `/brand/guanghun` 命中模板 `/brand/:slug`）。
 */
import type { PageMeta } from '../data/contentTypes'

type Listener = () => void

const listeners = new Set<Listener>()
let pages: readonly PageMeta[] = []
let disabledPaths: ReadonlySet<string> = new Set()
let disabledKeys: ReadonlySet<string> = new Set()
let version = 0

/** 去除 query / hash，仅保留路径 */
function stripTarget(url: string): string {
  return url.split('#')[0].split('?')[0].trim()
}

/** 链接路径是否指向目标页面路径（完全一致，或目标为模板且分段匹配） */
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

/** 目标路径是否仍在线（未被任何已下线页面命中） */
export function isPathLive(path: string): boolean {
  if (disabledPaths.size === 0) return true
  const link = stripTarget(path)
  for (const pagePath of disabledPaths) {
    if (pathMatchesPage(link, pagePath)) return false
  }
  return true
}

/** 页面 key 是否仍在线 */
export function isKeyLive(key: string): boolean {
  return !disabledKeys.has(key)
}

/**
 * 任意 href 是否「仍可渲染」。
 * - 空值 / `#锚点` / `//` 协议相对地址 / 带协议的绝对地址（http(s)、mailto、tel 等）→ 一律放行；
 * - 以 `/` 开头的站内路径 → 交给 `isPathLive` 判断（自动忽略 query / hash）；
 * - 其余（相对路径等）→ 放行，避免误伤。
 *
 * 停用集合尚未加载时，`isPathLive` 默认返回 true，故本函数初始态一律放行，
 * 待内容库页面列表到达后再收敛（避免首屏出现「链接闪一下消失」）。
 * 纯函数、零副作用，SSR / 单测友好。
 */
export function isHrefLive(href: string | undefined): boolean {
  const value = (href ?? '').trim()
  if (!value) return true
  if (value.startsWith('#') || value.startsWith('//')) return true
  // 带协议的绝对地址（http://、https://、mailto:、tel: 等）→ 外链，放行
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return true
  if (value.startsWith('/')) return isPathLive(value)
  return true
}

/** 当前停用页面 path 集合（只读） */
export function getDisabledPaths(): ReadonlySet<string> {
  return disabledPaths
}

/**
 * 当前内容库页面列表（只读，含已下线页面）。
 * 供页脚「按后台页面层级自动生成分组」等处复用同一份页面数据，避免各自重复拉取。
 */
export function getSitePages(): readonly PageMeta[] {
  return pages
}

/** 由页面列表刷新停用集合并通知订阅者 */
export function setDisabledPages(input: readonly PageMeta[]): void {
  const paths = new Set<string>()
  const keys = new Set<string>()
  for (const page of input) {
    if (page.enabled === false) {
      paths.add(page.path)
      keys.add(page.key)
    }
  }
  pages = [...input]
  disabledPaths = paths
  disabledKeys = keys
  version += 1
  listeners.forEach((listener) => listener())
}

/** 订阅停用集合变化（供 useSyncExternalStore 使用） */
export function subscribeSitePages(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** 版本号快照（内容变化时自增，用于触发订阅者重渲染） */
export function sitePagesVersion(): number {
  return version
}
