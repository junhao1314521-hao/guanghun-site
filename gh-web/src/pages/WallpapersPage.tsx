import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { Link } from 'react-router-dom'
import {
  fetchWallpapers,
  type WallpaperItem,
  type WallpaperTheme,
  type WallpaperVariant,
} from '../api/wallpapers'
import { useApi } from '../hooks/useApi'
import { usePageEffects } from '../hooks/usePageEffects'
import '../styles/wallpapers.css'

/** 筛选值：「全部」或某个主题 */
const ALL = 'all' as const
type Filter = typeof ALL | WallpaperTheme

/** 弹层当前浏览集合：featured 入口与网格入口可能使用不同列表 */
type View = { list: WallpaperItem[]; index: number } | null

/** 图片加载失败时的矢量回退（不在页面上留破图） */
const FALLBACK_IMAGE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#0d1020"/><stop offset="1" stop-color="#1b2350"/>' +
    '</linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/>' +
    '<path d="M800 320l118 118-118 118-118-118z" fill="none" stroke="#5b75f5" stroke-opacity=".45" stroke-width="10"/>' +
    '<text x="800" y="650" fill="#8fa0c8" font-family="sans-serif" font-size="34" text-anchor="middle">壁纸预览暂不可用</text>' +
    '</svg>',
)}`

/** 记录一次回退后不再重复赋值，避免死循环 */
function onImgError(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget
  if (img.dataset.fallback === '1') return
  img.dataset.fallback = '1'
  img.src = FALLBACK_IMAGE
}

/** 可用下载尺寸；老数据没有 variants 时回落到原图单档 */
function variantsOf(item: WallpaperItem): WallpaperVariant[] {
  if (item.variants && item.variants.length > 0) return item.variants
  return [
    {
      key: 'original',
      label: `${item.width}×${item.height}`,
      width: item.width,
      height: item.height,
      url: item.fileUrl,
      size: item.size,
    },
  ]
}

/** 最高可用尺寸（服务端已按像素从大到小返回） */
function topVariant(item: WallpaperItem): WallpaperVariant {
  return variantsOf(item)[0]
}

/** 设备尺寸分组：按最高档位的宽高比归类，作为「先选设备」的筛选口径 */
type RatioKey = 'all' | '16:9' | '21:9' | '9:16' | '4:3'
const RATIO_OPTIONS: Array<{ key: RatioKey; label: string; hint: string }> = [
  { key: 'all', label: '全部', hint: '不限设备' },
  { key: '16:9', label: '16:9', hint: '桌面 / 笔记本' },
  { key: '21:9', label: '21:9', hint: '带鱼屏' },
  { key: '9:16', label: '9:16', hint: '手机竖屏' },
  { key: '4:3', label: '4:3', hint: '平板' },
]

/** 各分组的基准宽高比（用于把任意素材归到最接近的一档） */
const RATIO_TARGETS: Array<{ key: Exclude<RatioKey, 'all'>; value: number }> = [
  { key: '16:9', value: 16 / 9 },
  { key: '21:9', value: 21 / 9 },
  { key: '9:16', value: 9 / 16 },
  { key: '4:3', value: 4 / 3 },
]

/**
 * 壁纸的尺寸分组：把素材最高档位的宽高比归到最接近的基准档。
 * 用对数距离而不是固定阈值——32:9 归入 21:9 超宽、4:5 归入 9:16 竖屏，
 * 上传新比例素材时不需要改代码，只会在最接近的分组里出现。
 */
function ratioOf(item: WallpaperItem): Exclude<RatioKey, 'all'> {
  const top = topVariant(item)
  if (!top.width || !top.height) return '16:9'
  const ratio = top.width / top.height
  return RATIO_TARGETS.reduce((best, target) =>
    Math.abs(Math.log(ratio / target.value)) < Math.abs(Math.log(ratio / best.value)) ? target : best,
  ).key
}

/** 文件是否可下载（服务端探测为 missing 时禁用） */
function downloadable(item: WallpaperItem): boolean {
  return item.fileStatus !== 'missing'
}

/** 下载文件名：品牌前缀 + 标题 + 尺寸，落地后可直接辨认 */
function downloadName(item: WallpaperItem, variant: WallpaperVariant): string {
  return `光魂壁纸-${item.title}-${variant.label}.jpg`
}

/** 复制文本：优先 Clipboard API，HTTP / 旧浏览器回退 execCommand */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 非安全上下文（http）或权限拒绝，走兜底
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

function ArrowIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 水平步距 = 0.55 × 卡宽：环形排列必然近邻重叠，前后遮挡本身就是纵深线索 */
const ARC_STEP = 0.55
/** 弧线下沉：y = 18 × |k|^1.15（px），向外逐级下坠 */
const ARC_DROP = 18
/** 每张卡的向内旋转角度（度），|k| 越大越转向弧心 */
const ARC_TILT = 44
/** 超出该距离的卡片完全淡出并移出焦点顺序 */
const ARC_FADE_END = 2.6

/**
 * 环绕式封面流：卡片沿一条向内收拢的弧面排布，中心卡最大、最高、正对镜头，
 * 两侧卡片逐级下沉、缩小并转向弧心，形成把中心卡包住的半环。
 *
 * 位置只由连续量 `pos`（浮点索引）决定：第 i 张卡的环绕距离 k = i - pos（取最短），
 * 再按 `x = k·0.55W`、`y = 18|k|^1.15`、`rotateY = -44k` 落位。
 * 交互：Pointer Events 拖拽（含 200ms 惯性、最多跳 3 张、420–650ms 缓出吸附）、
 * 点侧卡居中、点中心卡放大、← → / Home / End、横向或 Shift 滚轮。
 */
function WallpaperArc({
  items,
  active,
  onSelect,
  onOpen,
}: {
  items: WallpaperItem[]
  active: number
  onSelect: (index: number) => void
  onOpen: (index: number, opener: HTMLElement) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([])
  const widthRef = useRef(0)
  const posRef = useRef(0)
  const rafRef = useRef(0)
  const animRef = useRef<{ from: number; to: number; start: number; dur: number } | null>(null)
  const dragRef = useRef<{
    id: number
    x: number
    y: number
    base: number
    axis: 'x' | 'y' | null
    moved: number
    card: number | null
    samples: Array<{ x: number; t: number }>
  } | null>(null)
  const wheelAt = useRef(0)
  const interacted = useRef(false)
  const [dragging, setDragging] = useState(false)

  const count = items.length
  const countRef = useRef(count)
  countRef.current = count
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect
  const openRef = useRef(onOpen)
  openRef.current = onOpen

  /** 把连续位置写进每张卡的 transform / 透明度 / 焦点顺序 */
  const layout = useCallback((pos: number) => {
    const total = countRef.current
    const cardW = widthRef.current
    if (!total || !cardW) return
    cardRefs.current.forEach((el, index) => {
      if (!el) return
      let k = index - pos
      k = ((k % total) + total) % total
      if (k > total / 2) k -= total
      const abs = Math.abs(k)
      // 环形几何：x 线性逼近、z 逐级后退、rotateY 内转。
      // 缩放交给 perspective 计算，不再手写 scale，卡片才会真的“退到空间里”。
      const x = k * ARC_STEP * cardW
      const y = ARC_DROP * Math.pow(abs, 1.15)
      const z = 30 - abs * 0.5 * cardW
      const tilt = Math.max(-88, Math.min(88, -ARC_TILT * k))
      const visible = abs < ARC_FADE_END
      // --w 是「居中权重」：中心 1、两侧递减，用于插值描边、亮度与景深压暗
      const weight = Math.max(0, 1 - abs / 2.2)
      el.style.transform =
        `translate(-50%, 0) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) ` +
        `rotateY(${tilt.toFixed(2)}deg)`
      el.style.opacity = visible ? String(Math.min(1, (ARC_FADE_END - abs) / 1)) : '0'
      el.style.visibility = visible ? 'visible' : 'hidden'
      el.style.pointerEvents = visible ? '' : 'none'
      el.style.zIndex = String(200 - Math.round(abs * 10))
      el.style.setProperty('--w', weight.toFixed(3))
      el.tabIndex = visible ? 0 : -1
      el.setAttribute('aria-hidden', visible ? 'false' : 'true')
    })
  }, [])

  const stopAnim = () => {
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    animRef.current = null
  }

  /** 吸附结束后把位置归一化回 0…n-1（视觉完全不变），并同步父级当前索引 */
  const settle = () => {
    const total = countRef.current
    if (!total) return
    const index = ((Math.round(posRef.current) % total) + total) % total
    posRef.current = index
    layout(index)
    selectRef.current(index)
  }

  const animateTo = (to: number) => {
    const from = posRef.current
    const distance = Math.abs(to - from)
    if (distance < 0.001) return
    const duration = Math.min(650, Math.max(420, 420 + distance * 46))
    animRef.current = { from, to, start: performance.now(), dur: duration }
    if (rafRef.current) return
    const tick = (now: number) => {
      const anim = animRef.current
      if (!anim) {
        rafRef.current = 0
        return
      }
      const t = Math.min(1, (now - anim.start) / anim.dur)
      // 缓出、无回弹
      const eased = 1 - Math.pow(1 - t, 3)
      posRef.current = anim.from + (anim.to - anim.from) * eased
      layout(posRef.current)
      if (t < 1) {
        rafRef.current = window.requestAnimationFrame(tick)
      } else {
        rafRef.current = 0
        animRef.current = null
        settle()
      }
    }
    rafRef.current = window.requestAnimationFrame(tick)
  }

  /** 以当前目标为基准跳 n 张（动画中途按键也按目标算，避免抖动） */
  const stepBy = (delta: number) => {
    const base = animRef.current ? animRef.current.to : Math.round(posRef.current)
    animateTo(base + delta)
  }

  /** 第 index 张相对当前位置的环绕距离 */
  const offsetOf = (index: number) => {
    const total = countRef.current
    let k = index - posRef.current
    k = ((k % total) + total) % total
    if (k > total / 2) k -= total
    return k
  }

  const activate = (index: number) => {
    const k = offsetOf(index)
    if (Math.abs(k) < 0.5) {
      const el = cardRefs.current[index]
      if (el) openRef.current(index, el)
    } else {
      animateTo(posRef.current + k)
    }
  }

  // 首次拿到数据（或外部切换索引）时定位；用户尚未操作时直接落位，不做入场滑动
  useEffect(() => {
    if (!count) return
    if (!interacted.current) {
      posRef.current = active
      layout(active)
      return
    }
    const current = ((Math.round(posRef.current) % count) + count) % count
    if (current === active) return
    let delta = active - posRef.current
    delta = ((delta % count) + count) % count
    if (delta > count / 2) delta -= count
    animateTo(posRef.current + delta)
  }, [active, count, layout])

  // 量卡宽（clamp 断点由 CSS 决定），尺寸变化时重新落位
  useEffect(() => {
    const track = trackRef.current
    if (!track || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const cardW = cardRefs.current[0]?.offsetWidth ?? 0
      if (cardW <= 0) return
      widthRef.current = cardW
      layout(posRef.current)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    return () => observer.disconnect()
  }, [layout])

  useEffect(() => stopAnim, [])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const cardEl = (event.target as HTMLElement).closest<HTMLElement>('.wp-arc__card')
    const cardIndex = cardEl ? Number(cardEl.dataset.index) : null
    interacted.current = true
    stopAnim()
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      base: posRef.current,
      axis: null,
      moved: 0,
      card: cardIndex !== null && Number.isFinite(cardIndex) ? cardIndex : null,
      samples: [{ x: event.clientX, t: performance.now() }],
    }
    setDragging(true)
    trackRef.current?.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!drag.axis) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
      // 先动的是纵向就交给页面滚动，本次手势不再横移卡片
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (drag.axis === 'y') {
      drag.moved = 99
      return
    }
    const cardW = widthRef.current
    if (!cardW) return
    drag.moved = Math.max(drag.moved, Math.abs(dx))
    posRef.current = drag.base - dx / (ARC_STEP * cardW)
    layout(posRef.current)
    const now = performance.now()
    drag.samples.push({ x: event.clientX, t: now })
    // 只保留最近 120ms 的采样，用于估算松手速度
    while (drag.samples.length > 2 && now - drag.samples[0].t > 120) drag.samples.shift()
  }

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>, canceled: boolean) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    const track = trackRef.current
    if (track?.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId)

    if (drag.axis === 'y') {
      // 纵向滚动，卡片保持原位
      layout(posRef.current)
      return
    }

    if (!canceled && drag.moved < 6) {
      if (drag.card !== null) activate(drag.card)
      return
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cardW = widthRef.current || 1
    let shift = 0
    if (!canceled && !reduced && drag.samples.length >= 2) {
      const first = drag.samples[0]
      const last = drag.samples[drag.samples.length - 1]
      const dt = Math.max(1, last.t - first.t)
      const velocity = (last.x - first.x) / dt // px/ms，向左为负
      // 200ms 惯性投影，换算成张数并限制最多 3 张
      shift = Math.max(-3, Math.min(3, (-velocity / (ARC_STEP * cardW)) * 200))
      if (Math.abs(shift) < 0.35) shift = 0
    }
    animateTo(Math.round(posRef.current + shift))
  }

  // 只响应横向滚轮与 Shift + 纵向滚轮，且 300ms 节流；不劫持普通纵向翻页
  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY)
    const shifted = event.shiftKey && Math.abs(event.deltaY) > 0
    if (!horizontal && !shifted) return
    const now = Date.now()
    if (now - wheelAt.current < 300) return
    wheelAt.current = now
    interacted.current = true
    const delta = horizontal ? event.deltaX : event.deltaY
    stepBy(delta > 0 ? 1 : -1)
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      interacted.current = true
      stepBy(-1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      interacted.current = true
      stepBy(1)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      interacted.current = true
      const last = countRef.current - 1
      const index = event.key === 'Home' ? 0 : last
      animateTo(posRef.current + offsetOf(index))
    }
  }

  if (!count) return null

  return (
    <div
      className="wp-arc"
      ref={trackRef}
      role="region"
      aria-roledescription="壁纸封面流"
      aria-label={`共 ${count} 张壁纸，拖动浏览`}
      data-dragging={dragging ? 'true' : 'false'}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => finishDrag(event, event.type === 'pointercancel')}
      onPointerCancel={(event) => finishDrag(event, true)}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      onDragStart={(event) => event.preventDefault()}
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          ref={(el) => {
            cardRefs.current[index] = el
          }}
          type="button"
          className="wp-arc__card"
          data-index={index}
          aria-label={`查看《${item.title}》大图`}
          onClick={(event) => {
            // 指针点击在 pointerup 里统一处理；这里的 detail=0 只接键盘 Enter / Space
            if (event.detail === 0) {
              interacted.current = true
              activate(index)
            }
          }}
        >
          <span className="wp-arc__frame">
            <img
              className="wp-arc__img"
              src={item.thumbUrl ?? item.fileUrl}
              alt=""
              draggable={false}
              loading={Math.abs(index - active) <= 2 ? 'eager' : 'lazy'}
              decoding="async"
              onError={onImgError}
            />
            <span className="wp-arc__ring" aria-hidden="true" />
          </span>
        </button>
      ))}
    </div>
  )
}

/**
 * 品牌壁纸页（/wallpapers）
 * ============================================================
 * 信息架构：标准页头（标题 / 说明 / 数据）→ 精选展台（环绕封面流）→ 主题筛选 + 网格 → 授权说明。
 * 下载按真实文件提供 4K / 2K / 1080p 多档；图片失败回退矢量占位，文件缺失时禁用对应档位。
 *
 * 数据来自 `/api/wallpapers`（后台「品牌壁纸」同一集合），下载档位由服务端探测磁盘后返回。
 */
export function WallpapersPage() {
  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error } = useApi((signal) => fetchWallpapers(signal), [reloadKey])

  const items = useMemo(() => data?.items ?? [], [data])
  const themes = data?.themes ?? []
  const [filter, setFilter] = useState<Filter>(ALL)
  const [ratio, setRatio] = useState<RatioKey>('all')
  const [view, setView] = useState<View>(null)
  const [toast, setToast] = useState('')
  const [ringIndex, setRingIndex] = useState(0)
  const [sizeKey, setSizeKey] = useState('')
  const [availability, setAvailability] = useState<Record<string, boolean>>({})

  const rootRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const ringTouched = useRef(false)

  usePageEffects(rootRef, loading ? 'loading' : 'ready')

  // 展台只放横版素材：竖图在 16:9 画框里会被裁掉主体；竖版仍完整出现在下方网格
  const stageItems = useMemo(() => {
    const landscape = items.filter((item) => ratioOf(item) !== '9:16')
    return landscape.length > 0 ? landscape : items
  }, [items])
  const feature = useMemo(
    () => stageItems.find((item) => item.featured) ?? stageItems[0],
    [stageItems],
  )

  // 首次拿到数据时定位到精选壁纸；之后只做越界修正，不打断用户当前选择
  useEffect(() => {
    if (stageItems.length === 0) return
    setRingIndex((current) => {
      if (ringTouched.current) return Math.min(current, stageItems.length - 1)
      ringTouched.current = true
      const featured = stageItems.findIndex((item) => item.featured)
      return featured >= 0 ? featured : 0
    })
  }, [stageItems])

  const selectRing = (index: number) => {
    ringTouched.current = true
    setRingIndex(index)
  }

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (filter === ALL || item.theme === filter) && (ratio === 'all' || ratioOf(item) === ratio),
      ),
    [items, filter, ratio],
  )

  /** 各尺寸分组的数量（筛选条上的计数） */
  const ratioCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of items) {
      const key = ratioOf(item)
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [items])
  const active = view?.list[view.index]
  const activeVariants = useMemo(() => (active ? variantsOf(active) : []), [active])
  const activeVariant = activeVariants.find((variant) => variant.key === sizeKey) ?? activeVariants[0]

  // 精选展台文案跟随封面流当前卡，而不是固定第一张
  const current = stageItems[ringIndex] ?? feature
  const currentVariant = current ? topVariant(current) : null

  // dialog 开关：只在“打开 / 关闭”时切换，切换大图不能重建 dialog
  const isLightboxOpen = view !== null
  useEffect(() => {
    const dialog = dialogRef.current
    if (!isLightboxOpen || !dialog) return
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    }
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      if (dialog.open) {
        if (typeof dialog.close === 'function') dialog.close()
        else dialog.removeAttribute('open')
      }
    }
  }, [isLightboxOpen])

  // 打开 / 切换大图时确认各档位文件真实可下载：不存在的档位置灰
  useEffect(() => {
    if (!active) return
    const list = variantsOf(active)
    setSizeKey((prev) => (list.some((variant) => variant.key === prev) ? prev : list[0]?.key ?? ''))
    setAvailability({})
    let cancelled = false
    for (const variant of list) {
      fetch(variant.url, { method: 'HEAD' })
        .then((response) => {
          if (!cancelled) setAvailability((prev) => ({ ...prev, [variant.key]: response.ok }))
        })
        .catch(() => {
          if (!cancelled) setAvailability((prev) => ({ ...prev, [variant.key]: false }))
        })
    }
    return () => {
      cancelled = true
    }
  }, [active])

  useEffect(() => {
    return () => window.clearTimeout(toastTimer.current)
  }, [])

  const showToast = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2400)
  }

  const chooseFilter = (next: Filter) => {
    setFilter(next)
    setView(null)
  }

  const chooseRatio = (next: RatioKey) => {
    setRatio(next)
    setView(null)
  }

  const openAt = (list: WallpaperItem[], index: number, opener: HTMLElement) => {
    lastFocus.current = opener
    setView({ list, index })
  }

  const openCurrent = (opener: HTMLElement) => {
    if (!current) return
    openAt(stageItems, stageItems.indexOf(current), opener)
  }

  const closeLightbox = () => {
    setView(null)
    window.requestAnimationFrame(() => lastFocus.current?.focus())
  }

  const step = (delta: number) => {
    setView((currentView) => {
      if (!currentView || currentView.list.length <= 1) return currentView
      const next = (currentView.index + delta + currentView.list.length) % currentView.list.length
      return { ...currentView, index: next }
    })
  }

  const onDownload = (item: WallpaperItem, variant: WallpaperVariant) => {
    if (!downloadable(item)) {
      showToast('该壁纸文件暂未就位，请稍后再试')
      return
    }
    showToast(`已开始下载 ${variant.label} 壁纸`)
  }

  const onCopy = async () => {
    if (!activeVariant) return
    const url = `${window.location.origin}${activeVariant.url}`
    const ok = await copyText(url)
    showToast(ok ? `已复制 ${activeVariant.label} 图片链接` : '复制失败，请在新窗口打开图片后复制')
  }

  const themeCount = themes.filter((theme) => theme.count > 0).length
  const maxWidth = useMemo(
    () => items.reduce((widest, item) => Math.max(widest, topVariant(item).width), 0),
    [items],
  )

  return (
    <div className="wp-page" ref={rootRef}>
      <header className="container wp-intro">
        <div className="wp-intro__copy">
          <h1 className="wp-title">品牌壁纸</h1>
          <p className="wp-lede">
            先按设备尺寸筛选，再选主题：16:9 桌面与笔记本、21:9 带鱼屏、9:16 手机、4:3 平板。
            提供 1080p 与 2K，部分作品带原生 4K；免登录、无水印。
          </p>
          <a className="wp-jump" href="#wp-all">
            浏览全部 {items.length || '—'} 张
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
        <ul className="wp-facts">
          <li>
            <strong>{items.length || '—'}</strong>
            <span>张壁纸</span>
          </li>
          <li>
            <strong>{themeCount || '—'}</strong>
            <span>个主题</span>
          </li>
          <li>
            <strong>{maxWidth >= 3840 ? '4K' : maxWidth ? `${maxWidth}px` : '—'}</strong>
            <span>最高分辨率</span>
          </li>
          <li>
            <strong>免登录</strong>
            <span>直接下载</span>
          </li>
        </ul>
      </header>

      {current && currentVariant ? (
        /* 精选展台：深色圆角画框，不再是通栏背景，首屏与下方内容之间没有硬边 */
        <section className="container wp-feature" aria-label="本期精选">
          <div className="wp-feature__stage">
            <div
              className="wp-feature__bg"
              style={{ backgroundImage: `url(${current.previewUrl ?? current.fileUrl})` }}
              aria-hidden="true"
            />
            <div className="wp-feature__veil" aria-hidden="true" />

            <div className="wp-feature__top">
              <div className="wp-feature__copy">
                <p className="wp-feature__tag">{current.theme}</p>
                <h2 className="wp-feature__title">{current.title}</h2>
                <p className="wp-feature__desc">{current.desc}</p>
                <div className="wp-feature__actions">
                  <button
                    className="wp-feature__btn"
                    type="button"
                    onClick={(event) => openCurrent(event.currentTarget)}
                  >
                    预览大图
                  </button>
                  {downloadable(current) ? (
                    <a
                      className="wp-feature__btn wp-feature__btn--solid"
                      href={currentVariant.url}
                      download={downloadName(current, currentVariant)}
                      onClick={() => onDownload(current, currentVariant)}
                    >
                      <DownloadIcon />
                      下载 {currentVariant.label}
                    </a>
                  ) : null}
                </div>
              </div>

              <dl className="wp-feature__meta">
                <div>
                  <dt>最高分辨率</dt>
                  <dd>
                    {currentVariant.label} · {currentVariant.width} × {currentVariant.height}
                  </dd>
                </div>
                <div>
                  <dt>文件体积</dt>
                  <dd>{currentVariant.size}</dd>
                </div>
                <div>
                  <dt>上架</dt>
                  <dd>{current.date}</dd>
                </div>
              </dl>
            </div>

            <WallpaperArc
              items={stageItems}
              active={ringIndex}
              onSelect={selectRing}
              onOpen={(index, opener) => openAt(stageItems, index, opener)}
            />
            <p className="wp-feature__hint">拖动浏览 · 点击放大</p>
          </div>
        </section>
      ) : loading ? (
        /* 数据未到时按真实展台结构占位（文案块 + 封面流），高度与加载后一致，避免下方内容被下推（CLS） */
        <section className="container wp-feature" aria-hidden="true">
          <div className="wp-feature__stage">
            <div className="wp-feature__top">
              <div className="wp-feature__copy">
                <div className="skeleton" style={{ height: 11, width: 64 }} />
                <div className="skeleton" style={{ height: 34, width: '56%', marginTop: 14 }} />
                <div className="skeleton" style={{ height: 14, width: '86%', marginTop: 14 }} />
              </div>
            </div>
            <div className="wp-arc" />
          </div>
        </section>
      ) : null}

      <section className="container wp-browse" id="wp-all" aria-labelledby="wp-browse-title">
        <div className="wp-browse__head">
          <h2 id="wp-browse-title">
            全部壁纸
            <span>{filtered.length}</span>
          </h2>
          <div className="wp-filterbar">
            <div className="wp-filterbar__row">
              <span className="wp-filterbar__label">设备尺寸</span>
              <div className="segmented wp-seg" role="group" aria-label="壁纸尺寸">
                {RATIO_OPTIONS.filter((option) => option.key === 'all' || (ratioCounts[option.key] ?? 0) > 0).map((option) => {
                  const count = option.key === 'all' ? items.length : (ratioCounts[option.key] ?? 0)
                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={ratio === option.key ? 'is-active' : ''}
                      aria-pressed={ratio === option.key}
                      title={option.hint}
                      onClick={() => chooseRatio(option.key)}
                    >
                      {option.label}
                      <span>{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="wp-filterbar__row">
              <span className="wp-filterbar__label">主题</span>
              <div className="segmented wp-seg" role="group" aria-label="壁纸主题">
                <button
                  type="button"
                  className={filter === ALL ? 'is-active' : ''}
                  aria-pressed={filter === ALL}
                  onClick={() => chooseFilter(ALL)}
                >
                  全部
                  <span>{items.length}</span>
                </button>
                {themes.map((theme) => (
                  <button
                    key={theme.key}
                    type="button"
                    className={filter === theme.key ? 'is-active' : ''}
                    aria-pressed={filter === theme.key}
                    disabled={theme.count === 0 && filter !== theme.key}
                    title={theme.desc}
                    onClick={() => chooseFilter(theme.key)}
                  >
                    {theme.label}
                    <span>{theme.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="empty" role="alert">
            <div className="empty__title">壁纸加载失败</div>
            <p className="empty__desc">{error.message}。请检查网络后重试。</p>
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
              重新加载
            </button>
          </div>
        ) : loading && items.length === 0 ? (
          <div className="wp-grid" aria-busy="true" aria-label="壁纸加载中">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="wp-card wp-card--skeleton" key={index}>
                <span className="skeleton" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty__title">这个尺寸或主题下还没有壁纸</div>
            <p className="empty__desc">放宽尺寸或切换主题看看，也可以直接查看全部。</p>
            <button
              className="btn btn--secondary btn--sm"
              type="button"
              onClick={() => {
                chooseRatio('all')
                chooseFilter(ALL)
              }}
            >
              查看全部壁纸
            </button>
          </div>
        ) : (
          <div className="wp-grid">
            {filtered.map((item, index) => {
              const top = topVariant(item)
              return (
                <article className="wp-card reveal" data-delay={String((index % 6) + 1)} key={item.id}>
                  <div className="wp-card__media" data-ratio={ratioOf(item)}>
                    <img
                      className="wp-card__img"
                      src={item.thumbUrl ?? item.fileUrl}
                      alt={`${item.title} 壁纸`}
                      loading="lazy"
                      decoding="async"
                      onError={onImgError}
                    />
                    <span className="wp-card__badge">
                      {ratioOf(item)}
                      {top.width >= 3840 ? ' · 4K' : ''}
                    </span>
                    {downloadable(item) ? (
                      <a
                        className="wp-card__dl"
                        href={top.url}
                        download={downloadName(item, top)}
                        aria-label={`下载《${item.title}》${top.label}`}
                        title={`下载 ${top.label}`}
                        onClick={() => onDownload(item, top)}
                      >
                        <DownloadIcon />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="wp-card__open"
                      aria-label={`放大查看《${item.title}》`}
                      onClick={(event) => openAt(filtered, index, event.currentTarget)}
                    />
                  </div>
                  <div className="wp-card__body">
                    <div className="wp-card__row">
                      <h3 className="wp-card__title">{item.title}</h3>
                      <span className="wp-card__theme">{item.theme}</span>
                    </div>
                    <p className="wp-card__meta">
                      {top.label.includes('×') ? '' : `${top.label} · `}
                      {top.width} × {top.height} · {top.size}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="wp-note">
        <div className="container wp-note__inner">
          <div>
            <h2>关于壁纸</h2>
            <p>
              所有壁纸均为光魂原创或已获授权的品牌影像。尺寸分组按实际上传素材自动出现：
              目前为 16:9 桌面，后续补充 21:9、竖屏或平板素材后，对应分组会自动加入筛选；
              卡片按素材真实比例展示，展台只轮播横版，竖版在下方网格中查看。
              免登录下载、无水印，仅限个人非商业用途；商用、二次分发或品牌联名使用，请通过
              <Link to="/inquiry"> 提交咨询 </Link>联系我们获取授权。
            </p>
          </div>
          <Link className="btn btn--secondary btn--sm" to="/inquiry">
            商用授权咨询
          </Link>
        </div>
      </section>

      {/* ---------- 大图弹层 ---------- */}
      <dialog
        className="wp-lb"
        ref={dialogRef}
        aria-label={active ? `查看壁纸：${active.title}` : '查看壁纸'}
        onClose={closeLightbox}
        onCancel={closeLightbox}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            step(-1)
          } else if (event.key === 'ArrowRight') {
            event.preventDefault()
            step(1)
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeLightbox()
        }}
      >
        {active && view && activeVariant && (
          <div className="wp-lb__panel">
            <div className="wp-lb__stage">
              <img
                className="wp-lb__img"
                src={active.previewUrl ?? active.fileUrl}
                alt={`${active.title} 壁纸大图`}
                onError={onImgError}
              />
              {view.list.length > 1 && (
                <>
                  <button className="wp-lb__nav wp-lb__nav--prev" type="button" aria-label="上一张" onClick={() => step(-1)}>
                    <ArrowIcon dir="left" />
                  </button>
                  <button className="wp-lb__nav wp-lb__nav--next" type="button" aria-label="下一张" onClick={() => step(1)}>
                    <ArrowIcon dir="right" />
                  </button>
                </>
              )}
              <span className="wp-lb__count">
                {view.index + 1} / {view.list.length}
              </span>
            </div>

            <div className="wp-lb__side">
              <button className="wp-lb__close" type="button" aria-label="关闭大图" onClick={closeLightbox}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>

              <span className="wp-lb__theme">{active.theme}</span>
              <h2 className="wp-lb__title">{active.title}</h2>
              <p className="wp-lb__desc">{active.desc}</p>

              <div className="wp-lb__sizes" role="radiogroup" aria-label="下载尺寸">
                {activeVariants.map((variant) => {
                  const unavailable = availability[variant.key] === false
                  return (
                    <button
                      key={variant.key}
                      type="button"
                      role="radio"
                      aria-checked={activeVariant.key === variant.key}
                      className={`wp-lb__size ${activeVariant.key === variant.key ? 'is-active' : ''} ${
                        unavailable ? 'is-off' : ''
                      }`}
                      disabled={unavailable}
                      onClick={() => setSizeKey(variant.key)}
                    >
                      <strong>{variant.label}</strong>
                      <span>
                        {unavailable ? '文件暂未就位' : `${variant.width}×${variant.height} · ${variant.size}`}
                      </span>
                    </button>
                  )
                })}
              </div>

              <dl className="wp-lb__meta">
                <div>
                  <dt>尺寸</dt>
                  <dd>
                    {activeVariant.width} × {activeVariant.height}
                  </dd>
                </div>
                <div>
                  <dt>比例</dt>
                  <dd>16:9</dd>
                </div>
                <div>
                  <dt>体积</dt>
                  <dd>{availability[activeVariant.key] === false ? '—' : activeVariant.size}</dd>
                </div>
                <div>
                  <dt>上架</dt>
                  <dd>{active.date}</dd>
                </div>
              </dl>

              <div className="wp-lb__actions">
                {downloadable(active) && availability[activeVariant.key] !== false ? (
                  <a
                    className="btn btn--primary"
                    href={activeVariant.url}
                    download={downloadName(active, activeVariant)}
                    onClick={() => onDownload(active, activeVariant)}
                  >
                    <DownloadIcon />
                    下载 {activeVariant.label} 壁纸
                  </a>
                ) : (
                  <span className="btn btn--secondary" aria-disabled="true">
                    该尺寸文件暂未就位
                  </span>
                )}
                <button className="btn btn--secondary" type="button" onClick={() => void onCopy()}>
                  复制 {activeVariant.label} 图片链接
                </button>
              </div>

              <p className="wp-lb__hint">免登录下载 · 仅限个人非商业用途 · 请勿二次分发</p>
            </div>
          </div>
        )}
      </dialog>

      {toast && (
        <div className="wp-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  )
}
