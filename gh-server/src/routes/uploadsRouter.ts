import express, { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express'
import { deleteUpload, listUploads, saveUpload } from '../data/uploadStore'
import {
  createFolder,
  deleteFolder,
  folderExists,
  isMediaCategory,
  listFolders,
  listMedia,
  MEDIA_CATEGORIES,
  mediaItem,
  moveFiles,
  setFileCategory,
  setFileFolder,
  setVariants,
  updateFolder,
  variantFileIds,
  type MediaCategory,
} from '../data/mediaStore'
import { hiddenUploadIds, softDeleteUpload } from '../data/trashStore'
import { readParam, requireSession } from '../middleware/adminAuth'
import { requireScope } from '../middleware/rbac'
import { auditWrite } from '../middleware/audit'

/**
 * 后台文件上传 / 素材库端点（挂载于 /api/admin，均需 Bearer 会话 + `content` 权限）。
 *
 * 无依赖方案（Express 5 不自带 multipart）：客户端以**原始字节流**上传，
 * 文件名经请求头 `X-File-Name`（URL 编码）或 query `name` 传入，Content-Type 即文件 MIME。
 *
 * 契约：
 *   POST   /admin/uploads            上传单文件 → { item: MediaItem }
 *                                    可选 query/头 `folderId`（或 `X-Folder-Id`）指定目标文件夹
 *                                    超限 413 / 空文件 400 / 扩展名或类型不允许 415 / 缺文件名 400
 *   POST   /admin/uploads/:id/variants  登记主图的尺寸变体（{ variants }）→ { item }；未命中 404
 *   GET    /admin/uploads            素材列表 → { items, total }
 *                                    query: folderId（id | 'uncategorized' | 'all'）/ category / q / type / page / pageSize
 *   PATCH  /admin/uploads/:id        更新素材元数据（{ category?, folderId? }）→ { item }；未命中 404
 *   DELETE /admin/uploads/:id        删除素材（**软删除**：写入回收站、磁盘文件保留）→ { ok: true }；未命中 404
 *   POST   /admin/uploads/move       批量移动（{ ids, folderId }）→ { ok: true }
 *   GET    /admin/media/folders      文件夹列表 → { items, total, uncategorized }
 *   POST   /admin/media/folders      新建文件夹（{ name, parentId? }）→ { item }（201）
 *   PATCH/PUT /admin/media/folders/:id  重命名 / 移动（{ name?, parentId? }）→ { item }；未命中 404
 *   DELETE /admin/media/folders/:id  删除文件夹（非空 → 文件移入「未分类」）→ { ok: true }；未命中 404
 */
export const uploadsRouter = Router()

/** 按需构造的原始字节流解析器缓存（key = limit），使 UPLOAD_MAX_SIZE 可在请求期动态生效 */
const rawParsers = new Map<string, RequestHandler>()

/** 解析原始字节流：/* 通配接收，大小上限默认 50MB（UPLOAD_MAX_SIZE 可覆盖），超限由下方错误处理转 413 */
function rawBody(req: Request, res: Response, next: NextFunction): void {
  const limit = process.env.UPLOAD_MAX_SIZE ?? '50mb'
  let parser = rawParsers.get(limit)
  if (!parser) {
    parser = express.raw({ type: '*/*', limit })
    rawParsers.set(limit, parser)
  }
  parser(req, res, next)
}

/** 解析上传文件名：优先 X-File-Name 头（URL 编码），回退 query `name`；缺失返回空串 */
function readFileName(req: Request): string {
  const header = req.headers['x-file-name']
  const rawHeader = Array.isArray(header) ? header[0] : header
  const raw = rawHeader ?? (typeof req.query.name === 'string' ? req.query.name : '')
  if (!raw) return ''
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** 解析单个查询参数为字符串（非字符串 / 缺失返回空串） */
function queryString(req: Request, key: string): string {
  const value = req.query[key]
  return typeof value === 'string' ? value : ''
}

/** 当前会话操作者（后台用户名）；未登录记为 anonymous */
function actorOf(res: Response): string {
  const user = res.locals.adminUser as { username?: string } | undefined
  return user?.username ?? 'anonymous'
}

/**
 * 归一化文件夹参数为「未分类 / 具体 id / 未提供」三态：
 * - 空串、'uncategorized'、'null' → null（未分类）；
 * - 其余 → 文件夹 id。
 */
function normalizeFolderId(raw: string): string | null {
  const value = raw.trim()
  if (!value || value === 'uncategorized' || value === 'null') return null
  return value
}

/** 提取上传请求的目标文件夹（query `folderId` 优先，回退 `X-Folder-Id` 头） */
function uploadTargetFolder(req: Request): string | null | undefined {
  const header = req.headers['x-folder-id']
  const rawHeader = Array.isArray(header) ? header[0] : header
  const raw = queryString(req, 'folderId') || rawHeader || ''
  if (!raw) return undefined
  return normalizeFolderId(raw)
}

uploadsRouter.post('/uploads', requireSession, requireScope('content'), auditWrite('upload', (req) => readFileName(req) || 'upload'), rawBody, (req, res) => {
  const name = readFileName(req)
  if (!name) {
    res.status(400).json({ error: '缺少文件名（请通过 X-File-Name 头或 name 查询参数传入）' })
    return
  }
  const body = req.body
  if (!Buffer.isBuffer(body) || body.length === 0) {
    res.status(400).json({ error: '文件内容为空' })
    return
  }
  const result = saveUpload(body, name, req.headers['content-type'])
  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return
  }
  const folderId = uploadTargetFolder(req)
  if (folderId && !folderExists(folderId)) {
    // 目标文件夹不存在：回滚落盘，保持「不产生脏文件」
    deleteUpload(result.item.id)
    res.status(400).json({ error: '目标文件夹不存在' })
    return
  }
  if (folderId) setFileFolder(result.item.id, folderId)
  res.status(201).json({ item: mediaItem(result.item) })
})

uploadsRouter.post('/uploads/:id/variants', requireSession, requireScope('content'), auditWrite('register-variants', (req) => readParam(req, 'id')), (req, res) => {
  const id = readParam(req, 'id')
  const item = listUploads().find((entry) => entry.id === id)
  if (!item) {
    res.status(404).json({ error: '未找到该素材' })
    return
  }
  const body = (req.body ?? {}) as { variants?: unknown }
  if (!Array.isArray(body.variants)) {
    res.status(400).json({ error: '缺少变体清单（variants 数组）' })
    return
  }
  // 整体替换：天然幂等，重复登记以最后一次为准
  setVariants(id, body.variants)
  res.json({ item: mediaItem(item) })
})

uploadsRouter.post('/uploads/move', requireSession, requireScope('content'), auditWrite('move-upload', (req) => {
  const body = (req.body ?? {}) as { ids?: unknown; folderId?: unknown }
  const count = Array.isArray(body.ids) ? body.ids.length : 0
  const target = typeof body.folderId === 'string' && body.folderId ? body.folderId : '未分类'
  return `${count} 个 → ${target}`
}), (req, res) => {
  const body = (req.body ?? {}) as { ids?: unknown; folderId?: unknown }
  const ids = Array.isArray(body.ids) ? body.ids.filter((value): value is string => typeof value === 'string' && value.length > 0) : []
  if (ids.length === 0) {
    res.status(400).json({ error: '缺少待移动的素材 id 列表（ids）' })
    return
  }
  const rawFolder = typeof body.folderId === 'string' ? body.folderId : ''
  const folderId = body.folderId === null || body.folderId === undefined ? null : normalizeFolderId(rawFolder)
  if (folderId && !folderExists(folderId)) {
    res.status(400).json({ error: '目标文件夹不存在' })
    return
  }
  moveFiles(ids, folderId)
  res.json({ ok: true })
})

uploadsRouter.get('/uploads', requireSession, requireScope('content'), (req, res) => {
  const page = Number(queryString(req, 'page'))
  const pageSize = Number(queryString(req, 'pageSize'))
  const result = listMedia({
    folderId: queryString(req, 'folderId') || undefined,
    category: queryString(req, 'category') || undefined,
    q: queryString(req, 'q') || undefined,
    type: queryString(req, 'type') || undefined,
    page: Number.isFinite(page) ? page : undefined,
    pageSize: Number.isFinite(pageSize) ? pageSize : undefined,
  })
  res.json({ items: result.items, total: result.total })
})

uploadsRouter.patch('/uploads/:id', requireSession, requireScope('content'), auditWrite('update-upload', (req) => readParam(req, 'id')), (req, res) => {
  const id = readParam(req, 'id')
  if (!listUploads().some((item) => item.id === id)) {
    res.status(404).json({ error: '未找到该素材' })
    return
  }
  const body = (req.body ?? {}) as { category?: unknown; folderId?: unknown }
  if (body.category !== undefined) {
    if (typeof body.category !== 'string' || !isMediaCategory(body.category)) {
      res.status(400).json({ error: `分类不合法（可选：${MEDIA_CATEGORIES.join(' / ')}）` })
      return
    }
    setFileCategory(id, body.category as MediaCategory)
  }
  if (body.folderId !== undefined) {
    const rawFolder = typeof body.folderId === 'string' ? body.folderId : ''
    const folderId = body.folderId === null ? null : normalizeFolderId(rawFolder)
    if (folderId && !folderExists(folderId)) {
      res.status(400).json({ error: '目标文件夹不存在' })
      return
    }
    setFileFolder(id, folderId)
  }
  const item = listUploads().find((entry) => entry.id === id)
  res.json({ item: item ? mediaItem(item) : null })
})

uploadsRouter.delete('/uploads/:id', requireSession, requireScope('content'), auditWrite('delete-upload', (req) => readParam(req, 'id')), (req, res) => {
  const id = readParam(req, 'id')
  const item = listUploads().find((entry) => entry.id === id)
  // 已软删除（回收站中）的素材不再视为可删除对象
  if (!item || hiddenUploadIds().has(id)) {
    res.status(404).json({ error: '未找到该素材' })
    return
  }
  // 软删除：把主图元数据（含变体清单）写入回收站（key='uploads'），**磁盘文件保留**（含变体文件）；
  // 素材列表 / 文件夹计数 / 前台随即不可见；彻底删除时才清磁盘文件与元数据。
  softDeleteUpload({ item: mediaItem(item), variantFileIds: variantFileIds(id) }, actorOf(res))
  res.json({ ok: true })
})

/* ---------- 文件夹 ---------- */

/** 校验并归一化文件夹名（1–60 字符，去除首尾空白） */
function normalizeFolderName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const name = raw.trim()
  if (!name || name.length > 60) return null
  return name
}

/** 解析可选的父文件夹参数：缺失返回 undefined；null/空 → null；否则返回 id 字符串 */
function parseParentId(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined
  if (raw === null) return null
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  return value ? value : null
}

uploadsRouter.get('/media/folders', requireSession, requireScope('content'), (_req, res) => {
  const result = listFolders()
  res.json({ items: result.items, total: result.total, uncategorized: result.uncategorized })
})

uploadsRouter.post('/media/folders', requireSession, requireScope('content'), auditWrite('create-folder', (req) => {
  const name = normalizeFolderName((req.body ?? {}).name)
  return name ?? 'folder'
}), (req, res) => {
  const body = (req.body ?? {}) as { name?: unknown; parentId?: unknown }
  const name = normalizeFolderName(body.name)
  if (!name) {
    res.status(400).json({ error: '文件夹名不合法（1–60 字符，不能为空）' })
    return
  }
  const parentId = parseParentId(body.parentId)
  if (parentId && !folderExists(parentId)) {
    res.status(400).json({ error: '父文件夹不存在' })
    return
  }
  res.status(201).json({ item: createFolder(name, parentId ?? null) })
})

/** 重命名 / 移动（PATCH 与 PUT 等价） */
const updateFolderHandler = (req: Request, res: Response) => {
  const id = readParam(req, 'id')
  const body = (req.body ?? {}) as { name?: unknown; parentId?: unknown }
  const patch: { name?: string; parentId?: string | null } = {}
  if (body.name !== undefined) {
    const name = normalizeFolderName(body.name)
    if (!name) {
      res.status(400).json({ error: '文件夹名不合法（1–60 字符，不能为空）' })
      return
    }
    patch.name = name
  }
  const parentId = parseParentId(body.parentId)
  if (parentId !== undefined) {
    if (parentId && !folderExists(parentId)) {
      res.status(400).json({ error: '父文件夹不存在' })
      return
    }
    patch.parentId = parentId
  }
  const result = updateFolder(id, patch)
  if (result === 'cycle') {
    res.status(400).json({ error: '不能把文件夹移动到其自身或子孙下' })
    return
  }
  if (!result) {
    res.status(404).json({ error: '未找到该文件夹' })
    return
  }
  res.json({ item: result })
}

uploadsRouter.patch('/media/folders/:id', requireSession, requireScope('content'), auditWrite('rename-folder', (req) => readParam(req, 'id')), updateFolderHandler)
uploadsRouter.put('/media/folders/:id', requireSession, requireScope('content'), auditWrite('rename-folder', (req) => readParam(req, 'id')), updateFolderHandler)

uploadsRouter.delete('/media/folders/:id', requireSession, requireScope('content'), auditWrite('delete-folder', (req) => readParam(req, 'id')), (req, res) => {
  if (!deleteFolder(readParam(req, 'id'))) {
    res.status(404).json({ error: '未找到该文件夹' })
    return
  }
  res.json({ ok: true })
})

/**
 * 路由级错误处理：仅约束本路由，避免影响既有端点。
 * - 请求体超限（body-parser entity.too.large）→ 413；
 * - 其余请求体解析失败 → 400。
 */
uploadsRouter.use((err: Error & { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
  if (err.type === 'entity.too.large') {
    res.status(413).json({ error: '文件超过大小限制' })
    return
  }
  const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 400
  res.status(status).json({ error: '请求体解析失败' })
})
