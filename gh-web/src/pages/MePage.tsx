import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAccountOverview, fetchMyInquiries } from '../api/account'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'
import { MePageHeader } from '../components/site/MePageHeader'

/** 个人中心 · 概览：先处理待办，再看资产与最近工单（数据按用户隔离） */
export function MePage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const overview = useApi((signal) => fetchAccountOverview(signal), [reloadKey])
  const inquiries = useApi((signal) => fetchMyInquiries(signal), [reloadKey])

  const items = inquiries.data?.items ?? []
  const stats = overview.data
    ? [
        { value: overview.data.stats.devices, label: '已登记设备', to: '/me/devices' },
        { value: overview.data.stats.inquiries, label: '咨询工单', to: '/me/inquiries' },
        { value: overview.data.stats.favorites, label: '收藏型号', to: '/me/favorites' },
        { value: overview.data.stats.notifications, label: '订阅通知', to: '/me/notifications' },
      ]
    : []

  const loading = overview.loading || inquiries.loading
  const error = overview.error || inquiries.error

  /** 待办：只收「需要用户动作」的事项，避免概览退化成数字看板 */
  const todos = [
    ...items
      .filter((ticket) => ticket.status === 'warning')
      .map((ticket) => ({
        text: `工单「${ticket.title}」等待你补充资料`,
        cta: '去补充',
        to: `/me/inquiries/${ticket.id}`,
      })),
    ...(overview.data && !overview.data.user.phone
      ? [{ text: '还没有绑定手机号，绑定后可接收服务通知与找回账号', cta: '去绑定', to: '/me/settings' }]
      : []),
  ]

  const readyKey = `${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  return (
    <div ref={rootRef}>
      <MePageHeader
        title="个人中心"
        description="先处理需要你动作的事项，再查看账号下的设备、工单与收藏。"
      />

      {error ? (
        <div className="empty">
          <div className="empty__title">概览加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            重新加载
          </button>
        </div>
      ) : loading || !overview.data ? (
        <div aria-busy="true" aria-label="概览加载中">
          <div className="skeleton" style={{ height: 72, marginBottom: 'var(--gh-space-6)' }} />
          <div className="me-assets">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="skeleton" key={index} style={{ height: 96 }} />
            ))}
          </div>
          <div className="skeleton" style={{ height: 160, marginTop: 'var(--gh-space-6)' }} />
        </div>
      ) : (
        <>
          <section className="me-section" aria-labelledby="me-todo-title">
            <div className="me-section__head">
              <h2 className="me-section__title" id="me-todo-title">
                待处理
              </h2>
              {todos.length > 0 ? <span className="me-section__meta">{todos.length} 项</span> : null}
            </div>
            {todos.length > 0 ? (
              <div className="me-todos reveal">
                {todos.map((todo) => (
                  <div className="card me-todo" key={todo.text}>
                    <span className="me-todo__dot" aria-hidden="true" />
                    <span className="me-todo__text">{todo.text}</span>
                    <Link className="btn btn--primary btn--sm" to={todo.to}>
                      {todo.cta}
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="me-clear reveal">
                <span className="me-clear__icon" aria-hidden="true">
                  ✓
                </span>
                账号状态良好，暂时没有需要你处理的事项。
              </div>
            )}
          </section>

          <section className="me-section" aria-labelledby="me-assets-title">
            <div className="me-section__head">
              <h2 className="me-section__title" id="me-assets-title">
                我的资产
              </h2>
            </div>
            <div className="me-assets">
              {stats.map((item) => (
                <Link className={`me-asset reveal${item.value === 0 ? ' is-zero' : ''}`} to={item.to} key={item.label}>
                  <span className="me-asset__value">{item.value}</span>
                  <span className="me-asset__label">{item.label}</span>
                  <span className="me-asset__go" aria-hidden="true">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="me-section" aria-labelledby="me-activity-title">
            <div className="me-section__head">
              <h2 className="me-section__title" id="me-activity-title">
                最近工单
              </h2>
              <Link className="me-section__link" to="/me/inquiries">
                查看全部 →
              </Link>
            </div>
            {items.length > 0 ? (
              <div className="me-activity reveal">
                {items.slice(0, 5).map((ticket) => (
                  <Link className="me-activity__row" to={`/me/inquiries/${ticket.id}`} key={ticket.id}>
                    <span className="me-activity__date">{ticket.date}</span>
                    <span className={`status status--${ticket.status}`}>{ticket.tag}</span>
                    <span className="me-activity__title">{ticket.title}</span>
                    <span className="me-activity__go" aria-hidden="true">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="me-empty reveal">
                <div>
                  <div className="me-empty__title">还没有咨询工单</div>
                  <p className="me-empty__desc">遇到适配、保修或固件问题，提交后可以在这里跟踪处理进度。</p>
                </div>
                <Link className="btn btn--secondary btn--sm" to="/inquiry">
                  提交咨询
                </Link>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
