import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Link } from 'react-router-dom'
import {
  fetchWallpapers,
  type WallpaperItem,
  type WallpaperTheme,
  type WallpaperPayload,
  type WallpaperVariant,
} from '../api/wallpapers'
import { useApi } from '../hooks/useApi'
import { StarfieldBackdrop } from '../components/site/StarfieldBackdrop'
import '../styles/wallpapers.css'

/** 授权条款：逐条滚动进场，故提到数据层 */
const LICENSE_TERMS = [
  '个人非商业：可用于个人桌面、手机与平板壁纸，允许自行裁剪。',
  '不得二次售卖、不得作为模板或素材包再分发。',
  '商用（广告、影视、实体印刷）需书面授权，请通过下方入口联系。',
  '转载保留署名「光魂 GHOSTLIGHT」与原文链接。',
]

/** 筛选值：「全部」/「原生 4K」/ 某个主题 */
const ALL = 'all' as const
const FOUR_K = '4k' as const
type Filter = typeof ALL | typeof FOUR_K | WallpaperTheme

/** 弹层浏览集合：从哪一章点开，就在该章的当前可见集合里前后翻 */
type View = { list: WallpaperItem[]; index: number } | null

/** 图片加载失败时的暗色矢量回退（不留破图） */
const FALLBACK_IMAGE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">' +
    '<defs><radialGradient id="g" cx="50%" cy="48%" r="62%">' +
    '<stop offset="0" stop-color="#1a2140"/><stop offset="1" stop-color="#08090d"/>' +
    '</radialGradient></defs><rect width="1600" height="900" fill="url(#g)"/>' +
    '<rect x="1" y="1" width="1598" height="898" fill="none" stroke="#ffffff" stroke-opacity=".12"/>' +
    '<text x="800" y="470" fill="#8e9dff" fill-opacity=".7" font-family="ui-monospace,monospace" font-size="22" letter-spacing="6" text-anchor="middle">GHOSTLIGHT ARCHIVE</text>' +
    '<text x="800" y="512" fill="#ffffff" fill-opacity=".4" font-family="sans-serif" font-size="18" text-anchor="middle">图片暂不可用</text>' +
    '</svg>',
)}`

function onImgError(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget
  if (img.dataset.fallback === '1') return
  img.dataset.fallback = '1'
  img.src = FALLBACK_IMAGE
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
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

/** 是否提供原生 4K 档（用于「原生 4K」筛选） */
function hasFourK(item: WallpaperItem): boolean {
  return variantsOf(item).some((variant) => variant.width >= 3840)
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/** 比例文案：按真实像素约分，如 2560×1440 → 16:9 */
function ratioLabel(item: WallpaperItem): string {
  const top = topVariant(item)
  if (!top.width || !top.height) return '16:9'
  const divisor = gcd(top.width, top.height)
  return `${top.width / divisor}:${top.height / divisor}`
}

function downloadable(item: WallpaperItem): boolean {
  return item.fileStatus !== 'missing'
}

/** 文件名：品牌前缀 + 标题 + 档位，落地后可辨认 */
function downloadName(item: WallpaperItem, variant: WallpaperVariant): string {
  const ext = variant.url.split('.').pop()?.split('?')[0] || 'jpg'
  return `光魂壁纸-${item.title}-${variant.label}.${ext}`
}

/** 复制文本：Clipboard API 优先，HTTP / 旧浏览器回退 execCommand */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 非安全上下文（http）或权限被拒，走兜底
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
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 一章 = 一个主题；条目自带全局编号，筛选时编号不重排 */
type Chapter = {
  key: WallpaperTheme
  label: string
  desc: string
  entries: Array<{ item: WallpaperItem; no: string }>
}

export function WallpapersPage() {
  const payload = useApi<WallpaperPayload>((signal) => fetchWallpapers(signal), [])
  const items = payload.data?.items ?? []

  const rootRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const heroBgRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  /** 章节：主题顺序由接口下发；章内精选置顶；编号跨章连续 */
  const chapters = useMemo<Chapter[]>(() => {
    const metas = payload.data?.themes ?? []
    const keys = metas.filter((meta) => meta.count > 0).map((meta) => meta.key)
    const ordered = keys.length > 0 ? keys : [...new Set(items.map((item) => item.theme))]

    let serial = 0
    return ordered.map((key) => {
      const meta = metas.find((entry) => entry.key === key)
      const list = items
        .filter((item) => item.theme === key)
        .sort((a, b) => Number(b.featured) - Number(a.featured))
      return {
        key,
        label: meta?.label ?? key,
        desc: meta?.desc ?? '',
        entries: list.map((item) => ({ item, no: pad2(++serial) })),
      }
    })
  }, [items, payload.data])

  const featured = useMemo(
    () => items.find((item) => item.featured) ?? items[0] ?? null,
    [items],
  )

  const serialOf = useMemo(() => {
    const map = new Map<string, string>()
    chapters.forEach((chapter) => chapter.entries.forEach((entry) => map.set(entry.item.id, entry.no)))
    return map
  }, [chapters])

  const fourKCount = useMemo(() => items.filter(hasFourK).length, [items])

  const [filter, setFilter] = useState<Filter>(ALL)
  const [activeChapter, setActiveChapter] = useState<string>('')
  const [view, setView] = useState<View>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [availability, setAvailability] = useState<Record<string, 'ok' | 'missing'>>({})

  const toastTimer = useRef(0)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
  const scrollPos = useRef(0)
  const reduceMotion = useRef(false)
  const rectsRef = useRef<Map<string, DOMRect>>(new Map())
  const flipPending = useRef(false)
  const userFiltered = useRef(false)
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null)
  const railDrag = useRef<{ el: HTMLDivElement; id: number; x: number; left: number } | null>(null)
  const railMoved = useRef(false)

  const showToast = useCallback((message: string) => {
    window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }, [])

  // 顶栏（含公告条）是 sticky 的，实测高度写入页面变量，筛选条与章节定位都贴在它下面
  useEffect(() => {
    const stack = document.querySelector('.top-stack')
    const root = rootRef.current
    const update = () => {
      root?.style.setProperty('--wp-stack', `${stack?.getBoundingClientRect().height ?? 0}px`)
    }
    update()
    let observer: ResizeObserver | null = null
    if (stack && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(update)
      observer.observe(stack)
    }
    window.addEventListener('resize', update)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  const matches = useCallback(
    (item: WallpaperItem): boolean => {
      if (filter === ALL) return true
      if (filter === FOUR_K) return hasFourK(item)
      return item.theme === filter
    },
    [filter],
  )

  /** 记录筛选前的布局，用于 FLIP 过渡（剩余卡从旧位置滑到新位置） */
  const changeFilter = (next: Filter) => {
    if (next === filter) return
    const root = rootRef.current
    const map = new Map<string, DOMRect>()
    root
      ?.querySelectorAll<HTMLElement>('.wp-figure:not([hidden])')
      .forEach((el) => {
        if (el.dataset.wpId) map.set(el.dataset.wpId, el.getBoundingClientRect())
      })
    rectsRef.current = map
    flipPending.current = true
    userFiltered.current = true
    setFilter(next)
  }

  // 筛选后的 FLIP + 新卡入场 + 把视图滚回集合顶部
  useLayoutEffect(() => {
    if (!flipPending.current) return
    flipPending.current = false

    const root = rootRef.current
    const prev = rectsRef.current
    if (!root) return

    root.querySelectorAll<HTMLElement>('.wp-figure:not([hidden])').forEach((el) => {
      const id = el.dataset.wpId
      if (!id) return
      const next = el.getBoundingClientRect()
      const old = prev.get(id)
      if (!old) {
        if (!reduceMotion.current) {
          el.animate(
            [
              { opacity: 0, transform: 'translateY(10px)' },
              { opacity: 1, transform: 'none' },
            ],
            { duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' },
          )
        }
        return
      }
      const dx = old.left - next.left
      const dy = old.top - next.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      if (reduceMotion.current) return
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: 560, easing: 'cubic-bezier(.2,.7,.2,1)' },
      )
    })

    if (userFiltered.current) {
      userFiltered.current = false
      const collection = document.getElementById('wp-collection')
      const bar = filterRef.current
      if (collection) {
        const stackHeight = document.querySelector('.top-stack')?.getBoundingClientRect().height ?? 54
        const top = collection.getBoundingClientRect().top + window.scrollY - (stackHeight + (bar?.offsetHeight ?? 52))
        window.scrollTo({ top, behavior: reduceMotion.current ? 'auto' : 'smooth' })
      }
    }
  }, [filter])

  // 首屏：当筛选收窄时，把章节索引落到第一个可见章
  useEffect(() => {
    const visible = chapters.filter((chapter) =>
      chapter.entries.some((entry) => matches(entry.item)),
    )
    if (visible.length > 0 && !visible.some((chapter) => chapter.key === activeChapter)) {
      setActiveChapter(visible[0].key)
    }
  }, [chapters, matches, activeChapter])

  // 章节索引高亮：以视口中段为判定带
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    const sections = Chapters(root)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const key = (entry.target as HTMLElement).dataset.chapter
          if (key) setActiveChapter(key)
        })
      },
      { rootMargin: '-42% 0px -50% 0px', threshold: 0 },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [chapters])

  // 章节标题 / 页脚块的淡入（3px 上移）
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const nodes = root.querySelectorAll<HTMLElement>('.wp-rv:not(.is-in)')
    if (!nodes.length) return
    if (typeof IntersectionObserver === 'undefined') {
      nodes.forEach((el) => el.classList.add('is-in'))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-in')
          observer.unobserve(entry.target)
        })
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.12 },
    )
    nodes.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [items, filter])

  // 首屏视差：只改背景层，滚动到首屏之外即停止更新
  useEffect(() => {
    const hero = heroRef.current
    const bg = heroBgRef.current
    if (!hero || !bg) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduceMotion.current = media.matches
    if (media.matches) return

    let raf = 0
    const update = () => {
      raf = 0
      const height = hero.offsetHeight || 1
      const y = Math.min(window.scrollY, height * 1.2)
      const p = Math.min(1, y / height)
      // Apple 式：图片缓慢下沉并轻微放大，文字更早淡出上移（由 CSS 读取 --wp-p）
      bg.style.transform = `translate3d(0, ${(y * 0.18).toFixed(2)}px, 0) scale(${(1.04 + p * 0.1).toFixed(3)})`
      hero.style.setProperty('--wp-p', p.toFixed(4))
    }
    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [featured?.previewUrl, featured?.fileUrl])

  // 弹层开关：showModal 提供焦点陷阱与 Esc 关闭
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (view) {
      if (!dialog.open) dialog.showModal()
      const scrollbar = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = scrollbar > 0 ? `${scrollbar}px` : ''
      return () => {
        document.body.style.overflow = ''
        document.body.style.paddingRight = ''
      }
    }
    if (dialog.open) dialog.close()
  }, [view])

  const current = view ? view.list[view.index] : null

  // 当前藏品的各档位可用性：HEAD 探测，缺档则禁用下载
  useEffect(() => {
    if (!current) return
    let alive = true
    if (!downloadable(current)) {
      const missing: Record<string, 'ok' | 'missing'> = {}
      variantsOf(current).forEach((variant) => {
        missing[variant.url] = 'missing'
      })
      setAvailability(missing)
      return
    }
    const variants = variantsOf(current)
    Promise.all(
      variants.map(async (variant) => {
        try {
          const response = await fetch(variant.url, { method: 'HEAD' })
          return [variant.url, response.ok ? 'ok' : 'missing'] as const
        } catch {
          return [variant.url, 'ok'] as const
        }
      }),
    ).then((entries) => {
      if (alive) setAvailability(Object.fromEntries(entries))
    })
    return () => {
      alive = false
    }
  }, [current?.id])

  const stepView = useCallback((delta: number) => {
    setView((prev) => {
      if (!prev || prev.list.length < 2) return prev
      const index = (prev.index + delta + prev.list.length) % prev.list.length
      return { list: prev.list, index }
    })
  }, [])

  const openItem = (list: WallpaperItem[], index: number) => {
    lastFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    scrollPos.current = window.scrollY
    setView({ list, index })
  }

  const closeView = useCallback(() => {
    setView(null)
    window.setTimeout(() => {
      lastFocus.current?.focus({ preventScroll: true })
      // 锁滚动期间页面可能被浏览器重排，关闭后回到打开前的位置
      window.scrollTo(0, scrollPos.current)
    }, 0)
  }, [])

  const onDialogKey = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      stepView(1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      stepView(-1)
    }
  }

  /** 轨道拖拽：按住空白/卡片横向拖动，超过 4px 才接管，松手后吞掉这次点击 */
  const onRailDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    railDrag.current = {
      el: event.currentTarget,
      id: event.pointerId,
      x: event.clientX,
      left: event.currentTarget.scrollLeft,
    }
  }

  const onRailMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = railDrag.current
    if (!drag || drag.id !== event.pointerId) return
    const dx = event.clientX - drag.x
    if (!railMoved.current && Math.abs(dx) > 4) {
      railMoved.current = true
      drag.el.setPointerCapture(event.pointerId)
      drag.el.classList.add('is-dragging')
    }
    if (railMoved.current) drag.el.scrollLeft = drag.left - dx
  }

  const onRailUp = () => {
    const drag = railDrag.current
    railDrag.current = null
    if (!drag) return
    drag.el.classList.remove('is-dragging')
    if (!railMoved.current) return
    // 拖拽结束时浏览器仍会派发 click，延后一帧再解除抑制
    window.setTimeout(() => {
      railMoved.current = false
    }, 0)
  }

  const onStageDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a, button')) return
    swipe.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
  }

  const onStageUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipe.current
    swipe.current = null
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.4) return
    stepView(dx < 0 ? 1 : -1)
  }

  const copyCurrentLink = async (item: WallpaperItem) => {
    const url = new URL(topVariant(item).url, window.location.origin).href
    showToast((await copyText(url)) ? '图片链接已复制' : '复制失败，请手动复制下载地址')
  }

  const visibleChapters = chapters.map((chapter) => ({
    ...chapter,
    shown: chapter.entries.filter((entry) => matches(entry.item)),
  }))

  const heroUrl = featured ? featured.previewUrl || featured.fileUrl : ''
  const filterOptions: Array<{ key: Filter; label: string; count: number }> = [
    { key: ALL, label: '全部', count: items.length },
    ...chapters.map((chapter) => ({ key: chapter.key as Filter, label: chapter.label, count: chapter.entries.length })),
    ...(fourKCount > 0 ? [{ key: FOUR_K as Filter, label: '原生 4K', count: fourKCount }] : []),
  ]

  return (
    <div className="wp-page" ref={rootRef}>
      <section
        className="wp-hero"
        ref={heroRef}
        aria-labelledby="wp-hero-title"
        aria-busy={payload.loading}
      >
        <div className="wp-hero__media" aria-hidden="true">
          <div
            className="wp-hero__bg"
            ref={heroBgRef}
            style={heroUrl ? { backgroundImage: `url(${heroUrl})` } : undefined}
          />
        </div>

        <h1 className="wp-hero__title" id="wp-hero-title">
          <span className="wp-hero__line">
            <span>把银河</span>
          </span>
          <span className="wp-hero__line">
            <span>
              装进<em>日常</em>
            </span>
          </span>
        </h1>
        <span className="wp-hero__cue" aria-hidden="true" />
      </section>

      <StarfieldBackdrop />

      <div className="wp-filter" ref={filterRef}>
        <div className="wp-filter__inner">
          <div className="wp-chips" role="group" aria-label="壁纸筛选">
            {filterOptions.map((option, index) => (
              <button
                key={option.key}
                type="button"
                className={`wp-chip${filter === option.key ? ' is-on' : ''}`}
                style={{ ['--rv-d' as string]: `${index * 55}ms` }}
                aria-pressed={filter === option.key}
                onClick={() => changeFilter(option.key)}
              >
                <span className="wp-rv">{option.label}</span>
                <span className="wp-chip__count wp-rv">{pad2(option.count)}</span>
              </button>
            ))}
          </div>
          <p className="wp-filter__sum" aria-live="polite">
            {filter === ALL ? 'ALL' : filter === FOUR_K ? 'NATIVE 4K' : filter} · {pad2(items.length)}
          </p>
        </div>
      </div>

      <div className="wp-collection" id="wp-collection">
        {payload.error && (
          <p className="wp-state">
            藏品暂时无法加载，请稍后刷新页面。
            <span className="wp-state__hint">{payload.error.message}</span>
          </p>
        )}

        {!payload.error && payload.loading && items.length === 0 && (
          <p className="wp-state">正在整理本期藏品…</p>
        )}

        {!payload.error && !payload.loading && items.length === 0 && (
          <p className="wp-state">本期藏品整理中，稍后再来。</p>
        )}

        {visibleChapters.map((chapter, chapterIndex) => (
          <section
            key={chapter.key}
            id={`wp-ch-${chapter.key}`}
            className="wp-chapter"
            data-chapter={chapter.key}
            hidden={chapter.shown.length === 0}
            aria-labelledby={`wp-ch-${chapter.key}-title`}
          >
            <header className="wp-chapter__head">
              <span className="wp-chapter__no wp-rv" aria-hidden="true" style={{ ['--rv-d' as string]: '0ms' }}>
                {pad2(chapterIndex + 1)}
              </span>
              <div className="wp-chapter__intro">
                <h2 className="wp-rv" id={`wp-ch-${chapter.key}-title`} style={{ ['--rv-d' as string]: '90ms' }}>
                  {chapter.label}
                </h2>
                <p className="wp-rv" style={{ ['--rv-d' as string]: '170ms' }}>
                  {chapter.desc}
                </p>
              </div>
              <span className="wp-chapter__count wp-rv" style={{ ['--rv-d' as string]: '240ms' }}>
                {pad2(chapter.shown.length)} / {pad2(chapter.entries.length)} 张
              </span>
            </header>

            <div
              className="wp-rail"
              onPointerDown={onRailDown}
              onPointerMove={onRailMove}
              onPointerUp={onRailUp}
              onPointerCancel={onRailUp}
            >
              {chapter.entries.map((entry) => {
                const shown = matches(entry.item)
                const thumb = entry.item.thumbUrl || entry.item.previewUrl || entry.item.fileUrl
                return (
                  <button
                    key={entry.item.id}
                    type="button"
                    className={`wp-figure${entry.item.featured ? ' is-feat' : ''}`}
                    data-wp-id={entry.item.id}
                    hidden={!shown}
                    onClick={() => {
                      if (railMoved.current) {
                        railMoved.current = false
                        return
                      }
                      const list = chapter.shown.map((visible) => visible.item)
                      const at = Math.max(0, list.findIndex((item) => item.id === entry.item.id))
                      openItem(list, at)
                    }}
                    aria-label={`查看 ${entry.item.title}，${topVariant(entry.item).width} × ${
                      topVariant(entry.item).height
                    }，可下载`}
                  >
                    <div className="wp-figure__media">
                      <img
                        src={thumb}
                        alt={`${entry.item.title} 壁纸缩略图`}
                        loading="lazy"
                        decoding="async"
                        onError={onImgError}
                      />
                    </div>
                    <div className="wp-figure__cap">
                      <span className="wp-figure__no wp-rv">Nº {entry.no}</span>
                      <span className="wp-figure__title wp-rv" style={{ ['--rv-d' as string]: '60ms' }}>
                        {entry.item.title}
                      </span>
                      <span className="wp-figure__size wp-rv" style={{ ['--rv-d' as string]: '120ms' }}>
                        {entry.item.size}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="wp-license" aria-labelledby="wp-license-title">
        <div className="wp-license__head">
          <h2 className="wp-rv" id="wp-license-title">授权与使用</h2>
          <span className="wp-license__mark wp-rv" aria-hidden="true" style={{ ['--rv-d' as string]: '80ms' }}>
            DL
          </span>
        </div>
        <div className="wp-license__body">
          <ul>
            {LICENSE_TERMS.map((term, index) => (
              <li key={term} className="wp-rv" style={{ ['--rv-d' as string]: `${index * 80}ms` }}>
                {term}
              </li>
            ))}
          </ul>
          <div className="wp-license__sign">
            <p className="wp-rv">© 2026 光魂 GHOSTLIGHT — ALL WALLPAPERS CLEARED FOR PERSONAL USE</p>
            <Link className="wp-rv" to="/inquiry" style={{ ['--rv-d' as string]: '90ms' }}>
              获取商用授权 →
            </Link>
          </div>
        </div>
      </section>

      <nav className="wp-cidx" aria-label="章节索引">
        {visibleChapters
          .filter((chapter) => chapter.shown.length > 0)
          .map((chapter, index) => (
            <a
              key={chapter.key}
              href={`#wp-ch-${chapter.key}`}
              className={activeChapter === chapter.key ? 'is-on' : ''}
              aria-current={activeChapter === chapter.key ? 'true' : undefined}
              onClick={(event) => {
                event.preventDefault()
                document.getElementById(`wp-ch-${chapter.key}`)?.scrollIntoView({
                  behavior: reduceMotion.current ? 'auto' : 'smooth',
                  block: 'start',
                })
              }}
            >
              <span className="wp-cidx__no wp-rv">{pad2(index + 1)}</span>
              <span className="wp-cidx__label wp-rv" style={{ ['--rv-d' as string]: '70ms' }}>
                {chapter.label}
              </span>
            </a>
          ))}
      </nav>

      <dialog
        className="wp-detail"
        ref={dialogRef}
        aria-label="壁纸详情"
        onClose={closeView}
        onKeyDown={onDialogKey}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeView()
        }}
      >
        {current && (
          <div className="wp-detail__panel">
            <div
              className="wp-detail__stage"
              onPointerDown={onStageDown}
              onPointerUp={onStageUp}
              onPointerCancel={() => {
                swipe.current = null
              }}
            >
              <img
                src={current.previewUrl || current.fileUrl}
                alt={`${current.title} 壁纸大图`}
                decoding="async"
                draggable={false}
                onError={onImgError}
              />
              {view && view.list.length > 1 && (
                <>
                  <button
                    className="wp-detail__nav wp-detail__nav--prev"
                    type="button"
                    onClick={() => stepView(-1)}
                    aria-label="上一张"
                  >
                    <ArrowIcon dir="left" />
                  </button>
                  <button
                    className="wp-detail__nav wp-detail__nav--next"
                    type="button"
                    onClick={() => stepView(1)}
                    aria-label="下一张"
                  >
                    <ArrowIcon dir="right" />
                  </button>
                </>
              )}
              <div className="wp-detail__plate">
                <span>PREVIEW · {ratioLabel(current)}</span>
                {view && (
                  <span>
                    {pad2(view.index + 1)} / {pad2(view.list.length)}
                  </span>
                )}
              </div>
            </div>

            <aside className="wp-detail__meta">
              <p className="wp-detail__no">COLLECTION · Nº {serialOf.get(current.id)}</p>
              <h2>{current.title}</h2>
              <p className="wp-detail__desc">{current.desc}</p>

              <dl className="wp-detail__spec">
                <div>
                  <dt>主题</dt>
                  <dd>{current.theme}</dd>
                </div>
                <div>
                  <dt>比例</dt>
                  <dd>{ratioLabel(current)}</dd>
                </div>
                <div>
                  <dt>尺寸</dt>
                  <dd>
                    {topVariant(current).width} × {topVariant(current).height}
                  </dd>
                </div>
                <div>
                  <dt>体积</dt>
                  <dd>{current.size}</dd>
                </div>
                <div>
                  <dt>上架</dt>
                  <dd>{current.date}</dd>
                </div>
              </dl>

              <p className="wp-detail__label">下载</p>
              <div className="wp-detail__dls">
                {variantsOf(current).map((variant) => {
                  const state = availability[variant.url]
                  const enabled = downloadable(current) && state !== 'missing'
                  return enabled ? (
                    <a
                      key={variant.key}
                      className="wp-detail__dl"
                      href={variant.url}
                      download={downloadName(current, variant)}
                      onClick={() => showToast(`开始下载 ${variant.label} 档`)}
                    >
                      <span className="wp-detail__dl-name">{variant.label}</span>
                      <span className="wp-detail__dl-meta">
                        {variant.width} × {variant.height} · {variant.size}
                      </span>
                      <DownloadIcon />
                    </a>
                  ) : (
                    <span key={variant.key} className="wp-detail__dl is-off" aria-disabled="true">
                      <span className="wp-detail__dl-name">{variant.label}</span>
                      <span className="wp-detail__dl-meta">
                        {widthOf(variant)} · 该档位暂缺
                      </span>
                    </span>
                  )
                })}
              </div>

              <div className="wp-detail__foot">
                <button type="button" onClick={() => current && copyCurrentLink(current)}>
                  复制图片链接
                </button>
                <span>个人非商业 · 免登录下载</span>
              </div>
            </aside>

            <button className="wp-detail__close" type="button" onClick={closeView}>
              关闭 <span>ESC</span>
            </button>
          </div>
        )}
      </dialog>

      {toast && (
        <p className="wp-toast" role="status">
          {toast}
        </p>
      )}
    </div>
  )
}

/** 取页内所有章节节点（弹层里的内容不含 data-chapter，不会被误选） */
function Chapters(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('.wp-chapter[data-chapter]'))
}

function widthOf(variant: WallpaperVariant): string {
  return `${variant.width} × ${variant.height}`
}
