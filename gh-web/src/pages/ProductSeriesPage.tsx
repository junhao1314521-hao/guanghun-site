import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TemplateBlocks } from '../blocks/TemplateBlocks'
import { fetchProductSeries } from '../api/product-extra'
import { ApiError } from '../api/client'
import { MediaImg } from '../components/ui/MediaImg'
import type { DeviceVariant } from '../components/ui/DeviceArt'
import { MEDIA } from '../data/media'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/** 产品系列（一级页面 · 骨架层）：系列简介 + 产品网格，复用产品卡观感 */
export function ProductSeriesPage() {
  const { slug = '' } = useParams()
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const { data, loading, error } = useApi((signal) => fetchProductSeries(slug, signal), [slug, reloadKey])
  const series = data?.series
  const items = data?.items ?? []

  // 数据到位后产品卡才出现，用 readyKey 触发一次动效重绑
  const readyKey = `${slug}:${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  const notFound = error instanceof ApiError && error.status === 404
  const coverVariant = (series?.cover ?? 'mouse') as DeviceVariant

  return (
    <div ref={rootRef}>
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/products">产品</Link>
          <span>/</span>
          <span>{series?.name ?? '产品系列'}</span>
        </nav>

        {notFound ? (
          <div className="empty" style={{ marginTop: 'var(--gh-space-6)' }}>
            <div className="empty__title">未找到该产品系列</div>
            <p className="empty__desc">{error?.message ?? '该系列可能已调整或链接有误'}，返回产品列表重新选择。</p>
            <Link className="btn btn--secondary btn--sm" to="/products">
              返回产品列表
            </Link>
          </div>
        ) : error ? (
          <div className="empty" style={{ marginTop: 'var(--gh-space-6)' }}>
            <div className="empty__title">系列加载失败</div>
            <p className="empty__desc">{error.message}。请检查网络后重试。</p>
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
              重新加载
            </button>
          </div>
        ) : loading || !series ? (
          <>
            <div className="section__head" style={{ marginTop: 'var(--gh-space-4)', marginBottom: 'var(--gh-space-5)' }}>
              <div>
                <div className="skeleton" style={{ height: 30, width: 220 }} />
                <div className="skeleton" style={{ height: 14, width: 360, marginTop: 'var(--gh-space-3)' }} />
              </div>
            </div>
            <div className="skeleton" style={{ height: 240, borderRadius: 'var(--gh-radius-lg)', marginBottom: 'var(--gh-space-6)' }} />
            <div className="p-grid" aria-busy="true" aria-label="系列加载中">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="pcard" key={index}>
                  <div className="pcard__media skeleton" style={{ borderRadius: 0 }} />
                  <div className="pcard__body">
                    <div className="skeleton" style={{ height: 12, width: '40%' }} />
                    <div className="skeleton" style={{ height: 18, width: '70%' }} />
                    <div className="skeleton" style={{ height: 28, marginTop: 'var(--gh-space-2)' }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="section__head" style={{ marginTop: 'var(--gh-space-4)', marginBottom: 'var(--gh-space-5)' }}>
              <div>
                <h1 className="section__title">{series.name}</h1>
                <p className="section__desc">
                  {series.desc} 共 <span className="mono">{items.length}</span> 款产品。
                </p>
              </div>
              <div className="row">
                <Link className="btn btn--secondary btn--sm" to="/products">
                  全部产品
                </Link>
              </div>
            </div>

            {/* 系列主视觉 */}
            <div
              className="pcard__media media-ph"
              style={{ borderRadius: 'var(--gh-radius-lg)', marginBottom: 'var(--gh-space-6)' }}
            >
              <MediaImg
                src={MEDIA.views[coverVariant][0]}
                alt={`${series.name}主视觉`}
                variant={coverVariant}
                label={`${series.name}系列主视觉`}
                loading="eager"
              />
            </div>

            {items.length > 0 ? (
              <div className="p-grid">
                {items.map((item) => (
                  <article className="pcard" key={item.id}>
                    <div className="pcard__media media-ph">
                      {item.flag && (
                        <div className="pcard__flags">
                          <span className="tag tag--accent">{item.flag}</span>
                        </div>
                      )}
                      <MediaImg src={MEDIA.product[item.id]} alt={item.name} variant={item.variant} label={item.name} />
                    </div>
                    <div className="pcard__body">
                      <Link to={`/products/${item.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        <div className="pcard__model">{item.model}</div>
                        <h3 className="pcard__name">{item.name}</h3>
                      </Link>
                      <div className="pcard__specs">
                        {item.specs.map((spec) => (
                          <span key={spec}>{spec}</span>
                        ))}
                      </div>
                      <div className="row" style={{ marginTop: 'var(--gh-space-1)' }}>
                        <span className={`status status--${item.status.level}`}>{item.status.text}</span>
                      </div>
                      <div className="pcard__foot">
                        <span className="pcard__price">{item.price}</span>
                        <Link className="btn btn--secondary btn--sm" to={`/compare?ids=${item.id}`}>
                          加入对比
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty">
                <div className="empty__title">该系列暂无产品</div>
                <p className="empty__desc">该系列下的产品正在整理，可先浏览全部产品。</p>
                <Link className="btn btn--secondary btn--sm" to="/products">
                  返回产品列表
                </Link>
              </div>
            )}
          </>
        )}
      </div>
      {!notFound && !error && !loading && Boolean(series) && <TemplateBlocks pageKey="template-series" />}
    </div>
  )
}