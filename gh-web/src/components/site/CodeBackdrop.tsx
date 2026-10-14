/**
 * 可交互的「代码雨」背景（Canvas）。
 * - 用于登录 / 注册页左侧主视觉：品牌蓝代码字符持续下落，鼠标靠近处高亮、点击处汇聚。
 * - 遵循「减少动态效果」：此时只绘制一帧静态画面，不做动画。
 * - 自适应 devicePixelRatio；页面隐藏时暂停，避免无谓耗电。
 */
import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../../lib/motion'

const GLYPHS = '01アイウエオカキクケコサシスセソタチツテト{}<>/*#@$%&abcdefABCDEF+-='
const FONT_SIZE = 15
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

export function CodeBackdrop({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = prefersReducedMotion()
    let width = 0
    let height = 0
    let cols = 0
    let drops: number[] = []
    let speeds: number[] = []
    let raf = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const pointer = { x: -1, y: -1 }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.font = `${FONT_SIZE}px ${MONO}`
      cols = Math.max(1, Math.floor(width / FONT_SIZE))
      // 静态模式下把字符铺满整屏（无下落动画）
      drops = Array.from({ length: cols }, () => (reduced ? Math.random() * (height / FONT_SIZE) : Math.random() * -50))
      speeds = Array.from({ length: cols }, () => 0.35 + Math.random() * 0.85)
    }

    const paint = (advance: boolean) => {
      // 半透明覆盖形成拖尾；底色与左侧深色背景一致
      ctx.fillStyle = 'rgba(7, 10, 22, 0.22)'
      ctx.fillRect(0, 0, width, height)
      for (let i = 0; i < cols; i += 1) {
        const x = i * FONT_SIZE
        const y = drops[i] * FONT_SIZE
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        const near = pointer.x >= 0 && Math.abs(pointer.x - x) < 64 && Math.abs(pointer.y - y) < 90
        ctx.fillStyle = near ? 'rgba(150,180,255,0.95)' : 'rgba(74,99,242,0.5)'
        ctx.fillText(glyph, x, y)
        if (!advance) continue
        if (y > height && Math.random() > 0.975) drops[i] = 0
        drops[i] += speeds[i]
      }
    }

    resize()

    if (reduced) {
      paint(false)
      const onResize = () => {
        resize()
        paint(false)
      }
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }

    const loop = () => {
      paint(true)
      raf = window.requestAnimationFrame(loop)
    }
    // 首帧先铺满，避免从上往下逐渐出现
    ctx.fillStyle = '#070A16'
    ctx.fillRect(0, 0, width, height)
    drops = drops.map(() => Math.random() * (height / FONT_SIZE))
    loop()

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = event.clientX - rect.left
      pointer.y = event.clientY - rect.top
    }
    const onLeave = () => {
      pointer.x = -1
      pointer.y = -1
    }
    const onClick = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const col = Math.floor((event.clientX - rect.left) / FONT_SIZE)
      for (let i = col - 3; i <= col + 3; i += 1) if (i >= 0 && i < cols) drops[i] = 0
    }
    const onVisibility = () => {
      window.cancelAnimationFrame(raf)
      if (!document.hidden) loop()
    }

    const parent = canvas.parentElement ?? canvas
    parent.addEventListener('pointermove', onMove)
    parent.addEventListener('pointerleave', onLeave)
    parent.addEventListener('pointerdown', onClick)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.cancelAnimationFrame(raf)
      parent.removeEventListener('pointermove', onMove)
      parent.removeEventListener('pointerleave', onLeave)
      parent.removeEventListener('pointerdown', onClick)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} className={`code-backdrop ${className}`} aria-hidden="true" />
}
