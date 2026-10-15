/**
 * 后台「加载 / 空态 / 出错」三态统一层（P3）。
 * 所有列表与详情页共用同一套骨架屏、空态与错误态，
 * 避免各栏目各写一份导致留白、图标、重试入口参差不齐。
 */
import type { ReactNode } from 'react'
import { AdminIcon } from './AdminIcon'

/** 表格骨架：列数 / 行数可调，首列加宽以模拟标题列 */
export function SkeletonTable({ columns = 4, rows = 6 }: { columns?: number; rows?: number }) {
  const width = Math.max(columns, 3)
  return (
    <div className="admin-skeleton-table" role="status" aria-label="正在加载">
      {Array.from({ length: rows }).map((_, row) => (
        <div
          className="admin-skeleton-row"
          key={row}
          style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: width }).map((__, col) => (
            <span
              className={`skeleton admin-skeleton-bar${col === 0 ? ' admin-skeleton-bar--wide' : ''}`}
              key={col}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** 宫格骨架（素材 / 图片类栏目） */
export function SkeletonGallery({ count = 8 }: { count?: number }) {
  return (
    <div className="admin-gallery" role="status" aria-label="正在加载">
      {Array.from({ length: count }).map((_, i) => (
        <div className="admin-tile admin-tile--skeleton" key={i}>
          <div className="admin-tile__media skeleton" />
          <div className="admin-tile__body">
            <span className="skeleton admin-skeleton-bar" />
            <span className="skeleton admin-skeleton-bar" style={{ width: '60%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** 空态：徽标图标 + 标题 + 说明 +（可选）动作 */
export function EmptyState({
  icon = 'grid',
  title,
  desc,
  action,
}: {
  icon?: string
  title: string
  desc?: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <span className="empty__icon empty__icon--badge" aria-hidden="true">
        <AdminIcon name={icon} size={22} />
      </span>
      <div className="empty__title">{title}</div>
      {desc && <p className="empty__desc">{desc}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  )
}

/** 错误态：危险徽标 + 说明 +（可选）重试 */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="empty" role="alert">
      <span className="empty__icon empty__icon--badge empty__icon--danger" aria-hidden="true">
        <AdminIcon name="refresh" size={22} />
      </span>
      <div className="empty__title">加载失败</div>
      <p className="empty__desc">{message}</p>
      {onRetry && (
        <div className="empty__action">
          <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
            重试
          </button>
        </div>
      )}
    </div>
  )
}
