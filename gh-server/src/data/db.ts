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
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { logger } from '../lib/logger'

/**
 * SQLite 连接的最小同步接口：`node:sqlite` 与 `node-sqlite3-wasm` 的共同子集。
 * 生产 Node 22+ 优先使用内置 `node:sqlite`；Node 20 运行时自动回退纯 WASM 驱动
 * （若显式设置 `SQLITE_DRIVER=wasm` 则强制使用 WASM）。
 */
export type SqliteStatement = {
  get(...params: unknown[]): unknown
  all(...params: unknown[]): unknown[]
  run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint }
}

export type SqliteDatabase = {
  exec(sql: string): void
  prepare(sql: string): SqliteStatement
  close(): void
}

type DatabaseCtor = new (file: string) => SqliteDatabase

const nodeRequire = createRequire(import.meta.url)

/**
 * 解析实际可用的驱动：
 * - 显式 `SQLITE_DRIVER=wasm` → WASM；
 * - 运行时没有内置 `node:sqlite`（Node 20）→ WASM；
 * - 其它情况使用 `node:sqlite`（零依赖、与现有行为一致）。
 *   走查环境所在镜像 GLIBC 较旧，原生模块不可用，WASM 无需编译、无系统库依赖。
 */
function resolveDriver(): 'node' | 'wasm' {
  if (process.env.SQLITE_DRIVER === 'wasm') return 'wasm'
  try {
    nodeRequire('node:sqlite')
    return 'node'
  } catch (err) {
    // 仅当运行时没有该内置模块时才回退；其它错误照常抛出
    if ((err as NodeJS.ErrnoException).code !== 'ERR_UNKNOWN_BUILTIN_MODULE') throw err
    return 'wasm'
  }
}

/** 打开数据库连接（驱动由调用方解析后传入）。 */
function openSqlite(file: string, driver: 'node' | 'wasm'): SqliteDatabase {
  if (driver === 'node') {
    const mod = nodeRequire('node:sqlite') as { DatabaseSync: DatabaseCtor }
    return new mod.DatabaseSync(file)
  }
  const { Database } = nodeRequire('node-sqlite3-wasm') as {
    Database: new (file: string) => {
      exec(sql: string): void
      prepare(sql: string): {
        get(values?: unknown): unknown
        all(values?: unknown): unknown[]
        run(values?: unknown): { changes: number; lastInsertRowid: number | bigint }
      }
      close(): void
    }
  }
  const raw = new Database(file)
  return {
    exec: (sql) => raw.exec(sql),
    close: () => raw.close(),
    prepare: (sql) => {
      const stmt = raw.prepare(sql)
      // 本项目统一使用位置参数；WASM 驱动的 Statement 接收数组或单值
      const bind = (params: unknown[]) =>
        params.length === 0 ? undefined : params.length === 1 ? params[0] : params
      return {
        get: (...params) => stmt.get(bind(params)) ?? undefined,
        all: (...params) => stmt.all(bind(params)) as unknown[],
        run: (...params) => stmt.run(bind(params)),
      }
    },
  }
}

/**
 * 当前 schema 版本（写入 meta，供未来迁移判断）：
 * v2：新增 admin_users（后台账号哈希）；v3：新增 releases（发布记录与回滚快照）；
 * v4：新增 upload_variants（图片多尺寸变体元数据）；
 * v5：新增 metrics_events（轻量埋点事件：浏览 / 下载点击）与 trash（回收站：软删除记录）；
 * v6：新增前台会员账号体系（users 账号哈希 / user_sessions 会话 / user_reset_tokens 重置令牌 /
 *     user_account_data 按用户隔离的个人中心数据）。与后台 admin_users 完全独立。
 * v7：新增 publish_schedules（定时发布：到点自动应用创建时捕获的内容快照，支持取消）。
 * v8：新增 admin_roles（后台角色可新建 / 编辑 / 删除；取代代码内固定两角色）。
 * v9：新增 content_drafts（页面草稿：后台保存写草稿，发布时才覆盖线上）。
 * v10：新增 device_registrations（会员设备登记：SN 全局唯一，购买凭证待后台审核，
 *     保修期 = 购买日期 + 36 个月，由服务端计算到期日与剩余天数）。
 * v11：upload_meta 增加 kind / usage_scope / size_bytes / sha256 / mime / visibility / status，
 *     素材库从「只看磁盘」升级为可分类、可校验、可做删除保护。
 * v12：users 增加 status / last_login_at / frozen_at，支撑后台会员冻结与最近登录展示。
 * v13：新增 wallpaper_themes（壁纸主题实体：名称 / 说明 / 排序 / 启用），供前后台统一管理。
 * v14：users 增加 tags / note（会员运营标签与内部备注）。
 * v15：新增 seo_overrides（静态路由 SEO 标题 / 描述 / 收录开关的后台覆盖）。
 * v16：device_registrations 增加 anonymized_at（账号注销后设备记录去标识化保留：
 *      user_id 改为不可逆标记、凭证地址清空，保修期内仍可按 SN 售后）。
 * v17：device_registrations 增加 receipt_sha256 / claimed_at / claim_hash_match
 *      （SN 认领防冒领：保留原始凭证指纹，认领时比对新凭证，后台据此识别冒领风险）。
 * v18：device_registrations 增加 claim_origin_user_id / claim_origin_status
 *      （认领被驳回时把记录还原为「注销遗留」状态，保留原保修归属与凭证指纹，SN 仍可被真正的机主认领）。
 */
export const SCHEMA_VERSION = '18'

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
  kind       TEXT,
  usage_scope TEXT,
  size_bytes INTEGER,
  sha256     TEXT,
  mime       TEXT,
  image_pipeline TEXT,
  visibility TEXT DEFAULT 'public',
  status     TEXT DEFAULT 'active',
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
  created_at TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  last_login_at TEXT,
  frozen_at    TEXT,
  tags         TEXT,
  note         TEXT
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
-- 壁纸主题实体（后台可增删改、排序、停用；壁纸记录通过 theme 字段引用 key）
CREATE TABLE IF NOT EXISTS wallpaper_themes (
  key         TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT,
  sort        INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT
);
-- SEO 元信息覆盖（静态路由的标题 / 描述 / 收录开关；未覆盖时回落到 seoDefaults）
CREATE TABLE IF NOT EXISTS seo_overrides (
  path        TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  indexable   INTEGER NOT NULL DEFAULT 1,
  image       TEXT,
  updated_at  TEXT NOT NULL
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
-- 页面草稿：后台保存写这里，前台只读 content_pages；发布时才把草稿覆盖到线上并删草稿
CREATE TABLE IF NOT EXISTS content_drafts (
  key        TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  updated_at TEXT
);
-- 会员设备登记：sn 全局唯一（跨账号）；购买凭证经后台上传审核后状态才转 active。
-- 保修期固定 36 个月（不区分面板 / 整机），到期日与剩余天数由服务端按 purchased_at 计算。
CREATE TABLE IF NOT EXISTS device_registrations (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  model         TEXT NOT NULL,
  sn            TEXT NOT NULL,
  purchased_at  TEXT NOT NULL,
  channel       TEXT,
  receipt_url   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  reviewed_by   TEXT,
  reviewed_at   TEXT,
  created_at    TEXT NOT NULL,
  anonymized_at TEXT,
  receipt_sha256 TEXT,
  claimed_at    TEXT,
  claim_hash_match INTEGER,
  claim_origin_user_id TEXT,
  claim_origin_status  TEXT
);
CREATE INDEX IF NOT EXISTS idx_device_reg_user ON device_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_device_reg_status ON device_registrations(status);
-- 序列号全局唯一：已驳回的记录不占用（允许用户修正凭证后重新提交）
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_reg_sn ON device_registrations(sn) WHERE status <> 'rejected';
`

/** 单例连接与其对应的路径（路径变化时重开，兼容测试 / 多实例场景） */
let conn: SqliteDatabase | null = null
let connPath = ''

/**
 * WASM 驱动已打开的连接（按库路径缓存）。
 * 该驱动关闭连接后立即重开同一文件会报 `database is locked`（文件锁释放滞后），
 * 因此切换库路径时不关闭旧连接，直接复用缓存；单进程内每个库仅一个连接。
 */
const wasmConns = new Map<string, SqliteDatabase>()

/** 幂等补列：老库升级时使用（SQLite 不支持 ADD COLUMN IF NOT EXISTS） */
function ensureColumn(db: SqliteDatabase, table: string, column: string, ddl: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name?: string }>
  if (!columns.some((item) => item.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
}

/** upload_meta 的 v11 补列（老库升级；新库由 DDL 直接建好） */
function migrateUploadMeta(db: SqliteDatabase): void {
  ensureColumn(db, 'upload_meta', 'kind', 'kind TEXT')
  ensureColumn(db, 'upload_meta', 'usage_scope', 'usage_scope TEXT')
  ensureColumn(db, 'upload_meta', 'size_bytes', 'size_bytes INTEGER')
  ensureColumn(db, 'upload_meta', 'sha256', 'sha256 TEXT')
  ensureColumn(db, 'upload_meta', 'mime', 'mime TEXT')
  ensureColumn(db, 'upload_meta', 'image_pipeline', 'image_pipeline TEXT')
  ensureColumn(db, 'upload_meta', 'visibility', "visibility TEXT DEFAULT 'public'")
  ensureColumn(db, 'upload_meta', 'status', "status TEXT DEFAULT 'active'")
}

/** users 的 v12 补列（老库升级；新库由 DDL 直接建好） */
function migrateUsers(db: SqliteDatabase): void {
  ensureColumn(db, 'users', 'status', "status TEXT NOT NULL DEFAULT 'active'")
  ensureColumn(db, 'users', 'last_login_at', 'last_login_at TEXT')
  ensureColumn(db, 'users', 'frozen_at', 'frozen_at TEXT')
  ensureColumn(db, 'users', 'tags', 'tags TEXT')
  ensureColumn(db, 'users', 'note', 'note TEXT')
}

/** seo_overrides 的补列：分享图（v15 首版建表已含；兼容先建表的实例） */
function migrateSeoOverrides(db: SqliteDatabase): void {
  ensureColumn(db, 'seo_overrides', 'image', 'image TEXT')
}

/** device_registrations 的 v16 / v17 / v18 补列（老库升级；新库由 DDL 直接建好） */
function migrateDeviceRegistrations(db: SqliteDatabase): void {
  ensureColumn(db, 'device_registrations', 'anonymized_at', 'anonymized_at TEXT')
  ensureColumn(db, 'device_registrations', 'receipt_sha256', 'receipt_sha256 TEXT')
  ensureColumn(db, 'device_registrations', 'claimed_at', 'claimed_at TEXT')
  ensureColumn(db, 'device_registrations', 'claim_hash_match', 'claim_hash_match INTEGER')
  ensureColumn(db, 'device_registrations', 'claim_origin_user_id', 'claim_origin_user_id TEXT')
  ensureColumn(db, 'device_registrations', 'claim_origin_status', 'claim_origin_status TEXT')
}

/** 读取 meta 值；不存在返回 undefined */
function getMeta(db: SqliteDatabase, key: string): string | undefined {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value?: string } | undefined
  return row?.value
}

/** 写入（或覆盖）meta 值 */
function setMeta(db: SqliteDatabase, key: string, value: string): void {
  db.prepare('INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
}

/** 解析旧 JSON 路径：环境变量优先，否则回退默认文件 */
function legacyPath(envKey: string, defaultFile: string): string {
  const override = process.env[envKey]
  return override ? path.resolve(override) : fileURLToPath(new URL(`../../data/${defaultFile}`, import.meta.url))
}

/** 判断 DB 是否为空（五张业务表均无记录） */
function isEmptyDb(db: SqliteDatabase): boolean {
  for (const table of ['content_pages', 'site_config', 'collections', 'admin_resources', 'audit_log']) {
    const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }
    if (row.n > 0) return false
  }
  return true
}

/** 旧内容库 JSON → content_pages + site_config；文件不存在或结构不合法则跳过（返回 false） */
function importContent(db: SqliteDatabase, file: string): boolean {
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
function importRecordMap(db: SqliteDatabase, file: string, table: 'collections' | 'admin_resources'): boolean {
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
function importAudit(db: SqliteDatabase, file: string): boolean {
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
function migrateFromLegacyJson(db: SqliteDatabase): void {
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
export function getDb(): SqliteDatabase {
  const target = resolveDbPath()
  if (conn && connPath === target) return conn
  const driver = resolveDriver()
  if (driver === 'wasm') {
    const cached = wasmConns.get(target)
    if (cached) {
      conn = cached
      connPath = target
      return cached
    }
  } else if (conn) {
    // node:sqlite 可安全关闭后重开；WASM 关闭后锁释放滞后，因此不关闭，交给缓存复用
    try {
      conn.close()
    } catch {
      // 关闭旧连接失败可忽略（即将重开新连接）
    }
  }
  conn = null
  try {
    mkdirSync(path.dirname(target), { recursive: true })
    const db = openSqlite(target, driver)
    // WASM 驱动不支持 WAL（生产快照可能仍是 WAL，这里转回默认 journal），并设置锁等待
    if (driver === 'wasm') {
      db.exec('PRAGMA journal_mode = DELETE')
      db.exec('PRAGMA busy_timeout = 5000')
    } else {
      db.exec('PRAGMA journal_mode = WAL')
    }
    db.exec('PRAGMA foreign_keys = ON')
    db.exec(DDL)
    migrateUploadMeta(db)
    migrateUsers(db)
    migrateSeoOverrides(db)
    migrateDeviceRegistrations(db)
    migrateFromLegacyJson(db)
    // 每次打开都把 meta 的 schema 版本同步为当前版本（建表为幂等 DDL；版本号用于排障与未来迁移判断）
    if (getMeta(db, META_SCHEMA) !== SCHEMA_VERSION) setMeta(db, META_SCHEMA, SCHEMA_VERSION)
    if (driver === 'wasm') wasmConns.set(target, db)
    conn = db
    connPath = target
    return db
  } catch (err) {
    logger.error('SQLite 初始化失败', { db: target, error: (err as Error).message })
    throw new Error(`SQLite 初始化失败（${target}）：${(err as Error).message}`)
  }
}

/** 在事务中执行写序列；异常时回滚并原样抛出。 */
export function runInTransaction<T>(fn: (db: SqliteDatabase) => T): T {
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
