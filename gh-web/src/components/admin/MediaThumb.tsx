/**
 * 素材缩略图：带「加载失败」明确状态的 img。
 * ============================================================
 * `MediaImg` 在失败时会回退到代码渐变占位图，放在素材库里会被误认为「缩略图看不了」。
 * 这里改为显式失败态：图标 + 「文件不可用」，同时保留 srcset（服务端变体）以兼顾性能。
 */
import { useState } from 'react'
import { useSrcSetFor } from '../ui/mediaSrcSet'
import { AdminIcon } from './AdminIcon'

export function MediaThumb({
  src,
  alt = '',
  loading = 'lazy',
  className = '',
}: {
  src: string
  alt?: string
  loading?: 'eager' | 'lazy'
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const { srcSet, sizes } = useSrcSetFor(src)

  if (!src || failed) {
    return (
      <span className="media-thumb__failed" role="img" aria-label={`${alt || '文件'}不可用`}>
        <AdminIcon name="doc" size={22} />
        <span>文件不可用</span>
      </span>
    )
  }

  return (
    <img
      className={className || undefined}
      src={src}
      srcSet={srcSet || undefined}
      sizes={sizes || undefined}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
