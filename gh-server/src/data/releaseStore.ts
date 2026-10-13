/**
 * 发布记录与回滚存储（PRD 阶段 5C / 逻辑 5C）——真实能力，不依赖外部部署环境。
 *
 * - 存储：单库 `data/gh.sqlite`（`DB_PATH` 可覆盖）中的 `releases` 表；写入即事务落库，重启不丢。
 * - 一条发布记录即当前内容的一份**快照**（沿用 backupStore 的快照结构：`content_pages` /
 *   `site_config` / `collections` / `admin_resources`，见 `backupStore.snapshot()`），
 *   并冗余记录条目统计 `{ contentVersion, blockCount, pageCount, collectionCount }`，便于列表直接展示。
 * - 回滚（restore）：复用备份的**整表覆盖**恢复逻辑；恢复前自动生成一份 `pre-restore` 备份以便再次回退。
 * - 边界：本模块只负责「版本记录 + 内容回滚」；真正的构建 / 部署 / 进程与主机操作由部署环境执行
 *   （见《部署 Runbook》，本端点在 Runbook 中作为「发布前留档 / 回滚」的一环）。
 */
import { randomBytes } from 'node:crypto'
import { getDb, runInTransaction } from './db'
import { createBackup, restoreSnapshot, snapshot, type BackupSnapshot } from './backupStore'
import { logger } from '../lib/logger'

/** 发布记录（对外形状，不含内部快照） */
export type ReleaseItem = {
  /** 稳定唯一 id */
  id: string
  /** 发布时间（ISO 8601） */
  at: string
  /** 发布操作者（后台用户名） */
  actor: string
  /** 备注（可选） */
  note?: string
  /** 内容版本号（`vYYYYMMDD-序号`） */
  contentVersion: string
  /** 区块总数（全部页面区块求和） */
  blockCount: number
  /** 页面数 */
  pageCount: number
  /** 集合记录数 */
  collectionCount: number
}

/** 发布记录行 */
type ReleaseRow = {
  id: string
  at: string
  actor: string
  note: string | null
  content_version: string | null
  block_count: number | null
  page_count: number | null
  collection_count: number | null
  snapshot: string | null
}

/** 生成稳定且可读的新 id */
function newId(): string {
  return `rel-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`
}

/** 统计快照：页面数 / 区块总数 / 集合记录数 */
function countSnapshot(snap: BackupSnapshot): { pageCount: number; blockCount: number; collectionCount: number } {
  let blockCount = 0
  for (const row of snap.data.content_pages) {
    try {
      const parsed = JSON.parse(row.data) as { blocks?: unknown[] }
      if (Array.isArray(parsed.blocks)) blockCount += parsed.blocks.length
    } catch {
      // 单页数据损坏不影响其它统计
    }
  }
  return {
    pageCount: snap.data.content_pages.length,
    blockCount,
    collectionCount: snap.data.collections.length,
  }
}

/** 生成内容版本号：`vYYYYMMDD-<当日序号>`（当日已有记录数 + 1） */
function nextContentVersion(): string {
  const now = new Date()
  const day = now.toISOString().slice(0, 10).replace(/-/g, '')
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM releases WHERE substr(at, 1, 10) = ?")
    .get(now.toISOString().slice(0, 10)) as { n: number }
  return `v${day}-${row.n + 1}`
}

/** 行 → 对外条目 */
function rowToItem(row: ReleaseRow): ReleaseItem {
  return {
    id: row.id,
    at: row.at,
    actor: row.actor,
    ...(row.note ? { note: row.note } : {}),
    contentVersion: row.content_version ?? '',
    blockCount: row.block_count ?? 0,
    pageCount: row.page_count ?? 0,
    collectionCount: row.collection_count ?? 0,
  }
}

/**
 * 生成一条发布记录：快照当前内容 → 统计 → 写入 `releases` 表。
 * @param input.actor 操作者（后台用户名）
 * @param input.note  备注（可选）
 */
export function createRelease(input: { actor: string; note?: string }): ReleaseItem {
  const snap = snapshot()
  const counts = countSnapshot(snap)
  const item: ReleaseItem = {
    id: newId(),
    at: new Date().toISOString(),
    actor: input.actor,
    ...(input.note ? { note: input.note } : {}),
    contentVersion: nextContentVersion(),
    ...counts,
  }
  const snapshotJson = JSON.stringify(snap)
  runInTransaction((db) => {
    db.prepare(
      'INSERT INTO releases(id, at, actor, note, content_version, block_count, page_count, collection_count, snapshot) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      item.id,
      item.at,
      item.actor,
      item.note ?? null,
      item.contentVersion,
      item.blockCount,
      item.pageCount,
      item.collectionCount,
      snapshotJson,
    )
  })
  logger.info('已生成发布记录', { id: item.id, contentVersion: item.contentVersion, actor: item.actor })
  return item
}

/** 列表（按发布时间倒序；同刻按写入顺序倒序） */
export function listReleases(): ReleaseItem[] {
  const rows = getDb()
    .prepare(
      'SELECT id, at, actor, note, content_version, block_count, page_count, collection_count, snapshot FROM releases ORDER BY at DESC, rowid DESC',
    )
    .all() as ReleaseRow[]
  return rows.map(rowToItem)
}

/** 读取某发布记录的快照（内部字段）；未命中 / 快照损坏返回 undefined */
export function readReleaseSnapshot(id: string): BackupSnapshot | undefined {
  const row = getDb().prepare('SELECT snapshot FROM releases WHERE id = ?').get(id) as
    | { snapshot: string | null }
    | undefined
  if (!row?.snapshot) return undefined
  try {
    const parsed = JSON.parse(row.snapshot) as BackupSnapshot
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return undefined
    return parsed
  } catch {
    return undefined
  }
}

/**
 * 按发布记录回滚内容：先自动留一份 `pre-restore` 备份，再以快照整表覆盖。
 * 未命中 / 快照损坏返回 false。
 */
export function restoreRelease(id: string): boolean {
  const payload = readReleaseSnapshot(id)
  if (!payload) return false
  createBackup('pre-restore')
  restoreSnapshot(payload)
  logger.info('已按发布记录回滚内容', { id })
  return true
}

/** 删除发布记录；返回是否命中 */
export function deleteRelease(id: string): boolean {
  const result = runInTransaction((db) => db.prepare('DELETE FROM releases WHERE id = ?').run(id))
  return Number(result.changes) > 0
}
