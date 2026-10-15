/**
 * 环境背景层（全站固定，位于内容之下）：
 *   1. 发丝网格底纹——向上淡出，给大片纯色一点「工程底图」的质感；
 *   2. 品牌光晕——两团低透明度径向光缓慢漂移（只动 transform），制造纵深与呼吸感；
 *   3. 极弱噪点——消除纯色的「数字感」，更耐看；
 *   4. 光标柔光——指针位置驱动一层径向高光（rAF 节流），深色主题下最明显。
 *
 * 全部由 CSS 变量 + transform/opacity 驱动，无重绘开销；
 * `prefers-reduced-motion` 或非精确指针（触屏）时不启用光标柔光。
 */
import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../../lib/motion'

export function AmbientBackdrop() {
  const layerRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const layer = layerRef.current
    const cursor = cursorRef.current
    if (!layer || !cursor) return
    // 触屏 / 减弱动效：不启用光标柔光
    if (prefersReducedMotion() || !window.matchMedia('(hover: hover)').matches) return

    let raf = 0
    let x = 0
    let y = 0
    let shown = false

    const apply = () => {
      raf = 0
      layer.style.setProperty('--gh-mx', `${x}px`)
      layer.style.setProperty('--gh-my', `${y}px`)
      if (!shown) {
        shown = true
        cursor.style.opacity = '1'
      }
    }
    const onMove = (event: PointerEvent) => {
      x = event.clientX
      y = event.clientY
      if (!raf) raf = window.requestAnimationFrame(apply)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="ambient" aria-hidden="true" ref={layerRef}>
      <div className="ambient__grid" />
      <div className="ambient__glow ambient__glow--a" />
      <div className="ambient__glow ambient__glow--b" />
      <div className="ambient__noise" />
      <div className="ambient__cursor" ref={cursorRef} />
    </div>
  )
}
