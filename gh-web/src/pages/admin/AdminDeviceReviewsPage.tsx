import { useState } from 'react'
import { fetchDeviceRegistrations, reviewDeviceRegistration, type AdminDeviceRegistration } from '../../api/admin'
import { useApi } from '../../hooks/useApi'
import { AdminPageHead } from '../../components/admin/AdminPageHead'
import { useToast } from '../../components/admin/feedback'

/** 筛选标签：全部 / 待审核 / 在保 / 已驳回 */
const STATUS_TABS: Array<{ key: string; label: string }> = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'active', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
]

/** 状态 → 视觉样式 */
function statusClass(device: AdminDeviceRegistration): string {
  if (device.status === 'pending') return 'warning'
  if (device.status === 'rejected') return 'danger'
  return device.remainingDays >= 0 ? 'success' : 'muted'
}

/**
 * 后台 · 设备审核：会员提交的设备登记（购买凭证）在此核对。
 * 通过后进入保修（36 个月），驳回需填写原因并回传给会员。
 */
export function AdminDeviceReviewsPage() {
  const toast = useToast()
  const [status, setStatus] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<AdminDeviceRegistration | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data, loading, error } = useApi((signal) => fetchDeviceRegistrations(status, signal), [status, reloadKey])
  const items = data?.items ?? []
  const pendingCount = items.filter((device) => device.status === 'pending').length

  const approve = async (device: AdminDeviceRegistration) => {
    setBusyId(device.id)
    try {
      await reviewDeviceRegistration(device.id, 'approve')
      toast.success(`已通过：${device.sn}`)
      setReloadKey((key) => key + 1)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '审核失败')
    } finally {
      setBusyId(null)
    }
  }

  const submitReject = async () => {
    if (!rejectTarget) return
    if (!rejectReason.trim()) {
      toast.error('请填写驳回原因')
      return
    }
    setBusyId(rejectTarget.id)
    try {
      await reviewDeviceRegistration(rejectTarget.id, 'reject', rejectReason.trim())
      toast.success(`已驳回：${rejectTarget.sn}`)
      setRejectTarget(null)
      setRejectReason('')
      setReloadKey((key) => key + 1)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '审核失败')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHead
        title="设备审核"
        desc="核对会员提交的购买凭证；通过后按购买日期起算 36 个月保修（面板不单独计算）。"
      />

      <div className="admin-toolbar">
        <div className="admin-chipbar">
          {STATUS_TABS.map((tab) => (
            <button
              type="button"
              key={tab.key}
              className={`admin-chip${status === tab.key ? ' is-active' : ''}`}
              onClick={() => setStatus(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="admin-toolbar__spacer" />
        <span className="admin-table__count">
          共 {items.length} 条{status === '' && pendingCount > 0 ? `，待审核 ${pendingCount} 条` : ''}
        </span>
      </div>

      <div className="admin-table-wrap">
        {loading && items.length === 0 ? (
          <div className="admin-table__empty">正在加载…</div>
        ) : error && items.length === 0 ? (
          <div className="admin-table__empty">
            {error.message}
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
              重试
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="admin-table__empty">暂无设备登记</div>
        ) : (
          <div className="admin-table-scroll">
            <table className="table admin-table">
              <thead>
                <tr>
                  <th scope="col">登记时间</th>
                  <th scope="col">会员</th>
                  <th scope="col">型号</th>
                  <th scope="col">序列号</th>
                  <th scope="col">购买日期</th>
                  <th scope="col">渠道</th>
                  <th scope="col">凭证</th>
                  <th scope="col">保修到期</th>
                  <th scope="col">状态</th>
                  <th scope="col">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((device) => (
                  <tr key={device.id}>
                    <td>{device.createdAt.slice(0, 10)}</td>
                    <td>{device.username}</td>
                    <td>{device.model}</td>
                    <td className="mono">{device.sn}</td>
                    <td>{device.purchasedAt}</td>
                    <td>{device.channel || '—'}</td>
                    <td>
                      <a href={device.receiptUrl} target="_blank" rel="noreferrer">
                        查看凭证
                      </a>
                    </td>
                    <td>{device.warrantyEnd || '—'}</td>
                    <td>
                      <span className={`status status--${statusClass(device)}`}>{device.statusText}</span>
                      {device.status === 'rejected' && device.rejectReason && (
                        <div className="field__hint">驳回：{device.rejectReason}</div>
                      )}
                    </td>
                    <td>
                      {device.status === 'pending' ? (
                        <div className="admin-table__actions">
                          <button
                            className="btn btn--primary btn--sm"
                            type="button"
                            disabled={busyId === device.id}
                            onClick={() => void approve(device)}
                          >
                            通过
                          </button>
                          <button
                            className="btn btn--danger btn--sm"
                            type="button"
                            disabled={busyId === device.id}
                            onClick={() => {
                              setRejectTarget(device)
                              setRejectReason('')
                            }}
                          >
                            驳回
                          </button>
                        </div>
                      ) : (
                        <span className="field__hint">
                          {device.reviewedBy ? `${device.reviewedBy} · ${device.reviewedAt.slice(0, 10)}` : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectTarget && (
        <div className="admin-dialog-overlay" onClick={() => setRejectTarget(null)}>
          <div className="admin-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3 className="admin-dialog__title">驳回设备登记</h3>
            <div className="admin-dialog__body">
              <p>
                {rejectTarget.model} · {rejectTarget.sn}
              </p>
              <div className="field">
                <label className="field__label" htmlFor="rejectReason">
                  驳回原因
                </label>
                <textarea
                  className="input"
                  id="rejectReason"
                  rows={3}
                  value={rejectReason}
                  placeholder="例如：凭证金额与型号不符，请补充完整订单截图"
                  onChange={(event) => setRejectReason(event.target.value)}
                />
              </div>
            </div>
            <div className="admin-dialog__foot">
              <button className="btn btn--ghost" type="button" onClick={() => setRejectTarget(null)}>
                取消
              </button>
              <button
                className="btn btn--danger"
                type="button"
                disabled={busyId === rejectTarget.id}
                onClick={() => void submitReject()}
              >
                确认驳回
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
