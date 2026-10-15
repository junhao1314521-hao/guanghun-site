/**
 * 「流动方块」代码动画背景（Canvas）。
 *
 * 用途：
 * - 首屏海报第一张固定为**代码动画**（不受媒体槽规则限制），呈现「流动方块」的科技感；
 * - 登录 / 注册页左侧主视觉；
 * - 页脚背景（与海报同款）。
 *
 * 交互与观感：
 * - 底色 + 品牌蓝，指针靠近高亮、点击汇聚，并每隔几秒自动来一次聚拢脉冲；
 * - **双主题**：深色底（默认）与浅色底（浅色站点主题下的首屏海报）；
 * - 遵循「减少动态效果」：只绘制一帧静态画面，不做动画。
 *
 * 性能与流畅度（本轮重点）：
 * - 目标 **60fps**（此前 30fps，与页面其余 60fps 内容不同步 → 观感「卡顿」）；
 * - 帧率自适配：单帧耗时偏高时自动降为隔帧绘制，避免弱机上反而更卡；
 * - 缓动改为**帧率无关**（按时间常数），不同刷新率下速度一致、更顺；
 * - 颜色预生成调色板（按能量档位），避免逐格拼接字符串造成的抖动；
 * - 波形空间频率下调，块与块之间过渡更柔和、更像「流动」。
 */
import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../../lib/motion'

/**
 * 单格边长（px，含间距）：越小越密、开销越大。
 * - 桌面取 10：比 12 再细一档，颗粒更精致、流动层更细腻；
 * - 窄屏（≤767px）取 8：手机可视宽度小，沿用 10 会让方块偏大。
 */
const CELL_DESKTOP = 10
const CELL_NARROW = 8
/** 移动端断点（与全站 CSS 断点一致） */
const NARROW_MAX = 767
/** 目标帧间隔（ms）：≈60fps */
const FRAME_MS = 16
/** 自动脉冲间隔（ms）：指针静止时也让画面保有「活性」 */
const AUTO_PULSE_MS = 6500
/** 能量档位数量：颜色字符串预生成，逐格只做查表 */
const STEPS = 24
/** 能量缓动时间常数（s）：越小越跟手，越大越「拖尾」 */
const EASE_TAU = 0.19
/** 指针影响半径（px） */
const POINTER_RADIUS = 150

/** 配色方案：深色底用亮色方块，浅色底用品牌蓝实色方块；颜色按能量档位预生成 */
type Palette = {
  /** 画布底色 */
  bg: string
  /** 常规格（低能量） */
  normal: string[]
  /** 高能量格 */
  hot: string[]
}

function buildPalette(dark: boolean): Palette {
  const normal: string[] = []
  const hot: string[] = []
  for (let i = 0; i < STEPS; i += 1) {
    const e = i / (STEPS - 1)
    const alpha = 0.05 + e * 0.6
    normal.push(dark ? `rgba(74, 99, 242, ${alpha})` : `rgba(32, 64, 237, ${alpha * 0.4})`)
    hot.push(
      dark
        ? `rgba(150, 182, 255, ${Math.min(0.95, alpha)})`
        : `rgba(26, 51, 196, ${Math.min(0.8, alpha * 0.8)})`,
    )
  }
  return { bg: dark ? '#070A16' : '#F2F5FD', normal, hot }
}

/** 能量 → 调色板档位（0..STEPS-1） */
function stepOf(energy: number): number {
  if (energy <= 0) return 0
  if (energy >= 1) return STEPS - 1
  return (energy * STEPS) | 0
}

/**
 * 「流动方块」代码动画背景（Canvas）。
 *
 * @param theme 配色主题：'dark'（默认）/ 'light'（浅色站点主题下的首屏海报）
 */
export function CodeBackdrop({ className = '', theme = 'dark' }: { className?: string; theme?: 'light' | 'dark' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const palette = buildPalette(theme === 'dark')

    const reduced = prefersReducedMotion()
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let width = 0
    let height = 0
    let cols = 0
    let rows = 0
    /** 当前颗粒尺寸（随容器宽度切换：桌面 / 窄屏两档） */
    let cell = CELL_DESKTOP
    let gap = CELL_DESKTOP * 0.24
    /** 每格当前亮度（0..1）：缓动形成流动拖尾 */
    let energy = new Float32Array(0)
    /** 海报是否在视口内（不在则跳过绘制与自动脉冲） */
    let inView = true
    let raf = 0
    let last = 0
    /** 帧率自适配：单帧耗时均值偏高时降为隔帧（throttle=2） */
    let throttle = 1
    let costAvg = 8
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
      gap = cell * 0.24
      cols = Math.max(1, Math.ceil(width / cell))
      rows = Math.max(1, Math.ceil(height / cell))
      energy = new Float32Array(cols * rows)
    }

    /** 以 (cxg, cyg) 格为中心，柔和地「点亮」周边（径向衰减，避免生硬的方块脉冲） */
    const pulse = (cxg: number, cyg: number, strength = 1) => {
      const R = 3.4
      const y0 = Math.max(0, Math.floor(cyg - R))
      const y1 = Math.min(rows - 1, Math.ceil(cyg + R))
      const x0 = Math.max(0, Math.floor(cxg - R))
      const x1 = Math.min(cols - 1, Math.ceil(cxg + R))
      for (let gy = y0; gy <= y1; gy += 1) {
        for (let gx = x0; gx <= x1; gx += 1) {
          const d = Math.hypot(gx - cxg, gy - cyg)
          if (d > R) continue
          const f = 1 - d / R
          const value = f * f * strength
          const i = gy * cols + gx
          if (energy[i] < value) energy[i] = value
        }
      }
    }

    /** 自动脉冲：在安全区内随机取格，避免总是同一处闪 */
    const autoPulse = () => {
      if (cols < 6 || rows < 6) return
      pulse(2 + Math.floor(Math.random() * (cols - 4)), 2 + Math.floor(Math.random() * (rows - 4)))
    }

    const paint = (timeMs: number, dt: number) => {
      // 底色铺满（深色科技底 / 浅色净底，由主题决定）
      ctx.fillStyle = palette.bg
      ctx.fillRect(0, 0, width, height)

      const t = timeMs / 1000
      const cx = cols / 2
      const cy = rows / 2
      const size = cell - gap
      // 帧率无关缓动系数（dt<=0 时为静态帧：直接取目标值）
      const k = dt > 0 ? 1 - Math.exp(-dt / EASE_TAU) : 1
      const advance = dt > 0

      for (let gy = 0; gy < rows; gy += 1) {
        for (let gx = 0; gx < cols; gx += 1) {
          const i = gy * cols + gx
          // 归一化坐标
          const nx = gx / cols
          const ny = gy / rows

          // 两道斜向行波（更低空间频率 → 过渡更柔和）+ 中心径向呼吸
          const w1 = Math.sin((nx + ny) * 4.6 - t * 1.05)
          const w2 = Math.sin((nx - ny) * 3.1 + t * 0.8)
          const dx = gx - cx
          const dy = gy - cy
          const radial = Math.sin(Math.sqrt(dx * dx + dy * dy) * 0.36 - t * 1.25)

          let target = (w1 + w2) * 0.19 + radial * 0.15 + 0.5
          if (target < 0) target = 0
          else if (target > 1) target = 1

          // 指针靠近：局部平滑提亮（smoothstep 衰减，避免边缘出现硬圈）
          if (pointer.x >= 0) {
            const px = gx * cell + size / 2
            const py = gy * cell + size / 2
            const d = Math.hypot(px - pointer.x, py - pointer.y)
            if (d < POINTER_RADIUS) {
              const f = 1 - d / POINTER_RADIUS
              target = Math.min(1, target + f * f * (3 - 2 * f) * 0.8)
            }
          }

          // 能量缓动：亮起 → 缓慢回落，形成流动拖尾
          if (advance) energy[i] += (target - energy[i]) * k
          else energy[i] = target
          const e = energy[i]

          ctx.fillStyle = (e > 0.62 ? palette.hot : palette.normal)[stepOf(e)]
          ctx.fillRect(gx * cell, gy * cell, size, size)
        }
      }
    }

    resize()

    if (reduced) {
      // 静态：绘制一帧（时间固定），窗口尺寸变化时重绘
      paint(0, 0)
      const onResize = () => {
        resize()
        paint(0, 0)
      }
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }

    const loop = (now: number) => {
      raf = window.requestAnimationFrame(loop)
      // 海报滚出视口后跳过绘制：首页往下读时不必再为空画面耗电
      if (!inView) return
      if (now - last < FRAME_MS * throttle) return
      const dt = last ? Math.min(0.05, (now - last) / 1000 / throttle) : 0.016
      last = now
      const started = performance.now()
      paint(now, dt)
      // 帧率自适配：单帧耗时偏高 → 隔帧绘制；回落 → 恢复满帧
      costAvg += (performance.now() - started - costAvg) * 0.1
      if (costAvg > 13) throttle = 2
      else if (costAvg < 7) throttle = 1
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
    /** 点击 / 触摸：以落点格为中心来一次柔和的聚拢脉冲 */
    const onClick = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pulse(Math.floor((event.clientX - rect.left) / cell), Math.floor((event.clientY - rect.top) / cell), 1)
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
