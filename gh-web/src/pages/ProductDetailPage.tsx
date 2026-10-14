import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TemplateBlocks } from '../blocks/TemplateBlocks'
import { BlockRenderer } from '../blocks/BlockRenderer'
import { ProductDetailContext } from '../blocks/ProductDetailContext'
import { fetchProductDetail } from '../api/products'
import { fetchPage } from '../api/content'
import { addMyFavorite, fetchMyFavorites, removeMyFavorite } from '../api/account'
import { MEDIA } from '../data/media'
import { PRODUCTS } from '../data/products'
import { MODEL_SUPPORTS } from '../data/support-extra'
import { MediaImg } from '../components/ui/MediaImg'
import { IconHeart } from '../components/ui/Icon'
import { JsonLdNode } from '../components/site/JsonLd'
import { productJsonLd } from '../components/site/detailJsonLd'
import { useApi } from '../hooks/useApi'
import { trackEvent } from '../lib/track'
import { useDetailSeo } from '../hooks/useDetailSeo'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'
import { useSession } from '../hooks/useSession'

/** 详情页相册的视角数量（front / top / three-quarter / side） */
const VIEW_COUNT = 4

/** 产品分类 → 系列 slug（用于详情页「同系列」入口） */
const SERIES_SLUG_BY_CATEGORY: Record<string, string> = {
  OLED旗舰: 'oled',
  双模高刷: 'dual',
  电竞IPS: 'ips',
  周边: 'accessory',
}

/** 产品详情（一级页面 · 骨架层）：展台、标称/实测分区、参数规格表 */
export function ProductDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const { data: detail, loading, error } = useApi((signal) => fetchProductDetail(id, signal), [id])
  // 产品详情模板（内容库）：若模板包含「产品展示台」区块，则详情页主体由模板区块渲染（主体区块化）
  const { data: template } = useApi((signal) => fetchPage('template-product', signal), [])

  const rootRef = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState(0)
  const [tab, setTab] = useState(0)
  // 收藏：真实落库（登录后），未登录时引导登录
  const [saved, setSaved] = useState(false)
  const [favBusy, setFavBusy] = useState(false)

  // 登录后回查收藏状态（与个人中心「收藏」同源）
  useEffect(() => {
    if (!user || !detail) {
      setSaved(false)
      return
    }
    let alive = true
    fetchMyFavorites()
      .then((res) => {
        if (alive) setSaved(res.items.some((item) => item.name === detail.name))
      })
      .catch(() => {
        /* 未登录 / 网络失败：保持未收藏态 */
      })
    return () => {
      alive = false
    }
  }, [user, detail?.name])

  // 收藏切换：未登录引导登录；已登录调用真实接口
  const toggleFavorite = async () => {
    if (!detail || favBusy) return
    if (!user) {
      navigate(`/login?from=${encodeURIComponent(`/products/${detail.id}`)}`)
      return
    }
    setFavBusy(true)
    try {
      if (saved) {
        await removeMyFavorite(detail.name)
        setSaved(false)
      } else {
        await addMyFavorite({ name: detail.name, spec: [detail.model, detail.price].filter(Boolean).join(' · ') })
        setSaved(true)
      }
    } catch {
      /* 失败静默：保持原状态 */
    } finally {
      setFavBusy(false)
    }
  }

  // 数据到位后展台才渲染，用 readyKey 触发一次动效绑定
  const readyKey = `${id}:${loading ? 'loading' : 'ready'}`
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

  if (loading) {
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

  const variant = PRODUCTS.find((item) => item.id === detail.id)?.variant ?? 'mouse'
  const views = MEDIA.views[variant] ?? MEDIA.views.mouse

  const templateBlocks = (template?.blocks ?? []).filter((block) => block.enabled)
  // 主体区块化：模板含「产品展示台」时，整页主体由模板区块渲染（不再走旧版硬编码骨架）
  if (templateBlocks.some((block) => block.type === 'productHero')) {
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
        <ProductDetailContext.Provider value={detail}>
          <BlockRenderer blocks={templateBlocks} />
        </ProductDetailContext.Provider>
      </div>
    )
  }

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

        <div className="detail-top" style={{ marginTop: 'var(--gh-space-5)' }}>
          {/* 产品大图（皮肤层展台） */}
          <div>
            <div
              className="stage detail-media media-ph"
              style={{ '--vt': `vh-${detail.id}` } as CSSProperties}
            >
              <div className="stage__glow" />
              <div className="stage__content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <MediaImg
                  className="detail-img"
                  src={views[thumb]}
                  alt={`${detail.model} ${detail.name}`}
                  variant={variant}
                  label={`${detail.model} 产品图`}
                  loading="eager"
                />
              </div>
            </div>
            <div className="detail-thumbs">
              {Array.from({ length: VIEW_COUNT }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`thumb${index === thumb ? ' is-active' : ''}`}
                  aria-label={`视图 ${index + 1}`}
                  aria-pressed={index === thumb}
                  onClick={() => setThumb(index)}
                >
                  <MediaImg src={views[index]} alt="" variant={variant} />
                </button>
              ))}
            </div>
          </div>

          {/* 产品信息 */}
          <div className="detail-info">
            {/* h1 口径统一为「型号 + 品类」：型号作为眉标行与品类名同属一个标题，
                视觉层级（小号等宽型号 + 大号品类名）保持不变 */}
            <h1 className="detail-info__title">
              <span className="detail-info__model">{detail.model}</span>{' '}
              <span className="detail-info__name">{detail.name}</span>
            </h1>
            {detail.tagline && (
              <p className="section__desc" style={{ marginTop: 'var(--gh-space-2)', marginBottom: 0 }}>
                {detail.tagline}
              </p>
            )}
            <div className="row" style={{ marginBottom: 'var(--gh-space-4)' }}>
              {detail.badges.map((badge) => (
                <span className="tag tag--accent" key={badge}>
                  {badge}
                </span>
              ))}
              <span className={`status status--${detail.status.level}`}>{detail.status.text}</span>
            </div>
            <div className="detail-price">
              {detail.price}{' '}
              <small style={{ fontFamily: 'var(--gh-font-sans)', fontSize: 'var(--gh-font-size-body-sm)', color: 'var(--color-text-tertiary)', fontWeight: 'var(--gh-weight-regular)' }}>
                参考价
              </small>
            </div>
            <div className="detail-buy">
              <Link
                className="btn btn--lg btn--primary is-magnetic"
                to={`/compare?ids=${detail.id}`}
                onClick={() => trackEvent('compare', detail.id)}
              >
                加入对比
              </Link>
              <Link className="btn btn--secondary btn--lg" to="/inquiry">
                在线顾问
              </Link>
              <button
                className="icon-btn"
                type="button"
                aria-label={saved ? '取消收藏' : '收藏'}
                aria-pressed={saved}
                disabled={favBusy}
                onClick={toggleFavorite}
                style={{ color: saved ? 'var(--color-accent-text)' : undefined }}
              >
                <IconHeart size={18} />
              </button>
            </div>

            {/* 核心参数摘要（标称 / 实测严格分区） */}
            <dl className="summary">
              {detail.summary.map((group) => (
                <div key={group.title}>
                  <div className="summary__group-title">{group.title}</div>
                  {group.rows.map((row) => (
                    <div className="summary__row" key={row.label}>
                      <dt>{row.label}</dt>
                      <dd className={row.missing ? 'missing' : undefined}>{row.value}</dd>
                    </div>
                  ))}
                </div>
              ))}
            </dl>
            <p className="field__hint" style={{ marginTop: 'var(--gh-space-3)', fontSize: 'var(--gh-font-size-caption)', color: 'var(--color-text-tertiary)' }}>
              缺失与零值含义不同：「未测量」表示尚未完成该测试，不代表零值表现。
            </p>
          </div>
        </div>

        {/* 详情分区 */}
        <div style={{ marginTop: 'var(--gh-space-9)' }}>
          <div className="tabs" role="tablist" aria-label="详情分区">
            {detail.tabs.map((name, index) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={index === tab}
                className={`tab${index === tab ? ' tab--active' : ''}`}
                onClick={() => setTab(index)}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="section--tight">
            {tab === 0 ? (
              <>
                <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h4)', marginBottom: 'var(--gh-space-4)' }}>
                  参数规格
                </h2>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: '30%' }}>参数</th>
                        <th>标称值</th>
                        <th>实测值</th>
                        <th>备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.specTable.map((row) => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td className="mono">{row.nominal}</td>
                          <td className={row.missing ? 'missing' : 'mono'}>{row.measured}</td>
                          <td className="muted">{row.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="empty">
                <h2 className="empty__title">{detail.tabs[tab]} 暂无内容</h2>
                <p className="empty__desc">
                  {detail.tabs[tab]}将在上线后随测试与内容排期补充；如需相关数据，可提交咨询由咨询师提供。
                </p>
                <Link className="btn btn--secondary btn--sm" to="/inquiry">
                  提交咨询
                </Link>
              </div>
            )}

            <div className="row" style={{ marginTop: 'var(--gh-space-5)', gap: 'var(--gh-space-4)', alignItems: 'stretch' }}>
              <div className="card" style={{ flex: 1, minWidth: 260 }}>
                <h3 className="card__title">下载资料</h3>
                <p className="card__desc">驱动、说明书与固件均在此获取，标注适用型号与版本。</p>
                <Link className="btn btn--secondary btn--sm" to="/downloads" style={{ marginTop: 'var(--gh-space-4)' }}>
                  前往下载中心
                </Link>
              </div>
              {MODEL_SUPPORTS.some((entry) => entry.id === detail.id) && (
                <div className="card" style={{ flex: 1, minWidth: 260 }}>
                  <h3 className="card__title">型号支持</h3>
                  <p className="card__desc">该型号的下载资料、常见问答与使用指南。</p>
                  <Link
                    className="btn btn--secondary btn--sm"
                    to={`/support/model/${detail.id}`}
                    style={{ marginTop: 'var(--gh-space-4)' }}
                  >
                    查看型号支持
                  </Link>
                </div>
              )}
              {SERIES_SLUG_BY_CATEGORY[PRODUCTS.find((item) => item.id === detail.id)?.category ?? ''] && (
                <div className="card" style={{ flex: 1, minWidth: 260 }}>
                  <h3 className="card__title">同系列产品</h3>
                  <p className="card__desc">查看同系列在售型号与参数对比。</p>
                  <Link
                    className="btn btn--secondary btn--sm"
                    to={`/products/series/${SERIES_SLUG_BY_CATEGORY[PRODUCTS.find((item) => item.id === detail.id)?.category ?? '']}`}
                    style={{ marginTop: 'var(--gh-space-4)' }}
                  >
                    查看系列
                  </Link>
                </div>
              )}
              <div className="card" style={{ flex: 1, minWidth: 260 }}>
                <h3 className="card__title">需要帮助？</h3>
                <p className="card__desc">对参数或适配有疑问，可提交咨询，由咨询师跟进。</p>
                <Link className="btn btn--primary btn--sm" to="/inquiry" style={{ marginTop: 'var(--gh-space-4)' }}>
                  提交咨询
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <TemplateBlocks pageKey="template-product" />
    </div>
  )
}
