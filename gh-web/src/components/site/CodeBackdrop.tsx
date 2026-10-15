/**
 * 首屏「流动方块」代码动画背景（Canvas）。
 *
 * 需求（改版需求汇总 §13）：
 * - 首屏海报第一张固定为**代码动画**（不受媒体槽规则限制），呈现「流动方块」的科技感；
 * - 底色 + 品牌蓝，鼠标靠近高亮、点击汇聚，并每隔几秒自动来一次聚拢脉冲；
 * - **双主题**：深色底（默认，登录 / 注册页左侧主视觉）与浅色底（浅色站点主题下的首屏海报）；
 * - 遵循「减少动态效果」：只绘制一帧静态画面，不做动画。
 *
 * 实现要点（性能友好）：
 * - 网格化方块，能量值做缓动 → 形成「流动/拖尾」观感，不依赖像素累积；
 * - 双重斜向行波 + 中心径向脉冲叠加，避免规律感；
 * - devicePixelRatio 上限 1.5、约 30fps 节流；页面隐藏时暂停。
 */
import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../../lib/motion'

/**
 * 单格边长（px，含间距）：越小越密、开销越大。
 * - 桌面取 12：比 14 更细一档，颗粒更精致（列数提升约 35%，30fps 仍有余量）；
 * - 窄屏（≤767px）取 10：手机可视宽度小，沿用 12 会让方块显得大而糙，
 *   缩到 10 才能排出三十几列、看得出流动层。
 */
const CELL_DESKTOP = 12
const CELL_NARROW = 10
/** 移动端断点（与全站 CSS 断点一致） */
const NARROW_MAX = 767
/** 目标帧间隔（ms）：≈30fps，兼顾流畅与开销 */
const FRAME_MS = 33
/** 自动脉冲间隔（ms）：指针静止时也让画面保有「活性」 */
const AUTO_PULSE_MS = 6500

/** 配色方案：深色底用亮色方块，浅色底用品牌蓝实色方块 */
type Palette = {
  /** 画布底色 */
  bg: string
  /** 常规格（低能量） */
  cell: (alpha: number) => string
  /** 高能量格 */
  cellHot: (alpha: number) => string
}

const PALETTES: Record<'light' | 'dark', Palette> = {
  dark: {
    bg: '#070A16',
    cell: (alpha) => `rgba(74, 99, 242, ${alpha})`,
    cellHot: (alpha) => `rgba(150, 182, 255, ${Math.min(0.95, alpha)})`,
  },
  light: {
    bg: '#F2F5FD',
    cell: (alpha) => `rgba(32, 64, 237, ${alpha * 0.4})`,
    cellHot: (alpha) => `rgba(26, 51, 196, ${Math.min(0.8, alpha * 0.8)})`,
  },
}

/**
 * 首屏「流动方块」代码动画背景（Canvas）。
 *
 * @param theme 配色主题：'dark'（默认，登录 / 注册页主视觉）/ 'light'（浅色站点主题下的首屏海报）
 */
export function CodeBackdrop({ className = '', theme = 'dark' }: { className?: string; theme?: 'light' | 'dark' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const palette = PALETTES[theme]

    const reduced = prefersReducedMotion()
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let width = 0
    let height = 0
    let cols = 0
    let rows = 0
    /** 当前颗粒尺寸（随容器宽度切换，桌面 / 窄屏两档） */
    let cell = CELL_DESKTOP
    let gap = CELL_DESKTOP * 0.28
    let radius = CELL_DESKTOP * 0.14
    /** 每格当前亮度（0..1）：缓动形成流动拖尾 */
    let energy = new Float32Array(0)
    /** 海报是否在视口内（不在则跳过绘制与自动脉冲） */
    let inView = true
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
      // 颗粒尺寸跟随容器宽度：窄屏用更小的格子，避免大颗粒显得粗糙
      cell = width <= NARROW_MAX ? CELL_NARROW : CELL_DESKTOP
      gap = cell * 0.28
      radius = cell * 0.14
      cols = Math.max(1, Math.ceil(width / cell))
      rows = Math.max(1, Math.ceil(height / cell))
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

    /** 以 (cxg, cyg) 格为中心，5×5 范围内瞬间点亮（聚拢脉冲，随后按能量缓动回落） */
    const pulse = (cxg: number, cyg: number) => {
      for (let gy = cyg - 2; gy <= cyg + 2; gy += 1) {
        for (let gx = cxg - 2; gx <= cxg + 2; gx += 1) {
          if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) continue
          if (Math.hypot(gx - cxg, gy - cyg) > 2.5) continue
          energy[gy * cols + gx] = 1
        }
      }
    }

    /** 自动脉冲：在安全区内随机取格，避免总是同一处闪 */
    const autoPulse = () => {
      if (cols < 6 || rows < 6) return
      pulse(2 + Math.floor(Math.random() * (cols - 4)), 2 + Math.floor(Math.random() * (rows - 4)))
    }

    const paint = (timeMs: number, advance: boolean) => {
      // 底色铺满（深色科技底 / 浅色净底，由主题决定）
      ctx.fillStyle = palette.bg
      ctx.fillRect(0, 0, width, height)

      const t = timeMs / 1000
      const cx = cols / 2
      const cy = rows / 2
      const size = cell - gap

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
            const px = gx * cell + size / 2
            const py = gy * cell + size / 2
            const d = Math.hypot(px - pointer.x, py - pointer.y)
            if (d < 100) target = Math.min(1, target + (1 - d / 100) * 0.75)
          }

          // 能量缓动：亮起 → 缓慢回落，形成流动拖尾
          if (advance) energy[i] += (target - energy[i]) * 0.16
          else energy[i] = target
          const e = energy[i]

          // 低能量格保留极淡的「网格底」，保证结构感
          const alpha = 0.05 + e * 0.6
          const bright = e > 0.62
          ctx.fillStyle = bright ? palette.cellHot(alpha) : palette.cell(alpha)

          const x = gx * cell
          const y = gy * cell
          roundRect(x, y, size, size, radius)
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
      // 海报滚出视口后跳过绘制：首页往下读时不必再为空画面耗电
      if (!inView) return
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
    /** 点击 / 触摸：以落点格为中心来一次聚拢脉冲 */
    const onClick = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pulse(Math.floor((event.clientX - rect.left) / cell), Math.floor((event.clientY - rect.top) / cell))
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

    // 自动脉冲与绘制都只在海报进入视口时进行（滚出视口即停，避免无谓开销），
    // 重新进入视口时先来一次「入场脉冲」。
    let pulseTimer = 0
    const startAutoPulse = () => {
      if (pulseTimer) return
      autoPulse()
      pulseTimer = window.setInterval(autoPulse, AUTO_PULSE_MS)
    }
    const stopAutoPulse = () => {
      if (!pulseTimer) return
      window.clearInterval(pulseTimer)
      pulseTimer = 0
    }
    const observer =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            ([entry]) => {
              inView = entry.isIntersecting
              if (inView) {
                last = 0
                startAutoPulse()
              } else {
                stopAutoPulse()
              }
            },
            { threshold: 0.35 },
          )
        : null
    observer?.observe(canvas)

    return () => {
      window.cancelAnimationFrame(raf)
      stopAutoPulse()
      observer?.disconnect()
      parent.removeEventListener('pointermove', onMove)
      parent.removeEventListener('pointerleave', onLeave)
      parent.removeEventListener('pointerdown', onClick)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [theme])

  return <canvas ref={canvasRef} className={`code-backdrop ${className}`} aria-hidden="true" />
}
