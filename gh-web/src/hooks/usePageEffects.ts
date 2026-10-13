import { useEffect, type RefObject } from 'react'
import { useLadderFill } from './useLadderFill'

/**
 * 页面级动效：阶梯出场 + 榜单条生长。
 * 迁移自页面稿脚本的 runEntrance / initLadderFills，改用 IntersectionObserver
 * 按「进入视口」触发，而非一次性全部播放。
 *
 * 榜单条生长委托给 `useLadderFill`（同容器、同 refreshKey），便于数据源区块
 * 在其自身取数就绪后再独立绑定一次，避免「绑定早于真实榜单渲染」而失效。
 *
 * refreshKey：当页面内容在运行时被替换（如天梯榜切换指标）时传入一个变化值，
 * 让榜单条按新数据重新生长；已播放完毕的出场动画不会重播，避免视觉噪声。
 */
export function usePageEffects(
  containerRef: RefObject<HTMLElement | null>,
  refreshKey?: unknown,
): void {
  useEffect(() => {
    const page = containerRef.current
    if (!page) return

    // 自动为区块标题与卡片分配阶梯出场，无需逐元素手加类
    const scan = (root: ParentNode) => {
      root.querySelectorAll('.section__head:not(.reveal)').forEach((head) => {
        head.classList.add('reveal')
        head.setAttribute('data-delay', '0')
      })
      root.querySelectorAll('.pcard, .grid-3 > .card').forEach((card, index) => {
        if (card.classList.contains('reveal')) return
        card.classList.add('reveal')
        card.setAttribute('data-delay', String(Math.min((index % 3) + 1, 6)))
      })
    }
    scan(page)

    const play = (el: HTMLElement) => {
      el.classList.add('is-visible')
      el.addEventListener('animationend', () => el.classList.add('is-done'), { once: true })
    }

    let revealObserver: IntersectionObserver | undefined
    const observeReveals = (nodes: HTMLElement[]) => {
      if (!revealObserver) {
        nodes.forEach(play)
        return
      }
      nodes.forEach((el) => revealObserver?.observe(el))
    }
    /** 收集尚未播放的 reveal 元素（排除已完成 / 已可见） */
    const pendingReveals = (root: ParentNode) =>
      Array.from(root.querySelectorAll<HTMLElement>('.reveal')).filter(
        (el) => !el.classList.contains('is-done') && !el.classList.contains('is-visible'),
      )

    // 已播放过的元素保留完成态，重跑时不再重播
    pendingReveals(page).forEach((el) => el.classList.remove('is-visible'))

    if (!('IntersectionObserver' in window)) {
      pendingReveals(page).forEach(play)
    } else {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            play(entry.target as HTMLElement)
            revealObserver?.unobserve(entry.target)
          })
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
      )
      pendingReveals(page).forEach((el) => revealObserver?.observe(el))
    }

    // 数据源区块（文章 / 产品 / 榜单 / 下载 / 问答）在页面就绪后才异步渲染，
    // 其卡片晚于首次绑定出现；用 MutationObserver 捕获新增节点并补挂出场动画，
    // 避免「区块标题出现、卡片空白」。
    let mo: MutationObserver | undefined
    if ('MutationObserver' in window) {
      let scheduled = false
      mo = new MutationObserver(() => {
        if (scheduled) return
        scheduled = true
        requestAnimationFrame(() => {
          scheduled = false
          scan(page)
          const fresh = pendingReveals(page)
          if (fresh.length) observeReveals(fresh)
        })
      })
      mo.observe(page, { childList: true, subtree: true })
    }

    return () => {
      revealObserver?.disconnect()
      mo?.disconnect()
    }
  }, [containerRef, refreshKey])

  // 榜单条生长（与上方出场动画同容器、同刷新键）
  useLadderFill(containerRef, refreshKey)
}
