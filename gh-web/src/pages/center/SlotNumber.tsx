/** 数字老虎机：进入视口后逐位滚动到目标值，只播一次；减少动效时直接显示结果 */
import { useEffect, useRef, useState } from 'react'
import { observeVisibility } from './canvasEnv'

type Props = {
  /** 目标值，支持纯数字或带后缀（如 "40+"、"6"） */
  value: string
  /** 每位数字的滚动时长（毫秒） */
  duration?: number
  className?: string
}

/** 把字符串拆成「数字位 / 非数字后缀」，数字位用滚动列渲染 */
export function SlotNumber({ value, duration = 900, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    return observeVisibility(node, (isVisible) => {
      if (isVisible) setVisible(true)
    })
  }, [])

  const chars = value.split('')
  let digitIndex = 0

  return (
    <span ref={ref} className={`slot ${className ?? ''}`} aria-label={value}>
      {chars.map((char, index) => {
        if (!/\d/.test(char)) {
          return (
            <span key={`${char}-${index}`} className="slot__text" aria-hidden="true">
              {char}
            </span>
          )
        }
        const digit = Number(char)
        const delay = digitIndex * 70
        digitIndex += 1
        return (
          <span key={`${char}-${index}`} className="slot__col" aria-hidden="true">
            <span
              className="slot__strip"
              style={{
                transform: visible ? `translateY(-${digit}em)` : 'translateY(0)',
                transitionDuration: `${duration}ms`,
                transitionDelay: `${delay}ms`,
              }}
            >
              {Array.from({ length: 10 }, (_, n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}
