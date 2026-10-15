/**
 * 8. cards 卡片组（契约 §4，扩展 rail / overlay / media）
 * props: title / desc / columns:2|3|4 /
 *        layout?:'grid'|'rail'（rail = 横向滑动）/
 *        overlay?:boolean（文字浮在媒体图上）/
 *        ratio?:string（媒体宽高比，如 '4 / 5'、'16 / 9'）/
 *        items:{media?,mediaType?('image'|'video'|'gif'),image?,tag?,title,desc?,href?}[]
 *
 * - rail：横向排列 + 可拖拽滑动 + 鼠标靠近左右边缘自动滑动（复用 HScroll / useHScroll）；
 * - overlay：文字浮在媒体图上，底部渐变遮罩保证可读性（双主题对比度达标）；
 * - 媒体：video 用原生 <video autoplay muted loop playsinline>；image / gif 按图片处理；
 * - 有 href 的卡片整体可点击（.card--link / 链接包裹），保留键盘可达。
 */
import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { HScroll } from '../components/home/HScroll'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { MediaImg } from '../components/ui/MediaImg'
import { resolveMedia } from '../data/media'
import { asArray, asBool, asRecord, asString, gridClass } from './blockUtils'

type MediaType = 'image' | 'video' | 'gif'

type CardItem = {
  image: string
  media: string
  mediaType: MediaType
  tag: string
  title: string
  desc: string
  href: string
}

function toItem(value: unknown): CardItem {
  const record = asRecord(value)
  const rawType = asString(record.mediaType, 'image')
  return {
    image: asString(record.image),
    media: asString(record.media),
    mediaType: rawType === 'video' || rawType === 'gif' ? rawType : 'image',
    tag: asString(record.tag),
    title: asString(record.title),
    desc: asString(record.desc),
    href: asString(record.href),
  }
}

/** 媒体地址：优先 media，回退 image，并把已知 /media/... 占位解析为内置素材 */
function mediaSrc(item: CardItem): string {
  return resolveMedia(item.media || item.image)
}

/** 悬浮在媒体上的媒体层（video 原生循环播放；image / gif 交 MediaImg） */
function OverlayMedia({ item }: { item: CardItem }) {
  const src = mediaSrc(item)
  if (!src) return null
  if (item.mediaType === 'video') {
    return <video src={src} autoPlay muted loop playsInline aria-label={item.title} />
  }
  return <MediaImg src={src} alt={item.title} />
}

/** overlay 卡：文字浮在媒体图上（底部渐变遮罩） */
function OverlayCardBody({ item }: { item: CardItem }) {
  return (
    <>
      <div className="blk-card__media">
        <OverlayMedia item={item} />
      </div>
      <div className="blk-card__scrim" />
      <div className="blk-card__body">
        {item.tag && <span className="tag tag--pill">{item.tag}</span>}
        {item.title && <h3 className="blk-card__title">{item.title}</h3>}
        {item.desc && <p className="blk-card__desc">{item.desc}</p>}
      </div>
    </>
  )
}

/** 常规卡：序号/标签（头行）→ 标题 → 说明 → 箭头（有跳转时） */
function PlainCardBody({ item, ratio, index }: { item: CardItem; ratio: string; index: number }) {
  const src = mediaSrc(item)
  return (
    <>
      {src &&
        (item.mediaType === 'video' ? (
          <div className="ph-box ph-box--media" style={{ aspectRatio: ratio, marginBottom: 'var(--gh-space-4)' }}>
            <video src={src} autoPlay muted loop playsInline aria-label={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        ) : (
          <div className="ph-box ph-box--media" style={{ aspectRatio: ratio, marginBottom: 'var(--gh-space-4)' }}>
            <MediaImg src={src} alt={item.title} />
          </div>
        ))}
      {/* 头行：序号（等宽微字）+ 状态标签，给卡片一个明确的阅读起点 */}
      <div className="blk-icard__head">
        <span className="blk-icard__index" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        {item.tag && <span className="tag tag--pill">{item.tag}</span>}
      </div>
      {item.title && <h3 className="card__title">{item.title}</h3>}
      {item.desc && <p className="card__desc">{item.desc}</p>}
      {item.href && (
        <span className="blk-icard__go" aria-hidden="true">
          →
        </span>
      )}
    </>
  )
}

/** 单张卡：overlay 用 .blk-card（媒体背景 + 悬浮文案），常规用 .card */
function CardItemView({
  item,
  ratio,
  overlay,
  index,
}: {
  item: CardItem
  ratio: string
  overlay: boolean
  index: number
}) {
  const className = overlay ? 'blk-card blk-card--overlay reveal' : 'card reveal'
  const style = overlay ? { aspectRatio: ratio } : undefined
  const body = overlay ? <OverlayCardBody item={item} /> : <PlainCardBody item={item} ratio={ratio} index={index} />
  const key = `${item.title}-${index}`
  const delay = (index % 3) + 1
  return item.href ? (
    <Link className={`${className}${overlay ? '' : ' card--link'}`} to={item.href} key={key} style={style} data-delay={delay} data-rail-card="">
      {body}
    </Link>
  ) : (
    <div className={className} key={key} style={style} data-delay={delay} data-rail-card="">
      {body}
    </div>
  )
}

/** spotlight 主卡（大卡）：突出首个入口 */
function SpotlightMain({ item }: { item: CardItem }) {
  const body = (
    <>
      {item.tag && <span className="tag tag--pill">{item.tag}</span>}
      {item.title && <h3 className="blk-spotlight__main-title">{item.title}</h3>}
      {item.desc && <p className="blk-spotlight__main-desc">{item.desc}</p>}
      <span className="btn btn--primary btn--sm is-magnetic" style={{ alignSelf: 'flex-start', marginTop: 'var(--gh-space-2)' }}>
        立即了解 →
      </span>
    </>
  )
  return item.href ? (
    <Link className="blk-spotlight__main reveal" to={item.href}>
      {body}
    </Link>
  ) : (
    <div className="blk-spotlight__main reveal">{body}</div>
  )
}

/** spotlight 次卡（行）：编号 + 标题 + 说明 + 箭头 */
function SpotlightRow({ item, index }: { item: CardItem; index: number }) {
  const body = (
    <>
      <span className="blk-spotlight__badge">{String(index + 1).padStart(2, '0')}</span>
      <span>
        {item.title && (
          <span className="blk-spotlight__row-title" style={{ display: 'block' }}>
            {item.title}
          </span>
        )}
        {item.desc && <span className="blk-spotlight__row-desc">{item.desc}</span>}
      </span>
      <span className="blk-spotlight__go" aria-hidden="true">
        →
      </span>
    </>
  )
  const delay = String(Math.min(index + 2, 6))
  return item.href ? (
    <Link className="blk-spotlight__row reveal" to={item.href} data-delay={delay}>
      {body}
    </Link>
  ) : (
    <div className="blk-spotlight__row reveal" data-delay={delay}>
      {body}
    </div>
  )
}

export function CardsBlock({ props }: { props: Record<string, unknown> }) {
  const layout = asString(props.layout, 'grid')
  const overlay = asBool(props.overlay)
  const ratio = asString(props.ratio) || '16 / 9'
  const columns = gridClass(props.columns, 3)
  const items = asArray(props.items).map(toItem)

  const head = <SectionHeadFromProps props={props} />

  // rail：横向滑动（拖拽 + 指针接近自动滑动 + 箭头）
  if (layout === 'rail') {
    return (
      <div className="blk-rail">
        {head}
        <HScroll auto>
          {items.map((item, index) => (
            <CardItemView key={`${item.title}-${index}`} item={item} ratio={ratio} overlay={overlay} index={index} />
          ))}
        </HScroll>
      </div>
    )
  }

  // trust：信任条（实测徽标 / 服务承诺 的等分横排，首屏下方使用）
  if (layout === 'trust') {
    return (
      <div className="blk-trust">
        {head}
        <div className="blk-trust__row" style={{ '--trust-cols': items.length } as CSSProperties}>
          {items.map((item, index) => (
            <div className="blk-trust__item reveal" key={`${item.title}-${index}`} data-delay={(index % 4) + 1}>
              <span className="blk-trust__mark" aria-hidden="true">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8.4 6.4 11.8 13 4.6" />
                </svg>
              </span>
              <span className="blk-trust__text">
                {item.tag && <span className="blk-trust__tag">{item.tag}</span>}
                <span className="blk-trust__title">{item.title}</span>
                {item.desc && <span className="blk-trust__desc">{item.desc}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // steps：编号步骤（选购指南）—— 顶部横线 + 大编号 + 文案，无卡片框，与网格卡明确区分
  if (layout === 'steps') {
    return (
      <div>
        {head}
        <ol className="blk-steps">
          {items.map((item, index) => {
            const inner = (
              <>
                <span className="blk-steps__num" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {item.tag && <span className="blk-steps__eyebrow">{item.tag}</span>}
                {item.title && <h3 className="blk-steps__title">{item.title}</h3>}
                {item.desc && <p className="blk-steps__desc">{item.desc}</p>}
              </>
            )
            return (
              <li className="blk-steps__item reveal" key={`${item.title}-${index}`} data-delay={index + 1}>
                {item.href ? (
                  <Link className="blk-steps__link" to={item.href}>
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            )
          })}
        </ol>
      </div>
    )
  }

  // entries：条目列表（固件与驱动）—— 单容器 + 发丝分隔的横向条目行（标签 / 标题+说明 / 箭头）
  if (layout === 'entries') {
    return (
      <div>
        {head}
        <div className="blk-entries">
          {items.map((item, index) => {
            const inner = (
              <>
                <span className="blk-entries__lead">
                  {item.tag && <span className="tag tag--pill">{item.tag}</span>}
                </span>
                <span className="blk-entries__text">
                  {item.title && <span className="blk-entries__title">{item.title}</span>}
                  {item.desc && <span className="blk-entries__desc">{item.desc}</span>}
                </span>
                <span className="blk-entries__go" aria-hidden="true">
                  →
                </span>
              </>
            )
            return item.href ? (
              <Link className="blk-entries__row reveal" to={item.href} key={`${item.title}-${index}`} data-delay={index + 1}>
                {inner}
              </Link>
            ) : (
              <div className="blk-entries__row reveal" key={`${item.title}-${index}`} data-delay={index + 1}>
                {inner}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // spotlight：1 主 + 若干次（首页「服务入口」）
  if (layout === 'spotlight' && items.length > 0) {
    const [main, ...rest] = items
    return (
      <div>
        {head}
        <div className="blk-spotlight">
          <SpotlightMain item={main} />
          <div className="blk-spotlight__side">
            {rest.map((item, index) => (
              <SpotlightRow key={`${item.title}-${index}`} item={item} index={index} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {head}
      <div className={columns}>
        {items.map((item, index) => (
          <CardItemView key={`${item.title}-${index}`} item={item} ratio={ratio} overlay={overlay} index={index} />
        ))}
      </div>
    </div>
  )
}
