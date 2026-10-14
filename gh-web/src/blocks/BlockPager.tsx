import { useState } from 'react'

/**
 * 列表区块分页（数据源区块共用）：以 `pageSize` 控制每页条数；
 * `resetKey` 变化（如切换筛选）时自动回到第 1 页。
 */
export function useBlockPager(total: number, pageSize: number, resetKey: string) {
  const [state, setState] = useState({ key: resetKey, page: 1 })
  const page = state.key === resetKey ? state.page : 1
  const setPage = (next: number) => setState({ key: resetKey, page: next })
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  const safePage = Math.min(page, totalPages)
  return { page: safePage, setPage, totalPages }
}

/** 分页控件：仅总页数 > 1 时渲染（首尾页禁用上下页） */
export function BlockPager({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (next: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="row" style={{ justifyContent: 'center', marginTop: 'var(--gh-space-6)' }}>
      <div className="pagination" role="navigation" aria-label="分页">
        <button type="button" aria-label="上一页" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          ‹
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((n) => (
          <button
            key={n}
            type="button"
            className={n === page ? 'is-active' : undefined}
            aria-current={n === page ? 'page' : undefined}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
        <button type="button" aria-label="下一页" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          ›
        </button>
      </div>
    </div>
  )
}
