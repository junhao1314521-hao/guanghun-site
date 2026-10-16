import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { FALLBACK_SOCIAL, SITE_COMPANY, SITE_RECORD, normalizeSocial } from '../../data/site'
import { useSiteConfig, useSiteFooterGroups } from '../../hooks/useSiteConfig'
import { useI18n } from '../../i18n'
import { useTheme } from '../../lib/useTheme'
import { BrandMark } from './BrandMark'
import { CodeBackdrop } from './CodeBackdrop'
import { IconBilibili, IconDouyin, IconWeChat, IconWeibo } from '../ui/Icon'
import type { SiteSocialItem } from '../../data/contentTypes'

/** 未知平台的兜底字符标：取平台名首字（如「小宇宙」→「小」） */
function socialShort(label: string): string {
  return label.trim().slice(0, 1) || '·'
}

/** 平台名 → 线性图标（微信 / 微博 / B 站 / 抖音）；未知平台回退首字字符标 */
function socialIcon(label: string, size = 22) {
  const key = label.trim().toLowerCase()
  if (key.includes('微信') || key.includes('wechat')) return <IconWeChat size={size} />
  if (key.includes('微博') || key.includes('weibo')) return <IconWeibo size={size} />
  if (key.includes('b站') || key.includes('b 站') || key.includes('哔哩') || key.includes('bilibili')) return <IconBilibili size={size} />
  if (key.includes('抖音') || key.includes('douyin') || key.includes('tiktok')) return <IconDouyin size={size} />
  return <span>{socialShort(label)}</span>
}

type SocialEntryProps = {
  item: SiteSocialItem
  /** 是否处于展开态（由父级统一裁决，保证同一时刻只展开一个浮层） */
  open: boolean
  onEnter: () => void
  onLeave: () => void
  onToggle: () => void
  onFocusOpen: (focusVisible: boolean) => void
  onBlurClose: () => void
}

/**
 * 单个社交入口：有二维码 / 账号 → 浮层；仅链接 → 直接跳转不弹层。
 * 显隐完全由父级下发的 `open` 决定（不再依赖容器 `:hover`），故同一时刻只有一个浮层展开。
 */
function SocialEntry({ item, open, onEnter, onLeave, onToggle, onFocusOpen, onBlurClose }: SocialEntryProps) {
  const wrapRef = useRef<HTMLSpanElement>(null)
  const popRef = useRef<HTMLSpanElement>(null)
  // 记录最近一次指针类型：用于区分鼠标点击（悬停已开，无需切换）与触屏点击（需切换）
  const pointerType = useRef('')
  // 浮层对齐：shift = 相对居中位置的横向偏移（px）；arrow = 箭头距浮层左边缘（px）
  const [align, setAlign] = useState<{ shift: number; arrow: number }>({ shift: 0, arrow: 0 })

  const icon = socialIcon(item.label)

  /** 浮层随图标移动：靠近视口左右边缘时自动内收，箭头始终指向图标 */
  useLayoutEffect(() => {
    if (!open) return
    const pop = popRef.current
    const wrap = wrapRef.current
    if (!pop || !wrap) return
    const measure = () => {
      const pw = pop.offsetWidth
      const rect = wrap.getBoundingClientRect()
      const center = rect.left + rect.width / 2
      const vw = document.documentElement.clientWidth
      const margin = 8
      let left = center - pw / 2
      if (left + pw > vw - margin) left = vw - margin - pw
      if (left < margin) left = margin
      const shift = left - (center - pw / 2)
      const arrow = Math.min(Math.max(center - left, 14), Math.max(14, pw - 14))
      setAlign({ shift, arrow })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open])

  const popoverStyle = {
    left: `calc(50% + ${align.shift}px)`,
    '--pop-arrow-left': `${align.arrow}px`,
  } as CSSProperties

  // 仅链接：直接跳转，不弹层
  if (!item.qr && !item.account) {
    if (!item.href) {
      return (
        <span className="site-footer__social-item is-placeholder" aria-label={`${item.label}（待配置）`}>
          {icon}
        </span>
      )
    }
    return (
      <a className="site-footer__social-item" href={item.href} aria-label={item.label} target="_blank" rel="noreferrer">
        {icon}
      </a>
    )
  }
  const hint = item.qr ? item.label : `${item.label}：${item.account} · 打开${item.label}搜索关注`
  return (
    <span
      className={`site-footer__social-wrap${open ? ' is-open' : ''}`}
      ref={wrapRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onPointerDown={(event) => {
        pointerType.current = event.pointerType
      }}
    >
      <button
        type="button"
        className="site-footer__social-item"
        aria-label={item.label}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={(event) => {
          // 键盘触发（detail=0）或触屏 → 切换；鼠标点击不做切换（悬停已开，移开由 mouseleave 收起）
          if (event.detail === 0 || pointerType.current !== 'mouse') onToggle()
        }}
        onFocus={(event) => {
          // 仅键盘聚焦（:focus-visible）展开，避免鼠标 / 触屏点击时的焦点干扰开合
          let visible = false
          try {
            visible = (event.currentTarget as HTMLElement).matches(':focus-visible')
          } catch {
            visible = false
          }
          onFocusOpen(visible)
        }}
        onBlur={onBlurClose}
      >
        {icon}
      </button>
      <span className="site-footer__popover" role="tooltip" ref={popRef} style={popoverStyle}>
        {item.qr ? (
          <>
            <img className="site-footer__popover-qr" src={item.qr} alt={`${item.label}二维码`} loading="lazy" />
            <span className="site-footer__popover-name">{item.label}</span>
          </>
        ) : (
          <span className="site-footer__popover-hint">{hint}</span>
        )}
      </span>
    </span>
  )
}

/**
 * 社交图标行（单例浮层容器）：用 React state 统一裁决「当前展开的项」，
 * 取代历史上按容器 `:hover` 的 CSS 写法，保证悬停 / 点击 / 键盘聚焦时同一时刻只展开一个浮层；
 * 鼠标移开、点击别处、按 Esc、焦点移走均收起。
 */
function FooterSocial({ items, label }: { items: SiteSocialItem[]; label: string }) {
  /** 点击 / 键盘聚焦「钉住」的项 */
  const [pinned, setPinned] = useState<string | null>(null)
  /** 鼠标悬停的项（移开即清） */
  const [hovered, setHovered] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const openKey = pinned ?? hovered

  const closeAll = () => {
    setPinned(null)
    setHovered(null)
  }

  // 有展开项时：Esc 收起 + 点击浮层 / 图标以外区域收起
  useEffect(() => {
    if (!openKey) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAll()
    }
    const onDown = (event: PointerEvent) => {
      const target = event.target
      if (rootRef.current && target instanceof Node && !rootRef.current.contains(target)) closeAll()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [openKey])

  return (
    <div className="site-footer__social" ref={rootRef} aria-label={label}>
      {items.map((item, index) => {
        const key = `${item.label}-${index}`
        return (
          <SocialEntry
            key={key}
            item={item}
            open={openKey === key}
            onEnter={() => setHovered(key)}
            onLeave={() => setHovered((prev) => (prev === key ? null : prev))}
            onToggle={() => setPinned((prev) => (prev === key ? null : key))}
            onFocusOpen={(visible) => {
              if (visible) setPinned(key)
            }}
            onBlurClose={() => setPinned((prev) => (prev === key ? null : prev))}
          />
        )
      })}
    </div>
  )
}

export function SiteFooter() {
  const { t } = useI18n()
  // 页脚动画随主题切换深浅（深色底 / 浅色底两套配色，与首屏海报一致）
  const theme = useTheme()
  // 页脚分组：后台 `site.footer` 优先；为空时由内容库页面列表按「页面层级」自动生成
  const footerGroups = useSiteFooterGroups()
  const site = useSiteConfig()
  // 社交：新数据「每平台一条」；旧数据（图标+链接 / 二维码两条列表）由 normalizeSocial 兜底合并
  const social = normalizeSocial(site?.social ?? FALLBACK_SOCIAL)

  return (
    <footer className="site-footer" style={{ position: 'relative' }}>
      {/* 页脚背景：与首屏海报同款「流动方块」代码动画（随主题切换深浅 + 遮罩保证文字可读） */}
      <CodeBackdrop className="site-footer__canvas" theme={theme} />
      <div className="site-footer__scrim" aria-hidden="true" />
      <div className="container site-footer__content">
        <div className="site-footer__top">
          {/* 左：品牌 + slogan + 社交图标（官网地址已按客户要求移除） */}
          <div className="site-footer__brand">
            <Link className="logo" to="/">
              <BrandMark className="logo__mark" />
              <span className="logo__word" role="img" aria-label={t('brand.wordmark')} />
            </Link>
            <p className="site-footer__slogan">{t('footer.slogan')}</p>
            {social.length > 0 && <FooterSocial items={social} label={t('footer.follow')} />}
          </div>

          {/* 右：多列链接组（组名在上 + 竖排链接；组与组横向并排、左对齐） */}
          <nav className="site-footer__cols" aria-label="页脚导航">
            {footerGroups.map((group) => (
              <div className="site-footer__col" key={group.title}>
                <h3 className="site-footer__col-title">{group.title}</h3>
                <ul className="site-footer__col-links">
                  {group.links.map((link) => (
                    <li key={`${group.title}-${link.label}-${link.href}`}>
                      <Link to={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* 底部：左 = 公司名 + Copyright + 用户协议 | 用户隐私；右 = ICP 备案号 */}
        <div className="site-footer__bottom">
          <div className="site-footer__bottom-left">
            <span className="site-footer__company">{SITE_COMPANY}</span>
            <span className="site-footer__sep" aria-hidden="true">|</span>
            <span className="site-footer__copyright">{t('footer.copyright')}</span>
            <span className="site-footer__sep" aria-hidden="true">|</span>
            <Link to="/legal/terms">{t('footer.terms')}</Link>
            <span className="site-footer__sep" aria-hidden="true">|</span>
            <Link to="/legal/privacy">{t('footer.privacy')}</Link>
          </div>
          <Link className="site-footer__record" to={SITE_RECORD.to}>
            {SITE_RECORD.label}
          </Link>
        </div>
      </div>
    </footer>
  )
}
