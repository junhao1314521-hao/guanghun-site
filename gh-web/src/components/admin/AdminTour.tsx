/**
 * 后台新手引导（轻量浮层，无依赖）。
 * ============================================================
 * - 首次进入后台（AdminLayout 挂载）自动分步弹出；已看过（localStorage `gh-admin-tour-done`）不再自动弹。
 * - 顶栏「帮助」入口可随时重新打开（`useAdminTour().start()`）。
 * - 高亮目标元素：以 `getBoundingClientRect()` 定位 + 超大 box-shadow 遮罩实现「挖洞」，
 *   遮罩层 `pointer-events: none`，**不阻断**侧栏交互（故为非模态讲解层，不用 aria-modal）。
 * - 键盘可达：Esc 关闭；卡片可聚焦；关闭后焦点回到触发元素。
 * - 双主题：遮罩为半透明黑、卡片用主题令牌（color-bg-surface 等），深浅一致。
 *
 * 逻辑（上下文 / 步骤 / 已看过标记）见 ./tourContext。
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
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

/** 命中目标的可见矩形（不可见 / 越界 / 缺失 → null） */
function targetRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) return null
  return rect
}

/** 卡片定位：优先置于目标右侧（导航在左）；目标越界 / 缺失则居中。同时给出指向箭头相对卡片的纵向落点。 */
function cardStyle(rect: DOMRect | null): { top: number; left: number; arrowTop: number | null } {
  if (!rect) {
    return {
      top: Math.max(16, window.innerHeight / 2 - 120),
      left: Math.max(16, window.innerWidth / 2 - TOUR_CARD_WIDTH / 2),
      arrowTop: null,
    }
  }
  const top = Math.min(Math.max(16, rect.top), Math.max(16, window.innerHeight - 220))
  const left = Math.min(Math.max(16, rect.right + 14), Math.max(16, window.innerWidth - TOUR_CARD_WIDTH - 16))
  // 箭头对准目标纵向中心，夹取到卡片内可见范围，避免溢出
  const arrowTop = Math.max(14, Math.min(rect.top + rect.height / 2 - top, 140))
  return { top, left, arrowTop }
}

export function AdminTourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const titleId = useId()
  const descId = useId()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
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

  // 打开 / 切换步骤 / 窗口变化时测量目标位置
  useLayoutEffect(() => {
    if (!open) return
    const measure = () => setRect(targetRect(STEPS[step]?.target ?? ''))
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
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
  const pos = cardStyle(rect)

  return (
    <AdminTourContext.Provider value={{ start }}>
      {children}
      {open && (
        <div className="admin-tour-overlay">
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
            style={{ top: pos.top, left: pos.left }}
          >
            {pos.arrowTop !== null && (
              <span className="admin-tour-card__arrow" aria-hidden="true" style={{ top: pos.arrowTop }} />
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
              {!isLast && (
                <button type="button" className="btn btn--secondary btn--sm" onClick={finish}>
                  跳过
                </button>
              )}
              {step > 0 && (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => setStep((value) => Math.max(0, value - 1))}
                >
                  上一步
                </button>
              )}
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => (isLast ? finish() : setStep((value) => value + 1))}
              >
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
