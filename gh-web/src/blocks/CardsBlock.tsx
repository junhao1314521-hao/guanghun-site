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
import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { HScroll } from '../components/home/HScroll'
import { SectionCta, SectionHead, SectionHeadFromProps } from '../components/home/SectionHead'
import { BlockIcon } from '../components/home/BlockIcon'
import { IconSearch } from '../components/ui/Icon'
import { MediaImg } from '../components/ui/MediaImg'
import { resolveMedia } from '../data/media'
import { fetchDownloads } from '../api/support-extra'
import type { DownloadItem } from '../data/support-extra'
import { useApi } from '../hooks/useApi'
import { useSitePages } from '../hooks/useSitePages'
import { asArray, asBool, asRecord, asString, gridClass } from './blockUtils'

type MediaType = 'image' | 'video' | 'gif'

type CardItem = {
  image: string
  media: string
  mediaType: MediaType
  /** 图标名（条目列表布局用；见 BlockIcon 可用名称） */
  icon: string
  tag: string
  title: string
  desc: string
  href: string
  /** 下载类型（开启 autoVersions 后按此取下载中心最新一条的版本与日期） */
  downloadType: string
  /** 下载资料 ID（精确指定，优先于 downloadType；用于给卡片补真实下载按钮） */
  downloadId: string
}

/** 下载按钮目标：external 为真实文件地址（<a download>），否则为站内下载页（<Link>） */
type DownloadTarget = { href: string; external: boolean }

function toItem(value: unknown): CardItem {
  const record = asRecord(value)
  const rawType = asString(record.mediaType, 'image')
  return {
    image: asString(record.image),
    media: asString(record.media),
    mediaType: rawType === 'video' || rawType === 'gif' ? rawType : 'image',
    icon: asString(record.icon),
    tag: asString(record.tag),
    title: asString(record.title),
    desc: asString(record.desc),
    href: asString(record.href),
    downloadType: asString(record.downloadType),
    downloadId: asString(record.downloadId),
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

/** 常规卡：序号/标签（头行）→ 标题 → 说明 → 下载按钮（可选）→ 箭头（有跳转时） */
function PlainCardBody({
  item,
  ratio,
  index,
  download,
}: {
  item: CardItem
  ratio: string
  index: number
  download: DownloadTarget | null
}) {
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
      {/* 真实下载按钮：卡片本身无链接时，按 downloadId / downloadType 指向下载中心对应资料 */}
      {download && !item.href && (
        <div style={{ marginTop: 'var(--gh-space-3)' }}>
          {download.external ? (
            <a className="btn btn--sm btn--secondary" href={download.href} download rel="noreferrer">
              下载
            </a>
          ) : (
            <Link className="btn btn--sm btn--secondary" to={download.href}>
              前往下载中心
            </Link>
          )}
        </div>
      )}
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
  download = null,
}: {
  item: CardItem
  ratio: string
  overlay: boolean
  index: number
  download?: DownloadTarget | null
}) {
  const className = overlay ? 'blk-card blk-card--overlay reveal' : 'card reveal'
  const style = overlay ? { aspectRatio: ratio } : undefined
  const body = overlay ? <OverlayCardBody item={item} /> : <PlainCardBody item={item} ratio={ratio} index={index} download={download} />
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
  const { isHrefLive } = useSitePages()
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const layout = asString(props.layout, 'grid')
  // 条目列表（固件与驱动）标题行左侧搜索栏：占位文字 / 跳转地址后台可改，留空用默认
  const searchPlaceholder = asString(props.searchPlaceholder) || '搜索型号'
  const searchHref = asString(props.searchHref) || '/search'
  /** 提交搜索：跳转到搜索结果（关键词以 ?q= 追加） */
  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = keyword.trim()
    if (!query) {
      navigate(searchHref)
      return
    }
    navigate(`${searchHref}${searchHref.includes('?') ? '&' : '?'}q=${encodeURIComponent(query)}`)
  }
  const overlay = asBool(props.overlay)
  const ratio = asString(props.ratio) || '16 / 9'
  const columns = gridClass(props.columns, 3)
  // 下线级联：卡片链接指向已停用页面时归一化为空 → 卡片退化为不可点内容（不渲染链接元素 / 箭头）
  const items = asArray(props.items)
    .map(toItem)
    .map((item) => (item.href && !isHrefLive(item.href) ? { ...item, href: '' } : item))

  // §1.5 固件驱动：开启「自动带最新版本」后，按 item.downloadType 取下载中心最新一条的版本与日期
  const autoVersions = asBool(props.autoVersions)
  // 卡片需要真实下载按钮时（downloadId / downloadType），同样取下载中心数据
  const needsDownloads = autoVersions || items.some((item) => item.downloadId || item.downloadType)
  const { data: downloads } = useApi(
    (signal) => (needsDownloads ? fetchDownloads(signal) : Promise.resolve(null)),
    [needsDownloads],
  )
  const latestByType = useMemo(() => {
    const map = new Map<string, DownloadItem>()
    for (const entry of downloads?.items ?? []) {
      const prev = map.get(entry.type)
      if (!prev || entry.date > prev.date) map.set(entry.type, entry)
    }
    return map
  }, [downloads])
  const downloadById = useMemo(() => {
    const map = new Map<string, DownloadItem>()
    for (const entry of downloads?.items ?? []) map.set(entry.id, entry)
    return map
  }, [downloads])
  /** 卡片下载按钮目标：优先精确 id，其次按类型取最新；无 fileUrl 时回退到下载详情页 */
  const resolveDownload = (item: CardItem): DownloadTarget | null => {
    const entry = item.downloadId
      ? downloadById.get(item.downloadId)
      : item.downloadType
        ? latestByType.get(item.downloadType)
        : undefined
    if (!entry) return null
    if (entry.fileUrl) return { href: entry.fileUrl, external: true }
    const detailHref = `/downloads/${entry.id}`
    // 下载详情模板页已停用时不渲染下载按钮，避免死链
    return isHrefLive(detailHref) ? { href: detailHref, external: false } : null
  }

  const head = <SectionHeadFromProps props={props} />

  // rail：横向滑动（拖拽 + 指针接近自动滑动 + 箭头）
  if (layout === 'rail') {
    return (
      <div className="blk-rail">
        {head}
        <HScroll auto>
          {items.map((item, index) => (
            <CardItemView key={`${item.title}-${index}`} item={item} ratio={ratio} overlay={overlay} index={index} download={resolveDownload(item)} />
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

  // entries：条目列表（固件与驱动）—— 单容器 + 发丝分隔的横向条目行（图标 / 标题+说明 / 箭头）
  // 标题行右侧 = 简约搜索栏（复用站点 .search / .input）+ 「前往下载中心」CTA。
  if (layout === 'entries') {
    const title = asString(props.title)
    const desc = asString(props.subtitle) || asString(props.desc)
    const entriesHead = title ? (
      <SectionHead
        title={title}
        desc={desc || undefined}
        action={
          <div className="blk-entries__tools">
            <form className="search blk-entries__search" role="search" onSubmit={onSearch}>
              <span className="search__icon" aria-hidden="true">
                <IconSearch size={16} />
              </span>
              <input
                className="input"
                type="search"
                value={keyword}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </form>
            <SectionCta label={asString(props.ctaLabel)} href={asString(props.ctaHref)} />
          </div>
        }
      />
    ) : null
    return (
      <div>
        {entriesHead}
        <div className="blk-entries">
          {items.map((item, index) => {
            // 固件驱动：把下载中心最新版本 / 日期随卡片自动带出（运营不再手写版本号）
            const latest = autoVersions && item.downloadType ? latestByType.get(item.downloadType) : undefined
            const metaText = latest ? `最新 ${latest.version} · ${latest.date}` : ''
            const inner = (
              <>
                {/* 左列：图标（有配置时）——把卡片从「纯文字」升级为「图标 + 文案」 */}
                <span className="blk-entries__lead">
                  {item.icon ? (
                    <BlockIcon name={item.icon} size={28} accent />
                  ) : (
                    item.tag && <span className="tag tag--pill">{item.tag}</span>
                  )}
                </span>
                <span className="blk-entries__text">
                  {item.title && <span className="blk-entries__title">{item.title}</span>}
                  {item.desc && <span className="blk-entries__desc">{item.desc}</span>}
                  {metaText && <span className="blk-entries__meta mono">{metaText}</span>}
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
          <CardItemView key={`${item.title}-${index}`} item={item} ratio={ratio} overlay={overlay} index={index} download={resolveDownload(item)} />
        ))}
      </div>
    </div>
  )
}
