import { useEffect, useRef, useState } from 'react'
import { fetchMyNotifications, updateMyNotifications } from '../api/account'
import type { NotificationSetting } from '../api/account'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/**
 * 个人中心 · 订阅与通知（二级页面）：通知开关列表（数据来自真实接口，按用户隔离）。
 * 切换开关即调用 PUT /api/account/notifications 持久化，变更即时生效。
 */
export function MeNotificationsPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [items, setItems] = useState<NotificationSetting[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data, loading, error } = useApi((signal) => fetchMyNotifications(signal), [reloadKey])

  // 接口数据到位后同步到本地可编辑状态
  useEffect(() => {
    if (data) setItems(data.items)
  }, [data])

  const readyKey = `${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  const toggle = async (id: string, enabled: boolean) => {
    if (!items) return
    const next = items.map((item) => (item.id === id ? { ...item, enabled } : item))
    setItems(next) // 乐观更新
    setSaving(true)
    setSaveError(null)
    try {
      await updateMyNotifications(next)
    } catch (ex) {
      setSaveError(ex instanceof Error ? ex.message : '保存失败，请稍后重试')
      setReloadKey((key) => key + 1) // 回源纠正
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={rootRef}>
      <div className="section__head">
        <div>
          <h2 className="section__title">
            订阅与通知
          </h2>
          <p className="section__desc">
            选择需要接收的通知类型；变更即时生效。
          </p>
        </div>
      </div>

      {error ? (
        <div className="empty">
          <div className="empty__title">通知设置加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            重新加载
          </button>
        </div>
      ) : loading || !items ? (
        <div className="card" aria-busy="true" aria-label="通知设置加载中">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="skeleton" key={index} style={{ height: 40, marginTop: index === 0 ? 0 : 'var(--gh-space-3)' }} />
          ))}
        </div>
      ) : (
        <div className="card reveal">
          {items.map((item, index) => (
            <div
              className="row"
              key={item.id}
              style={{
                justifyContent: 'space-between',
                paddingTop: index === 0 ? 0 : 'var(--gh-space-3)',
                paddingBottom: index === items.length - 1 ? 0 : 'var(--gh-space-3)',
                borderBottom: index === items.length - 1 ? undefined : '1px solid var(--color-border-subtle)',
              }}
            >
              <div>
                <div style={{ fontWeight: 'var(--gh-weight-medium)' }}>{item.label}</div>
                <div className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                  {item.desc}
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  disabled={saving}
                  onChange={(event) => void toggle(item.id, event.target.checked)}
                />
                <span className="switch__track" />
                <span className="sr-only">{item.label}</span>
              </label>
            </div>
          ))}
        </div>
      )}

      {saveError && (
        <div className="alert alert--danger" role="alert" style={{ marginTop: 'var(--gh-space-4)' }}>
          {saveError}
        </div>
      )}

      <p className="field__hint" style={{ marginTop: 'var(--gh-space-4)' }}>
        关停「工单提醒」后，工单状态变更仍可在个人中心查看，但不再推送通知。
      </p>
    </div>
  )
}
