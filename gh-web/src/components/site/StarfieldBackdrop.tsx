import { useEffect, useRef } from 'react'

type Star = {
  x: number
  y: number
  r: number
  a: number
  p: number
  s: number
  c: [number, number, number]
  glow: boolean
}

type Layer = { items: Star[]; depth: number }

/**
 * 页面级星空背景（Canvas 2D，无第三方依赖）。
 *
 * 取自 Center 页的星空画法，抽成组件复用：三层星点按视口面积生成，
 * 亮度走幂律（大量暗星 + 少量亮星），簇状分布打散网格感；
 * 逐帧只做「忽闪 + 分层鼠标/滚动视差」，不重排、不触发 React 更新。
 * 视口外（滚过背景区）暂停绘制；prefers-reduced-motion 只画一帧静态星图。
 */
export function StarfieldBackdrop({ className = '' }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const host = hostRef.current
    const cvs = canvasRef.current
    if (!host || !cvs) return
    const ctx = cvs.getContext('2d')
    if (!ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const palette: Array<[number, number, number]> = [
      [198, 226, 255],
      [226, 240, 255],
      [255, 242, 224],
    ]

    let layers: Layer[] = []
    let w = 0
    let h = 0
    let raf = 0

    const mouse = { x: 0, y: 0 }
    let scrollY = 0

    /** 生成一层星点：按幂律控制亮度，并用簇状分布打散网格感 */
    const makeLayer = (
      count: number,
      rMin: number,
      rMax: number,
      aMin: number,
      aMax: number,
      depth: number,
      speed: number,
    ): Layer => {
      const clusters = [
        [0.16, 0.22],
        [0.74, 0.3],
        [0.46, 0.78],
        [0.88, 0.14],
      ]
      const items: Star[] = []
      for (let i = 0; i < count; i += 1) {
        let x: number
        let y: number
        if (Math.random() < 0.38) {
          const c = clusters[Math.floor(Math.random() * clusters.length)]
          x = (c[0] + (Math.random() - 0.5) * 0.16) * w
          y = (c[1] + (Math.random() - 0.5) * 0.16) * h
        } else {
          x = Math.random() * w
          y = Math.random() * h
        }
        const t = Math.random()
        items.push({
          x: ((x % w) + w) % w,
          y: ((y % h) + h) % h,
          r: rMin + Math.random() * (rMax - rMin),
          a: aMin + Math.pow(t, 1.7) * (aMax - aMin),
          p: Math.random() * 6.283,
          s: speed * (0.6 + Math.random() * 0.9),
          c: palette[Math.floor(Math.random() * palette.length)],
          glow: Math.random() > 0.94,
        })
      }
      return { items, depth }
    }

    /** 按容器实际尺寸重建画布与三层星点（DPR 上限 2） */
    const resize = () => {
      w = host.clientWidth
      h = host.clientHeight
      if (!w || !h) return
      cvs.width = w * dpr
      cvs.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const area = w * h
      layers = [
        makeLayer(Math.round(Math.min(560, area / 2600)), 0.25, 0.75, 0.16, 0.42, 0.35, 700),
        makeLayer(Math.round(Math.min(240, area / 6200)), 0.55, 1.15, 0.28, 0.62, 0.7, 560),
        makeLayer(Math.round(Math.min(90, area / 16500)), 0.9, 1.75, 0.42, 0.85, 1, 440),
      ]
      draw(performance.now())
    }

    /** 逐帧绘制：每颗星独立忽闪 + 分层视差 + 极轻的整体呼吸 */
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      const breath = 0.98 + 0.02 * Math.sin(t / 5200)
      for (let li = 0; li < layers.length; li += 1) {
        const layer = layers[li]
        const layerBreath = 0.99 + 0.01 * Math.sin(t / 5200 + li * 1.7)
        for (const s of layer.items) {
          const raw = 0.5 + 0.5 * Math.sin(t / s.s + s.p)
          const tw = 0.42 + 0.58 * raw * raw
          let x = s.x + mouse.x * layer.depth * 18
          let y = s.y + mouse.y * layer.depth * 10 - scrollY * layer.depth * 0.05
          y = ((y % h) + h) % h
          x = ((x % w) + w) % w
          const alpha = s.a * tw * breath * layerBreath
          const rgb = `${s.c[0]},${s.c[1]},${s.c[2]}`
          if (s.glow) {
            ctx.beginPath()
            ctx.arc(x, y, s.r * 3.2, 0, 6.283)
            ctx.fillStyle = `rgba(${rgb},${(alpha * 0.07).toFixed(3)})`
            ctx.fill()
            if (tw > 0.9) {
              const flare = (tw - 0.9) / 0.1
              ctx.strokeStyle = `rgba(${rgb},${(alpha * 0.22 * flare).toFixed(3)})`
              ctx.lineWidth = 0.6
              ctx.beginPath()
              ctx.moveTo(x - s.r * 5, y)
              ctx.lineTo(x + s.r * 5, y)
              ctx.moveTo(x, y - s.r * 5)
              ctx.lineTo(x, y + s.r * 5)
              ctx.stroke()
            }
          }
          ctx.beginPath()
          ctx.arc(x, y, s.r, 0, 6.283)
          ctx.fillStyle = `rgba(${rgb},${alpha.toFixed(3)})`
          ctx.fill()
        }
      }
    }

    const loop = (t: number) => {
      // 跑出背景区后停止重绘，滚回顶部再继续
      if (scrollY < h + 200) draw(t)
      raf = window.requestAnimationFrame(loop)
    }

    const onMouse = (event: MouseEvent) => {
      mouse.x = event.clientX / window.innerWidth - 0.5
      mouse.y = event.clientY / window.innerHeight - 0.5
    }
    const onScroll = () => {
      scrollY = window.scrollY
    }
    const onResize = () => resize()

    resize()
    window.addEventListener('resize', onResize)
    if (reduce) return () => window.removeEventListener('resize', onResize)

    window.addEventListener('mousemove', onMouse, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    raf = window.requestAnimationFrame(loop)
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div className={`wp-starfield ${className}`.trim()} ref={hostRef} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
