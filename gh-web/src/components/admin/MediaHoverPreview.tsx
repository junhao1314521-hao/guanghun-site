/**
 * 素材悬浮放大预览：鼠标停在缩略图右下角放大图标上时，显示一张更大的预览图。
 * 用 fixed 定位 + portal，避免被宫格滚动容器裁剪；不拦截鼠标事件。
 */
import { createPortal } from 'react-dom'
import { MediaThumb } from './MediaThumb'

export function MediaHoverPreview({
  src,
  name,
  rect,
}: {
  src: string
  name: string
  /** 触发元素（放大图标）的视口矩形 */
  rect: DOMRect
}) {
  if (typeof document === 'undefined') return null
  const width = Math.min(420, window.innerWidth - 24)
  let left = rect.right + 12
  if (left + width > window.innerWidth - 12) left = Math.max(12, rect.left - width - 12)
  const top = Math.max(12, Math.min(rect.top, window.innerHeight - 360))

  return createPortal(
    <div className="media-hover" style={{ left, top, width }} role="tooltip" aria-label={`${name} 放大预览`}>
      <div className="media-hover__stage">
        <MediaThumb src={src} alt={name} loading="eager" />
      </div>
      <span className="media-hover__name">{name}</span>
    </div>,
    document.body,
  )
}
