import { useEffect, type RefObject } from 'react'
import { prefersReducedMotion } from '../lib/motion'
import { makeSpring, springTo } from '../lib/spring'

/**
 * 指针高级交互（首页 + 列表页 / 详情页）：
 *   A. 主行动按钮——指针磁吸
 *   B. 「按场景选择」卡——弹簧化聚光（缓动跟随）
 *   C. 「重点产品」卡——3D 倾斜（与聚光形态区分）
 *   D. 产品列表卡——指针跟随聚光（不倾斜，与首页区分）
 *   E. 详情大图展台——指针倾斜（沿用弹簧，形态与卡片不同）
 * 全部只动 transform / opacity，统一由弹簧 ticker 驱动。
 *
 * refreshKey：数据异步到达后 DOM 才出现目标元素时传入变化值，让指针交互重新绑定。
 */
export function useHomeEffects(containerRef: RefObject<HTMLElement | null>, refreshKey?: unknown): void {
  useEffect(() => {
    const page = containerRef.current
    if (!page || prefersReducedMotion()) return
    const disposers: Array<() => void> = []
    const bind = (
      el: HTMLElement,
      type: string,
      handler: (event: PointerEvent) => void,
    ) => {
      el.addEventListener(type, handler as EventListener)
      disposers.push(() => el.removeEventListener(type, handler as EventListener))
    }

    // —— 形态 A：主行动按钮磁吸（全站主按钮统一）——
    page.querySelectorAll<HTMLElement>('.hero .btn, .btn--primary').forEach((el) => {
      const jobX = makeSpring((v) => el.style.setProperty('--mag-x', `${v.toFixed(2)}px`), 0.16, 0.72)
      const jobY = makeSpring((v) => el.style.setProperty('--mag-y', `${v.toFixed(2)}px`), 0.16, 0.72)
      el.classList.add('is-magnetic')
      bind(el, 'pointermove', (e) => {
        const rect = el.getBoundingClientRect()
        springTo(jobX, (e.clientX - (rect.left + rect.width / 2)) * 0.34)
        springTo(jobY, (e.clientY - (rect.top + rect.height / 2)) * 0.46)
      })
      bind(el, 'pointerleave', () => {
        springTo(jobX, 0)
        springTo(jobY, 0)
      })
      bind(el, 'blur', () => {
        springTo(jobX, 0)
        springTo(jobY, 0)
      })
    })

    // —— 形态 B：「按场景选择」卡弹簧化聚光 ——
    page.querySelectorAll<HTMLElement>('[data-rail="scene"] .vcard').forEach((card) => {
      const jobX = makeSpring((v) => card.style.setProperty('--mx', `${v.toFixed(1)}px`), 0.14, 0.78)
      const jobY = makeSpring((v) => card.style.setProperty('--my', `${v.toFixed(1)}px`), 0.14, 0.78)
      bind(card, 'pointermove', (e) => {
        const rect = card.getBoundingClientRect()
        springTo(jobX, e.clientX - rect.left)
        springTo(jobY, e.clientY - rect.top)
      })
      bind(card, 'pointerleave', () => {
        const rect = card.getBoundingClientRect()
        springTo(jobX, rect.width / 2)
        springTo(jobY, rect.height / 2)
      })
    })

    // —— 形态 C：「重点产品」卡 3D 倾斜 ——
    page.querySelectorAll<HTMLElement>('[data-rail="featured"] .vcard').forEach((card) => {
      const jobRX = makeSpring((v) => card.style.setProperty('--tilt-x', `${v.toFixed(2)}deg`), 0.13, 0.75)
      const jobRY = makeSpring((v) => card.style.setProperty('--tilt-y', `${v.toFixed(2)}deg`), 0.13, 0.75)
      const jobGX = makeSpring((v) => card.style.setProperty('--mx', `${v.toFixed(1)}px`), 0.14, 0.78)
      const jobGY = makeSpring((v) => card.style.setProperty('--my', `${v.toFixed(1)}px`), 0.14, 0.78)
      card.classList.add('is-tilt')
      bind(card, 'pointermove', (e) => {
        const rect = card.getBoundingClientRect()
        const px = (e.clientX - rect.left) / rect.width - 0.5
        const py = (e.clientY - rect.top) / rect.height - 0.5
        springTo(jobRY, px * 12)
        springTo(jobRX, -py * 10)
        springTo(jobGX, e.clientX - rect.left)
        springTo(jobGY, e.clientY - rect.top)
      })
      bind(card, 'pointerleave', () => {
        const rect = card.getBoundingClientRect()
        springTo(jobRX, 0)
        springTo(jobRY, 0)
        springTo(jobGX, rect.width / 2)
        springTo(jobGY, rect.height / 2)
      })
    })

    // —— 形态 D：产品列表卡 / 通用链接卡 / 能力网格卡 指针跟随聚光（不倾斜，与首页区分）——
    page.querySelectorAll<HTMLElement>('.pcard, .card--link, .blk-cap__card').forEach((card) => {
      const jobX = makeSpring((v) => card.style.setProperty('--mx', `${v.toFixed(1)}px`), 0.15, 0.78)
      const jobY = makeSpring((v) => card.style.setProperty('--my', `${v.toFixed(1)}px`), 0.15, 0.78)
      bind(card, 'pointermove', (e) => {
        const rect = card.getBoundingClientRect()
        springTo(jobX, e.clientX - rect.left)
        springTo(jobY, e.clientY - rect.top)
      })
      bind(card, 'pointerleave', () => {
        const rect = card.getBoundingClientRect()
        springTo(jobX, rect.width / 2)
        springTo(jobY, rect.height / 2)
      })
    })

    // —— 形态 E：详情大图展台指针倾斜 ——
    page.querySelectorAll<HTMLElement>('.detail-media').forEach((stage) => {
      const jobRX = makeSpring((v) => stage.style.setProperty('--tilt-x', `${v.toFixed(2)}deg`), 0.1, 0.78)
      const jobRY = makeSpring((v) => stage.style.setProperty('--tilt-y', `${v.toFixed(2)}deg`), 0.1, 0.78)
      stage.classList.add('is-tilt')
      bind(stage, 'pointermove', (e) => {
        const rect = stage.getBoundingClientRect()
        springTo(jobRY, ((e.clientX - rect.left) / rect.width - 0.5) * 10)
        springTo(jobRX, -((e.clientY - rect.top) / rect.height - 0.5) * 8)
      })
      bind(stage, 'pointerleave', () => {
        springTo(jobRX, 0)
        springTo(jobRY, 0)
      })
    })

    return () => disposers.forEach((dispose) => dispose())
  }, [containerRef, refreshKey])
}