/**
 * 后台角色存储（SQLite `admin_roles`）——角色可**新建 / 编辑 / 删除**。
 *
 * - 单一真源：角色的键 / 名称 / 说明 / 权限集（scopes）均落库；`roles.ts` 的
 *   `roleName` / `scopesForRole` / `normalizeRole` 由此查询，改库即全局生效。
 * - 内置角色（admin / operator，`builtin=1`）不可删除；`admin` 的权限固定为 `['*']`，避免误改导致越权。
 * - 删除角色前校验是否仍有后台账号在用（`admin_users.role`）。
 * - 首次访问空表时用内置两角色回填。
 */
import { randomBytes } from 'node:crypto'
import { getDb, resolveDbPath } from './db'

/** 后台角色定义 */
export type AdminRole = {
  key: string
  name: string
  desc: string
  scopes: string[]
  /** 内置角色不可删除 */
  builtin: boolean
}

/** 内置角色种子 */
const SEED: AdminRole[] = [
  {
    key: 'admin',
    name: '超级管理员',
    desc: '拥有全部权限（内容 / 备份 / 发布 / 系统设置）。',
    scopes: ['*'],
    builtin: true,
  },
  {
    key: 'operator',
    name: '内容运营',
    desc: '内容类权限（页面 / 集合读写、装修、上传）；不含角色 / 备份 / 发布 / 系统设置。',
    scopes: ['content'],
    builtin: true,
  },
]

type RoleRow = { key: string; name: string; desc: string | null; scopes: string; builtin: number }

function rowToRole(row: RoleRow): AdminRole {
  let scopes: string[] = []
  try {
    const parsed = JSON.parse(row.scopes) as unknown
    if (Array.isArray(parsed)) scopes = parsed.map(String)
  } catch {
    scopes = []
  }
  return { key: row.key, name: row.name, desc: row.desc ?? '', scopes, builtin: row.builtin === 1 }
}

/** 已就绪的数据库路径（DB_PATH 变化时重新检查 / 回填） */
let readyPath = ''

/** 确保表已按内置角色回填（空表时）；**不使用事务**，避免与调用方事务嵌套 */
function ready(): void {
  const db = getDb()
  const path = resolveDbPath()
  if (readyPath === path) return
  const count = (db.prepare('SELECT COUNT(*) AS n FROM admin_roles').get() as { n: number }).n
  if (count === 0) {
    const insert = db.prepare(
      'INSERT INTO admin_roles(key, name, desc, scopes, builtin, sort, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)',
    )
    SEED.forEach((role, index) =>
      insert.run(role.key, role.name, role.desc, JSON.stringify(role.scopes), 1, index, new Date().toISOString()),
    )
  }
  readyPath = path
}

/** 全部角色（按 sort 升序） */
export function listRoles(): AdminRole[] {
  ready()
  const rows = getDb()
    .prepare('SELECT key, name, desc, scopes, builtin FROM admin_roles ORDER BY sort ASC, rowid ASC')
    .all() as RoleRow[]
  return rows.map(rowToRole)
}

/** 按 key 取角色；未命中返回 undefined */
export function getRole(key: string): AdminRole | undefined {
  ready()
  const row = getDb()
    .prepare('SELECT key, name, desc, scopes, builtin FROM admin_roles WHERE key = ?')
    .get(key) as RoleRow | undefined
  return row ? rowToRole(row) : undefined
}

/** 角色是否存在 */
export function hasRole(key: string): boolean {
  return Boolean(getRole(key))
}

/** 由角色键派生权限集（未知角色返回空数组 = 最小权限） */
export function scopesForKey(key: string): string[] {
  return getRole(key)?.scopes ?? []
}

/** 生成唯一且可读的角色键 */
function newRoleKey(): string {
  let key = ''
  do {
    key = `role-${randomBytes(3).toString('hex')}`
  } while (hasRole(key))
  return key
}

export type RoleWriteOutcome = { ok: true; role: AdminRole } | { ok: false; error: string }

/** 新建角色：名称必填、键唯一（可指定，须为小写字母开头）、至少一项权限 */
export function createRole(input: { key?: string; name: string; desc?: string; scopes: string[] }): RoleWriteOutcome {
  ready()
  const name = (input.name ?? '').trim()
  if (!name) return { ok: false, error: '请填写角色名称' }
  const scopes = Array.from(new Set((input.scopes ?? []).map(String).filter(Boolean)))
  if (scopes.length === 0) return { ok: false, error: '请至少选择一项权限' }
  const requested = (input.key ?? '').trim()
  if (requested && !/^[a-z][a-z0-9-]{1,31}$/.test(requested)) {
    return { ok: false, error: '角色键需以小写字母开头，仅含小写字母、数字与连字符' }
  }
  if (requested && hasRole(requested)) return { ok: false, error: '该角色键已存在' }
  const key = requested || newRoleKey()
  const desc = (input.desc ?? '').trim()
  const maxSort = (getDb().prepare('SELECT COALESCE(MAX(sort), -1) AS m FROM admin_roles').get() as { m: number }).m
  getDb()
    .prepare('INSERT INTO admin_roles(key, name, desc, scopes, builtin, sort, created_at) VALUES(?, ?, ?, ?, 0, ?, ?)')
    .run(key, name, desc, JSON.stringify(scopes), maxSort + 1, new Date().toISOString())
  return { ok: true, role: { key, name, desc, scopes, builtin: false } }
}

/** 编辑角色：可改名称 / 说明 / 权限集；`admin` 的权限固定为 `['*']`，键不可改 */
export function updateRole(key: string, patch: { name?: string; desc?: string; scopes?: string[] }): RoleWriteOutcome {
  ready()
  const current = getRole(key)
  if (!current) return { ok: false, error: '未找到该角色' }
  const name = patch.name !== undefined ? patch.name.trim() : current.name
  if (!name) return { ok: false, error: '请填写角色名称' }
  const desc = patch.desc !== undefined ? patch.desc.trim() : current.desc
  let scopes = patch.scopes !== undefined ? Array.from(new Set(patch.scopes.map(String).filter(Boolean))) : current.scopes
  if (key === 'admin') scopes = ['*']
  if (scopes.length === 0) return { ok: false, error: '请至少选择一项权限' }
  getDb()
    .prepare('UPDATE admin_roles SET name = ?, desc = ?, scopes = ? WHERE key = ?')
    .run(name, desc, JSON.stringify(scopes), key)
  return { ok: true, role: { key, name, desc, scopes, builtin: current.builtin } }
}

/** 删除角色：内置角色不可删除；仍有后台账号使用该角色时拒绝删除 */
export function deleteRole(key: string): { ok: true } | { ok: false; error: string } {
  ready()
  const current = getRole(key)
  if (!current) return { ok: false, error: '未找到该角色' }
  if (current.builtin) return { ok: false, error: '内置角色不可删除' }
  const inUse = (getDb().prepare('SELECT COUNT(*) AS n FROM admin_users WHERE role = ?').get(key) as { n: number }).n
  if (inUse > 0) return { ok: false, error: `该角色仍有 ${inUse} 个账号在用，无法删除` }
  getDb().prepare('DELETE FROM admin_roles WHERE key = ?').run(key)
  return { ok: true }
}
