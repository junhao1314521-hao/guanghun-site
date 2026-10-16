import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { addMyDevice, fetchMyDevices, removeMyDevice } from '../api/account'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/**
 * 个人中心 · 我的设备（二级页面）：设备卡片（已验证 / 未验证）。
 * 「添加设备」「删除设备」均为真实接口（按用户隔离）。
 */
export function MeDevicesPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const { data, loading, error } = useApi((signal) => fetchMyDevices(signal), [reloadKey])
  const devices = data?.items ?? []

  // 添加设备表单
  const [formOpen, setFormOpen] = useState(false)
  const [model, setModel] = useState('')
  const [sn, setSn] = useState('')
  const [formErr, setFormErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // 删除确认（按序列号）
  const [confirmSn, setConfirmSn] = useState<string | null>(null)

  const readyKey = `${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormErr(null)
    if (!model.trim() || !sn.trim()) {
      setFormErr('请填写型号与序列号')
      return
    }
    setSaving(true)
    try {
      await addMyDevice({ model: model.trim(), sn: sn.trim() })
      setModel('')
      setSn('')
      setFormOpen(false)
      setReloadKey((key) => key + 1)
    } catch (ex) {
      setFormErr(ex instanceof Error ? ex.message : '登记失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (target: string) => {
    try {
      await removeMyDevice(target)
      setConfirmSn(null)
      setReloadKey((key) => key + 1)
    } catch {
      setConfirmSn(null)
    }
  }

  return (
    <div ref={rootRef}>
      <div className="section__head">
        <div>
          <h2 className="section__title">
            我的设备
          </h2>
          <p className="section__desc">
            同一型号可登记多台；未接入验证源时显示「未验证」。
          </p>
        </div>
        <button className="btn btn--secondary btn--sm" type="button" onClick={() => setFormOpen((open) => !open)}>
          {formOpen ? '收起' : '添加设备'}
        </button>
      </div>

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
          </div>
          {formErr && (
            <span className="field__error" style={{ display: 'block', marginTop: 'var(--gh-space-3)' }}>
              {formErr}
            </span>
          )}
          <div className="row" style={{ marginTop: 'var(--gh-space-4)' }}>
            <button className={`btn btn--primary${saving ? ' btn--loading' : ''}`} type="submit" disabled={saving}>
              登记设备
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => setFormOpen(false)}>
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
          <p className="empty__desc">登记设备后可查询保修与申请售后。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setFormOpen(true)}>
            添加设备
          </button>
        </div>
      ) : (
        <div className="grid-3" style={{ marginTop: 'var(--gh-space-2)' }}>
          {devices.map((device) => (
            <div className="card reveal" key={device.sn}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3 className="card__title" style={{ margin: 0 }}>
                  {device.model}
                </h3>
                <span className={`status status--${device.status}`}>{device.statusText}</span>
              </div>
              <div className="dl-meta" style={{ marginTop: 'var(--gh-space-4)', gridTemplateColumns: '1fr' }}>
                <div>
                  <div className="dl-meta__k">序列号</div>
                  <div className="dl-meta__v">{device.sn}</div>
                </div>
                <div>
                  <div className="dl-meta__k">保修剩余</div>
                  <div className="dl-meta__v">{device.warranty}</div>
                </div>
              </div>
              {/* 设备关联资料：直达该型号的下载（说明书 / 固件）与常见问题 */}
              <div className="row" style={{ marginTop: 'var(--gh-space-4)', gap: 'var(--gh-space-2)', flexWrap: 'wrap' }}>
                <Link className="btn btn--sm btn--ghost" to={`/downloads?model=${encodeURIComponent(device.model)}`}>
                  说明书 / 固件
                </Link>
                <Link className="btn btn--sm btn--ghost" to="/faq">
                  常见问题
                </Link>
              </div>
              <div className="row" style={{ marginTop: 'var(--gh-space-3)' }}>
                {device.action.to ? (
                  <Link className={`btn btn--sm btn--${device.action.variant}`} to={device.action.to}>
                    {device.action.label}
                  </Link>
                ) : null}
                {confirmSn === device.sn ? (
                  <>
                    <button className="btn btn--sm btn--danger" type="button" onClick={() => remove(device.sn)}>
                      确认删除
                    </button>
                    <button className="btn btn--sm btn--ghost" type="button" onClick={() => setConfirmSn(null)}>
                      取消
                    </button>
                  </>
                ) : (
                  <button className="btn btn--sm btn--ghost" type="button" onClick={() => setConfirmSn(device.sn)}>
                    删除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="field__hint" style={{ marginTop: 'var(--gh-space-4)' }}>
        序列号与保修天数以官方最终公布为准；无数据的项显示「暂无」而非 0。
      </p>
    </div>
  )
}
