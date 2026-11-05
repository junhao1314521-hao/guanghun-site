/**
 * Canvas 相关能力的兼容封装。
 *
 * 部分旧版 WebView / 浏览器（如早期 X5、Safari 13 以下）没有 ResizeObserver /
 * IntersectionObserver，直接使用会让整个页面被错误边界捕获。这里统一做降级：
 * - 尺寸监听退化为 window.resize；
 * - 可见性监听退化为“始终可见”；
 * - 减少动效偏好读取失败时按“允许动效”处理。
 */

/** 监听元素尺寸变化：优先 ResizeObserver，不支持时退回 window.resize；返回清理函数 */
export function observeResize(target: Element, onChange: () => void): () => void {
  onChange()
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(onChange)
    observer.observe(target)
    return () => observer.disconnect()
  }
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

/** 监听元素是否进入视口：不支持 IntersectionObserver 时按“始终可见”处理 */
export function observeVisibility(target: Element, onChange: (visible: boolean) => void): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    onChange(true)
    return () => {}
  }
  const observer = new IntersectionObserver(([entry]) => onChange(entry.isIntersecting), { threshold: 0 })
  observer.observe(target)
  return () => observer.disconnect()
}

/** 读取“减少动效”偏好；老浏览器没有 matchMedia 时返回 false */
export function prefersReducedMotion(): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}
