/**
 * 后台 · 产品列表（专用视图）。
 *
 * 与通用资源表格的区别：
 * - 默认只保留「产品 / 分类 / 状态 / 价格 / 更新时间 / 操作」6 列；
 * - 产品列合并缩略图 + 名称 + 型号 + 3 条核心参数，避免横向铺满字段；
 * - 提供表格 / 卡片两种视图，卡片用于视觉化浏览；
 * - 搜索、分类、状态、排序、批量删除与分页保持原有能力。
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteAdminResource, fetchAdminResource } from '../../api/admin'
import { useApi } from '../../hooks/useApi'
import { MEDIA } from '../../data/media'
import { AdminIcon } from '../../components/admin/AdminIcon'
import { AdminPageHead } from '../../components/admin/AdminPageHead'
import { Select } from '../../components/admin/Select'
import { EmptyState, ErrorState, SkeletonTable } from '../../components/admin/states'
import { useConfirm, useToast } from '../../components/admin/feedback'
import { IconClose, IconSearch } from '../../components/ui/Icon'

const PAGE_SIZES = [10, 20, 50]

type ProductRow = Record<string, unknown>
type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'muted'

const STATUS_TONE: Record<string, StatusTone> = {
  在售: 'success',
  缺货: 'warning',
  下架: 'danger',
  草稿: 'muted',
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''
}

function specsOf(row: ProductRow): string[] {
  return Array.isArray(row.specs) ? row.specs.map(String).filter(Boolean) : []
}

function statusOf(row: ProductRow): { level: StatusTone; text: string } {
  const raw = row.status
  if (raw && typeof raw === 'object') {
    const status = raw as { level?: unknown; text?: unknown }
    const level = typeof status.level === 'string' ? status.level : ''
    return {
      level: (['success', 'warning', 'danger', 'info', 'muted'] as const).includes(level as StatusTone)
        ? (level as StatusTone)
        : STATUS_TONE[text(status.text)] ?? 'muted',
      text: text(status.text) || '—',
    }
  }
  const label = text(raw) || '—'
  return { level: STATUS_TONE[label] ?? 'muted', text: label }
}

function imageOf(row: ProductRow): string {
  const gallery = Array.isArray(row.gallery) ? row.gallery.map(String).filter(Boolean) : []
  if (gallery[0]) return gallery[0]
  const id = text(row.id)
  return (MEDIA.product as Record<string, string | undefined>)[id] ?? ''
}

function priceValue(row: ProductRow): number {
  const value = Number(row.priceValue)
  if (Number.isFinite(value)) return value
  return 0
}

function ProductThumb({ row, size = 48, fluid = false }: { row: ProductRow; size?: number; fluid?: boolean }) {
  const src = imageOf(row)
  const alt = text(row.name) || text(row.model)
  return (
    <span
      className="admin-product-thumb"
      style={fluid ? { width: '100%', height: '100%' } : { width: size, height: size }}
    >
      {src ? <img src={src} alt={alt} loading="lazy" /> : <AdminIcon name="cube" size={size > 40 ? 20 : 16} />}
    </span>
  )
}

export function AdminProductsList() {
  const state = useApi((signal) => fetchAdminResource('products', signal), [])
  const confirm = useConfirm()
  const toast = useToast()

  const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set())
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('recommended')
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())

  const rows = useMemo(
    () => ((state.data?.items ?? []) as ProductRow[]).filter((row) => !removed.has(text(row.id))),
    [state.data, removed],
  )

  const categories = useMemo(
    () => Array.from(new Set(rows.map((row) => text(row.category)).filter(Boolean))),
    [rows],
  )
  const statuses = useMemo(
    () => Array.from(new Set(rows.map((row) => statusOf(row).text).filter((value) => value !== '—'))),
    [rows],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = rows.filter((row) => {
      if (category && text(row.category) !== category) return false
      if (status && statusOf(row).text !== status) return false
      if (!q) return true
      return [text(row.name), text(row.model)].some((value) => value.toLowerCase().includes(q))
    })
    const sorted = [...list]
    if (sort === 'price-asc') sorted.sort((a, b) => priceValue(a) - priceValue(b))
    else if (sort === 'price-desc') sorted.sort((a, b) => priceValue(b) - priceValue(a))
    else if (sort === 'newest') sorted.sort((a, b) => text(b.releasedAt).localeCompare(text(a.releasedAt)))
    else if (sort === 'name') sorted.sort((a, b) => text(a.name).localeCompare(text(b.name), 'zh-Hans-CN'))
    return sorted
  }, [rows, query, category, status, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const pageIds = pageRows.map((row) => text(row.id))
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const someOnPageSelected = pageIds.some((id) => selected.has(id))

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })
  }

  const onDelete = async (row: ProductRow) => {
    const name = text(row.name) || text(row.model) || '该产品'
    const ok = await confirm({
      title: '删除产品',
      message: `确认删除「${name}」？此操作不可撤销。`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteAdminResource('products', text(row.id))
      setRemoved((prev) => new Set(prev).add(text(row.id)))
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(text(row.id))
        return next
      })
      toast.success(`已删除「${name}」`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  const onBulkDelete = async () => {
    const ids = Array.from(selected)
    if (!ids.length) return
    const ok = await confirm({
      title: '批量删除',
      message: `确认删除选中的 ${ids.length} 款产品？此操作不可撤销。`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await Promise.all(ids.map((id) => deleteAdminResource('products', id)))
      setRemoved((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })
      setSelected(new Set())
      toast.success(`已删除 ${ids.length} 款产品`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '批量删除失败')
    }
  }

  return (
    <div className="admin-page admin-products">
      <AdminPageHead
        title="产品列表"
        desc="管理在售、缺货与草稿产品；列表只保留决策所需信息，详情与完整参数进入编辑页。"
        actions={
          <Link className="btn btn--primary btn--sm" to="/admin/products/new">
            新建产品
          </Link>
        }
      />

      <div className="admin-products__toolbar">
        <div className="admin-products__search search">
          <span className="search__icon" aria-hidden="true">
            <IconSearch size={16} />
          </span>
          <input
            className="input"
            type="search"
            value={query}
            placeholder="搜索产品名称 / 型号"
            aria-label="搜索产品"
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
          />
          {query && (
            <button
              type="button"
              className="admin-search__clear"
              aria-label="清空搜索"
              onClick={() => {
                setQuery('')
                setPage(1)
              }}
            >
              <IconClose size={14} />
            </button>
          )}
        </div>

        <Select
          aria-label="分类筛选"
          value={category}
          onChange={(value) => {
            setCategory(value)
            setPage(1)
          }}
          options={[{ value: '', label: '全部分类' }, ...categories.map((item) => ({ value: item, label: item }))]}
        />

        <Select
          aria-label="状态筛选"
          value={status}
          onChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          options={[{ value: '', label: '全部状态' }, ...statuses.map((item) => ({ value: item, label: item }))]}
        />

        <span className="admin-products__spacer" />

        {selected.size > 0 ? (
          <div className="admin-products__selected" role="status">
            <span>已选 {selected.size} 款</span>
            <button type="button" className="btn btn--danger btn--sm" onClick={() => void onBulkDelete()}>
              批量删除
            </button>
          </div>
        ) : (
          <span className="admin-products__count">共 {filtered.length} 款</span>
        )}

        <Select
          aria-label="排序"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'recommended', label: '推荐排序' },
            { value: 'newest', label: '最新上新' },
            { value: 'price-asc', label: '价格从低到高' },
            { value: 'price-desc', label: '价格从高到低' },
            { value: 'name', label: '名称排序' },
          ]}
        />

        <div className="admin-products__view" role="group" aria-label="视图切换">
          <button type="button" className={view === 'table' ? 'is-active' : ''} aria-pressed={view === 'table'} onClick={() => setView('table')}>
            表格
          </button>
          <button type="button" className={view === 'cards' ? 'is-active' : ''} aria-pressed={view === 'cards'} onClick={() => setView('cards')}>
            卡片
          </button>
        </div>
      </div>

      {state.loading && rows.length === 0 ? (
        <SkeletonTable columns={6} />
      ) : state.error && rows.length === 0 ? (
        <ErrorState message={state.error.message} />
      ) : pageRows.length === 0 ? (
        <EmptyState title="暂无产品" desc="调整搜索或筛选条件，或新建一款产品。" />
      ) : view === 'cards' ? (
        <div className="admin-products__cards">
          {pageRows.map((row) => {
            const id = text(row.id)
            const statusInfo = statusOf(row)
            const isSelected = selected.has(id)
            return (
              <article className={`admin-product-card${isSelected ? ' is-selected' : ''}`} key={id}>
                <div className="admin-product-card__media">
                  <ProductThumb row={row} fluid />
                  {text(row.flag) && <span className="tag tag--accent admin-product-card__flag">{text(row.flag)}</span>}
                  <label className="admin-product-card__check">
                    <input type="checkbox" checked={isSelected} aria-label={`选择 ${text(row.name)}`} onChange={() => toggleRow(id)} />
                  </label>
                </div>
                <div className="admin-product-card__body">
                  <span className="admin-product-card__model">{text(row.model)}</span>
                  <h3 className="admin-product-card__name">{text(row.name)}</h3>
                  <p className="admin-product-card__specs">{specsOf(row).slice(0, 3).join(' · ')}</p>
                  <div className="admin-product-card__meta">
                    <span className={`status status--${statusInfo.level}`}>{statusInfo.text}</span>
                    <span className="admin-product-card__price">{text(row.price)}</span>
                  </div>
                  <div className="admin-product-card__actions">
                    <Link className="btn btn--secondary btn--sm" to={`/admin/products/${id}`}>
                      编辑
                    </Link>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => void onDelete(row)}>
                      删除
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="admin-table-wrap admin-products__table-wrap">
          <div className="admin-table-scroll">
            <table className="table admin-table admin-products__table">
              <thead>
                <tr>
                  <th className="admin-table__check" scope="col">
                    <input
                      type="checkbox"
                      ref={(input) => {
                        if (input) input.indeterminate = someOnPageSelected && !allOnPageSelected
                      }}
                      checked={allOnPageSelected}
                      aria-label="全选本页"
                      onChange={toggleAllOnPage}
                    />
                  </th>
                  <th scope="col">产品</th>
                  <th scope="col">分类</th>
                  <th scope="col">状态</th>
                  <th scope="col" style={{ textAlign: 'right' }}>价格</th>
                  <th scope="col">更新时间</th>
                  <th scope="col" style={{ textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const id = text(row.id)
                  const statusInfo = statusOf(row)
                  return (
                    <tr key={id} className={selected.has(id) ? 'is-selected' : undefined}>
                      <td className="admin-table__check">
                        <input
                          type="checkbox"
                          checked={selected.has(id)}
                          aria-label={`选择 ${text(row.name)}`}
                          onChange={() => toggleRow(id)}
                        />
                      </td>
                      <td>
                        <div className="admin-product-cell">
                          <ProductThumb row={row} />
                          <div className="admin-product-cell__text">
                            <Link className="admin-product-cell__name" to={`/admin/products/${id}`}>
                              {text(row.name)}
                            </Link>
                            <span className="admin-product-cell__meta">
                              {text(row.model)}
                              {specsOf(row).length > 0 && ` · ${specsOf(row).slice(0, 3).join(' · ')}`}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td><span className="tag">{text(row.category) || '—'}</span></td>
                      <td><span className={`status status--${statusInfo.level}`}>{statusInfo.text}</span></td>
                      <td className="mono" style={{ textAlign: 'right' }}>{text(row.price) || '—'}</td>
                      <td className="mono">{text(row.releasedAt) || '—'}</td>
                      <td>
                        <div className="admin-table__actions">
                          <Link className="btn btn--ghost btn--sm" to={`/admin/products/${id}`}>
                            编辑
                          </Link>
                          <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => void onDelete(row)}>
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="admin-table__foot">
            <div className="admin-table__foot-right">
              <span className="admin-table__pagesize">
                每页
                <Select
                  aria-label="每页条数"
                  value={String(pageSize)}
                  onChange={(next) => {
                    setPageSize(Number(next))
                    setPage(1)
                  }}
                  options={PAGE_SIZES.map((size) => ({ value: String(size), label: `${size} 条` }))}
                />
              </span>
              {totalPages > 1 && (
                <div className="pagination" role="navigation" aria-label="分页">
                  <button type="button" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>上一页</button>
                  <span className="admin-products__page">第 {safePage} / {totalPages} 页</span>
                  <button type="button" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>下一页</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'cards' && totalPages > 1 && (
        <div className="admin-products__cards-pager">
          <button type="button" className="btn btn--secondary btn--sm" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>
            上一页
          </button>
          <span className="admin-products__page">第 {safePage} / {totalPages} 页</span>
          <button type="button" className="btn btn--secondary btn--sm" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
