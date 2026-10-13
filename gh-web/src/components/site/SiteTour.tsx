import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n'

/** 记忆键：完成后不再自动弹出（可在页脚「新手指引」重新打开） */
export const TOUR_DONE_KEY = 'gh-site-tour-done'
/** 页脚等处重新打开引导的自定义事件名 */
export const TOUR_OPEN_EVENT = 'gh:open-site-tour'

type Step = { selector: string; titleKey: string; descKey: string }

/** 引导步骤：选择器尽量宽松，目标不存在时自动降级为居中卡片（不影响可读性） */
const STEPS: Step[] = [
  { selector: '.site-header', titleKey: 'tour.step1.title', descKey: 'tour.step1.desc' },
  { selector: '.mk-page[data-page="home"] [data-rail], [data-block="carousel"], .h-scroll', titleKey: 'tour.step2.title', descKey: 'tour.step2.desc' },
  { selector: '.site-nav, .mk-page[data-page="list"] .p-grid', titleKey: 'tour.step3.title', descKey: 'tour.step3.desc' },
  { selector: '.site-actions', titleKey: 'tour.step4.title', descKey: 'tour.step4.desc' },
]

const CARD_W = 320
const GAP = 12

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function readDone(): boolean {
  try {
    return window.localStorage.getItem(TOUR_DONE_KEY) === '1'
  } catch {
    return true // 无 localStorage（隐私模式等）时不再打扰
  }
}

function writeDone(): void {
  try {
    window.localStorage.setItem(TOUR_DONE_KEY, '1')
  } catch {
    /* 忽略写入失败 */
  }
}

/**
 * 前台新手指引（轻量、无依赖、不阻塞内容）。
 *
 * · 首次访问自动弹出；可「上一步 / 下一步 / 跳过 / 不再显示」，Esc 可关；
 * · 「跳过 / 不再显示 / 完成」均写入 localStorage（gh-site-tour-done）不再自动弹；页脚「新手指引」可重开；
 * · 仅客户端渲染的浮层，不改动首屏可抓取内容；尊重 prefers-reduced-motion（见 site.css）。
 */
export function SiteTour() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  const spotRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  // 定位：目标存在则高亮，否则退化为居中卡片；直接操作样式，避免每帧 setState
  const measure = useCallback(() => {
    const spot = spotRef.current
    const scrim = scrimRef.current
    const card = cardRef.current
    if (!spot || !scrim || !card) return

    const vw = window.innerWidth
    const vh = window.innerHeight
    const target = document.querySelector<HTMLElement>(STEPS[step].selector)
    let rect: DOMRect | null = null
    if (target) {
      const r = target.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh) rect = r
    }

    if (rect) {
      spot.hidden = false
      scrim.hidden = true
      spot.style.left = `${rect.left - 6}px`
      spot.style.top = `${rect.top - 6}px`
      spot.style.width = `${rect.width + 12}px`
      spot.style.height = `${rect.height + 12}px`
    } else {
      spot.hidden = true
      scrim.hidden = false
    }

    // 卡片：优先置于目标下方，空间不足则置于上方；始终夹在视口内
    let top: number
    let left: number
    if (rect) {
      const cardH = card.offsetHeight || 220
      top = rect.bottom + GAP
      if (top + cardH > vh - GAP) top = Math.max(GAP, rect.top - cardH - GAP)
      left = clamp(rect.left + rect.width / 2 - CARD_W / 2, GAP, vw - CARD_W - GAP)
    } else {
      const cardH = card.offsetHeight || 220
      top = clamp(vh / 2 - cardH / 2, GAP, vh - cardH - GAP)
      left = clamp(vw / 2 - CARD_W / 2, GAP, vw - CARD_W - GAP)
    }
    card.style.top = `${top}px`
    card.style.left = `${left}px`
  }, [step])

  // 重新打开引导（页脚触发）
  useEffect(() => {
    const onOpen = () => {
      openerRef.current = document.activeElement as HTMLElement | null
      setStep(0)
      setOpen(true)
    }
    window.addEventListener(TOUR_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(TOUR_OPEN_EVENT, onOpen)
  }, [])

  // 首次访问：延迟弹出，避免与首屏渲染抢时间
  useEffect(() => {
    if (readDone()) return
    const timer = window.setTimeout(() => {
      openerRef.current = document.activeElement as HTMLElement | null
      setOpen(true)
    }, 900)
    return () => window.clearTimeout(timer)
  }, [])

  // 打开期间：定位 + 随视口变化重算 + 焦点管理 + Esc 关闭
  useLayoutEffect(() => {
    if (!open) return
    measure()
    const onViewport = () => measure()
    window.addEventListener('resize', onViewport)
    window.addEventListener('scroll', onViewport, { passive: true })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('resize', onViewport)
      window.removeEventListener('scroll', onViewport)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, measure])

  useEffect(() => {
    if (!open) return
    primaryRef.current?.focus()
    return () => openerRef.current?.focus?.()
  }, [open])

  if (!open) return null

  const last = step === STEPS.length - 1
  // 「跳过 / 不再显示 / 完成」都会写入记忆标记（刷新后不再自动弹出）；Esc 仅本次关闭
  const finish = () => {
    writeDone()
    setOpen(false)
  }

  return (
    <div className="site-tour" role="dialog" aria-label={t('tour.label')} aria-describedby="site-tour-desc">
      <div className="site-tour__scrim" ref={scrimRef} hidden aria-hidden="true" />
      <div className="site-tour__spot" ref={spotRef} hidden aria-hidden="true" />
      <div className="site-tour__card" ref={cardRef}>
        <div className="site-tour__head">
          <span className="site-tour__eyebrow">{t('tour.title')}</span>
          <span className="site-tour__progress">{t('tour.progress', { current: step + 1, total: STEPS.length })}</span>
        </div>
        <h2 className="site-tour__title">{t(STEPS[step].titleKey)}</h2>
        <p className="site-tour__desc" id="site-tour-desc">
          {t(STEPS[step].descKey)}
        </p>
        <div className="site-tour__actions">
          <div className="row" style={{ gap: 'var(--gh-space-2)' }}>
            {step > 0 && (
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => setStep((s) => s - 1)}>
                {t('tour.prev')}
              </button>
            )}
            <button
              className="btn btn--primary btn--sm"
              type="button"
              ref={primaryRef}
              onClick={() => (last ? finish() : setStep((s) => s + 1))}
            >
              {last ? t('tour.done') : t('tour.next')}
            </button>
          </div>
          <div className="row" style={{ gap: 'var(--gh-space-2)' }}>
            <button className="btn btn--ghost btn--sm" type="button" onClick={finish}>
              {t('tour.skip')}
            </button>
            <button className="btn btn--ghost btn--sm" type="button" onClick={finish}>
              {t('tour.never')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
