/**
 * 接口层 · 后台「模板」栏目（页面区块快照集合）。
 * ============================================================
 * 端点（均需 `Authorization: Bearer <token>`）：
 *   GET    /api/admin/templates        列表 { items, total }
 *   POST   /api/admin/templates        新建（name 必填；可给 pageKey 从页面快照，或直接给 blocks）→ { template }
 *   DELETE /api/admin/templates/:id    删除 → { ok: true }
 *
 * 规范形状：`{ id, name, scope, blockCount, blocks, createdAt }`。
 */
import { ApiError, transport } from './client'
import { getAdminToken } from '../lib/adminAuth'
import type { Block } from '../data/contentTypes'

/** 模板记录（与后端 `templates` 集合形状一致） */
export type TemplateItem = {
  id: string
  name: string
  scope: string
  blockCount: number
  blocks: Block[]
  createdAt: string
}

export type TemplateList = { items: TemplateItem[]; total: number }

export type CreateTemplateBody = {
  name: string
  scope?: string
  /** 从某个页面的区块生成快照（优先级高于 blocks） */
  pageKey?: string
  /** 直接提供区块快照 */
  blocks?: Block[]
}

function adminToken(): string | undefined {
  return getAdminToken() ?? undefined
}

/** 模板列表：GET /api/admin/templates */
export function fetchTemplates(signal?: AbortSignal): Promise<TemplateList> {
  return transport<TemplateList>(
    { path: '/api/admin/templates', signal, token: adminToken() },
    () => ({ items: [], total: 0 }),
  )
}

/** 新建模板：POST /api/admin/templates */
export function createTemplate(body: CreateTemplateBody): Promise<TemplateItem> {
  return transport<{ template: TemplateItem }>(
    { path: '/api/admin/templates', method: 'POST', body, token: adminToken() },
    () => {
      throw new ApiError('新建模板接口不可用', 503)
    },
  ).then((res) => res.template)
}

/** 删除模板：DELETE /api/admin/templates/:id */
export function deleteTemplate(id: string): Promise<{ ok: boolean }> {
  return transport<{ ok: boolean }>(
    { path: `/api/admin/templates/${encodeURIComponent(id)}`, method: 'DELETE', token: adminToken() },
    () => ({ ok: true }),
  )
}
