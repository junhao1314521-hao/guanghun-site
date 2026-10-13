import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/motion'

/**
 * 横向滑动轨道：箭头翻页 + 指针拖拽；
 * auto=true 时额外启用「指针接近驱动自动滑动」。
 *
 * 指针在轨道右侧 → 向右推进（后面的卡进入视野）；左侧 → 向左回退；
 * 越靠边速度越快，中间留有死区；指针离开时平滑对齐到最近一张卡。
 * 按 pointerType 判定：鼠标（含未知类型）触发，触屏 / 手写笔不触发，
 * 因此不依赖 (hover:hover) 媒体查询——该查询在部分桌面环境下并不可靠。
 */
export function useHScroll<T extends HTMLElement>(auto = false) {
  const wrapRef = useRef<T>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const rail = wrap.querySelector<HTMLElement>('.h-scroll__rail')
    if (!rail) return
    const prev = wrap.querySelector<HTMLButtonElement>('.h-scroll__btn--prev')
    const next = wrap.querySelector<HTMLButtonElement>('.h-scroll__btn--next')
    const reduce = prefersReducedMotion()

    // 指针接近自动滑动的轨道关闭了 snap，箭头需按「卡位」对齐，避免错位
    const byIndex = auto
    const disposers: Array<() => void> = []
    const on = <K extends keyof WindowEventMap>(
      target: Window | HTMLElement,
      type: K | string,
      handler: EventListenerOrEventListenerObject,
      options?: AddEventListenerOptions,
    ) => {
      target.addEventListener(type as string, handler, options)
      disposers.push(() => target.removeEventListener(type as string, handler, options))
    }

    function cardStep() {
      // 卡位宽度：优先区块标记 data-rail-card（cards 区块），回退旧版 .vcard（首页海报卡）
      const card = rail!.querySelector('[data-rail-card], .vcard')
      const gap = parseFloat(getComputedStyle(rail!).gap) || 20
      return (card ? card.getBoundingClientRect().width : 300) + gap
    }

    function update() {
      if (!prev || !next || !rail) return
      const max = rail.scrollWidth - rail.clientWidth
      prev.disabled = rail.scrollLeft <= 4
      next.disabled = rail.scrollLeft >= max - 4
    }

    function goCards(dir: number) {
      if (!rail) return
      const step = cardStep()
      const max = rail.scrollWidth - rail.clientWidth
      // 关掉 snap 的轨道按「卡位」取整，保证箭头翻页后卡片对齐
      const left = byIndex
        ? Math.round(rail.scrollLeft / step) * step + dir * step * 2
        : rail.scrollLeft + dir * step * 2
      rail.scrollTo({ left: Math.max(0, Math.min(max, left)), behavior: 'smooth' })
    }

    if (next) on(next, 'click', () => goCards(1))
    if (prev) on(prev, 'click', () => goCards(-1))
    on(rail, 'scroll', update, { passive: true })
    on(window, 'resize', update)

    // —— 拖拽 ——
    let isDown = false
    let startX = 0
    let startScroll = 0
    let moved = false
    on(rail, 'pointerdown', (event) => {
      const e = event as PointerEvent
      isDown = true
      startX = e.clientX
      startScroll = rail!.scrollLeft
      moved = false
    })
    on(window, 'pointermove', (event) => {
      if (!isDown || !rail) return
      const e = event as PointerEvent
      const dx = e.clientX - startX
      if (Math.abs(dx) > 5) {
        moved = true
        rail.classList.add('is-dragging')
      }
      if (moved) rail.scrollLeft = startScroll - dx
    })
    on(window, 'pointerup', () => {
      isDown = false
      rail?.classList.remove('is-dragging')
      update()
    })

    // —— 指针接近驱动自动滑动 ——
    if (byIndex && !reduce) {
      const MAX = 13 // 最大速度（px / 帧）
      const DEAD = 0.16 // 中心死区（比例），避免轻微移动就触发
      let target = 0
      let current = 0
      let raf: number | null = null
      let alive = false

      const clampScroll = (value: number) => {
        const max = rail!.scrollWidth - rail!.clientWidth
        return Math.max(0, Math.min(max, value))
      }
      const frame = () => {
        if (!alive) {
          raf = null
          return
        }
        current += (target - current) * 0.12 // 阻尼，起步与收尾都不生硬
        if (Math.abs(current) > 0.1) {
          rail!.scrollLeft = clampScroll(rail!.scrollLeft + current)
        }
        raf = requestAnimationFrame(frame)
      }

      on(wrap, 'pointermove', (event) => {
        const e = event as PointerEvent
        if (rail!.classList.contains('is-dragging')) return
        if (e.pointerType === 'touch' || e.pointerType === 'pen') return
        const rect = wrap.getBoundingClientRect()
        const value = (e.clientX - rect.left) / rect.width - 0.5 // -0.5 ~ 0.5
        if (Math.abs(value) <= DEAD / 2) {
          target = 0
        } else {
          const strength = (Math.abs(value) - DEAD / 2) / (0.5 - DEAD / 2) // 0 ~ 1
          target = Math.sign(value) * Math.pow(strength, 1.6) * MAX
        }
        alive = true
        if (!raf) raf = requestAnimationFrame(frame)
      })

      on(wrap, 'pointerleave', () => {
        alive = false
        target = 0
        current = 0
        const step = cardStep()
        rail!.scrollTo({
          left: clampScroll(Math.round(rail!.scrollLeft / step) * step),
          behavior: 'smooth',
        })
      })

      disposers.push(() => {
        alive = false
        if (raf) cancelAnimationFrame(raf)
      })
    }

    update()
    return () => disposers.forEach((dispose) => dispose())
  }, [auto])

  return wrapRef
}