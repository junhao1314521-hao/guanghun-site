import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyInquiries } from '../api/account'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'
import { MePageHeader } from '../components/site/MePageHeader'

/** 个人中心 · 我的咨询（二级页面）：工单列表，点击进入时间线与补充材料 */
export function MeInquiriesPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const { data, loading, error } = useApi((signal) => fetchMyInquiries(signal), [reloadKey])
  const items = data?.items ?? []

  const readyKey = `${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  return (
    <div ref={rootRef}>
      <MePageHeader
        title="我的咨询"
        description="点击任一工单查看处理时间线并补充材料。"
        action={
          <Link className="btn btn--primary btn--sm is-magnetic" to="/inquiry">
            提交咨询
          </Link>
        }
      />

      {error ? (
        <div className="empty">
          <div className="empty__title">工单加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            重新加载
          </button>
        </div>
      ) : loading || !data ? (
        <div aria-busy="true" aria-label="工单加载中" className="me-tickets">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="skeleton" key={index} style={{ height: 72 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="empty">
          <div className="empty__title">暂无咨询记录</div>
          <p className="empty__desc">提交咨询后，工单会出现在这里供你跟踪进度。</p>
          <Link className="btn btn--secondary btn--sm" to="/inquiry">
            提交咨询
          </Link>
        </div>
      ) : (
        <div className="me-tickets reveal">
          {items.map((ticket) => (
            <Link className="me-ticket" to={`/me/inquiries/${ticket.id}`} key={ticket.id}>
              <div className="me-ticket__main">
                <div className="me-ticket__title">{ticket.title}</div>
                <div className="me-ticket__meta">
                  <span className="mono">{ticket.id}</span>
                  <span>{ticket.date}</span>
                </div>
              </div>
              <span className={`status status--${ticket.status}`}>{ticket.tag}</span>
              <span className="me-ticket__go" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
