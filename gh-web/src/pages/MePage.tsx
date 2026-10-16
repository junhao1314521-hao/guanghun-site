import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAccountOverview, fetchMyInquiries } from '../api/account'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/** 个人中心 · 概览（二级页面）：统计卡 + 提醒条 + 最近工单（数据来自真实接口，按用户隔离） */
export function MePage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const overview = useApi((signal) => fetchAccountOverview(signal), [reloadKey])
  const inquiries = useApi((signal) => fetchMyInquiries(signal), [reloadKey])

  const items = inquiries.data?.items ?? []
  const stats = overview.data
    ? [
        { value: String(overview.data.stats.devices), label: '已登记设备' },
        { value: String(overview.data.stats.inquiries), label: '咨询工单' },
        { value: String(overview.data.stats.favorites), label: '收藏型号' },
        { value: String(overview.data.stats.notifications), label: '订阅通知' },
      ]
    : []

  const loading = overview.loading || inquiries.loading
  const error = overview.error || inquiries.error
  const alert =
    items.length > 0
      ? `你有 ${items.length} 条咨询工单，可在「我的咨询」查看处理进度。`
      : '暂无进行中的咨询工单；如需帮助可在服务支持页提交咨询。'

  const readyKey = `${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  return (
    <div ref={rootRef}>
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
          <div className="grid-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="card" key={index}>
                <div className="skeleton" style={{ height: 30, width: '40%' }} />
                <div className="skeleton" style={{ height: 14, width: '66%', marginTop: 'var(--gh-space-2)' }} />
              </div>
            ))}
          </div>
          <div className="skeleton" style={{ height: 48, marginTop: 'var(--gh-space-5)' }} />
        </div>
      ) : (
        <>
          <section style={{ marginBottom: 'var(--gh-space-7)' }}>
            <h2 className="section__title">
              概览
            </h2>
            <div className="grid-3" style={{ marginTop: 'var(--gh-space-5)' }}>
              {stats.map((item) => (
                <div className="card reveal" key={item.label}>
                  <div className="stat__value">{item.value}</div>
                  <div className="stat__label">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="alert alert--info reveal" style={{ marginTop: 'var(--gh-space-5)' }}>
              {alert}
            </div>
          </section>

          <section>
            <div className="section__head">
              <div>
                <h2 className="section__title">
                  最近工单
                </h2>
                <p className="section__desc">
                  状态流转：待处理 → 处理中 → 等待补充 → 已解决 → 已关闭。
                </p>
              </div>
              <Link className="btn btn--ghost btn--sm" to="/me/inquiries">
                查看全部 →
              </Link>
            </div>
            <div className="news-list reveal">
              {items.slice(0, 3).map((ticket) => (
                <Link className="news-row" to={`/me/inquiries/${ticket.id}`} key={ticket.id}>
                  <span className="news-row__date">{ticket.date}</span>
                  <span className={`status status--${ticket.status}`}>{ticket.tag}</span>
                  <span className="news-row__title">{ticket.title}</span>
                  <span className="news-row__go" aria-hidden="true">
                    →
                  </span>
                </Link>
              ))}
              {items.length === 0 && (
                <div className="news-row">
                  <span className="news-row__title muted">暂无咨询记录</span>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
