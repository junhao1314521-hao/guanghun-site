/**
 * 2. carousel 轮播（契约 §4 / 需求 §1.2 首屏海报）
 * ============================================================
 * 首屏海报保留 **3 张轮播**：第 1 张固定为「代码动画」（保留不动），其余张各铺自己的媒体。
 * 单张 slide 与 hero 全宽海报**共用同一套字段**（见 `blockCatalog.ts` 的 `POSTER_FIELDS`），
 * 渲染同样复用 `PosterSlide`（文案按 contentPosition 定位、视频带 poster + preload）。
 *
 * 控件：**只留底部圆点**（箭头与页码都不显示）；自动播放 + 悬停暂停 + 左右方向键；
 * 尊重「减少动态效果」偏好。高度固定满屏。
 */
import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../lib/motion'
import { useTheme } from '../lib/useTheme'
import { CodeBackdrop } from '../components/site/CodeBackdrop'
import { asArray, asBool } from './blockUtils'
import { PosterDownloads } from './PosterDownloads'
import {
  PosterMedia,
  PosterOverlay,
  posterMediaSrc,
  toPoster,
  type PosterData,
} from './PosterSlide'
import { heightClass, heightStyle } from './heightUtils'

const DURATION = 6000

/**
 * 可渲染媒体判定：非空、非 `#`，且不是内置占位 SVG。
 * 注意：`/media/**` 下的**真实素材**（如 `/media/home/s1.jpg`）必须渲染 ——
 * 此前一律按「占位」跳过，导致图片海报永远不显示（透出的始终是代码动画）。
 * 只有以 `.svg` 结尾的占位地址才视为「无素材」，此时透出代码动画。
 */
function isRenderableMedia(src: string, mediaType: PosterData['mediaType']): boolean {
  if (!src) return false
  const value = src.trim()
  if (!value || value === '#') return false
  if (mediaType === 'video' || mediaType === 'gif') return true
  if (mediaType === 'code') return false
  if (/\.svg(\?|#|$)/i.test(value)) return false
  return true
}

/** 「代码动画」作为第 1 张时的默认文案（未配置任何幻灯片时使用） */
const MOTION_FALLBACK: PosterData = toPoster({
  eyebrow: 'SUPER DISPLAY',
  // 首屏默认与产品口径一致：不显示眉题 / 数据点，文案居中偏上，只留一个「立即购买」按钮
  eyebrowEnabled: false,
  title: ['为极致而生'],
  subtitle: 'OLED 电竞显示器，以实测数据定义性能。',
  mediaTag: '代码动画',
  primary: { label: '立即购买', href: '/products' },
  statsEnabled: false,
  contentPosition: { x: 50, y: 32 },
})

export function CarouselBlock({ props }: { props: Record<string, unknown> }) {
  const slides = asArray(props.slides).map(toPoster)
  const autoplay = asBool(props.autoplay, true)
  // 高度档位（块级）：默认满屏；设为 r219 时整组幻灯片统一 21:9，上传图不会被裁切或拉伸
  const height = props.height
  const heightStyleValue = heightStyle(height, props.heightValue)
  // 代码动画作为「第 1 张」（默认开启）：它不铺媒体、只出动画；其余幻灯片照常渲染。
  // 关闭后不再插入动画张，仅展示配置的海报；一张都没配时则只剩这张动画。
  const motion = asBool(props.motion, true)
  const deck: PosterData[] = motion
    ? [
        { ...(slides[0] ?? MOTION_FALLBACK), media: '', image: '', imageMobile: '', mediaType: 'image' },
        ...slides.slice(1),
      ]
    : slides
  // 动画张的下标（-1 表示没有）——它之后的每一张才铺各自媒体
  const motionIndex = motion ? 0 : -1
  const siteTheme = useTheme()
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

  // 海报皮肤：单张 slide 显式配置优先；未配置时沿用既有实现（跟随站点主题）
  const activeTheme = deck[Math.min(index, total - 1)]?.theme
  const theme: 'dark' | 'light' = activeTheme === 'light' ? 'light' : activeTheme === 'dark' ? 'dark' : siteTheme

  return (
    <div
      className={`blk-hero ${heightClass('blk-hero', height)}${theme === 'light' ? ' blk-hero--light' : ''}${paused ? ' is-paused' : ''}`}
      style={heightStyleValue}
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
          const src = posterMediaSrc(slide)
          // 代码动画那张（motionIndex）不铺媒体；其余张有真实素材才铺（占位 SVG 透出动画）
          const renderable = i !== motionIndex && isRenderableMedia(src, slide.mediaType)
          return (
            <article
              key={`${slide.mediaTag}-${i}`}
              className={`blk-hero__slide${active ? ' is-active' : ''}`}
              aria-hidden={!active}
            >
              <div
                className={`blk-hero__bg${renderable ? ' has-media' : ''}${renderable && slide.mediaContain ? ' is-contain' : ''}${renderable && !slide.scrim ? ' is-no-scrim' : ''}`}
              >
                {renderable && <PosterMedia data={slide} src={src} eager={i === 0} />}
              </div>
              {/* 区块内标题统一 h2：页面级唯一 h1 由 PageView 的 sr-only h1 提供（R11 无障碍） */}
              <PosterOverlay data={slide} titleTag="h2" />
              {active && <PosterDownloads data={slide} />}
            </article>
          )
        })}
      </div>

      {/* 控件：只留底部圆点（箭头与页码都不显示） */}
      {total > 1 && (
        <div className="blk-hero__nav">
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
      )}
    </div>
  )
}
