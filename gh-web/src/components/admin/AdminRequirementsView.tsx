/**
 * 「迭代需求池」自定义视图：列表 / 看板 / 影响×成本四象限 三种视角。
 * ============================================================
 * 数据源与新建 / 编辑流程复用通用资源接口：
 *   - 列表读 GET /api/admin/resources/requirements（与「列表」列配置同源）；
 *   - 新建 / 编辑仍走 AdminResourceFormPage（/admin/requirements/new 与 /admin/requirements/:id）。
 * 本组件只负责「换个角度看同一批数据」，不改动通用列表页架构。
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminResource } from '../../api/admin'
import { adminResource, type AdminColumn } from '../../data/adminResources'
import { useApi } from '../../hooks/useApi'
import { AdminPageHead } from './AdminPageHead'
import { EmptyState, ErrorState } from './states'

type ViewKey = 'list' | 'board' | 'quadrant'

/** 视图切换项 */
const VIEWS: Array<{ key: ViewKey; label: string }> = [
  { key: 'list', label: '列表' },
  { key: 'board', label: '看板' },
  { key: 'quadrant', label: '影响×成本 四象限' },
]

/** 看板列顺序：按需求生命周期排列 */
const STATUS_ORDER = ['待评审', '已排期', '进行中', '已完成', '暂缓'] as const

/** 状态 → 级别色调（与 .status--* 对应） */
const STATUS_TONE: Record<string, string> = {
  待评审: 'warning',
  已排期: 'info',
  进行中: 'warning',
  已完成: 'success',
  暂缓: 'muted',
}

/** MoSCoW 优先级 → 级别色调 */
const PRIORITY_TONE: Record<string, string> = {
  Must: 'danger',
  Should: 'warning',
  Could: 'info',
  "Won't": 'muted',
}

/** 在 1–5 范围内取数值（缺失 / 非数值回退 0） */
function rating(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(5, Math.max(0, n)) : 0
}

function str(value: unknown): string {
  return value === undefined || value === null ? '' : String(value)
}

/** 看板卡片 / 象限条目：标题 + 分类 + 优先级 + 版本，点击进编辑 */
function RequirementCard({ row }: { row: Record<string, string | number | boolean> }) {
  const id = str(row.id)
  const priority = str(row.priority)
  return (
    <Link
      className="admin-req-card"
      to={`/admin/requirements/${id}`}
      style={{
        display: 'block',
        padding: 'var(--gh-space-3) var(--gh-space-4)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--gh-radius-md)',
        background: 'var(--color-bg-surface)',
      }}
    >
      <span style={{ display: 'block', fontWeight: 'var(--gh-weight-medium)' }}>{str(row.title)}</span>
      <span
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 'var(--gh-space-2)',
          marginTop: 'var(--gh-space-2)',
          fontSize: 'var(--gh-font-size-body-sm)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <span className="tag">{str(row.category)}</span>
        {priority && <span className={`status status--${PRIORITY_TONE[priority] ?? 'muted'}`}>{priority}</span>}
        {str(row.version) && <span className="mono">{str(row.version)}</span>}
      </span>
    </Link>
  )
}

/** 列表视角：按「列表」列配置渲染一张紧凑表格 */
function RequirementTable({
  rows,
  columns,
}: {
  rows: Array<Record<string, string | number | boolean>>
  columns: AdminColumn[]
}) {
  return (
    <div className="admin-table-wrap">
      <div className="admin-table-scroll">
        <table className="table admin-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" style={column.align === 'right' ? { textAlign: 'right' } : undefined}>
                  {column.label}
                </th>
              ))}
              <th scope="col" style={{ textAlign: 'right' }}>
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={str(row.id)}>
                {columns.map((column, columnIndex) => {
                  const value = row[column.key]
                  return (
                    <td
                      key={column.key}
                      className={columnIndex === 0 ? 'admin-cell--title' : undefined}
                      data-label={column.label}
                      style={column.align === 'right' ? { textAlign: 'right' } : undefined}
                    >
                      {column.type === 'status' ? (
                        <span className={`status status--${STATUS_TONE[str(value)] ?? 'muted'}`}>{str(value)}</span>
                      ) : column.type === 'tag' ? (
                        <span className="tag">{str(value)}</span>
                      ) : column.type === 'mono' ? (
                        <span className="mono">{str(value)}</span>
                      ) : column.type === 'strong' ? (
                        <strong>{str(value)}</strong>
                      ) : column.type === 'number' ? (
                        <span className="mono">{str(value)}</span>
                      ) : (
                        str(value)
                      )}
                    </td>
                  )
                })}
                <td style={{ textAlign: 'right' }}>
                  <Link className="btn btn--ghost btn--sm" to={`/admin/requirements/${str(row.id)}`}>
                    编辑
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** 看板视角：按状态分列，卡片可点进编辑 */
function RequirementBoard({ rows }: { rows: Array<Record<string, string | number | boolean>> }) {
  const grouped = useMemo(() => {
    const map = new Map<string, Array<Record<string, string | number | boolean>>>()
    for (const status of STATUS_ORDER) map.set(status, [])
    for (const row of rows) {
      const status = str(row.status)
      if (!map.has(status)) map.set(status, [])
      map.get(status)?.push(row)
    }
    return map
  }, [rows])

  return (
    <div
      className="admin-req-board"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--gh-space-4)',
        alignItems: 'start',
      }}
    >
      {Array.from(grouped.entries()).map(([status, items]) => (
        <section key={status} className="admin-panel" style={{ padding: 'var(--gh-space-4)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--gh-space-3)',
            }}
          >
            <span className={`status status--${STATUS_TONE[status] ?? 'muted'}`}>{status}</span>
            <span className="admin-table__count">{items.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gh-space-3)' }}>
            {items.map((row) => (
              <RequirementCard key={str(row.id)} row={row} />
            ))}
            {items.length === 0 && <span className="admin-cell--muted">暂无需求</span>}
          </div>
        </section>
      ))}
    </div>
  )
}

/** 影响 × 成本 四象限：以「影响」（y）与「成本」（x）划分四格，给出行动建议 */
function RequirementQuadrant({ rows }: { rows: Array<Record<string, string | number | boolean>> }) {
  // 判定口径：影响 ≥ 4 视为高价值；成本 ≤ 2 视为低成本（其余为高成本 / 低价值）
  const quadrants = useMemo(() => {
    const q1: Array<Record<string, string | number | boolean>> = [] // 高价值 · 低成本
    const q2: Array<Record<string, string | number | boolean>> = [] // 高价值 · 高成本
    const q3: Array<Record<string, string | number | boolean>> = [] // 低价值 · 低成本
    const q4: Array<Record<string, string | number | boolean>> = [] // 低价值 · 高成本
    for (const row of rows) {
      const highImpact = rating(row.impact) >= 4
      const lowCost = rating(row.cost) <= 2
      if (highImpact && lowCost) q1.push(row)
      else if (highImpact) q2.push(row)
      else if (lowCost) q3.push(row)
      else q4.push(row)
    }
    return [
      { key: 'q1', title: '优先做 · Quick Wins', desc: '高价值 · 低成本', items: q1 },
      { key: 'q2', title: '重点项目 · Major', desc: '高价值 · 高成本', items: q2 },
      { key: 'q3', title: '顺手做 · Fill-ins', desc: '低价值 · 低成本', items: q3 },
      { key: 'q4', title: '暂缓 · 谨慎投入', desc: '低价值 · 高成本', items: q4 },
    ]
  }, [rows])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 'var(--gh-space-4)',
        alignItems: 'start',
      }}
    >
      {quadrants.map((quadrant) => (
        <section key={quadrant.key} className="admin-panel" style={{ padding: 'var(--gh-space-4)' }}>
          <div className="admin-panel__head">
            <h2 className="admin-panel__title">{quadrant.title}</h2>
            <span className="admin-table__count">{quadrant.items.length}</span>
          </div>
          <p className="admin-page__desc" style={{ marginTop: 0 }}>
            {quadrant.desc}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gh-space-3)' }}>
            {quadrant.items.map((row) => (
              <RequirementCard key={str(row.id)} row={row} />
            ))}
            {quadrant.items.length === 0 && <span className="admin-cell--muted">暂无需求</span>}
          </div>
        </section>
      ))}
    </div>
  )
}

export function AdminRequirementsView() {
  const resource = adminResource('requirements')
  const state = useApi((signal) => fetchAdminResource('requirements', signal), [])
  const [view, setView] = useState<ViewKey>('list')

  const rows = state.data?.items ?? []
  const columns = resource?.columns ?? []

  return (
    <div className="admin-page">
      <AdminPageHead
        title={resource?.title ?? '迭代需求池'}
        desc={resource?.desc}
        actions={
          <Link className="btn btn--primary btn--sm" to="/admin/requirements/new">
            新建
          </Link>
        }
      />

      {/* 视角切换（列表 / 看板 / 四象限），与列表页工具栏样式一致 */}
      <div className="admin-toolbar">
        <div className="admin-filters">
          <span className="admin-filters__label">视图</span>
          <div className="admin-chipbar">
            {VIEWS.map((item) => (
              <button
                type="button"
                key={item.key}
                className={`admin-chip${view === item.key ? ' is-active' : ''}`}
                onClick={() => setView(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <span className="admin-toolbar__spacer" />
        <span className="admin-table__count">共 {rows.length} 条</span>
      </div>

      {state.loading && rows.length === 0 && (
        <p className="admin-page__desc" role="status">
          正在加载需求…
        </p>
      )}
      {state.error && <ErrorState message={state.error.message} />}

      {!state.error && !state.loading && rows.length === 0 && (
        <EmptyState icon="venn" title="暂无需求" desc="点击右上角「新建」登记第一条迭代需求。" />
      )}

      {rows.length > 0 && view === 'list' && <RequirementTable rows={rows} columns={columns} />}
      {rows.length > 0 && view === 'board' && <RequirementBoard rows={rows} />}
      {rows.length > 0 && view === 'quadrant' && <RequirementQuadrant rows={rows} />}
    </div>
  )
}
