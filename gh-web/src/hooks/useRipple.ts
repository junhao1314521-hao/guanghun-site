import { useEffect } from 'react'

const RIPPLE_SELECTOR = [
  '.btn',
  '.icon-btn',
  '.hero__arrow',
  '.hero__dot',
  '.chip',
  '.segmented button',
  '.pagination button',
  '.tabs button',
  '.thumb',
  '.site-nav a',
].join(',')

/** 点击涟漪：事件委托到 document，覆盖运行期动态插入的控件 */
export function useRipple(): void {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      const el = target?.closest?.(RIPPLE_SELECTOR) as HTMLElement | null
      if (!el) return
      const rect = el.getBoundingClientRect()
      const ink = document.createElement('span')
      ink.className = 'ripple-ink'
      ink.style.left = `${event.clientX - rect.left}px`
      ink.style.top = `${event.clientY - rect.top}px`
      el.appendChild(ink)
      ink.addEventListener('animationend', () => ink.remove())
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])
}