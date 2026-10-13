/**
 * 10. productGrid 产品（数据源区块，契约 §4 / §8）
 * props: title / source:'featured'|'all'|'series' / seriesId? / limit:number / columns:2|3|4
 *        / showFilter?:boolean（可选交互开关）
 *
 * 数据源区块不存内容，渲染时调用既有结构化接口（products）取数，三态与既有约定一致。
 * 当 `showFilter` 开启（列表页由 PageView 注入）时，在区块内保留原产品列表页的
 * 类别 / 连接 / 价格 / 库存筛选、排序、分页与对比选择，避免装修化后交互能力回退。
 */
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchProducts } from '../api/products'
import { MEDIA } from '../data/media'
import {
  CATEGORY_FILTERS,
  CONNECTION_FILTERS,
  PRICE_RANGES,
  SORT_OPTIONS,
  STATUS_FILTERS,
  type Product,
  type ProductCategory,
  type ProductConnection,
} from '../data/products'
import { useApi } from '../hooks/useApi'
import { MediaImg } from '../components/ui/MediaImg'
import { DemoToast, useDemoToast } from '../components/ui/DemoToast'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { asBool, asNumber, asString, asStringArray, gridClass } from './blockUtils'

/** 对比上限：恰 4 款可对比，第 5 款需先移除 */
const MAX_COMPARE = 4

/** 按所选排序方式排序；「综合排序」保持接口返回的原始顺序 */
function sortProducts(list: Product[], sortBy: string): Product[] {
  if (sortBy === '价格从低到高') return [...list].sort((a, b) => a.priceValue - b.priceValue)
  if (sortBy === '价格从高到低') return [...list].sort((a, b) => b.priceValue - a.priceValue)
  if (sortBy === '上新时间') return [...list].sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))
  return list
}

/** 产品网格骨架 */
function GridSkeleton({ count }: { count: number }) {
  return (
    <div className="p-grid" aria-busy="true" aria-label="产品加载中">
      {Array.from({ length: Math.min(count || 4, 8) }).map((_, index) => (
        <div className="pcard" key={index}>
          <div className="pcard__media skeleton" style={{ borderRadius: 0 }} />
          <div className="pcard__body">
            <div className="skeleton" style={{ height: 12, width: '40%' }} />
            <div className="skeleton" style={{ height: 18, width: '70%' }} />
            <div className="skeleton" style={{ height: 12, width: '55%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProductGridBlock({ props }: { props: Record<string, unknown> }) {
  // 范围 scope：all | featured | series | category | manual（旧 source 字段作回退）
  const source = asString(props.source, 'all')
  const seriesId = asString(props.seriesId)
  const scope = asString(props.scope) || (source === 'featured' ? 'featured' : source === 'series' ? 'series' : 'all')
  const categoryScope = asString(props.category)
  const manualIds = asStringArray(props.ids)
  const limit = Math.max(0, asNumber(props.limit, 8))
  const columns = asNumber(props.columns, 3)
  const layout = asString(props.layout, 'grid') // grid | rail
  const showFilter = asBool(props.showFilter)
  // 展示字段开关（缺省 = 显示）
  const showSpecs = props.showSpecs === undefined ? true : asBool(props.showSpecs)
  const showStatus = props.showStatus === undefined ? true : asBool(props.showStatus)
  const showPrice = props.showPrice === undefined ? true : asBool(props.showPrice)
  const showFlag = props.showFlag === undefined ? true : asBool(props.showFlag)
  // 3 列沿用既有自适应产品网格 .p-grid；2 / 4 列用区块网格类固定列数
  const gridClassName = columns === 3 ? 'p-grid' : gridClass(columns)

  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error } = useApi((signal) => fetchProducts(signal), [reloadKey])

  // —— 交互态：仅 showFilter 时使用，无条件声明以遵守 hooks 规则 ——
  const [category, setCategory] = useState<'全部' | ProductCategory>('全部')
  const [connections, setConnections] = useState<ProductConnection[]>([])
  const [priceId, setPriceId] = useState(PRICE_RANGES[0].id)
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('全部')
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0])
  const [moreOpen, setMoreOpen] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const { action, notify, dismiss } = useDemoToast()
  const navigate = useNavigate()

  const all = data?.items ?? []
  // 范围过滤：全部 / 精选（有角标，缺省回退全部）/ 按系列 / 按分类 / 手动挑选（按 ids 顺序）
  const scoped = useMemo(() => {
    if (scope === 'series' && seriesId) return all.filter((item) => item.id.includes(seriesId))
    if (scope === 'category' && categoryScope) return all.filter((item) => item.category === categoryScope)
    if (scope === 'manual' && manualIds.length) {
      const order = new Map(manualIds.map((id, i) => [id, i]))
      return all
        .filter((item) => order.has(item.id))
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    }
    if (scope === 'featured') {
      const flagged = all.filter((item) => Boolean(item.flag))
      return flagged.length ? flagged : all
    }
    return all
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, scope, seriesId, categoryScope, manualIds.join(',')])
  const price = PRICE_RANGES.find((item) => item.id === priceId) ?? PRICE_RANGES[0]

  const filtered = useMemo(() => {
    if (!showFilter) return scoped
    return sortProducts(
      scoped.filter(
        (item) =>
          (category === '全部' || item.category === category) &&
          (connections.length === 0 || (item.connection && connections.includes(item.connection))) &&
          item.priceValue >= price.min &&
          item.priceValue <= price.max &&
          (status === '全部' || item.status.text === status),
      ),
      sortBy,
    )
  }, [scoped, showFilter, category, connections, price, status, sortBy])

  const shown = limit > 0 ? filtered.slice(0, limit) : filtered

  const toggleConnection = (value: ProductConnection) =>
    setConnections((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]))

  // 选中以「产品 id」记录（与 /compare?ids= 对齐），展示时再回查型号
  const togglePick = (id: string) => {
    if (picked.includes(id)) {
      setPicked(picked.filter((item) => item !== id))
      return
    }
    if (picked.length >= MAX_COMPARE) {
      notify(`对比最多 ${MAX_COMPARE} 款，请先移除已选产品`)
      return
    }
    setPicked([...picked, id])
  }

  const pickedItems = picked
    .map((id) => scoped.find((item) => item.id === id))
    .filter((item): item is Product => Boolean(item))
  const incompatible = new Set(pickedItems.map((item) => item.category)).size > 1
  const canCompare = picked.length >= 2 && !incompatible

  const clearAll = () => {
    setCategory('全部')
    setConnections([])
    setPriceId(PRICE_RANGES[0].id)
    setStatus('全部')
  }

  const activeChips = [
    category !== '全部' ? { key: `cat-${category}`, label: `类别：${category}`, clear: () => setCategory('全部') } : null,
    ...connections.map((value) => ({ key: `conn-${value}`, label: `连接：${value}`, clear: () => toggleConnection(value) })),
    price.id !== PRICE_RANGES[0].id
      ? { key: `price-${price.id}`, label: `价格：${price.label}`, clear: () => setPriceId(PRICE_RANGES[0].id) }
      : null,
    status !== '全部'
      ? { key: `status-${status}`, label: `状态：${status}`, clear: () => setStatus('全部') }
      : null,
  ].filter((chip): chip is { key: string; label: string; clear: () => void } => chip !== null)

  return (
    <div>
      <SectionHeadFromProps props={props} />
      {error ? (
        <div className="empty">
          <div className="empty__title">产品加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            重新加载
          </button>
        </div>
      ) : loading ? (
        <GridSkeleton count={limit} />
      ) : (
        <>
          {/* 筛选工具区（仅列表页开启）：与原产品列表页一致 */}
          {showFilter && (
            <div className="card" style={{ padding: 'var(--gh-space-4)', marginBottom: 'var(--gh-space-6)' }}>
              <div className="row" style={{ gap: 'var(--gh-space-5)' }}>
                <div className="row">
                  <span className="muted" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                    类别
                  </span>
                  {CATEGORY_FILTERS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`chip${category === option ? ' is-active' : ''}`}
                      aria-pressed={category === option}
                      onClick={() => setCategory(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <div className="row">
                  <span className="muted" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                    连接
                  </span>
                  {CONNECTION_FILTERS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`chip${connections.includes(option) ? ' is-active' : ''}`}
                      aria-pressed={connections.includes(option)}
                      onClick={() => toggleConnection(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <button
                  className={`btn btn--sm ${moreOpen ? 'btn--primary' : 'btn--secondary'}`}
                  type="button"
                  aria-expanded={moreOpen}
                  onClick={() => setMoreOpen((open) => !open)}
                >
                  更多筛选
                </button>
              </div>

              {moreOpen && (
                <div
                  className="row"
                  style={{
                    gap: 'var(--gh-space-5)',
                    marginTop: 'var(--gh-space-4)',
                    paddingTop: 'var(--gh-space-4)',
                    borderTop: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <div className="row">
                    <span className="muted" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                      价格
                    </span>
                    {PRICE_RANGES.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`chip${priceId === option.id ? ' is-active' : ''}`}
                        aria-pressed={priceId === option.id}
                        onClick={() => setPriceId(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="row">
                    <span className="muted" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                      库存
                    </span>
                    {STATUS_FILTERS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`chip${status === option ? ' is-active' : ''}`}
                        aria-pressed={status === option}
                        onClick={() => setStatus(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeChips.length > 0 && (
                <div
                  className="row"
                  style={{
                    marginTop: 'var(--gh-space-4)',
                    paddingTop: 'var(--gh-space-4)',
                    borderTop: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <span className="muted" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                    已选
                  </span>
                  {activeChips.map((chip) => (
                    <span className="chip chip--removable" key={chip.key}>
                      {chip.label}
                      <button aria-label={`移除 ${chip.label}`} type="button" onClick={chip.clear}>
                        ×
                      </button>
                    </span>
                  ))}
                  <button className="btn btn--ghost btn--sm" type="button" onClick={clearAll}>
                    清空全部
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 排序（仅列表页开启） */}
          {showFilter && (
            <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 'var(--gh-space-4)' }}>
              <label className="sr-only" htmlFor="sort-products">
                排序方式
              </label>
              <select
                className="select"
                id="sort-products"
                style={{ width: 180 }}
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          )}

          {/* 产品网格 */}
          {shown.length === 0 ? (
            <p className="section__desc" style={{ textAlign: showFilter ? 'center' : undefined, padding: 'var(--gh-space-6) 0' }}>
              {showFilter ? '没有符合当前筛选条件的产品，试试调整筛选。' : '暂无可展示的产品。'}
            </p>
          ) : (
            <div className={layout === 'rail' ? 'p-grid-rail' : gridClassName}>
              {shown.map((item) => {
                const isPicked = picked.includes(item.id)
                return (
                  <article className={`pcard${showFilter && isPicked ? ' is-picked' : ''}`} key={item.id}>
                    <div className="pcard__media media-ph">
                      {showFlag && item.flag && (
                        <div className="pcard__flags">
                          <span className="tag tag--accent">{item.flag}</span>
                        </div>
                      )}
                      {showFilter && (
                        <div className="pcard__pick">
                          <span className="check">
                            <input
                              type="checkbox"
                              checked={isPicked}
                              aria-label={`加入对比 ${item.model}`}
                              onChange={() => togglePick(item.id)}
                            />
                          </span>
                        </div>
                      )}
                      <MediaImg src={MEDIA.product[item.id]} alt={item.name} variant={item.variant} label={item.name} />
                    </div>
                    <div className="pcard__body">
                      <Link to={`/products/${item.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        <div className="pcard__model">{item.model}</div>
                        <h3 className="pcard__name">{item.name}</h3>
                      </Link>
                      {showSpecs && (
                        <div className="pcard__specs">
                          {item.specs.map((spec) => (
                            <span key={spec}>{spec}</span>
                          ))}
                        </div>
                      )}
                      {showStatus && (
                        <div className="row" style={{ marginTop: 'var(--gh-space-1)' }}>
                          <span className={`status status--${item.status.level}`}>{item.status.text}</span>
                        </div>
                      )}
                      <div className="pcard__foot">
                        {showPrice && <span className="pcard__price">{item.price}</span>}
                        {showFilter ? (
                          <button
                            className={`btn btn--sm ${isPicked ? 'btn--primary is-magnetic' : 'btn--secondary'}`}
                            type="button"
                            disabled={item.status.level === 'warning'}
                            onClick={() => togglePick(item.id)}
                          >
                            {isPicked ? '对比中' : '加入对比'}
                          </button>
                        ) : (
                          <Link className="btn btn--sm btn--secondary" to={`/products/${item.id}`}>
                            查看详情
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {/* 分页（仅列表页开启；沿用原演示交互） */}
          {showFilter && (
            <div className="row" style={{ justifyContent: 'center', marginTop: 'var(--gh-space-7)' }}>
              <div className="pagination">
                <button aria-label="上一页" type="button" onClick={() => notify('分页')}>
                  ‹
                </button>
                <button className="is-active" type="button" onClick={() => notify('分页')}>
                  1
                </button>
                <button type="button" onClick={() => notify('分页')}>
                  2
                </button>
                <button type="button" onClick={() => notify('分页')}>
                  3
                </button>
                <button aria-label="下一页" type="button" onClick={() => notify('分页')}>
                  ›
                </button>
              </div>
            </div>
          )}

          {/* 对比浮条（仅列表页开启）：数量约束与不兼容提示 */}
          {showFilter && picked.length > 0 && (
            <div className="compare-bar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gh-space-2)' }}>
                <div className="row">
                  <strong style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                    已选 {picked.length} / {MAX_COMPARE} 款
                  </strong>
                  <div className="compare-bar__list">
                    {pickedItems.map((item) => (
                      <span className="compare-bar__item" key={item.id}>
                        {item.model}
                        <button type="button" aria-label={`移除 ${item.model}`} onClick={() => togglePick(item.id)}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                {incompatible ? (
                  <p className="field__hint" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--gh-space-2)' }}>
                    <span className="status status--warning">不可直接比较</span>
                    所选产品属不同类别，请仅保留同一类别的产品。
                  </p>
                ) : picked.length === 1 ? (
                  <p className="field__hint" style={{ margin: 0 }}>
                    再选 1 款即可开始对比。
                  </p>
                ) : picked.length >= MAX_COMPARE ? (
                  <p className="field__hint" style={{ margin: 0 }}>
                    已达对比上限 {MAX_COMPARE} 款，如需替换请先移除已选产品。
                  </p>
                ) : null}
              </div>
              <div className="row">
                <button className="btn btn--ghost btn--sm" type="button" onClick={() => setPicked([])}>
                  清空
                </button>
                <button
                  className="btn btn--primary btn--sm is-magnetic"
                  type="button"
                  disabled={!canCompare}
                  onClick={() => navigate(`/compare?ids=${picked.join(',')}`)}
                >
                  开始对比
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showFilter && <DemoToast action={action} onDismiss={dismiss} />}
    </div>
  )
}