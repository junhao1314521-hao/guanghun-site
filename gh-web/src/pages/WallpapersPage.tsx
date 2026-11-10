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
import { fetchWallpapers, type WallpaperItem, type WallpaperTheme } from '../api/wallpapers'
import { useApi } from '../hooks/useApi'
import { usePageEffects } from '../hooks/usePageEffects'
import '../styles/wallpapers.css'

/** 筛选值：「全部」或某个主题 */
const ALL = 'all' as const
type Filter = typeof ALL | WallpaperTheme

/** 弹层当前浏览集合：featured 入口与网格入口可能使用不同列表 */
type View = { list: WallpaperItem[]; index: number } | null

/** 文件是否可下载（服务端探测为 missing 时禁用） */
function downloadable(item: WallpaperItem): boolean {
  return item.fileStatus !== 'missing'
}

/** 下载文件名：保留品牌前缀，避免落地后只有 w-xxx.jpg */
function downloadName(item: WallpaperItem): string {
  return `光魂壁纸-${item.title}.jpg`
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

/** 水平步距 = 0.96 × 卡宽：两侧卡片向内旋转后视觉变窄，收紧后仍不重叠 */
const ARC_STEP = 0.96
/** 弧线深度：y = 30 × |k|^1.3（px），越往两侧越低，形成包围感 */
const ARC_DROP = 30
/** 每张卡的向内旋转角度（度），|k| 越大越转向弧心 */
const ARC_TILT = 24
/** 超出该距离的卡片完全淡出并移出焦点顺序 */
const ARC_FADE_END = 4.2

/**
 * 环绕式封面流：卡片沿一条向内收拢的弧面排布，中心卡最大、最高、正对镜头，
 * 两侧卡片逐级下沉、缩小并转向弧心，形成把中心卡包住的半环。
 *
 * 位置只由连续量 `pos`（浮点索引）决定：第 i 张卡的环绕距离 k = i - pos（取最短），
 * 再按 `x = k·0.96W`、`y = 30|k|^1.3`、`scale = 1/(1+0.13|k|)`、`rotateY = -24k` 落位。
 * 旋转后卡片视觉宽度收窄，因此收紧步距也不会互相重叠；两侧卡片随距离缩小、下沉并淡出。
 *
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
      const x = k * ARC_STEP * cardW
      const y = ARC_DROP * Math.pow(abs, 1.3)
      const scale = 1 / (1 + 0.13 * abs)
      const tilt = Math.max(-56, Math.min(56, -ARC_TILT * k))
      const visible = abs < ARC_FADE_END
      // --w 是「居中权重」：中心 1、偏离 0.9 张卡后为 0，用于平滑插值描边与亮度
      const weight = Math.max(0, 1 - abs / 0.9)
      el.style.transform =
        `translate(-50%, 0) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) ` +
        `rotateY(${tilt.toFixed(2)}deg) scale(${scale.toFixed(4)})`
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
      role="group"
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
            />
            <span className="wp-arc__ring" aria-hidden="true" />
          </span>
        </button>
      ))}
    </div>
  )
}

/**
 * 品牌壁纸页：通栏海报舞台（固定背景 + 居中文案 + 3D 弧形封面流）→ 主题筛选 → 16:9 网格 → 大图弹层。
 *
 * 数据来自 `/api/wallpapers`（后台「品牌壁纸」同一集合）。
 * 首屏保持固定的精选背景，壁纸本身在弧形封面流里循环浏览；
 * 下方网格保留主题筛选与快速检索，点击仍可放大、下载与复制链接。
 */
export function WallpapersPage() {
  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error } = useApi((signal) => fetchWallpapers(signal), [reloadKey])

  const items = useMemo(() => data?.items ?? [], [data])
  const themes = data?.themes ?? []
  const [filter, setFilter] = useState<Filter>(ALL)
  const [view, setView] = useState<View>(null)
  const [toast, setToast] = useState('')
  const [ringIndex, setRingIndex] = useState(0)

  const rootRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const ringTouched = useRef(false)

  usePageEffects(rootRef, loading ? 'loading' : 'ready')

  const feature = useMemo(() => items.find((item) => item.featured) ?? items[0], [items])

  // 首次拿到数据时定位到精选壁纸；之后只做越界修正，不打断用户当前选择
  useEffect(() => {
    if (items.length === 0) return
    setRingIndex((current) => {
      if (ringTouched.current) return Math.min(current, items.length - 1)
      ringTouched.current = true
      const featured = items.findIndex((item) => item.featured)
      return featured >= 0 ? featured : 0
    })
  }, [items])

  const selectRing = (index: number) => {
    ringTouched.current = true
    setRingIndex(index)
  }
  const filtered = useMemo(
    () => (filter === ALL ? items : items.filter((item) => item.theme === filter)),
    [items, filter],
  )
  const active = view?.list[view.index]

  // dialog 开关：打开时 showModal + 锁定滚动；关闭时恢复
  useEffect(() => {
    const dialog = dialogRef.current
    if (!view || !dialog) return
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
  }, [view])

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

  const openAt = (list: WallpaperItem[], index: number, opener: HTMLElement) => {
    lastFocus.current = opener
    setView({ list, index })
  }

  const closeLightbox = () => {
    setView(null)
    window.requestAnimationFrame(() => lastFocus.current?.focus())
  }

  const step = (delta: number) => {
    setView((current) => {
      if (!current || current.list.length <= 1) return current
      const next = (current.index + delta + current.list.length) % current.list.length
      return { ...current, index: next }
    })
  }

  const onDownload = (item: WallpaperItem) => {
    if (!downloadable(item)) {
      showToast('该壁纸文件暂未就位，请稍后再试')
      return
    }
    showToast('已开始下载壁纸')
  }

  const onCopy = async () => {
    if (!active) return
    const url = `${window.location.origin}${active.fileUrl}`
    const ok = await copyText(url)
    showToast(ok ? '图片链接已复制' : '复制失败，请在新窗口打开图片后复制')
  }

  const themeCount = themes.filter((theme) => theme.count > 0).length

  return (
    <div className="wp-page" ref={rootRef}>
      {feature ? (
        /* 首屏舞台：固定宽屏背景 + 居中文案 + 环绕式封面流；背景用未模糊的大图，纯装饰，不响应点击 */
        <section className="wp-stage" aria-labelledby="wp-title">
          <div
            className="wp-stage__bg"
            style={{ backgroundImage: `url(${feature.previewUrl ?? feature.fileUrl})` }}
            aria-hidden="true"
          />
          <span className="wp-stage__veil" aria-hidden="true" />

          <div className="container wp-stage__inner">
            <div className="wp-stage__copy">
              <h1 id="wp-title" className="wp-title">品牌壁纸</h1>
              <p className="wp-lede">
                从星海、赛博到秘境，16:9 桌面壁纸。免登录、无水印，挑一张留给你的桌面。
              </p>
              <div className="wp-stage__cta">
                <a className="btn btn--primary btn--lg" href="#wp-all">浏览全部壁纸</a>
              </div>
            </div>

            <WallpaperArc
              items={items}
              active={ringIndex}
              onSelect={selectRing}
              onOpen={(index, opener) => openAt(items, index, opener)}
            />
          </div>

          <p className="wp-stage__hint">拖动浏览 · 点击放大</p>
        </section>
      ) : (
        <header className="container wp-head">
          <h1 className="wp-title">品牌壁纸</h1>
          <p className="wp-lede">
            从星海、赛博到秘境，16:9 桌面壁纸。免登录、无水印，选一张留给你的桌面。
          </p>
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
              <strong>16:9</strong>
              <span>桌面比例</span>
            </li>
            <li>
              <strong>免登录</strong>
              <span>直接下载</span>
            </li>
          </ul>
        </header>
      )}

      <section className="container wp-browse" id="wp-all" aria-labelledby="wp-browse-title">
        <div className="wp-browse__head">
          <h2 id="wp-browse-title">
            全部壁纸
            <span>{filtered.length}</span>
          </h2>
          <div className="wp-filters">
            <div className="segmented wp-seg" role="tablist" aria-label="壁纸主题">
              <button
                type="button"
                role="tab"
                className={filter === ALL ? 'is-active' : ''}
                aria-selected={filter === ALL}
                onClick={() => chooseFilter(ALL)}
              >
                全部
                <span>{items.length}</span>
              </button>
              {themes.map((theme) => (
                <button
                  key={theme.key}
                  type="button"
                  role="tab"
                  className={filter === theme.key ? 'is-active' : ''}
                  aria-selected={filter === theme.key}
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
            <div className="empty__title">这个主题还没有壁纸</div>
            <p className="empty__desc">换个主题看看，或稍后再来。</p>
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => chooseFilter(ALL)}>
              查看全部壁纸
            </button>
          </div>
        ) : (
          <div className="wp-grid">
            {filtered.map((item, index) => (
              <article className="wp-card reveal" data-delay={String((index % 6) + 1)} key={item.id}>
                <div className="wp-card__media">
                  <img
                    className="wp-card__img"
                    src={item.thumbUrl ?? item.fileUrl}
                    alt={`${item.title} 壁纸`}
                    loading="lazy"
                    decoding="async"
                  />
                  {downloadable(item) ? (
                    <a
                      className="wp-card__dl"
                      href={item.fileUrl}
                      download={downloadName(item)}
                      aria-label={`下载《${item.title}》`}
                      title="下载壁纸"
                      onClick={() => onDownload(item)}
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
                    {item.width} × {item.height} · {item.size}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="wp-note">
        <div className="container wp-note__inner">
          <div>
            <h2>关于壁纸</h2>
            <p>
              所有壁纸均为光魂原创或已获授权的品牌影像，提供 16:9 桌面尺寸，免登录下载、无水印。
              仅限个人非商业用途；商用、二次分发或品牌联名使用，请通过
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
        {active && view && (
          <div className="wp-lb__panel">
            <div className="wp-lb__stage">
              <img
                className="wp-lb__img"
                src={active.previewUrl ?? active.fileUrl}
                alt={`${active.title} 壁纸大图`}
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

              <dl className="wp-lb__meta">
                <div>
                  <dt>尺寸</dt>
                  <dd>
                    {active.width} × {active.height}
                  </dd>
                </div>
                <div>
                  <dt>比例</dt>
                  <dd>16:9</dd>
                </div>
                <div>
                  <dt>体积</dt>
                  <dd>{active.size}</dd>
                </div>
                <div>
                  <dt>上架</dt>
                  <dd>{active.date}</dd>
                </div>
              </dl>

              <div className="wp-lb__actions">
                {downloadable(active) ? (
                  <a className="btn btn--primary" href={active.fileUrl} download={downloadName(active)} onClick={() => onDownload(active)}>
                    <DownloadIcon />
                    下载这张壁纸
                  </a>
                ) : (
                  <span className="btn btn--secondary" aria-disabled="true">
                    文件暂未就位
                  </span>
                )}
                <button className="btn btn--secondary" type="button" onClick={() => void onCopy()}>
                  复制图片链接
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
