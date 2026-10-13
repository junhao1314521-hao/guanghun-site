/**
 * 回收站（真软删除）。
 * ============================================================
 * 内容类资源的删除改为**软删除**：删除时把原记录写入 `trash` 表
 * （`id, key, record_id, data, deleted_at, deleted_by`），再从原存储移除 / 隐藏，前台不再返回。
 *
 * 覆盖范围（完整回收站）：
 * - 结构化集合（11 个，`collectionStore.COLLECTION_KEYS`，含 templates）；
 * - 其余后台资源栏目（`admin_resources`：product-categories / test-records / methods / taxonomy /
 *   nav / customers / devices / service-info / notifications / staff / languages / integrations 等）；
 * - 内容库页面（`key = 'pages'`，专用端点 `DELETE /api/admin/pages/:key`，**内置页面仍禁删**）：
 *   记录存整页数据（key / path / title / blocks …），恢复时按原 key 写回 `content_pages`；
 * - 素材库文件（`key = 'uploads'`，专用端点 `DELETE /api/admin/uploads/:id`）：
 *   记录存主图元数据（含分类 / 文件夹 / 变体清单）与变体文件 id；**磁盘文件保留**直至彻底删除，
 *   软删除期间素材列表 / 文件夹计数 / 前台均不可见（元数据过滤 + 静态直链拦截）。
 *
 * 恢复策略：若原记录标识已被占用 → 拒绝恢复（`conflict`），不覆盖既有记录；由调用方返回 409。
 * 彻底删除策略：移除回收站条目；素材类型额外删除其磁盘文件（主图 + 全部变体）。
 */
import { getDb, runInTransaction } from './db'
import { isCollectionKey } from './collectionStore'
import { invalidateResourceCache } from './adminResourceStore'
import { deleteUpload } from './uploadStore'

/** 回收站条目类型（供列表按类型展示） */
export type TrashType = 'collection' | 'resource' | 'page' | 'upload'

/** 回收站条目（对外形状） */
export type TrashItem = {
  /** 回收站条目 id */
  id: string
  /** 原栏目 key（集合 key / 后台资源 key / 'pages' / 'uploads'） */
  key: string
  /** 条目类型：集合 / 后台资源 / 页面 / 素材 */
  type: TrashType
  /** 原记录 id（页面为页面 key；素材为磁盘文件名） */
  recordId: string
  /** 记录显示名（取 name / title / model / q 等，缺失回退 recordId） */
  name: string
  /** 删除时间（ISO 8601） */
  deletedAt: string
  /** 删除人（后台用户名） */
  deletedBy: string
}

/** 恢复结果：ok / conflict（原 id 被占用）/ missing（回收站无此条目） */
export type RestoreResult =
  | { status: 'ok'; key: string; recordId: string }
  | { status: 'conflict'; key: string; recordId: string }
  | { status: 'missing' }

/** 素材软删除写入回收站的快照：主图元数据（含变体清单）+ 变体文件 id */
export type UploadTrashRecord = {
  /** 主图对外形状（含 folderId / category / variants） */
  item: {
    id: string
    name: string
    url: string
    size: number
    type: string
    uploadedAt: string
    folderId: string | null
    category: string
    variants: Array<{ width: number; url: string; size: number; type: string }>
  }
  /** 变体文件 id 清单（用于彻底删除时清理磁盘文件、软删除时隐藏） */
  variantFileIds: string[]
}

/** 条目类型判定：页面 / 素材为专用 key，其余按是否集合区分 */
function typeOf(key: string): TrashType {
  if (key === 'pages') return 'page'
  if (key === 'uploads') return 'upload'
  return isCollectionKey(key) ? 'collection' : 'resource'
}

/** 取原存储表名（集合 → collections；其余 → admin_resources） */
function tableOf(key: string): 'collections' | 'admin_resources' {
  return isCollectionKey(key) ? 'collections' : 'admin_resources'
}

/** 从记录 JSON 中取一个可读名称（用于列表展示） */
function nameOf(dataJson: string, fallback: string): string {
  try {
    const data = JSON.parse(dataJson) as Record<string, unknown>
    for (const field of ['name', 'title', 'model', 'q', 'question', 'label', 'account', 'city', 'id']) {
      const value = data[field]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
  } catch {
    // 数据损坏时回退 recordId
  }
  return fallback
}

/** 素材条目显示名：取快照 `item.name`，缺失回退文件 id */
function uploadNameOf(dataJson: string, fallback: string): string {
  try {
    const data = JSON.parse(dataJson) as { item?: { name?: unknown } }
    const name = data.item?.name
    if (typeof name === 'string' && name.trim()) return name.trim()
  } catch {
    // 数据损坏时回退 recordId
  }
  return fallback
}

/** 生成稳定且可读的新 id */
let seq = 0
function newId(): string {
  seq += 1
  return `trash-${Date.now().toString(36)}-${seq.toString(36)}`
}

/* ============================================================
   软删除（写入回收站 + 从原存储移除 / 隐藏）
   ============================================================ */

/**
 * 软删除集合 / 后台资源记录：把记录写入回收站并从事物表移除（单事务）。未命中返回 false。
 */
export function softDelete(key: string, recordId: string, deletedBy: string): boolean {
  const db = getDb()
  const table = tableOf(key)
  const row = db.prepare(`SELECT data FROM ${table} WHERE key = ? AND id = ?`).get(key, recordId) as
    | { data: string }
    | undefined
  if (!row) return false
  const id = newId()
  const deletedAt = new Date().toISOString()
  runInTransaction((tx) => {
    tx.prepare(
      'INSERT INTO trash(id, key, record_id, data, deleted_at, deleted_by) VALUES(?, ?, ?, ?, ?, ?)',
    ).run(id, key, recordId, row.data, deletedAt, deletedBy)
    tx.prepare(`DELETE FROM ${table} WHERE key = ? AND id = ?`).run(key, recordId)
  })
  if (table === 'admin_resources') invalidateResourceCache()
  return true
}

/**
 * 软删除内容库页面：把整页数据写入回收站并从 `content_pages` 移除（单事务）。未命中返回 false。
 * 录库前由路由保证「内置页面禁删」。
 */
export function softDeletePage(key: string, deletedBy: string): boolean {
  const db = getDb()
  const row = db.prepare('SELECT data FROM content_pages WHERE key = ?').get(key) as { data: string } | undefined
  if (!row) return false
  const id = newId()
  const deletedAt = new Date().toISOString()
  runInTransaction((tx) => {
    tx.prepare(
      'INSERT INTO trash(id, key, record_id, data, deleted_at, deleted_by) VALUES(?, ?, ?, ?, ?, ?)',
    ).run(id, 'pages', key, row.data, deletedAt, deletedBy)
    tx.prepare('DELETE FROM content_pages WHERE key = ?').run(key)
  })
  return true
}

/**
 * 软删除素材：把主图元数据（含变体清单）写入回收站，并移除其 `upload_meta` / `upload_variants`
 * 元数据（单事务）；**磁盘文件保留**，软删除期间由 `hiddenUploadIds` 过滤 + 静态拦截保证不可见。
 */
export function softDeleteUpload(record: UploadTrashRecord, deletedBy: string): boolean {
  const id = record.item.id
  const trashId = newId()
  const deletedAt = new Date().toISOString()
  runInTransaction((tx) => {
    tx.prepare(
      'INSERT INTO trash(id, key, record_id, data, deleted_at, deleted_by) VALUES(?, ?, ?, ?, ?, ?)',
    ).run(trashId, 'uploads', id, JSON.stringify(record), deletedAt, deletedBy)
    tx.prepare('DELETE FROM upload_meta WHERE id = ?').run(id)
    tx.prepare('DELETE FROM upload_variants WHERE main_id = ?').run(id)
  })
  return true
}

/** 当前被软删除（回收站中）的素材文件 id 集合：主图 id + 全部变体文件 id */
export function hiddenUploadIds(): Set<string> {
  const rows = getDb().prepare("SELECT record_id, data FROM trash WHERE key = 'uploads'").all() as Array<{
    record_id: string
    data: string
  }>
  const ids = new Set<string>()
  for (const row of rows) {
    ids.add(row.record_id)
    try {
      const data = JSON.parse(row.data) as { variantFileIds?: unknown }
      if (Array.isArray(data.variantFileIds)) {
        for (const value of data.variantFileIds) if (typeof value === 'string') ids.add(value)
      }
    } catch {
      // 数据损坏时至少隐藏主图
    }
  }
  return ids
}

/* ============================================================
   列表 / 恢复 / 彻底删除
   ============================================================ */

/** 列出回收站条目（按删除时间倒序，最新在前） */
export function listTrash(): { items: TrashItem[]; total: number } {
  const rows = getDb()
    .prepare('SELECT id, key, record_id, data, deleted_at, deleted_by FROM trash ORDER BY deleted_at DESC, rowid DESC')
    .all() as Array<{
    id: string
    key: string
    record_id: string
    data: string
    deleted_at: string
    deleted_by: string | null
  }>
  const items = rows.map((row) => ({
    id: row.id,
    key: row.key,
    type: typeOf(row.key),
    recordId: row.record_id,
    name: row.key === 'uploads' ? uploadNameOf(row.data, row.record_id) : nameOf(row.data, row.record_id),
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by ?? '',
  }))
  return { items, total: items.length }
}

/** 取单条回收站记录（含原始数据），供恢复 / 审计使用 */
export function getTrashRecord(id: string): { key: string; recordId: string; data: string } | undefined {
  const row = getDb().prepare('SELECT key, record_id, data FROM trash WHERE id = ?').get(id) as
    | { key: string; record_id: string; data: string }
    | undefined
  return row ? { key: row.key, recordId: row.record_id, data: row.data } : undefined
}

/** 恢复内容库页面：原 key 未被占用则写回 `content_pages` */
function restorePage(trashId: string, recordId: string, data: string): RestoreResult {
  const db = getDb()
  if (db.prepare('SELECT 1 AS x FROM content_pages WHERE key = ?').get(recordId)) {
    return { status: 'conflict', key: 'pages', recordId }
  }
  let updatedAt: string | null = null
  try {
    const parsed = JSON.parse(data) as { updatedAt?: unknown }
    if (typeof parsed.updatedAt === 'string') updatedAt = parsed.updatedAt
  } catch {
    // 数据损坏时 updated_at 置空，不影响页面可用性
  }
  runInTransaction((tx) => {
    tx.prepare('INSERT INTO content_pages(key, data, updated_at) VALUES(?, ?, ?)').run(recordId, data, updatedAt)
    tx.prepare('DELETE FROM trash WHERE id = ?').run(trashId)
  })
  return { status: 'ok', key: 'pages', recordId }
}

/** 恢复素材：写回 `upload_meta` 与 `upload_variants`（磁盘文件保留，不重新复制） */
function restoreUpload(trashId: string, recordId: string, data: string): RestoreResult {
  let snapshot: UploadTrashRecord
  try {
    snapshot = JSON.parse(data) as UploadTrashRecord
  } catch {
    return { status: 'missing' }
  }
  const item = snapshot.item
  const now = new Date().toISOString()
  runInTransaction((tx) => {
    tx.prepare(
      `INSERT INTO upload_meta(id, folder_id, category, updated_at) VALUES(?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET folder_id = excluded.folder_id, category = excluded.category, updated_at = excluded.updated_at`,
    ).run(recordId, item.folderId ?? null, item.category ?? null, now)
    tx.prepare('DELETE FROM upload_variants WHERE main_id = ?').run(recordId)
    const stmt = tx.prepare(
      'INSERT OR REPLACE INTO upload_variants(main_id, url, width, size, type, sort, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?)',
    )
    const variants = Array.isArray(item.variants) ? item.variants : []
    variants.forEach((variant, index) => {
      stmt.run(recordId, variant.url, variant.width, variant.size, variant.type, index, now)
    })
    tx.prepare('DELETE FROM trash WHERE id = ?').run(trashId)
  })
  return { status: 'ok', key: 'uploads', recordId }
}

/**
 * 恢复：把记录写回原集合 / 资源表 / 内容库页面，或写回素材元数据，并移出回收站（单事务）。
 * 原记录标识已被占用 → `conflict`（不覆盖）；回收站无此条目 → `missing`。
 */
export function restoreTrash(id: string): RestoreResult {
  const db = getDb()
  const row = db.prepare('SELECT key, record_id, data FROM trash WHERE id = ?').get(id) as
    | { key: string; record_id: string; data: string }
    | undefined
  if (!row) return { status: 'missing' }
  if (row.key === 'pages') return restorePage(id, row.record_id, row.data)
  if (row.key === 'uploads') return restoreUpload(id, row.record_id, row.data)

  const table = tableOf(row.key)
  const occupied = db.prepare(`SELECT 1 AS x FROM ${table} WHERE key = ? AND id = ?`).get(row.key, row.record_id)
  if (occupied) return { status: 'conflict', key: row.key, recordId: row.record_id }
  runInTransaction((tx) => {
    const min = (tx.prepare(`SELECT COALESCE(MIN(sort), 0) AS m FROM ${table} WHERE key = ?`).get(row.key) as {
      m: number
    }).m
    tx.prepare(`INSERT INTO ${table}(key, id, data, sort) VALUES(?, ?, ?, ?)`).run(
      row.key,
      row.record_id,
      row.data,
      min - 1,
    )
    tx.prepare('DELETE FROM trash WHERE id = ?').run(id)
  })
  if (table === 'admin_resources') invalidateResourceCache()
  return { status: 'ok', key: row.key, recordId: row.record_id }
}

/**
 * 彻底删除：素材类型额外删除磁盘文件（主图 + 全部变体）与其元数据；其余类型仅移除回收站条目。
 * 返回是否命中回收站条目。
 */
export function purgeTrash(id: string): boolean {
  const db = getDb()
  const row = db.prepare('SELECT key, record_id, data FROM trash WHERE id = ?').get(id) as
    | { key: string; record_id: string; data: string }
    | undefined
  if (!row) return false

  if (row.key === 'uploads') {
    let variantFileIds: string[] = []
    try {
      const snapshot = JSON.parse(row.data) as { variantFileIds?: unknown }
      if (Array.isArray(snapshot.variantFileIds)) {
        variantFileIds = snapshot.variantFileIds.filter((value): value is string => typeof value === 'string')
      }
    } catch {
      // 数据损坏时仍尝试删除主图文件并移除回收站条目
    }
    deleteUpload(row.record_id)
    for (const variantId of variantFileIds) deleteUpload(variantId)
    runInTransaction((tx) => {
      tx.prepare('DELETE FROM upload_meta WHERE id = ?').run(row.record_id)
      tx.prepare('DELETE FROM upload_variants WHERE main_id = ?').run(row.record_id)
      tx.prepare('DELETE FROM trash WHERE id = ?').run(id)
    })
    return true
  }

  const result = runInTransaction((tx) => tx.prepare('DELETE FROM trash WHERE id = ?').run(id))
  return Number(result.changes) > 0
}

/** 清空回收站（供测试 / 重置使用） */
export function resetTrash(): void {
  runInTransaction((tx) => tx.prepare('DELETE FROM trash').run())
}
