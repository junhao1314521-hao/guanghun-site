/**
 * 全屏视觉模块（R3 新建）：只承载 图片 / GIF / 视频，无文案层。
 *
 * - 高度四档与海报同口径（满屏 / 21:9 / 矮一档 / 自定义），复用 `heightUtils`；
 * - 默认 `container: full` 通栏铺满（由后台创建区块时写入 style）；
 * - 移动端可单独指定竖版图（`imageMobile`），避免宽图被裁切。
 */
import { asString } from './blockUtils'
import { heightClass, heightStyle } from './heightUtils'

export function FullscreenVisualBlock({ props }: { props: Record<string, unknown> }) {
  const media = asString(props.media)
  const mediaType = asString(props.mediaType, 'image')
  const imageMobile = asString(props.imageMobile)
  const alt = asString(props.alt)
  const height = asString(props.height, 'full')

  // 没有媒体时不渲染，避免留下一个空白高度块
  if (!media) return null

  return (
    <div className={`fs-visual ${heightClass('fs-visual', height)}`} style={heightStyle(height, props.heightValue)}>
      {mediaType === 'video' ? (
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
    </div>
  )
}
