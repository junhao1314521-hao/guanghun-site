import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TemplateBlocks } from '../blocks/TemplateBlocks'
import { fetchBizVenue } from '../api/business-extra'
import { VenueDetailContent } from '../components/site/VenueDetailContent'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/** 体验点详情加载骨架 */
function VenueDetailSkeleton() {
  return (
    <div className="container" aria-busy="true" aria-label="体验点加载中" style={{ paddingTop: 'var(--gh-space-6)' }}>
      <div className="skeleton" style={{ height: 14, width: '28%' }} />
      <div className="skeleton" style={{ height: 32, width: '58%', marginTop: 'var(--gh-space-4)' }} />
      <div className="skeleton" style={{ height: 16, width: '42%', marginTop: 'var(--gh-space-3)' }} />
      <div className="skeleton" style={{ height: 160, marginTop: 'var(--gh-space-5)' }} />
    </div>
  )
}

/** 商业合作 · 体验点详情：门市信息、在售产品、服务项目与到店预约（内容与列表页弹窗一致） */
export function BusinessVenueDetailPage() {
  const { id = '' } = useParams()
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const { data: detail, loading, error } = useApi((signal) => fetchBizVenue(id, signal), [id, reloadKey])

  const readyKey = `${id}:${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  if (loading) return <VenueDetailSkeleton />

  if (!detail) {
    return (
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/business">商业合作</Link>
          <span>/</span>
          <Link to="/business/venues">线下体验点</Link>
        </nav>
        <div className="empty" style={{ marginTop: 'var(--gh-space-6)' }}>
          <div className="empty__title">未找到该体验点</div>
          <p className="empty__desc">{error?.message ?? '门店可能已调整或链接有误'}，返回体验点列表重新选择。</p>
          <div style={{ display: 'flex', gap: 'var(--gh-space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link className="btn btn--secondary btn--sm" to="/business/venues">
              返回体验点列表
            </Link>
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
              重新加载
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef}>
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/business">商业合作</Link>
          <span>/</span>
          <Link to="/business/venues">线下体验点</Link>
          <span>/</span>
          <span>{detail.name}</span>
        </nav>

        <div className="section__head" style={{ marginTop: 'var(--gh-space-4)' }}>
          <div>
            <h1 className="section__title">{detail.name}</h1>
            <div className="row" style={{ marginTop: 'var(--gh-space-3)' }}>
              <span className={`status ${detail.ok ? 'status--success' : 'status--muted'}`}>{detail.status}</span>
              <span className="muted" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                {detail.city} · {detail.area}
              </span>
            </div>
          </div>
          <Link className="btn btn--secondary" to="/business/venues">
            返回体验点列表
          </Link>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
        <VenueDetailContent detail={detail} variant="page" />
      </div>

      <TemplateBlocks pageKey="template-venue" />
    </div>
  )
}
