import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MEGA_PANELS } from '../../data/nav'
import { MEGA_PANELS_EN } from '../../data/navEn'
import { LANG_OPTIONS } from '../../data/site'
import { useSiteNav } from '../../hooks/useSiteConfig'
import { useI18n } from '../../i18n'
import { BrandMark } from './BrandMark'
import { IconChevronDown, IconClose } from '../ui/Icon'

type Props = {
  open: boolean
  lang: string
  onLangChange: (code: string) => void
  onClose: () => void
}

const FOCUSABLE = 'button, a[href], input, [tabindex]:not([tabindex="-1"])'

/**
 * 移动端导航抽屉（<1024px 专用，桌面端完全不参与）。
 * 二级栏目由主导航数据生成，与顶栏下拉菜单共用同一份真源，避免两处维护。
 */
export function MobileDrawer({ open, lang, onLangChange, onClose }: Props) {
  const { t } = useI18n()
  // 一级导航来自内容库站点配置（回落本地真源），二级栏目按语言选用本地 MEGA_PANELS（中文）/ EN 覆盖
  const navItems = useSiteNav()
  const panels = lang === 'en' ? MEGA_PANELS_EN : MEGA_PANELS
  const [expanded, setExpanded] = useState<string | null>(null)
  // 关闭动画期间保留 DOM（与 .drawer 的 340ms 过渡对齐）
  const [mounted, setMounted] = useState(open)
  const panelRef = useRef<HTMLElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const timer = window.setTimeout(() => setMounted(false), 340)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    document.body.classList.toggle('drawer-open', open)
    return () => document.body.classList.remove('drawer-open')
  }, [open])

  // 打开时聚焦关闭按钮；Esc 关闭；Tab 焦点锁定在抽屉内；关闭时把焦点归还给触发按钮
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    closeBtnRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // 焦点归还：避免关闭后焦点丢失到 body（键盘用户需重新 Tab 一串控件）
      opener?.focus?.()
    }
  }, [open, onClose])

  // 回到桌面宽度时自动收起，避免状态残留
  useEffect(() => {
    const onResize = () => {
      if (open && window.innerWidth >= 1024) onClose()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, onClose])

  if (!mounted) return null

  return (
    <div className={`drawer${open ? ' is-open' : ''}`} id="mobileDrawer">
      <div className="drawer__scrim" onClick={onClose} />
      <aside className="drawer__panel" role="dialog" aria-modal="true" aria-label={t('a11y.drawerNav')} ref={panelRef}>
        <div className="drawer__head">
          <span className="drawer__brand">
            <BrandMark className="logo__mark" />
            <span className="logo__word" role="img" aria-label={t('brand.wordmark')} />
          </span>
          <button
            className="icon-btn"
            type="button"
            aria-label={t('a11y.closeDrawer')}
            ref={closeBtnRef}
            onClick={onClose}
          >
            <IconClose />
          </button>
        </div>

        <nav className="drawer__body" aria-label={t('a11y.drawerMobileNav')}>
          {navItems.map((item) => {
            const panel = panels.find((p) => p.key === item.menu)
            // 无二级面板的一级项：退化为直接跳转链接，保持抽屉可导航
            if (!panel) {
              return (
                <div className="drawer__group" key={item.to}>
                  <Link className="drawer__group-btn" to={item.to} onClick={onClose}>
                    {item.label}
                  </Link>
                </div>
              )
            }
            const isOpen = expanded === item.menu
            return (
              <div className={`drawer__group${isOpen ? ' is-open' : ''}`} key={item.menu}>
                <button
                  type="button"
                  className="drawer__group-btn"
                  aria-expanded={isOpen}
                  onClick={() => setExpanded(isOpen ? null : item.menu)}
                >
                  <span>{item.label}</span>
                  <IconChevronDown />
                </button>
                <div className="drawer__sub">
                  <div className="drawer__sub-inner">
                    {panel.columns.map((column) => (
                      <Fragment key={column.eyebrow}>
                        <p className="mega__eyebrow">{column.eyebrow}</p>
                        {column.links.map((link) => (
                          <Link className="mega__link" key={link.label} to={link.to} onClick={onClose}>
                            {link.label}
                          </Link>
                        ))}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}

          {/* 语言：抽屉内镜像顶栏语言入口（同一份选项，单一真源） */}
          <div className="drawer__group drawer__group--lang">
            <p className="mega__eyebrow">{t('drawer.langHeading')}</p>
            {LANG_OPTIONS.map((option) => (
              <button
                key={option.code}
                className={`lang__opt${option.code === lang ? ' is-active' : ''}`}
                type="button"
                role="menuitemradio"
                aria-checked={option.code === lang}
                onClick={() => {
                  onLangChange(option.code)
                  onClose()
                }}
              >
                {option.label}
                <span className="lang__code">{option.code}</span>
              </button>
            ))}
          </div>
        </nav>
      </aside>
    </div>
  )
}