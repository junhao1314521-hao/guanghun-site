/**
 * 代码渐变媒体兜底：当媒体位**没有素材**（或素材缺失）时填充的视觉层。
 *
 * 规则（见需求汇总 §13「媒体槽规则」）：
 * - 有素材 → 显示素材（图片 / 视频 / GIF）；
 * - 无素材 → 回退为本组件的**代码渐变**（低成本、主题自适应）；
 * - 首屏第一张海报为**特例**：固定使用 canvas 代码动画（`CodeBackdrop`），不受此规则影响。
 *
 * `animated` 打开时叠加一道极轻的斜向流光（尊重 prefers-reduced-motion）。
 */
export function CodeMedia({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <div
      className={`code-media${animated ? ' code-media--anim' : ''}${className ? ` ${className}` : ''}`}
      data-code-media="true"
      aria-hidden="true"
    />
  )
}

/** 判断媒体地址是否为「未提供真实素材」（空值、锚点、或内置占位命名空间 /media/） */
export function isPlaceholderMedia(src?: string): boolean {
  if (!src) return true
  const value = src.trim()
  if (!value || value === '#') return true
  // 内置占位命名空间：/media/**（真实上传走 /uploads/** 或 http(s) 外链）
  if (value.startsWith('/media/')) return true
  return false
}
