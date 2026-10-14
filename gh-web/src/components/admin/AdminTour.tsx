/**
 * 后台新手引导（轻量浮层，无依赖）。
 * ============================================================
 * - 首次进入后台（AdminLayout 挂载）自动分步弹出；已看过（localStorage `gh-admin-tour-done`）不再自动弹。
 * - 顶栏「帮助」入口可随时重新打开（`useAdminTour().start()`）。
 * - 高亮目标元素：以 `getBoundingClientRect()` 定位 + 超大 box-shadow 遮罩实现「挖洞」，
 *   遮罩层 `pointer-events: none`，**不阻断**侧栏交互。
 * - 键盘可达：Esc 关闭；按钮可 Tab 聚焦；打开时主按钮自动聚焦。
 * - 双主题：遮罩为半透明黑、卡片用主题令牌（color-bg-surface 等），深浅一致。
 *
 * 逻辑（上下文 / 步骤 / 已看过标记）见 ./tourContext。
 */
import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconHelp } from '../ui/Icon'
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

/** 卡片定位：优先置于目标右侧（导航在左）；目标越界 / 缺失则居中 */
function cardStyle(rect: DOMRect | null): { top: number; left: number } {
  if (!rect) {
    return {
      top: Math.max(16, window.innerHeight / 2 - 120),
      left: Math.max(16, window.innerWidth / 2 - TOUR_CARD_WIDTH / 2),
    }
  }
  const top = Math.min(Math.max(16, rect.top), Math.max(16, window.innerHeight - 220))
  const left = Math.min(Math.max(16, rect.right + 14), Math.max(16, window.innerWidth - TOUR_CARD_WIDTH - 16))
  return { top, left }
}

export function AdminTourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const start = useCallback(() => {
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

  return (
    <AdminTourContext.Provider value={{ start }}>
      {children}
      {open && (
        <div className="admin-tour-overlay" role="dialog" aria-modal="true" aria-label="新手引导">
          {rect && (
            <div
              className="admin-tour-highlight"
              aria-hidden="true"
              style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
            />
          )}
          <div className="admin-tour-card" style={cardStyle(rect)}>
            <div className="admin-tour-card__step">
              第 {step + 1} / {STEPS.length} 步
            </div>
            <h2 className="admin-tour-card__title">{current.title}</h2>
            <p className="admin-tour-card__desc">{current.desc}</p>
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
              <button
                type="button"
                className="btn btn--primary btn--sm"
                autoFocus
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
