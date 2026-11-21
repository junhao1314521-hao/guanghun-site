/**
 * 产品详情 v8：首屏决策台 + 下方叙事。
 *
 * 设计约束（已与业务确认）：
 * - 首屏只做决策：主图 / 视频 / 3D、型号、标题、核心参数、价格、购买、服务；
 * - 下方只做叙事：亮点、性能、规格与同系列对比、服务、评价、相关产品；
 * - 全页白底 + 发丝线分隔，不使用白卡外壳与投影（相关产品除外）；
 * - 所有模块数据驱动，无数据时自动隐藏；3D 无模型时保留灰色入口。
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { fetchProducts } from '../../api/products'
import { MEDIA } from '../../data/media'
import type { Product, ProductAttribute } from '../../data/products'
import { ProductModel3D } from '../../components/product/ProductModel3D'
import { DeviceArt, type DeviceVariant } from '../../components/ui/DeviceArt'
import { useProductDetail } from '../ProductDetailContext'
import './productDetailV8.css'

type T = (key: string, vars?: Record<string, string | number>) => string

type HeroConfig = {
  primaryLabel?: string
  primaryHref?: string
  primaryFromProduct?: boolean
  secondaryLabel?: string
  secondaryHref?: string
  showBadges?: boolean
  showPrice?: boolean
}

function findAttr(attrs: ProductAttribute[] | undefined, key: string) {
  return attrs?.find((item) => item.label.includes(key))
}

function isExternal(href: string) {
  return /^https?:\/\//i.test(href)
}

/** 把后台「产品亮点」的一条拆成卡片标题 + 说明：
 *  「第四代 W-OLED 面板，2K 540Hz 满速刷新」→ 标题「第四代 W-OLED 面板」，说明「2K 540Hz 满速刷新」。
 *  没有分隔符时整条作为标题，不编造说明文字。 */
function splitFeature(text: string) {
  const matched = text.match(/^(.{2,26}?)[，,、：:·|]\s*(.+)$/)
  if (matched) return { title: matched[1].trim(), desc: matched[2].trim() }
  return { title: text.trim(), desc: '' }
}

/** 服务保障图标：四项各用不同图形，避免四个盾牌重复 */
function ServiceIcon({ name }: { name: string }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (name === 'nationwide') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.6 2.7 3.9 5.9 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.9-3.9-9S9.4 5.7 12 3Z" />
      </svg>
    )
  }
  if (name === 'return') {
    return (
      <svg {...common}>
        <path d="M4 12a8 8 0 1 0 2.4-5.7" />
        <path d="M4 4v4.5h4.5" />
      </svg>
    )
  }
  if (name === 'shipping') {
    return (
      <svg {...common}>
        <path d="M3 7h11v9H3z" />
        <path d="M14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="17.5" cy="18" r="1.6" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M12 3 4.5 6v6c0 4.4 3.2 7.6 7.5 9 4.3-1.4 7.5-4.6 7.5-9V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

/** 产品亮点图标：按位次给三枚不同的线性图标，不依赖运营额外上传 */
function HighlightIcon({ index }: { index: number }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (index === 1) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5l3 2" />
      </svg>
    )
  }
  if (index === 2) {
    return (
      <svg {...common}>
        <rect x="3" y="7" width="14" height="10" rx="1.5" />
        <path d="M17 10h3l1.5 3v4H17z" />
        <path d="M7 11h5M7 14h3" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  )
}

/** 图集影视角标：把视频 / 3D 入口并入缩略图后，用角标区分媒体类型 */
function MediaBadge({ kind }: { kind: 'video' | 'model' }) {
  return kind === 'video' ? (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 6.5 18 12l-9 5.5z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 3 4 7v10l8 4 8-4V7z" />
      <path d="m4 7 8 4 8-4M12 11v10" />
    </svg>
  )
}

/** 缩略图缺少专属海报时的媒体字形，避免复用主图导致同一张图重复出现 */
function MediaGlyph({ kind }: { kind: 'video' | 'model' }) {
  return kind === 'video' ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m10 9 6 3-6 3z" fill="currentColor" stroke="none" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M12 3 4 7v10l8 4 8-4V7z" />
      <path d="m4 7 8 4 8-4M12 11v10" />
    </svg>
  )
}

/** 首屏权益 / 服务列表左侧的勾选图标 */
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ProductDetailV8({ heroProps, t }: { heroProps: Record<string, unknown>; t: T }) {
  const detail = useProductDetail()
  const hero = heroProps as HeroConfig

  const photos = useMemo(() => {
    if (!detail) return []
    // 后台没填相册时，优先用站点已登记的产品透明图，避免首屏出现空白舞台。
    const registered = MEDIA.product[detail.id]
    const gallery = detail.gallery?.length ? detail.gallery : registered ? [registered] : []
    // 后台只传了 1 张主图时，用站内同形态场景图补齐，保证左右切图可用。
    // 仅显示器品类补场景图：优先看 variant；老数据没有 variant 时，用「参数像显示器 + 名字不像配件」双重判断，
    // 避免「显示器悬臂支架」这类名字里带「显示器」的配件被塞进显示器实拍。
    const text = [detail.name, ...(detail.specs ?? [])].join(' ')
    const isMonitor =
      detail.variant === 'monitor' ||
      (!detail.variant &&
        /Hz|OLED|面板|分辨率|刷新率/.test(text) &&
        !/支架|悬臂|挂架|配件|线材/.test(detail.name))
    if (gallery.length >= 2 || !isMonitor) return gallery
    const fallback = MEDIA.views.monitor.filter((src) => !gallery.includes(src))
    return [...gallery, ...fallback].slice(0, 4)
  }, [detail])

  const [photoIndex, setPhotoIndex] = useState(0)
  // 加载失败的图集：有图但请求失败时回退到同品类矢量占位，不显示浏览器破图图标
  const [failedPhotos, setFailedPhotos] = useState<string[]>([])
  const [mode, setMode] = useState<'photo' | 'video' | 'model'>('photo')
  const [activeNav, setActiveNav] = useState('pdv8-top')
  const [related, setRelated] = useState<Product[]>([])
  const [showBuyBar, setShowBuyBar] = useState(false)
  // 子导航是否已吸顶：只有吸顶时才需要磨砂底遮挡下方内容
  const [navStuck, setNavStuck] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const [stackHeight, setStackHeight] = useState(90)
  const [picked, setPicked] = useState<string[]>([])
  // 已进入过视口的区块 id：用状态保存，避免滚动引起重渲染时丢掉入场态
  const [revealed, setRevealed] = useState<string[]>([])

  useEffect(() => {
    let alive = true
    fetchProducts()
      .then((result) => {
        if (alive) setRelated(result.items)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // 顶栏 + 公告条是 sticky 的，子导航要贴在它下面，不能直接 top: 0
  useEffect(() => {
    const stack = document.querySelector('.top-stack')
    const update = () => setStackHeight(stack?.getBoundingClientRect().height || 0)
    update()
    const observer =
      typeof ResizeObserver !== 'undefined' && stack ? new ResizeObserver(update) : null
    if (stack && observer) observer.observe(stack)
    window.addEventListener('resize', update)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setShowBuyBar(window.scrollY > 420)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const attributes = useMemo(() => detail?.attributes ?? [], [detail])

  // 规格组：后台 skuOptions 最多 3 组；values 兼容数组与「逗号分隔」文本
  const skuGroups = useMemo(
    () =>
      (detail?.skuOptions ?? []).slice(0, 3).map((group) => ({
        name: group.name,
        values: Array.isArray(group.values)
          ? group.values
          : String(group.values ?? '')
              .split(/[,，]/)
              .map((value) => value.trim())
              .filter(Boolean),
      })),
    [detail],
  )

  // 规格与包装清单的唯一数据源：导航判据和下方区块渲染共用，避免两边条件不一致造成死锚点
  const { specItems, packItems } = useMemo(() => {
    const packaging = attributes.filter((item) => (item.group ?? '').includes('包装'))
    const spec = attributes.filter((item) => !(item.group ?? '').includes('包装'))
    const pack = detail?.inBox?.length
      ? detail.inBox
      : packaging.flatMap((item) =>
          item.value
            .split(/[、,，;；]/)
            .map((value) => value.trim())
            .filter(Boolean),
        )
    return { specItems: spec, packItems: pack }
  }, [attributes, detail])

  const navItems = useMemo(() => {
    if (!detail) return []
    const items: { id: string; label: string }[] = []
    // 子导航与下方实际渲染的区块同源：没有数据的模块不出现在导航里，避免死锚点。
    if (detail.features?.length || attributes.length) items.push({ id: 'pdv8-highlights', label: t('blocks.pd.highlights') })
    if (specItems.length) items.push({ id: 'pdv8-specs', label: t('blocks.pd.v8Specs') })
    if (packItems.length) items.push({ id: 'pdv8-package', label: t('blocks.pd.v8PackTitle') })
    const selfVariant = related.find((item) => item.id === detail.id)?.variant
    const hasCompare = related.some(
      (item) => item.id !== detail.id && (item.category === detail.tag || item.variant === selfVariant),
    )
    // 对比表以参数为行，没有参数时区块不渲染
    if (hasCompare && attributes.length) items.push({ id: 'pdv8-compare', label: t('blocks.pd.v8CompareTitle') })
    items.push({ id: 'pdv8-service', label: t('blocks.pd.v8Service') })
    if (detail.reviews?.length) items.push({ id: 'pdv8-reviews', label: t('blocks.pd.v8Reviews') })
    return items
  }, [detail, related, attributes, specItems, packItems, t])

  // 当前区块：按「最后一个越过吸顶线」计算，短区块（如产品亮点）也不会被漏掉
  useEffect(() => {
    const ids = ['pdv8-top', ...navItems.map((item) => item.id)]
    const onScroll = () => {
      const line = (stackHeight || 90) + 80
      let current = ids[0]
      for (const id of ids) {
        const element = document.getElementById(id)
        if (element && element.getBoundingClientRect().top <= line) current = id
      }
      setActiveNav(current)
      // 子导航顶端抵达吸顶线即视为已吸顶（此时才铺磨砂底）
      const nav = navRef.current
      if (nav) setNavStuck(nav.getBoundingClientRect().top <= (stackHeight || 90) + 1)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [navItems, stackHeight])

  // 区块入场：滚到视口后淡入上浮一次；不支持的浏览器直接显示（CSS 里已有降级）
  useEffect(() => {
    if (!detail || typeof IntersectionObserver === 'undefined') return
    const nodes = document.querySelectorAll<HTMLElement>('.pdv8 .pdv8-reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        const ids = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target.id)
        if (!ids.length) return
        setRevealed((prev) => [...new Set([...prev, ...ids])])
        for (const entry of entries) {
          if (entry.isIntersecting) observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    nodes.forEach((node) => observer.observe(node))
    // related 异步返回后才渲染同系列对比，需要在它到位后重新观察新增区块
    return () => observer.disconnect()
  }, [detail, related])

  if (!detail) return null

  // 关键指标：取后台参数里最常用的四项，与完整规格同源，不再单独做「性能」模块
  const keyStats = (() => {
    const list: { label: string; value: string }[] = []
    for (const key of ['刷新率', '响应时间', '分辨率', '面板', '尺寸', '亮度', '对比度', '色域', '接口']) {
      const item = findAttr(attributes, key)
      if (item) list.push({ label: item.label, value: item.value })
      if (list.length === 4) break
    }
    if (!list.length) {
      for (const item of attributes.slice(0, 4)) list.push({ label: item.label, value: item.value })
    }
    return list
  })()

  const highlights = detail.features?.length
    ? detail.features.slice(0, 6)
    : attributes.slice(0, 6).map((item) => `${item.label}：${item.value}`)

  // 亮点卡片：只取前 3 条，标题/说明由后台同一条文案拆分，运营无需额外上传图片
  const highlightCards = highlights.slice(0, 3).map((text) => splitFeature(text))

  const chips = detail.specs?.length
    ? detail.specs.slice(0, 4)
    : attributes.slice(0, 4).map((item) => item.value)

  const self = related.find((item) => item.id === detail.id)
  const sameCategory = related.filter((item) => item.id !== detail.id && item.category === detail.tag)
  const sameVariant = related.filter(
    (item) => item.id !== detail.id && item.category !== detail.tag && item.variant === self?.variant,
  )
  const compareItems = [...sameCategory, ...sameVariant].slice(0, 2)

  const resolveValue = (attrs: ProductAttribute[] | undefined, label: string) => {
    const exact = attrs?.find((item) => item.label === label)
    if (exact) return exact.value
    if (label.includes('尺寸')) {
      const size = findAttr(attrs, '尺寸')?.value
      const resolution = findAttr(attrs, '分辨率')?.value
      if (size || resolution) return [size, resolution].filter(Boolean).join(' · ')
    }
    return findAttr(attrs, label)?.value ?? '—'
  }
  // 对比维度优先取硬件通用项；非显示器品类没有这些字段时，退回该品类自己的前 6 个参数，
  // 保证「性能对比对所有品类都显示」。
  const allLabels = [...new Set(attributes.map((item) => item.label))]
  const preferredLabels = allLabels.filter((label) =>
    /面板|尺寸|分辨率|刷新率|响应时间|亮度|对比度|色域|接口|连接|续航|重量|材质/.test(label),
  )
  const compareLabels = (preferredLabels.length ? preferredLabels : allLabels).slice(0, 6)
  const compareRows = compareLabels.map((label) => ({
    label,
    current: resolveValue(detail.attributes, label),
    others: compareItems.map((item) => resolveValue(item.attributes, label)),
  }))

  const warrantyText = (detail.warranty || t('blocks.pd.v8Warranty')).split(/[，,]/)[0]
  const priceText = detail.priceValue
    ? `¥${detail.priceValue.toLocaleString('zh-CN')}`
    : detail.price || '咨询报价'
  const buyHref =
    (hero.primaryFromProduct && detail.buyUrl) || hero.primaryHref || detail.buyUrl || '/products'
  const buyLabel = hero.primaryLabel || t('blocks.pd.v8Buy')
  const secondaryHref = hero.secondaryHref || `/compare?ids=${detail.id}`
  const secondaryLabel = hero.secondaryLabel || t('blocks.pd.v8Compare')

  const can3d = Boolean(detail.model3d && detail.model3dEnabled)
  const hasVideo = Boolean(detail.videoUrl)
  // 相册为空时用同品类矢量占位图兜底，避免首屏只剩一个空舞台。
  const artVariant: DeviceVariant =
    detail.variant === 'mouse' || detail.variant === 'keyboard' || detail.variant === 'headset' || detail.variant === 'pad'
      ? detail.variant
      : 'monitor'
  const rating = detail.reviews?.length
    ? (detail.reviews.reduce((sum, item) => sum + item.rating, 0) / detail.reviews.length).toFixed(1)
    : ''

  const selectPhoto = (index: number) => {
    const total = photos.length
    if (!total) return
    setMode('photo')
    setPhotoIndex((index + total) % total)
  }

  // SKU：所有规格组都选中后，按 option1～3 匹配明细（缺失时兜底用 options 数组）
  const allPicked = skuGroups.length > 0 && picked.filter(Boolean).length === skuGroups.length
  const selectedSku = allPicked
    ? detail.skus?.find((item) => {
        const options = item.options?.length ? item.options : [item.option1, item.option2, item.option3]
        return picked.every((value, index) => options[index] === value)
      })
    : undefined
  const pickSku = (index: number, value: string) =>
    setPicked((prev) => {
      const next = [...prev]
      next[index] = prev[index] === value ? '' : value
      return next
    })

  /** 区块入场类名：一旦进入过视口就保持 is-in */
  const sectionClass = (id: string) => `pdv8-section pdv8-reveal${revealed.includes(id) ? ' is-in' : ''}`

  const activePhoto = mode === 'photo' ? photos[photoIndex] : undefined
  const activeBroken = !!activePhoto && failedPhotos.includes(activePhoto)
  const markPhotoFailed = (src: string) =>
    setFailedPhotos((prev) => (prev.includes(src) ? prev : [...prev, src]))

  return (
    <div className="pdv8" style={{ '--pdv8-stack': `${stackHeight}px` } as CSSProperties}>
      <div className="pdv8-hero" id="pdv8-top">
        <div className="pdv8-gallery">
          <div className="pdv8-thumbs" role="group" aria-label={detail.name}>
            {photos.map((src, index) => (
              <button
                key={`${src}-${index}`}
                type="button"
                className={`pdv8-thumb${mode === 'photo' && photoIndex === index ? ' is-on' : ''}`}
                onClick={() => selectPhoto(index)}
                aria-label={`${t('blocks.pd.view', { n: index + 1 })}`}
              >
                {failedPhotos.includes(src) ? (
                  <span className="pdv8-thumb__ph" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <path d="m3 16 5-5 4 4 3-3 6 6" />
                      <circle cx="9" cy="9" r="1.4" />
                    </svg>
                  </span>
                ) : (
                  <img src={src} alt="" loading="lazy" onError={() => markPhotoFailed(src)} />
                )}
              </button>
            ))}
            {/* 视频 / 3D 与图集共用同一条缩略图轨道，不再另起一排文字标签 */}
            <button
              type="button"
              className={`pdv8-thumb pdv8-thumb--media${mode === 'video' ? ' is-on' : ''}${
                hasVideo ? '' : ' is-missing'
              }`}
              onClick={() => setMode('video')}
              aria-label={t('blocks.pd.v8TabVideo')}
              title={hasVideo ? undefined : t('blocks.pd.v8VideoSoon')}
            >
              {detail.videoPoster ? (
                <>
                  <img src={detail.videoPoster} alt="" />
                  <i className="pdv8-thumb__badge">
                    <MediaBadge kind="video" />
                  </i>
                </>
              ) : (
                <span className="pdv8-thumb__ph">
                  <MediaGlyph kind="video" />
                </span>
              )}
            </button>
            <button
              type="button"
              className={`pdv8-thumb pdv8-thumb--media${mode === 'model' ? ' is-on' : ''}${
                can3d ? '' : ' is-missing'
              }`}
              onClick={() => setMode('model')}
              aria-label="3D"
              title={can3d ? t('blocks.pd.v8DragHint') : t('blocks.pd.v8ModelSoon')}
            >
              <span className="pdv8-thumb__ph">
                <MediaGlyph kind="model" />
              </span>
            </button>
          </div>

          <div className={`pdv8-stage is-${mode}`}>
            {mode === 'photo' && activePhoto && !activeBroken && (
              <img
                className="pdv8-stage__img"
                src={activePhoto}
                alt={detail.name}
                onError={() => markPhotoFailed(activePhoto)}
              />
            )}
            {mode === 'photo' && (!activePhoto || activeBroken) && (
              <div className="pdv8-stage__art" role="img" aria-label={detail.name}>
                <DeviceArt variant={artVariant} label={detail.name} />
              </div>
            )}
            {mode === 'video' && detail.videoUrl && (
              <video
                className="pdv8-stage__video"
                src={detail.videoUrl}
                poster={detail.videoPoster}
                controls
                playsInline
                preload="metadata"
              />
            )}
            {mode === 'video' && !hasVideo && (
              <div className="pdv8-stage__ghost">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1">
                  <rect x="3" y="5" width="14" height="14" rx="2" />
                  <path d="m17 10 4-2v8l-4-2z" />
                </svg>
                <span>{t('blocks.pd.v8VideoSoon')}</span>
              </div>
            )}
            {/* 与缩略图的灰态一致：未启用的 3D 不加载模型，只显示准备中 */}
            {mode === 'model' && can3d && detail.model3d && (
              <div className="pdv8-stage__model">
                <ProductModel3D src={detail.model3d} label={detail.name} />
              </div>
            )}
            {mode === 'model' && !can3d && (
              <div className="pdv8-stage__ghost">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1">
                  <path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9L12 3Z" />
                  <path d="m3.5 7.5 8.5 4.5 8.5-4.5M12 12v9" />
                </svg>
                <span>{t('blocks.pd.v8ModelSoon')}</span>
              </div>
            )}
            {mode === 'photo' && photos.length > 1 && (
              <>
                <button
                  type="button"
                  className="pdv8-arrow is-prev"
                  onClick={() => selectPhoto(photoIndex - 1)}
                  aria-label="Previous"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="pdv8-arrow is-next"
                  onClick={() => selectPhoto(photoIndex + 1)}
                  aria-label="Next"
                >
                  ›
                </button>
              </>
            )}
            {(mode !== 'photo' || photos.length > 0) && (
              <span className="pdv8-counter">
                {mode === 'photo'
                  ? `${photoIndex + 1} / ${photos.length}`
                  : mode === 'video'
                    ? t('blocks.pd.v8TabVideo')
                    : '3D'}
              </span>
            )}
          </div>
        </div>

        <aside className="pdv8-rail">
          <div className="pdv8-group">
            <div className="pdv8-meta">
              <span className="pdv8-model">{detail.model}</span>
              <span className={`pdv8-stock is-${detail.status.level}`}>
                <i aria-hidden="true" />
                {detail.status.text}
              </span>
            </div>
            <h1 className="pdv8-title">{detail.name}</h1>
            {detail.features?.[0] && <p className="pdv8-lede">{detail.features[0]}</p>}
          </div>

          {chips.length > 0 && (
            <div className="pdv8-group">
              <ul className="pdv8-benefits">
                {chips.map((chip) => (
                  <li key={chip}>
                    <CheckIcon />
                    <span>{chip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hero.showPrice !== false && (
            <div className="pdv8-price">
              <span className="pdv8-price__label">{t('blocks.pd.refPrice')}</span>
              <div className="pdv8-price__row">
                <strong>{priceText}</strong>
                <span>起</span>
              </div>
              <span className="pdv8-price__note">{t('blocks.pd.v8PriceNote')}</span>
            </div>
          )}

          {skuGroups.length > 0 && (
            <div className="pdv8-sku">
              {skuGroups.map((group, index) => (
                <div className="pdv8-sku__row" key={group.name}>
                  <span className="pdv8-sku__label">{group.name}</span>
                  <div className="pdv8-sku__opts">
                    {group.values.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`pdv8-sku__opt${picked[index] === value ? ' is-on' : ''}`}
                        aria-pressed={picked[index] === value}
                        onClick={() => pickSku(index, value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <span className="pdv8-sku__hint">
                {allPicked
                  ? selectedSku?.stock !== undefined && selectedSku.stock !== ''
                    ? t('blocks.pd.v8SkuStock', { n: selectedSku.stock })
                    : t('blocks.pd.v8SkuSelected', { value: picked.filter(Boolean).join(' / ') })
                  : t('blocks.pd.v8SkuPick')}
              </span>
            </div>
          )}

          <div className="pdv8-group">
            <ul className="pdv8-promise">
              <li>
                <ServiceIcon name="warranty" />
                <span>{warrantyText}</span>
              </li>
              <li>
                <ServiceIcon name="nationwide" />
                <span>{t('blocks.pd.v8Nationwide')}</span>
              </li>
              <li>
                <ServiceIcon name="return" />
                <span>{t('blocks.pd.v8Return')}</span>
              </li>
            </ul>

            <div className="pdv8-cta">
              {isExternal(buyHref) ? (
                <a className="pdv8-btn is-primary" href={buyHref} target="_blank" rel="noreferrer">
                  {buyLabel}
                </a>
              ) : (
                <Link className="pdv8-btn is-primary" to={buyHref}>
                  {buyLabel}
                </Link>
              )}
              <Link className="pdv8-btn is-ghost" to={secondaryHref}>
                {secondaryLabel}
              </Link>
            </div>
          </div>
        </aside>
      </div>

      <nav
        ref={navRef}
        className={`pdv8-subnav${navStuck ? ' is-stuck' : ''}`}
        aria-label={t('blocks.pd.tocLabel')}
        style={{ top: stackHeight || undefined }}
      >
        <div className="pdv8-subnav__inner">
          <div className="pdv8-subnav__links">
            <a href="#pdv8-top" className={activeNav === 'pdv8-top' ? 'is-on' : undefined}>
              {t('blocks.pd.overview')}
            </a>
            {navItems.map((item) => (
              <a key={item.id} href={`#${item.id}`} className={activeNav === item.id ? 'is-on' : undefined}>
                {item.label}
              </a>
            ))}
          </div>
          <div className="pdv8-subnav__buy">
            <strong>{priceText}</strong>
            {isExternal(buyHref) ? (
              <a className="pdv8-btn is-primary is-sm" href={buyHref} target="_blank" rel="noreferrer">
                {buyLabel}
              </a>
            ) : (
              <Link className="pdv8-btn is-primary is-sm" to={buyHref}>
                {buyLabel}
              </Link>
            )}
          </div>
        </div>
      </nav>

      {highlightCards.length > 0 && (
        <section className={sectionClass('pdv8-highlights')} id="pdv8-highlights">
          <div>
            <header className="pdv8-section__head">
              <h2>{t('blocks.pd.highlights')}</h2>
            </header>
            <div className="pdv8-hl">
              {highlightCards.map((card, index) => {
                const body = (
                  <>
                    <span className="pdv8-hl__icon" aria-hidden="true">
                      <HighlightIcon index={index} />
                    </span>
                    <span className="pdv8-hl__body">
                      <h3>{card.title}</h3>
                      {card.desc && <p>{card.desc}</p>}
                    </span>
                  </>
                )
                const key = `${card.title}-${index}`
                // 规格区块不存在时不包链接，避免指向空锚点
                return specItems.length > 0 ? (
                  <a className="pdv8-hl__item" href="#pdv8-specs" key={key}>
                    {body}
                  </a>
                ) : (
                  <div className="pdv8-hl__item" key={key}>
                    {body}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {specItems.length > 0 && (
        <section className={sectionClass('pdv8-specs')} id="pdv8-specs">
          <div>
            <header className="pdv8-section__head">
              <h2>{t('blocks.pd.v8Specs')}</h2>
            </header>

            {/* 性能不再单独成模块：关键指标用四等分单元，与完整规格同源 */}
            {keyStats.length > 0 && (
              <div className="pdv8-kpis">
                {keyStats.map((item) => (
                  <div className="pdv8-kpi" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            )}

            {/* 规格平铺为三列等宽单元，不做分组标题与切换 */}
            <div className="pdv8-specgrid">
              {specItems.map((item) => (
                <div className="pdv8-specitem" key={`${item.label}-${item.value}`}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {packItems.length > 0 && (
        <section className={sectionClass('pdv8-package')} id="pdv8-package">
          <div>
            <header className="pdv8-section__head">
              <h2>{t('blocks.pd.v8PackTitle')}</h2>
            </header>
            <ul className="pdv8-pack">
              {packItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {compareRows.length > 0 && compareItems.length > 0 && (
        <section className={sectionClass('pdv8-compare')} id="pdv8-compare">
          <div>
            <header className="pdv8-section__head">
              <h2>{t('blocks.pd.v8CompareTitle')}</h2>
            </header>
            <div className="pdv8-compare__scroll" role="region" aria-label={t('blocks.pd.v8CompareTitle')} tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    <th scope="col" />
                    <th scope="col" className="is-current">
                      {detail.model}
                    </th>
                    {compareItems.map((item) => (
                      <th key={item.id} scope="col">
                        {item.model}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      <td className="is-current">{row.current}</td>
                      {row.others.map((value, index) => (
                        <td key={`${row.label}-${index}`}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className={sectionClass('pdv8-service')} id="pdv8-service">
        <div>
          <header className="pdv8-section__head">
            <h2>{t('blocks.pd.v8Service')}</h2>
          </header>
          <div className="pdv8-service">
            {[
              { key: 'warranty', title: warrantyText, desc: t('blocks.pd.point1') },
              { key: 'nationwide', title: t('blocks.pd.v8Nationwide'), desc: t('blocks.pd.v8NationwideDesc') },
              { key: 'return', title: t('blocks.pd.v8Return'), desc: t('blocks.pd.point2') },
              { key: 'shipping', title: t('blocks.pd.v8Shipping'), desc: t('blocks.pd.v8ShippingDesc') },
            ].map((item) => (
              <div key={item.key} className="pdv8-service__item">
                <span className="pdv8-service__icon" aria-hidden="true">
                  <ServiceIcon name={item.key} />
                </span>
                <strong>{item.title}</strong>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {detail.reviews?.length ? (
        <section className={sectionClass('pdv8-reviews')} id="pdv8-reviews">
          <div>
            <header className="pdv8-section__head">
              <h2>{t('blocks.pd.v8Reviews')}</h2>
            </header>
            <div className="pdv8-reviews">
              <div className="pdv8-reviews__score">
                <strong>{rating}</strong>
                <span>{t('blocks.pd.v8AvgRating')}</span>
                <em>{detail.reviews.length}</em>
              </div>
              <div className="pdv8-reviews__list">
                {detail.reviews.slice(0, 3).map((item) => (
                  <blockquote key={item.id}>
                    <p>{item.content}</p>
                    <footer>
                      {item.nickname}
                      {item.purchasedModel ? ` · ${item.purchasedModel}` : ''}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {typeof document !== 'undefined'
        ? createPortal(
            <div className={`pdv8 pdv8-buybar${showBuyBar ? ' is-on' : ''}`}>
              <div className="pdv8-buybar__price">
                <strong>{priceText}</strong>
                <span>{detail.model}</span>
              </div>
              <div className="pdv8-buybar__actions">
                <Link className="pdv8-btn is-ghost is-sm" to={`/compare?ids=${detail.id}`}>
                  {t('blocks.pd.v8Compare')}
                </Link>
                {isExternal(buyHref) ? (
                  <a className="pdv8-btn is-primary is-sm" href={buyHref} target="_blank" rel="noreferrer">
                    {buyLabel}
                  </a>
                ) : (
                  <Link className="pdv8-btn is-primary is-sm" to={buyHref}>
                    {buyLabel}
                  </Link>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
