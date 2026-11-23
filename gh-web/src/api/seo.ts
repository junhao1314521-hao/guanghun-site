/**
 * SEO 元信息覆盖接口。
 * - 公开：`GET /api/seo/meta`（前台启动时拉取一次，命中静态路由时覆盖标题 / 描述 / 收录）；
 * - 后台：`GET/PUT/DELETE /api/admin/seo`（编辑静态路由，需 content 权限）。
 */
import { ApiError, transport } from './client'
import { getAdminToken } from '../lib/adminAuth'

export type SeoOverride = {
  path: string
  title: string
  description: string
  indexable: boolean
  /** 分享图（站内相对路径或 http(s) 绝对地址；空串 = 默认分享图） */
  image: string
  updatedAt: string
}

export type SeoAdminItem = SeoOverride & {
  defaultTitle: string
  defaultDescription: string
  defaultIndexable: boolean
  /** 是否已覆盖（false = 使用默认值） */
  override: boolean
}

/* ---------------- 公开：前台覆盖缓存 ---------------- */

let cache: Map<string, SeoOverride> | null = null
let inflight: Promise<Map<string, SeoOverride>> | null = null

/** 取已加载的覆盖（未加载或未命中返回 undefined） */
export function seoOverrideFor(path: string): SeoOverride | undefined {
  return cache?.get(path)
}

/** 加载覆盖：同一页面生命周期内只请求一次；失败不阻塞页面（回落到默认元信息） */
export function loadSeoOverrides(): Promise<Map<string, SeoOverride>> {
  if (cache) return Promise.resolve(cache)
  if (inflight) return inflight
  inflight = transport<{ items: SeoOverride[] }>(
    { path: '/api/seo/meta' },
    () => ({ items: [] }),
  )
    .then((res) => {
      cache = new Map(res.items.map((item) => [item.path, item]))
      return cache
    })
    .catch((error: unknown) => {
      inflight = null
      throw error
    })
  return inflight
}

/** 后台保存后清空缓存，保证前台管理页后续读取到最新值 */
export function invalidateSeoOverrides(): void {
  cache = null
  inflight = null
}

/* ---------------- 后台 ---------------- */

export function fetchSeoAdmin(signal?: AbortSignal): Promise<SeoAdminItem[]> {
  return transport<{ items: SeoAdminItem[] }>(
    { path: '/api/admin/seo', signal, token: getAdminToken() ?? undefined },
    () => {
      throw new ApiError('SEO 接口不可用：请确认已启动 gh-server', 0)
    },
  ).then((res) => res.items)
}

export function saveSeoOverride(input: {
  path: string
  title: string
  description: string
  indexable: boolean
  image?: string
}): Promise<SeoAdminItem> {
  return transport<{ item: SeoAdminItem }>(
    { path: '/api/admin/seo', method: 'PUT', body: input, token: getAdminToken() ?? undefined },
    () => {
      throw new ApiError('保存失败：接口不可用', 0)
    },
  ).then((res) => {
    invalidateSeoOverrides()
    return res.item
  })
}

export function resetSeoOverride(path: string): Promise<SeoAdminItem> {
  return transport<{ item: SeoAdminItem }>(
    { path: '/api/admin/seo', method: 'DELETE', query: { path }, token: getAdminToken() ?? undefined },
    () => {
      throw new ApiError('重置失败：接口不可用', 0)
    },
  ).then((res) => {
    invalidateSeoOverrides()
    return res.item
  })
}
