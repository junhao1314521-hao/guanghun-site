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
import { prepareImageForUpload } from '../lib/compressImage'

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

/** 业务类型（与后端 mediaStore.MEDIA_KINDS 一致） */
export type MediaKind = 'image' | 'video' | 'model3d' | 'document' | 'firmware' | 'installer' | 'archive' | 'other'

/** 使用场景（与后端 mediaStore.MediaUsage 一致） */
export type MediaUsage = 'download' | 'product' | 'brand' | 'page' | 'other'

export const MEDIA_KINDS: readonly MediaKind[] = [
  'image',
  'video',
  'model3d',
  'document',
  'firmware',
  'installer',
  'archive',
  'other',
]

export const KIND_LABELS: Record<MediaKind, string> = {
  image: '图片',
  video: '视频',
  model3d: '3D 模型',
  document: '文档',
  firmware: '固件',
  installer: '安装包',
  archive: '压缩包',
  other: '其它',
}

export const USAGE_LABELS: Record<MediaUsage, string> = {
  download: '下载中心',
  product: '产品',
  brand: '品牌资料',
  page: '页面',
  other: '其它',
}

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
  /** 业务类型（固件 / 安装包 / 3D 模型等） */
  kind?: MediaKind
  /** 使用场景（下载中心 / 产品 / 品牌资料等） */
  usage?: MediaUsage
  /** 服务端统计的字节数 */
  sizeBytes?: number
  /** 服务端计算的 SHA-256 */
  sha256?: string
  /** 可见性 / 状态 */
  visibility?: string
  status?: string
  /** 该主图的尺寸变体列表（无变体时为空数组，字段只增不改） */
  variants: MediaVariant[]
  /** 被多少处页面 / 草稿 / 站点配置 / 集合记录引用（列表接口下发；旧接口可能缺省） */
  refCount?: number
  /** 上传响应附加：同文件夹已有同内容文件，本次已复用（不重复占磁盘） */
  reused?: boolean
  /** 上传响应附加：复用的已有文件名 */
  duplicateOf?: string
  /** 上传响应附加：其他文件夹存在同内容文件（仅提示，不阻断） */
  duplicates?: Array<{ id: string; name: string; url: string }>
}

/** 一条素材引用位置（`to` 为后台可跳转地址，如装修器 / 记录编辑页） */
export type UploadReference = { location: string; href: string; to?: string }

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
  kind?: string
  usage?: string
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

/** 上传接口响应（含 P2 去重附加字段） */
type UploadResponsePayload = {
  item?: UploadItem
  error?: string
  reused?: boolean
  duplicateOf?: string
  duplicates?: Array<{ id: string; name: string; url: string }>
}

/** 以原始字节流 POST 文件（XHR：只有它能拿到上传进度）；返回素材条目或抛 ApiError */
function postFile(
  path: string,
  file: File,
  onProgress?: (percent: number) => void,
  extraHeaders?: Record<string, string>,
): Promise<UploadItem> {
  const token = getAdminToken()
  return new Promise<UploadItem>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', endpoint(path))
    xhr.withCredentials = true
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name))
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    if (extraHeaders) {
      for (const [key, value] of Object.entries(extraHeaders)) xhr.setRequestHeader(key, value)
    }
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onload = () => {
      let payload: UploadResponsePayload | null = null
      try {
        payload = JSON.parse(xhr.responseText) as UploadResponsePayload
      } catch {
        payload = null
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload?.item) {
        resolve({
          ...payload.item,
          ...(payload.reused ? { reused: true } : {}),
          ...(payload.duplicateOf ? { duplicateOf: payload.duplicateOf } : {}),
          ...(payload.duplicates && payload.duplicates.length > 0 ? { duplicates: payload.duplicates } : {}),
        })
        return
      }
      reject(new ApiError(payload?.error || `上传失败（HTTP ${xhr.status}）`, xhr.status))
    }
    xhr.onerror = () => reject(new ApiError('网络连接失败，请稍后重试', 0))
    xhr.onabort = () => reject(new ApiError('上传已取消', 0))
    xhr.send(file)
  })
}

/* ============================================================
   大文件分片上传（P2）
   ============================================================ */

/** 超过该阈值改走分片上传（5MB 分片 × 2 片） */
const CHUNK_THRESHOLD = 8 * 1024 * 1024
/** 断点续传记录前缀：key 含文件名 / 大小 / 修改时间，避免串到别的文件 */
const CHUNK_STORAGE_PREFIX = 'gh-upload-chunk:'

type ChunkInit = { uploadId: string; chunkSize: number; totalChunks: number; received: number[] }
type ChunkStatus = ChunkInit & { name: string; size: number; complete: boolean }

/** 读取本地续传任务（隐私模式下失败返回 null） */
function readChunkTask(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/** 写入 / 清理本地续传任务 */
function writeChunkTask(key: string, uploadId: string | null): void {
  try {
    if (uploadId) window.localStorage.setItem(key, uploadId)
    else window.localStorage.removeItem(key)
  } catch {
    // 忽略：断点续传是增强能力，不能阻断上传
  }
}

/** PUT 单个分片（XHR：可上报片内进度） */
function putChunk(uploadId: string, index: number, blob: Blob, onProgress?: (loaded: number) => void): Promise<void> {
  const token = getAdminToken()
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', endpoint(`/api/admin/uploads/chunks/${uploadId}/${index}`))
    xhr.withCredentials = true
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      let message = `上传分片失败（HTTP ${xhr.status}）`
      try {
        message = (JSON.parse(xhr.responseText) as { error?: string }).error || message
      } catch {
        // 保留默认文案
      }
      reject(new ApiError(message, xhr.status))
    }
    xhr.onerror = () => reject(new ApiError('网络连接失败，请稍后重试', 0))
    xhr.onabort = () => reject(new ApiError('上传已取消', 0))
    xhr.send(blob)
  })
}

/**
 * 分片上传（含断点续传）：初始化 → 逐片上传 → 合并。
 * 进度按已发送字节 / 总字节计算；中断后重试会读取服务端已收到的分片继续。
 */
async function uploadFileChunked(
  file: File,
  folderId: string | null | undefined,
  onProgress?: (percent: number) => void,
): Promise<UploadItem> {
  const taskKey = `${CHUNK_STORAGE_PREFIX}${file.name}:${file.size}:${file.lastModified}`
  let status: ChunkStatus | null = null

  const savedId = readChunkTask(taskKey)
  if (savedId) {
    try {
      const res = await transport<ChunkStatus>(
        { path: `/api/admin/uploads/chunks/${savedId}`, token: getAdminToken() ?? undefined },
        () => {
          throw new ApiError('分片任务已失效', 404)
        },
      )
      if (res.size === file.size) status = res
      else writeChunkTask(taskKey, null)
    } catch {
      writeChunkTask(taskKey, null)
    }
  }

  if (!status) {
    const init = await transport<ChunkInit>(
      {
        path: '/api/admin/uploads/chunks',
        method: 'POST',
        body: { name: file.name, size: file.size, mime: file.type || undefined, folderId: folderId ?? null },
        token: getAdminToken() ?? undefined,
      },
      () => {
        throw new ApiError('无法初始化分片上传', 0)
      },
    )
    writeChunkTask(taskKey, init.uploadId)
    status = { ...init, name: file.name, size: file.size, complete: false }
  }

  const totalChunks = status.totalChunks
  const chunkSize = status.chunkSize
  const received = new Set(status.received)
  let sent = 0
  for (let index = 0; index < totalChunks; index += 1) {
    if (received.has(index)) {
      sent += Math.min(chunkSize, file.size - index * chunkSize)
    }
  }
  onProgress?.(Math.round((sent / file.size) * 100))

  for (let index = 0; index < totalChunks; index += 1) {
    if (received.has(index)) continue
    const start = index * chunkSize
    const end = Math.min(file.size, start + chunkSize)
    const blob = file.slice(start, end)
    await putChunk(status.uploadId, index, blob, (loaded) => {
      onProgress?.(Math.min(99, Math.round(((sent + loaded) / file.size) * 100)))
    })
    sent += blob.size
    onProgress?.(Math.round((sent / file.size) * 100))
  }

  const res = await transport<{
    item: UploadItem
    reused?: boolean
    duplicateOf?: string
    duplicates?: Array<{ id: string; name: string; url: string }>
  }>(
    {
      path: `/api/admin/uploads/chunks/${status.uploadId}/complete`,
      method: 'POST',
      token: getAdminToken() ?? undefined,
    },
    () => {
      throw new ApiError('合并分片失败，请稍后重试', 0)
    },
  )
  writeChunkTask(taskKey, null)
  return {
    ...res.item,
    ...(res.reused ? { reused: true } : {}),
    ...(res.duplicateOf ? { duplicateOf: res.duplicateOf } : {}),
    ...(res.duplicates && res.duplicates.length > 0 ? { duplicates: res.duplicates } : {}),
  }
}

/**
 * 上传单个文件：POST /api/admin/uploads（原始字节流）。
 * 成功返回素材条目（含公开地址 url / 归属文件夹 / 分类）。
 * `folderId` 省略表示上传到「未分类」。
 * `onProgress` 回调上传百分比（0–100），用于大文件进度显示。
 * `options.keepOriginal` 为 true 时不做前端压缩、绕过分片并带 `X-Keep-Original` 头，
 * 供壁纸等需要保留原始画质的场景使用（服务端仍会放宽到图片上限内接收）。
 */
export async function uploadFile(
  file: File,
  folderId?: string | null,
  onProgress?: (percent: number) => void,
  options?: { keepOriginal?: boolean },
): Promise<UploadItem> {
  const keepOriginal = options?.keepOriginal === true
  // 静态位图先在浏览器里缩放转码；失败/非位图/保留原图时原样返回
  const prepared = keepOriginal ? file : await prepareImageForUpload(file)
  const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : ''
  // 保留原图的场景通常是大尺寸壁纸：走单请求，避免分片链路丢掉「保留原图」语义
  if (keepOriginal) {
    return postFile(`/api/admin/uploads${query}`, prepared, onProgress, { 'X-Keep-Original': '1' })
  }
  // 大文件走分片（可续传）；小文件保持单请求，避免为 1KB 图片创建分片任务
  if (prepared.size > CHUNK_THRESHOLD) return uploadFileChunked(prepared, folderId, onProgress)
  return postFile(`/api/admin/uploads${query}`, prepared, onProgress)
}

/**
 * 原地替换素材文件：POST /api/admin/uploads/:id/replace。
 * **文件名与公开地址保持不变**，所有引用位置自动生效；新文件扩展名须与原文件一致。
 */
export function replaceUpload(id: string, file: File, onProgress?: (percent: number) => void): Promise<UploadItem> {
  return postFile(`/api/admin/uploads/${encodeURIComponent(id)}/replace`, file, onProgress)
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
        kind: query.kind,
        usage: query.usage,
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

/** 素材引用明细：GET /api/admin/uploads/:id/references（删除前二次确认用） */
export function fetchUploadReferences(
  id: string,
  signal?: AbortSignal,
): Promise<{ url: string; count: number; refs: UploadReference[] }> {
  return transport<{ url: string; count: number; refs: UploadReference[] }>(
    { path: `/api/admin/uploads/${encodeURIComponent(id)}/references`, signal, token: getAdminToken() ?? undefined },
    () => ({ url: '', count: 0, refs: [] }),
  )
}

/**
 * 删除素材：DELETE /api/admin/uploads/:id（未命中 → 404）。
 * 仍被引用时后端返回 409，必须先解除引用（不提供强制删除）。
 */
export function deleteUpload(id: string): Promise<{ ok: boolean }> {
  return transport<{ ok: boolean }>(
    {
      path: `/api/admin/uploads/${encodeURIComponent(id)}`,
      method: 'DELETE',
      token: getAdminToken() ?? undefined,
    },
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

