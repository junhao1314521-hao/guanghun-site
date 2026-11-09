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

/** 系列入口文案（按类别）：后台新增类别时缺省只显示名称与型号数量 */
const SERIES_DESC: Record<string, string> = {
  'OLED旗舰': '540Hz 满速刷新，为极限竞技准备。',
  '双模高刷': '4K 与高刷一机两用，一屏通吃。',
  '电竞IPS': '稳定、耐用、护眼，日常与竞技兼顾。',
  '周边': '支架、配件与桌面装备，把体验补齐。',
}

/** 角标配色：热销 / 双模 / 入门 有专属色，其余（旗舰 / 4K / 高刷…）统一品牌蓝 */
function flagClass(flag: string): string {
  if (flag === '热销') return 'pcard__badge--hot'
  if (flag === '双模') return 'pcard__badge--dual'
  if (flag === '入门') return 'pcard__badge--entry'
  return ''
}

/** 价格文案：后台填了 price 优先；否则用结构化价格；两者皆空显示「询价」 */
function priceText(item: Product): string {
  if (item.price) return item.price
  if (item.priceValue > 0) return `¥${item.priceValue.toLocaleString('zh-CN')}`
  return '询价'
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
          <div className="pcard__media skeleton" style={{ borderRadius: 17 }} />
          <div className="pcard__body">
            <div className="skeleton" style={{ height: 10, width: '34%' }} />
            <div className="skeleton" style={{ height: 20, width: '82%', marginTop: 6 }} />
            <div className="skeleton" style={{ height: 13, width: '64%', marginTop: 4 }} />
          </div>
          <div className="pcard__foot">
            <div className="skeleton" style={{ height: 14, width: 56 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** 产品网格区块：按范围 / 分类 / 手动挑选取数，支持筛选、排序、分页与网格 / 横滑布局 */
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
  // 展示字段开关（缺省：型号 / 角标 / 状态 / 参数开启，价格与文字 CTA 关闭 → 极简卡）
  const showSpecs = props.showSpecs === undefined ? true : asBool(props.showSpecs)
  const showStatus = props.showStatus === undefined ? true : asBool(props.showStatus)
  const showPrice = props.showPrice === undefined ? false : asBool(props.showPrice)
  const showModel = props.showModel === undefined ? true : asBool(props.showModel)
  const showFlag = props.showFlag === undefined ? true : asBool(props.showFlag)
  const showCta = props.showCta === undefined ? false : asBool(props.showCta)
  const showSeriesNav = asBool(props.showSeriesNav)
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
  // 移动端筛选面板展开态（桌面端由 CSS 始终展示完整面板）
  const [filtersOpen, setFiltersOpen] = useState(false)
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

  /** 系列入口：按类别生成，数量取全量产品（不受当前筛选影响）；无在售型号的类别不展示 */
  const seriesEntries = categoryOptions
    .filter((name) => name !== '全部')
    .map((name) => ({
      name,
      count: all.filter((item) => item.category === name).length,
      desc: SERIES_DESC[name] ?? '按类别查看该系列的全部型号。',
      href: `/products?category=${encodeURIComponent(name)}`,
    }))
    .filter((entry) => entry.count > 0)

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
    // 卡片图优先用后台维护的相册首图；老产品回退到预置白底图 / 主图，
    // 避免新增产品因缺少 productWhite 映射而显示空占位。
    const cardImage = item.gallery?.[0] ?? MEDIA.productWhite[item.id] ?? MEDIA.product[item.id] ?? ''
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
        <div
          className={`pcard__media${item.status.level === 'warning' ? ' is-oos' : ''}`}
          style={{ '--vt': vtId === item.id ? `vh-${item.id}` : undefined } as CSSProperties}
        >
          <MediaImg src={cardImage} alt={item.name} variant={item.variant} label={item.name} />
          {showFlag && (item.flag || item.status.level === 'warning') && (
            <span
              className={`pcard__badge${
                item.flag ? ` ${flagClass(item.flag)}` : ' pcard__badge--oos'
              }`}
            >
              {item.flag || '缺货'}
            </span>
          )}
        </div>
        <div className="pcard__body">
          {showModel && <p className="pcard__model">{item.model}</p>}
          <h3 className="pcard__name">{item.name}</h3>
          {showSpecs && item.specs.length > 0 && (
            <p className="pcard__specs">{item.specs.slice(0, 3).join(' · ')}</p>
          )}
        </div>
        <div className="pcard__foot">
          {showStatus && (
            <span className={`pcard__status pcard__status--${item.status.level}`}>{item.status.text}</span>
          )}
          {showPrice && <span className="pcard__price">{priceText(item)}</span>}
          {showCta && (
            <span className="pcard__cta" aria-hidden="true">
              查看详情
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14m-5-5 5 5-5 5" />
              </svg>
            </span>
          )}
        </div>
        {/* 整卡可点：悬停卡片任意位置即可进入详情，不必再找按钮 */}
        {live && (
          <Link
            to={`/products/${item.id}`}
            viewTransition
            className="pcard__overlay"
            aria-label={`查看 ${item.model} ${item.name} 详情`}
          />
        )}
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
              {/* 通栏工具条：数量贴页面左脊线、排序贴产品区右缘，下一行左右两栏同顶 */}
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
              {/* 移动端：筛选面板默认收起，避免首屏被四组筛选挤满 */}
              <button
                className="catalog__filter-toggle"
                type="button"
                aria-expanded={filtersOpen}
                aria-controls="catalog-filter-panel"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <span>
                  筛选
                  {activeChips.length > 0 ? ` · 已选 ${activeChips.length}` : ''}
                </span>
                <span className={`catalog__filter-caret${filtersOpen ? ' is-open' : ''}`} aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>
              <aside
                className={`catalog__aside${filtersOpen ? '' : ' is-collapsed'}`}
                id="catalog-filter-panel"
                aria-label="产品筛选"
              >
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
                  <div className="p-grid catalog__grid">
                    {paged.map(renderCard)}
                    {/* 第 9 格：末行只差一格时补一张对比引导卡，避免网格留洞 */}
                    {paged.length % columns === columns - 1 && (
                      <Link className="p-guide" to="/compare">
                        <span className="p-guide__k">COMPARE</span>
                        <p className="p-guide__t">不确定选哪款？</p>
                        <p className="p-guide__d">把候选机型加入对比，逐项看清刷新率、尺寸与接口差异。</p>
                        <span className="p-guide__go">
                          开始对比
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14m-5-5 5 5-5 5" />
                          </svg>
                        </span>
                      </Link>
                    )}
                  </div>
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

          {/* 系列入口：按产品类别进入，替代同页重复的第二组网格 */}
          {showSeriesNav && seriesEntries.length > 0 && (
            <div className="p-series">
              <div className="p-series__head">
                <div>
                  <h2 className="p-series__title">按系列浏览</h2>
                  <p className="p-series__desc">从产品线进入，快速收敛到你关心的区间。</p>
                </div>
              </div>
              <div className="p-series__grid">
                {seriesEntries.map((entry, index) => (
                  <Link className="p-series__card" to={entry.href} key={entry.name}>
                    <span className="p-series__k">SERIES {String(index + 1).padStart(2, '0')}</span>
                    <span className="p-series__t">{entry.name}</span>
                    <span className="p-series__d">{entry.desc}</span>
                    <span className="p-series__n">
                      {entry.count} 款型号
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14m-5-5 5 5-5 5" />
                      </svg>
                    </span>
                  </Link>
                ))}
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

      {hint && (
        <div className="toast toast--float" role="status" aria-live="polite">
          {hint}
        </div>
      )}
    </div>
  )
}