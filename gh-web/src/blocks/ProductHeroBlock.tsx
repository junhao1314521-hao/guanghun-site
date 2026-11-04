/**
 * 产品详情 · 展示台区块（productHero）。
 *
 * 详情页「主体区块化」的首块：大图展台 + 型号/品类标题 + 角标/状态 + 参考价 +
 * 主次按钮（文案与链接可在后台配置，作用于所有产品）+ 标称/实测参数摘要。
 *
 * 相册（§5.2）：优先读取**当前产品的 `gallery`**（按产品单独上传、可排序）；
 * 未配置时回退内置 4 视角图（`MEDIA.views[variant]`，行为与观感不变）。
 * 交互（对齐京东 / 淘宝详情页）：主图悬停显示跟随光标的放大镜（图片本身不位移）；
 * 缩略图行内容溢出时两端出现圆形左右按钮；点击大图打开灯箱
 * （灯箱内「＋/－」稳定放大并原生滚动查看细节，左右切换 / Esc 关闭 / 键盘可达）。
 *
 * 数据来自 `ProductDetailContext`（当前产品）；装修配置来自区块 props（模板级，统一生效）。
 */
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { SafeLink } from '../components/ui/SafeLink'
import { IconHeart } from '../components/ui/Icon'
import { MEDIA } from '../data/media'
import { PRODUCTS } from '../data/products'
import { MediaImg } from '../components/ui/MediaImg'
import { isPlaceholderMedia } from '../components/ui/CodeMedia'
import { addMyFavorite, fetchMyFavorites, removeMyFavorite } from '../api/account'
import { useSession } from '../hooks/useSession'
import { useProductDetail } from './ProductDetailContext'
import { useI18n } from '../i18n'
import { asBool, asString } from './blockUtils'

/** 后台 SKU 规格值支持「数组」或「逗号分隔文本」两种录入方式 */
function splitSkuValues(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean)
  return (value ?? '')
    .split(/[,，/、]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

/** 常见颜色 → 色点（仅用于「颜色」规格组的视觉提示） */
const COLOR_DOT: Array<[string, string]> = [
  ['黑', '#1B1B1F'],
  ['白', '#F2F2F2'],
  ['银', '#C9CCD1'],
  ['灰', '#8B8F94'],
  ['粉', '#E8B7C6'],
  ['蓝', '#3B6FD8'],
  ['绿', '#3D9B6A'],
  ['金', '#C9A24B'],
]

function colorDotOf(value: string): string | undefined {
  return COLOR_DOT.find(([keyword]) => value.includes(keyword))?.[1]
}

export function ProductHeroBlock({ props }: { props: Record<string, unknown> }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { user } = useSession()
  const detail = useProductDetail()
  const [thumb, setThumb] = useState(0)
  /** 收藏状态（登录后与个人中心同源） */
  const [saved, setSaved] = useState(false)
  const [favBusy, setFavBusy] = useState(false)
  /** 灯箱当前索引；null = 关闭 */
  const [lightbox, setLightbox] = useState<number | null>(null)
  /** 灯箱放大：原生滚动查看细节，避免跟随光标的漂移感 */
  const [lightboxZoom, setLightboxZoom] = useState(false)
  const lightboxCloseRef = useRef<HTMLButtonElement>(null)
  const lightboxStageRef = useRef<HTMLDivElement>(null)
  /** 放大态拖拽平移（鼠标拖住图片移动视野） */
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  /** 悬停放大镜：跟随光标、图片本身不动（京东 / 淘宝同款交互） */
  const [lens, setLens] = useState<{
    left: number
    top: number
    size: number
    imgW: number
    imgH: number
    bgX: number
    bgY: number
  } | null>(null)
  /** 缩略图横滑 */
  const stripRef = useRef<HTMLDivElement>(null)
  const [strip, setStrip] = useState({ overflow: false, start: false, end: false })

  const variant = PRODUCTS.find((item) => item.id === detail?.id)?.variant ?? 'mouse'
  const fallbackViews = MEDIA.views[variant] ?? MEDIA.views.mouse
  const gallery = detail?.gallery && detail.gallery.length > 0 ? detail.gallery : fallbackViews
  const active = Math.min(thumb, Math.max(0, gallery.length - 1))
  const activeSrc = gallery[active]

  /** 悬停放大镜：只在「有精确指针」的设备开启，且素材必须是真实位图 */
  const canLens =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !isPlaceholderMedia(activeSrc)

  const onZoomMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!canLens) return
    const host = event.currentTarget
    const img = host.querySelector('img')
    if (!img || !img.naturalWidth || !img.naturalHeight) return
    const box = img.getBoundingClientRect()
    const hostRect = host.getBoundingClientRect()
    // object-fit: contain → 算出图片在容器里的真实显示区域（去掉两侧留白）
    const ratio = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight)
    const contentW = img.naturalWidth * ratio
    const contentH = img.naturalHeight * ratio
    const contentLeft = box.left + (box.width - contentW) / 2
    const contentTop = box.top + (box.height - contentH) / 2
    const size = 180
    if (contentW < size + 24 || contentH < size + 24) {
      setLens(null)
      return
    }
    const x = event.clientX - contentLeft
    const y = event.clientY - contentTop
    if (x < 0 || y < 0 || x > contentW || y > contentH) {
      setLens(null)
      return
    }
    // 镜头中心限制在画面内，边缘处不越界
    const clampedX = Math.min(Math.max(x, size / 2), contentW - size / 2)
    const clampedY = Math.min(Math.max(y, size / 2), contentH - size / 2)
    setLens({
      size,
      left: contentLeft - hostRect.left + clampedX,
      top: contentTop - hostRect.top + clampedY,
      imgW: contentW,
      imgH: contentH,
      bgX: -(clampedX * 2 - size / 2),
      bgY: -(clampedY * 2 - size / 2),
    })
  }

  // 切换主图 / 打开灯箱时收起镜头
  useEffect(() => setLens(null), [active, lightbox])

  /** 缩略图横滑：内容溢出才显示两端圆钮（京东 / 淘宝同款） */
  const measureStrip = () => {
    const el = stripRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setStrip({ overflow: max > 2, start: el.scrollLeft > 2, end: el.scrollLeft < max - 2 })
  }

  useEffect(() => {
    measureStrip()
    const el = stripRef.current
    if (!el) return
    const observer = new ResizeObserver(measureStrip)
    observer.observe(el)
    const timer = window.setTimeout(measureStrip, 200)
    return () => {
      observer.disconnect()
      window.clearTimeout(timer)
    }
  }, [gallery.length])

  const scrollStrip = (direction: number) => {
    const el = stripRef.current
    if (!el) return
    el.scrollBy({ left: direction * Math.max(140, el.clientWidth * 0.8), behavior: 'smooth' })
  }

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

  // 灯箱放大后把滚动位置放到图片中心，便于继续查看细节
  useEffect(() => {
    if (!lightboxZoom || lightbox === null) return
    const stage = lightboxStageRef.current
    if (!stage) return
    requestAnimationFrame(() => {
      stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) / 2
      stage.scrollTop = (stage.scrollHeight - stage.clientHeight) / 2
    })
  }, [lightboxZoom, lightbox])

  // 放大态拖拽平移：按下记录起点，移动时反向滚动容器
  const onStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!lightboxZoom) return
    const stage = event.currentTarget
    dragRef.current = { x: event.clientX, y: event.clientY, left: stage.scrollLeft, top: stage.scrollTop }
    stage.setPointerCapture(event.pointerId)
    stage.classList.add('is-grabbing')
  }
  const onStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const stage = event.currentTarget
    stage.scrollLeft = drag.left - (event.clientX - drag.x)
    stage.scrollTop = drag.top - (event.clientY - drag.y)
  }
  const endStageDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    dragRef.current = null
    event.currentTarget.classList.remove('is-grabbing')
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

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

  /* —— SKU 选择（颜色 / 版本等；无 SKU 数据时整块隐藏）—— */
  const [pickedSku, setPickedSku] = useState<{ productId: string; values: string[] } | null>(null)
  const skuOptions = (detail?.skuOptions ?? [])
    .map((option) => ({ name: option.name, values: splitSkuValues(option.values) }))
    .filter((option) => option.name && option.values.length > 0)
  const skuList = (detail?.skus ?? [])
    .map((sku, index) => {
      const options = Array.isArray(sku.options)
        ? sku.options.filter(Boolean)
        : [sku.option1, sku.option2, sku.option3].filter((value): value is string => Boolean(value))
      const rawStock = sku.stock
      const stock =
        typeof rawStock === 'number'
          ? rawStock
          : typeof rawStock === 'string' && rawStock.trim()
            ? Number(rawStock)
            : undefined
      return {
        id: sku.id ?? `sku-${index}`,
        options,
        price: sku.price,
        stock: Number.isFinite(stock) ? stock : undefined,
        skuCode: sku.skuCode,
      }
    })
    .filter((sku) => sku.options.length > 0)
  const defaultSelection = skuList[0]?.options?.length
    ? skuList[0].options
    : skuOptions.map((option) => option.values[0]).filter(Boolean)
  const selectedValues =
    pickedSku && pickedSku.productId === detail?.id && pickedSku.values.length === skuOptions.length
      ? pickedSku.values
      : defaultSelection
  const selectedSku = skuList.find((sku) => sku.options.every((value, index) => value === selectedValues[index]))
  const displayPrice = selectedSku?.price || detail?.price || ''

  const pickSku = (index: number, value: string) => {
    if (!detail) return
    const next = skuOptions.map((option, optionIndex) =>
      optionIndex === index ? value : selectedValues[optionIndex] ?? option.values[0],
    )
    setPickedSku({ productId: detail.id, values: next })
  }

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
  const secondaryHref =
    (() => {
      const configured = asString(props.secondaryHref)
      if (configured && configured !== '/business/venues') return configured
      const family = ['闪电', '枪神', '鹰眼', '极创', '光魂', '超凡剑圣'].find(
        (name) => detail?.name?.includes(name) || detail?.model?.includes(name),
      )
      return family ? `/business/venues?model=${encodeURIComponent(family)}` : '/business/venues'
    })()

  const stepLightbox = (offset: number) => {
    setLightboxZoom(false)
    setLightbox((i) => (i === null ? i : (i + offset + gallery.length) % gallery.length))
  }

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
                className="pd-zoom-host"
                aria-label="查看大图"
                onPointerMove={onZoomMove}
                onPointerLeave={() => setLens(null)}
                onBlur={() => setLens(null)}
                onClick={() => {
                  setLightboxZoom(false)
                  setLightbox(active)
                }}
              >
                <MediaImg
                  className="detail-img"
                  src={activeSrc}
                  alt={`${detail.model} ${detail.name}`}
                  variant={variant}
                  label={`${detail.model} 产品图`}
                  loading="eager"
                />
                {lens && (
                  <span
                    className="pd-lens"
                    aria-hidden="true"
                    style={{
                      width: lens.size,
                      height: lens.size,
                      left: lens.left - lens.size / 2,
                      top: lens.top - lens.size / 2,
                      backgroundImage: `url("${activeSrc}")`,
                      backgroundSize: `${lens.imgW * 2}px ${lens.imgH * 2}px`,
                      backgroundPosition: `${lens.bgX}px ${lens.bgY}px`,
                    }}
                  />
                )}
              </button>
            </div>
          </div>
          <div className="pd-thumbs">
            {strip.overflow && (
              <button
                type="button"
                className={`pd-thumbs__nav pd-thumbs__nav--prev${strip.start ? '' : ' is-off'}`}
                aria-label="向前查看更多图片"
                onClick={() => scrollStrip(-1)}
              >
                ‹
              </button>
            )}
            <div className="detail-thumbs pd-thumbs__track" ref={stripRef} onScroll={measureStrip}>
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
            {strip.overflow && (
              <button
                type="button"
                className={`pd-thumbs__nav pd-thumbs__nav--next${strip.end ? '' : ' is-off'}`}
                aria-label="向后查看更多图片"
                onClick={() => scrollStrip(1)}
              >
                ›
              </button>
            )}
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
              {displayPrice}{' '}
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

          {/* SKU 规格：颜色 / 版本等；没有配置 SKU 的产品不显示 */}
          {skuOptions.length > 0 && (
            <div className="sku-picker">
              {skuOptions.map((option, index) => (
                <div className="sku-group" key={option.name}>
                  <span className="sku-group__label">{option.name}</span>
                  <div className="sku-group__values" role="group" aria-label={option.name}>
                    {option.values.map((value) => {
                      const dot = colorDotOf(value)
                      return (
                        <button
                          key={value}
                          type="button"
                          className={`sku-chip${selectedValues[index] === value ? ' is-active' : ''}`}
                          aria-pressed={selectedValues[index] === value}
                          onClick={() => pickSku(index, value)}
                        >
                          {dot && <span className="sku-chip__dot" style={{ background: dot }} />}
                          {value}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div className="sku-picked">
                <span>
                  {t('blocks.pd.selected')}：<strong>{selectedValues.join(' · ') || '—'}</strong>
                </span>
                {selectedSku?.skuCode && <span className="sku-code">{selectedSku.skuCode}</span>}
                {selectedSku?.stock !== undefined && (
                  <span className={`sku-stock${selectedSku.stock > 0 ? '' : ' is-out'}`}>
                    {selectedSku.stock > 0 ? t('blocks.pd.inStock') : t('blocks.pd.outOfStock')}
                  </span>
                )}
              </div>
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
      {lightbox !== null &&
        createPortal(
          <div
            className="pd-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`${detail.model} 产品图`}
            onClick={() => {
              setLightbox(null)
              setLightboxZoom(false)
            }}
          >
          <button
            type="button"
            ref={lightboxCloseRef}
            className="pd-lightbox__close"
            aria-label="关闭"
            onClick={() => {
              setLightbox(null)
              setLightboxZoom(false)
            }}
          >
            ✕
          </button>
          <button
            type="button"
            className="pd-lightbox__zoom"
            aria-label={lightboxZoom ? '适应屏幕' : '放大查看'}
            aria-pressed={lightboxZoom}
            onClick={(event) => {
              event.stopPropagation()
              setLightboxZoom((value) => !value)
            }}
          >
            {lightboxZoom ? '－' : '＋'}
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
          <div
            className={`pd-lightbox__stage${lightboxZoom ? ' is-zoomed' : ''}`}
            ref={lightboxStageRef}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={onStagePointerDown}
            onPointerMove={onStagePointerMove}
            onPointerUp={endStageDrag}
            onPointerCancel={endStageDrag}
          >
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
          </div>,
          document.body,
        )}
    </>
  )
}
