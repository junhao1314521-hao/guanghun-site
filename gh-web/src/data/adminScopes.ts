/**
 * 后台 RBAC 权限（scope）↔ 栏目 的**单一映射源**（前端镜像，非真源）。
 * ============================================================
 * 后端真源（只消费，不改动）：
 *   - 角色与权限集：gh-server/src/data/roles.ts（`ROLES`：admin=`['*']`、operator=`['content']`；
 *     `hasScope`、`resourceScope`、`CONTENT_ADMIN_RESOURCE_KEYS`）。
 *   - 逐端点鉴权落点：gh-server/src/middleware/rbac.ts（`requireScope` / `requireResourceScope` →
 *     `hasScope`；未登录 401 / 无权限 403）。集合归属由 collectionStore.ts `isCollectionKey` 判定。
 *
 * 本模块供两处复用，避免「菜单裁剪」与「角色与权限页」各写一份映射而漂移：
 *   - pages/admin/AdminLayout.tsx：按登录账号 scopes 裁剪侧栏；
 *   - components/admin/AdminRolesView.tsx：只读展示「栏目 → 所需权限」对照。
 *
 * 注意：菜单裁剪只是**体验优化**，不替代后端鉴权（越权请求仍会被后端 403 拦截）。
 */

/** 权限（栏目 / 操作）类别；`'*'` 为通配（全部权限） */
export type ScopeKey = 'content' | 'backups' | 'publish' | 'system' | '*'

/** 权限中文名（来源：roles.ts 顶部权限类别说明） */
export const SCOPE_LABEL: Record<string, string> = {
  '*': '全部权限',
  content: '内容与装修',
  backups: '备份与恢复',
  publish: '发布与回滚',
  system: '系统设置',
}

/** 权限说明（来源：roles.ts 注释） */
export const SCOPE_DESC: Record<string, string> = {
  content: '页面 / 站点 / 主题 / 区块开关 / 模板 / 上传，以及内容类集合与栏目',
  backups: '备份 / 恢复',
  publish: '发布记录与回滚',
  system: '角色 / 员工 / 语言 / 接入 / 客户 / 设备 / 服务网点 / 通知 / 操作日志 / 回收站 / 重置',
}

/** 已知角色（来源：服务端 `admin_roles` 表，经 GET /api/admin/roles 提供）——
 *  前端不再镜像常量；此处仅保留「栏目 → 所需权限」映射，供菜单裁剪与角色页展示。 */

/**
 * 归 `content` 权限的栏目 key：
 *   - 集合（collectionStore.ts `COLLECTION_KEYS`，共 11 个）：products / rankings / articles /
 *     downloads / faqs / models / biz-content / biz-cases / biz-venues / inquiries / templates；
 *   - 内容类后台资源（roles.ts `CONTENT_ADMIN_RESOURCE_KEYS`，共 9 个）：product-categories /
 *     test-records / methods / taxonomy / assets / components / styles / pages / nav；
 *   - 站点配置 `site`：经专用端点 PUT /api/admin/site，亦需 content（见 adminPagesRouter.ts）。
 * 其余栏目 → `system`（后端默认拒绝，仅 admin）。
 */
export const CONTENT_SCOPED_KEYS: ReadonlySet<string> = new Set<string>([
  // 集合（collectionStore.ts COLLECTION_KEYS）
  'products', 'rankings', 'articles', 'downloads', 'faqs', 'models',
  'biz-content', 'biz-cases', 'biz-venues', 'inquiries', 'templates',
  // 内容类后台资源（roles.ts CONTENT_ADMIN_RESOURCE_KEYS）
  'product-categories', 'test-records', 'methods', 'taxonomy',
  'assets', 'components', 'styles', 'pages', 'nav',
  // 站点配置（adminPagesRouter.ts PUT /site）
  'site',
])

/**
 * 栏目 key → 所需 scope（镜像 rbac.ts `resourceScope` + publish/backups 专用端点）。
 * 未知 key 按**最小权限**处理 → `system`（与后端默认拒绝一致；admin 因持有 `'*'` 仍全显）。
 */
export function requiredScope(key: string): ScopeKey {
  if (key === 'publish') return 'publish'
  if (key === 'backups') return 'backups'
  return CONTENT_SCOPED_KEYS.has(key) ? 'content' : 'system'
}

/** 权限判定：拥有通配 `'*'` 或恰好包含该 scope 即通过（镜像 roles.ts `hasScope`） */
export function hasScope(scopes: readonly string[], scope: ScopeKey): boolean {
  return scopes.includes('*') || scopes.includes(scope)
}

/** 权限名展示（未知回退原值） */
export function scopeText(scope: string): string {
  return SCOPE_LABEL[scope] ?? scope
}
