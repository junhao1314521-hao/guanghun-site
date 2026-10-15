/**
 * 2. carousel 轮播（契约 §4）
 * props: slides:{eyebrow,title:string[],desc,mediaTag,media?,mediaType?,image?,imageMobile?,primary,secondary?,stats}[]
 *        autoplay:boolean
 *        motion:boolean（「代码动画」作为第 1 张；关闭后仅展示配置的海报）
 *
 * 复用 blocks.css 的 .blk-hero* 外壳（结构与首页首屏一致）：自动播放 + 箭头 + 指示器 +
 * 左右方向键；悬停暂停；尊重「减少动态效果」偏好。
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconChevronLeft, IconChevronRight } from '../components/ui/Icon'
import { prefersReducedMotion } from '../lib/motion'
import { useTheme } from '../lib/useTheme'
import { CodeBackdrop } from '../components/site/CodeBackdrop'
import { MediaImg } from '../components/ui/MediaImg'
import { asArray, asBool, asLink, asRecord, asStatItems, asString, asTextLines } from './blockUtils'

const DURATION = 6000

type Slide = {
  eyebrow: string
  title: string[]
  desc: string
  mediaTag: string
  /** 媒体地址（优先使用；可以是图片 / 视频 / GIF） */
  media: string
  mediaType: 'image' | 'video' | 'gif'
  /** 旧字段：未填 media 时使用 */
  image: string
  /** 手机竖版海报（<900px 使用；缺省回退横版） */
  imageMobile: string
  primary: ReturnType<typeof asLink>
  secondary: ReturnType<typeof asLink>
  stats: ReturnType<typeof asStatItems>
}

function toSlide(value: unknown): Slide {
  const record = asRecord(value)
  const rawType = asString(record.mediaType, 'image')
  return {
    eyebrow: asString(record.eyebrow),
    title: asTextLines(record.title),
    desc: asString(record.desc),
    mediaTag: asString(record.mediaTag),
    media: asString(record.media),
    mediaType: rawType === 'video' || rawType === 'gif' ? rawType : 'image',
    image: asString(record.image),
    imageMobile: asString(record.imageMobile),
    primary: asLink(record.primary),
    secondary: asLink(record.secondary),
    stats: asStatItems(record.stats),
  }
}

/**
 * 可渲染媒体判定：非空、非 `#`，且不是内置占位 SVG。
 * 注意：`/media/**` 下的**真实素材**（如 `/media/home/s1.jpg`）必须渲染 ——
 * 此前一律按「占位」跳过，导致图片海报永远不显示（透出的始终是代码动画）。
 * 只有以 `.svg` 结尾的占位地址才视为「无素材」，此时透出代码动画。
 */
function isRenderableMedia(src: string, mediaType: Slide['mediaType']): boolean {
  if (!src) return false
  const value = src.trim()
  if (!value || value === '#') return false
  if (mediaType === 'video' || mediaType === 'gif') return true
  if (/\.svg(\?|#|$)/i.test(value)) return false
  return true
}

/** 「代码动画」作为第 1 张时的默认文案（未配置任何幻灯片时使用） */
const MOTION_FALLBACK: Slide = {
  eyebrow: 'SUPER DISPLAY',
  title: ['为极致而生'],
  desc: 'OLED 电竞显示器，以实测数据定义性能。',
  mediaTag: '代码动画',
  media: '',
  mediaType: 'image',
  image: '',
  imageMobile: '',
  primary: asLink({ label: '浏览全部产品', href: '/products' }),
  secondary: asLink({ label: '查看天梯榜', href: '/ladder' }),
  stats: asStatItems([]),
}

export function CarouselBlock({ props }: { props: Record<string, unknown> }) {
  const slides = asArray(props.slides).map(toSlide)
  const autoplay = asBool(props.autoplay, true)
  // 代码动画作为「第 1 张」（默认开启）：它不铺媒体、只出动画；其余幻灯片照常渲染。
  // 关闭后不再插入动画张，仅展示配置的海报；一张都没配时则只剩这张动画。
  const motion = asBool(props.motion, true)
  const deck: Slide[] = motion
    ? [
        { ...(slides[0] ?? MOTION_FALLBACK), media: '', image: '', imageMobile: '', mediaType: 'image' },
        ...slides.slice(1),
      ]
    : slides
  // 动画张的下标（-1 表示没有）——它之后的每一张才铺各自媒体
  const motionIndex = motion ? 0 : -1
  // 海报皮肤跟随站点主题：浅色主题用浅色代码动画与深色文案，深色主题保持原有科技暗场
  const theme = useTheme()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const total = deck.length
  const go = (next: number) => setIndex(((next % total) + total) % total)

  useEffect(() => {
    if (!autoplay || paused || total <= 1 || prefersReducedMotion()) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % total), DURATION)
    return () => window.clearInterval(timer)
  }, [autoplay, paused, total])

  if (total === 0) return null

  return (
    <div
      className={`blk-hero${theme === 'light' ? ' blk-hero--light' : ''}${paused ? ' is-paused' : ''}`}
      tabIndex={0}
      role="group"
      aria-label="首屏轮播，可用左右方向键切换"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') go(index + 1)
        if (event.key === 'ArrowLeft') go(index - 1)
      }}
    >
      {/* 首屏共享的「流动方块」代码动效：单一画布，避免每张幻灯片各起一个动画循环。
          第一张海报固定用它（不受媒体槽规则限制）；其余幻灯片无真实素材时同样透出它。 */}
      <CodeBackdrop className="blk-hero__anim" theme={theme} />
      <div className="blk-hero__slides">
        {deck.map((slide, i) => {
          const active = i === index
          const TitleTag = active ? 'h1' : 'h2'
          const src = slide.media || slide.image
          // 代码动画那张（motionIndex）不铺媒体；其余张有真实素材才铺（占位 SVG 透出动画）
          const renderable = i !== motionIndex && isRenderableMedia(src, slide.mediaType)
          return (
            <article
              key={`${slide.mediaTag}-${i}`}
              className={`blk-hero__slide${active ? ' is-active' : ''}`}
              aria-hidden={!active}
            >
              <div className={`blk-hero__bg${renderable ? ' has-media' : ''}`}>
                {renderable &&
                  (slide.mediaType === 'video' ? (
                    <video src={src} autoPlay muted loop playsInline aria-hidden="true" />
                  ) : slide.imageMobile ? (
                    // 手机竖版海报：<900px 用竖版，其余用横版
                    <picture>
                      <source media="(max-width: 900px)" srcSet={slide.imageMobile} />
                      <img src={src} alt="" loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
                    </picture>
                  ) : (
                    <MediaImg src={src} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
                  ))}
              </div>
              <div className="blk-hero__grid">
                <div className="hero__content">
                  <div className="hero__eyebrow">{slide.eyebrow}</div>
                  <TitleTag className="hero__title">
                    {slide.title.map((line, k) => (
                      <span key={`${line}-${k}`}>
                        {line}
                        {k < slide.title.length - 1 && <br />}
                      </span>
                    ))}
                  </TitleTag>
                  {slide.desc && <p className="hero__desc">{slide.desc}</p>}
                  {(slide.primary || slide.secondary) && (
                    <div className="hero__cta">
                      {slide.primary && (
                        <Link className="btn btn--primary btn--lg" to={slide.primary.href}>
                          {slide.primary.label}
                        </Link>
                      )}
                      {slide.secondary && (
                        <Link className="btn btn--secondary btn--lg" to={slide.secondary.href}>
                          {slide.secondary.label}
                        </Link>
                      )}
                    </div>
                  )}
                  {slide.stats.length > 0 && (
                    <div className="hero__stats">
                      {slide.stats.map((stat, k) => (
                        <div className="hero__stat" key={`${stat.label}-${k}`}>
                          <b>{stat.value}</b>
                          <span>{stat.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {total > 1 && (
        <>
          <button className="blk-hero__arrow blk-hero__arrow--prev" type="button" aria-label="上一张" onClick={() => go(index - 1)}>
            <IconChevronLeft />
          </button>
          <button className="blk-hero__arrow blk-hero__arrow--next" type="button" aria-label="下一张" onClick={() => go(index + 1)}>
            <IconChevronRight />
          </button>
          <div className="blk-hero__nav">
            <div className="blk-hero__count" aria-hidden="true">
              <b>{String(index + 1).padStart(2, '0')}</b>
              <span>/ {String(total).padStart(2, '0')}</span>
            </div>
            <div className="blk-hero__controls" role="tablist" aria-label="海报选择">
              {deck.map((slide, i) => (
                <button
                  key={`dot-${slide.mediaTag}-${i}`}
                  className={`blk-hero__dot${i === index ? ' is-active' : ''}`}
                  type="button"
                  role="tab"
                  aria-label={`第 ${i + 1} 张`}
                  aria-selected={i === index}
                  onClick={() => go(i)}
                >
                  <span className="blk-hero__dot-fill" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}