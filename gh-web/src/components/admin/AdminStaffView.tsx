/**
 * 后台「成员与权限 · 成员」页（真实 `admin_users` 账号）。
 * ============================================================
 * 取代旧「工作人员」资源集合（原为不可落库的演示行）：
 *   - 列表：`GET /api/admin/admin-users`（角色 / 权限集由服务端 roleStore 派生）；
 *   - 新建 / 编辑：账号、姓名、角色；口令遵循后台 10–64 位且含字母数字的强度规则；
 *   - 重置密码：一次性临时密码 + 强制下线；强制下线：作废该账号全部会话；
 *   - 删除：禁止删除当前登录账号、内置 admin 与最后一位超级管理员。
 */
import { useMemo, useState } from 'react'
import { fetchAdminRoles, type AdminRole } from '../../api/admin'
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  forceLogoutAdminUser,
  resetAdminUserPassword,
  updateAdminUser,
  type AdminTeamMember,
} from '../../api/adminUsers'
import { scopeText } from '../../data/adminScopes'
import { useApi } from '../../hooks/useApi'
import { useAdminAuth } from './AdminAuth'
import { Select } from './Select'
import { ErrorState, SkeletonTable } from './states'
import { useConfirm, useToast } from './feedback'
import { IconCopy } from '../ui/Icon'

/** 成员编辑表单状态 */
type EditorState =
  | { open: false }
  | { open: true; mode: 'create'; username: string; name: string; role: string; password: string }
  | { open: true; mode: 'edit'; id: string; username: string; name: string; role: string }

const CLOSED: EditorState = { open: false }

/** ISO → YYYY-MM-DD */
function fmtDate(iso: string): string {
  return iso ? iso.slice(0, 10) : '—'
}

/** 组件：成员列表与账号操作 */
export function AdminStaffView() {
  const { profile } = useAdminAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error } = useApi(
    (signal) => Promise.all([fetchAdminUsers(signal), fetchAdminRoles(signal)]),
    [reloadKey],
  )
  const members: AdminTeamMember[] = data?.[0]?.items ?? []
  const roles: AdminRole[] = data?.[1]?.items ?? []
  const [editor, setEditor] = useState<EditorState>(CLOSED)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)
  const [secret, setSecret] = useState<{ username: string; password: string } | null>(null)

  /** 角色下拉选项（保底显示当前值） */
  const roleOptions = useMemo(() => {
    const options = roles.map((role) => ({ value: role.key, label: `${role.name}（${role.key}）` }))
    return options.length > 0 ? options : [{ value: 'operator', label: '内容运营（operator）' }]
  }, [roles])

  const openCreate = () =>
    setEditor({
      open: true,
      mode: 'create',
      username: '',
      name: '',
      // 默认最小权限角色（内容运营），避免误建超级管理员
      role: roleOptions.find((option) => option.value === 'operator')?.value ?? roleOptions[0]?.value ?? 'operator',
      password: '',
    })

  const openEdit = (member: AdminTeamMember) =>
    setEditor({ open: true, mode: 'edit', id: member.id, username: member.username, name: member.name, role: member.role })

  const save = async () => {
    if (!editor.open) return
    setFormErr(null)
    setSaving(true)
    try {
      if (editor.mode === 'create') {
        await createAdminUser({
          username: editor.username.trim(),
          name: editor.name.trim(),
          role: editor.role,
          password: editor.password,
        })
        toast.success('成员已创建')
      } else {
        await updateAdminUser(editor.id, { name: editor.name.trim(), role: editor.role })
        toast.success('成员已保存')
      }
      setEditor(CLOSED)
      setReloadKey((key) => key + 1)
    } catch (ex) {
      setFormErr(ex instanceof Error ? ex.message : '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  const resetPassword = async (member: AdminTeamMember) => {
    const ok = await confirm({
      title: '重置登录密码',
      message: `将为「${member.name}（${member.username}）」生成一次性临时密码，并立即作废其全部后台会话。确定继续？`,
      confirmText: '重置',
      danger: true,
    })
    if (!ok) return
    try {
      const res = await resetAdminUserPassword(member.id)
      setSecret({ username: member.username, password: res.tempPassword })
      toast.success('密码已重置，请复制临时密码并转交成员')
      setReloadKey((key) => key + 1)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '重置失败，请稍后重试')
    }
  }

  const forceLogout = async (member: AdminTeamMember) => {
    const ok = await confirm({
      title: '强制下线',
      message: `将作废「${member.name}（${member.username}）」的全部后台会话（当前 ${member.sessionCount} 个）。确定继续？`,
      confirmText: '强制下线',
      danger: true,
    })
    if (!ok) return
    try {
      const res = await forceLogoutAdminUser(member.id)
      toast.success(res.removed > 0 ? `已作废 ${res.removed} 个会话` : '该成员当前没有有效会话')
      setReloadKey((key) => key + 1)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '操作失败，请稍后重试')
    }
  }

  const remove = async (member: AdminTeamMember) => {
    const ok = await confirm({
      title: '删除成员',
      message: `确定删除「${member.name}（${member.username}）」？该账号将无法再登录，操作不可恢复。`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteAdminUser(member.id)
      toast.success('成员已删除')
      setReloadKey((key) => key + 1)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '删除失败，请稍后重试')
    }
  }

  if (error) return <ErrorState message={error.message} onRetry={() => setReloadKey((key) => key + 1)} />

  return (
    <div className="access-pane">
      {secret && (
        <div className="members-secret" role="status">
          <div>
            <strong>临时密码（仅显示一次）· {secret.username}</strong>
            <code>{secret.password}</code>
          </div>
          <div className="access-secret__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(secret.password)
                  toast.success('临时密码已复制')
                } catch {
                  toast.error('复制失败，请手动选择文本复制')
                }
              }}
            >
              <IconCopy size={14} />
              复制
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSecret(null)}>
              关闭
            </button>
          </div>
        </div>
      )}

      <section className="admin-panel">
        <div className="admin-panel__head">
          <h2 className="admin-panel__title">后台成员</h2>
          <button className="btn btn--primary btn--sm" type="button" onClick={openCreate}>
            新建成员
          </button>
        </div>
        <p className="admin-page__desc" style={{ marginBottom: 'var(--gh-space-3)' }}>
          这里是可登录后台的真实账号；角色决定菜单与接口权限。当前登录：{profile?.name ?? '—'}（
          {profile?.username ?? '—'}）。
        </p>

        {loading && !data ? (
          <SkeletonTable columns={5} rows={4} />
        ) : (
          <div className="admin-table-scroll">
            <table className="table admin-table">
              <thead>
                <tr>
                  <th scope="col">成员</th>
                  <th scope="col">角色</th>
                  <th scope="col">权限集</th>
                  <th scope="col">会话</th>
                  <th scope="col">创建时间</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const isSelf = profile?.id === member.id
                  return (
                    <tr key={member.id}>
                      <td className="admin-cell--title" data-label="成员">
                        <strong>{member.name || '—'}</strong>
                        <span className="admin-cell--muted mono">（{member.username}）</span>
                        {member.builtin && (
                          <span className="tag" style={{ marginLeft: 'var(--gh-space-2)' }}>
                            内置
                          </span>
                        )}
                        {isSelf && (
                          <span className="tag tag--accent" style={{ marginLeft: 'var(--gh-space-2)' }}>
                            当前
                          </span>
                        )}
                      </td>
                      <td data-label="角色">
                        {member.roleName}
                        <span className="admin-cell--muted mono">（{member.role}）</span>
                      </td>
                      <td data-label="权限集">
                        <span className="admin-role-chips">
                          {member.scopes.map((scope) => (
                            <span className="tag" key={scope}>
                              {scopeText(scope)}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td data-label="会话">{member.sessionCount}</td>
                      <td data-label="创建时间">{fmtDate(member.createdAt)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="admin-table__actions" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn--ghost btn--sm" type="button" onClick={() => openEdit(member)}>
                            编辑
                          </button>
                          <button
                            className="btn btn--ghost btn--sm"
                            type="button"
                            onClick={() => void resetPassword(member)}
                          >
                            重置密码
                          </button>
                          <button
                            className="btn btn--ghost btn--sm"
                            type="button"
                            onClick={() => void forceLogout(member)}
                          >
                            强制下线
                          </button>
                          {!member.builtin && !isSelf && (
                            <button className="btn btn--ghost btn--sm" type="button" onClick={() => void remove(member)}>
                              删除
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {editor.open && (
          <div className="card" style={{ marginTop: 'var(--gh-space-5)' }}>
            <h3 className="card__title">{editor.mode === 'create' ? '新建成员' : `编辑成员：${editor.username}`}</h3>
            <div className="form-grid-2" style={{ marginTop: 'var(--gh-space-4)' }}>
              <div className="field">
                <label className="field__label" htmlFor="staff-username">
                  账号
                </label>
                <input
                  className="input"
                  id="staff-username"
                  value={editor.username}
                  disabled={editor.mode === 'edit'}
                  placeholder="3–32 位字母 / 数字 / . _ -"
                  onChange={(event) =>
                    setEditor((prev) => (prev.open ? { ...prev, username: event.target.value } : prev))
                  }
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="staff-name">
                  姓名
                </label>
                <input
                  className="input"
                  id="staff-name"
                  value={editor.name}
                  onChange={(event) => setEditor((prev) => (prev.open ? { ...prev, name: event.target.value } : prev))}
                />
              </div>
              <div className="field">
                <span className="field__label">角色</span>
                <Select
                  aria-label="成员角色"
                  value={editor.role}
                  onChange={(next) => setEditor((prev) => (prev.open ? { ...prev, role: next } : prev))}
                  options={roleOptions}
                />
              </div>
              {editor.mode === 'create' && (
                <div className="field">
                  <label className="field__label" htmlFor="staff-password">
                    初始密码
                  </label>
                  <input
                    className="input"
                    id="staff-password"
                    type="password"
                    value={editor.password}
                    placeholder="10–64 位，需含字母与数字"
                    onChange={(event) => {
                      if (editor.mode === 'create') setEditor({ ...editor, password: event.target.value })
                    }}
                  />
                </div>
              )}
            </div>
            {formErr && (
              <span className="field__error" style={{ display: 'block', marginTop: 'var(--gh-space-3)' }}>
                {formErr}
              </span>
            )}
            <div className="row" style={{ marginTop: 'var(--gh-space-5)' }}>
              <button
                className={`btn btn--primary${saving ? ' btn--loading' : ''}`}
                type="button"
                disabled={saving}
                onClick={() => void save()}
              >
                保存
              </button>
              <button className="btn btn--ghost" type="button" onClick={() => setEditor(CLOSED)}>
                取消
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
