/**
 * 后台通用资源列表页。
 * 依据 `data/adminResources.ts` 的配置渲染工具栏（搜索 / 筛选）、表格或宫格，
 * 覆盖全部 40+ 栏目：新增栏目只需在配置中登记，本页零改动。
 * 支持：本地搜索、筛选、排序、分页（窗口化 + 每页条数）、批量选择删除、
 * 行内动作（超过 2 个收进「⋯」溢出菜单）、删除确认（ConfirmDialog）与右下角 Toast。
 */
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteAdminResource, fetchAdminResource, parseLegalDoc, saveAdminResource, type AdminList } from '../../api/admin'
import { adminResource, type AdminColumn, type AdminResource } from '../../data/adminResources'
import type { AdminRow } from '../../data/admin'
import { useApi } from '../../hooks/useApi'
import { AdminIcon } from '../../components/admin/AdminIcon'
import { AdminNotFound } from '../../components/admin/AdminNotFound'
import { AdminPageHead } from '../../components/admin/AdminPageHead'
import { AdminPagesList } from '../../components/admin/AdminPagesList'
import { AdminUploadsList } from '../../components/admin/AdminUploadsList'
import { AdminComponentsList } from '../../components/admin/AdminComponentsList'
import { AdminTemplatesList } from '../../components/admin/AdminTemplatesList'
import { AdminStylesPage } from '../../components/admin/AdminStylesPage'
import { AdminBackupsList } from '../../components/admin/AdminBackupsList'
import { AdminPublishList } from '../../components/admin/AdminPublishList'
import { AdminRolesView } from '../../components/admin/AdminRolesView'
import { AdminRequirementsView } from '../../components/admin/AdminRequirementsView'
import { AdminTrashList } from '../../components/admin/AdminTrashList'
import { OverflowMenu, type OverflowMenuItem } from '../../components/admin/OverflowMenu'
import { Select } from '../../components/admin/Select'
import { EmptyState, ErrorState, SkeletonGallery, SkeletonTable } from '../../components/admin/states'
import { useConfirm, useToast } from '../../components/admin/feedback'
import { IconClose, IconSearch } from '../../components/ui/Icon'

/** 每页条数候选 */
const PAGE_SIZES = [10, 20, 50]

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'muted'

/** 状态取值 → 语义色（未命中用 muted） */
const STATUS_TONE: Record<string, StatusTone> = {
  已上架: 'success', 已发布: 'success', 启用: 'success', 正常: 'success', 营业中: 'success', 运营中: 'success',
  已接入: 'success', 成功: 'success', 已发送: 'success', 已合作: 'success', 已解决: 'success', 已上线: 'success', 保修中: 'success',
  草稿: 'warning', 审核中: 'warning', 待审核: 'warning', 待处理: 'warning', 进行中: 'warning', 筹备中: 'warning',
  待激活: 'warning', 暂停: 'warning', 翻译中: 'warning', 未开始: 'warning', 定时: 'warning', 维修中: 'warning', 洽谈中: 'warning',
  已下架: 'danger', 冻结: 'danger', 已关闭: 'danger', 失败: 'danger', 已注销: 'danger', 已过保: 'danger', 停用: 'danger',
  处理中: 'info', 已结束: 'muted',
}

/** 已是色调 token 的级别值（如 products.status.level / inquiries.status）直接透传 */
const STATUS_LEVELS: readonly StatusTone[] = ['success', 'warning', 'danger', 'info', 'muted']

const KIND_ICON: Record<string, string> = { 图片: 'grid', 视频: 'monitor', 文档: 'doc' }

function statusTone(value: string): StatusTone {
  if ((STATUS_LEVELS as readonly string[]).includes(value)) return value as StatusTone
  return STATUS_TONE[value] ?? 'muted'
}

/** 单元格 → 纯文本（用于 title 悬浮全文与排序） */
function cellText(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.text === 'string') return record.text
    if (typeof record.level === 'string') return record.level
    if (Array.isArray(value)) return value.map(String).join('、')
    return ''
  }
  return String(value)
}

/** 排序键归一：数字保持数值，布尔转 0/1，其余转文本 */
function sortKey(value: unknown): number | string {
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  return cellText(value)
}

function compareValues(a: unknown, b: unknown): number {
  const va = sortKey(a)
  const vb = sortKey(b)
  if (typeof va === 'number' && typeof vb === 'number') return va - vb
  return String(va).localeCompare(String(vb), 'zh-Hans-CN')
}

/** 需要截断省略的长文本列（list / 说明等自由文本） */
function isClippedColumn(column: AdminColumn): boolean {
  return column.type === 'list' || column.type === undefined || column.type === 'text'
}

/** 按列类型渲染单元格（兼容对象 status / 字符串数组等规范形状） */
function renderCell(value: unknown, column: AdminColumn) {
  // 文件列：显式展示「有 / 无」，避免空值统一落到「—」而看不出语义
  if (column.type === 'file') {
    return value ? <span className="tag tag--accent">有</span> : <span className="admin-cell--muted">无</span>
  }
  if (value === undefined || value === null || value === '') return <span className="admin-cell--muted">—</span>
  switch (column.type) {
    case 'strong':
      return <strong>{String(value)}</strong>
    case 'mono':
      return <span className="mono">{String(value)}</span>
    case 'tag':
      return <span className="tag">{String(value)}</span>
    case 'status': {
      // 规范形状：products 为对象 { level, text }；其余栏目为字符串
      if (typeof value === 'object') {
        const status = value as { level?: unknown; text?: unknown }
        const text = typeof status.text === 'string' ? status.text : ''
        const level = typeof status.level === 'string' ? status.level : ''
        return <span className={`status status--${statusTone(level)}`}>{text}</span>
      }
      return <span className={`status status--${statusTone(String(value))}`}>{String(value)}</span>
    }
    case 'list':
      return <span>{Array.isArray(value) ? value.map(String).join('、') : String(value)}</span>
    case 'records':
      return <span>{Array.isArray(value) ? `${value.length} 条` : String(value)}</span>
    case 'bool':
      return <span className={`tag${value ? ' tag--accent' : ''}`}>{value ? '是' : '否'}</span>
    case 'number':
      return <span className="mono">{typeof value === 'number' ? value.toLocaleString('zh-CN') : String(value)}</span>
    default:
      return <>{String(value)}</>
  }
}

/** 窗口化页码：首页 / 末页 + 当前 ±2 + 省略号 */
function pageWindow(page: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: Array<number | '…'> = [1]
  const start = Math.max(2, page - 2)
  const end = Math.min(total - 1, page + 2)
  if (start > 2) out.push('…')
  for (let i = start; i <= end; i += 1) out.push(i)
  if (end < total - 1) out.push('…')
  out.push(total)
  return out
}

function AdminPager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null
  const pages = pageWindow(page, totalPages)
  return (
    <div className="pagination" role="navigation" aria-label="分页">
      <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)}>
        上一页
      </button>
      {pages.map((p, index) =>
        p === '…' ? (
          <span className="pagination__ellipsis" key={`e-${index}`} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            type="button"
            key={p}
            className={p === page ? 'is-active' : ''}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        下一页
      </button>
    </div>
  )
}

/** 读取文件为 base64（去掉 dataURL 前缀） */
function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''))
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

const LEGAL_EXT = ['docx', 'docm', 'dotx']

/**
 * 「法律条款」栏目专用：导入 Word 文档。
 * 流程：选文件 → 后端解析（仅解析，不落库）→ 生成草稿记录 → 跳转编辑页人工核对保存。
 */
function LegalImportButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!LEGAL_EXT.includes(ext)) {
      toast.error('仅支持 .docx / .docm / .dotx；老式 .doc 请先另存为 .docx')
      return
    }
    setBusy(true)
    try {
      const data = await readAsBase64(file)
      const { doc } = await parseLegalDoc(file.name, data)
      const saved = await saveAdminResource('legal', undefined, { ...doc })
      const id = saved.item?.id ? String(saved.item.id) : ''
      toast.success('已导入并生成草稿，请核对后保存。')
      if (id) navigate(`/admin/legal/${id}`)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '导入失败，请稍后重试')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".docx,.docm,.dotx"
        style={{ display: 'none' }}
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
      <button
        type="button"
        className={`btn btn--secondary btn--sm${busy ? ' btn--loading' : ''}`}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? '解析中…' : '导入 Word'}
      </button>
    </>
  )
}

function ResourceListBody({ resource }: { resource: AdminResource }) {
  const state = useApi<AdminList>((signal) => fetchAdminResource(resource.key, signal), [resource.key])
  const confirm = useConfirm()
  const toast = useToast()

  const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set())
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())

  const searchKeys = useMemo(() => resource.searchKeys ?? [], [resource])

  // 数据源 = 接口数据 − 本次会话已删除项（乐观删除，避免用 effect 反向同步 state）
  const rows = useMemo(
    () => (state.data?.items ?? []).filter((row) => !removed.has(String(row.id))),
    [state.data, removed],
  )

  // 动态筛选项：从当前已加载的行数据提取该字段的去重非空值（保持出现顺序）；提取为空则回退到配置的 options
  const dynamicOptions = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const filter of resource.filters ?? []) {
      if (!filter.dynamic) continue
      const seen = new Set<string>()
      const values: string[] = []
      for (const row of rows) {
        const value = String(row[filter.key] ?? '').trim()
        if (!value || seen.has(value)) continue
        seen.add(value)
        values.push(value)
      }
      map[filter.key] = values
    }
    return map
  }, [resource, rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      for (const [key, value] of Object.entries(filters)) {
        if (value && String(row[key] ?? '') !== value) return false
      }
      if (!q) return true
      return searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q))
    })
  }, [rows, filters, query, searchKeys])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const next = filtered.slice()
    next.sort((a, b) => {
      const result = compareValues(a[sort.key], b[sort.key])
      return sort.dir === 'asc' ? result : -result
    })
    return next
  }, [filtered, sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  const labelOf = (row: AdminRow) => String(row[resource.columns[0]?.key ?? 'id'] ?? row.id ?? '')

  const toggleSort = (column: AdminColumn) => {
    setSort((prev) => {
      if (!prev || prev.key !== column.key) return { key: column.key, dir: 'asc' }
      if (prev.dir === 'asc') return { key: column.key, dir: 'desc' }
      return null
    })
  }

  const onDelete = async (row: AdminRow) => {
    const ok = await confirm({
      title: '删除记录',
      message: `确认删除「${labelOf(row)}」？此操作不可撤销。`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteAdminResource(resource.key, String(row.id))
      setRemoved((prev) => new Set(prev).add(String(row.id)))
      toast.success(`已删除「${labelOf(row)}」`)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '删除失败')
    }
  }

  const onBulkDelete = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    const ok = await confirm({
      title: '批量删除',
      message: `确认删除选中的 ${ids.length} 项？此操作不可撤销。`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await Promise.all(ids.map((id) => deleteAdminResource(resource.key, id)))
      setRemoved((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })
      setSelected(new Set())
      toast.success(`已删除 ${ids.length} 项`)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '批量删除失败')
    }
  }

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pageIds = pageRows.map((row) => String(row.id))
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const someOnPageSelected = pageIds.some((id) => selected.has(id))
  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })
  }

  const hasActions = Boolean(resource.editable || resource.deletable)
  const canSelect = Boolean(resource.deletable)
  const colCount = resource.columns.length + (hasActions ? 1 : 0) + (canSelect ? 1 : 0)

  const rowActionItems = (row: AdminRow): OverflowMenuItem[] => {
    const items: OverflowMenuItem[] = []
    if (resource.editable) items.push({ key: 'edit', label: '编辑', to: `/admin/${resource.key}/${row.id}` })
    if (resource.deletable) items.push({ key: 'del', label: '删除', danger: true, onClick: () => void onDelete(row) })
    return items
  }

  const renderRowActions = (row: AdminRow) => {
    const items = rowActionItems(row)
    if (items.length === 0) return null
    // 超过 2 个动作时收进「⋯」溢出菜单
    if (items.length > 2) return <OverflowMenu items={items} />
    return (
      <div className="admin-table__actions">
        {items.map((item) =>
          item.to ? (
            <Link key={item.key} className="btn btn--ghost btn--sm" to={item.to}>
              {item.label}
            </Link>
          ) : (
            <button
              key={item.key}
              type="button"
              className={`btn btn--sm ${item.danger ? 'btn--danger-ghost' : 'btn--ghost'}`}
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ),
        )}
      </div>
    )
  }

  const countLabel = `共 ${filtered.length} 条${filtered.length !== rows.length ? `（筛选自 ${rows.length} 条）` : ''}`

  const toolbar = (
    <div className="admin-toolbar">
      {searchKeys.length > 0 && (
        <div className="admin-toolbar__search search">
          <span className="search__icon" aria-hidden="true">
            <IconSearch size={16} />
          </span>
          <input
            className="input"
            type="search"
            value={query}
            placeholder="搜索…"
            aria-label="搜索"
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
      )}

      {resource.filters?.map((filter) => {
        const dynamic = dynamicOptions[filter.key]
        const options = filter.dynamic && dynamic && dynamic.length > 0 ? dynamic : filter.options
        return (
          <div className="admin-filters" key={filter.key}>
            <span className="admin-filters__label">{filter.label}</span>
            <div className="admin-chipbar">
              <button
                type="button"
                className={`admin-chip${!filters[filter.key] ? ' is-active' : ''}`}
                onClick={() => {
                  setFilters((prev) => ({ ...prev, [filter.key]: '' }))
                  setPage(1)
                }}
              >
                全部
              </button>
              {options.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`admin-chip${filters[filter.key] === option ? ' is-active' : ''}`}
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, [filter.key]: option }))
                    setPage(1)
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )
      })}

      <span className="admin-toolbar__spacer" />

      {selected.size > 0 ? (
        <div className="admin-toolbar__selected" role="status">
          <span className="admin-table__count">已选 {selected.size} 项</span>
          <button type="button" className="btn btn--danger btn--sm" onClick={() => void onBulkDelete()}>
            批量删除
          </button>
        </div>
      ) : (
        <span className="admin-table__count">{countLabel}</span>
      )}
    </div>
  )

  return (
    <div className="admin-page">
      <AdminPageHead
        title={resource.title}
        desc={resource.desc}
        actions={
          <>
            {resource.key === 'legal' && <LegalImportButton />}
            {resource.creatable && (
              <Link className="btn btn--primary btn--sm" to={`/admin/${resource.key}/new`}>
                新建
              </Link>
            )}
          </>
        }
      />

      {toolbar}

      {resource.view === 'gallery' ? (
        state.loading && rows.length === 0 ? (
          <SkeletonGallery />
        ) : (
          <div className="admin-gallery">
            {pageRows.map((row) => (
              <Link className="admin-tile" to={`/admin/${resource.key}/${row.id}`} key={String(row.id)}>
                <div className="admin-tile__media">
                  <AdminIcon name={KIND_ICON[String(row.kind ?? '')] ?? 'grid'} size={28} />
                </div>
                <div className="admin-tile__body">
                  <span className="admin-tile__name">{String(row.name ?? '')}</span>
                  <span className="admin-tile__meta">
                    {String(row.kind ?? '')} · {String(row.size ?? '')}
                  </span>
                </div>
              </Link>
            ))}
            {pageRows.length === 0 && !state.loading && (
              <EmptyState title="暂无素材" desc="调整筛选条件，或新建素材。" />
            )}
          </div>
        )
      ) : (
        <div className="admin-table-wrap">
          {state.loading && rows.length === 0 ? (
            <SkeletonTable columns={colCount} />
          ) : state.error && rows.length === 0 ? (
            <div className="admin-table__empty">
              <ErrorState message={state.error.message} />
            </div>
          ) : pageRows.length === 0 ? (
            <div className="admin-table__empty">
              <EmptyState title="暂无数据" desc="调整搜索或筛选条件后再试。" />
            </div>
          ) : (
            <>
              <div className="admin-table-scroll">
                <table className="table admin-table">
                  <thead>
                    <tr>
                      {canSelect && (
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
                      )}
                      {resource.columns.map((column) => {
                        const sortable = column.sortable !== false
                        const active = sort === null ? 'none' : undefined
                        return (
                          <th
                            key={column.key}
                            scope="col"
                            style={column.align === 'right' ? { textAlign: 'right' } : undefined}
                            aria-sort={
                              sort?.key === column.key
                                ? sort.dir === 'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : active
                            }
                          >
                            {sortable ? (
                              <button type="button" className="admin-th-sort" onClick={() => toggleSort(column)}>
                                {column.label}
                                <span className="admin-th-sort__icon" aria-hidden="true">
                                  {sort?.key === column.key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                                </span>
                              </button>
                            ) : (
                              column.label
                            )}
                          </th>
                        )
                      })}
                      {hasActions && (
                        <th scope="col" style={{ textAlign: 'right' }}>
                          操作
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row) => {
                      const id = String(row.id)
                      return (
                        <tr key={id} className={selected.has(id) ? 'is-selected' : undefined}>
                          {canSelect && (
                            <td className="admin-table__check">
                              <input
                                type="checkbox"
                                checked={selected.has(id)}
                                aria-label={`选择「${labelOf(row)}」`}
                                onChange={() => toggleRow(id)}
                              />
                            </td>
                          )}
                          {resource.columns.map((column, columnIndex) => {
                            const clipped = isClippedColumn(column)
                            const text = cellText(row[column.key])
                            return (
                              <td
                                key={column.key}
                                className={
                                  [clipped ? 'admin-cell--clip' : '', columnIndex === 0 ? 'admin-cell--title' : '']
                                    .filter(Boolean)
                                    .join(' ') || undefined
                                }
                                // 窄屏卡片模式（≤767px）用 data-label 回填列名；首列作卡片标题
                                data-label={column.label}
                                style={column.align === 'right' ? { textAlign: 'right' } : undefined}
                                title={clipped && text ? text : undefined}
                              >
                                {renderCell(row[column.key], column)}
                              </td>
                            )
                          })}
                          {hasActions && (
                            <td style={{ textAlign: 'right' }}>{renderRowActions(row)}</td>
                          )}
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
                  <AdminPager page={safePage} totalPages={totalPages} onChange={setPage} />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function AdminResourceListPage() {
  const { key = '' } = useParams()
  const resource = adminResource(key)
  if (!resource) return <AdminNotFound />
  // 「页面」栏目为内容库自定义视图：由 AdminPagesList 承载（数据源 /api/admin/pages，含装修入口）
  if (resource.view === 'pages') return <AdminPagesList />
  // 「素材库」栏目为真实上传数据视图：由 AdminUploadsList 承载（数据源 /api/admin/uploads）
  if (resource.view === 'uploads') return <AdminUploadsList />
  // 「组件库」栏目为区块类型目录：由 AdminComponentsList 承载（数据源 /api/content/blocks/types）
  if (resource.view === 'components') return <AdminComponentsList />
  // 「模板」栏目为页面区块快照：由 AdminTemplatesList 承载（数据源 /api/admin/templates）
  if (resource.view === 'templates') return <AdminTemplatesList />
  // 「样式」栏目为站点级设计令牌编辑：由 AdminStylesPage 承载（数据源 /api/content/site）
  if (resource.view === 'styles') return <AdminStylesPage />
  // 「备份」栏目为快照管理：由 AdminBackupsList 承载（数据源 /api/admin/backups）
  if (resource.view === 'backups') return <AdminBackupsList />
  // 「预览与发布」栏目为发布记录与回滚：由 AdminPublishList 承载（数据源 /api/admin/publish，需 publish 权限）
  if (resource.view === 'publish') return <AdminPublishList />
  // 「角色与权限」栏目为角色 CRUD 与权限矩阵：由 AdminRolesView 承载（数据源 /api/admin/roles）
  if (resource.view === 'roles') return <AdminRolesView />
  // 「迭代需求池」栏目为列表 / 看板 / 四象限三视图：由 AdminRequirementsView 承载（数据源 /api/admin/resources/requirements）
  if (resource.view === 'board') return <AdminRequirementsView />
  // 「回收站」栏目为真实软删除视图：由 AdminTrashList 承载（数据源 /api/admin/resources/trash）
  if (resource.view === 'trash') return <AdminTrashList />
  return <ResourceListBody key={resource.key} resource={resource} />
}
