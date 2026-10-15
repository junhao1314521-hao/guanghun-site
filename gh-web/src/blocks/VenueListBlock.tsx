/**
 * 25. venueList 体验点 / 服务网点（数据源区块）
 *
 * props: title / subtitle / ctaLabel / ctaHref（标题组）
 *        + source:'biz'|'service'（数据来源：商业合作体验点 / 服务网点与体验点）
 *        + scope:'all'|'manual'（手动挑选按 ids 顺序）+ ids[]
 *        + layout:'grid'|'rail' + columns + limit + showStatus
 *        + groupBy:'none'|'province'（按省份分组，仅 biz）
 *        + showModels（卡片渲染可体验型号芯片，仅 biz）+ dialog（点击打开统一弹窗，仅 biz）
 *
 * 不存内容：渲染时按 source 调用 `/api/business/venues`（biz）或 `/api/service-info`（service）取数。
 * 新增 props 缺省时保持原有平铺卡片行为不变；service 来源不受新增能力影响。
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { fetchBizVenues } from '../api/business-extra'
import { fetchProducts } from '../api/products'
import { fetchServiceSpots } from '../api/support'
import { useApi } from '../hooks/useApi'
import { useSitePages } from '../hooks/useSitePages'
import { MediaImg } from '../components/ui/MediaImg'
import { IconChevronDown, IconCopy, IconNavigate, IconPin } from '../components/ui/Icon'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { VenueDialog } from '../components/site/VenueDialog'
import { BlockPager, useBlockPager } from './BlockPager'
import { asBool, asNumber, asString, asStringArray, gridClass, pickByIds } from './blockUtils'

/** 类型 → 标签文案 / 色条修饰类（复用现有语义色令牌，仅三类） */
const VENUE_TYPE_LABEL: Record<string, string> = {
  flagship: '旗舰体验点',
  experience: '合作体验点',
  service: '授权服务点',
}
const venueTypeClass = (type: string): string => (type === 'flagship' || type === 'service' ? type : 'experience')

/** 统一渲染视图模型（兼容 biz 与 service 两种来源） */
type VenueCard = {
  id: string
  name: string
  meta: string
  cover: string
  ok: boolean
  status: string
  address: string
  phone?: string
  hours?: string
  /** 详情链接（仅商业体验点有详情页；服务网点无） */
  href?: string
  /** —— 以下仅商业体验点（biz）填充 —— */
  province?: string
  type?: string
  products?: string[]
}

export function VenueListBlock({ props }: { props: Record<string, unknown> }) {
  const source = asString(props.source, 'biz')
  const isService = source === 'service'
  const scope = asString(props.scope, 'all')
  const ids = asStringArray(props.ids)
  const limit = Math.max(0, asNumber(props.limit, 6))
  const columns = asNumber(props.columns, 3)
  const rail = asString(props.layout, 'grid') === 'rail'
  const showStatus = props.showStatus === undefined ? true : asBool(props.showStatus)
  const groupBy = asString(props.groupBy, 'none')
  const showModels = asBool(props.showModels)
  const dialog = asBool(props.dialog)
  const { isHrefLive } = useSitePages()
  const [reloadKey, setReloadKey] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)
  const closeDialog = useCallback(() => setOpenId(null), [])

  const { data, loading, error } = useApi<{ items: unknown[] }>(
    (signal) => (isService ? fetchServiceSpots(signal) : fetchBizVenues(signal)),
    [source, reloadKey],
  )

  // 型号芯片：一次拉取产品列表，建立 name → id 映射（不逐条请求）；未启用时不发请求
  const { data: productData } = useApi(
    (signal) => (showModels && !isService ? fetchProducts(signal) : Promise.resolve({ items: [], total: 0 })),
    [showModels, source],
  )
  const productMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const product of productData?.items ?? []) {
      if (product.name && !map.has(product.name)) map.set(product.name, product.id)
    }
    return map
  }, [productData])

  const raw = (data?.items ?? []) as Array<Record<string, unknown>>
  const items: VenueCard[] = isService
    ? raw.map((spot) => ({
        id: String(spot.id),
        name: String(spot.name),
        meta: `${spot.city ?? ''} · ${spot.type ?? ''}`,
        cover: '',
        ok: spot.status === '营业中',
        status: String(spot.status ?? ''),
        address: String(spot.address ?? ''),
        phone: String(spot.phone ?? ''),
        hours: String(spot.hours ?? ''),
      }))
    : raw.map((venue) => ({
        id: String(venue.id),
        name: String(venue.name),
        meta: `${venue.city ?? ''} · ${venue.area ?? ''}`,
        cover: String(venue.cover ?? ''),
        ok: Boolean(venue.ok),
        status: String(venue.status ?? ''),
        address: String(venue.address ?? ''),
        province: String(venue.province ?? ''),
        type: String(venue.type ?? ''),
        products: Array.isArray(venue.products)
          ? (venue.products as unknown[]).filter((product): product is string => typeof product === 'string')
          : [],
        href: `/business/venues/${String(venue.id)}`,
      }))

  const picked = pickByIds(items, scope, ids)
  const capped = limit > 0 ? picked.slice(0, limit) : picked
  // pageSize > 0 时启用分页（列表页），否则沿用 limit 截断（首页等策展区块）
  const pageSize = Math.max(0, asNumber(props.pageSize, 0))
  const { page, setPage, totalPages } = useBlockPager(capped.length, pageSize || 1, `${scope}|${ids.join(',')}`)
  const shown = pageSize > 0 ? capped.slice((page - 1) * pageSize, page * pageSize) : capped

  const grouped = !isService && groupBy === 'province'
  const groups = grouped ? groupByProvince(shown) : []

  const renderCard = (item: VenueCard) => {
    if (isService) return <ServiceCard item={item} showStatus={showStatus} key={item.id} />
    return (
      <BizVenueCard
        item={item}
        showStatus={showStatus}
        showModels={showModels}
        dialog={dialog}
        productMap={productMap}
        live={isHrefLive(item.href)}
        onOpen={setOpenId}
        key={item.id}
      />
    )
  }

  return (
    <div>
      <SectionHeadFromProps props={props} />
      {error ? (
        <div className="empty">
          <div className="empty__title">体验点加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            重新加载
          </button>
        </div>
      ) : loading ? (
        <div className="grid-3" aria-busy="true" aria-label="体验点加载中">
          {Array.from({ length: Math.min(limit || 3, 6) }).map((_, index) => (
            <div className="card" key={index}>
              <span className="skeleton" style={{ display: 'block', aspectRatio: '16 / 9', borderRadius: 'var(--gh-radius-md)' }} />
              <div className="skeleton" style={{ height: 18, width: '70%', marginTop: 'var(--gh-space-4)' }} />
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="section__desc" style={{ padding: 'var(--gh-space-6) 0' }}>
          暂无可展示的体验点。
        </p>
      ) : grouped ? (
        <div className="venue-groups">
          {groups.map((group) => (
            <VenueGroup key={group.key} label={group.label} count={group.items.length}>
              <div className="venue-grid">{group.items.map(renderCard)}</div>
            </VenueGroup>
          ))}
        </div>
      ) : (
        <div className={rail ? 'blk-scroll-x' : gridClass(columns)}>{shown.map(renderCard)}</div>
      )}
      {pageSize > 0 && <BlockPager page={page} totalPages={totalPages} onChange={setPage} />}
      {openId && <VenueDialog venueId={openId} onClose={closeDialog} />}
    </div>
  )
}

/* ============================================================
   服务网点卡片（source='service'）：保持既有平铺形态不变
   ============================================================ */
function ServiceCard({ item, showStatus }: { item: VenueCard; showStatus: boolean }) {
  const body = (
    <>
      <div className="ph-box ph-box--media" style={{ aspectRatio: '16 / 9' }}>
        <MediaImg src={item.cover} alt={item.name} />
      </div>
      {showStatus && <span className={`status status--${item.ok ? 'success' : 'warning'}`}>{item.status}</span>}
      <h3 className="card__title">{item.name}</h3>
      <p className="card__desc">{item.meta}</p>
      <div className="card--link__foot">
        <span className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
          {item.address}
        </span>
      </div>
      {(item.phone || item.hours) && (
        <p className="muted" style={{ fontSize: 'var(--gh-font-size-caption)', marginTop: 'var(--gh-space-2)' }}>
          {[item.phone, item.hours].filter(Boolean).join(' · ')}
        </p>
      )}
    </>
  )
  return (
    <div className="card reveal" key={item.id}>
      {body}
    </div>
  )
}

/* ============================================================
   商业体验点卡片（source='biz'）：类型色条 + 状态点 + 地址操作 + 型号芯片
   ============================================================ */
function BizVenueCard({
  item,
  showStatus,
  showModels,
  dialog,
  productMap,
  live,
  onOpen,
}: {
  item: VenueCard
  showStatus: boolean
  showModels: boolean
  dialog: boolean
  productMap: Map<string, string>
  /** 详情页是否仍在线（下线级联：停用时卡片退化为不可点内容） */
  live: boolean
  onOpen: (id: string) => void
}) {
  const [copied, setCopied] = useState<null | 'ok' | 'fail'>(null)
  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(null), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])

  const type = venueTypeClass(item.type ?? '')
  const label = VENUE_TYPE_LABEL[type] ?? '体验点'
  const navHref = `https://uri.amap.com/search?keyword=${encodeURIComponent(item.address)}`
  const clickable = dialog || (Boolean(item.href) && live)

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(item.address)
      setCopied('ok')
    } catch {
      setCopied('fail')
    }
  }

  return (
    <article className={`card venue-card venue-card--${type}${clickable ? ' venue-card--clickable' : ''} reveal`}>
      {dialog ? (
        <button
          type="button"
          className="venue-card__trigger"
          aria-label={`查看 ${item.name} 详情`}
          onClick={() => onOpen(item.id)}
        />
      ) : item.href && live ? (
        <Link className="venue-card__trigger" to={item.href} aria-label={`查看 ${item.name} 详情`} />
      ) : null}

      <span className={`tag venue-type venue-type--${type}`}>{label}</span>

      <div className="venue-card__title-row">
        <h3 className="card__title">{item.name}</h3>
        {showStatus && <span className={`status status--${item.ok ? 'success' : 'warning'}`}>{item.status}</span>}
      </div>

      <div className="venue-card__addr">
        <IconPin size={15} className="venue-card__addr-icon" />
        <span className="venue-card__addr-text" title={item.address}>
          {item.address}
        </span>
        <span className="venue-card__addr-actions">
          <button type="button" className="venue-card__act" aria-label={`复制地址：${item.address}`} onClick={copyAddress}>
            <IconCopy size={15} />
          </button>
          <a className="venue-card__act" href={navHref} target="_blank" rel="noreferrer" aria-label={`导航到 ${item.address}`}>
            <IconNavigate size={15} />
          </a>
        </span>
      </div>
      {copied && (
        <span className="venue-card__copied" role="status">
          {copied === 'ok' ? '已复制地址' : '复制失败，请手动复制'}
        </span>
      )}

      {showModels && item.products && item.products.length > 0 && (
        <div className="venue-card__models">
          {item.products.map((product) => {
            const productId = productMap.get(product)
            return productId ? (
              <Link className="tag venue-card__model venue-card__model--link" to={`/products/${productId}`} key={product}>
                {product}
              </Link>
            ) : (
              <span className="tag venue-card__model" key={product}>
                {product}
              </span>
            )
          })}
        </div>
      )}
    </article>
  )
}

/* ============================================================
   省份分组：默认全部展开，标题可折叠（grid-template-rows 0fr→1fr）
   ============================================================ */
function VenueGroup({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <section className="venue-group">
      <button
        type="button"
        className="venue-group__head"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <IconPin size={18} className="venue-group__icon" />
        <span className="venue-group__name">{label}</span>
        <span className="venue-group__count">{count} 家线下体验点</span>
        <span className="venue-group__chevron" aria-hidden="true">
          <IconChevronDown size={16} />
        </span>
      </button>
      {/* 面板常驻 DOM，收起时 visibility:hidden，避免内部链接仍可 Tab 聚焦 */}
      <div className={`venue-group__panel${open ? ' is-open' : ''}`} aria-hidden={!open}>
        <div className="venue-group__panel-inner">{children}</div>
      </div>
    </section>
  )
}

/** 按 province 分组（去重保序；缺 province 归入「其他」） */
function groupByProvince(items: VenueCard[]): { key: string; label: string; items: VenueCard[] }[] {
  const order: string[] = []
  const map = new Map<string, VenueCard[]>()
  for (const item of items) {
    const key = item.province && item.province.trim() ? item.province : '其他'
    if (!map.has(key)) {
      map.set(key, [])
      order.push(key)
    }
    map.get(key)!.push(item)
  }
  return order.map((key) => ({ key, label: key, items: map.get(key) ?? [] }))
}
