import type { ReactNode } from 'react'
import { useHScroll } from '../../hooks/useHScroll'
import { IconChevronLeft, IconChevronRight } from '../ui/Icon'

type Props = {
  /** 一排 2 张的宽版卡：关闭 snap，配合指针接近自动滑动 */
  duo?: boolean
  /** auto=true 时启用「指针接近驱动滑动」 */
  auto?: boolean
  /** 供弹簧特效定位的轨道标识 */
  railName?: string
  children: ReactNode
}

/** 横向滑动轨道：箭头 + 拖拽（可选指针接近自动滑动） */
export function HScroll({ duo = false, auto = false, railName, children }: Props) {
  const wrapRef = useHScroll<HTMLDivElement>(auto)

  return (
    <div
      className={`h-scroll${duo ? ' h-scroll--duo' : ''}`}
      ref={wrapRef}
      data-rail={railName}
    >
      <div className="h-scroll__rail">{children}</div>
      <button className="h-scroll__btn h-scroll__btn--prev" type="button" aria-label="向前滚动">
        <IconChevronLeft />
      </button>
      <button className="h-scroll__btn h-scroll__btn--next" type="button" aria-label="向后滚动">
        <IconChevronRight />
      </button>
    </div>
  )
}