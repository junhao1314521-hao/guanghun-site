/**
 * 后台「备份」栏目（真实视图）。
 * ============================================================
 * 数据源为 GET /api/admin/backups（后端真实快照文件），提供：
 *   - 立即备份：POST /api/admin/backups；
 *   - 下载：GET /api/admin/backups/:id/download（fetch + Blob，携带会话凭证）；
 *   - 恢复：POST /api/admin/backups/:id/restore（ConfirmDialog 二次确认；后端会先自动留一份
 *     恢复前快照以便回退）；
 *   - 删除：DELETE /api/admin/backups/:id；
 *   - 重置为初始：POST /api/admin/reset（强确认，说明会丢弃全部改动）。
 * 取数复用 useApi；各写操作成功后通过 reloadKey 重新拉取列表。
 */
import { useCallback, useState } from 'react'
import {
  createBackup,
  deleteBackup,
  downloadBackup,
  listBackups,
  resetSite,
  restoreBackup,
  type BackupItem,
  type BackupList,
} from '../../api/adminBackups'
import { useApi } from '../../hooks/useApi'
import { AdminPageHead } from './AdminPageHead'
import { useConfirm, useToast } from './feedback'

/** 字节数 → 可读大小 */
function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** ISO 时间 → 紧凑展示 */
function formatTime(iso: string): string {
  return iso ? iso.replace('T', ' ').slice(0, 19) : '—'
}

export function AdminBackupsList() {
  const [reloadKey, setReloadKey] = useState(0)
  const state = useApi<BackupList>((signal) => listBackups(signal), [reloadKey])
  const confirm = useConfirm()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const items = state.data?.items ?? []
  const loading = state.loading && items.length === 0

  const onBackupNow = useCallback(async () => {
    setBusy(true)
    try {
      const item = await createBackup()
      toast.success(`已生成备份：${item.name}`)
      setReloadKey((key) => key + 1)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '备份失败')
    } finally {
      setBusy(false)
    }
  }, [toast])

  const onDownload = useCallback(
    async (item: BackupItem) => {
      try {
        await downloadBackup(item.id)
        toast.success(`已开始下载：${item.name}`)
      } catch (ex) {
        toast.error(ex instanceof Error ? ex.message : '下载失败')
      }
    },
    [toast],
  )

  const onRestore = useCallback(
    async (item: BackupItem) => {
      const ok = await confirm({
        title: '恢复备份',
        message: (
          <>
            确认用「{item.name}」<strong>覆盖恢复</strong>当前数据？当前内容将被该备份替换。
            <br />
            系统会先自动生成一份「恢复前快照」以便回退。
          </>
        ),
        confirmText: '覆盖恢复',
        danger: true,
      })
      if (!ok) return
      try {
        await restoreBackup(item.id)
        toast.success('已从备份恢复')
        setReloadKey((key) => key + 1)
      } catch (ex) {
        toast.error(ex instanceof Error ? ex.message : '恢复失败')
      }
    },
    [confirm, toast],
  )

  const onDelete = useCallback(
    async (item: BackupItem) => {
      const ok = await confirm({
        title: '删除备份',
        message: `确认删除「${item.name}」？此操作不可撤销。`,
        confirmText: '删除',
        danger: true,
      })
      if (!ok) return
      try {
        await deleteBackup(item.id)
        toast.success(`已删除「${item.name}」`)
        setReloadKey((key) => key + 1)
      } catch (ex) {
        toast.error(ex instanceof Error ? ex.message : '删除失败')
      }
    },
    [confirm, toast],
  )

  const onReset = useCallback(async () => {
    const ok = await confirm({
      title: '重置为初始',
      message: (
        <>
          确认将<strong>全部内容、结构化数据与后台资源重置为初始 seed</strong>？
          <br />
          此操作会<strong>丢弃全部改动</strong>且不可撤销（建议先「立即备份」）。日志与素材不受影响。
        </>
      ),
      confirmText: '确认重置',
      danger: true,
    })
    if (!ok) return
    try {
      await resetSite('all')
      toast.success('已重置为初始状态')
      setReloadKey((key) => key + 1)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '重置失败')
    }
  }, [confirm, toast])

  return (
    <div className="admin-page">
      <AdminPageHead
        title="备份"
        desc="创建、下载、恢复站点数据备份；也可将全部数据重置为初始状态（会丢弃改动）。"
        actions={
          <div className="admin-table__actions">
            <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => void onReset()}>
              重置为初始
            </button>
            <button
              type="button"
              className={`btn btn--primary btn--sm${busy ? ' btn--loading' : ''}`}
              onClick={() => void onBackupNow()}
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  备份中…
                </>
              ) : (
                '立即备份'
              )}
            </button>
          </div>
        }
      />

      <div className="admin-toolbar">
        <span className="admin-table__count">共 {items.length} 份备份</span>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-table__empty">
            <div className="empty">
              <div className="empty__title">正在加载…</div>
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
              <div className="empty__title">暂无备份</div>
              <p className="empty__desc">点击右上角「立即备份」创建第一份站点备份。</p>
            </div>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="table admin-table">
              <thead>
                <tr>
                  <th scope="col">文件名</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    大小
                  </th>
                  <th scope="col">时间</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="admin-cell--clip" title={item.name}>
                      <strong className="mono">{item.name}</strong>
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {formatSize(item.size)}
                    </td>
                    <td>{formatTime(item.at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="admin-table__actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void onDownload(item)}>
                          下载
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => void onRestore(item)}
                        >
                          恢复
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
    </div>
  )
}
