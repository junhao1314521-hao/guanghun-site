/**
 * 产品详情 · 展示台区块（productHero）。
 *
 * 详情页「主体区块化」的首块：大图展台 + 型号/品类标题 + 角标/状态 + 参考价 +
 * 主次按钮（文案与链接可在后台配置，作用于所有产品）+ 标称/实测参数摘要。
 *
 * 相册（§5.2）：优先读取**当前产品的 `gallery`**（按产品单独上传、可排序）；
 * 未配置时回退内置 4 视角图（`MEDIA.views[variant]`，行为与观感不变）。
 * 交互（对齐淘宝详情页）：主图悬停时出现取景框，并在图片右侧弹出固定的大图预览面板
 * （右侧空间不足时自动改到左侧，图片本身不位移）；
 * 缩略图行内容溢出时两端出现圆形左右按钮；点击大图打开灯箱
 * （灯箱内「＋/－」稳定放大并原生滚动查看细节，左右切换 / Esc 关闭 / 键盘可达）。
 *
 * 数据来自 `ProductDetailContext`（当前产品）；装修配置来自区块 props（模板级，统一生效）。
 */
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { SafeLink } from '../components/ui/SafeLink'
import { IconChat, IconHeart } from '../components/ui/Icon'
import { MEDIA } from '../data/media'
import { PRODUCTS } from '../data/products'
import { MediaImg } from '../components/ui/MediaImg'
import { isPlaceholderMedia } from '../components/ui/CodeMedia'
import { addMyFavorite, fetchMyFavorites, removeMyFavorite } from '../api/account'
import { useSession } from '../hooks/useSession'
import { useProductDetail } from './ProductDetailContext'
import { useI18n } from '../i18n'
import { asBool, asString } from './blockUtils'
import { ProductModel3D, supports3D } from '../components/product/ProductModel3D'

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

/** 根据颜色名中的关键词匹配色点色值，未命中时返回 undefined */
function colorDotOf(value: string): string | undefined {
  return COLOR_DOT.find(([keyword]) => value.includes(keyword))?.[1]
}

/** 产品详情首屏区块：渲染相册、灯箱、价格与购买入口，并处理收藏与配色选择 */
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
  /**
   * 悬停放大（淘宝同款）：光标处出现取景框，右侧固定一块大图预览面板；
   * 图片本身不位移，面板位置按视口空间自动左右切换。
   */
  const [zoom, setZoom] = useState<{
    /** 取景框（相对宿主） */
    boxLeft: number
    boxTop: number
    boxW: number
    boxH: number
    /** 预览面板（视口坐标） */
    panelLeft: number
    panelTop: number
    panelW: number
    panelH: number
    bgX: number
    bgY: number
    bgW: number
    bgH: number
  } | null>(null)
  /** 缩略图横滑 */
  const stripRef = useRef<HTMLDivElement>(null)
  const [strip, setStrip] = useState({ overflow: false, start: false, end: false })

  /* —— 3D 预览（后台开关 + 已上传 .glb 才出现入口）—— */
  const [mode, setMode] = useState<'photo' | 'model'>('photo')
  const [modelReady, setModelReady] = useState(false)
  const [modelFailed, setModelFailed] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)
  const modelSrc = detail?.model3d ?? ''
  // WebGL 可用性只在首次渲染探测一次；不支持 WebGL 的设备不显示 3D 入口
  const [webglOk] = useState(() => supports3D())
  const can3d = Boolean(detail?.model3dEnabled && modelSrc) && webglOk && !modelFailed
  // 切换产品时回到实拍，避免上一个产品的 3D 状态残留
  useEffect(() => {
    setMode('photo')
    setModelReady(false)
    setModelFailed(false)
    setResetSignal(0)
  }, [detail?.id])
  // 进入 3D 时收起悬停放大，避免取景框压在画布上
  useEffect(() => {
    if (mode === 'model') setZoom(null)
  }, [mode])

  const variant = PRODUCTS.find((item) => item.id === detail?.id)?.variant ?? 'mouse'
  const fallbackViews = MEDIA.views[variant] ?? MEDIA.views.mouse
  const gallery = detail?.gallery && detail.gallery.length > 0 ? detail.gallery : fallbackViews
  const active = Math.min(thumb, Math.max(0, gallery.length - 1))
  const activeSrc = gallery[active]

  /** 悬停放大：只在「有精确指针」的设备开启，且素材必须是真实位图 */
  const canLens =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !isPlaceholderMedia(activeSrc)

  /** 放大倍率与面板间距（淘宝详情页观感：约 2.4 倍） */
  const ZOOM_SCALE = 2.4
  const PANEL_GAP = 16

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

    // 面板尺寸：宽度优先 420，按图片比例算高度，且不超过视口
    const panelW = Math.min(420, Math.round(contentW * 0.95))
    const panelH = Math.min(Math.round(window.innerHeight - 96), Math.round((panelW * contentH) / contentW))
    const viewW = panelW / ZOOM_SCALE
    const viewH = panelH / ZOOM_SCALE
    if (contentW < viewW + 16 || contentH < viewH + 16) {
      setZoom(null)
      return
    }

    const x = event.clientX - contentLeft
    const y = event.clientY - contentTop
    if (x < 0 || y < 0 || x > contentW || y > contentH) {
      setZoom(null)
      return
    }

    // 取景框跟着光标，但不越出图片边界
    const viewX = Math.min(Math.max(x - viewW / 2, 0), contentW - viewW)
    const viewY = Math.min(Math.max(y - viewH / 2, 0), contentH - viewH)

    // 面板优先放图片右侧；右侧放不下改放左侧；两侧都放不下则不显示（保留灯箱）
    let panelLeft = contentLeft + contentW + PANEL_GAP
    if (panelLeft + panelW > window.innerWidth - 12) {
      panelLeft = contentLeft - panelW - PANEL_GAP
    }
    if (panelLeft < 8) {
      setZoom(null)
      return
    }
    const panelTop = Math.min(Math.max(contentTop, 12), Math.max(12, window.innerHeight - panelH - 12))

    setZoom({
      boxLeft: contentLeft - hostRect.left + viewX,
      boxTop: contentTop - hostRect.top + viewY,
      boxW: viewW,
      boxH: viewH,
      panelLeft,
      panelTop,
      panelW,
      panelH,
      bgX: -(viewX * ZOOM_SCALE),
      bgY: -(viewY * ZOOM_SCALE),
      bgW: contentW * ZOOM_SCALE,
      bgH: contentH * ZOOM_SCALE,
    })
  }

  // 切换主图 / 打开灯箱 / 窗口尺寸变化时收起预览，避免面板悬空错位
  useEffect(() => setZoom(null), [active, lightbox])
  useEffect(() => {
    if (!zoom) return
    const hide = () => setZoom(null)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [zoom])

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

  // §4.22 3-2：主 CTA 优先取**当前产品**的购买链接（buyUrl，直跳淘宝）；
  // 次 CTA 默认「加入对比」→ /compare?ids=<当前产品>。区块 props 仍可覆盖文案与链接。
  const primaryFromProduct = props.primaryFromProduct === undefined ? true : asBool(props.primaryFromProduct)
  const productBuyUrl = primaryFromProduct ? detail.buyUrl ?? '' : ''
  const primaryLabel = asString(props.primaryLabel, productBuyUrl ? '去淘宝购买' : '立即购买')
  const secondaryLabel = asString(props.secondaryLabel, '加入对比')
  // 未填购买链接时主按钮回退到 props 配置的链接（留空则回到 /inquiry）
  const primaryHref = productBuyUrl || asString(props.primaryHref) || '/inquiry'
  const secondaryHref = asString(props.secondaryHref) || `/compare?ids=${detail.id}`

  /* —— 首屏竖脊：规格标签 / 一句话卖点 / 参考价 / 关键指标 —— */
  const specTags = (detail.specs ?? []).slice(0, 4)
  // 第一条 feature 往往就是规格串，去掉空格与分隔点做归一化后比较，避免和下方标签重复
  const normalize = (text: string) => text.replace(/[\s·]/g, '')
  const specLine = normalize((detail.specs ?? []).join(''))
  const pitch = (detail.features ?? []).find((item) => item && normalize(item) !== specLine) ?? ''
  const metrics = (detail.summary?.[0]?.rows ?? []).slice(0, 3)
  const priceNumber = typeof detail.priceValue === 'number' && detail.priceValue > 0 ? detail.priceValue : 0
  const priceMain = displayPrice || (priceNumber ? `¥${priceNumber.toLocaleString('zh-CN')}` : '')

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
      <div className="detail-top detail-top--spine">
        <div>
          {/* 共享元素过渡：与产品卡同名（vh-<id>），进入详情页时卡片图「飞」到大图位 */}
          <div
            className={`stage detail-media media-ph${mode === 'model' ? ' stage--3d' : ''}`}
            style={{ '--vt': `vh-${detail.id}` } as CSSProperties}
          >
            <div className="stage__glow" />
            {mode === 'model' && can3d ? (
              <>
                <ProductModel3D
                  src={modelSrc}
                  label={`${detail.model} 3D 预览`}
                  resetSignal={resetSignal}
                  onReady={() => setModelReady(true)}
                  onError={() => {
                    setModelFailed(true)
                    setMode('photo')
                  }}
                />
                {/* 模型加载完成前先显示封面图，完成后淡出，避免空舞台 */}
                <img
                  className={`pd3d__poster${modelReady ? ' is-hidden' : ''}`}
                  src={detail.model3dPoster || activeSrc}
                  alt=""
                  aria-hidden="true"
                />
                <p className="pd3d__hint">拖动旋转 · 双击复位</p>
              </>
            ) : (
              <div
                className="stage__content"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
              >
                <button
                  type="button"
                  className="pd-zoom-host"
                  aria-label="查看大图"
                  onPointerMove={onZoomMove}
                  onPointerLeave={() => setZoom(null)}
                  onBlur={() => setZoom(null)}
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
                  {zoom && (
                    <span
                      className="pd-zoom-box"
                      aria-hidden="true"
                      style={{
                        left: zoom.boxLeft,
                        top: zoom.boxTop,
                        width: zoom.boxW,
                        height: zoom.boxH,
                      }}
                    />
                  )}
                </button>
              </div>
            )}
            {/* 工具条：只在有模型时出现；3D 态额外给一个「复位视角」 */}
            {can3d && (
              <div className="pd-stage-tools">
                <button
                  type="button"
                  className={`pd-stage-tools__btn pd-stage-tools__btn--3d${mode === 'model' ? ' is-on' : ''}`}
                  aria-pressed={mode === 'model'}
                  aria-label={mode === 'model' ? '返回实拍图' : '查看 3D 模型'}
                  onClick={() => {
                    if (mode === 'model') {
                      setMode('photo')
                      return
                    }
                    setModelReady(false)
                    setMode('model')
                  }}
                >
                  3D
                </button>
                {mode === 'model' && (
                  <button
                    type="button"
                    className="pd-stage-tools__btn"
                    aria-label="复位视角"
                    title="复位视角"
                    onClick={() => setResetSignal((value) => value + 1)}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 12a9 9 0 1 0 3.2-6.9" />
                      <path d="M3 4.5V9h4.5" />
                    </svg>
                  </button>
                )}
              </div>
            )}
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
                  className={`thumb${mode === 'photo' && index === active ? ' is-active' : ''}`}
                  aria-label={t('blocks.pd.view', { n: index + 1 })}
                  aria-pressed={mode === 'photo' && index === active}
                  onClick={() => {
                    setThumb(index)
                    // 点任意实拍缩略图即退出 3D，回到对应视角
                    if (mode === 'model') setMode('photo')
                  }}
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
          <div className="pd-spine__model">{detail.model}</div>
          <h1 className="pd-spine__title">{detail.name}</h1>
          {pitch && <p className="pd-spine__pitch">{pitch}</p>}

          {showBadges && (
            <div className="pd-spine__tags">
              {specTags.map((tag) => (
                <span className="pd-spine__tag" key={tag}>
                  {tag}
                </span>
              ))}
              <span className={`status status--${detail.status.level}`}>{detail.status.text}</span>
            </div>
          )}

          {showPrice && (
            <div className="pd-spine__price">
              <span className="pd-spine__price-label">{t('blocks.pd.refPrice')}</span>
              {priceMain ? (
                <>
                  <span className="pd-spine__price-row">
                    <span className="pd-spine__price-value">{priceMain}</span>
                    {!displayPrice && <span className="pd-spine__price-suffix">起</span>}
                  </span>
                  <span className="pd-spine__price-note">以平台实时价为准</span>
                </>
              ) : (
                // 未定参考价时不臆造数字：文案与「参考价，实际以各平台为准」口径一致
                <span className="pd-spine__price-pending">价格以各电商平台为准</span>
              )}
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

          <div className="detail-buy pd-spine__cta">
            {primaryLabel &&
              (primaryHref.startsWith('/') ? (
                <SafeLink className="btn btn--primary btn--lg" to={primaryHref}>
                  {primaryLabel}
                </SafeLink>
              ) : (
                <a className="btn btn--primary btn--lg" href={primaryHref} target="_blank" rel="noopener noreferrer">
                  {primaryLabel}
                </a>
              ))}
            {secondaryLabel &&
              (secondaryHref.startsWith('/') ? (
                <SafeLink className="btn btn--secondary btn--lg" to={secondaryHref}>
                  {secondaryLabel}
                </SafeLink>
              ) : (
                <a className="btn btn--secondary btn--lg" href={secondaryHref} target="_blank" rel="noopener noreferrer">
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
            <SafeLink className="icon-btn" to="/inquiry" aria-label="咨询">
              <IconChat size={18} />
            </SafeLink>
          </div>

          {/* 关键指标：3 条真实参数（实测优先），label 左、值右对齐 */}
          {showSummary && metrics.length > 0 && (
            <dl className="pd-spine__metrics">
              {metrics.map((row) => (
                <div className="pd-spine__metric" key={row.label}>
                  <dt>{row.label}</dt>
                  <dd className={row.missing ? 'missing' : undefined}>
                    {row.measured ?? row.value ?? row.nominal ?? '—'}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {/* 保障行：与官方保修口径一致，不另造承诺 */}
          <ul className="pd-spine__assurance">
            <li>{t('blocks.pd.point1')}</li>
            <li>{t('blocks.pd.point2')}</li>
            <li>{t('blocks.pd.point3')}</li>
          </ul>
        </div>
      </div>

      {/* 悬停放大预览面板：固定在图片右侧（放不下时自动换到左侧） */}
      {zoom &&
        createPortal(
          <div
            className="pd-zoom-panel"
            aria-hidden="true"
            style={{
              left: zoom.panelLeft,
              top: zoom.panelTop,
              width: zoom.panelW,
              height: zoom.panelH,
              backgroundImage: `url("${activeSrc}")`,
              backgroundSize: `${zoom.bgW}px ${zoom.bgH}px`,
              backgroundPosition: `${zoom.bgX}px ${zoom.bgY}px`,
            }}
          />,
          document.body,
        )}

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
