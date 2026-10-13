/**
 * 20. showcase 通栏产品展示（契约 §4 扩展）—— 首页「重点产品」分段式。
 * props: alternate?:boolean（图文左右交替）/ items:{productId?,media,mediaType?,eyebrow?,title,desc?,specs?:string[],cta?}[]
 *
 * 视觉（要求大气）：配合 style.container:'full' 通栏，每一项占满一屏；
 * 大图 / 大视频在一侧、文案（眉题 / 标题 / 描述 / 参数条 / CTA）在另一侧，左右交替；
 * 滚动进入时渐显 + 轻微上移（.reveal），参数依次浮现并**数值滚动**；
 * 媒体 hover 缓慢推进（Ken Burns）+ 提亮 + 描边高亮；移动端降级为上下堆叠；
 * 复用现有设计令牌与双主题；prefers-reduced-motion 时不动画。
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { MediaImg } from '../components/ui/MediaImg'
import { MEDIA, resolveMedia } from '../data/media'
import { prefersReducedMotion } from '../lib/motion'
import { asArray, asBool, asLink, asRecord, asString, asStringArray } from './blockUtils'

type MediaType = 'image' | 'video' | 'gif'

type ShowcaseItem = {
  productId: string
  media: string
  mediaType: MediaType
  eyebrow: string
  title: string
  desc: string
  specs: string[]
  cta: { label: string; href: string } | null
}

function toItem(value: unknown): ShowcaseItem {
  const record = asRecord(value)
  const rawType = asString(record.mediaType, 'image')
  return {
    productId: asString(record.productId),
    media: asString(record.media),
    mediaType: rawType === 'video' || rawType === 'gif' ? rawType : 'image',
    eyebrow: asString(record.eyebrow),
    title: asString(record.title),
    desc: asString(record.desc),
    specs: asStringArray(record.specs),
    cta: asLink(record.cta),
  }
}

/** 媒体地址：解析占位；空地址时回退关联产品占位素材 */
function itemMedia(item: ShowcaseItem): string {
  const src = resolveMedia(item.media)
  if (src) return src
  if (item.productId && MEDIA.product[item.productId]) return MEDIA.product[item.productId]
  return ''
}

/** 参数拆成「数值 + 单位/标签」：`26,000 DPI` → 26,000 ｜ DPI；无前导数字则整体作数值 */
function splitSpec(spec: string): { value: string; unit: string } {
  const matched = spec.match(/^([\d][\d.,]*)\s*(.*)$/)
  return matched ? { value: matched[1], unit: matched[2] } : { value: spec, unit: '' }
}

/**
 * 参数数值：进入视口时从 0 滚到目标值（保留千分位与小数位）；
 * 首帧即渲染最终值（无 JS 时也可读）；reduced-motion 或非数字时不做动画。
 */
function SpecValue({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [text, setText] = useState(value)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    const target = Number(value.replace(/,/g, ''))
    if (!Number.isFinite(target)) return
    const decimals = (value.split('.')[1] ?? '').length
    const grouped = value.includes(',')
    let raf = 0
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        io.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / 900)
          const eased = 1 - (1 - progress) ** 3
          const current = target * eased
          const fixed = current.toFixed(decimals)
          setText(grouped ? Number(fixed).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : fixed)
          if (progress < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value])

  return (
    <span ref={ref} className="showcase__spec-value">
      {text}
    </span>
  )
}

/** 媒体层：video 用原生循环播放；image / gif 交 MediaImg */
function ShowcaseMedia({ item }: { item: ShowcaseItem }) {
  const src = itemMedia(item)
  if (!src) return <div className="showcase__media-fallback" aria-hidden="true" />
  if (item.mediaType === 'video') {
    return <video src={src} autoPlay muted loop playsInline aria-label={item.title} />
  }
  return <MediaImg src={src} alt={item.title} />
}

export function ShowcaseBlock({ props }: { props: Record<string, unknown> }) {
  const items = asArray(props.items).map(toItem)
  const alternate = asBool(props.alternate, true)
  const hasTitle = asString(props.title).length > 0

  return (
    <div className="showcase">
      {hasTitle && (
        <div className="container" style={{ paddingTop: 'var(--gh-space-9)', width: '100%' }}>
          <SectionHeadFromProps props={props} />
        </div>
      )}
      {items.map((item, index) => {
        const reverse = alternate && index % 2 === 1
        const detailHref = item.cta?.href || (item.productId ? `/products/${item.productId}` : '')
        return (
          <div className={`showcase__item${reverse ? ' showcase__item--reverse' : ''}`} key={`${item.title}-${index}`}>
            <div className="showcase__inner reveal" data-delay="0">
              <div className="showcase__media">
                <div className="showcase__media-inner">
                  <ShowcaseMedia item={item} />
                </div>
              </div>
              <div className="showcase__copy">
                {item.eyebrow && <div className="showcase__eyebrow">{item.eyebrow}</div>}
                {item.title && <h2 className="showcase__title">{item.title}</h2>}
                {item.desc && <p className="showcase__desc">{item.desc}</p>}
                {item.specs.length > 0 && (
                  <ul className="showcase__specs">
                    {item.specs.map((spec, specIndex) => {
                      const { value, unit } = splitSpec(spec)
                      return (
                        <li className="reveal" data-delay={String(Math.min(specIndex + 1, 6))} key={`${spec}-${specIndex}`}>
                          <SpecValue value={value} />
                          {unit && <span className="showcase__spec-unit">{unit}</span>}
                        </li>
                      )
                    })}
                  </ul>
                )}
                {(item.cta || detailHref) && (
                  <div className="showcase__cta">
                    {item.cta && (
                      <Link className="btn btn--primary" to={item.cta.href}>
                        {item.cta.label}
                      </Link>
                    )}
                    {detailHref && (
                      <Link className="showcase__link" to={detailHref}>
                        查看全部参数
                        <span aria-hidden="true">→</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
