/**
 * 页面切换过渡（「翻页」效果）
 * ============================================================
 * 路由变化时：一块品牌色幕布自下而上铺满，再从顶部掀开，露出新页面；
 * 新页面文案在幕布覆盖期间错峰淡入。整段约 0.6s。
 *
 * - 只监听 `pathname`（忽略 query / hash），因此筛选、分页等不触发过渡；
 * - `prefers-reduced-motion` 时完全关闭，直接切页；
 * - 纯 CSS 动画（只动 transform / opacity），无第三方依赖。
 */
import type { ReactNode } from 'react'
import { prefersReducedMotion } from '../../lib/motion'

export function PageTransition({ pathname, children }: { pathname: string; children: ReactNode }) {
  const reduced = prefersReducedMotion()
  return (
    <>
      {!reduced && <span key={`curtain-${pathname}`} className="page-curtain" aria-hidden="true" />}
      <div key={`page-${pathname}`} className={reduced ? undefined : 'page-enter'}>
        {children}
      </div>
    </>
  )
}
