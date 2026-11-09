/**
 * 产品详情 v8：首屏决策台 + 下方叙事。
 *
 * 设计约束（已与业务确认）：
 * - 首屏只做决策：主图 / 视频 / 3D、型号、标题、核心参数、价格、购买、服务；
 * - 下方只做叙事：亮点、性能、规格与同系列对比、服务、评价、相关产品；
 * - 全页白底 + 发丝线分隔，不使用白卡外壳与投影（相关产品除外）；
 * - 所有模块数据驱动，无数据时自动隐藏；3D 无模型时保留灰色入口。
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
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

const HZ_BASE = [60, 144, 240, 320]

function findAttr(attrs: ProductAttribute[] | undefined, key: string) {
  return attrs?.find((item) => item.label.includes(key))
}

function parseHz(value: string | undefined) {
  if (!value) return 0
  const matched = value.match(/(\d{2,4})/)
  return matched ? Number(matched[1]) : 0
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
  const [mode, setMode] = useState<'photo' | 'video' | 'model'>('photo')
  const [activeGroup, setActiveGroup] = useState('')
  const [activeNav, setActiveNav] = useState('pdv8-top')
  const [related, setRelated] = useState<Product[]>([])
  const [showBuyBar, setShowBuyBar] = useState(false)
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

  const groups = useMemo(() => {
    const map = new Map<string, ProductAttribute[]>()
    for (const item of attributes) {
      const name = item.group || '其他'
      if (!map.has(name)) map.set(name, [])
      map.get(name)?.push(item)
    }
    return [...map.entries()].map(([name, items]) => ({ name, items }))
  }, [attributes])

  useEffect(() => {
    if (groups.length && !groups.some((group) => group.name === activeGroup)) {
      setActiveGroup(groups[0].name)
    }
  }, [groups, activeGroup])

  const navItems = useMemo(() => {
    if (!detail) return []
    const attrs = detail.attributes ?? []
    const items: { id: string; label: string }[] = []
    // 子导航与下方实际渲染的区块同源：没有数据的模块不出现在导航里，避免死锚点。
    if (detail.features?.length || attrs.length) items.push({ id: 'pdv8-highlights', label: t('blocks.pd.highlights') })
    if (attrs.length) {
      items.push({ id: 'pdv8-perf', label: t('blocks.pd.v8Performance') })
      items.push({ id: 'pdv8-specs', label: t('blocks.pd.v8Specs') })
    }
    items.push({ id: 'pdv8-service', label: t('blocks.pd.v8Service') })
    if (detail.reviews?.length) items.push({ id: 'pdv8-reviews', label: t('blocks.pd.v8Reviews') })
    return items
  }, [detail, t])

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
    return () => observer.disconnect()
  }, [detail])

  if (!detail) return null

  const refresh = findAttr(attributes, '刷新率')
  const refreshHz = parseHz(refresh?.value)
  const stats = (() => {
    const list: { label: string; value: string }[] = []
    for (const key of ['响应时间', '尺寸', '亮度', '对比度', '色域']) {
      const item = findAttr(attributes, key)
      if (item) list.push({ label: item.label, value: item.value })
      if (list.length === 4) break
    }
    if (!list.length) {
      for (const item of attributes.slice(0, 3)) list.push({ label: item.label, value: item.value })
    }
    return list
  })()

  const highlights = detail.features?.length
    ? detail.features.slice(0, 6)
    : attributes.slice(0, 6).map((item) => `${item.label}：${item.value}`)

  // 亮点卡片：只取前 3 条，标题/说明由后台同一条文案拆分，运营无需额外上传图片
  const highlightCards = highlights.slice(0, 3).map((text, index) => ({
    num: String(index + 1).padStart(2, '0'),
    ...splitFeature(text),
  }))

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

  return (
    <div className="pdv8" style={{ '--pdv8-stack': `${stackHeight}px` } as CSSProperties}>
      <div className="pdv8-hero" id="pdv8-top">
        <div className="pdv8-gallery">
          <div className="pdv8-thumbs" role="tablist" aria-label={detail.name}>
            {photos.map((src, index) => (
              <button
                key={`${src}-${index}`}
                type="button"
                className={`pdv8-thumb${mode === 'photo' && photoIndex === index ? ' is-on' : ''}`}
                onClick={() => selectPhoto(index)}
                aria-label={`${t('blocks.pd.view', { n: index + 1 })}`}
              >
                <img src={src} alt="" loading="lazy" />
              </button>
            ))}
          </div>

          <div className={`pdv8-stage is-${mode}`}>
            {mode === 'photo' && photos[photoIndex] && (
              <img className="pdv8-stage__img" src={photos[photoIndex]} alt={detail.name} />
            )}
            {mode === 'photo' && photos.length === 0 && (
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
            {mode === 'model' && detail.model3d && (
              <div className="pdv8-stage__model">
                <ProductModel3D src={detail.model3d} label={detail.name} />
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
                <span className="pdv8-counter">
                  {photoIndex + 1} / {photos.length}
                </span>
              </>
            )}
          </div>

          <div className="pdv8-viewtabs" role="tablist" aria-label={detail.name}>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'photo'}
              className={`pdv8-viewtab${mode === 'photo' ? ' is-on' : ''}`}
              onClick={() => setMode('photo')}
            >
              {t('blocks.pd.v8TabPhoto')}
              {photos.length > 0 ? ` ${photos.length}` : ''}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'video'}
              className={`pdv8-viewtab${mode === 'video' ? ' is-on' : ''}`}
              onClick={() => setMode('video')}
              disabled={!hasVideo}
              title={hasVideo ? undefined : t('blocks.pd.v8VideoSoon')}
            >
              {t('blocks.pd.v8TabVideo')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'model'}
              className={`pdv8-viewtab${mode === 'model' ? ' is-on' : ''}`}
              onClick={() => setMode('model')}
              disabled={!can3d}
              title={can3d ? t('blocks.pd.v8DragHint') : t('blocks.pd.v8ModelSoon')}
            >
              3D
            </button>
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

          <div className="pdv8-group">
            {chips.length > 0 && (
              <ul className="pdv8-chips">
                {chips.map((chip) => (
                  <li key={chip}>{chip}</li>
                ))}
              </ul>
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
          </div>

          <div className="pdv8-group">
            <ul className="pdv8-promise">
              <li>{warrantyText}</li>
              <li>{t('blocks.pd.v8Nationwide')}</li>
              <li>{t('blocks.pd.v8Return')}</li>
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
        className="pdv8-subnav"
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
              <span className="pdv8-section__index">02</span>
              <h2>{t('blocks.pd.highlights')}</h2>
              <a className="pdv8-section__more" href="#pdv8-specs">
                {t('blocks.pd.v8AllSpecs')} →
              </a>
            </header>
            <div className="pdv8-cards">
              {highlightCards.map((card) => (
                <article className="pdv8-card" key={`${card.num}-${card.title}`}>
                  <span className="pdv8-card__arrow" aria-hidden="true">
                    ↗
                  </span>
                  <span className="pdv8-card__num">{card.num}</span>
                  <h3>{card.title}</h3>
                  {card.desc && <p>{card.desc}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {(refreshHz > 0 || stats.length > 0) && (
        <section className={sectionClass('pdv8-perf')} id="pdv8-perf">
          <div>
            <header className="pdv8-section__head">
              <span className="pdv8-section__index">03</span>
              <h2>{t('blocks.pd.v8Performance')}</h2>
            </header>
            <div className={`pdv8-perf${refreshHz ? '' : ' is-simple'}`}>
              {refreshHz > 0 && (
                <div className="pdv8-perf__bars">
                  {[...HZ_BASE.filter((value) => value < refreshHz), refreshHz].map((value) => {
                    const max = Math.max(refreshHz, 320)
                    const isCurrent = value === refreshHz
                    return (
                      <div key={value} className={`pdv8-bar${isCurrent ? ' is-current' : ''}`}>
                        <span className="pdv8-bar__label">{value} Hz</span>
                        <span className="pdv8-bar__track">
                          <i style={{ width: `${Math.max(8, (value / max) * 100)}%` }} />
                        </span>
                        {isCurrent && <em>本机</em>}
                      </div>
                    )
                  })}
                  <p className="pdv8-perf__caption">{refresh?.label}</p>
                </div>
              )}
              <div className="pdv8-perf__stats">
                {stats.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {(groups.length > 0 || compareRows.length > 0) && (
        <section className={sectionClass('pdv8-specs')} id="pdv8-specs">
          <div>
            <header className="pdv8-section__head">
              <span className="pdv8-section__index">04</span>
              <h2>{t('blocks.pd.v8Specs')}</h2>
            </header>

          <div className="pdv8-specs">
            {groups.length > 1 && (
              <nav className="pdv8-specs__nav" aria-label={t('blocks.pd.v8Specs')}>
                {groups.map((group) => (
                  <button
                    key={group.name}
                    type="button"
                    className={activeGroup === group.name ? 'is-on' : undefined}
                    onClick={() => setActiveGroup(group.name)}
                  >
                    {group.name}
                  </button>
                ))}
              </nav>
            )}
            <div className="pdv8-specs__panel">
              {(groups.find((group) => group.name === activeGroup) || groups[0])?.items.map((item) => (
                <div key={`${item.label}-${item.value}`} className="pdv8-specs__row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          {compareRows.length > 0 && compareItems.length > 0 && (
            <div className="pdv8-compare">
              <h3>{t('blocks.pd.v8CompareTitle')}</h3>
              <div className="pdv8-compare__scroll">
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
          )}
        </div>
        </section>
      )}

      <section className={sectionClass('pdv8-service')} id="pdv8-service">
        <div>
          <header className="pdv8-section__head">
            <span className="pdv8-section__index">05</span>
            <h2>{t('blocks.pd.v8Service')}</h2>
          </header>
          <div className="pdv8-service">
            {[
              { title: warrantyText, desc: t('blocks.pd.point1') },
              { title: t('blocks.pd.v8Nationwide'), desc: t('blocks.pd.v8NationwideDesc') },
              { title: t('blocks.pd.v8Return'), desc: t('blocks.pd.point2') },
              { title: t('blocks.pd.v8Shipping'), desc: t('blocks.pd.v8ShippingDesc') },
            ].map((item) => (
              <div key={item.title} className="pdv8-service__item">
                <span className="pdv8-service__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <path d="M12 3 4.5 6v6c0 4.4 3.2 7.6 7.5 9 4.3-1.4 7.5-4.6 7.5-9V6L12 3Z" />
                  </svg>
                </span>
                <strong>{item.title}</strong>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>

          {detail.inBox?.length ? (
            <div className="pdv8-pack">
              <span>{t('blocks.pd.v8PackTitle')}</span>
              <ul>
                {detail.inBox.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {detail.reviews?.length ? (
        <section className={sectionClass('pdv8-reviews')} id="pdv8-reviews">
          <div>
            <header className="pdv8-section__head">
              <span className="pdv8-section__index">06</span>
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
