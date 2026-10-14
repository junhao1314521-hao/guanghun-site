/**
 * 25. venueList 体验点 / 服务网点（数据源区块）
 *
 * props: title / subtitle / ctaLabel / ctaHref（标题组）
 *        + source:'biz'|'service'（数据来源：商业合作体验点 / 服务网点与体验点）
 *        + scope:'all'|'manual'（手动挑选按 ids 顺序）+ ids[]
 *        + layout:'grid'|'rail' + columns + limit + showStatus
 *
 * 不存内容：渲染时按 source 调用 `/api/business/venues`（biz）或 `/api/service-info`（service）取数。
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBizVenues } from '../api/business-extra'
import { fetchServiceSpots } from '../api/support'
import { useApi } from '../hooks/useApi'
import { MediaImg } from '../components/ui/MediaImg'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { BlockPager, useBlockPager } from './BlockPager'
import { asBool, asNumber, asString, asStringArray, gridClass, pickByIds } from './blockUtils'

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
  const [reloadKey, setReloadKey] = useState(0)

  const { data, loading, error } = useApi<{ items: unknown[] }>(
    (signal) => (isService ? fetchServiceSpots(signal) : fetchBizVenues(signal)),
    [source, reloadKey],
  )

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
        href: `/business/venues/${String(venue.id)}`,
      }))

  const picked = pickByIds(items, scope, ids)
  const capped = limit > 0 ? picked.slice(0, limit) : picked
  // pageSize > 0 时启用分页（列表页），否则沿用 limit 截断（首页等策展区块）
  const pageSize = Math.max(0, asNumber(props.pageSize, 0))
  const { page, setPage, totalPages } = useBlockPager(capped.length, pageSize || 1, `${scope}|${ids.join(',')}`)
  const shown = pageSize > 0 ? capped.slice((page - 1) * pageSize, page * pageSize) : capped

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
      ) : (
        <div className={rail ? 'blk-scroll-x' : gridClass(columns)}>
          {shown.map((item) => {
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
                {isService && (item.phone || item.hours) && (
                  <p className="muted" style={{ fontSize: 'var(--gh-font-size-caption)', marginTop: 'var(--gh-space-2)' }}>
                    {[item.phone, item.hours].filter(Boolean).join(' · ')}
                  </p>
                )}
              </>
            )
            return item.href ? (
              <Link className="card card--link reveal" to={item.href} key={item.id}>
                {body}
              </Link>
            ) : (
              <div className="card reveal" key={item.id}>
                {body}
              </div>
            )
          })}
        </div>
      )}
      {pageSize > 0 && <BlockPager page={page} totalPages={totalPages} onChange={setPage} />}
    </div>
  )
}
