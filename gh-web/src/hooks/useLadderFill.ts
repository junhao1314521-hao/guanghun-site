import { useEffect, type RefObject } from 'react'
import { prefersReducedMotion } from '../lib/motion'

/**
 * 榜单分值条生长动效：在容器内查找 `.ladder__fill`，整组进入视口后各行按错峰生长。
 *
 * 单独抽成 hook 的原因：数据源区块（如 ranking）自身异步取数，分值条会在「页面级动效
 * 已绑定之后」才由 React 替换渲染出来；若沿用页面级一次性绑定，观察器会绑在随后被卸载的
 * 骨架占位节点上，真实分值条永远拿不到 `is-grown`（宽度恒为 0）。把生长逻辑交给「渲染榜单
 * 的那个组件」，并以各自的取数就绪状态作为 refreshKey，即可保证真正生效。
 *
 * refreshKey：榜单数据或指标变化时传入一个变化值，让分值条按新数据重新生长。
 */
export function useLadderFill(
  containerRef: RefObject<HTMLElement | null>,
  refreshKey?: unknown,
): void {
  useEffect(() => {
    const page = containerRef.current
    if (!page) return
    const reduce = prefersReducedMotion()

    const fills = Array.from(page.querySelectorAll<HTMLElement>('.ladder__fill'))
    // 归一化目标宽度：把内联 width / 已有 --fill-target 统一存成 --fill-target，
    // 重复进入该页时必须沿用已存值，否则第二次会全部变成 100%
    fills.forEach((fill) => {
      const width = fill.style.getPropertyValue('--fill-target') || fill.style.width || '100%'
      fill.style.setProperty('--fill-target', width)
      fill.style.width = ''
      fill.classList.remove('is-grown')
    })

    let fillObserver: IntersectionObserver | undefined
    if (fills.length) {
      if (reduce || !('IntersectionObserver' in window)) {
        // 尊重减弱动效偏好：直接显示最终态，不做生长动画
        fills.forEach((fill) => fill.classList.add('is-grown'))
      } else {
        const groups: Element[] = []
        fills.forEach((fill) => {
          const group = fill.closest('.ladder') || fill.parentElement
          if (group && !groups.includes(group)) groups.push(group)
        })
        fillObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return
              entry.target.querySelectorAll('.ladder__fill').forEach((fill, index) => {
                setTimeout(() => fill.classList.add('is-grown'), index * 90)
              })
              fillObserver?.unobserve(entry.target)
            })
          },
          { rootMargin: '0px 0px -12% 0px', threshold: 0.18 },
        )
        groups.forEach((group) => fillObserver?.observe(group))
      }
    }

    return () => {
      fillObserver?.disconnect()
    }
  }, [containerRef, refreshKey])
}
