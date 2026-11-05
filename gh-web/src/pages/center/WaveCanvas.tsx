/** 纯代码信号波形：Canvas 2D，跟随控件变化，页面隐藏或减少动效时自动降级 */
import { useEffect, useRef } from 'react'
import { observeResize, prefersReducedMotion } from './canvasEnv'

type Props = {
  /** 0–1，控制振幅 */
  level?: number
  /** 0–1，控制频率 */
  frequency?: number
  className?: string
}

// 波形 canvas：按音量与频率参数逐帧绘制动画，最新参数经 ref 传入
export function WaveCanvas({ level = 0.5, frequency = 0.5, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const levelRef = useRef(level)
  const freqRef = useRef(frequency)

  // 把最新参数写入 ref，供动画循环读取；避免在渲染期间修改 ref
  useEffect(() => {
    levelRef.current = level
    freqRef.current = frequency
  }, [level, frequency])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let ctx: CanvasRenderingContext2D | null = null
    try {
      ctx = canvas.getContext('2d')
    } catch {
      return
    }
    if (!ctx) return

    const reduce = prefersReducedMotion()
    let raf = 0
    let phase = 0
    let width = 0
    let height = 0
    let dpr = 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = () => {
      if (!width || !height) return
      ctx.clearRect(0, 0, width, height)
      const amp = height * (0.08 + levelRef.current * 0.24)
      const freq = 1.2 + freqRef.current * 2.4

      for (let layer = 0; layer < 2; layer += 1) {
        ctx.beginPath()
        for (let x = 0; x <= width; x += 2) {
          const t = x / width
          const y =
            height / 2 +
            Math.sin(t * Math.PI * 2 * freq + phase + layer * 1.4) * amp * (layer ? 0.45 : 1) +
            Math.sin(t * Math.PI * 2 * freq * 2.7 - phase * 1.6) * amp * 0.12
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = layer ? 'rgba(56, 189, 248, 0.28)' : 'rgba(96, 165, 250, 0.72)'
        ctx.lineWidth = layer ? 1 : 1.6
        ctx.stroke()
      }
      phase += reduce ? 0 : 0.012
      raf = requestAnimationFrame(draw)
    }

    const stopResize = observeResize(canvas, resize)
    draw()

    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) raf = requestAnimationFrame(draw)
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      stopResize()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
