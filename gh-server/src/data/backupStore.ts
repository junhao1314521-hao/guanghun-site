/**
 * 备份 / 恢复存储（阶段 5b，零外部依赖）。
 *
 * - 落盘目录：`gh-server/data/backups`（`BACKUP_DIR` 可覆盖，便于测试隔离）。
 * - 备份文件：JSON 快照 `backup-<时间戳>[-<label>].json`，内容为四类数据的原始行：
 *   `content_pages` / `site_config` / `collections` / `admin_resources`（含生成时间与版本号）。
 * - 恢复：以备份**覆盖**现有四张表（单事务）；恢复前自动生成一份 `pre-restore` 快照以便回退。
 * - 一致性：快照通过同一 SQLite 连接读取（WAL 下读取一致视图），写入以事务落库。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDb, runInTransaction, SCHEMA_VERSION } from './db'
import { invalidateResourceCache, initAdminResources } from './adminResourceStore'
import { initStore } from './contentStore'
import { initCollections } from './collectionStore'
import { logger } from '../lib/logger'

/** 备份条目（对外形状：文件名 / 大小 / 时间） */
export type BackupItem = {
  /** 稳定标识：备份文件名 */
  id: string
  /** 展示名（同文件名） */
  name: string
  /** 字节数 */
  size: number
  /** 生成时间（ISO 字符串，取自文件 mtime） */
  at: string
}

/** 四类数据的原始行 */
type ContentPageRow = { key: string; data: string; updated_at: string | null }
type SiteConfigRow = { data: string }
type RecordRow = { key: string; id: string; data: string; sort: number | null }

/** 备份快照结构 */
export type BackupSnapshot = {
  version: number
  schemaVersion: string
  generatedAt: string
  /** 可选标签（如 pre-restore），写文件名 */
  label?: string
  data: {
    content_pages: ContentPageRow[]
    site_config: SiteConfigRow | null
    collections: RecordRow[]
    admin_resources: RecordRow[]
  }
}

/** 默认落盘目录：gh-server/data/backups */
const DEFAULT_DIR = fileURLToPath(new URL('../../data/backups', import.meta.url))

/** 解析当前备份目录（每次读取，保证测试可在初始化前注入 BACKUP_DIR） */
export function resolveBackupDir(): string {
  return process.env.BACKUP_DIR ? path.resolve(process.env.BACKUP_DIR) : DEFAULT_DIR
}

/** 确保目录存在并返回其绝对路径 */
export function ensureBackupDir(): string {
  const dir = resolveBackupDir()
  mkdirSync(dir, { recursive: true })
  return dir
}

/** 读取当前库的完整快照 */
export function snapshot(): BackupSnapshot {
  // 备份前确保各存储已按 seed 就绪（内容库 / 集合 / 后台资源均为惰性初始化）
  initStore()
  initCollections()
  initAdminResources()
  const db = getDb()
  const contentPages = db.prepare('SELECT key, data, updated_at FROM content_pages ORDER BY rowid ASC').all() as ContentPageRow[]
  const siteRow = db.prepare('SELECT data FROM site_config WHERE id = 1').get() as SiteConfigRow | undefined
  const collections = db.prepare('SELECT key, id, data, sort FROM collections ORDER BY key ASC, sort ASC, rowid ASC').all() as RecordRow[]
  const adminResources = db
    .prepare('SELECT key, id, data, sort FROM admin_resources ORDER BY key ASC, sort ASC, rowid ASC')
    .all() as RecordRow[]
  return {
    version: 1,
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    data: {
      content_pages: contentPages,
      site_config: siteRow ?? null,
      collections,
      admin_resources: adminResources,
    },
  }
}

/** 生成备份文件名：`backup-<时间戳>[-<label>].json`（时间戳中的 `:`/`.` 替换为 `-`） */
function backupFileName(label: string | undefined): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const suffix = label ? `-${label.replace(/[^A-Za-z0-9_-]/g, '')}` : ''
  return `backup-${ts}${suffix}.json`
}

/** 由文件名构造条目（时间取文件 mtime） */
function toItem(file: string): BackupItem {
  const full = path.join(resolveBackupDir(), file)
  const stat = statSync(full)
  return { id: file, name: file, size: stat.size, at: new Date(stat.mtimeMs).toISOString() }
}

/** 安全化备份 id：仅接受目录内单段 `.json` 文件名 */
function safeId(id: string): string | undefined {
  if (!id || id !== path.basename(id) || id.startsWith('.') || !id.endsWith('.json')) return undefined
  return id
}

/** 生成一份备份，返回其条目 */
export function createBackup(label?: string): BackupItem {
  const dir = ensureBackupDir()
  const fileName = backupFileName(label)
  const payload = snapshot()
  if (label) payload.label = label
  const file = path.join(dir, fileName)
  writeFileSync(file, JSON.stringify(payload))
  logger.info('已生成备份', { file: fileName, label: label ?? 'manual' })
  return toItem(fileName)
}

/** 列出全部备份（按时间倒序） */
export function listBackups(): BackupItem[] {
  const dir = resolveBackupDir()
  if (!existsSync(dir)) return []
  const items: BackupItem[] = []
  for (const file of readdirSync(dir)) {
    if (file.startsWith('.') || !file.endsWith('.json')) continue
    try {
      if (statSync(path.join(dir, file)).isFile()) items.push(toItem(file))
    } catch {
      // 读取失败跳过
    }
  }
  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.id < b.id ? 1 : -1))
  return items
}

/** 备份文件的绝对路径；不存在 / 非法 id 返回 undefined */
export function backupFilePath(id: string): string | undefined {
  const safe = safeId(id)
  if (!safe) return undefined
  const file = path.join(resolveBackupDir(), safe)
  if (!existsSync(file)) return undefined
  return file
}

/** 读取并解析备份快照；不存在 / 非法返回 undefined */
export function readBackup(id: string): BackupSnapshot | undefined {
  const file = backupFilePath(id)
  if (!file) return undefined
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as BackupSnapshot
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return undefined
    return parsed
  } catch {
    return undefined
  }
}

/** 删除备份；返回是否命中 */
export function deleteBackup(id: string): boolean {
  const file = backupFilePath(id)
  if (!file) return false
  try {
    unlinkSync(file)
    return true
  } catch {
    return false
  }
}

/** 以备份快照覆盖恢复四张表（单事务）；结构不合法抛错 */
export function restoreSnapshot(payload: BackupSnapshot): void {
  const data = payload.data
  if (
    !data ||
    !Array.isArray(data.content_pages) ||
    !Array.isArray(data.collections) ||
    !Array.isArray(data.admin_resources)
  ) {
    throw new Error('备份快照结构不合法')
  }
  runInTransaction((db) => {
    db.prepare('DELETE FROM content_pages').run()
    db.prepare('DELETE FROM site_config').run()
    db.prepare('DELETE FROM collections').run()
    db.prepare('DELETE FROM admin_resources').run()

    const insertPage = db.prepare('INSERT OR REPLACE INTO content_pages(key, data, updated_at) VALUES(?, ?, ?)')
    for (const row of data.content_pages) insertPage.run(row.key, row.data, row.updated_at ?? null)

    if (data.site_config && typeof data.site_config.data === 'string') {
      db.prepare('INSERT OR REPLACE INTO site_config(id, data) VALUES(1, ?)').run(data.site_config.data)
    }

    const insertCollection = db.prepare('INSERT OR REPLACE INTO collections(key, id, data, sort) VALUES(?, ?, ?, ?)')
    for (const row of data.collections) insertCollection.run(row.key, row.id, row.data, row.sort ?? 0)

    const insertResource = db.prepare('INSERT OR REPLACE INTO admin_resources(key, id, data, sort) VALUES(?, ?, ?, ?)')
    for (const row of data.admin_resources) insertResource.run(row.key, row.id, row.data, row.sort ?? 0)
  })
  // 库内容已整体替换，失效栏目 key 缓存
  invalidateResourceCache()
  logger.info('已从备份恢复', { generatedAt: payload.generatedAt })
}
