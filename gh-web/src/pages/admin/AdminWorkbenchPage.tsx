/**
 * 工作台首页：概览指标 + 待办 + 最近动态。数据来自 GET /api/admin/overview。
 */
import { Link } from 'react-router-dom'
import { fetchAdminOverview } from '../../api/admin'
import { useApi } from '../../hooks/useApi'
import { adminResource } from '../../data/adminResources'
import { AdminIcon } from '../../components/admin/AdminIcon'
import { AdminPageHead } from '../../components/admin/AdminPageHead'

export function AdminWorkbenchPage() {
  const state = useApi((signal) => fetchAdminOverview(signal), [])
  const overview = state.data

  return (
    <div className="admin-page">
      <AdminPageHead title="工作台" desc="站点运营概览：关键指标、待办事项与最近操作动态。" />

      {state.loading && !overview && <p className="admin-page__desc" role="status">正在加载概览…</p>}
      {state.error && (
        <div className="alert alert--danger" role="alert">
          {state.error.message}
        </div>
      )}

      {overview && (
        <>
          <div className="admin-grid">
            {overview.stats.map((stat) => (
              <div className="admin-kpi" key={stat.key}>
                <div className="admin-kpi__top">
                  <span className="admin-kpi__icon">
                    <AdminIcon name={adminResource(stat.key)?.icon ?? 'grid'} size={18} />
                  </span>
                  <span className={`admin-kpi__delta admin-kpi__delta--${stat.trend}`}>{stat.delta}</span>
                </div>
                <span className="admin-kpi__value">{stat.value.toLocaleString('zh-CN')}</span>
                <span className="admin-kpi__label">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="admin-cols">
            <section className="admin-panel">
              <div className="admin-panel__head">
                <h2 className="admin-panel__title">最近动态</h2>
              </div>
              <div className="admin-table-scroll">
                <table className="table admin-table">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>操作人</th>
                      <th>操作</th>
                      <th>对象</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.recent.map((row) => (
                      <tr key={row.id}>
                        <td className="mono">{row.at}</td>
                        <td>{row.who}</td>
                        <td>{row.action}</td>
                        <td>{row.target}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-panel__head">
                <h2 className="admin-panel__title">待办事项</h2>
              </div>
              <div className="admin-todo">
                {overview.todos.map((todo) => (
                  <Link className="admin-todo__item" to={todo.to} key={todo.id}>
                    <span className="admin-todo__label">
                      <span className="admin-kpi__icon" style={{ width: 26, height: 26 }}>
                        <AdminIcon name="grid" size={14} />
                      </span>
                      {todo.label}
                    </span>
                    <span className="admin-todo__count">{todo.count}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}