/**
 * 7. stats 数字展示（契约 §4）
 * props: title / subtitle / footnote / items:{value,unit?,label,note?}[]
 *
 * 「数据带」形态：序号 + 大数字（含单位）+ 说明 + 补充说明。
 * 数字以 Odometer 滚轮进入视口时滚动到目标值，配合整体入场节奏。
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { prefersReducedMotion } from '../lib/motion'
import { asStatItems, asString } from './blockUtils'

/**
 * 数字滚轮（Odometer）：每一位数字纵向滚动到目标值，进入视口时触发一次。
 * 年份 / 普通数字统一处理；减少动效时直接显示最终值。
 */
function Odometer({ value, delay = 0 }: { value: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [run, setRun] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setRun(true)
      return
    }
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        observer.disconnect()
        setRun(true)
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <span className={`odo${run ? ' is-run' : ''}`} ref={ref} role="img" aria-label={value}>
      {Array.from(value).map((char, index) =>
        /\d/.test(char) ? (
          <span className="odo__digit" aria-hidden="true" key={`${char}-${index}`}>
            <span
              className="odo__track"
              style={{ '--d': Number(char), transitionDelay: `${delay}ms` } as CSSProperties}
            >
              {Array.from({ length: 20 }, (_, n) => (
                <span className="odo__cell" key={n}>
                  {n % 10}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span className="odo__sep" aria-hidden="true" key={`${char}-${index}`}>
            {char}
          </span>
        ),
      )}
    </span>
  )
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
              <Odometer value={String(item.value)} delay={index * 120} />
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
