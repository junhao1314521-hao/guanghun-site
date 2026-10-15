/**
 * SQLite 持久化底座（PRD 阶段 5a：JSON 文件 → SQLite）。
 *
 * - 位置：默认 `gh-server/data/gh.sqlite`（可由环境变量 `DB_PATH` 覆盖，便于测试隔离）。
 * - 单例：进程内单连接（`node:sqlite` 的 `DatabaseSync`，同步 API）；首次访问时惰性打开。
 * - 建表：幂等 `CREATE TABLE IF NOT EXISTS`；开启 `WAL` 与 `foreign_keys`。
 * - 一次性迁移：首次打开若 DB 为空且存在旧 JSON 文件，则把 JSON 内容导入 DB，
 *   并在 `meta` 表标记 `migrated_json=1`（旧 JSON 文件**不删除**，仅停止写入）。
 * - 事务：`runInTransaction` 包裹需要原子性的写序列。
 * - 容错：打开 / 建表失败 → 记结构化日志并抛出明确错误（**不静默降级**）；
 *   旧 JSON 解析失败 → 记日志跳过（回退由各 store 的 seed 承担），不崩溃。
 *
 * 说明：`node:sqlite` 目前为 Node 实验特性，进程启动会打印一条 `ExperimentalWarning`；
 * 本项目**保留该警告**（不做全局吞警告），以便跟踪实验 API 的变动。
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { logger } from '../lib/logger'

/**
 * 当前 schema 版本（写入 meta，供未来迁移判断）：
 * v2：新增 admin_users（后台账号哈希）；v3：新增 releases（发布记录与回滚快照）；
 * v4：新增 upload_variants（图片多尺寸变体元数据）；
 * v5：新增 metrics_events（轻量埋点事件：浏览 / 下载点击）与 trash（回收站：软删除记录）；
 * v6：新增前台会员账号体系（users 账号哈希 / user_sessions 会话 / user_reset_tokens 重置令牌 /
 *     user_account_data 按用户隔离的个人中心数据）。与后台 admin_users 完全独立。
 * v7：新增 publish_schedules（定时发布：到点自动应用创建时捕获的内容快照，支持取消）。
 * v8：新增 admin_roles（后台角色可新建 / 编辑 / 删除；取代代码内固定两角色）。
 */
export const SCHEMA_VERSION = '8'

/** meta 键：是否已完成「旧 JSON → SQLite」一次性迁移 */
const META_MIGRATED = 'migrated_json'

/** meta 键：schema 版本 */
const META_SCHEMA = 'schema_version'

/** 默认数据库文件：gh-server/data/gh.sqlite（相对本模块定位，避免依赖 cwd） */
const DEFAULT_DB_PATH = fileURLToPath(new URL('../../data/gh.sqlite', import.meta.url))

/** 解析当前数据库路径（每次打开时读取，保证测试可在初始化前注入 DB_PATH） */
export function resolveDbPath(): string {
  return process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : DEFAULT_DB_PATH
}

/** 建表 DDL（幂等；audit_log 额外用 seq 维护展示顺序，值越小越新） */
const DDL = `
CREATE TABLE IF NOT EXISTS content_pages (
  key        TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS site_config (
  id   INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS collections (
  key  TEXT NOT NULL,
  id   TEXT NOT NULL,
  data TEXT NOT NULL,
  sort INTEGER,
  PRIMARY KEY (key, id)
);
CREATE TABLE IF NOT EXISTS admin_resources (
  key  TEXT NOT NULL,
  id   TEXT NOT NULL,
  data TEXT NOT NULL,
  sort INTEGER,
  PRIMARY KEY (key, id)
);
CREATE TABLE IF NOT EXISTS audit_log (
  id     TEXT PRIMARY KEY,
  at     TEXT,
  actor  TEXT,
  action TEXT,
  target TEXT,
  detail TEXT,
  ip     TEXT,
  seq    INTEGER
);
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);
CREATE TABLE IF NOT EXISTS admin_users (
  id         TEXT PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL,
  salt       TEXT NOT NULL,
  hash       TEXT NOT NULL,
  name       TEXT,
  role       TEXT,
  scopes     TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS releases (
  id               TEXT PRIMARY KEY,
  at               TEXT NOT NULL,
  actor            TEXT NOT NULL,
  note             TEXT,
  content_version  TEXT,
  block_count      INTEGER,
  page_count       INTEGER,
  collection_count INTEGER,
  snapshot         TEXT
);
CREATE TABLE IF NOT EXISTS upload_folders (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  parent_id  TEXT,
  sort       INTEGER,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS upload_meta (
  id         TEXT PRIMARY KEY,
  folder_id  TEXT,
  category   TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS upload_variants (
  main_id    TEXT NOT NULL,
  url        TEXT NOT NULL,
  width      INTEGER,
  size       INTEGER,
  type       TEXT,
  sort       INTEGER,
  updated_at TEXT,
  PRIMARY KEY (main_id, url)
);
CREATE TABLE IF NOT EXISTS metrics_events (
  id   TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  key  TEXT,
  at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_metrics_kind_at ON metrics_events(kind, at);
CREATE TABLE IF NOT EXISTS trash (
  id         TEXT PRIMARY KEY,
  key        TEXT NOT NULL,
  record_id  TEXT NOT NULL,
  data       TEXT NOT NULL,
  deleted_at TEXT NOT NULL,
  deleted_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_trash_deleted_at ON trash(deleted_at);
-- 前台会员账号（与后台 admin_users 完全独立的一套；密码 scrypt 加盐哈希）
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  phone      TEXT,
  salt       TEXT NOT NULL,
  hash       TEXT NOT NULL,
  name       TEXT,
  created_at TEXT
);
-- 前台会话（独立于后台内存会话；令牌经 gh_user httpOnly Cookie 下发，落库以支持重启后仍有效）
CREATE TABLE IF NOT EXISTS user_sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
-- 找回密码重置令牌（无邮件服务：开发环境直出令牌）
CREATE TABLE IF NOT EXISTS user_reset_tokens (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0
);
-- 个人中心数据（按用户隔离：devices / favorites / notifications / settings，各存一份 JSON）
CREATE TABLE IF NOT EXISTS user_account_data (
  user_id    TEXT NOT NULL,
  section    TEXT NOT NULL,
  data       TEXT NOT NULL,
  updated_at TEXT,
  PRIMARY KEY (user_id, section)
);
-- 定时发布：创建时即捕获内容快照，到点自动应用；支持取消 / 失败留痕
CREATE TABLE IF NOT EXISTS publish_schedules (
  id         TEXT PRIMARY KEY,
  at         TEXT NOT NULL,
  note       TEXT,
  snapshot   TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_by TEXT,
  created_at TEXT NOT NULL,
  applied_at TEXT,
  error      TEXT
);
CREATE INDEX IF NOT EXISTS idx_publish_schedules_at ON publish_schedules(at);
CREATE INDEX IF NOT EXISTS idx_publish_schedules_status ON publish_schedules(status);
-- 后台角色（可新建 / 编辑 / 删除）：builtin=1 的内置角色不可删除；scopes 为 JSON 数组
CREATE TABLE IF NOT EXISTS admin_roles (
  key        TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  desc       TEXT,
  scopes     TEXT NOT NULL,
  builtin    INTEGER NOT NULL DEFAULT 0,
  sort       INTEGER,
  created_at TEXT
);
`

/** 单例连接与其对应的路径（路径变化时重开，兼容测试 / 多实例场景） */
let conn: DatabaseSync | null = null
let connPath = ''

/** 读取 meta 值；不存在返回 undefined */
export function getMeta(db: DatabaseSync, key: string): string | undefined {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value?: string } | undefined
  return row?.value
}

/** 写入（或覆盖）meta 值 */
export function setMeta(db: DatabaseSync, key: string, value: string): void {
  db.prepare('INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
}

/** 解析旧 JSON 路径：环境变量优先，否则回退默认文件 */
function legacyPath(envKey: string, defaultFile: string): string {
  const override = process.env[envKey]
  return override ? path.resolve(override) : fileURLToPath(new URL(`../../data/${defaultFile}`, import.meta.url))
}

/** 判断 DB 是否为空（五张业务表均无记录） */
function isEmptyDb(db: DatabaseSync): boolean {
  for (const table of ['content_pages', 'site_config', 'collections', 'admin_resources', 'audit_log']) {
    const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }
    if (row.n > 0) return false
  }
  return true
}

/** 旧内容库 JSON → content_pages + site_config；文件不存在或结构不合法则跳过（返回 false） */
function importContent(db: DatabaseSync, file: string): boolean {
  if (!existsSync(file)) return false
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'))
  } catch (err) {
    logger.warn('旧内容库 JSON 解析失败，跳过迁移', { file, error: (err as Error).message })
    return false
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { pages?: unknown }).pages)) {
    logger.warn('旧内容库 JSON 结构不合法，跳过迁移', { file })
    return false
  }
  const data = raw as { pages: Array<Record<string, unknown>>; site?: unknown }
  for (const page of data.pages) {
    if (!page || typeof page.key !== 'string') continue
    const updatedAt = typeof page.updatedAt === 'string' ? page.updatedAt : null
    db.prepare('INSERT OR REPLACE INTO content_pages(key, data, updated_at) VALUES(?, ?, ?)').run(
      page.key,
      JSON.stringify(page),
      updatedAt,
    )
  }
  if (data.site && typeof data.site === 'object') {
    db.prepare('INSERT OR REPLACE INTO site_config(id, data) VALUES(1, ?)').run(JSON.stringify(data.site))
  }
  return true
}

/** 通用「栏目 key → 记录数组」JSON → 表；文件不存在或结构不合法则跳过 */
function importRecordMap(db: DatabaseSync, file: string, table: 'collections' | 'admin_resources'): boolean {
  if (!existsSync(file)) return false
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'))
  } catch (err) {
    logger.warn('旧 JSON 解析失败，跳过迁移', { file, table, error: (err as Error).message })
    return false
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    logger.warn('旧 JSON 结构不合法，跳过迁移', { file, table })
    return false
  }
  const insert = db.prepare(`INSERT OR REPLACE INTO ${table}(key, id, data, sort) VALUES(?, ?, ?, ?)`)
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue
    value.forEach((record, index) => {
      if (!record || typeof record !== 'object') return
      const id = (record as { id?: unknown }).id
      if (typeof id !== 'string') return
      insert.run(key, id, JSON.stringify(record), index)
    })
  }
  return true
}

/** 旧审计 JSON（数组，最新在前）→ audit_log；seq 按下标递增（值越小越新） */
function importAudit(db: DatabaseSync, file: string): boolean {
  if (!existsSync(file)) return false
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'))
  } catch (err) {
    logger.warn('旧审计 JSON 解析失败，跳过迁移', { file, error: (err as Error).message })
    return false
  }
  if (!Array.isArray(raw)) {
    logger.warn('旧审计 JSON 结构不合法，跳过迁移', { file })
    return false
  }
  const insert = db.prepare('INSERT OR REPLACE INTO audit_log(id, at, actor, action, target, detail, ip, seq) VALUES(?, ?, ?, ?, ?, ?, ?, ?)')
  raw.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return
    const e = entry as Record<string, unknown>
    if (typeof e.id !== 'string') return
    insert.run(
      e.id,
      typeof e.at === 'string' ? e.at : null,
      typeof e.actor === 'string' ? e.actor : null,
      typeof e.action === 'string' ? e.action : null,
      typeof e.target === 'string' ? e.target : null,
      typeof e.detail === 'string' ? e.detail : null,
      typeof e.ip === 'string' ? e.ip : '',
      index,
    )
  })
  return true
}

/**
 * 一次性迁移：仅在 meta 未标记且 DB 为空时执行；完成后写入 meta 标记。
 * 旧 JSON 文件保持不动（只读来源），供人工核对 / 回滚。
 */
function migrateFromLegacyJson(db: DatabaseSync): void {
  if (getMeta(db, META_MIGRATED) === '1') return

  const empty = isEmptyDb(db)
  const migrated: string[] = []

  if (empty) {
    db.exec('BEGIN')
    try {
      if (importContent(db, legacyPath('CONTENT_STORE_PATH', 'content-store.json'))) migrated.push('content-store.json')
      if (importRecordMap(db, legacyPath('COLLECTION_STORE_PATH', 'collection-store.json'), 'collections')) {
        migrated.push('collection-store.json')
      }
      if (importRecordMap(db, legacyPath('ADMIN_RESOURCE_STORE_PATH', 'admin-resources.json'), 'admin_resources')) {
        migrated.push('admin-resources.json')
      }
      if (importAudit(db, legacyPath('AUDIT_LOG_PATH', 'audit-log.json'))) migrated.push('audit-log.json')
      setMeta(db, META_SCHEMA, SCHEMA_VERSION)
      setMeta(db, META_MIGRATED, '1')
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
  } else {
    // DB 已有数据：视为已完成迁移，仅补标记（避免重复导入覆盖运行期改动）
    setMeta(db, META_SCHEMA, SCHEMA_VERSION)
    setMeta(db, META_MIGRATED, '1')
  }

  if (migrated.length) {
    logger.info('已从旧 JSON 迁移到 SQLite（旧 JSON 保留未删）', { db: resolveDbPath(), sources: migrated })
  } else {
    logger.info('SQLite 无需迁移（DB 为空且无旧 JSON，或 DB 非空）', { db: resolveDbPath(), empty })
  }
}

/**
 * 获取（必要时打开）单例数据库连接。
 * 打开 / 建表 / 迁移 失败时记结构化日志并抛出明确错误。
 */
export function getDb(): DatabaseSync {
  const target = resolveDbPath()
  if (conn && connPath === target) return conn
  if (conn) {
    try {
      conn.close()
    } catch {
      // 关闭旧连接失败可忽略（即将重开新连接）
    }
    conn = null
  }
  try {
    mkdirSync(path.dirname(target), { recursive: true })
    const db = new DatabaseSync(target)
    db.exec('PRAGMA journal_mode = WAL')
    db.exec('PRAGMA foreign_keys = ON')
    db.exec(DDL)
    migrateFromLegacyJson(db)
    conn = db
    connPath = target
    return db
  } catch (err) {
    logger.error('SQLite 初始化失败', { db: target, error: (err as Error).message })
    throw new Error(`SQLite 初始化失败（${target}）：${(err as Error).message}`)
  }
}

/** 在事务中执行写序列；异常时回滚并原样抛出。 */
export function runInTransaction<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb()
  db.exec('BEGIN')
  try {
    const result = fn(db)
    db.exec('COMMIT')
    return result
  } catch (err) {
    try {
      db.exec('ROLLBACK')
    } catch {
      // 回滚失败时以原始异常为准
    }
    throw err
  }
}
