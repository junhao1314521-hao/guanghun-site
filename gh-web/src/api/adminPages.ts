/**
 * 接口层 · 后台内容库与装修器（契约 §6.2 / §6.3）。
 * ============================================================
 * 页面「装修器」只依赖本模块；令牌经 `lib/adminAuth` 读取并随请求发送，
 * 错误处理沿用 `client.transport`（非 2xx → ApiError，401 由会话守卫兜底跳登录）。
 *
 * 端点（契约 §6.2，均需 `Authorization: Bearer <token>`）：
 *   GET    /api/admin/pages             页面列表 { items, total }
 *   GET    /api/admin/pages/:key        单页 { page }
 *   PUT    /api/admin/pages/:key        保存整页（blocks 全量覆盖）→ { page }
 *   POST   /api/admin/pages             新建页面 → { page }
 *   DELETE /api/admin/pages/:key        删除页面 → { ok: true }
 *   POST   /api/admin/pages/:key/reset  重置为初始 → { page }
 *   PUT    /api/admin/site              保存站点配置 → { site }
 *
 * 区块类型目录（契约 §6.3，公开端点）：
 *   GET    /api/content/blocks/types    { items: BlockTypeMeta[] }（供表单自动渲染）
 *
 * 说明：前端未提供 `data/blockTypes.ts`，故区块类型元数据在此模块内定义并消费，
 * 类型形状直接镜像 `data/contentTypes.ts`（契约字段名逐字一致）。
 */
import { ApiError, transport } from './client'
import { getAdminToken } from '../lib/adminAuth'
import type {
  Block,
  BlockFieldMeta,
  BlockStyle,
  BlockType,
  BlockTypeMeta,
  Page,
  PageMeta,
  SiteAnnouncement,
  SiteAuthConfig,
  SiteConfig,
  SiteCta,
  SiteFooterGroup,
  SiteLink,
  SiteSocialConfig,
  SiteWarrantyConfig,
} from '../data/contentTypes'

// 类型统一从本模块再导出，页面只依赖 api 层
export type {
  Block,
  BlockFieldMeta,
  BlockStyle,
  BlockType,
  BlockTypeMeta,
  Page,
  PageMeta,
  SiteAnnouncement,
  SiteAuthConfig,
  SiteConfig,
  SiteCta,
  SiteFooterGroup,
  SiteLink,
  SiteSocialConfig,
  SiteWarrantyConfig,
}

/** 页面列表响应（契约 §6.2） */
export type AdminPageList = { items: PageMeta[]; total: number }

/** 保存整页的载荷：仅提交的字段会被覆盖（blocks 全量覆盖） */
export type SavePageBody = {
  path?: string
  title?: string
  description?: string
  blocks?: Block[]
}

/** 新建页面载荷（key/path/title 必填） */
export type CreatePageBody = {
  key: string
  path: string
  title: string
  description?: string
  blocks?: Block[]
}

/** 当前令牌（未登录为 undefined，传输器据此省略 Authorization 头） */
function adminToken(): string | undefined {
  return getAdminToken() ?? undefined
}

/* ---------------- 页面（契约 §6.2） ---------------- */

/** 页面列表：GET /api/admin/pages */
export function fetchAdminPages(signal?: AbortSignal): Promise<AdminPageList> {
  return transport<AdminPageList>(
    { path: '/api/admin/pages', signal, token: adminToken() },
    () => ({ items: [], total: 0 }),
  )
}

/** 单页：GET /api/admin/pages/:key（未命中 → 404） */
export function fetchAdminPage(key: string, signal?: AbortSignal): Promise<Page> {
  return transport<{ page: Page }>(
    { path: `/api/admin/pages/${encodeURIComponent(key)}`, signal, token: adminToken() },
    () => {
      throw new ApiError('未找到该页面', 404)
    },
  ).then((res) => res.page)
}

/** 保存整页：PUT /api/admin/pages/:key（blocks 全量覆盖） */
export function saveAdminPage(key: string, body: SavePageBody): Promise<Page> {
  return transport<{ page: Page }>(
    { path: `/api/admin/pages/${encodeURIComponent(key)}`, method: 'PUT', body, token: adminToken() },
    () => {
      throw new ApiError('保存接口不可用', 503)
    },
  ).then((res) => res.page)
}

/** 新建页面：POST /api/admin/pages（key 重复 → 409） */
export function createAdminPage(body: CreatePageBody): Promise<Page> {
  return transport<{ page: Page }>(
    { path: '/api/admin/pages', method: 'POST', body, token: adminToken() },
    () => {
      throw new ApiError('新建接口不可用', 503)
    },
  ).then((res) => res.page)
}

/** 删除页面：DELETE /api/admin/pages/:key（内置页面禁删 → 400） */
export function deleteAdminPage(key: string): Promise<{ ok: boolean }> {
  return transport<{ ok: boolean }>(
    { path: `/api/admin/pages/${encodeURIComponent(key)}`, method: 'DELETE', token: adminToken() },
    () => ({ ok: true }),
  )
}

/** 重置为初始：POST /api/admin/pages/:key/reset */
export function resetAdminPage(key: string): Promise<Page> {
  return transport<{ page: Page }>(
    { path: `/api/admin/pages/${encodeURIComponent(key)}/reset`, method: 'POST', token: adminToken() },
    () => {
      throw new ApiError('该页面无初始内容可重置', 404)
    },
  ).then((res) => res.page)
}

/** 保存站点配置：PUT /api/admin/site */
export function saveAdminSite(site: SiteConfig): Promise<SiteConfig> {
  return transport<{ site: SiteConfig }>(
    { path: '/api/admin/site', method: 'PUT', body: site, token: adminToken() },
    () => ({ site }),
  ).then((res) => res.site)
}

/** 保存启用的区块类型（组件库启用/停用）：PUT /api/admin/blocks/enabled */
export function saveBlockEnabled(enabled: string[]): Promise<string[]> {
  return transport<{ enabledBlocks: string[] }>(
    { path: '/api/admin/blocks/enabled', method: 'PUT', body: { enabled }, token: adminToken() },
    () => ({ enabledBlocks: enabled }),
  ).then((res) => res.enabledBlocks)
}

/** 保存站点级设计令牌覆盖（样式栏目）：PUT /api/admin/theme */
export function saveTheme(theme: Record<string, string>): Promise<Record<string, string>> {
  return transport<{ theme: Record<string, string> }>(
    { path: '/api/admin/theme', method: 'PUT', body: { theme }, token: adminToken() },
    () => ({ theme }),
  ).then((res) => res.theme)
}

/**
 * 读取站点配置：GET /api/content/site（契约 §6.1）。
 * 后台无独立 GET /api/admin/site，编辑器读取公开端点以获取当前值（供加载与「恢复为初始」重拉）。
 */
export function fetchAdminSite(signal?: AbortSignal): Promise<SiteConfig> {
  return transport<SiteConfig>(
    { path: '/api/content/site', signal, token: adminToken() },
    () => {
      throw new ApiError('站点配置接口不可用：请确认已启动 gh-server', 0)
    },
  )
}

/* ---------------- 区块类型目录（契约 §6.3，公开） ---------------- */

/** 区块类型目录：GET /api/content/blocks/types（供表单自动渲染） */
export function fetchBlockTypeCatalog(signal?: AbortSignal): Promise<BlockTypeMeta[]> {
  return transport<{ items: BlockTypeMeta[] }>(
    { path: '/api/content/blocks/types', signal },
    () => {
      throw new ApiError('区块类型目录不可用：请确认已启动 gh-server', 0)
    },
  ).then((res) => res.items)
}

/* ---------------- 本地区块工厂（默认值镜像契约 §4） ---------------- */

/** 生成稳定唯一 id（优先 crypto.randomUUID，回退时间戳 + 随机数） */
function genBlockId(): string {
  const cryptoObj = globalThis.crypto
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') return cryptoObj.randomUUID()
  return `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** 各类型默认 props（对齐契约 §4 字段；仅作新建区块的起点） */
function defaultProps(type: BlockType): Record<string, unknown> {
  switch (type) {
    case 'hero':
      return { eyebrow: '', title: [''], desc: '', mediaTag: '', image: '', primary: { label: '了解更多', href: '/' }, stats: [] }
    case 'carousel':
      return {
        // 「代码动画」作为第 1 张（默认开）；关闭后仅展示下面配置的海报
        motion: true,
        slides: [
          {
            eyebrow: '',
            title: [''],
            desc: '',
            mediaTag: '',
            media: '',
            mediaType: 'image',
            image: '',
            imageMobile: '',
            primary: { label: '了解更多', href: '/' },
            stats: [],
          },
        ],
        autoplay: true,
      }
    case 'video':
      return { title: '', desc: '', url: '', poster: '' }
    case 'text':
      return { eyebrow: '', title: '', body: '', align: 'left' }
    case 'imageText':
      return { image: '', title: '', body: '', side: 'left' }
    case 'imageGrid':
      return { title: '', columns: 3, items: [{ image: '', caption: '' }] }
    case 'stats':
      return { title: '', items: [{ value: '', label: '' }] }
    case 'cards':
      return { title: '', desc: '', columns: 3, items: [{ title: '', desc: '' }] }
    case 'timeline':
      return { title: '', items: [{ time: '', title: '' }] }
    case 'productGrid':
      return { title: '', source: 'featured', limit: 6, columns: 3 }
    case 'articleList':
      return { title: '', source: 'all', limit: 6 }
    case 'ranking':
      return { title: '', metric: 'overall', limit: 6 }
    case 'downloadList':
      return { title: '', category: 'all', limit: 6 }
    case 'faqList':
      return { title: '', source: 'support', limit: 6 }
    case 'contact':
      return { title: '', desc: '', channel: 'inquiry', showForm: true }
    case 'layout':
      return { columns: 2, gap: 'md', children: [[], []] }
    case 'richText':
      return { html: '' }
    case 'html':
      return { html: '', note: '' }
    case 'embed':
      return { code: '', height: 360, allowScripts: false, videoUrl: '', poster: '' }
    default:
      return {}
  }
}

/**
 * 新建区块（默认值来自前端镜像；后端 `/api/content/blocks/types` 只提供字段元数据，
 * 不含默认值，故此处按契约 §4 给出可用的起步值）。
 */
export function createBlock(type: BlockType): Block {
  return { id: genBlockId(), type, enabled: true, props: defaultProps(type) }
}