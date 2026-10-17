/**
 * 10. productGrid 产品（数据源区块，契约 §4 / §8）
 * props: title / source:'featured'|'all'|'series' / seriesId? / limit:number / columns:2|3|4
 *        / showFilter?:boolean（可选交互开关）
 *
 * 数据源区块不存内容，渲染时调用既有结构化接口（products）取数，三态与既有约定一致。
 * 当 `showFilter` 开启（列表页由 PageView 注入）时，在区块内保留原产品列表页的
 * 类别 / 连接 / 价格 / 库存筛选、排序、分页与对比选择，避免装修化后交互能力回退。
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { SafeLink } from '../components/ui/SafeLink'
import { useSitePages } from '../hooks/useSitePages'
import { fetchProductCategories, fetchProducts } from '../api/products'
import { SCENES } from '../data/home'
import { MEDIA } from '../data/media'
import {
  CATEGORY_FILTERS,
  CONNECTION_FILTERS,
  PRICE_RANGES,
  SORT_OPTIONS,
  STATUS_FILTERS,
  type Product,
  type ProductConnection,
} from '../data/products'
import { useApi } from '../hooks/useApi'
import { trackEvent } from '../lib/track'
import { MediaImg } from '../components/ui/MediaImg'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { asBool, asNumber, asString, asStringArray, gridClass } from './blockUtils'

/** 对比上限：恰 4 款可对比，第 5 款需先移除 */
const MAX_COMPARE = 4

/** 列表页每页条数 */
const PAGE_SIZE = 9

/**
 * 场景 → 适用产品类别（导购映射）：首页「按场景选择」的 `?scene=` 深链据此收敛产品。
 * 场景是选购入口而非产品字段，故落到具体类别上；产品线调整时同步更新此表即可。
 */
const SCENE_CATEGORY_MAP: Record<string, string[]> = {
  'scene-01': ['双模高刷', 'OLED旗舰'], // 高刷 · 决胜毫秒
  'scene-02': ['OLED旗舰'], // 色准 · 创作
  'scene-03': ['电竞IPS'], // 护眼 · 高效
  'scene-04': ['OLED旗舰', '双模高刷'], // 沉浸 · 影音
}

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
        <div className="pcard pcard--auto" key={index}>
          <div className="pcard__head">
            <div className="skeleton" style={{ height: 12, width: '38%' }} />
            <div className="skeleton" style={{ height: 22, width: '76%', marginTop: 10 }} />
          </div>
          <div className="pcard__media skeleton" style={{ borderRadius: 0 }} />
          <div className="pcard__foot">
            <div className="skeleton" style={{ height: 14, width: '28%' }} />
            <div className="skeleton" style={{ height: 38, width: 96, borderRadius: 999 }} />
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
  // 展示字段开关（缺省：保留状态 / 型号，隐藏价格与参数，对齐新版产品卡）
  const showSpecs = props.showSpecs === undefined ? false : asBool(props.showSpecs)
  const showStatus = props.showStatus === undefined ? true : asBool(props.showStatus)
  const showPrice = props.showPrice === undefined ? false : asBool(props.showPrice)
  // 卡片底色：默认白卡（对齐参考图）；auto 跟随主题；dark 适配深底图
  const cardTone = asString(props.cardTone, 'light')
  // 3 列沿用既有自适应产品网格 .p-grid；2 / 4 列用区块网格类固定列数
  const gridClassName = columns === 3 ? 'p-grid' : gridClass(columns)

  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error } = useApi((signal) => fetchProducts(signal), [reloadKey])
  // 类别筛选 chip 由后台「分类与参数」维护（离线回退本地枚举）
  const { data: categoryData } = useApi((signal) => fetchProductCategories(signal), [])
  const categoryOptions = [
    '全部',
    ...(categoryData
      ? categoryData.items.filter((item) => item.status === '启用').map((item) => item.name)
      : CATEGORY_FILTERS.filter((name) => name !== '全部')),
  ]

  // —— 交互态：仅 showFilter 时使用；筛选状态「全量进 URL」（契约 ⑨D）——
  // 类别 / 连接 / 价格 / 库存 / 排序 / 场景 / 页码 均以 query 承载，便于分享与深链：
  // 首页「按场景选择」卡片即指向 /products?scene=scene-01，落地后按场景收敛类别。
  const [params, setParams] = useSearchParams()
  const readParam = (key: string) => (showFilter ? params.get(key) ?? '' : '')
  const category = readParam('category') || '全部'
  const connections = readParam('conn').split(',').filter(Boolean) as ProductConnection[]
  const priceId = readParam('price') || PRICE_RANGES[0].id
  const status = readParam('status') || '全部'
  const sortBy = readParam('sort') || SORT_OPTIONS[0]
  const sceneId = readParam('scene')
  const scene = SCENES.find((item) => item.id === sceneId)
  /** 写入 URL：空值即删除对应参数；`resetPage` 为真时同时回到第 1 页 */
  const writeParams = (patch: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (resetPage) next.delete('page')
    setParams(next, { replace: true })
  }
  const [picked, setPicked] = useState<string[]>([])
  /**
   * 共享元素过渡：指针按下的那张卡片临时获得 `view-transition-name`，
   * 详情页主图使用同名 → 浏览器把卡片图「飞」到大图位置。
   * 用 flushSync 保证 DOM 在快照前已带上该名字。
   */
  const [vtId, setVtId] = useState('')
  // 轻提示（对比上限等本地校验，非演示占位）
  const [hint, setHint] = useState<string | null>(null)
  const navigate = useNavigate()
  const { isHrefLive } = useSitePages()

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
  // 场景收敛（?scene=）：把产品过滤到场景适用的类别集合内
  const sceneCategories = scene ? SCENE_CATEGORY_MAP[scene.id] ?? [] : []

  const filtered = useMemo(() => {
    if (!showFilter) return scoped
    const base = sceneCategories.length ? scoped.filter((item) => sceneCategories.includes(item.category)) : scoped
    return sortProducts(
      base.filter(
        (item) =>
          (category === '全部' || item.category === category) &&
          (connections.length === 0 || (item.connection && connections.includes(item.connection))) &&
          item.priceValue >= price.min &&
          item.priceValue <= price.max &&
          (status === '全部' || item.status.text === status),
      ),
      sortBy,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, showFilter, sceneCategories.join(','), category, connections.join(','), price, status, sortBy])

  const shown = limit > 0 ? filtered.slice(0, limit) : filtered

  // 列表页分页：页码同样承载于 URL（?page=）；筛选变化由 writeParams 统一清空页码
  const page = Math.max(1, Math.floor(Number(readParam('page')) || 1))
  const setPage = (next: number) => writeParams({ page: next > 1 ? String(next) : '' }, false)
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = showFilter ? shown.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE) : shown

  const toggleConnection = (value: ProductConnection) => {
    const next = connections.includes(value) ? connections.filter((item) => item !== value) : [...connections, value]
    writeParams({ conn: next.join(',') })
  }

  // 轻提示自动消失
  useEffect(() => {
    if (!hint) return
    const timer = window.setTimeout(() => setHint(null), 3200)
    return () => window.clearTimeout(timer)
  }, [hint])

  // 选中以「产品 id」记录（与 /compare?ids= 对齐），展示时再回查型号
  const togglePick = (id: string) => {
    if (picked.includes(id)) {
      setPicked(picked.filter((item) => item !== id))
      return
    }
    if (picked.length >= MAX_COMPARE) {
      setHint(`对比最多 ${MAX_COMPARE} 款，请先移除已选产品`)
      return
    }
    setPicked([...picked, id])
    // 埋点：加入对比（移除时不计数）
    trackEvent('compare', id)
  }

  const pickedItems = picked
    .map((id) => scoped.find((item) => item.id === id))
    .filter((item): item is Product => Boolean(item))
  const incompatible = new Set(pickedItems.map((item) => item.category)).size > 1
  const canCompare = picked.length >= 2 && !incompatible

  const clearAll = () => writeParams({ category: '', conn: '', price: '', status: '', scene: '' })

  const activeChips = [
    scene ? { key: `scene-${scene.id}`, label: `场景：${scene.title}`, clear: () => writeParams({ scene: '' }) } : null,
    category !== '全部' ? { key: `cat-${category}`, label: `类别：${category}`, clear: () => writeParams({ category: '' }) } : null,
    ...connections.map((value) => ({ key: `conn-${value}`, label: `连接：${value}`, clear: () => toggleConnection(value) })),
    price.id !== PRICE_RANGES[0].id
      ? { key: `price-${price.id}`, label: `价格：${price.label}`, clear: () => writeParams({ price: '' }) }
      : null,
    status !== '全部'
      ? { key: `status-${status}`, label: `状态：${status}`, clear: () => writeParams({ status: '' }) }
      : null,
  ].filter((chip): chip is { key: string; label: string; clear: () => void } => chip !== null)

  /** 产品卡（列表页与普通网格共用同一套结构与交互） */
  const renderCard = (item: Product) => {
    const isPicked = picked.includes(item.id)
    const live = isHrefLive(`/products/${item.id}`)
    const tone = cardTone === 'light' || cardTone === 'dark' ? cardTone : 'auto'
    return (
      <article
        className={`pcard pcard--${tone}${showFilter && isPicked ? ' is-picked' : ''}`}
        key={item.id}
        onPointerDown={() => flushSync(() => setVtId(item.id))}
      >
        {showFilter && (
          <label className="pcard__pick" aria-label={`加入对比 ${item.model}`}>
            <input type="checkbox" checked={isPicked} onChange={() => togglePick(item.id)} />
          </label>
        )}
        <div className="pcard__head">
          {live ? (
            <Link to={`/products/${item.id}`} viewTransition className="pcard__name-link">
              <h3 className="pcard__name">{item.name}</h3>
            </Link>
          ) : (
            <h3 className="pcard__name">{item.name}</h3>
          )}
        </div>
        <div
          className="pcard__media"
          style={{ '--vt': vtId === item.id ? `vh-${item.id}` : undefined } as CSSProperties}
        >
          <MediaImg src={MEDIA.productWhite[item.id] ?? ''} alt={item.name} variant={item.variant} label={item.name} />
        </div>
        <div className="pcard__foot">
          <div className="pcard__meta">
            <span className="pcard__category">{item.category}</span>
            {showStatus && (
              <span className={`pcard__status pcard__status--${item.status.level}`}>{item.status.text}</span>
            )}
            {showSpecs && (
              <div className="pcard__specs">
                {item.specs.map((spec) => (
                  <span key={spec}>{spec}</span>
                ))}
              </div>
            )}
            {showPrice && <span className="pcard__price">{item.price}</span>}
          </div>
          {live ? (
            <SafeLink className="btn btn--sm btn--primary pcard__buy" to={`/products/${item.id}`} viewTransition>
              购买
            </SafeLink>
          ) : (
            <span className="btn btn--sm pcard__buy is-disabled" aria-disabled="true">
              购买
            </span>
          )}
        </div>
      </article>
    )
  }

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
          {/* 列表页：左侧筛选栏 + 右侧大图卡片 */}
          {showFilter ? (
            <div className="catalog">
              <aside className="catalog__aside" aria-label="产品筛选">
                <div className="catalog__aside-head">
                  <h2 className="catalog__aside-title">筛选</h2>
                  {activeChips.length > 0 && (
                    <button className="catalog__reset" type="button" onClick={clearAll}>
                      清空
                    </button>
                  )}
                </div>

                <div className="catalog__group">
                  <span className="catalog__group-title">类别</span>
                  <div className="catalog__opts">
                    {categoryOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`catalog__opt${category === option ? ' is-active' : ''}`}
                        aria-pressed={category === option}
                        onClick={() => writeParams({ category: option === '全部' ? '' : option })}
                      >
                        <span>{option}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="catalog__group">
                  <span className="catalog__group-title">接口</span>
                  <div className="catalog__opts">
                    {CONNECTION_FILTERS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`catalog__opt${connections.includes(option) ? ' is-active' : ''}`}
                        aria-pressed={connections.includes(option)}
                        onClick={() => toggleConnection(option)}
                      >
                        <span>{option}</span>
                        <span className="catalog__check" aria-hidden="true">
                          {connections.includes(option) ? '✓' : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="catalog__group">
                  <span className="catalog__group-title">价格</span>
                  <div className="catalog__opts">
                    {PRICE_RANGES.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`catalog__opt${priceId === option.id ? ' is-active' : ''}`}
                        aria-pressed={priceId === option.id}
                        onClick={() => writeParams({ price: option.id === PRICE_RANGES[0].id ? '' : option.id })}
                      >
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="catalog__group">
                  <span className="catalog__group-title">库存</span>
                  <div className="catalog__opts">
                    {STATUS_FILTERS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`catalog__opt${status === option ? ' is-active' : ''}`}
                        aria-pressed={status === option}
                        onClick={() => writeParams({ status: option === '全部' ? '' : option })}
                      >
                        <span>{option}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              <div className="catalog__main">
                <div className="catalog__toolbar">
                  <p className="catalog__count">
                    共 <strong>{shown.length}</strong> 款产品
                    {scene && <span className="catalog__scene">场景：{scene.title}</span>}
                  </p>
                  <label className="sr-only" htmlFor="sort-products">
                    排序方式
                  </label>
                  <select
                    className="select catalog__sort"
                    id="sort-products"
                    value={sortBy}
                    onChange={(event) =>
                      writeParams({ sort: event.target.value === SORT_OPTIONS[0] ? '' : event.target.value })
                    }
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {activeChips.length > 0 && (
                  <div className="catalog__chips">
                    {activeChips.map((chip) => (
                      <span className="chip chip--removable" key={chip.key}>
                        {chip.label}
                        <button aria-label={`移除 ${chip.label}`} type="button" onClick={chip.clear}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {shown.length === 0 ? (
                  <p className="catalog__empty">没有符合当前筛选条件的产品，试试调整筛选。</p>
                ) : (
                  <div className="p-grid catalog__grid">{paged.map(renderCard)}</div>
                )}

                {totalPages > 1 && (
                  <div className="catalog__pager">
                    <div className="pagination">
                      <button aria-label="上一页" type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                        ‹
                      </button>
                      {Array.from({ length: totalPages }, (_, index) => index + 1).map((n) => (
                        <button
                          key={n}
                          className={n === safePage ? 'is-active' : undefined}
                          type="button"
                          aria-current={n === safePage ? 'page' : undefined}
                          onClick={() => setPage(n)}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        aria-label="下一页"
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage(safePage + 1)}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : shown.length === 0 ? (
            <p className="section__desc" style={{ padding: 'var(--gh-space-6) 0' }}>
              暂无可展示的产品。
            </p>
          ) : (
            <div className={layout === 'rail' ? 'p-grid-rail' : gridClassName}>{paged.map(renderCard)}</div>
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

      {hint && (
        <div className="toast toast--float" role="status" aria-live="polite">
          {hint}
        </div>
      )}
    </div>
  )
}