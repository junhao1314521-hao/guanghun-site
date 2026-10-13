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
import type { BlockTypeMeta, Page, PageMeta, SiteConfig } from '../blocks/types'

export type PageListResult = { items: PageMeta[]; total: number }

/** 内容库不可用时给出可操作错误（未启动 gh-server / 未配置 VITE_API_BASE） */
function unavailable(): never {
  throw new ApiError('内容库接口不可用：请确认已启动 gh-server', 0)
}

/** 单页：返回 Page 本体（未命中后端返回 404 → 传输器抛 ApiError） */
export function fetchPage(key: string, signal?: AbortSignal): Promise<Page> {
  return transport<{ page: Page }>({ path: `/api/content/pages/${encodeURIComponent(key)}`, signal }, unavailable).then(
    (res) => res.page,
  )
}

/** 页面列表：不含 blocks（供页面导航 / 站点地图类需求使用） */
export function fetchPages(signal?: AbortSignal): Promise<PageListResult> {
  return transport<PageListResult>({ path: '/api/content/pages', signal }, unavailable)
}

/** 站点配置：导航与页脚（含扩展字段 enabledBlocks / theme；不改视觉） */
export function fetchSite(signal?: AbortSignal): Promise<SiteConfig> {
  return transport<SiteConfig>({ path: '/api/content/site', signal }, unavailable)
}

/** 区块类型目录：供后台表单渲染（前台暂不使用，接口对齐契约保留） */
export function fetchBlockTypes(signal?: AbortSignal): Promise<BlockTypeMeta[]> {
  return transport<{ items: BlockTypeMeta[] }>({ path: '/api/content/blocks/types', signal }, unavailable).then(
    (res) => res.items,
  )
}