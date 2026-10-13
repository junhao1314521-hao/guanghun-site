import { Link } from 'react-router-dom'
import { FOOTER_LEGAL, SITE_EMAILS } from '../../data/site'
import { useSiteFooterGroups } from '../../hooks/useSiteConfig'
import { useI18n } from '../../i18n'
import { BrandMark } from './BrandMark'
import { QrPlaceholder } from './QrPlaceholder'
import { IconMail, IconPhone, IconPin } from '../ui/Icon'
import { TOUR_OPEN_EVENT } from './SiteTour'

export function SiteFooter() {
  const { t } = useI18n()
  // 页脚分组来自内容库站点配置（回落本地硬编码），法务条目 / 联系方式仍为本地真源
  const footerGroups = useSiteFooterGroups()
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

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3>{group.title}</h3>
              {group.links.map((link) => (
                <Link key={link.label} to={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}

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
            <button
              className="site-footer__tour"
              type="button"
              onClick={() => window.dispatchEvent(new Event(TOUR_OPEN_EVENT))}
            >
              {t('tour.reopen')}
            </button>
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