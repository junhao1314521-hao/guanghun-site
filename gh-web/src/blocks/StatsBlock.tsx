/**
 * 7. stats 数字展示（契约 §4）
 * props: title / subtitle / footnote / items:{value,unit?,label,note?}[]
 *
 * 「数据带」形态：序号 + 大数字（含单位）+ 说明 + 补充说明。
 * 纯计数（非年份）在进入视口时做一次「滚动计数」，配合整体入场节奏。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { prefersReducedMotion } from '../lib/motion'
import { asStatItems, asString } from './blockUtils'

/** 千分位格式化 */
function format(value: number): string {
  return value.toLocaleString('en-US')
}

/**
 * 数字滚动计数：仅对「纯数字（非年份）」生效 —— 从 0 递增到目标，进入视口时触发。
 * 年份（1900–2100）与含其它字符的值（如 98%、<1）直接原样展示，避免观感奇怪。
 */
function CountUp({ value }: { value: string }) {
  const target = useMemo(() => {
    if (!/^\d[\d,]*$/.test(value)) return null
    const parsed = Number(value.replace(/,/g, ''))
    if (!Number.isFinite(parsed)) return null
    if (parsed >= 1900 && parsed <= 2100) return null // 年份不做计数
    return parsed
  }, [value])
  const ref = useRef<HTMLSpanElement>(null)
  const [text, setText] = useState(target === null ? value : format(0))

  useEffect(() => {
    if (target === null) return
    if (prefersReducedMotion()) {
      setText(format(target))
      return
    }
    const el = ref.current
    if (!el) return
    let raf = 0
    let start = 0
    const DURATION = 900
    const step = (now: number) => {
      if (!start) start = now
      const progress = Math.min(1, (now - start) / DURATION)
      const eased = 1 - Math.pow(1 - progress, 3)
      setText(format(Math.round(target * eased)))
      if (progress < 1) raf = window.requestAnimationFrame(step)
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        observer.disconnect()
        raf = window.requestAnimationFrame(step)
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(raf)
    }
  }, [target])

  return <span ref={ref}>{text}</span>
}

export function StatsBlock({ props }: { props: Record<string, unknown> }) {
  const items = asStatItems(props.items)
  const footnote = asString(props.footnote)
  if (items.length === 0 && !asString(props.title)) return null

  return (
    <div className="blk-stats">
      <SectionHeadFromProps props={props} />
      <div className="blk-stats__grid">
        {items.map((item, index) => (
          <div className="blk-stats__item reveal" key={`${item.label}-${index}`} data-delay={String(Math.min(index + 1, 6))}>
            <span className="blk-stats__index">{String(index + 1).padStart(2, '0')}</span>
            <div className="blk-stats__value">
              <CountUp value={String(item.value)} />
              {item.unit && <i className="blk-stats__unit">{item.unit}</i>}
            </div>
            <div className="blk-stats__label">{item.label}</div>
            {item.note && <p className="blk-stats__note">{item.note}</p>}
            <span className="blk-stats__bar" aria-hidden="true" />
          </div>
        ))}
      </div>
      {footnote && <p className="blk-stats__footnote">{footnote}</p>}
    </div>
  )
}
