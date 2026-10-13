/**
 * 后台「预览与发布」栏目（真实视图）。
 * ============================================================
 * 数据源为 GET /api/admin/publish（后端 SQLite `releases` 表的真实发布记录），提供：
 *   - 立即发布：弹窗填备注 → POST /api/admin/publish（快照当前内容并生成版本记录）；
 *   - 回滚到此版本：POST /api/admin/publish/:id/restore（ConfirmDialog 二次确认；后端先自动留
 *     `pre-restore` 备份以便再回退）；
 *   - 删除：DELETE /api/admin/publish/:id。
 * 取数复用 useApi；各写操作成功后通过 reloadKey 重新拉取列表。
 *
 * 权限：端点需 `publish` 权限（仅 admin）；operator 访问会 403 —— 此处优雅降级为
 * 「无权限（需管理员）」空态与说明，不白屏、不报错。
 */
import { useCallback, useId, useRef, useState } from 'react'
import {
  cancelSchedule,
  createRelease,
  createSchedule,
  deleteRelease,
  listReleases,
  listSchedules,
  restoreRelease,
  type ReleaseItem,
  type ReleaseList,
  type ScheduleItem,
  type ScheduleList,
  type ScheduleStatus,
} from '../../api/adminPublish'
import { useApi } from '../../hooks/useApi'
import { AdminPageHead } from './AdminPageHead'
import { useConfirm, useToast } from './feedback'

/** ISO 时间 → 紧凑展示 */
function formatTime(iso: string): string {
  return iso ? iso.replace('T', ' ').slice(0, 19) : '—'
}

/** 错误是否为「无权限」（403） */
function isForbidden(error: Error | null): boolean {
  return (error as { status?: number } | null)?.status === 403
}

/** 定时发布状态 → 中文标签与状态色 */
const SCHEDULE_STATUS: Record<ScheduleStatus, { label: string; level: 'success' | 'warning' | 'danger' | 'info' }> = {
  pending: { label: '待应用', level: 'warning' },
  applied: { label: '已应用', level: 'success' },
  failed: { label: '失败', level: 'danger' },
  canceled: { label: '已取消', level: 'info' },
}

/** 展示用状态类名（复用设计系统 status--* 语义） */
function statusClass(level: 'success' | 'warning' | 'danger' | 'info'): string {
  return level === 'info' ? 'status' : `status status--${level}`
}

export function AdminPublishList() {
  const [reloadKey, setReloadKey] = useState(0)
  const state = useApi<ReleaseList>((signal) => listReleases(signal), [reloadKey])
  const confirm = useConfirm()
  const toast = useToast()

  const [busy, setBusy] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [note, setNote] = useState('')

  const items = state.data?.items ?? []
  const loading = state.loading && items.length === 0
  const forbidden = isForbidden(state.error)

  const onPublish = useCallback(async () => {
    setBusy(true)
    try {
      const item = await createRelease(note.trim() || undefined)
      toast.success(`已发布：${item.contentVersion}`)
      setDialogOpen(false)
      setNote('')
      setReloadKey((key) => key + 1)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '发布失败')
    } finally {
      setBusy(false)
    }
  }, [note, toast])

  const onRestore = useCallback(
    async (item: ReleaseItem) => {
      const ok = await confirm({
        title: '回滚到此版本',
        message: (
          <>
            确认将站点内容<strong>回滚到「{item.contentVersion}」</strong>（{formatTime(item.at)}）？
            <br />
            当前内容将被该版本快照覆盖；系统会先自动生成一份「回滚前快照」以便再次回退。
          </>
        ),
        confirmText: '回滚',
        danger: true,
      })
      if (!ok) return
      try {
        await restoreRelease(item.id)
        toast.success(`已回滚到 ${item.contentVersion}`)
        setReloadKey((key) => key + 1)
      } catch (ex) {
        toast.error(ex instanceof Error ? ex.message : '回滚失败')
      }
    },
    [confirm, toast],
  )

  const onDelete = useCallback(
    async (item: ReleaseItem) => {
      const ok = await confirm({
        title: '删除发布记录',
        message: `确认删除发布记录「${item.contentVersion}」？此操作不可撤销（不影响当前站点内容）。`,
        confirmText: '删除',
        danger: true,
      })
      if (!ok) return
      try {
        await deleteRelease(item.id)
        toast.success(`已删除「${item.contentVersion}」`)
        setReloadKey((key) => key + 1)
      } catch (ex) {
        toast.error(ex instanceof Error ? ex.message : '删除失败')
      }
    },
    [confirm, toast],
  )

  return (
    <div className="admin-page">
      <AdminPageHead
        title="预览与发布"
        desc="查看站点的发布记录（内容版本快照），可立即发布、按版本回滚内容或删除记录。"
        actions={
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setDialogOpen(true)}
            disabled={busy}
          >
            立即发布
          </button>
        }
      />

      <div className="admin-toolbar">
        <span className="admin-table__count">共 {items.length} 条发布记录</span>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-table__empty">
            <div className="empty">
              <div className="empty__title">正在加载…</div>
            </div>
          </div>
        ) : forbidden ? (
          <div className="admin-table__empty">
            <div className="empty">
              <div className="empty__title">无权限（需管理员）</div>
              <p className="empty__desc">
                发布与回滚需要「发布」权限，仅超级管理员可用。当前账号为内容运营，可联系管理员发布或升级权限。
              </p>
            </div>
          </div>
        ) : state.error && items.length === 0 ? (
          <div className="admin-table__empty">
            <div className="alert alert--danger" role="alert">
              {state.error.message}
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ marginLeft: 'var(--gh-space-3)' }}
                onClick={() => setReloadKey((key) => key + 1)}
              >
                重试
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="admin-table__empty">
            <div className="empty">
              <div className="empty__title">暂无发布记录</div>
              <p className="empty__desc">点击右上角「立即发布」生成第一条发布记录。</p>
            </div>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="table admin-table">
              <thead>
                <tr>
                  <th scope="col">时间</th>
                  <th scope="col">操作者</th>
                  <th scope="col">内容版本</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    页面数
                  </th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    区块数
                  </th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    集合数
                  </th>
                  <th scope="col">备注</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="mono">{formatTime(item.at)}</td>
                    <td>{item.actor}</td>
                    <td>
                      <span className="mono">{item.contentVersion}</span>
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {item.pageCount}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {item.blockCount}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {item.collectionCount}
                    </td>
                    <td className="admin-cell--clip" title={item.note ?? ''}>
                      {item.note ? item.note : <span className="admin-cell--muted">—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="admin-table__actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void onRestore(item)}>
                          回滚到此版本
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger-ghost btn--sm"
                          onClick={() => void onDelete(item)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ScheduleSection />

      {dialogOpen && (
        <PublishDialog
          note={note}
          busy={busy}
          onNoteChange={setNote}
          onCancel={() => {
            if (busy) return
            setDialogOpen(false)
            setNote('')
          }}
          onConfirm={() => void onPublish()}
        />
      )}
    </div>
  )
}

/** 立即发布弹窗：填写备注 → 提交（复用 .admin-dialog-* 样式骨架与 Esc 关闭） */
function PublishDialog({
  note,
  busy,
  onNoteChange,
  onCancel,
  onConfirm,
}: {
  note: string
  busy: boolean
  onNoteChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  const titleId = useId()
  const noteRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div
      className="admin-dialog-overlay"
      role="presentation"
      onClick={() => {
        if (!busy) onCancel()
      }}
    >
      <div
        className="admin-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onCancel()
        }}
      >
        <h2 className="admin-dialog__title" id={titleId}>
          立即发布
        </h2>
        <div className="admin-dialog__body">
          <p style={{ marginTop: 0 }}>
            将快照当前全部内容并生成一条发布记录（版本号自动生成）。备注可选，便于日后识别与回滚。
          </p>
          <label className="field" style={{ marginTop: 'var(--gh-space-3)' }}>
            <span className="field__label">发布备注</span>
            <textarea
              ref={noteRef}
              className="textarea"
              rows={3}
              value={note}
              placeholder="如：首页秋季专题上线"
              autoFocus
              onChange={(event) => onNoteChange(event.target.value)}
            />
          </label>
        </div>
        <div className="admin-dialog__foot">
          <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={busy}>
            取消
          </button>
          <button
            type="button"
            className={`btn btn--primary${busy ? ' btn--loading' : ''}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className="spinner" aria-hidden="true" />
                发布中…
              </>
            ) : (
              '确认发布'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 定时发布区块：登记「到点自动应用」的发布排程。
 * ------------------------------------------------------------
 * 数据源 GET /api/admin/publish/schedules（后端 SQLite `publish_schedules` 表）。
 * - 排程发布：弹窗选时间 + 备注 → POST（**创建即快照当前内容**，到点直接应用该快照）；
 * - 取消：仅「待应用」可取消 → DELETE（非 pending 后端返回 409，前端据状态禁用按钮）。
 * 需 `publish` 权限；无权限时优雅降级为说明空态。
 */
function ScheduleSection() {
  const [reloadKey, setReloadKey] = useState(0)
  const state = useApi<ScheduleList>((signal) => listSchedules(signal), [reloadKey])
  const toast = useToast()
  const confirm = useConfirm()

  const [busy, setBusy] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [at, setAt] = useState('')
  const [note, setNote] = useState('')

  const items = state.data?.items ?? []
  const loading = state.loading && items.length === 0
  const forbidden = isForbidden(state.error)

  /** 默认计划时间：当前时间 + 1 小时（本地时区，转 datetime-local 需要的 `YYYY-MM-DDTHH:mm`） */
  const defaultAt = () => {
    const d = new Date(Date.now() + 60 * 60 * 1000)
    d.setMinutes(0, 0, 0)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const onSchedule = useCallback(async () => {
    if (!at) {
      toast.error('请选择计划时间')
      return
    }
    setBusy(true)
    try {
      const item = await createSchedule({ at: new Date(at).toISOString(), note: note.trim() || undefined })
      toast.success(`已登记定时发布：${formatTime(item.at)}`)
      setDialogOpen(false)
      setNote('')
      setReloadKey((key) => key + 1)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '排程失败')
    } finally {
      setBusy(false)
    }
  }, [at, note, toast])

  const onCancelSchedule = useCallback(
    async (item: ScheduleItem) => {
      const ok = await confirm({
        title: '取消定时发布',
        message: `确认取消计划于 ${formatTime(item.at)} 的定时发布？此操作不可撤销，不会影响当前站点内容。`,
        confirmText: '取消排程',
        danger: true,
      })
      if (!ok) return
      try {
        await cancelSchedule(item.id)
        toast.success('已取消该定时发布')
        setReloadKey((key) => key + 1)
      } catch (ex) {
        toast.error(ex instanceof Error ? ex.message : '取消失败')
      }
    },
    [confirm, toast],
  )

  return (
    <div style={{ marginTop: 'var(--gh-space-8)' }}>
      <div className="admin-panel__head">
        <div>
          <h2 className="admin-panel__title">定时发布</h2>
          <p className="admin-table__count" style={{ margin: 'var(--gh-space-1) 0 0' }}>
            登记后系统将在计划时间<strong>自动应用创建时的内容快照</strong>，无需人工操作；未到点可随时取消。
          </p>
        </div>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          disabled={busy}
          onClick={() => {
            setAt(defaultAt())
            setDialogOpen(true)
          }}
        >
          排程发布
        </button>
      </div>

      <div className="admin-table-wrap" style={{ marginTop: 'var(--gh-space-4)' }}>
        {loading ? (
          <div className="admin-table__empty">
            <div className="empty">
              <div className="empty__title">正在加载…</div>
            </div>
          </div>
        ) : forbidden ? (
          <div className="admin-table__empty">
            <div className="empty">
              <div className="empty__title">无权限（需管理员）</div>
              <p className="empty__desc">定时发布需要「发布」权限，仅超级管理员可用。</p>
            </div>
          </div>
        ) : state.error && items.length === 0 ? (
          <div className="admin-table__empty">
            <div className="alert alert--danger" role="alert">
              {state.error.message}
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ marginLeft: 'var(--gh-space-3)' }}
                onClick={() => setReloadKey((key) => key + 1)}
              >
                重试
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="admin-table__empty">
            <div className="empty">
              <div className="empty__title">暂无定时发布</div>
              <p className="empty__desc">点击右上角「排程发布」登记一条到点自动应用的排程。</p>
            </div>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="table admin-table">
              <thead>
                <tr>
                  <th scope="col">计划时间</th>
                  <th scope="col">状态</th>
                  <th scope="col">操作者</th>
                  <th scope="col">备注</th>
                  <th scope="col">登记时间</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const status = SCHEDULE_STATUS[item.status]
                  return (
                    <tr key={item.id}>
                      <td className="mono">{formatTime(item.at)}</td>
                      <td>
                        <span className={statusClass(status.level)}>
                          {item.status === 'failed' && item.error ? `失败：${item.error}` : status.label}
                        </span>
                      </td>
                      <td>{item.createdBy ?? <span className="admin-cell--muted">—</span>}</td>
                      <td className="admin-cell--clip" title={item.note ?? ''}>
                        {item.note ? item.note : <span className="admin-cell--muted">—</span>}
                      </td>
                      <td className="mono">{formatTime(item.createdAt)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {item.status === 'pending' ? (
                          <button
                            type="button"
                            className="btn btn--danger-ghost btn--sm"
                            onClick={() => void onCancelSchedule(item)}
                          >
                            取消
                          </button>
                        ) : (
                          <span className="admin-cell--muted">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialogOpen && (
        <ScheduleDialog
          at={at}
          note={note}
          busy={busy}
          onAtChange={setAt}
          onNoteChange={setNote}
          onCancel={() => {
            if (busy) return
            setDialogOpen(false)
            setNote('')
          }}
          onConfirm={() => void onSchedule()}
        />
      )}
    </div>
  )
}

/** 排程发布弹窗：选计划时间 + 备注 → 提交（复用 .admin-dialog-* 样式骨架与 Esc 关闭） */
function ScheduleDialog({
  at,
  note,
  busy,
  onAtChange,
  onNoteChange,
  onCancel,
  onConfirm,
}: {
  at: string
  note: string
  busy: boolean
  onAtChange: (value: string) => void
  onNoteChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  const titleId = useId()

  return (
    <div
      className="admin-dialog-overlay"
      role="presentation"
      onClick={() => {
        if (!busy) onCancel()
      }}
    >
      <div
        className="admin-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onCancel()
        }}
      >
        <h2 className="admin-dialog__title" id={titleId}>
          排程发布
        </h2>
        <div className="admin-dialog__body">
          <p style={{ marginTop: 0 }}>
            登记后系统将在计划时间<strong>自动应用创建时捕获的内容快照</strong>（而非到点时的内容），
            避免期间编辑导致发布非预期版本。未到点前可随时取消。
          </p>
          <label className="field" style={{ marginTop: 'var(--gh-space-3)' }}>
            <span className="field__label">计划时间</span>
            <input
              className="input"
              type="datetime-local"
              value={at}
              autoFocus
              onChange={(event) => onAtChange(event.target.value)}
            />
            <span className="field__hint">须晚于当前时间（本地时区）。</span>
          </label>
          <label className="field" style={{ marginTop: 'var(--gh-space-3)' }}>
            <span className="field__label">备注</span>
            <textarea
              className="textarea"
              rows={3}
              value={note}
              placeholder="如：新品发布会当天首页上线"
              onChange={(event) => onNoteChange(event.target.value)}
            />
          </label>
        </div>
        <div className="admin-dialog__foot">
          <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={busy}>
            取消
          </button>
          <button
            type="button"
            className={`btn btn--primary${busy ? ' btn--loading' : ''}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className="spinner" aria-hidden="true" />
                排程中…
              </>
            ) : (
              '确认排程'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
