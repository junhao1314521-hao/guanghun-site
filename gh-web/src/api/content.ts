/**
 * 接口层 · 内容库资源（契约 §6.1 公开端点）。
 *
 * 页面通过本模块取数，不直接 import 硬编码内容：
 *   GET /api/content/pages          页面列表 { items: PageMeta[], total }
 *   GET /api/content/pages/:key     单页 { page: Page }
 *   GET /api/content/site           站点配置 { nav, footer }
 *   GET /api/content/blocks/types   区块类型目录 { items: BlockTypeMeta[] }
 *
 * 响应体无 { code, data } 包装；错误为 { error: string }（由传输器统一映射为 ApiError）。
 */
import { ApiError, transport } from './client'
import { activeLocale } from '../lib/locale'
import type { BlockTypeMeta, Page, PageMeta, SiteConfig } from '../blocks/types'

export type PageListResult = { items: PageMeta[]; total: number }

/** 内容库不可用时给出可操作错误（未启动 gh-server / 未配置 VITE_API_BASE） */
function unavailable(): never {
  throw new ApiError('内容库接口不可用：请确认已启动 gh-server', 0)
}

/**
 * 页面级 SWR 缓存：再次进入同一页面时先渲染已有数据，同时后台刷新，
 * 避免每次导航都闪骨架屏；超过硬过期时间后重新阻塞取数，防止长期展示过期内容。
 * key 含当前 locale，避免中英文内容互相污染。
 */
const PAGE_CACHE_TTL_MS = 5 * 60_000
const pageCache = new Map<string, { at: number; page: Page }>()

function pageCacheKey(scope: string, key: string): string {
  return `${activeLocale() ?? 'zh'}|${scope}:${key}`
}

function loadPage(requestPath: string, cacheKey: string, signal?: AbortSignal): Promise<Page> {
  return transport<{ page: Page }>({ path: requestPath, signal }, unavailable).then((res) => {
    pageCache.set(cacheKey, { at: Date.now(), page: res.page })
    return res.page
  })
}

/** stale-while-revalidate：命中缓存立即返回，后台刷新；刷新失败保留旧数据 */
function fetchPageWithSwr(requestPath: string, cacheKey: string, signal?: AbortSignal): Promise<Page> {
  const cached = pageCache.get(cacheKey)
  if (cached && Date.now() - cached.at < PAGE_CACHE_TTL_MS) {
    void loadPage(requestPath, cacheKey).catch(() => {
      // 后台刷新失败时保留旧数据，不打断当前渲染
    })
    return Promise.resolve(cached.page)
  }
  return loadPage(requestPath, cacheKey, signal)
}

/** 单页：返回 Page 本体（未命中后端返回 404 → 传输器抛 ApiError） */
export function fetchPage(key: string, signal?: AbortSignal): Promise<Page> {
  return fetchPageWithSwr(
    `/api/content/pages/${encodeURIComponent(key)}`,
    pageCacheKey('page', key),
    signal,
  )
}

/** 页面列表：不含 blocks（供页面导航 / 站点地图类需求使用） */
export function fetchPages(signal?: AbortSignal): Promise<PageListResult> {
  return transport<PageListResult>({ path: '/api/content/pages', signal }, unavailable)
}

/** 按前台 URL 路径反查内容库页面（动态路由 R10.1）；未命中后端 404 → 抛 ApiError */
export function fetchPageByPath(path: string, signal?: AbortSignal): Promise<Page> {
  return fetchPageWithSwr(
    `/api/content/page-by-path?path=${encodeURIComponent(path)}`,
    pageCacheKey('path', path),
    signal,
  )
}

/**
 * 站点配置缓存：`useSiteConfig` 被 13 个组件同时调用（导航 / 页脚 / 公告 / 社交 / 店铺…），
 * 不做缓存时首屏会对 `/api/content/site` 并发十几次。这里做「SWR + 在途合并」：
 * - 软 TTL 内直接返回缓存，不额外请求；
 * - 超过软 TTL 仍先返回缓存并在后台刷新（stale-while-revalidate）；
 * - 超过硬 TTL 才阻塞重新取数，避免长期展示过期导航 / 页脚；
 * - 同时发起的请求共用同一个 Promise（只发一次网络）。
 * 后台保存站点配置后调用 `invalidateSiteCache()`，避免前台看到旧值。
 */
const SITE_CACHE_TTL_MS = 60_000
const SITE_CACHE_HARD_TTL_MS = 10 * 60_000
let siteCache: { at: number; data: SiteConfig } | null = null
let siteInflight: Promise<SiteConfig> | null = null

/** 失效站点配置缓存（后台保存后调用） */
export function invalidateSiteCache(): void {
  siteCache = null
  siteInflight = null
}

/** 真正发起站点配置请求，并合并并发调用 */
function loadSite(): Promise<SiteConfig> {
  if (siteInflight) return siteInflight
  siteInflight = transport<SiteConfig>({ path: '/api/content/site' }, unavailable)
    .then((data) => {
      siteCache = { at: Date.now(), data }
      return data
    })
    .finally(() => {
      siteInflight = null
    })
  return siteInflight
}

/** 站点配置：导航与页脚（含扩展字段 enabledBlocks / theme；不改视觉） */
export function fetchSite(_signal?: AbortSignal): Promise<SiteConfig> {
  if (siteCache) {
    const age = Date.now() - siteCache.at
    if (age < SITE_CACHE_HARD_TTL_MS) {
      if (age >= SITE_CACHE_TTL_MS) {
        // 后台刷新，失败时继续沿用旧数据
        void loadSite().catch(() => {})
      }
      return Promise.resolve(siteCache.data)
    }
  }
  return loadSite()
}

/** 区块类型目录：供后台表单渲染（前台暂不使用，接口对齐契约保留） */
export function fetchBlockTypes(signal?: AbortSignal): Promise<BlockTypeMeta[]> {
  return transport<{ items: BlockTypeMeta[] }>({ path: '/api/content/blocks/types', signal }, unavailable).then(
    (res) => res.items,
  )
}