/**
 * 后台数据分析页：KPI 概览 + 柱状序列 + 明细表。数据来自 GET /api/admin/analytics/:scope。
 */
import { useParams } from 'react-router-dom'
import { fetchAdminAnalytics } from '../../api/admin'
import { ANALYTICS_SCOPES } from '../../data/adminResources'
import { useApi } from '../../hooks/useApi'
import { AdminNotFound } from '../../components/admin/AdminNotFound'
import { AdminPageHead } from '../../components/admin/AdminPageHead'

function AnalyticsBody({ scope }: { scope: string }) {
  const state = useApi((signal) => fetchAdminAnalytics(scope, signal), [scope])
  const data = state.data

  return (
    <div className="admin-page">
      <AdminPageHead title={data?.title ?? '数据分析'} desc={data?.desc ?? '加载中…'} />

      {state.loading && !data && <p className="admin-page__desc" role="status">正在加载数据…</p>}
      {state.error && (
        <div className="alert alert--danger" role="alert">
          {state.error.message}
        </div>
      )}

      {data && (
        <>
          <div className="admin-grid">
            {data.summary.map((stat) => (
              <div className="admin-kpi" key={stat.key}>
                <div className="admin-kpi__top">
                  <span className="admin-kpi__label">{stat.label}</span>
                  <span className={`admin-kpi__delta admin-kpi__delta--${stat.trend}`}>{stat.delta}</span>
                </div>
                <span className="admin-kpi__value">{stat.value.toLocaleString('zh-CN')}</span>
              </div>
            ))}
          </div>

          <section className="admin-panel" style={{ marginTop: 'var(--gh-space-5)' }}>
            <div className="admin-panel__head">
              <h2 className="admin-panel__title">趋势</h2>
            </div>
            <div className="admin-chart">
              {data.series.map((point) => {
                const max = Math.max(...data.series.map((s) => s.value), 1)
                const height = Math.max(4, Math.round((point.value / max) * 100))
                return (
                  <div className="admin-chart__col" key={point.label}>
                    <span className="admin-chart__value">{point.value.toLocaleString('zh-CN')}</span>
                    <div className="admin-chart__bar" style={{ height: `${height}%` }} />
                    <span className="admin-chart__label">{point.label}</span>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="admin-panel" style={{ marginTop: 'var(--gh-space-5)' }}>
            <div className="admin-panel__head">
              <h2 className="admin-panel__title">{data.tableTitle}</h2>
            </div>
            <div className="admin-table-scroll">
              <table className="table admin-table">
                <thead>
                  <tr>
                    {data.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className={cellIndex === 0 ? undefined : 'mono'}>
                          {typeof cell === 'number' ? cell.toLocaleString('zh-CN') : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export function AdminAnalyticsPage() {
  const { scope = '' } = useParams()
  if (!ANALYTICS_SCOPES.some((s) => s.scope === scope)) return <AdminNotFound title="未找到该分析" desc="该数据分析范围不存在。" />
  return <AnalyticsBody scope={scope} />
}