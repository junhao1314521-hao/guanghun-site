/**
 * 后台其余资源（未纳入结构化集合的 ADMIN_RESOURCE_DATA key）持久化——阶段 5a 起改用 SQLite。
 *
 * - 存储：单库 `data/gh.sqlite`（`DB_PATH` 可覆盖）中的 `admin_resources` 表；旧
 *   `data/admin-resources.json` 仅在首次启动时被一次性导入（不删除）。
 * - 启动：整表为空时用 seed 生成并写入；写入后立即**事务落库**，重启不丢，**形状不变**（仍为 `AdminRow[]`）。
 * - 容错：DB 打开 / 建表失败 → 结构化日志 + 明确错误（不静默降级）。
 *
 * 说明：已纳入结构化集合的 key 由 `collectionStore` 负责，本模块仅服务于其余后台栏目
 * （assets / pages / nav / customers / roles / product-categories / test-records 等）。
 */
import { getDb, resolveDbPath, runInTransaction } from './db'
import { ADMIN_RESOURCE_DATA, type AdminRow } from './admin'
import { logger } from '../lib/logger'

/** 已知栏目 key 集合（seed key ∪ 库中已有 key），按 DB 路径缓存 */
let knownKeysCache: Set<string> | null = null
let knownKeysPath = ''
function knownKeys(): Set<string> {
  const current = resolveDbPath()
  if (knownKeysCache && knownKeysPath === current) return knownKeysCache
  const fromDb = (getDb().prepare('SELECT DISTINCT key FROM admin_resources').all() as Array<{ key: string }>).map(
    (row) => row.key,
  )
  knownKeysCache = new Set<string>([...Object.keys(ADMIN_RESOURCE_DATA), ...fromDb])
  knownKeysPath = current
  return knownKeysCache
}

/** 已初始化的数据库路径（DB_PATH 变化时需重新 seed） */
let initPath = ''

/** 初始化（幂等）：整表为空时用 seed 生成并写入 */
export function initAdminResources(): void {
  const db = getDb()
  const count = (db.prepare('SELECT COUNT(*) AS n FROM admin_resources').get() as { n: number }).n
  if (count > 0) return
  const keys = Object.keys(ADMIN_RESOURCE_DATA)
  runInTransaction((tx) => {
    const insert = tx.prepare('INSERT INTO admin_resources(key, id, data, sort) VALUES(?, ?, ?, ?)')
    for (const key of keys) {
      ADMIN_RESOURCE_DATA[key].forEach((row, index) => insert.run(key, String(row.id), JSON.stringify(row), index))
    }
  })
  logger.info('后台资源已由 seed 初始化', { keys: keys.length })
}

/** 内部取用（确保已初始化；DB_PATH 变化时重新 seed） */
function data(): void {
  if (initPath !== resolveDbPath()) {
    initAdminResources()
    initPath = resolveDbPath()
  }
}

/** 判断栏目是否存在 */
export function hasResource(key: string): boolean {
  data()
  return knownKeys().has(key)
}

/** 列表；未知栏目返回 undefined（按 sort 升序，sort 越小越靠前 / 越新） */
export function listResource(key: string): AdminRow[] | undefined {
  data()
  if (!knownKeys().has(key)) return undefined
  const rows = getDb()
    .prepare('SELECT data FROM admin_resources WHERE key = ? ORDER BY sort ASC, rowid ASC')
    .all(key) as Array<{ data: string }>
  return rows.map((row) => JSON.parse(row.data) as AdminRow)
}

/** 详情；未命中返回 undefined */
export function getResourceItem(key: string, id: string): AdminRow | undefined {
  data()
  const row = getDb().prepare('SELECT data FROM admin_resources WHERE key = ? AND id = ?').get(key, id) as
    | { data: string }
    | undefined
  return row ? (JSON.parse(row.data) as AdminRow) : undefined
}

/** 新建（id 缺失时自动生成）；写入后立即事务落库（置顶） */
export function createResourceItem(key: string, row: AdminRow): AdminRow {
  data()
  const id = typeof row.id === 'string' && row.id ? row.id : `new-${Date.now().toString(36)}`
  const item: AdminRow = { ...row, id }
  runInTransaction((tx) => {
    const min = (tx.prepare('SELECT COALESCE(MIN(sort), 0) AS m FROM admin_resources WHERE key = ?').get(key) as { m: number }).m
    tx.prepare('INSERT INTO admin_resources(key, id, data, sort) VALUES(?, ?, ?, ?)').run(key, id, JSON.stringify(item), min - 1)
  })
  return item
}

/** 更新（浅合并）；未命中返回 undefined；写入后立即事务落库 */
export function updateResourceItem(key: string, id: string, patch: AdminRow): AdminRow | undefined {
  data()
  const row = getDb().prepare('SELECT data FROM admin_resources WHERE key = ? AND id = ?').get(key, id) as
    | { data: string }
    | undefined
  if (!row) return undefined
  const item: AdminRow = { ...(JSON.parse(row.data) as AdminRow), ...patch, id }
  runInTransaction((tx) => {
    tx.prepare('UPDATE admin_resources SET data = ? WHERE key = ? AND id = ?').run(JSON.stringify(item), key, id)
  })
  return item
}

/** 删除；返回是否命中；写入后立即事务落库 */
export function deleteResourceItem(key: string, id: string): boolean {
  data()
  const result = runInTransaction((tx) => tx.prepare('DELETE FROM admin_resources WHERE key = ? AND id = ?').run(key, id))
  return Number(result.changes) > 0
}

/** 失效栏目 key 缓存（重置 / 恢复改写库后调用，避免读到过期 key 集合） */
export function invalidateResourceCache(): void {
  knownKeysCache = null
  knownKeysPath = ''
}

/**
 * 将后台资源重置为 seed：`key` 省略时重置**全部**栏目，否则仅重置该栏目。
 * 清空后按 seed 重建（单事务）；供后台「重置为初始」使用。
 */
export function resetAdminResources(key?: string): void {
  data()
  runInTransaction((tx) => {
    if (key) tx.prepare('DELETE FROM admin_resources WHERE key = ?').run(key)
    else tx.prepare('DELETE FROM admin_resources').run()
    const insert = tx.prepare('INSERT INTO admin_resources(key, id, data, sort) VALUES(?, ?, ?, ?)')
    const keys = key ? [key] : Object.keys(ADMIN_RESOURCE_DATA)
    for (const k of keys) {
      const rows = ADMIN_RESOURCE_DATA[k]
      if (!rows) continue
      rows.forEach((row, index) => insert.run(k, String(row.id), JSON.stringify(row), index))
    }
  })
  invalidateResourceCache()
}
