/**
 * 后台新手引导（轻量浮层，无依赖）。
 * ============================================================
 * - 首次进入后台（AdminLayout 挂载）自动分步弹出；已看过（localStorage `gh-admin-tour-done`）不再自动弹。
 * - 顶栏「帮助」入口可随时重新打开（`useAdminTour().start()`）。
 * - 高亮目标元素：以 `getBoundingClientRect()` 定位 + 超大 box-shadow 遮罩实现「挖洞」，
 *   遮罩层 `pointer-events: none`，**不阻断**侧栏交互（故为非模态讲解层，不用 aria-modal）。
 * - 目标在侧栏折叠分组 / 图标模式下不可见时，自动展开并把目标滚入视野，保证「指得到」。
 * - 卡片定位按**实测高度**收敛在视口内：优先目标右侧，放不下翻到左侧，横向也不够则居中；
 *   小屏（<768px）改为底部抽屉，避免被遮挡。
 * - 键盘可达：Esc 关闭；卡片可聚焦；关闭后焦点回到触发元素。
 * - 双主题：遮罩为半透明黑、卡片用主题令牌（color-bg-surface 等），深浅一致。
 *
 * 逻辑（上下文 / 步骤 / 已看过标记）见 ./tourContext。
 */
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { IconClose, IconHelp } from '../ui/Icon'
import {
  AdminTourContext,
  markTourDone,
  readTourDone,
  STEPS,
  TOUR_CARD_WIDTH,
  useAdminTour,
} from './tourContext'

/** 卡片与视口边缘的最小留白 */
const VIEWPORT_PAD = 16
/** 卡片与目标之间的间距 */
const CARD_GAP = 14
/** 小屏断点：≤767px 时卡片改为底部抽屉 */
const COMPACT_MAX = 767

/** 命中目标的可见矩形（不可见 / 越界 / 缺失 → null） */
function targetRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) return null
  return rect
}

/** 让目标滚入最近的可滚动祖先的可视区（侧栏 `admin-nav` 这类内部滚动区域） */
function revealInScrollParent(el: HTMLElement) {
  let parent = el.parentElement
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent)
    if (/(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight + 1) {
      const box = parent.getBoundingClientRect()
      const own = el.getBoundingClientRect()
      const delta = own.top + own.height / 2 - (box.top + box.height / 2)
      if (Math.abs(delta) > 4) parent.scrollTop += delta
      return
    }
    parent = parent.parentElement
  }
}

/**
 * 让引导目标可见：展开图标折叠的侧栏、展开所在折叠分组。
 * 返回是否改动了布局（是则需等展开动画结束后重新测量）。
 */
function revealTarget(el: HTMLElement): boolean {
  let changed = false
  const collapsedShell = document.querySelector('.admin-shell.is-collapsed')
  if (collapsedShell && el.closest('.admin-side')) {
    const collapseBtn = collapsedShell.querySelector<HTMLElement>('.admin-side__collapse')
    if (collapseBtn) {
      collapseBtn.click()
      changed = true
    }
  }
  const sub = el.closest('.admin-nav__sub')
  if (sub && !sub.classList.contains('is-open')) {
    const title = sub.closest('.admin-nav__group')?.querySelector<HTMLElement>('.admin-nav__group-title')
    if (title && title.getAttribute('aria-expanded') === 'false') {
      title.click()
      changed = true
    }
  }
  return changed
}

type CardLayout = {
  top: number
  left: number
  width: number
  arrowTop: number | null
  /** 箭头所在边：卡片在目标右侧 → 箭头在卡片左边；反之在右边 */
  arrowSide: 'left' | 'right' | null
  compact: boolean
}

/** 依据目标矩形与卡片实测尺寸计算卡片位置，保证完整落在视口内 */
function cardLayout(rect: DOMRect | null, cardH: number, vw: number, vh: number): CardLayout {
  const width = Math.max(240, Math.min(TOUR_CARD_WIDTH, vw - VIEWPORT_PAD * 2))
  if (vw <= COMPACT_MAX) {
    // 位置交给 CSS（底部抽屉），这里只提供宽度
    return { top: 0, left: 0, width, arrowTop: null, arrowSide: null, compact: true }
  }
  const height = cardH || 220
  if (!rect) {
    return {
      top: Math.max(VIEWPORT_PAD, (vh - height) / 2),
      left: Math.max(VIEWPORT_PAD, (vw - width) / 2),
      width,
      arrowTop: null,
      arrowSide: null,
      compact: false,
    }
  }
  // 横向：优先右侧，放不下翻到左侧；两侧都放不下则与目标同列居中（隐藏箭头）
  let left = rect.right + CARD_GAP
  let arrowSide: 'left' | 'right' | null = 'left'
  if (left + width > vw - VIEWPORT_PAD) {
    left = rect.left - CARD_GAP - width
    arrowSide = 'right'
  }
  if (left < VIEWPORT_PAD) {
    left = Math.max(VIEWPORT_PAD, Math.min(rect.left + rect.width / 2 - width / 2, vw - width - VIEWPORT_PAD))
    arrowSide = null
  }
  // 纵向：与目标垂直居中，再整体夹取进视口（按实测高度，底部不再溢出）
  const desiredTop = rect.top + rect.height / 2 - height / 2
  const top = Math.min(Math.max(VIEWPORT_PAD, desiredTop), Math.max(VIEWPORT_PAD, vh - height - VIEWPORT_PAD))
  const arrowTop =
    arrowSide === null
      ? null
      : Math.min(Math.max(16, rect.top + rect.height / 2 - top), Math.max(16, height - 32))
  return { top, left, width, arrowTop, arrowSide, compact: false }
}

/** 组件：提供后台新手引导上下文，首次进入时自动弹出分步引导。 */
export function AdminTourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const titleId = useId()
  const descId = useId()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  const [cardH, setCardH] = useState(220)
  const cardRef = useRef<HTMLDivElement>(null)
  /** 打开引导前的焦点元素：关闭时归还焦点 */
  const restoreRef = useRef<HTMLElement | null>(null)

  const start = useCallback(() => {
    restoreRef.current = (document.activeElement as HTMLElement | null) ?? null
    setStep(0)
    setOpen(true)
  }, [])

  // 首次进入自动弹出（已看过则跳过）
  useEffect(() => {
    if (readTourDone()) return
    const timer = window.setTimeout(() => setOpen(true), 500)
    return () => window.clearTimeout(timer)
  }, [])

  const finish = useCallback(() => {
    markTourDone()
    setOpen(false)
    // 焦点归还触发元素（若仍挂载），避免焦点落在 document.body
    const el = restoreRef.current
    if (el && document.contains(el)) el.focus()
  }, [])

  const measure = useCallback((selector: string, reveal: boolean) => {
    const el = document.querySelector<HTMLElement>(selector)
    if (el && reveal) revealInScrollParent(el)
    setRect(el ? targetRect(selector) : null)
    setViewport({ w: window.innerWidth, h: window.innerHeight })
  }, [])

  // 打开 / 切步：先展开折叠区域，动画结束后再测量一次，确保高亮框落在最终位置
  useLayoutEffect(() => {
    if (!open) return
    const selector = STEPS[step]?.target ?? ''
    const el = document.querySelector<HTMLElement>(selector)
    const changed = el ? revealTarget(el) : false
    measure(selector, true)
    const timer = window.setTimeout(() => measure(selector, true), changed ? 280 : 60)
    return () => window.clearTimeout(timer)
  }, [open, step, measure])

  // 视口 / 滚动变化：只重新测量（不再自动展开或滚动，避免和用户操作抢）
  useLayoutEffect(() => {
    if (!open) return
    const selector = STEPS[step]?.target ?? ''
    let raf = 0
    const remeasure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => measure(selector, false))
    }
    window.addEventListener('resize', remeasure)
    window.addEventListener('scroll', remeasure, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', remeasure)
      window.removeEventListener('scroll', remeasure, true)
    }
  }, [open, step, measure])

  // 实测卡片高度：定位时按真实高度收敛，底部不再被裁掉
  useLayoutEffect(() => {
    if (!open) return
    const el = cardRef.current
    if (!el) return
    const update = () => {
      const height = el.offsetHeight
      if (height > 0) setCardH((prev) => (Math.abs(prev - height) > 1 ? height : prev))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [open, step])

  // 打开与切步时把焦点移入卡片，配合 aria-live 让读屏器播报新步骤
  useEffect(() => {
    if (!open) return
    cardRef.current?.focus()
  }, [open, step])

  // Esc 关闭（标记已看过，避免反复打扰）
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        finish()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, finish])

  const isLast = step >= STEPS.length - 1
  const current = STEPS[step]
  const layout = cardLayout(rect, cardH, viewport.w, viewport.h)
  const style: CSSProperties | undefined = layout.compact
    ? undefined
    : { top: layout.top, left: layout.left, width: layout.width }
  /** 每步都有对应栏目时给「打开该栏目」；打开后仍停留在引导里（已到末步则完成） */
  const goStep = (next: number) => (next >= STEPS.length ? finish() : setStep(next))

  return (
    <AdminTourContext.Provider value={{ start }}>
      {children}
      {open && (
        <div className={`admin-tour-overlay${layout.compact ? ' is-compact' : ''}`}>
          {rect && (
            <div
              className="admin-tour-highlight"
              aria-hidden="true"
              style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
            />
          )}
          <div
            ref={cardRef}
            className="admin-tour-card"
            role="dialog"
            aria-labelledby={titleId}
            aria-describedby={descId}
            tabIndex={-1}
            style={style}
          >
            {layout.arrowTop !== null && (
              <span
                className={`admin-tour-card__arrow${
                  layout.arrowSide === 'right' ? ' admin-tour-card__arrow--right' : ''
                }`}
                aria-hidden="true"
                style={{ top: layout.arrowTop }}
              />
            )}
            <div className="admin-tour-card__bar">
              <div className="admin-tour-card__step">
                第 {step + 1} / {STEPS.length} 步
              </div>
              <button
                type="button"
                className="btn btn--ghost btn--sm admin-tour-card__close"
                aria-label="关闭新手引导"
                title="关闭"
                onClick={finish}
              >
                <IconClose size={16} />
              </button>
            </div>
            <div aria-live="polite" aria-atomic="true">
              <h2 id={titleId} className="admin-tour-card__title">
                {current.title}
              </h2>
              <p id={descId} className="admin-tour-card__desc">
                {current.desc}
              </p>
            </div>
            <div className="admin-tour-card__dots" aria-hidden="true">
              {STEPS.map((_, index) => (
                <span
                  key={index}
                  className={`admin-tour-card__dot${index === step ? ' is-active' : ''}${index < step ? ' is-done' : ''}`}
                />
              ))}
            </div>
            {/* 底部两行：第一行低频操作，第二行步骤导航；两行各自可换行，窄屏不会溢出 */}
            <div className="admin-tour-card__foot">
              <button type="button" className="btn btn--ghost btn--sm" onClick={finish}>
                不再显示
              </button>
              <span className="admin-tour-card__spacer" />
              {current.to && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    navigate(current.to as string)
                    if (!isLast) setStep((value) => value + 1)
                  }}
                >
                  打开该栏目
                </button>
              )}
            </div>
            <div className="admin-tour-card__actions">
              <span className="admin-tour-card__spacer" />
              {step > 0 && (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => setStep((value) => Math.max(0, value - 1))}
                >
                  上一步
                </button>
              )}
              <button type="button" className="btn btn--primary btn--sm" onClick={() => goStep(step + 1)}>
                {isLast ? '完成' : '下一步'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminTourContext.Provider>
  )
}

/** 顶栏「帮助 / 重新引导」入口（须在 AdminTourProvider 内渲染） */
export function AdminTourButton() {
  const { start } = useAdminTour()
  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm"
      aria-label="帮助 · 新手引导"
      title="帮助 · 新手引导"
      onClick={start}
    >
      <IconHelp size={18} />
    </button>
  )
}
