import { useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BlockRenderer } from '../blocks/BlockRenderer'
import { ProductDetailContext } from '../blocks/ProductDetailContext'
import { fetchProductDetail } from '../api/products'
import { fetchPage } from '../api/content'
import { MEDIA } from '../data/media'
import { JsonLdNode } from '../components/site/JsonLd'
import { productJsonLd } from '../components/site/detailJsonLd'
import { useApi } from '../hooks/useApi'
import { useDetailSeo } from '../hooks/useDetailSeo'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/** 详情页加载骨架（数据 / 模板到位前共用） */
function DetailSkeleton() {
  return (
    <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
      <div className="detail-top">
        <div className="skeleton" style={{ aspectRatio: '1/1', borderRadius: 'var(--gh-radius-xl)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gh-space-3)' }}>
          <div className="skeleton" style={{ height: 14, width: '35%' }} />
          <div className="skeleton" style={{ height: 32, width: '70%' }} />
          <div className="skeleton" style={{ height: 20, width: '45%' }} />
          <div className="skeleton" style={{ height: 44, width: '60%' }} />
          <div className="skeleton" style={{ height: 180 }} />
        </div>
      </div>
    </div>
  )
}

/** 产品详情：全部主体由内容库 `template-product` 区块渲染（无遗留硬编码骨架） */
export function ProductDetailPage() {
  const { id = '' } = useParams()
  const { data: detail, loading, error } = useApi((signal) => fetchProductDetail(id, signal), [id])
  // 产品详情模板（内容库）：主体区块（展示台 / 规格 / 图文 / 购买）均来自模板
  const { data: template, loading: templateLoading } = useApi((signal) => fetchPage('template-product', signal), [])

  const rootRef = useRef<HTMLDivElement>(null)

  // 数据到位后展示台才渲染，用 readyKey 触发一次动效绑定
  const readyKey = `${id}:${loading || templateLoading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  // 分享图与 SEO 覆盖（数据未到位时传 undefined，交由壳层默认值兜底）
  const ogImage = detail ? MEDIA.product[detail.id] : undefined
  useDetailSeo({
    title: detail ? `${detail.model} ${detail.name} · 光魂` : undefined,
    description: detail
      ? `光魂 ${detail.model} ${detail.name}：标称与实测参数、下载资料与相关信息。`
      : undefined,
    image: ogImage,
    ogType: 'product',
  })

  if (loading) return <DetailSkeleton />

  if (!detail) {
    return (
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/products">产品</Link>
        </nav>
        <div className="empty" style={{ marginTop: 'var(--gh-space-6)' }}>
          <div className="empty__title">未找到该产品</div>
          <p className="empty__desc">{error?.message ?? '型号可能已下架或链接有误'}，返回产品列表重新选择。</p>
          <Link className="btn btn--secondary btn--sm" to="/products">
            返回产品列表
          </Link>
        </div>
      </div>
    )
  }

  if (templateLoading) return <DetailSkeleton />

  const templateBlocks = (template?.blocks ?? []).filter((block) => block.enabled)

  return (
    <div ref={rootRef}>
      <JsonLdNode node={productJsonLd(detail, ogImage)} />
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/products">产品</Link>
          <span>/</span>
          <span>{detail.name}</span>
        </nav>
      </div>
      {templateBlocks.length > 0 ? (
        <ProductDetailContext.Provider value={detail}>
          <BlockRenderer blocks={templateBlocks} />
        </ProductDetailContext.Provider>
      ) : (
        // 模板未配置 / 加载失败：明确空态，避免白屏（不再回退遗留硬编码骨架）
        <div className="container section">
          <div className="empty">
            <div className="empty__title">产品详情模板暂不可用</div>
            <p className="empty__desc">该页面的展示区块尚未配置或加载失败，可返回产品列表继续浏览。</p>
            <Link className="btn btn--secondary btn--sm" to="/products">
              返回产品列表
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
