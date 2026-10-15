/**
 * 海报共用渲染层（§1.2 首屏海报 / §1.3 五张全屏海报）。
 * ============================================================
 * hero（全宽海报）与 carousel 的单张 slide **共用同一套字段**，因此这里也把
 * 「字段归一化 + 文案浮层 + 背景媒体」抽成一份，两个区块组件复用，避免两套实现漂移。
 *
 * 关键约定：
 * - 文案位置：`contentPosition` 为 `{ x, y }` 百分比坐标 0–100（九宫格只是快捷写入 9 组预设值），
 *   缺省时退回既有 `.blk-hero__grid` 版心布局（不改变历史海报观感）；
 * - 眉题 / 卖点开关：值为缺省（历史数据未写入）时按「有内容即显示」兜底，写入后严格按开关；
 * - 卖点按**一行小字**展示（` · ` 连接），不再三块并列；
 * - 视频海报统一带 `poster` 首帧图 + `preload="metadata"`。
 */
import type { CSSProperties } from 'react'
import { SafeLink } from '../components/ui/SafeLink'
import { MediaImg } from '../components/ui/MediaImg'
import type { BlockLink, StatItem } from './types'
import { asBool, asLink, asNumber, asRecord, asStatItems, asString, asTextLines } from './blockUtils'

export type PosterMediaType = 'image' | 'video' | 'gif' | 'code'
export type PosterPosition = { x: number; y: number }

export type PosterData = {
  eyebrow: string
  /** 眉题开关；undefined = 历史数据（按「有内容即显示」兜底） */
  eyebrowEnabled: boolean | undefined
  title: string[]
  subtitle: string
  /** 媒体（优先）；缺省回退 image */
  media: string
  mediaType: PosterMediaType
  image: string
  imageMobile: string
  poster: string
  mediaTag: string
  primary: BlockLink | null
  secondary: BlockLink | null
  stats: StatItem[]
  statsEnabled: boolean | undefined
  /** 文案位置（百分比坐标 0–100）；null = 未配置，走既有版心布局 */
  position: PosterPosition | null
  height: 'full' | 'short' | 'custom'
  heightValue: number
  /** '' = 未配置（跟随既有实现：carousel 跟随站点主题、hero 保持暗色） */
  theme: '' | 'dark' | 'light'
}

/** 把内容库的原始 props 收敛为海报数据（字段缺失 / 类型不符一律回退，渲染期不抛错） */
export function toPoster(value: unknown): PosterData {
  const record = asRecord(value)
  const rawType = asString(record.mediaType, 'image')
  const mediaType: PosterMediaType =
    rawType === 'video' || rawType === 'gif' || rawType === 'code' ? rawType : 'image'
  const rawPosition = asRecord(record.contentPosition)
  const position =
    typeof rawPosition.x === 'number' && typeof rawPosition.y === 'number'
      ? { x: clampPercent(rawPosition.x), y: clampPercent(rawPosition.y) }
      : null
  const rawTheme = asString(record.theme)
  const height = asString(record.height)
  return {
    eyebrow: asString(record.eyebrow),
    eyebrowEnabled: record.eyebrowEnabled === undefined ? undefined : asBool(record.eyebrowEnabled),
    title: asTextLines(record.title),
    // 「一句话」：subtitle 优先，兼容历史字段 desc
    subtitle: asString(record.subtitle) || asString(record.desc),
    media: asString(record.media),
    mediaType,
    image: asString(record.image),
    imageMobile: asString(record.imageMobile),
    poster: asString(record.poster),
    mediaTag: asString(record.mediaTag),
    primary: asLink(record.primary),
    secondary: asLink(record.secondary),
    stats: asStatItems(record.stats),
    statsEnabled: record.statsEnabled === undefined ? undefined : asBool(record.statsEnabled),
    position,
    height: height === 'short' || height === 'custom' ? height : 'full',
    heightValue: Math.max(160, asNumber(record.heightValue, 640)),
    theme: rawTheme === 'dark' || rawTheme === 'light' ? rawTheme : '',
  }
}

/** 百分比收敛到 0–100（防止后台写入越界值导致文案溢出容器） */
function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 50
  return Math.min(100, Math.max(0, value))
}

/** 媒体地址（媒体优先，回退旧字段 image） */
export function posterMediaSrc(data: PosterData): string {
  return data.media || data.image
}

/** 高度档位 → 外壳类名（首屏轮播固定满屏；全宽海报按档位） */
export function posterHeightClass(height: PosterData['height']): string {
  if (height === 'short') return 'blk-hero--h-short'
  if (height === 'custom') return 'blk-hero--h-custom'
  return 'blk-hero--h-full'
}

/** 自定义高度 → 内联 min-height（其余档位由类名控制） */
export function posterHeightStyle(data: PosterData): CSSProperties | undefined {
  return data.height === 'custom' ? { minHeight: `${data.heightValue}px` } : undefined
}

/** 是否渲染眉题 / 卖点：显式开关优先，缺省按「有内容即显示」兜底 */
export function posterShowEyebrow(data: PosterData): boolean {
  return data.eyebrowEnabled === undefined ? Boolean(data.eyebrow) : data.eyebrowEnabled && Boolean(data.eyebrow)
}
export function posterShowStats(data: PosterData): boolean {
  return data.statsEnabled === undefined ? data.stats.length > 0 : data.statsEnabled && data.stats.length > 0
}

/** 卖点一行小字文案：按 ` · ` 连接（value 一般已含单位） */
export function posterPointsText(data: PosterData): string {
  return data.stats
    .map((stat) => stat.value || stat.label)
    .filter(Boolean)
    .join(' · ')
}

/** 背景媒体（图片 / 视频 / GIF / 手机竖版图） */
export function PosterMedia({ data, src, eager }: { data: PosterData; src: string; eager?: boolean }) {
  if (!src) return null
  if (data.mediaType === 'video') {
    return (
      <video
        src={src}
        poster={data.poster || data.image || undefined}
        preload="metadata"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
    )
  }
  if (data.imageMobile) {
    // 手机竖版海报：<900px 用竖版，其余用横版
    return (
      <picture>
        <source media="(max-width: 900px)" srcSet={data.imageMobile} />
        <MediaImg src={src} alt={data.mediaTag} loading={eager ? 'eager' : 'lazy'} />
      </picture>
    )
  }
  return <MediaImg src={src} alt={data.mediaTag} loading={eager ? 'eager' : 'lazy'} />
}

/**
 * 文案浮层：按 contentPosition 绝对定位（百分比），未配置时走既有版心布局。
 * 定位用 `translate(-x%, -y%)` 让坐标点与文案框自身按比例对齐，避免越界。
 */
export function PosterOverlay({ data, titleTag = 'h2' }: { data: PosterData; titleTag?: 'h1' | 'h2' }) {
  const TitleTag = titleTag
  const showEyebrow = posterShowEyebrow(data)
  const showStats = posterShowStats(data)
  const points = posterPointsText(data)
  const inner = (
    <>
      {showEyebrow && <div className="hero__eyebrow">{data.eyebrow}</div>}
      {data.title.length > 0 && (
        <TitleTag className="hero__title">
          {data.title.map((line, index) => (
            <span key={`${line}-${index}`}>
              {line}
              {index < data.title.length - 1 && <br />}
            </span>
          ))}
        </TitleTag>
      )}
      {data.subtitle && <p className="hero__desc">{data.subtitle}</p>}
      {(data.primary || data.secondary) && (
        <div className="hero__cta">
          {data.primary && (
            <SafeLink className="btn btn--primary btn--lg" to={data.primary.href}>
              {data.primary.label}
            </SafeLink>
          )}
          {data.secondary && (
            <SafeLink className="btn btn--secondary btn--lg" to={data.secondary.href}>
              {data.secondary.label}
            </SafeLink>
          )}
        </div>
      )}
      {showStats && points && <p className="hero__points">{points}</p>}
    </>
  )

  if (data.position) {
    const { x, y } = data.position
    return (
      <div className="blk-hero__grid blk-hero__grid--pos">
        <div
          className="hero__content hero__content--pos"
          style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-${x}%, -${y}%)` }}
        >
          {inner}
        </div>
      </div>
    )
  }

  return (
    <div className="blk-hero__grid">
      <div className="hero__content">{inner}</div>
    </div>
  )
}
