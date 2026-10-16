import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyInquiries } from '../api/account'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/** 个人中心 · 我的咨询（二级页面 · 骨架层）：工单列表，状态用 .status，链接到详情 */
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
      <div className="section__head">
        <div>
          <h2 className="section__title">
            我的咨询
          </h2>
          <p className="section__desc">
            点击任一工单查看处理时间线并补充材料。
          </p>
        </div>
        <Link className="btn btn--primary btn--sm is-magnetic" to="/inquiry">
          提交咨询
        </Link>
      </div>

      {error ? (
        <div className="empty">
          <div className="empty__title">工单加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            重新加载
          </button>
        </div>
      ) : loading || !data ? (
        <div aria-busy="true" aria-label="工单加载中" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gh-space-3)' }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="skeleton" key={index} style={{ height: 52 }} />
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
        <div className="table-wrap reveal">
          <table className="table">
            <thead>
              <tr>
                <th>工单编号</th>
                <th>标题</th>
                <th>状态</th>
                <th>更新日期</th>
                <th>
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="mono">{ticket.id}</td>
                  <td>{ticket.title}</td>
                  <td>
                    <span className={`status status--${ticket.status}`}>{ticket.tag}</span>
                  </td>
                  <td className="mono">{ticket.date}</td>
                  <td>
                    <Link className="btn btn--sm btn--secondary" to={`/me/inquiries/${ticket.id}`}>
                      查看
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}