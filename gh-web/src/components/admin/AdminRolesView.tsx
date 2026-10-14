/**
 * 后台「角色与权限」栏目（可新建 / 编辑 / 删除）。
 * ============================================================
 * 数据来源为服务端**单一真源**（SQLite `admin_roles`，经 `GET /api/admin/roles` 提供）：
 *   - 角色真源：gh-server/src/data/roleStore.ts（可增删改；内置 admin / operator 不可删除）。
 *   - 鉴权落点：gh-server/src/middleware/rbac.ts（`requireScope` / `requireResourceScope` →
 *     `hasScope`，未登录 401 / 无权限 403）；`resourceScope` + `isCollectionKey` 决定
 *     「栏目 → 所需 scope」。
 *   - 账号信息：`GET /api/admin/auth/me` → `{ role, roleName, scopes }`（经 useAdminAuth 提供）。
 *
 * 展示：① 当前登录账号；② 角色 CRUD（新建 / 编辑权限集 / 删除）；
 * ③ 栏目 → 所需权限 对照表；④ 专用端点 → 所需权限。
 */
import { useEffect, useMemo, useState } from 'react'
import { ADMIN_NAV, adminResource } from '../../data/adminResources'
import { SCOPE_DESC, hasScope, requiredScope, scopeText, type ScopeKey } from '../../data/adminScopes'
import { createAdminRole, deleteAdminRole, fetchAdminRoles, updateAdminRole, type AdminRole } from '../../api/admin'
import { useApi } from '../../hooks/useApi'
import { useConfirm, useToast } from './feedback'
import { useAdminAuth } from './AdminAuth'
import { AdminPageHead } from './AdminPageHead'

/** 通配权限 */
const WILDCARD = '*'

/** 角色编辑表单初始态 */
type EditorState = { open: false } | { open: true; mode: 'create' | 'edit'; key: string; name: string; desc: string; scopes: string[] }

const CLOSED: EditorState = { open: false }

export function AdminRolesView() {
  const { profile } = useAdminAuth()
  const toast = useToast()
  const confirm = useConfirm()

  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error } = useApi((signal) => fetchAdminRoles(signal), [reloadKey])
  const roles: AdminRole[] = data?.items ?? []
  const allScopes = data?.allScopes ?? ['content', 'backups', 'publish', 'system']

  const [editor, setEditor] = useState<EditorState>(CLOSED)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)

  // 关闭编辑面板时清空错误
  useEffect(() => {
    if (!editor.open) setFormErr(null)
  }, [editor.open])

  // 栏目 → 所需权限 对照行：遍历侧边导航（resource 项），保持与菜单同步
  const rows = useMemo(() => {
    const out: Array<{ group: string; label: string; key: string; scope: ScopeKey }> = []
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

  const openCreate = () => setEditor({ open: true, mode: 'create', key: '', name: '', desc: '', scopes: ['content'] })
  const openEdit = (role: AdminRole) =>
    setEditor({ open: true, mode: 'edit', key: role.key, name: role.name, desc: role.desc, scopes: [...role.scopes] })

  const toggleScope = (scope: string) => {
    setEditor((prev) => {
      if (!prev.open) return prev
      if (scope === WILDCARD) {
        return { ...prev, scopes: prev.scopes.includes(WILDCARD) ? [] : [WILDCARD] }
      }
      // 勾选具体权限时移除通配；再次点击取消该项
      const base = prev.scopes.filter((s) => s !== WILDCARD)
      const next = base.includes(scope) ? base.filter((s) => s !== scope) : [...base, scope]
      return { ...prev, scopes: next }
    })
  }

  const save = async () => {
    if (!editor.open) return
    setFormErr(null)
    if (!editor.name.trim()) {
      setFormErr('请填写角色名称')
      return
    }
    if (editor.scopes.length === 0) {
      setFormErr('请至少选择一项权限')
      return
    }
    setSaving(true)
    try {
      if (editor.mode === 'create') {
        await createAdminRole({
          key: editor.key.trim() || undefined,
          name: editor.name.trim(),
          desc: editor.desc.trim(),
          scopes: editor.scopes,
        })
        toast.success('角色已创建')
      } else {
        await updateAdminRole(editor.key, { name: editor.name.trim(), desc: editor.desc.trim(), scopes: editor.scopes })
        toast.success('角色已保存')
      }
      setEditor(CLOSED)
      setReloadKey((key) => key + 1)
    } catch (ex) {
      setFormErr(ex instanceof Error ? ex.message : '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (role: AdminRole) => {
    const ok = await confirm({
      title: '删除角色',
      message: `确定删除角色「${role.name}」？该操作不可恢复。`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteAdminRole(role.key)
      toast.success('角色已删除')
      setReloadKey((key) => key + 1)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '删除失败')
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHead
        title="角色与权限"
        desc="管理系统角色与其权限集（scopes）。角色数据存于服务端，内置角色不可删除。"
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
                {roles.find((r) => r.key === profile.role)?.name ?? profile.role}
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

      {/* 角色与权限集（可增删改） */}
      <section className="admin-panel">
        <div className="admin-panel__head">
          <h2 className="admin-panel__title">角色与权限集</h2>
          <button className="btn btn--primary btn--sm" type="button" onClick={openCreate}>
            新建角色
          </button>
        </div>

        {error ? (
          <div className="alert alert--danger" role="alert">
            {error.message}
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="table admin-table">
              <thead>
                <tr>
                  <th scope="col">角色</th>
                  <th scope="col">权限集（scopes）</th>
                  <th scope="col">说明</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && roles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="admin-cell--muted">
                      加载中…
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.key}>
                      <td>
                        <strong>{role.name}</strong>
                        <span className="admin-cell--muted mono">（{role.key}）</span>
                        {role.builtin && (
                          <span className="tag" style={{ marginLeft: 'var(--gh-space-2)' }}>
                            内置
                          </span>
                        )}
                        {profile?.role === role.key && (
                          <span className="tag tag--accent" style={{ marginLeft: 'var(--gh-space-2)' }}>
                            当前
                          </span>
                        )}
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
                      <td style={{ textAlign: 'right' }}>
                        <div className="admin-table__actions" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn--ghost btn--sm" type="button" onClick={() => openEdit(role)}>
                            编辑
                          </button>
                          {!role.builtin && (
                            <button className="btn btn--ghost btn--sm" type="button" onClick={() => void remove(role)}>
                              删除
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 编辑 / 新建面板 */}
        {editor.open && (
          <div className="card" style={{ marginTop: 'var(--gh-space-5)' }}>
            <h3 className="card__title">{editor.mode === 'create' ? '新建角色' : `编辑角色：${editor.key}`}</h3>
            <div className="form-grid-2" style={{ marginTop: 'var(--gh-space-4)' }}>
              <div className="field">
                <label className="field__label" htmlFor="roleName">
                  角色名称
                </label>
                <input
                  className="input"
                  id="roleName"
                  value={editor.name}
                  onChange={(event) => setEditor({ ...editor, name: event.target.value })}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="roleKey">
                  角色键（可选）
                </label>
                <input
                  className="input"
                  id="roleKey"
                  value={editor.key}
                  disabled={editor.mode === 'edit'}
                  placeholder="留空自动生成，如 editor"
                  onChange={(event) => setEditor({ ...editor, key: event.target.value })}
                />
                <span className="field__hint">小写字母开头，仅含小写字母、数字与连字符。</span>
              </div>
            </div>
            <div className="field" style={{ marginTop: 'var(--gh-space-4)' }}>
              <label className="field__label" htmlFor="roleDesc">
                说明
              </label>
              <input
                className="input"
                id="roleDesc"
                value={editor.desc}
                onChange={(event) => setEditor({ ...editor, desc: event.target.value })}
              />
            </div>
            <div className="field" style={{ marginTop: 'var(--gh-space-4)' }}>
              <span className="field__label">权限集</span>
              <div className="admin-role-chips" style={{ gap: 'var(--gh-space-3)' }}>
                <label className="switch" style={{ gap: 'var(--gh-space-2)' }}>
                  <input
                    type="checkbox"
                    checked={editor.scopes.includes(WILDCARD)}
                    disabled={editor.mode === 'edit' && editor.key === 'admin'}
                    onChange={() => toggleScope(WILDCARD)}
                  />
                  <span>{scopeText(WILDCARD)}</span>
                </label>
                {allScopes.map((scope) => (
                  <label className="switch" key={scope} style={{ gap: 'var(--gh-space-2)' }}>
                    <input
                      type="checkbox"
                      checked={editor.scopes.includes(scope)}
                      disabled={editor.scopes.includes(WILDCARD) || (editor.mode === 'edit' && editor.key === 'admin')}
                      onChange={() => toggleScope(scope)}
                    />
                    <span>{scopeText(scope)}</span>
                  </label>
                ))}
              </div>
              {editor.mode === 'edit' && editor.key === 'admin' && (
                <span className="field__hint">超级管理员固定拥有全部权限，不可修改权限集。</span>
              )}
            </div>
            {formErr && (
              <span className="field__error" style={{ display: 'block', marginTop: 'var(--gh-space-3)' }}>
                {formErr}
              </span>
            )}
            <div className="row" style={{ marginTop: 'var(--gh-space-5)' }}>
              <button className={`btn btn--primary${saving ? ' btn--loading' : ''}`} type="button" disabled={saving} onClick={save}>
                保存
              </button>
              <button className="btn btn--ghost" type="button" onClick={() => setEditor(CLOSED)}>
                取消
              </button>
            </div>
          </div>
        )}
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
                {roles.map((role) => (
                  <th scope="col" key={role.key} style={{ textAlign: 'center' }}>
                    {role.name}
                  </th>
                ))}
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
                  {roles.map((role) => (
                    <td
                      key={role.key}
                      style={{ textAlign: 'center' }}
                      className={hasScope(role.scopes, row.scope) ? 'admin-role-mark--yes' : 'admin-role-mark--no'}
                    >
                      {hasScope(role.scopes, row.scope) ? '✓' : '—'}
                    </td>
                  ))}
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
  { path: 'GET/POST/PUT/DELETE /api/admin/roles*', scope: 'system', note: '角色列表 / 新建 / 编辑 / 删除' },
  { path: 'GET/POST/DELETE /api/admin/resources/trash*', scope: 'system', note: '回收站：列表 / 恢复 / 彻底删除（软删除记录）' },
  { path: 'POST /api/track/view | /download', scope: null, note: '公开埋点（数据分析数据源，无需登录）' },
  { path: 'GET /api/admin/analytics/:scope', scope: 'content', note: '数据分析（requireSession + content 权限）；返回真实统计' },
  { path: 'GET/POST/PUT/DELETE /api/admin/resources/:key*', scope: 'content', note: '集合 / 内容类栏目 → content；其余栏目 → system（见上表逐栏目）' },
]
