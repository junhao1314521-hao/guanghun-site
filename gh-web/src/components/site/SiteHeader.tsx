import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MEGA_PANELS, PAGE_NAV, pageIdFromPath } from '../../data/nav'
import { MEGA_PANELS_EN } from '../../data/navEn'
import { LANG_OPTIONS } from '../../data/site'
import { useSiteAnnouncement, useSiteConfig, useSiteNav, useSiteShopChannels, useTopCta } from '../../hooks/useSiteConfig'
import { useSession } from '../../hooks/useSession'
import { useSitePages } from '../../hooks/useSitePages'
import { useI18n } from '../../i18n'
import { BrandMark } from './BrandMark'
import { toggleTheme } from '../../lib/theme'
import { useTheme } from '../../lib/useTheme'
import { trackEvent } from '../../lib/track'
import type { ShopChannel, SiteAnnouncement } from '../../data/contentTypes'
import {
  IconAccount,
  IconChevronRight,
  IconGlobe,
  IconMenu,
  IconMoon,
  IconSearch,
  IconShop,
  IconSun,
  IconSupport,
} from '../ui/Icon'

type Props = {
  lang: string
  onLangChange: (code: string) => void
  onOpenDrawer: () => void
}

/**
 * 下拉面板右侧推荐卡的配图（按面板 key 固定）。
 * 此前这里是一块渐变色占位，观感像「没加载出来」；改为各自栏目对应的真实素材，
 * 中英文面板共用同一份映射（面板 key 与语言无关）。
 */
const MEGA_FEATURE_IMAGE: Record<string, string> = {
  products: '/media/products/gh-54027x1qe.jpg',
  ladder: '/media/products/views/monitor-1.jpg',
  articles: '/media/home/scenes/scene-02.jpg',
  support: '/media/home/scenes/scene-03.jpg',
  business: '/media/home/scenes/scene-04.jpg',
  about: '/media/home/scenes/scene-01.jpg',
}

/** 公告条（顶栏上方细条）：文案可点跳转，可按配置关闭（关闭状态记忆在 localStorage） */
function AnnouncementBar({ announcement, onDismiss }: { announcement: SiteAnnouncement; onDismiss: () => void }) {
  return (
    <div className="announce" role="region" aria-label="站点公告">
      <div className="container announce__inner">
        {announcement.href ? (
          <Link className="announce__link" to={announcement.href}>
            {announcement.text}
          </Link>
        ) : (
          <span className="announce__text">{announcement.text}</span>
        )}
        {announcement.dismissible && (
          <button className="announce__close" type="button" aria-label="关闭公告" onClick={onDismiss}>
            ×
          </button>
        )}
      </div>
    </div>
  )
}

/** 公告条关闭状态在 localStorage 的键（按文案区分，同一公告不重复打扰） */
function announceDismissKey(text: string): string {
  return `gh-announce-dismissed:${text.slice(0, 60)}`
}

/**
 * 顶栏「店铺」圆钮：品牌色实心圆底 + 白色店铺图标；点击 / 悬停弹出渠道浮层。
 * - 渠道来自站点配置 `shopChannels`（空数组时父级不渲染整块）；
 * - 浮层每行为「图标位 + 名称 + 外链箭头」，外链 `target="_blank" rel="noreferrer"`；
 * - 点外部 / Esc / 移开收起；贴右时整体左移避免被视口裁切；不加投影。
 */
function ShopButton({ channels }: { channels: ShopChannel[] }) {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  // 浮层相对圆钮的水平偏移：右侧越界时为负值（整体左移）
  const [shift, setShift] = useState(0)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  // 最近一次指针类型：区分鼠标点击（悬停已开，无需切换）与触屏点击（需切换）
  const pointerType = useRef('')

  // 路由切换时收起浮层
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // 浮层贴右自动向左对齐：默认左对齐圆钮，右侧越界则整体左移（留 8px 边距）
  useLayoutEffect(() => {
    if (!open) return
    const panel = panelRef.current
    const wrap = wrapRef.current
    if (!panel || !wrap) return
    const measure = () => {
      const pw = panel.offsetWidth
      const rect = wrap.getBoundingClientRect()
      const vw = document.documentElement.clientWidth
      const margin = 8
      let left = rect.left
      if (left + pw > vw - margin) left = vw - margin - pw
      if (left < margin) left = margin
      setShift(left - rect.left)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open])

  // Esc / 点击浮层与圆钮以外区域 → 收起
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onDown = (event: PointerEvent) => {
      const target = event.target
      if (wrapRef.current && target instanceof Node && !wrapRef.current.contains(target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <span
      className={`shop-wrap${open ? ' is-open' : ''}`}
      ref={wrapRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="shop-btn"
        aria-label={t('a11y.shop')}
        aria-haspopup="true"
        aria-expanded={open}
        onPointerDown={(event) => {
          pointerType.current = event.pointerType
        }}
        onClick={(event) => {
          // 键盘触发（detail=0）或非鼠标点击 → 切换；鼠标点击不做切换（悬停已开）
          if (event.detail === 0 || pointerType.current !== 'mouse') setOpen((value) => !value)
        }}
      >
        <IconShop size={17} />
      </button>
      <div className="shop-pop" role="menu" aria-label={t('a11y.shop')} ref={panelRef} style={{ left: shift }}>
        {channels.map((channel) => (
          <a
            key={channel.name}
            className="shop-pop__item"
            href={channel.href}
            target="_blank"
            rel="noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="shop-pop__icon" aria-hidden="true">
              <IconShop size={15} />
            </span>
            <span className="shop-pop__name">{channel.name}</span>
            <IconChevronRight size={14} className="shop-pop__arrow" />
          </a>
        ))}
      </div>
    </span>
  )
}

/** 顶栏：主导航 + 宽屏下拉菜单 + 搜索 + 语言 + 主题 + 客服/账号 */
export function SiteHeader({ lang, onLangChange, onOpenDrawer }: Props) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const { t } = useI18n()
  // 一级导航来自内容库站点配置（回落本地真源），下拉展开面按语言选用本地 MEGA_PANELS（中文）/ EN 覆盖
  const navItems = useSiteNav()
  // 店铺渠道（站点配置 `shopChannels`；空数组时整块不渲染）
  const shopChannels = useSiteShopChannels()
  const panels = lang === 'en' ? MEGA_PANELS_EN : MEGA_PANELS
  // 下拉面板右侧推荐卡：由站点配置开关控制，默认关闭（见 navFeatureEnabled）
  const navFeatureEnabled = useSiteConfig()?.navFeatureEnabled === true
  // 登录态：已登录 → 个人中心；未登录 → 登录页（入口按会话切换）
  const { user } = useSession()
  // 下线级联：下拉面板链接统一走 isPathLive 过滤，已下线页面的入口不出现在下拉里
  const { isPathLive } = useSitePages()

  // 公告条（后台可配、可定时、可关闭）+ 顶栏 CTA（购买 / 预约体验）
  const announcement = useSiteAnnouncement()
  const topCta = useTopCta()
  const [announceDismissed, setAnnounceDismissed] = useState(false)
  useEffect(() => {
    if (!announcement) {
      setAnnounceDismissed(false)
      return
    }
    try {
      setAnnounceDismissed(localStorage.getItem(announceDismissKey(announcement.text)) === '1')
    } catch {
      setAnnounceDismissed(false)
    }
  }, [announcement])
  const dismissAnnounce = () => {
    if (!announcement) return
    try {
      localStorage.setItem(announceDismissKey(announcement.text), '1')
    } catch {
      // 隐私模式 / 存储禁用时静默，仅本次会话隐藏
    }
    setAnnounceDismissed(true)
  }

  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [langOpen, setLangOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [overHero, setOverHero] = useState(false)
  const [query, setQuery] = useState('')

  const headerRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const megaContainerRef = useRef<HTMLDivElement>(null)
  const megaInnerRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | null>(null)

  // 页面 → 顶栏高亮归属
  const pageKey = pageIdFromPath(pathname)
  const wantNav = PAGE_NAV[pageKey]
  const isHome = pathname === '/'

  // —— 首页顶部：顶栏以更透的磨砂浮于海报之上（轻微透出海报）——
  useEffect(() => {
    const isHome = pathname === '/'
    const update = () => {
      let over = false
      if (isHome) {
        // 首屏海报由内容库 carousel 区块渲染（旧 .hero 结构已停用）
        const poster = document.querySelector('[data-block="carousel"]')
        if (poster) over = poster.getBoundingClientRect().bottom > 64
      }
      setOverHero(over)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    // 首屏海报为异步渲染（内容库取数后才挂载），首次探测可能早于海报出现；
    // 用有限次重试兜底，数据到位后即修正为「磨砂浮于海报之上」。
    const timers = [200, 600, 1200, 2000].map((ms) => window.setTimeout(update, ms))
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [pathname])

  // 切换路由时收起所有浮层
  useEffect(() => {
    setOpenMenu(null)
    setLangOpen(false)
    setSearchOpen(false)
  }, [pathname])

  // 下拉菜单展开高度：跟随内容高度，避免写死
  useLayoutEffect(() => {
    const inner = megaInnerRef.current
    if (!inner) return
    if (!openMenu) {
      inner.style.height = '0px'
      return
    }
    const panel = inner.querySelector<HTMLElement>(`[data-mega-panel="${openMenu}"]`)
    inner.style.height = panel ? `${panel.offsetHeight}px` : '0px'
  }, [openMenu])

  /**
   * 下拉面板的内容从一级导航左边缘开始（而不是从页面容器左边缘），
   * 让「产品 / 天梯榜 …」与展开面在视觉上同一列起步。
   *
   * 面板与顶栏共用同一个 `.container`，两者左边框一致，所以差值就是需要补的左内边距。
   * 每次按当前计算值重算（幂等）：字体/语言切换、窗口尺寸变化都不会累积偏移。
   */
  useLayoutEffect(() => {
    const nav = navRef.current
    const box = megaContainerRef.current
    if (!nav || !box) return
    const apply = () => {
      const base = parseFloat(getComputedStyle(box).paddingLeft) || 0
      const delta = nav.getBoundingClientRect().left - box.getBoundingClientRect().left - base
      box.style.paddingLeft = `${base + Math.max(0, delta)}px`
    }
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [openMenu, lang])

  // 语言 / 搜索浮层：Esc、点击外部收起
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setLangOpen(false)
      setSearchOpen(false)
      setOpenMenu(null)
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (!target.closest('.site-lang')) setLangOpen(false)
      if (!target.closest('.site-search')) setSearchOpen(false)
      if (!target.closest('.site-header')) setOpenMenu(null)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('click', onClick)
    }
  }, [])

  useEffect(() => {
    const onResize = () => {
      const inner = megaInnerRef.current
      if (!inner || !openMenu) return
      const panel = inner.querySelector<HTMLElement>(`[data-mega-panel="${openMenu}"]`)
      if (panel) inner.style.height = `${panel.offsetHeight}px`
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [openMenu])

  const cancelHide = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  const scheduleHide = () => {
    cancelHide()
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), 180)
  }

  const submitSearch = () => {
    const q = query.trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
    setSearchOpen(false)
  }

  const activeLang = LANG_OPTIONS.find((option) => option.code === lang) ?? LANG_OPTIONS[0]

  return (
    <>
      {/* 公告条：置于顶栏之上；可关闭时按配置隐藏 */}
      {announcement && !announceDismissed && <AnnouncementBar announcement={announcement} onDismiss={dismissAnnounce} />}
      {/* 悬停热区 = 一级导航 + 下拉面板：指针从一级菜单移到面板不会收起，
          离开这个区域（含移到左侧 LOGO / 右侧操作区）才延时收起。 */}
      <header
        ref={headerRef}
        className={`site-header${overHero ? ' site-header--over-hero' : ''}${isHome ? ' site-header--home' : ''}`}
      >
      <div className="container site-header__inner" style={{ position: 'relative' }}>
        <Link className="logo" to="/">
          <BrandMark className="logo__mark" />
          <span className="logo__word" role="img" aria-label={t('brand.wordmark')} />
        </Link>

        <div className="site-navzone" onMouseEnter={cancelHide} onMouseLeave={scheduleHide}>
        <nav className="site-nav" ref={navRef} aria-label={t('a11y.mainNav')} style={{ position: 'relative' }}>
          {navItems.map((item) => {
            const isActive = !!wantNav && item.nav === wantNav
            const isMenuActive = !!item.menu && openMenu === item.menu
            const openIfMenu = () => {
              if (!item.menu) return
              cancelHide()
              setOpenMenu(item.menu)
            }
            return (
              <span key={item.menu || item.to} className="site-nav__item">
                <Link
                  to={item.to}
                  className={[isActive ? 'is-active' : '', isMenuActive ? 'is-menu-active' : '']
                    .filter(Boolean)
                    .join(' ')}
                  aria-haspopup={item.menu ? 'true' : undefined}
                  aria-expanded={item.menu ? isMenuActive : undefined}
                  onMouseEnter={openIfMenu}
                  onFocus={openIfMenu}
                  onClick={openIfMenu}
                >
                  {item.label}
                </Link>
                {item.badge && (
                  <span
                    className={`nav-badge nav-badge--${item.badge}${item.badgeShake ? ' nav-badge--shake' : ''}`}
                    aria-hidden="true"
                  >
                    {item.badgeText ?? item.badge.toUpperCase()}
                  </span>
                )}
              </span>
            )
          })}
        </nav>
        {/* 店铺圆钮：置于导航区末尾（最后一个一级导航项之后、右侧图标组之前） */}
        {shopChannels.length > 0 && <ShopButton channels={shopChannels} />}
        </div>

        <div className="site-actions">
          <div className={`search site-search${searchOpen ? ' is-open' : ''}`}>
            <button
              className="search__toggle icon-btn"
              type="button"
              aria-label={t('a11y.search')}
              aria-expanded={searchOpen}
              onClick={(event) => {
                event.stopPropagation()
                setSearchOpen((open) => !open)
              }}
            >
              <IconSearch />
            </button>
            <div className="search__panel">
              <input
                className="input search__input"
                type="search"
                placeholder={t('search.placeholder')}
                aria-label={t('a11y.searchSite')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setSearchOpen(false)
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    submitSearch()
                  }
                }}
              />
            </div>
          </div>

          <button
            className="icon-btn"
            type="button"
            aria-label={theme === 'dark' ? t('a11y.themeLight') : t('a11y.themeDark')}
            onClick={toggleTheme}
          >
            {/* 月亮轮廓偏细、视觉重量轻，+1px 光学补偿，与其余图标并排重心一致 */}
            {theme === 'dark' ? <IconSun /> : <IconMoon size={19} />}
          </button>

          <div className={`site-lang${langOpen ? ' is-open' : ''}`}>
            <button
              className="lang__toggle icon-btn"
              type="button"
              aria-label={t('a11y.langToggle', { lang: activeLang.label })}
              aria-haspopup="true"
              aria-expanded={langOpen}
              onClick={(event) => {
                event.stopPropagation()
                setLangOpen((open) => !open)
              }}
            >
              <IconGlobe />
            </button>
            <div className="lang__panel" role="menu" aria-label={t('a11y.langMenu')}>
              {LANG_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  className={`lang__opt${option.code === lang ? ' is-active' : ''}`}
                  type="button"
                  role="menuitemradio"
                  aria-checked={option.code === lang}
                  onClick={() => {
                    onLangChange(option.code)
                    setLangOpen(false)
                  }}
                >
                  {option.label}
                  <span className="lang__code">{option.code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 顶栏 CTA：预约体验 / 购买（后台站点配置可配；窄屏由 CSS 隐藏）。
              按反馈去掉「产品总览」次级入口——它与一级导航「产品」重复，顶栏更干净。 */}
          {topCta.primary && (
            <Link
              className="btn btn--primary btn--sm site-cta"
              to={topCta.primary.href}
              onClick={() => trackEvent('cta', topCta.primary?.href ?? '')}
            >
              {topCta.primary.label}
            </Link>
          )}

          <Link className="icon-btn" to="/support" aria-label={t('a11y.support')}>
            <IconSupport />
          </Link>
          {user ? (
            <Link className="icon-btn" to="/me" aria-label="个人中心">
              {/* 人形轮廓偏瘦，+1px 光学补偿，与相邻图标并排重心一致 */}
              <IconAccount size={19} />
            </Link>
          ) : (
            // 未登录：顶栏只放账号图标（按反馈去掉文字，避免挤压导航）；可访问名保留「登录 / 注册」
            <Link className="icon-btn" to="/login" aria-label="登录 / 注册" title="登录 / 注册">
              <IconAccount size={19} />
            </Link>
          )}
          <button
            className="icon-btn nav-toggle"
            type="button"
            aria-label={t('a11y.openDrawer')}
            aria-expanded={false}
            aria-controls="mobileDrawer"
            onClick={onOpenDrawer}
          >
            <IconMenu />
          </button>
        </div>
      </div>

      <span className="scroll-progress" aria-hidden="true" />

      {/* 宽屏下拉菜单：一级菜单悬停/聚焦展开，展示二级栏目（开合由「导航 + 面板」热区统一控制） */}
      <div
        className={`mega${openMenu ? ' is-open' : ''}`}
        aria-hidden={!openMenu}
        onMouseEnter={cancelHide}
        onMouseLeave={scheduleHide}
      >
        <div className="mega__inner" ref={megaInnerRef} style={{ height: 0 }}>
          <div className="container" ref={megaContainerRef}>
            {panels.map((panel) => {
              // 级联过滤：剔除指向已下线页面的链接（空列不渲染），保证下拉里不出现死链
              const columns = panel.columns
                .map((column) => ({ ...column, links: column.links.filter((link) => isPathLive(link.to)) }))
                .filter((column) => column.links.length > 0)
              const featureTo = columns[0]?.links[0]?.to
              return (
                <div
                  key={panel.key}
                  className={`mega__panel${openMenu === panel.key ? ' is-active' : ''}`}
                  data-mega-panel={panel.key}
                >
                  {/* 二级栏目按自身列数自适应列宽；推荐卡关闭时不占列（--mega-cols 仍由 CSS 变量下发）。 */}
                  <div
                    className={`mega__cols${navFeatureEnabled ? '' : ' mega__cols--plain'}${columns.length >= 3 ? ' mega__cols--wide' : ''}`}
                    style={{ '--mega-cols': columns.length } as CSSProperties}
                  >
                    {columns.map((column) => (
                      <div className="mega__col" key={column.eyebrow}>
                        <p className="mega__eyebrow">{column.eyebrow}</p>
                        {column.links.map((link) => (
                          <Link className="mega__link" key={link.label} to={link.to}>
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    ))}
                    {navFeatureEnabled && featureTo && (
                      <Link className="mega__feature" to={featureTo}>
                        <span className="mega__feature-media" aria-hidden="true">
                          {MEGA_FEATURE_IMAGE[panel.key] && (
                            <img src={MEGA_FEATURE_IMAGE[panel.key]} alt="" loading="lazy" />
                          )}
                        </span>
                        <span className="mega__feature-eyebrow">{panel.feature.eyebrow}</span>
                        <b className="mega__feature-title">{panel.feature.title}</b>
                        <span className="mega__feature-desc">{panel.feature.desc}</span>
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      </header>

      {/* 遮罩：只压暗内容，顶栏保持清晰 */}
      <div className={`mega-scrim${openMenu ? ' is-open' : ''}`} aria-hidden="true" />
    </>
  )
}