/**
 * 接口层 · 素材库与文件上传（后端 /api/admin/uploads 与 /api/admin/media/folders）。
 * ============================================================
 * 契约（gh-server 的 routes/uploadsRouter.ts）：
 *   POST   /api/admin/uploads                上传单文件 → 201 { item }
 *                                            可选 query `folderId` 指定目标文件夹
 *   GET    /api/admin/uploads                素材列表   → { items, total }（支持筛选 / 分页）
 *   PATCH  /api/admin/uploads/:id            更新元数据（{ category?, folderId? }）→ { item }
 *   DELETE /api/admin/uploads/:id            删除素材   → { ok: true }；未命中 404
 *   POST   /api/admin/uploads/move           批量移动（{ ids, folderId }）→ { ok: true }
 *   GET    /api/admin/media/folders          文件夹列表 → { items, total, uncategorized }
 *   POST   /api/admin/media/folders          新建文件夹（{ name, parentId? }）→ { item }（201）
 *   PATCH  /api/admin/media/folders/:id      重命名 / 移动 → { item }；未命中 404
 *   DELETE /api/admin/media/folders/:id      删除文件夹 → { ok: true }；未命中 404
 * 全部需 `Authorization: Bearer <token>`（沿用后台令牌）。
 *
 * 上传形态：**原始字节流**（body 即文件本身，非 FormData），文件名经请求头
 * `X-File-Name`（URL 编码）传入，Content-Type 即文件 MIME。
 * 因通用传输器 `transport` 会对请求体做 JSON 序列化，上传需自行构造 fetch；
 * 其余端点沿用 `transport`（错误统一映射为 ApiError）。
 */
import { ApiError, transport } from './client'
import { getAdminToken } from '../lib/adminAuth'

/** 素材分类键（与后端 mediaStore.MEDIA_CATEGORIES 一致） */
export type MediaCategory = 'image' | 'icon' | 'doc' | 'video' | 'other'

/** 分类键 → 中文标签 */
export const CATEGORY_LABELS: Record<MediaCategory, string> = {
  image: '图片',
  icon: '图标',
  doc: '文档',
  video: '视频',
  other: '其它',
}

/** 分类顺序（供筛选 UI 使用） */
export const MEDIA_CATEGORIES: readonly MediaCategory[] = ['image', 'icon', 'doc', 'video', 'other']

/** 图片尺寸变体（与后端 MediaVariant 逐字一致） */
export type MediaVariant = {
  /** 变体宽度（像素） */
  width: number
  /** 变体公开地址：/uploads/<文件名> */
  url: string
  /** 变体字节数 */
  size: number
  /** 变体 MIME 类型 */
  type: string
}

/** 素材条目（与后端 MediaItem 逐字一致） */
export type UploadItem = {
  /** 稳定标识（磁盘文件名，含扩展名） */
  id: string
  /** 原始文件名（安全化后） */
  name: string
  /** 公开访问地址：/uploads/<文件名> */
  url: string
  /** 字节数 */
  size: number
  /** MIME 类型 */
  type: string
  /** 上传时间（ISO 字符串） */
  uploadedAt: string
  /** 所属文件夹 id；null = 未分类 */
  folderId: string | null
  /** 分类（MIME 自动推导或手工覆盖） */
  category: MediaCategory
  /** 该主图的尺寸变体列表（无变体时为空数组，字段只增不改） */
  variants: MediaVariant[]
}

/** 文件夹条目（与后端 FolderItem 逐字一致） */
export type FolderItem = {
  id: string
  name: string
  parentId: string | null
  sort: number
  createdAt: string
  /** 该文件夹内素材数 */
  fileCount: number
}

/** 素材筛选 / 分页参数（folderId='uncategorized' 表示未分类，省略表示全部） */
export type MediaQuery = {
  folderId?: string
  category?: string
  q?: string
  type?: string
  page?: number
  pageSize?: number
}

/** 后端基址（与 client.ts 的同源 / 分离部署语义保持一致） */
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

/** 依基址构造请求 URL：同源用相对路径，分离部署拼绝对地址 */
function endpoint(path: string): string {
  return API_BASE ? new URL(path, API_BASE).toString() : path
}

/** 非 2xx 响应 → ApiError（优先采用后端 { error } 文案，否则回退状态码文案） */
async function toApiError(res: Response): Promise<ApiError> {
  let message = `请求失败（${res.status}）`
  try {
    const payload = (await res.json()) as { error?: unknown }
    if (typeof payload?.error === 'string' && payload.error.trim()) message = payload.error
  } catch {
    // 响应非 JSON：保留状态码文案
  }
  return new ApiError(message, res.status)
}

/**
 * 上传单个文件：POST /api/admin/uploads（原始字节流）。
 * 成功返回素材条目（含公开地址 url / 归属文件夹 / 分类）。
 * `folderId` 省略表示上传到「未分类」。
 */
export async function uploadFile(file: File, folderId?: string | null): Promise<UploadItem> {
  const token = getAdminToken()
  const headers: Record<string, string> = {
    'X-File-Name': encodeURIComponent(file.name),
    'Content-Type': file.type || 'application/octet-stream',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : ''

  let res: Response
  try {
    res = await fetch(endpoint(`/api/admin/uploads${query}`), { method: 'POST', headers, body: file, credentials: 'include' })
  } catch {
    throw new ApiError('网络连接失败，请稍后重试', 0)
  }
  if (!res.ok) throw await toApiError(res)
  const payload = (await res.json()) as { item: UploadItem }
  return payload.item
}

/**
 * 登记某主图的尺寸变体：POST /api/admin/uploads/:id/variants（整体替换，幂等）。
 * `variants` 为独立上传后的变体条目（{ width, url, size, type }）。
 * 返回更新后的素材条目（含 variants）。
 */
export function registerUploadVariants(
  id: string,
  variants: MediaVariant[],
): Promise<UploadItem> {
  return transport<{ item: UploadItem }>(
    {
      path: `/api/admin/uploads/${encodeURIComponent(id)}/variants`,
      method: 'POST',
      body: { variants },
      token: getAdminToken() ?? undefined,
    },
    () => ({ item: { id, name: '', url: '', size: 0, type: '', uploadedAt: '', folderId: null, category: 'other', variants } }),
  ).then((res) => res.item)
}

/** 素材列表：GET /api/admin/uploads（按上传时间倒序，返回全部，至多 200 条） */
export function listUploads(signal?: AbortSignal): Promise<UploadItem[]> {
  return transport<{ items: UploadItem[]; total: number }>(
    { path: '/api/admin/uploads', signal, token: getAdminToken() ?? undefined },
    () => ({ items: [], total: 0 }),
  ).then((res) => res.items)
}

/** 素材列表（带筛选 / 分页）：GET /api/admin/uploads?folderId=&category=&q=&type=&page= */
export function queryMedia(
  query: MediaQuery,
  signal?: AbortSignal,
): Promise<{ items: UploadItem[]; total: number }> {
  return transport<{ items: UploadItem[]; total: number }>(
    {
      path: '/api/admin/uploads',
      query: {
        folderId: query.folderId,
        category: query.category,
        q: query.q,
        type: query.type,
        page: query.page,
        pageSize: query.pageSize,
      },
      signal,
      token: getAdminToken() ?? undefined,
    },
    () => ({ items: [], total: 0 }),
  )
}

/** 更新素材元数据（分类 / 文件夹）：PATCH /api/admin/uploads/:id */
export function updateUpload(
  id: string,
  patch: { category?: MediaCategory; folderId?: string | null },
): Promise<UploadItem> {
  return transport<{ item: UploadItem }>(
    { path: `/api/admin/uploads/${encodeURIComponent(id)}`, method: 'PATCH', body: patch, token: getAdminToken() ?? undefined },
    () => ({ item: { id, name: '', url: '', size: 0, type: '', uploadedAt: '', folderId: null, category: 'other', variants: [] } }),
  ).then((res) => res.item)
}

/** 批量移动素材到指定文件夹（folderId=null 表示移入「未分类」） */
export function moveUploads(ids: string[], folderId: string | null): Promise<{ ok: boolean }> {
  return transport<{ ok: boolean }>(
    { path: '/api/admin/uploads/move', method: 'POST', body: { ids, folderId }, token: getAdminToken() ?? undefined },
    () => ({ ok: true }),
  )
}

/** 删除素材：DELETE /api/admin/uploads/:id（未命中 → 404） */
export function deleteUpload(id: string): Promise<{ ok: boolean }> {
  return transport<{ ok: boolean }>(
    { path: `/api/admin/uploads/${encodeURIComponent(id)}`, method: 'DELETE', token: getAdminToken() ?? undefined },
    () => ({ ok: true }),
  )
}

/* ---------- 文件夹 ---------- */

/** 文件夹列表：GET /api/admin/media/folders */
export function listFolders(signal?: AbortSignal): Promise<{ items: FolderItem[]; total: number; uncategorized: number }> {
  return transport<{ items: FolderItem[]; total: number; uncategorized: number }>(
    { path: '/api/admin/media/folders', signal, token: getAdminToken() ?? undefined },
    () => ({ items: [], total: 0, uncategorized: 0 }),
  )
}

/** 新建文件夹：POST /api/admin/media/folders */
export function createFolder(name: string, parentId?: string | null): Promise<FolderItem> {
  return transport<{ item: FolderItem }>(
    { path: '/api/admin/media/folders', method: 'POST', body: { name, parentId: parentId ?? null }, token: getAdminToken() ?? undefined },
    () => ({ item: { id: '', name, parentId: null, sort: 0, createdAt: '', fileCount: 0 } }),
  ).then((res) => res.item)
}

/** 重命名 / 移动文件夹：PUT /api/admin/media/folders/:id */
export function updateFolder(id: string, patch: { name?: string; parentId?: string | null }): Promise<FolderItem> {
  return transport<{ item: FolderItem }>(
    { path: `/api/admin/media/folders/${encodeURIComponent(id)}`, method: 'PUT', body: patch, token: getAdminToken() ?? undefined },
    () => ({ item: { id, name: patch.name ?? '', parentId: null, sort: 0, createdAt: '', fileCount: 0 } }),
  ).then((res) => res.item)
}

/** 删除文件夹：DELETE /api/admin/media/folders/:id */
export function deleteFolder(id: string): Promise<{ ok: boolean }> {
  return transport<{ ok: boolean }>(
    { path: `/api/admin/media/folders/${encodeURIComponent(id)}`, method: 'DELETE', token: getAdminToken() ?? undefined },
    () => ({ ok: true }),
  )
}

