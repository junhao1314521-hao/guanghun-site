import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FOOTER_LEGAL, FALLBACK_SOCIAL, SITE_COMPANY, SITE_EMAILS, SITE_RECORD, normalizeSocial } from '../../data/site'
import { useSiteConfig, useSiteFooterGroups } from '../../hooks/useSiteConfig'
import { useI18n } from '../../i18n'
import { useTheme } from '../../lib/useTheme'
import { BrandMark } from './BrandMark'
import { CodeBackdrop } from './CodeBackdrop'
import { IconMail, IconPhone, IconPin } from '../ui/Icon'
import type { SiteSocialItem } from '../../data/contentTypes'

/** 社交图标字符：取平台名首字作为圆形字符标（如「B 站」→「B」） */
function socialShort(label: string): string {
  return label.trim().slice(0, 1) || '·'
}

/** 单个社交入口：有二维码 / 账号 → 浮层；仅链接 → 直接跳转不弹层 */
function SocialEntry({ item }: { item: SiteSocialItem }) {
  const [open, setOpen] = useState(false)
  // 仅链接：直接跳转，不弹层
  if (!item.qr && !item.account) {
    if (!item.href) {
      return (
        <span className="site-footer__social-item is-placeholder" aria-label={`${item.label}（待配置）`}>
          {socialShort(item.label)}
        </span>
      )
    }
    return (
      <a className="site-footer__social-item" href={item.href} aria-label={item.label} target="_blank" rel="noreferrer">
        {socialShort(item.label)}
      </a>
    )
  }
  const hint = item.qr ? item.label : `${item.label}：${item.account} · 打开${item.label}搜索关注`
  return (
    <span className={`site-footer__social-wrap${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="site-footer__social-item"
        aria-label={item.label}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {socialShort(item.label)}
      </button>
      <span className="site-footer__popover" role="tooltip">
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

export function SiteFooter() {
  const { t } = useI18n()
  // 页脚动画随主题切换深浅（深色底 / 浅色底两套配色，与首屏海报一致）
  const theme = useTheme()
  // 页脚分组与社交来自内容库站点配置（回落本地硬编码）；法务条目 / 联系方式仍为本地真源
  const footerGroups = useSiteFooterGroups()
  const site = useSiteConfig()
  // 社交：新数据「每平台一条」；旧数据（图标+链接 / 二维码两条列表）由 normalizeSocial 兜底合并
  const social = normalizeSocial(site?.social ?? FALLBACK_SOCIAL)
  const legalLinks = FOOTER_LEGAL.filter((item) => item.to !== SITE_RECORD.to)

  return (
    <footer className="site-footer" style={{ position: 'relative' }}>
      {/* 页脚背景：与首屏海报同款「流动方块」代码动画（随主题切换深浅 + 遮罩保证文字可读） */}
      <CodeBackdrop className="site-footer__canvas" theme={theme} />
      <div className="site-footer__scrim" aria-hidden="true" />
      <div className="container site-footer__content">
        {/* 品牌大字 + 社交图标 */}
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Link className="logo" to="/">
              <BrandMark className="logo__mark" />
              <span className="logo__word" role="img" aria-label={t('brand.wordmark')} />
            </Link>
            <p className="site-footer__slogan">{t('footer.slogan')}</p>
            <div className="site-footer__contact">
              <a href="tel:4000000000">
                <IconPhone />
                <span>{t('footer.hotline')}</span>
              </a>
              <a href={`mailto:${SITE_EMAILS.business}`}>
                <IconMail />
                <span>{SITE_EMAILS.business}</span>
              </a>
              {/* 占位地址无跳转目标，按非链接文本渲染，避免出现无效链接 */}
              <span className="site-footer__addr">
                <IconPin />
                <span>{t('footer.addr')}</span>
              </span>
            </div>
          </div>
          {social.length > 0 && (
            <div className="site-footer__social" aria-label={t('footer.follow')}>
              {social.map((item, index) => (
                <SocialEntry item={item} key={`${item.label}-${index}`} />
              ))}
            </div>
          )}
        </div>

        {/* 大行链接：行间细线分隔 */}
        <nav className="site-footer__links" aria-label="页脚导航">
          {footerGroups.map((group) => (
            <div className="site-footer__linkrow" key={group.title}>
              <h3 className="site-footer__linkrow-title">{group.title}</h3>
              <div className="site-footer__linkrow-links">
                {group.links.map((link) => (
                  <Link key={link.label} to={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* 底部：公司信息 / 备案号 / 隐私·协议 */}
        <div className="site-footer__bottom">
          <div className="site-footer__meta">
            <span className="site-footer__company">{SITE_COMPANY}</span>
            <span className="site-footer__copyright">{t('footer.copyright')}</span>
          </div>
          <div className="site-footer__legal">
            <Link className="site-footer__record" to={SITE_RECORD.to}>
              {SITE_RECORD.label}
            </Link>
            {legalLinks.map((item) => (
              <Link key={item.label} to={item.to}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
