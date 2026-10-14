import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MEGA_PANELS, PAGE_NAV, pageIdFromPath } from '../../data/nav'
import { MEGA_PANELS_EN } from '../../data/navEn'
import { LANG_OPTIONS } from '../../data/site'
import { useSiteNav } from '../../hooks/useSiteConfig'
import { useSession } from '../../hooks/useSession'
import { useI18n } from '../../i18n'
import { BrandMark } from './BrandMark'
import { toggleTheme } from '../../lib/theme'
import { useTheme } from '../../lib/useTheme'
import {
  IconAccount,
  IconGlobe,
  IconMenu,
  IconMoon,
  IconSearch,
  IconSun,
  IconSupport,
} from '../ui/Icon'

type Props = {
  lang: string
  onLangChange: (code: string) => void
  onOpenDrawer: () => void
}

/** 顶栏：主导航 + 宽屏下拉菜单 + 搜索 + 语言 + 主题 + 客服/账号 */
export function SiteHeader({ lang, onLangChange, onOpenDrawer }: Props) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const { t } = useI18n()
  // 一级导航来自内容库站点配置（回落本地真源），下拉展开面按语言选用本地 MEGA_PANELS（中文）/ EN 覆盖
  const navItems = useSiteNav()
  const panels = lang === 'en' ? MEGA_PANELS_EN : MEGA_PANELS
  // 登录态：已登录 → 个人中心；未登录 → 登录页（入口按会话切换）
  const { user } = useSession()

  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [langOpen, setLangOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [overHero, setOverHero] = useState(false)
  const [query, setQuery] = useState('')

  const headerRef = useRef<HTMLElement>(null)
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
      <header ref={headerRef} className={`site-header${overHero ? ' site-header--over-hero' : ''}${isHome ? ' site-header--home' : ''}`}>
      <div className="container site-header__inner" style={{ position: 'relative' }}>
        <Link className="logo" to="/">
          <BrandMark className="logo__mark" />
          <span className="logo__word" role="img" aria-label={t('brand.wordmark')} />
        </Link>

        <nav className="site-nav" aria-label={t('a11y.mainNav')} style={{ position: 'relative' }}>
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
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
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

          <Link className="icon-btn" to="/support" aria-label={t('a11y.support')}>
            <IconSupport />
          </Link>
          <Link className="icon-btn" to={user ? '/me' : '/login'} aria-label={t('a11y.account')}>
            <IconAccount />
          </Link>
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

      {/* 宽屏下拉菜单：一级菜单悬停/聚焦展开，展示二级栏目 */}
      <div
        className={`mega${openMenu ? ' is-open' : ''}`}
        aria-hidden={!openMenu}
        onMouseEnter={cancelHide}
        onMouseLeave={scheduleHide}
      >
        <div className="mega__inner" ref={megaInnerRef} style={{ height: 0 }}>
          <div className="container">
            {panels.map((panel) => (
              <div
                key={panel.key}
                className={`mega__panel${openMenu === panel.key ? ' is-active' : ''}`}
                data-mega-panel={panel.key}
              >
                <div className="mega__cols">
                  {panel.columns.map((column) => (
                    <div className="mega__col" key={column.eyebrow}>
                      <p className="mega__eyebrow">{column.eyebrow}</p>
                      {column.links.map((link) => (
                        <Link className="mega__link" key={link.label} to={link.to}>
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                  <Link className="mega__feature" to={panel.columns[0].links[0].to}>
                    <span className="mega__feature-media" aria-hidden="true" />
                    <span className="mega__feature-eyebrow">{panel.feature.eyebrow}</span>
                    <b className="mega__feature-title">{panel.feature.title}</b>
                    <span className="mega__feature-desc">{panel.feature.desc}</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </header>

      {/* 遮罩：只压暗内容，顶栏保持清晰 */}
      <div className={`mega-scrim${openMenu ? ' is-open' : ''}`} aria-hidden="true" />
    </>
  )
}