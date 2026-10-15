/**
 * 20. showcase 通栏产品展示（契约 §4 扩展）—— 首页「重点产品」。
 *
 * v2.1 重构为「方案二优化版」（见需求汇总 §13）：
 * - 上层：媒体区（16:10，左对齐；无素材时由 MediaImg → CodeMedia 代码渐变兜底）；
 * - 下层：浅底信息区（左：型号 / 名称 / 价格 / 双 CTA；右：图标规格条 + 卖点列表）；
 * - 一次展示一个主推，底部「进度点 + 左右箭头」切换；
 * - 排版要求：干净、高级、整洁、大气（大留白、弱分隔线、统一字号层级）。
 *
 * props: items:{productId?,media,mediaType?,eyebrow?,model?,title,desc?,price?,specs?:string[],features?:string[],cta?}[]
 */
import { useState } from 'react'
import { SafeLink } from '../components/ui/SafeLink'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { BlockIcon } from '../components/home/BlockIcon'
import { MediaImg } from '../components/ui/MediaImg'
import { MEDIA, resolveMedia } from '../data/media'
import { trackEvent } from '../lib/track'
import { asArray, asLink, asRecord, asString, asStringArray } from './blockUtils'

type MediaType = 'image' | 'video' | 'gif'

type ShowcaseItem = {
  productId: string
  media: string
  mediaType: MediaType
  model: string
  title: string
  desc: string
  price: string
  specs: string[]
  features: string[]
  cta: { label: string; href: string } | null
}

function toItem(value: unknown): ShowcaseItem {
  const record = asRecord(value)
  const rawType = asString(record.mediaType, 'image')
  return {
    productId: asString(record.productId),
    media: asString(record.media),
    mediaType: rawType === 'video' || rawType === 'gif' ? rawType : 'image',
    model: asString(record.model) || asString(record.eyebrow),
    title: asString(record.title),
    desc: asString(record.desc),
    price: asString(record.price),
    specs: asStringArray(record.specs),
    features: asStringArray(record.features),
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

/** 规格条的图标：按顺序轮换（尺寸 / 刷新率 / 响应），保持视觉节奏 */
const SPEC_ICONS = ['monitor', 'clock', 'sliders', 'chip']

export function ShowcaseBlock({ props }: { props: Record<string, unknown> }) {
  const items = asArray(props.items).map(toItem)
  const [active, setActive] = useState(0)
  const hasTitle = asString(props.title).length > 0
  if (items.length === 0) return null
  const index = Math.min(active, items.length - 1)
  const item = items[index]
  const src = itemMedia(item)
  const detailHref = item.cta?.href || (item.productId ? `/products/${item.productId}` : '/products')

  const go = (delta: number) => setActive((prev) => (prev + delta + items.length) % items.length)

  return (
    <div className="showcase">
      {hasTitle && (
        <div className="container" style={{ paddingTop: 'var(--gh-space-9)', width: '100%' }}>
          <SectionHeadFromProps props={props} />
        </div>
      )}
      <div className="container showcase__stage">
        <article className="showcase__slide reveal" data-delay="0">
          <div className="showcase__media">
            <div className="showcase__media-inner">
              {item.mediaType === 'video' && src ? (
                <video src={src} autoPlay muted loop playsInline aria-label={item.title} />
              ) : (
                <MediaImg src={src} alt={item.title} />
              )}
            </div>
          </div>

          <div className="showcase__info">
            <div className="showcase__info-main">
              {item.model && <span className="showcase__model">{item.model}</span>}
              {item.title && <h3 className="showcase__name">{item.title}</h3>}
              {item.desc && <p className="showcase__desc">{item.desc}</p>}
              {item.price && <span className="showcase__price">{item.price}</span>}
              <div className="showcase__cta">
                {/* 主 CTA：预约到店体验（埋点 reserve）；次 CTA：把当前产品加入对比（带 ?ids=） */}
                <SafeLink
                  className="btn btn--primary"
                  to="/business/venues"
                  onClick={() => trackEvent('reserve', item.productId || 'showcase')}
                >
                  预约体验
                </SafeLink>
                <SafeLink
                  className="btn btn--secondary"
                  to={item.productId ? `/compare?ids=${encodeURIComponent(item.productId)}` : '/compare'}
                  onClick={() => trackEvent('compare', item.productId || 'showcase')}
                >
                  加入对比
                </SafeLink>
                <SafeLink className="showcase__more" to={detailHref}>
                  查看详情<span aria-hidden="true">→</span>
                </SafeLink>
              </div>
              {items.length > 1 && (
                <div className="showcase__pager">
                  <span className="showcase__pager-num">
                    {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
                  </span>
                  <span className="showcase__dots" aria-hidden="true">
                    {items.map((_, i) => (
                      <i key={i} className={i === index ? 'is-on' : ''} />
                    ))}
                  </span>
                  <button className="showcase__arrow" type="button" aria-label="上一个" onClick={() => go(-1)}>
                    ←
                  </button>
                  <button className="showcase__arrow" type="button" aria-label="下一个" onClick={() => go(1)}>
                    →
                  </button>
                </div>
              )}
            </div>

            <div className="showcase__info-side">
              {item.specs.length > 0 && (
                <div className="showcase__specs2">
                  {item.specs.slice(0, 4).map((spec, i) => (
                    <div className="showcase__spec2" key={`${spec}-${i}`}>
                      <span className="showcase__spec2-icon" aria-hidden="true">
                        <BlockIcon name={SPEC_ICONS[i % SPEC_ICONS.length]} size={14} />
                      </span>
                      <span className="showcase__spec2-value">{spec}</span>
                    </div>
                  ))}
                </div>
              )}
              {item.features.length > 0 && (
                <ul className="showcase__feats">
                  {item.features.slice(0, 3).map((feature, i) => (
                    <li key={`${feature}-${i}`}>{feature}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}
