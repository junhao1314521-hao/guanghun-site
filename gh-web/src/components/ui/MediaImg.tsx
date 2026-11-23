import { useEffect, useState } from 'react'
import { DeviceArt, type DeviceVariant } from './DeviceArt'
import { CodeMedia, isPlaceholderMedia } from './CodeMedia'
import { useSrcSetFor } from './mediaSrcSet'

/** 瞬时失败（如并发加载被限流 429）的有限重试次数：首次 + 2 次重试 */
const MAX_RETRIES = 2

type Props = {
  /** 占位/正式素材地址 */
  src: string
  alt?: string
  /** 加载失败时回退的矢量产品图类型；缺省时回退为空（保留容器既有底色，不出现破图） */
  variant?: DeviceVariant
  className?: string
  loading?: 'eager' | 'lazy'
  /** 首屏关键图（如首屏海报）可传 high，提升 LCP 优先级 */
  fetchPriority?: 'high' | 'low' | 'auto'
  /** 回退矢量图的 aria-label */
  label?: string
  /** 显式尺寸：用于无固定宽高比容器时提供内在尺寸，防布局跳动（可选） */
  width?: number
  height?: number
  /** srcset 的 sizes 提示（仅当该地址登记了多尺寸时生效） */
  sizes?: string
}

/**
 * 图片素材位：渲染占位/正式素材图；远程图加载失败时回退到矢量占位图，
 * 避免出现浏览器破图图标。尺寸交由容器 CSS 控制（宽度撑满 + object-fit）。
 *
 * 性能默认值：`loading="lazy"`（首屏可传 `eager`）、`decoding="async"`；
 * 防 CLS 由「容器 aspect-ratio 或显式 width/height」保证（见各区块 CSS）。
 * 多尺寸资源存在时经 `useSrcSetFor` 输出 `srcset/sizes`：
 * - 已登记（如素材库数据带 `variants`）即刻生效；
 * - `/uploads/` 地址经公开端点懒加载变体后生效；
 * - 未登记 / 非本地素材 / 请求失败 → 退化为单张（不输出 srcset，不报错）。
 */
export function MediaImg({
  src,
  alt = '',
  variant,
  className,
  loading = 'lazy',
  fetchPriority,
  label = '',
  width,
  height,
  sizes,
}: Props) {
  const [attempt, setAttempt] = useState(0)
  const { srcSet, sizes: resolvedSizes } = useSrcSetFor(src, sizes)
  // 地址变化时重置重试计数（避免沿用上一张图的状态）
  useEffect(() => setAttempt(0), [src])
  // 未提供真实素材 → 代码渐变兜底（不再出现空白 / 破图）；带 variant 时仍优先用矢量产品图
  if (isPlaceholderMedia(src)) {
    return variant ? <DeviceArt variant={variant} className={className} label={label} /> : <CodeMedia className={className} />
  }
  // 重试用尽仍失败 → 回退矢量占位图
  if (attempt > MAX_RETRIES) {
    return variant ? <DeviceArt variant={variant} className={className} label={label} /> : <CodeMedia className={className} />
  }
  // 瞬时失败（如并发加载被限流 429）有限重试：追加参数绕开失败缓存，重试期间不输出 srcset
  const retrySrc = attempt === 0 ? src : `${src}${src.includes('?') ? '&' : '?'}_retry=${attempt}`
  return (
    <img
      key={attempt}
      className={className}
      src={retrySrc}
      alt={alt}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      width={width}
      height={height}
      srcSet={attempt === 0 ? srcSet : undefined}
      sizes={attempt === 0 ? resolvedSizes : undefined}
      onError={() => {
        if (attempt <= MAX_RETRIES) {
          window.setTimeout(() => setAttempt((n) => n + 1), 400 * (attempt + 1))
        }
      }}
    />
  )
}
