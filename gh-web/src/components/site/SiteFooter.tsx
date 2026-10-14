import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FOOTER_LEGAL, SITE_EMAILS } from '../../data/site'
import { useSiteFooterGroups } from '../../hooks/useSiteConfig'
import { useI18n } from '../../i18n'
import { BrandMark } from './BrandMark'
import { QrPlaceholder } from './QrPlaceholder'
import { IconMail, IconPhone, IconPin } from '../ui/Icon'

export function SiteFooter() {
  const { t } = useI18n()
  // 页脚分组来自内容库站点配置（回落本地硬编码），法务条目 / 联系方式仍为本地真源
  const footerGroups = useSiteFooterGroups()
  // 移动端：链接组折叠（手风琴）。桌面端由 CSS 强制展开，本状态不影响桌面。
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(() => new Set())
  const toggleGroup = (title: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  return (
    <footer className="site-footer" style={{ position: 'relative' }}>
      <div className="container">
        <div className="site-footer__cols">
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

          {footerGroups.map((group, index) => {
            const open = openGroups.has(group.title)
            const panelId = `footer-group-${index}`
            return (
              <div className={`site-footer__group${open ? ' is-open' : ''}`} key={group.title}>
                {/* 移动端：可点的折叠标题（手风琴）；桌面端由 CSS 隐藏本按钮、显示下方 h3 */}
                <button
                  type="button"
                  className="site-footer__group-toggle"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => toggleGroup(group.title)}
                >
                  <span>{group.title}</span>
                  <span className="site-footer__chevron" aria-hidden="true">
                    ⌄
                  </span>
                </button>
                <h3 className="site-footer__group-title">{group.title}</h3>
                <div className="site-footer__group-links" id={panelId}>
                  {group.links.map((link) => (
                    <Link key={link.label} to={link.href}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}

          <div>
            <h3>{t('footer.follow')}</h3>
            <div className="site-footer__qrs">
              <QrPlaceholder label={t('footer.wechat')} />
              <QrPlaceholder label={t('footer.miniapp')} />
            </div>
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>{t('footer.copyright')}</span>
          <div className="row" style={{ gap: 'var(--gh-space-4)' }}>
            {FOOTER_LEGAL.map((item) => (
              <Link key={item.label} to={item.to} style={{ color: 'inherit' }}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}