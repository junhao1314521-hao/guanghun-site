/**
 * 角色与权限模型（RBAC）——服务端**单一真源**（PRD 阶段 4 / 逻辑 4C）。
 *
 * 角色数据自 v8 起落库（`admin_roles`，见 `roleStore.ts`，可新建 / 编辑 / 删除）；
 * 本模块负责「权限类别」枚举、角色名 / 权限集派生、以及栏目 → 所需权限的映射。
 *
 * 设计取舍：
 * - `admin_users.role` 列存**角色键**，`admin_users.scopes` 列冗余存由角色派生的权限集
 *   （便于直接查库核对）；会话用户对象（`AdminUser`）的 `scopes` 由角色**在读取时派生**
 *   （真相在 `roleStore`，改库即全局生效，不因历史列值产生分歧）。
 * - 兼容历史数据：历史中文展示名（如「超级管理员」「内容运营」）由 `normalizeRole` 归一化；
 *   未知角色一律按**最小权限**处理，避免越权。
 *
 * 权限（scope）类别：
 * - `content`：内容与装修（页面 / 站点 / 主题 / 区块开关 / 模板 / 上传 / 内容类集合与栏目）
 * - `backups`：备份 / 恢复
 * - `publish`：发布记录与回滚
 * - `system` ：系统设置（角色 / 员工 / 语言 / 接入 / 客户 / 设备 / 服务网点 / 通知 / 操作日志 / 回收站 / 重置）
 *
 * `'*'` 为通配：拥有全部权限。
 */
import { getRole, hasRole, scopesForKey } from './roleStore'

/** 权限（栏目 / 操作）类别 */
export type Scope = 'content' | 'backups' | 'publish' | 'system'

/** 全部权限类别（不含通配 `'*'`） */
export const ALL_SCOPES: Scope[] = ['content', 'backups', 'publish', 'system']

/** 角色键（自 v8 起为可新建的动态值，故放宽为字符串） */
export type RoleKey = string

/** 历史库中的中文展示名 → 角色键（向后兼容） */
const LEGACY_ROLE_ALIASES: Record<string, string> = {
  超级管理员: 'admin',
  内容运营: 'operator',
}

/** 判断字符串是否为已知角色键 */
export function isRoleKey(value: string): boolean {
  return hasRole(value)
}

/**
 * 归一化角色：已知键原样返回；命中历史中文别名则映射；
 * **未知一律按最小权限**（优先 operator，其次 admin，再退回首个角色）。
 */
export function normalizeRole(raw: string | null | undefined): RoleKey {
  const value = (raw ?? '').trim()
  if (isRoleKey(value)) return value
  const alias = LEGACY_ROLE_ALIASES[value]
  if (alias && hasRole(alias)) return alias
  if (hasRole('operator')) return 'operator'
  if (hasRole('admin')) return 'admin'
  return ''
}

/** 角色展示名（未知角色回退其键值本身） */
export function roleName(role: RoleKey): string {
  return getRole(role)?.name ?? role
}

/** 由角色派生权限集（返回副本，避免调用方误改真源；未知角色返回空 = 最小权限） */
export function scopesForRole(role: RoleKey): string[] {
  return [...scopesForKey(role)]
}

/** 权限判定：拥有通配 `'*'` 或恰好包含该 scope 即通过 */
export function hasScope(scopes: string[], scope: Scope): boolean {
  return scopes.includes('*') || scopes.includes(scope)
}

/**
 * 内容类「后台资源栏目」key（非集合，走 `admin_resources` 表）：
 * 归 `content` 权限，`operator` 可读写。
 * 已纳入集合的 11 个 key 由 `isCollectionKey` 判定，同样归 `content`。
 */
export const CONTENT_ADMIN_RESOURCE_KEYS: ReadonlySet<string> = new Set([
  'product-categories',
  'test-records',
  'methods',
  'taxonomy',
  'assets',
  'components',
  'styles',
  'pages',
  'nav',
])

/**
 * 后台资源 key → 所需 scope：
 * - 集合 key（`isCollection`）或内容类栏目 → `content`；
 * - 其余（角色 / 员工 / 语言 / 接入 / 客户 / 设备 / 服务网点 / 通知 / 操作日志 / 回收站 / 发布占位 等）→ `system`（**默认拒绝**，仅 admin）。
 */
export function resourceScope(key: string, isCollection: boolean): Scope {
  if (isCollection || CONTENT_ADMIN_RESOURCE_KEYS.has(key)) return 'content'
  return 'system'
}
