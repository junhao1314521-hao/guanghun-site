/** 滚动进度：把元素在视口中的位置写成 CSS 变量，供 3D 变换消费（不触发 React 重渲染） */
import { useEffect } from 'react'
import type { RefObject } from 'react'

/**
 * 监听容器滚动进度并写入 `--p`（0 → 1）。
 * 容器高度需大于视口（通常配 `position: sticky` 使用）。
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, variable = '--p'): void {
  useEffect(() => {
    const node = ref.current
    if (!node) return
    let frame = 0

    const update = () => {
      frame = 0
      const rect = node.getBoundingClientRect()
      const travel = Math.max(1, node.offsetHeight - window.innerHeight)
      const progress = Math.min(1, Math.max(0, -rect.top / travel))
      node.style.setProperty(variable, progress.toFixed(4))
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [ref, variable])
}
