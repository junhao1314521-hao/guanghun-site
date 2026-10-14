/**
 * 首屏「流动方块」代码动画背景（Canvas）。
 *
 * 需求（改版需求汇总 §13）：
 * - 首屏海报第一张固定为**代码动画**（不受媒体槽规则限制），呈现「流动方块」的科技感；
 * - 深色底 + 品牌蓝，鼠标靠近高亮、点击汇聚；
 * - 遵循「减少动态效果」：只绘制一帧静态画面，不做动画；
 * - 复用：登录 / 注册页左侧主视觉同一份动效（`AuthShell`）。
 *
 * 实现要点（性能友好）：
 * - 网格化方块，能量值做缓动 → 形成「流动/拖尾」观感，不依赖像素累积；
 * - 双重斜向行波 + 中心径向脉冲叠加，避免规律感；
 * - devicePixelRatio 上限 1.5、约 30fps 节流；页面隐藏时暂停。
 */
import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../../lib/motion'

/** 单格边长（px，含间距）：越小越密、开销越大。取 18 形成细颗粒的「数据方块」观感 */
const CELL = 18
/** 方块与格子的间隙（px）：颗粒越细，间隙同步收窄 */
const GAP = 6
/** 方块圆角（px） */
const RADIUS = 3
/** 目标帧间隔（ms）：≈30fps，兼顾流畅与开销 */
const FRAME_MS = 33

export function CodeBackdrop({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = prefersReducedMotion()
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let width = 0
    let height = 0
    let cols = 0
    let rows = 0
    /** 每格当前亮度（0..1）：缓动形成流动拖尾 */
    let energy = new Float32Array(0)
    let raf = 0
    let last = 0
    const pointer = { x: -1, y: -1 }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.max(1, Math.ceil(width / CELL))
      rows = Math.max(1, Math.ceil(height / CELL))
      energy = new Float32Array(cols * rows)
    }

    /** 圆角矩形（兼容不支持 roundRect 的环境） */
    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath()
        ctx.roundRect(x, y, w, h, r)
        return
      }
      const rr = Math.min(r, w / 2, h / 2)
      ctx.beginPath()
      ctx.moveTo(x + rr, y)
      ctx.arcTo(x + w, y, x + w, y + h, rr)
      ctx.arcTo(x + w, y + h, x, y + h, rr)
      ctx.arcTo(x, y + h, x, y, rr)
      ctx.arcTo(x, y, x + w, y, rr)
      ctx.closePath()
    }

    const paint = (timeMs: number, advance: boolean) => {
      // 底色铺满（深色科技底；hero 与登录页同为深色语境）
      ctx.fillStyle = '#070A16'
      ctx.fillRect(0, 0, width, height)

      const t = timeMs / 1000
      const cx = cols / 2
      const cy = rows / 2
      const size = CELL - GAP

      for (let gy = 0; gy < rows; gy += 1) {
        for (let gx = 0; gx < cols; gx += 1) {
          const i = gy * cols + gx
          // 归一化坐标
          const nx = gx / cols
          const ny = gy / rows

          // 两道斜向行波（不同频率与方向）叠加，形成流动感
          const w1 = Math.sin((nx + ny) * 6.2 - t * 1.3)
          const w2 = Math.sin((nx - ny) * 3.6 + t * 0.9)
          // 中心径向脉冲（呼吸）
          const dx = gx - cx
          const dy = gy - cy
          const radial = Math.sin(Math.sqrt(dx * dx + dy * dy) * 0.5 - t * 1.6)

          let target = (w1 + w2) * 0.18 + radial * 0.16 + 0.5
          if (target < 0) target = 0
          else if (target > 1) target = 1

          // 指针靠近：局部提亮（鼠标交互）
          if (pointer.x >= 0) {
            const px = gx * CELL + size / 2
            const py = gy * CELL + size / 2
            const d = Math.hypot(px - pointer.x, py - pointer.y)
            if (d < 130) target = Math.min(1, target + (1 - d / 130) * 0.75)
          }

          // 能量缓动：亮起 → 缓慢回落，形成流动拖尾
          if (advance) energy[i] += (target - energy[i]) * 0.16
          else energy[i] = target
          const e = energy[i]

          // 低能量格保留极淡的「网格底」，保证结构感
          const alpha = 0.05 + e * 0.6
          const bright = e > 0.62
          ctx.fillStyle = bright
            ? `rgba(150, 182, 255, ${Math.min(0.95, alpha)})`
            : `rgba(74, 99, 242, ${alpha})`

          const x = gx * CELL
          const y = gy * CELL
          roundRect(x, y, size, size, RADIUS)
          ctx.fill()
        }
      }
    }

    resize()

    if (reduced) {
      // 静态：绘制一帧（时间固定），窗口尺寸变化时重绘
      paint(0, false)
      const onResize = () => {
        resize()
        paint(0, false)
      }
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }

    const loop = (now: number) => {
      raf = window.requestAnimationFrame(loop)
      if (now - last < FRAME_MS) return
      last = now
      paint(now, true)
    }
    raf = window.requestAnimationFrame(loop)

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = event.clientX - rect.left
      pointer.y = event.clientY - rect.top
    }
    const onLeave = () => {
      pointer.x = -1
      pointer.y = -1
    }
    /** 点击：以点击格为中心，一圈方格瞬间点亮（聚拢脉冲） */
    const onClick = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const cxg = Math.floor((event.clientX - rect.left) / CELL)
      const cyg = Math.floor((event.clientY - rect.top) / CELL)
      for (let gy = cyg - 2; gy <= cyg + 2; gy += 1) {
        for (let gx = cxg - 2; gx <= cxg + 2; gx += 1) {
          if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) continue
          if (Math.hypot(gx - cxg, gy - cyg) > 2.5) continue
          energy[gy * cols + gx] = 1
        }
      }
    }
    const onVisibility = () => {
      window.cancelAnimationFrame(raf)
      if (!document.hidden) {
        last = 0
        raf = window.requestAnimationFrame(loop)
      }
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
