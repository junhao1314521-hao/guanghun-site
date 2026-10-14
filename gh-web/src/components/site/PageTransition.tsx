/**
 * 页面切换：瞬时切页 + 内容级微入场
 * ============================================================
 * 不做全屏过渡（整屏动画会让每次导航都慢半拍，且与浏览器「后退」语义冲突）。
 * 路由瞬间完成，只给新页面一次极短的轻微上浮（0.22s）—— 感知上「快且精致」。
 *
 * 产品卡 → 详情页的「图片飞入」由 View Transitions API 单独负责（见 blocks.css）。
 *
 * - 只监听 `pathname`（忽略 query / hash），筛选、分页不触发；
 * - `prefers-reduced-motion` 时关闭。
 */
import type { ReactNode } from 'react'
import { prefersReducedMotion } from '../../lib/motion'

export function PageTransition({ pathname, children }: { pathname: string; children: ReactNode }) {
  const reduced = prefersReducedMotion()
  return (
    <div key={`page-${pathname}`} className={reduced ? undefined : 'page-enter'}>
      {children}
    </div>
  )
}
