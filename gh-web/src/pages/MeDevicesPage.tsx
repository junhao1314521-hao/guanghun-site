import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { addMyDevice, fetchMyDevices, removeMyDevice } from '../api/account'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'
import { MePageHeader } from '../components/site/MePageHeader'

/** 凭证文件上限（与后端一致：5MB） */
const RECEIPT_MAX_BYTES = 5 * 1024 * 1024

/** 允许的凭证类型 */
const RECEIPT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']

/** 状态 → 视觉样式（在保 / 过保 / 待审核 / 已驳回） */
function statusClass(status: string, remainingDays: number): string {
  if (status === 'pending') return 'warning'
  if (status === 'rejected') return 'danger'
  return remainingDays >= 0 ? 'success' : 'muted'
}

/** 剩余天数文案 */
function remainingText(days: number): string {
  if (days >= 0) return `${days} 天`
  return `已过保 ${Math.abs(days)} 天`
}

/** 本地今天（YYYY-MM-DD，用于购买日期上限，避免 UTC 跨日导致无法选今天） */
function localToday(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

/**
 * 个人中心 · 我的设备（二级页面）。
 * 设备登记需填写购买日期与购买凭证，提交后进入后台审核；保修期固定 36 个月。
 */
export function MeDevicesPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const { data, loading, error } = useApi((signal) => fetchMyDevices(signal), [reloadKey])
  const devices = data?.items ?? []

  // 添加设备表单
  const [formOpen, setFormOpen] = useState(false)
  const [model, setModel] = useState('')
  const [sn, setSn] = useState('')
  const [purchasedAt, setPurchasedAt] = useState('')
  const [channel, setChannel] = useState('')
  const [receipt, setReceipt] = useState('')
  const [receiptName, setReceiptName] = useState('')
  const [formErr, setFormErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // 删除确认（按记录 id）
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const readyKey = `${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  /** 读取购买凭证为 data URL（前端先做类型与大小校验） */
  const pickReceipt = (event: ChangeEvent<HTMLInputElement>) => {
    setFormErr(null)
    const file = event.target.files?.[0]
    if (!file) return
    if (!RECEIPT_TYPES.includes(file.type)) {
      setFormErr('凭证仅支持 JPG / PNG / WebP / PDF')
      event.target.value = ''
      return
    }
    if (file.size > RECEIPT_MAX_BYTES) {
      setFormErr('凭证文件不能超过 5MB')
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setReceipt(typeof reader.result === 'string' ? reader.result : '')
      setReceiptName(file.name)
    }
    reader.onerror = () => setFormErr('凭证读取失败，请重新选择')
    reader.readAsDataURL(file)
  }

  /** 清空表单并关闭 */
  const resetForm = () => {
    setModel('')
    setSn('')
    setPurchasedAt('')
    setChannel('')
    setReceipt('')
    setReceiptName('')
    setFormErr(null)
    if (fileRef.current) fileRef.current.value = ''
    setFormOpen(false)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormErr(null)
    if (!model.trim() || !sn.trim()) {
      setFormErr('请填写型号与序列号')
      return
    }
    if (!purchasedAt) {
      setFormErr('请选择购买日期')
      return
    }
    if (!receipt) {
      setFormErr('请上传购买凭证')
      return
    }
    setSaving(true)
    try {
      await addMyDevice({
        model: model.trim(),
        sn: sn.trim(),
        purchasedAt,
        channel: channel.trim(),
        receipt,
      })
      resetForm()
      setReloadKey((key) => key + 1)
    } catch (ex) {
      setFormErr(ex instanceof Error ? ex.message : '登记失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await removeMyDevice(id)
      setConfirmId(null)
      setReloadKey((key) => key + 1)
    } catch {
      setConfirmId(null)
    }
  }

  return (
    <div ref={rootRef}>
      <MePageHeader
        title="我的设备"
        description="登记设备并上传购买凭证，审核通过后即完成保修备案（整机保修 36 个月）。"
        action={
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => (formOpen ? resetForm() : setFormOpen(true))}>
            {formOpen ? '收起' : '登记设备'}
          </button>
        }
      />

      {formOpen && (
        <form className="card reveal" onSubmit={submit} noValidate style={{ marginBottom: 'var(--gh-space-5)' }}>
          <div className="form-grid-2">
            <div className="field">
              <label className="field__label" htmlFor="deviceModel">
                型号
              </label>
              <input
                className="input"
                id="deviceModel"
                value={model}
                placeholder="54027X1QE-W54"
                onChange={(event) => setModel(event.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="deviceSn">
                序列号
              </label>
              <input
                className="input"
                id="deviceSn"
                value={sn}
                placeholder="盒底 / 机身铭牌上的序列号"
                onChange={(event) => setSn(event.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="devicePurchasedAt">
                购买日期
              </label>
              <input
                className="input"
                id="devicePurchasedAt"
                type="date"
                value={purchasedAt}
                max={localToday()}
                onChange={(event) => setPurchasedAt(event.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="deviceChannel">
                购买渠道（选填）
              </label>
              <input
                className="input"
                id="deviceChannel"
                value={channel}
                placeholder="官方商城 / 京东 / 线下门店"
                onChange={(event) => setChannel(event.target.value)}
              />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label className="field__label" htmlFor="deviceReceipt">
                购买凭证
              </label>
              <input
                ref={fileRef}
                className="input"
                id="deviceReceipt"
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={pickReceipt}
              />
              <span className="field__hint">
                {receiptName ? `已选择：${receiptName}` : '支持 JPG / PNG / WebP / PDF，单个文件不超过 5MB。'}
              </span>
            </div>
          </div>
          {formErr && (
            <span className="field__error" style={{ display: 'block', marginTop: 'var(--gh-space-3)' }}>
              {formErr}
            </span>
          )}
          <div className="row" style={{ marginTop: 'var(--gh-space-4)' }}>
            <button className={`btn btn--primary${saving ? ' btn--loading' : ''}`} type="submit" disabled={saving}>
              提交审核
            </button>
            <button className="btn btn--ghost" type="button" onClick={resetForm}>
              取消
            </button>
          </div>
        </form>
      )}

      {error ? (
        <div className="empty">
          <div className="empty__title">设备加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            重新加载
          </button>
        </div>
      ) : loading || !data ? (
        <div className="grid-3" aria-busy="true" aria-label="设备加载中">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="card" key={index}>
              <div className="skeleton" style={{ height: 22, width: '50%' }} />
              <div className="skeleton" style={{ height: 64, marginTop: 'var(--gh-space-4)' }} />
            </div>
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="empty">
          <div className="empty__title">暂无已登记设备</div>
          <p className="empty__desc">登记设备并上传购买凭证，审核通过后即可查询保修与申请售后。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setFormOpen(true)}>
            登记设备
          </button>
        </div>
      ) : (
        <div className="grid-3" style={{ marginTop: 'var(--gh-space-2)' }}>
          {devices.map((device) => (
            <div className="card reveal" key={device.id}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3 className="card__title" style={{ margin: 0 }}>
                  {device.model}
                </h3>
                <span className={`status status--${statusClass(device.status, device.remainingDays)}`}>
                  {device.statusText}
                </span>
              </div>
              <div className="dl-meta" style={{ marginTop: 'var(--gh-space-4)', gridTemplateColumns: '1fr' }}>
                <div>
                  <div className="dl-meta__k">序列号</div>
                  <div className="dl-meta__v">{device.sn}</div>
                </div>
                <div>
                  <div className="dl-meta__k">购买日期</div>
                  <div className="dl-meta__v">{device.purchasedAt}</div>
                </div>
                <div>
                  <div className="dl-meta__k">保修到期</div>
                  <div className="dl-meta__v">{device.warrantyEnd || '—'}</div>
                </div>
                <div>
                  <div className="dl-meta__k">保修剩余</div>
                  <div className="dl-meta__v">
                    {device.status === 'pending' ? '审核通过后生效' : remainingText(device.remainingDays)}
                  </div>
                </div>
              </div>
              {device.status === 'rejected' && device.rejectReason && (
                <p className="field__hint" style={{ marginTop: 'var(--gh-space-3)', color: 'var(--color-danger)' }}>
                  驳回原因：{device.rejectReason}
                </p>
              )}
              {/* 设备关联资料：直达该型号的下载（说明书 / 固件）与常见问题 */}
              <div className="row" style={{ marginTop: 'var(--gh-space-4)', gap: 'var(--gh-space-2)', flexWrap: 'wrap' }}>
                <Link className="btn btn--sm btn--ghost" to={`/downloads?model=${encodeURIComponent(device.model)}`}>
                  说明书 / 固件
                </Link>
                <Link className="btn btn--sm btn--ghost" to="/faq">
                  常见问题
                </Link>
                {device.receiptUrl && (
                  <a className="btn btn--sm btn--ghost" href={device.receiptUrl} target="_blank" rel="noreferrer">
                    购买凭证
                  </a>
                )}
              </div>
              <div className="row" style={{ marginTop: 'var(--gh-space-3)' }}>
                <Link className="btn btn--sm btn--secondary" to="/inquiry">
                  申请售后
                </Link>
                {device.status !== 'active' &&
                  (confirmId === device.id ? (
                    <>
                      <button className="btn btn--sm btn--danger" type="button" onClick={() => remove(device.id)}>
                        确认删除
                      </button>
                      <button className="btn btn--sm btn--ghost" type="button" onClick={() => setConfirmId(null)}>
                        取消
                      </button>
                    </>
                  ) : (
                    <button className="btn btn--sm btn--ghost" type="button" onClick={() => setConfirmId(device.id)}>
                      删除
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="field__hint" style={{ marginTop: 'var(--gh-space-4)' }}>
        整机保修 36 个月（面板不单独计算），自购买日期起算；审核通过的设备不可删除。
      </p>
    </div>
  )
}
