/**
 * 全屏视觉模块（R3 新建）：媒体铺满 + 可选文案层。
 *
 * - 默认只有媒体，行为与旧版一致；
 * - 后台填写标题 / 说明 / 按钮后，复用海报同一套文案浮层（字体、按钮、配色都不另写一套）；
 * - 媒体尚未上传但已填写文案时，渲染品牌底色兜底，避免首屏静默消失；
 * - 高度四档与海报同口径（复用 `heightUtils`），移动端可单独指定竖版图。
 */
import { asString } from './blockUtils'
import { heightClass, heightStyle } from './heightUtils'
import { PosterOverlay, toPoster } from './PosterSlide'

/** 全屏视觉区块：按高度档位渲染媒体，文案层可选 */
export function FullscreenVisualBlock({ props }: { props: Record<string, unknown> }) {
  const media = asString(props.media)
  const mediaType = asString(props.mediaType, 'image')
  const imageMobile = asString(props.imageMobile)
  const alt = asString(props.alt)
  const height = asString(props.height, 'full')
  const poster = toPoster(props)
  const hasCopy =
    poster.title.length > 0 || Boolean(poster.subtitle) || Boolean(poster.primary) || Boolean(poster.secondary)

  // 媒体与文案都没有时整块不渲染，避免留下空白高度
  if (!media && !hasCopy) return null

  return (
    <div
      className={`fs-visual${heightClass('fs-visual', height)}${hasCopy && poster.scrim ? ' is-scrim' : ''}`}
      style={heightStyle(height, props.heightValue)}
    >
      {!media ? (
        <div className="fs-visual__fallback" aria-hidden="true" />
      ) : mediaType === 'video' ? (
        <video
          className="fs-visual__media"
          src={media}
          poster={imageMobile || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={alt || undefined}
        />
      ) : (
        <picture>
          {imageMobile && <source media="(max-width: 767px)" srcSet={imageMobile} />}
          <img className="fs-visual__media" src={media} alt={alt} loading="lazy" decoding="async" />
        </picture>
      )}
      {hasCopy && (
        <div className="fs-visual__copy">
          <PosterOverlay data={poster} />
        </div>
      )}
    </div>
  )
}
