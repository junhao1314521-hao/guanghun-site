/**
 * 页面切换过渡（缩放淡入 + 柔和遮罩）
 * ============================================================
 * 路由变化时：一层与页面同底色的薄幕快速化开（0.26s），
 * 新页面同时从 99.2% 轻微收放到 100% 并淡入（0.36s）——
 * 读作「页面被轻轻收进来」，而不是生硬跳变。
 *
 * - 只监听 `pathname`（忽略 query / hash），筛选、分页不触发；
 * - `prefers-reduced-motion` 时完全关闭，直接切页；
 * - 纯 CSS 动画（只动 transform / opacity），无第三方依赖。
 */
import type { ReactNode } from 'react'
import { prefersReducedMotion } from '../../lib/motion'

export function PageTransition({ pathname, children }: { pathname: string; children: ReactNode }) {
  const reduced = prefersReducedMotion()
  return (
    <>
      {!reduced && <span key={`veil-${pathname}`} className="page-veil" aria-hidden="true" />}
      <div key={`page-${pathname}`} className={reduced ? undefined : 'page-enter'}>
        {children}
      </div>
    </>
  )
}
