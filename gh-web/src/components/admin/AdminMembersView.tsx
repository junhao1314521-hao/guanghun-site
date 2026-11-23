/**
 * 后台「会员管理」栏目（真实前台账号，非资源集合演示数据）。
 * ============================================================
 * 数据源：`GET /api/admin/members`（SQLite `users` 表，列表与详情默认脱敏）。
 * 操作：冻结 / 解冻、重置密码（一次性临时密码）、强制下线、查看完整联系方式（写审计）。
 *
 * 与旧「客户」假集合的区别：这里每一条都是前台真实注册账号，设备数与会话数来自
 * `device_registrations` / `user_sessions` 的真实统计；不存在无法落库的演示行。
 */
import { useEffect, useMemo, useState } from 'react'
import {
  fetchAdminMember,
  fetchAdminMembers,
  fetchMemberTags,
  forceLogoutMember,
  resetMemberPassword,
  revealMemberContact,
  setMemberStatus,
  updateMemberOps,
  type AdminMember,
  type AdminMemberDetail,
} from '../../api/members'
import { useApi } from '../../hooks/useApi'
import { AdminPageHead } from '../../components/admin/AdminPageHead'
import { Select } from '../../components/admin/Select'
import { EmptyState, ErrorState, SkeletonTable } from '../../components/admin/states'
import { useConfirm, useToast } from '../../components/admin/feedback'
import { IconChevronLeft, IconChevronRight, IconClose, IconCopy, IconSearch } from '../ui/Icon'

/** 每页条数（会员列表固定 20，保持分页简单） */
const PAGE_SIZE = 20

/** ISO → YYYY-MM-DD */
function fmtDate(iso: string): string {
  return iso ? iso.slice(0, 10) : '—'
}

/** ISO → YYYY-MM-DD HH:mm（本地时区） */
function fmtDateTime(iso: string): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 行内状态标签 */
function StatusTag({ status }: { status: AdminMember['status'] }) {
  return (
    <span className={`status status--${status === 'frozen' ? 'danger' : 'success'}`}>
      {status === 'frozen' ? '已冻结' : '正常'}
    </span>
  )
}

/** 分页器 */
function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="members-pager">
      <button type="button" className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <IconChevronLeft size={14} />
        上一页
      </button>
      <span className="members-pager__text">
        第 {page} / {totalPages} 页
      </span>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        下一页
        <IconChevronRight size={14} />
      </button>
    </div>
  )
}

/** 复制到剪贴板（失败给出可见提示，不静默） */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** 详情弹窗：读取真实详情，承载冻结 / 重置 / 强制下线 / 查看完整联系方式 */
function MemberDetailDialog({
  id,
  onClose,
  onChanged,
}: {
  id: string
  onClose: () => void
  onChanged: () => void
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const [detail, setDetail] = useState<AdminMemberDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [fullContact, setFullContact] = useState<{ email: string; phone: string } | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [tagsDraft, setTagsDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')

  /** 拉取详情（操作后刷新） */
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetchAdminMember(id, controller.signal)
      .then((item) => {
        setDetail(item)
        setTagsDraft(item.tags.join('，'))
        setNoteDraft(item.note)
      })
      .catch((ex: unknown) => {
        if ((ex as { name?: string })?.name === 'AbortError') return
        setError(ex instanceof Error ? ex.message : '加载失败')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [id])

  // Esc 关闭
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggleStatus = async () => {
    if (!detail) return
    const next = detail.status === 'frozen' ? 'active' : 'frozen'
    const ok = await confirm(
      next === 'frozen'
        ? {
            title: '冻结会员',
            message: `冻结后「${detail.name}」将立即下线且无法登录，可随时解冻。确定继续？`,
            confirmText: '冻结',
            danger: true,
          }
        : {
            title: '解冻会员',
            message: `解冻后「${detail.name}」可重新登录。确定继续？`,
            confirmText: '解冻',
          },
    )
    if (!ok) return
    setBusy(true)
    try {
      const res = await setMemberStatus(detail.id, next)
      setDetail((prev) => (prev ? { ...prev, ...res.item } : prev))
      toast.success(next === 'frozen' ? '已冻结并强制下线' : '已解冻')
      onChanged()
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '操作失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async () => {
    if (!detail) return
    const ok = await confirm({
      title: '重置登录密码',
      message: `将为「${detail.name}」生成一次性临时密码，并立即作废其全部登录会话。临时密码只显示一次，请及时转交。确定继续？`,
      confirmText: '重置',
      danger: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      const res = await resetMemberPassword(detail.id)
      setTempPassword(res.tempPassword)
      setDetail((prev) => (prev ? { ...prev, sessionCount: 0, sessions: [] } : prev))
      toast.success('密码已重置，请复制临时密码并转交会员')
      onChanged()
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '重置失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  const forceLogout = async () => {
    if (!detail) return
    const ok = await confirm({
      title: '强制下线',
      message: `将作废「${detail.name}」的全部登录会话（当前 ${detail.sessionCount} 个有效会话）。确定继续？`,
      confirmText: '强制下线',
      danger: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      const res = await forceLogoutMember(detail.id)
      setDetail((prev) => (prev ? { ...prev, sessionCount: 0, sessions: [] } : prev))
      toast.success(res.removed > 0 ? `已作废 ${res.removed} 个会话` : '该会员当前没有有效会话')
      onChanged()
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '操作失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  const reveal = async () => {
    if (!detail) return
    try {
      const contact = await revealMemberContact(detail.id)
      setFullContact(contact)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '读取失败，请稍后重试')
    }
  }

  /** 保存运营标签 / 内部备注（真实落库，仅后台可见） */
  const saveOps = async () => {
    if (!detail) return
    setBusy(true)
    try {
      const res = await updateMemberOps(detail.id, {
        tags: tagsDraft.split(/[,，\s]+/).map((tag) => tag.trim()).filter(Boolean),
        note: noteDraft,
      })
      setDetail(res.item)
      toast.success('运营信息已保存')
      onChanged()
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '保存失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-dialog-overlay" role="presentation" onClick={onClose}>
      <div
        className="admin-dialog admin-dialog--wide members-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="members-detail__head">
          <div>
            <h2 className="admin-dialog__title" id="member-detail-title">
              {detail ? detail.name : '会员详情'}
            </h2>
            {detail && <p className="members-detail__sub">@{detail.username}</p>}
          </div>
          <button type="button" className="btn btn--ghost btn--sm" aria-label="关闭" onClick={onClose}>
            <IconClose size={16} />
          </button>
        </div>

        {loading && <SkeletonTable columns={2} rows={4} />}
        {error && <ErrorState message={error} />}

        {detail && !loading && (
          <>
            <dl className="members-detail__grid">
              <div>
                <dt>状态</dt>
                <dd>
                  <StatusTag status={detail.status} />
                </dd>
              </div>
              <div>
                <dt>注册时间</dt>
                <dd>{fmtDateTime(detail.createdAt)}</dd>
              </div>
              <div>
                <dt>最近登录</dt>
                <dd>{fmtDateTime(detail.lastLoginAt)}</dd>
              </div>
              <div>
                <dt>有效会话</dt>
                <dd>{detail.sessionCount}</dd>
              </div>
              <div>
                <dt>登记设备</dt>
                <dd>{detail.deviceCount}</dd>
              </div>
              <div>
                <dt>冻结时间</dt>
                <dd>{detail.status === 'frozen' ? fmtDateTime(detail.frozenAt) : '—'}</dd>
              </div>
              <div className="members-detail__field">
                <dt>邮箱</dt>
                <dd>{fullContact ? fullContact.email : detail.email || '未填写'}</dd>
              </div>
              <div className="members-detail__field">
                <dt>手机号</dt>
                <dd>{fullContact ? fullContact.phone || '未填写' : detail.phone || '未填写'}</dd>
              </div>
            </dl>

            {!fullContact && (detail.email || detail.phone) && (
              <p className="members-detail__reveal">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => void reveal()}>
                  查看完整联系方式
                </button>
                <span className="field__hint">明文读取会记入审计日志。</span>
              </p>
            )}

            {tempPassword && (
              <div className="members-secret" role="status">
                <div>
                  <strong>临时密码（仅显示一次）</strong>
                  <code>{tempPassword}</code>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={async () => {
                    const ok = await copyText(tempPassword)
                    if (ok) toast.success('临时密码已复制')
                    else toast.error('复制失败，请手动选择文本复制')
                  }}
                >
                  <IconCopy size={14} />
                  复制
                </button>
              </div>
            )}

            <section className="members-ops">
              <h3>会员运营</h3>
              <div className="members-ops__grid">
                <div className="field">
                  <label className="field__label" htmlFor="member-tags">
                    运营标签
                  </label>
                  <input
                    id="member-tags"
                    className="input"
                    value={tagsDraft}
                    placeholder="用逗号分隔，如：VIP，高价值，待回访"
                    onChange={(event) => setTagsDraft(event.target.value)}
                  />
                  <span className="field__hint">仅后台内部可见，用于筛选与跟进。</span>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="member-note">
                    内部备注
                  </label>
                  <textarea
                    id="member-note"
                    className="textarea"
                    rows={2}
                    value={noteDraft}
                    placeholder="记录沟通结论、偏好或风险提示；不会对会员展示。"
                    onChange={(event) => setNoteDraft(event.target.value)}
                  />
                </div>
              </div>
              <div className="members-ops__foot">
                <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => void saveOps()}>
                  保存运营信息
                </button>
              </div>
            </section>

            <div className="members-detail__sections">
              <section>
                <h3>最近会话</h3>
                {detail.sessions.length === 0 ? (
                  <p className="field__hint">暂无有效会话</p>
                ) : (
                  <ul className="members-detail__list">
                    {detail.sessions.map((session) => (
                      <li key={`${session.createdAt}-${session.expiresAt}`}>
                        <span>登录于 {fmtDateTime(session.createdAt)}</span>
                        <span className="field__hint">有效至 {fmtDateTime(session.expiresAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <h3>设备登记</h3>
                {detail.devices.length === 0 ? (
                  <p className="field__hint">暂无设备登记</p>
                ) : (
                  <ul className="members-detail__list">
                    {detail.devices.map((device) => (
                      <li key={device.id}>
                        <span>
                          {device.model} · {device.sn}
                        </span>
                        <span className="field__hint">
                          {device.status} · {fmtDate(device.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="admin-dialog__foot members-detail__actions">
              <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => void forceLogout()}>
                强制下线
              </button>
              <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => void resetPassword()}>
                重置密码
              </button>
              <button
                type="button"
                className={`btn btn--sm ${detail.status === 'frozen' ? 'btn--primary' : 'btn--danger-ghost'}`}
                disabled={busy}
                onClick={() => void toggleStatus()}
              >
                {detail.status === 'frozen' ? '解冻会员' : '冻结会员'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** 组件：会员管理主视图 */
export function AdminMembersView() {
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [tag, setTag] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [detailId, setDetailId] = useState<string | null>(null)

  // 搜索防抖：停止输入 300ms 后再请求
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQ(qInput.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [qInput])

  const tagState = useApi((signal) => fetchMemberTags(signal), [reloadKey])
  const tagOptions = tagState.data?.items ?? []

  const { data, loading, error } = useApi(
    (signal) => fetchAdminMembers({ q, status, tag, page, pageSize: PAGE_SIZE }, signal),
    [q, status, tag, page, reloadKey],
  )

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1)

  const countText = useMemo(() => {
    if (loading && !data) return '正在加载…'
    return `共 ${total} 位会员`
  }, [loading, data, total])

  return (
    <div className="admin-page admin-page--wide">
      <AdminPageHead
        title="会员管理"
        desc="前台注册会员的真实账号、设备与会话；联系方式默认脱敏，敏感操作写入审计日志。"
        actions={
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReloadKey((key) => key + 1)}>
            刷新
          </button>
        }
      />

      <div className="admin-toolbar members-toolbar">
        <div className="admin-toolbar__search members-search">
          <IconSearch size={16} />
          <input
            className="input"
            type="search"
            placeholder="搜索用户名 / 姓名 / 邮箱 / 手机号"
            aria-label="搜索会员"
            value={qInput}
            onChange={(event) => setQInput(event.target.value)}
          />
        </div>
        <Select
          aria-label="按状态筛选"
          value={status}
          onChange={(next) => {
            setStatus(next)
            setPage(1)
          }}
          options={[
            { value: '', label: '全部状态' },
            { value: 'active', label: '正常' },
            { value: 'frozen', label: '已冻结' },
          ]}
        />
        <Select
          aria-label="按标签筛选"
          value={tag}
          onChange={(next) => {
            setTag(next)
            setPage(1)
          }}
          options={[
            { value: '', label: '全部标签' },
            ...tagOptions.map((item) => ({ value: item, label: item })),
          ]}
        />
        <span className="admin-toolbar__spacer" />
        <span className="admin-table__count">{countText}</span>
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={() => setReloadKey((key) => key + 1)} />
      ) : loading && !data ? (
        <SkeletonTable columns={6} rows={8} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="account"
          title={q || status || tag ? '没有匹配的会员' : '还没有会员注册'}
          desc={q || status || tag ? '试试调整关键词、状态或标签筛选。' : '前台注册的账号会自动出现在这里。'}
        />
      ) : (
        <div className="admin-table-wrap">
          <div className="admin-table-scroll">
            <table className="admin-table members-table">
              <thead>
                <tr>
                  <th>会员</th>
                  <th>联系方式</th>
                  <th>状态</th>
                  <th>运营标签</th>
                  <th className="members-num">设备</th>
                  <th className="members-num">会话</th>
                  <th>注册时间</th>
                  <th>最近登录</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="members-name">
                        <strong>{item.name}</strong>
                        <span className="members-name__account">@{item.username}</span>
                      </span>
                    </td>
                    <td>
                      <span className="members-contact">
                        <span>{item.email || '—'}</span>
                        <span className="members-contact__phone">{item.phone || '—'}</span>
                      </span>
                    </td>
                    <td>
                      <StatusTag status={item.status} />
                    </td>
                    <td>
                      {item.tags.length === 0 ? (
                        <span className="admin-cell--muted">—</span>
                      ) : (
                        <span className="members-tags">
                          {item.tags.map((tag) => (
                            <span className="tag" key={tag}>
                              {tag}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="members-num">{item.deviceCount}</td>
                    <td className="members-num">{item.sessionCount}</td>
                    <td>{fmtDate(item.createdAt)}</td>
                    <td>{fmtDateTime(item.lastLoginAt)}</td>
                    <td>
                      <div className="admin-table__actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDetailId(item.id)}>
                          详情
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-table__foot">
            <span className="admin-table__count">
              第 {Math.min(page, totalPages)} / {totalPages} 页
            </span>
            <Pager page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      )}

      {detailId && (
        <MemberDetailDialog
          id={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => setReloadKey((key) => key + 1)}
        />
      )}
    </div>
  )
}
