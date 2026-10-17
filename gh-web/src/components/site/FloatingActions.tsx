import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { IconArrowUp, IconChat, IconChevronRight, IconPhone, IconSupport } from '../ui/Icon'
import { QrBox } from './QrPlaceholder'

/**
 * 右下角悬浮按钮组：返回顶部 / 联系客服。
 * - 「返回顶部」仅在滚动超过一屏后淡入；
 * - 「联系客服」悬停（桌面）/ 聚焦（键盘）/ 点击（触屏）展开面板，
 *   点击外部或 Esc 关闭；动效受 prefers-reduced-motion 约束。
 * - 「在线留言」不再单独成钮：面板内已有同一入口（R7.2 精简）。
 */
export function FloatingActions() {
  const { t } = useI18n()
  const [showTop, setShowTop] = useState(false)
  const [open, setOpen] = useState(false)
  const contactRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 触屏 / 键盘兜底：hover 不可用时点外部或 Esc 关闭
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!contactRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <div className={`fab${showTop ? ' is-visible' : ''}`}>
      <button type="button" className="fab__btn fab__btn--top" aria-label={t('fab.top')} onClick={toTop}>
        <IconArrowUp size={18} />
      </button>

      <div className={`fab__contact${open ? ' is-open' : ''}`} ref={contactRef}>
        <button
          type="button"
          className="fab__btn fab__btn--primary"
          aria-label={t('fab.contact')}
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls="fab-contact-panel"
          onClick={() => setOpen((v) => !v)}
        >
          <IconSupport size={20} />
        </button>

        <div className="fab__panel" id="fab-contact-panel" aria-label={t('fab.panelTitle')}>
          <div className="fab__panel-head">
            <div>
              <p className="fab__panel-title">{t('fab.panelTitle')}</p>
              <p className="fab__panel-sub">{t('fab.panelSub')}</p>
            </div>
            <span className="fab__panel-live">
              <i />
              {t('fab.online')}
            </span>
          </div>

          <div className="fab__panel-qr">
            <QrBox label={t('footer.wechat')} />
            <div className="fab__panel-qrcopy">
              <b>{t('fab.wechat')}</b>
              <span>{t('fab.wechatHint')}</span>
            </div>
          </div>

          <a className="fab__panel-row" href="tel:4000000000">
            <IconPhone />
            <span>{t('fab.hotline')}</span>
            <b>{t('fab.hotlineValue')}</b>
          </a>
          <Link className="fab__panel-row" to="/inquiry">
            <IconChat size={16} />
            <span>{t('fab.message')}</span>
            <IconChevronRight className="fab__panel-chev" />
          </Link>
        </div>
      </div>
    </div>
  )
}
