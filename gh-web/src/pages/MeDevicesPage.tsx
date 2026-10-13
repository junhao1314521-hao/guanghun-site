import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyDevices } from '../api/account'
import { DemoToast, useDemoToast } from '../components/ui/DemoToast'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/**
 * 个人中心 · 我的设备（二级页面）：设备卡片（已验证 / 未验证）。
 * 数据来自真实接口（按用户隔离）；「添加设备」尚未接入后端，点击给出演示提示。
 */
export function MeDevicesPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const { action: demoAction, notify, dismiss } = useDemoToast()

  const { data, loading, error } = useApi((signal) => fetchMyDevices(signal), [reloadKey])
  const devices = data?.items ?? []

  const readyKey = `${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  return (
    <div ref={rootRef}>
      <div className="section__head">
        <div>
          <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h3)' }}>
            我的设备
          </h2>
          <p className="section__desc" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
            同一型号可登记多台；未接入验证源时显示「未验证」。
          </p>
        </div>
        <button className="btn btn--secondary btn--sm" type="button" onClick={() => notify('添加设备')}>
          添加设备
        </button>
      </div>

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
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => notify('添加设备')}>
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
              <div className="row" style={{ marginTop: 'var(--gh-space-5)' }}>
                {device.action.to ? (
                  <Link className={`btn btn--sm btn--${device.action.variant}`} to={device.action.to}>
                    {device.action.label}
                  </Link>
                ) : (
                  <button
                    className={`btn btn--sm btn--${device.action.variant}`}
                    type="button"
                    onClick={() => notify(device.action.label)}
                  >
                    {device.action.label}
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

      <DemoToast action={demoAction} onDismiss={dismiss} />
    </div>
  )
}
