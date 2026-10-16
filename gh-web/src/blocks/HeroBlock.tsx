/**
 * 1. hero 全宽海报（契约 §4 / 需求 §1.3 五张全屏海报）
 * ============================================================
 * 与 carousel 的单张 slide **共用同一套字段**（见 `blockCatalog.ts` 的 `POSTER_FIELDS`）：
 * media / mediaType、title、subtitle、eyebrow + eyebrowEnabled、stats + statsEnabled、
 * primary / secondary、contentPosition（九宫格 + 拖拽）、height（满屏 / 矮一档 / 自定义）、theme。
 *
 * 渲染复用 `PosterSlide`：图片 / 视频 / GIF / 代码动画铺满整张海报，文案按 contentPosition
 * 定位；未配置位置时退回既有版心布局（历史数据不回归）。
 *
 * 兼容：历史字段 `image` / `mediaTag` / `desc` 继续可用（见 PosterSlide.toPoster）。
 */
import { CodeBackdrop } from '../components/site/CodeBackdrop'
import { PosterDownloads } from './PosterDownloads'
import {
  PosterMedia,
  PosterOverlay,
  posterHeightClass,
  posterHeightStyle,
  posterMediaSrc,
  toPoster,
} from './PosterSlide'

export function HeroBlock({ props }: { props: Record<string, unknown> }) {
  const data = toPoster(props)
  const src = posterMediaSrc(data)
  // 代码动画：显式选择「代码动画」或没有任何媒体时，铺代码动画背景
  const isCode = data.mediaType === 'code' || !src
  // 背景主题：显式配置优先；未配置时沿用既有实现（hero 保持暗色）
  const theme: 'dark' | 'light' = data.theme === 'light' ? 'light' : 'dark'

  return (
    <div
      className={`blk-hero ${posterHeightClass(data.height)}${theme === 'light' ? ' blk-hero--light' : ''}`}
      style={posterHeightStyle(data)}
    >
      {isCode && <CodeBackdrop className="blk-hero__anim" theme={theme} />}
      <div className="blk-hero__slides">
        <article className="blk-hero__slide is-active">
          <div className={`blk-hero__bg${!isCode && src ? ' has-media' : ''}`}>
            {!isCode && src && <PosterMedia data={data} src={src} eager />}
          </div>
          <PosterOverlay data={data} titleTag="h2" />
          <PosterDownloads data={data} />
        </article>
      </div>
    </div>
  )
}
