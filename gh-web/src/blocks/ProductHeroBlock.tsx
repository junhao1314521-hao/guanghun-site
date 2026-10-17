/**
 * 产品详情 · 展示台区块（productHero）。
 *
 * 详情页「主体区块化」的首块：大图展台 + 型号/品类标题 + 角标/状态 + 参考价 +
 * 主次按钮（文案与链接可在后台配置，作用于所有产品）+ 标称/实测参数摘要。
 *
 * 相册（§5.2）：优先读取**当前产品的 `gallery`**（按产品单独上传、可排序）；
 * 未配置时回退内置 4 视角图（`MEDIA.views[variant]`，行为与观感不变）。
 * 交互：缩略图切换 + 鼠标悬停跟随光标局部放大（仅 `hover: hover / pointer: fine`）+
 * 点击大图打开灯箱（左右切换 / Esc 关闭 / 点遮罩关闭 / 键盘可达）。
 *
 * 数据来自 `ProductDetailContext`（当前产品）；装修配置来自区块 props（模板级，统一生效）。
 */
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { SafeLink } from '../components/ui/SafeLink'
import { IconHeart } from '../components/ui/Icon'
import { MEDIA } from '../data/media'
import { PRODUCTS } from '../data/products'
import { MediaImg } from '../components/ui/MediaImg'
import { addMyFavorite, fetchMyFavorites, removeMyFavorite } from '../api/account'
import { useSession } from '../hooks/useSession'
import { useProductDetail } from './ProductDetailContext'
import { useI18n } from '../i18n'
import { asBool, asString } from './blockUtils'

/** 超过该张数时缩略图行改为横向滑动（少量时与现状一致） */
const THUMB_SCROLL_THRESHOLD = 4

export function ProductHeroBlock({ props }: { props: Record<string, unknown> }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { user } = useSession()
  const detail = useProductDetail()
  const [thumb, setThumb] = useState(0)
  /** 收藏状态（登录后与个人中心同源） */
  const [saved, setSaved] = useState(false)
  const [favBusy, setFavBusy] = useState(false)
  /** 悬停放大：跟随光标的缩放原点（%）；null = 未放大 */
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)
  /** 灯箱当前索引；null = 关闭 */
  const [lightbox, setLightbox] = useState<number | null>(null)
  /** 是否支持悬停（触屏 / 粗指针不启用悬停放大，仅保留点击灯箱） */
  const [hoverCapable, setHoverCapable] = useState(false)
  const zoomRef = useRef<HTMLButtonElement>(null)
  const lightboxCloseRef = useRef<HTMLButtonElement>(null)

  const variant = PRODUCTS.find((item) => item.id === detail?.id)?.variant ?? 'mouse'
  const fallbackViews = MEDIA.views[variant] ?? MEDIA.views.mouse
  const gallery = detail?.gallery && detail.gallery.length > 0 ? detail.gallery : fallbackViews
  const active = Math.min(thumb, Math.max(0, gallery.length - 1))

  // 悬停能力检测（触屏 / 触控笔不启用悬停放大）
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setHoverCapable(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])

  // 灯箱键盘操作：左右切换、Esc 关闭；打开时聚焦关闭按钮
  useEffect(() => {
    if (lightbox === null) return
    lightboxCloseRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(null)
      else if (event.key === 'ArrowLeft') setLightbox((i) => (i === null ? i : (i - 1 + gallery.length) % gallery.length))
      else if (event.key === 'ArrowRight') setLightbox((i) => (i === null ? i : (i + 1) % gallery.length))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightbox, gallery.length])

  // 登录后回查收藏状态（R8.5：收藏能力保留）
  const productName = detail?.name
  useEffect(() => {
    if (!user || !productName) {
      setSaved(false)
      return
    }
    let alive = true
    fetchMyFavorites()
      .then((res) => {
        if (alive) setSaved(res.items.some((item) => item.name === productName))
      })
      .catch(() => {
        /* 未登录 / 网络失败：保持未收藏态 */
      })
    return () => {
      alive = false
    }
  }, [user, productName])

  if (!detail) return null

  const showBadges = props.showBadges === undefined ? true : asBool(props.showBadges)
  const showPrice = props.showPrice === undefined ? true : asBool(props.showPrice)
  const showSummary = props.showSummary === undefined ? true : asBool(props.showSummary)

  // §4.22 3-2：主 CTA「立即购买」优先取**当前产品**的购买链接（buyUrl）；
  // 次 CTA「预约体验」→ 体验点。区块 props 仍可配置：关闭 primaryFromProduct 后回退模板级统一配置。
  const primaryFromProduct = props.primaryFromProduct === undefined ? true : asBool(props.primaryFromProduct)
  const primaryLabel = asString(props.primaryLabel, primaryFromProduct ? '立即购买' : t('blocks.pd.defaultPrimary'))
  const secondaryLabel = asString(props.secondaryLabel, primaryFromProduct ? '预约体验' : t('blocks.pd.defaultSecondary'))
  const productBuyUrl = primaryFromProduct ? detail.buyUrl ?? '' : ''
  // 未填购买链接时主按钮回退到 props 配置的链接（留空则回到 /inquiry）
  const primaryHref = productBuyUrl || asString(props.primaryHref) || '/inquiry'
  const secondaryHref = asString(props.secondaryHref) || '/business/venues'

  const onZoomMove = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!hoverCapable) return
    const el = zoomRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100))
    setZoom({ x, y })
  }

  const stepLightbox = (offset: number) =>
    setLightbox((i) => (i === null ? i : (i + offset + gallery.length) % gallery.length))

  // 收藏切换：未登录引导登录；已登录调用真实接口（与个人中心「收藏」同源）
  const toggleFavorite = async () => {
    if (favBusy) return
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

  return (
    <>
      <div className="detail-top">
        {/* 展台（大图 + 多视角缩略图） */}
        <div>
          {/* 共享元素过渡：与产品卡同名（vh-<id>），进入详情页时卡片图「飞」到大图位 */}
          <div className="stage detail-media media-ph" style={{ '--vt': `vh-${detail.id}` } as CSSProperties}>
            <div className="stage__glow" />
            <div
              className="stage__content"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
            >
              <button
                type="button"
                ref={zoomRef}
                className={`pd-zoom-host${zoom ? ' is-zooming' : ''}`}
                aria-label="查看大图"
                onClick={() => setLightbox(active)}
                onMouseEnter={() => {
                  if (hoverCapable) setZoom({ x: 50, y: 50 })
                }}
                onMouseMove={onZoomMove}
                onMouseLeave={() => setZoom(null)}
                style={
                  zoom
                    ? ({ '--pd-zoom-x': `${zoom.x}%`, '--pd-zoom-y': `${zoom.y}%` } as CSSProperties)
                    : undefined
                }
              >
                <MediaImg
                  className="detail-img pd-zoom-target"
                  src={gallery[active]}
                  alt={`${detail.model} ${detail.name}`}
                  variant={variant}
                  label={`${detail.model} 产品图`}
                  loading="eager"
                />
              </button>
            </div>
          </div>
          <div className={`detail-thumbs${gallery.length > THUMB_SCROLL_THRESHOLD ? ' pd-gallery__thumbs--scroll' : ''}`}>
            {gallery.map((src, index) => (
              <button
                key={`${src}-${index}`}
                type="button"
                className={`thumb${index === active ? ' is-active' : ''}`}
                aria-label={t('blocks.pd.view', { n: index + 1 })}
                aria-pressed={index === active}
                onClick={() => setThumb(index)}
              >
                <MediaImg src={src} alt="" variant={variant} />
              </button>
            ))}
          </div>
        </div>

        {/* 产品信息 */}
        <div className="detail-info">
          <h1 className="detail-info__title">
            <span className="detail-info__model">{detail.model}</span>{' '}
            <span className="detail-info__name">{detail.name}</span>
          </h1>

          {showBadges && (
            <div className="row" style={{ marginBottom: 'var(--gh-space-4)' }}>
              {detail.badges.map((badge) => (
                <span className="tag tag--accent" key={badge}>
                  {badge}
                </span>
              ))}
              <span className={`status status--${detail.status.level}`}>{detail.status.text}</span>
            </div>
          )}

          {showPrice && (
            <div className="detail-price">
              {detail.price}{' '}
              <small
                style={{
                  fontFamily: 'var(--gh-font-sans)',
                  fontSize: 'var(--gh-font-size-body-sm)',
                  color: 'var(--color-text-tertiary)',
                  fontWeight: 'var(--gh-weight-regular)',
                }}
              >
                {t('blocks.pd.refPrice')}
              </small>
            </div>
          )}

          <div className="detail-buy">
            {primaryLabel &&
              (primaryHref.startsWith('/') ? (
                <SafeLink className="btn btn--primary btn--lg" to={primaryHref}>
                  {primaryLabel}
                </SafeLink>
              ) : (
                <a className="btn btn--primary btn--lg" href={primaryHref}>
                  {primaryLabel}
                </a>
              ))}
            {secondaryLabel &&
              (secondaryHref.startsWith('/') ? (
                <SafeLink className="btn btn--secondary btn--lg" to={secondaryHref}>
                  {secondaryLabel}
                </SafeLink>
              ) : (
                <a className="btn btn--secondary btn--lg" href={secondaryHref}>
                  {secondaryLabel}
                </a>
              ))}
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

          {showSummary && (
            <>
              {/* 首屏只放 3 条关键指标（实测优先）；完整摘要与规格在下方产品规格区块 */}
              <dl className="summary">
                {detail.summary.slice(0, 1).map((group) => (
                  <div key={group.title}>
                    <div className="summary__group-title">{t('blocks.pd.keyMetrics')}</div>
                    {group.rows.slice(0, 3).map((row) => (
                      <div className="summary__row" key={row.label}>
                        <dt>{row.label}</dt>
                        <dd className={row.missing ? 'missing' : undefined}>
                          {row.measured ?? row.value ?? row.nominal ?? '—'}
                        </dd>
                      </div>
                    ))}
                  </div>
                ))}
              </dl>
              <p
                className="field__hint"
                style={{
                  marginTop: 'var(--gh-space-3)',
                  fontSize: 'var(--gh-font-size-caption)',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                {t('blocks.pd.missingNote')}
              </p>
            </>
          )}
        </div>
      </div>

      {/* 灯箱：左右切换 / Esc 关闭 / 点遮罩关闭（键盘可达） */}
      {lightbox !== null && (
        <div
          className="pd-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${detail.model} 产品图`}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            ref={lightboxCloseRef}
            className="pd-lightbox__close"
            aria-label="关闭"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
          {gallery.length > 1 && (
            <button
              type="button"
              className="pd-lightbox__nav pd-lightbox__nav--prev"
              aria-label="上一张"
              onClick={(event) => {
                event.stopPropagation()
                stepLightbox(-1)
              }}
            >
              ‹
            </button>
          )}
          <div className="pd-lightbox__stage" onClick={(event) => event.stopPropagation()}>
            <MediaImg
              className="pd-lightbox__img"
              src={gallery[lightbox]}
              alt={`${detail.model} ${detail.name}`}
              variant={variant}
              label={`${detail.model} 产品图`}
              loading="eager"
            />
          </div>
          {gallery.length > 1 && (
            <button
              type="button"
              className="pd-lightbox__nav pd-lightbox__nav--next"
              aria-label="下一张"
              onClick={(event) => {
                event.stopPropagation()
                stepLightbox(1)
              }}
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  )
}
