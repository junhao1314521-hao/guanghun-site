/**
 * 后台「角色与权限」栏目（只读视图）。
 * ============================================================
 * 数据来源为**代码事实**（后端未提供角色列表端点，本任务不改后端，故在前端常量中镜像）：
 *   - 角色真源：gh-server/src/data/roles.ts（`ROLES`：admin / operator；`scopesForRole`）。
 *   - 鉴权落点：gh-server/src/middleware/rbac.ts（`requireScope` / `requireResourceScope` →
 *     `hasScope`，未登录 401 / 无权限 403）；`resourceScope` + `isCollectionKey` 决定
 *     「栏目 → 所需 scope」。
 *   - 账号信息：`GET /api/admin/auth/me` → `{ role, roleName, scopes }`（经 useAdminAuth 提供）。
 *
 * 展示：① 两个角色的权限集；② 栏目 → 所需权限 对照表；③ 当前登录账号的角色与权限。
 * 本视图只读，不提供角色新建/编辑（后端无该端点）。
 */
import { useMemo } from 'react'
import { ADMIN_NAV, adminResource } from '../../data/adminResources'
// 「栏目 key → 所需权限」的单一映射源（与后端 rbac.ts / roles.ts 对照，见该文件头注释）
import { ROLES, SCOPE_DESC, hasScope, requiredScope, scopeText, type ScopeKey } from '../../data/adminScopes'
import { useAdminAuth } from './AdminAuth'
import { AdminPageHead } from './AdminPageHead'

export function AdminRolesView() {
  const { profile } = useAdminAuth()

  // 栏目 → 所需权限 对照行：遍历侧边导航（resource 项），保持与菜单同步
  const rows = useMemo(() => {
    const out: Array<{ group: string; label: string; key: string; scope: ScopeKey; note?: string }> = []
    for (const group of ADMIN_NAV) {
      for (const item of group.items) {
        if (item.kind !== 'resource') continue
        const res = adminResource(item.key)
        if (!res) continue
        out.push({ group: group.label, label: res.label, key: item.key, scope: requiredScope(item.key) })
      }
    }
    return out
  }, [])

  return (
    <div className="admin-page">
      <AdminPageHead
        title="角色与权限"
        desc="只读展示服务端 RBAC 的已知角色、权限集与「栏目 → 所需权限」对照。角色真源在服务端代码，此处仅镜像展示。"
      />

      {/* 当前登录账号 */}
      <section className="admin-panel">
        <div className="admin-panel__head">
          <h2 className="admin-panel__title">当前登录账号</h2>
        </div>
        {profile ? (
          <div className="admin-role-current">
            <div className="admin-role-current__item">
              <span className="admin-role-current__k">姓名</span>
              <span className="admin-role-current__v">{profile.name}</span>
            </div>
            <div className="admin-role-current__item">
              <span className="admin-role-current__k">账号</span>
              <span className="admin-role-current__v mono">{profile.username}</span>
            </div>
            <div className="admin-role-current__item">
              <span className="admin-role-current__k">角色</span>
              <span className="admin-role-current__v">
                {ROLES.find((r) => r.key === profile.role)?.name ?? profile.role}
                <span className="admin-cell--muted mono">（{profile.role}）</span>
              </span>
            </div>
            <div className="admin-role-current__item">
              <span className="admin-role-current__k">权限</span>
              <span className="admin-role-current__v admin-role-chips">
                {profile.scopes.length > 0 ? (
                  profile.scopes.map((scope) => (
                    <span className="tag tag--accent" key={scope}>
                      {scopeText(scope)}
                    </span>
                  ))
                ) : (
                  <span className="admin-cell--muted">无</span>
                )}
              </span>
            </div>
          </div>
        ) : (
          <p className="admin-page__desc">未获取到当前账号信息。</p>
        )}
      </section>

      {/* 角色与权限集 */}
      <section className="admin-panel">
        <div className="admin-panel__head">
          <h2 className="admin-panel__title">角色与权限集</h2>
        </div>
        <div className="admin-table-scroll">
          <table className="table admin-table">
            <thead>
              <tr>
                <th scope="col">角色</th>
                <th scope="col">权限集（scopes）</th>
                <th scope="col">说明</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((role) => (
                <tr key={role.key}>
                  <td>
                    <strong>{role.name}</strong>
                    <span className="admin-cell--muted mono">（{role.key}）</span>
                    {profile?.role === role.key && <span className="tag tag--accent" style={{ marginLeft: 'var(--gh-space-2)' }}>当前</span>}
                  </td>
                  <td>
                    <span className="admin-role-chips">
                      {role.scopes.map((scope) => (
                        <span className="tag" key={scope}>
                          {scopeText(scope)}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="admin-cell--muted">{role.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 栏目 → 所需权限 对照表 */}
      <section className="admin-panel">
        <div className="admin-panel__head">
          <h2 className="admin-panel__title">栏目 → 所需权限</h2>
        </div>
        <p className="admin-page__desc" style={{ marginBottom: 'var(--gh-space-3)' }}>
          依据服务端逐端点鉴权面（未登录 401 / 无权限 403）：内容类资源 = 内容与装修；备份 = 备份与恢复；
          发布 = 发布与回滚；其余资源（含重置） = 系统设置。
        </p>
        <div className="admin-table-scroll">
          <table className="table admin-table">
            <thead>
              <tr>
                <th scope="col">栏目组</th>
                <th scope="col">栏目</th>
                <th scope="col">key</th>
                <th scope="col">所需权限</th>
                <th scope="col" style={{ textAlign: 'center' }}>超级管理员</th>
                <th scope="col" style={{ textAlign: 'center' }}>内容运营</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="admin-cell--muted">{row.group}</td>
                  <td>
                    <strong>{row.label}</strong>
                  </td>
                  <td className="mono">{row.key}</td>
                  <td>
                    <span className="tag tag--accent">{scopeText(row.scope)}</span>
                  </td>
                  <td style={{ textAlign: 'center' }} className="admin-role-mark--yes">
                    {hasScope(ROLES[0].scopes, row.scope) ? '✓' : '—'}
                  </td>
                  <td style={{ textAlign: 'center' }} className={hasScope(ROLES[1].scopes, row.scope) ? 'admin-role-mark--yes' : 'admin-role-mark--no'}>
                    {hasScope(ROLES[1].scopes, row.scope) ? '✓' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 特殊端点对照 */}
      <section className="admin-panel">
        <div className="admin-panel__head">
          <h2 className="admin-panel__title">专用端点 → 所需权限</h2>
        </div>
        <div className="admin-table-scroll">
          <table className="table admin-table">
            <thead>
              <tr>
                <th scope="col">端点</th>
                <th scope="col">所需权限</th>
                <th scope="col">说明</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINT_ROWS.map((row) => (
                <tr key={row.path}>
                  <td className="mono">{row.path}</td>
                  <td>
                    {row.scope ? (
                      <span className="tag tag--accent">{scopeText(row.scope)}</span>
                    ) : (
                      <span className="tag">仅需登录</span>
                    )}
                  </td>
                  <td className="admin-cell--muted">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="admin-page__desc">
        权限类别说明：内容与装修 = {SCOPE_DESC.content}；备份与恢复 = {SCOPE_DESC.backups}；发布与回滚 ={' '}
        {SCOPE_DESC.publish}；系统设置 = {SCOPE_DESC.system}。
      </p>
    </div>
  )
}

/** 专用端点 → 所需权限（来源：各 router 的 requireScope 调用）；scope 为 null 表示仅需登录 */
const ENDPOINT_ROWS: Array<{ path: string; scope: ScopeKey | null; note: string }> = [
  { path: 'GET/POST /api/admin/pages*', scope: 'content', note: '页面列表 / 详情 / 保存 / 新建 / 删除 / 重置' },
  { path: 'PUT /api/admin/site', scope: 'content', note: '站点配置（导航 / 页脚）' },
  { path: 'PUT /api/admin/theme', scope: 'content', note: '站点级设计令牌覆盖' },
  { path: 'PUT /api/admin/blocks/enabled', scope: 'content', note: '组件库启用 / 停用区块类型' },
  { path: 'GET/POST/DELETE /api/admin/templates*', scope: 'content', note: '模板集合' },
  { path: 'GET/POST/PATCH/DELETE /api/admin/uploads*', scope: 'content', note: '素材上传 / 列表 / 元数据 / 删除' },
  { path: 'GET/POST/PATCH/PUT/DELETE /api/admin/media/folders*', scope: 'content', note: '素材文件夹' },
  { path: 'GET/POST/DELETE /api/admin/backups*', scope: 'backups', note: '备份列表 / 立即备份 / 下载 / 恢复 / 删除' },
  { path: 'GET/POST/DELETE /api/admin/publish*', scope: 'publish', note: '发布记录 / 立即发布 / 回滚 / 删除' },
  { path: 'POST /api/admin/reset', scope: 'system', note: '重置为初始 seed' },
  { path: 'GET/POST/DELETE /api/admin/resources/trash*', scope: 'system', note: '回收站：列表 / 恢复 / 彻底删除（软删除记录）' },
  { path: 'POST /api/track/view | /download', scope: null, note: '公开埋点（数据分析数据源，无需登录）' },
  { path: 'GET /api/admin/analytics/:scope', scope: null, note: '仅需登录（requireSession，无 scope 校验）；返回真实统计' },
  { path: 'GET/POST/PUT/DELETE /api/admin/resources/:key*', scope: 'content', note: '集合 / 内容类栏目 → content；其余栏目 → system（见上表逐栏目）' },
]
