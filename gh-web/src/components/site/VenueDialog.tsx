/**
 * 体验点统一弹窗。
 *
 * 与详情页复用同一套内容组件（VenueDetailContent variant='dialog'）：
 * 打开时锁定 body 滚动、聚焦弹窗容器、Esc / 点击遮罩关闭、关闭后归还焦点。
 * 无障碍：role="dialog" + aria-modal + aria-labelledby 指向门店名标题。
 */
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchBizVenue } from '../../api/business-extra'
import { useApi } from '../../hooks/useApi'
import { IconClose } from '../ui/Icon'
import { VenueDetailContent } from './VenueDetailContent'

type Props = {
  venueId: string
  onClose: () => void
}

const FOCUSABLE =
  'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function VenueDialog({ venueId, onClose }: Props) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const { data: detail, loading, error } = useApi((signal) => fetchBizVenue(venueId, signal), [venueId, reloadKey])

  useEffect(() => {
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // 锁定 body 滚动
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // 聚焦弹窗容器
    dialogRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      // 焦点陷阱：配合 aria-modal，避免焦点跑到背景（否则与 aria-modal 矛盾）
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!focusables || focusables.length === 0) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }
      const list = Array.from(focusables)
      const first = list[0]
      const last = list[list.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
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
      document.body.style.overflow = prevOverflow
      // 焦点归还触发元素
      restoreRef.current?.focus?.()
    }
  }, [onClose])

  return createPortal(
    <div className="venue-dialog-overlay" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="venue-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="venue-dialog__head">
          <h2 className="venue-dialog__title" id={titleId}>
            {detail?.name ?? '体验点详情'}
          </h2>
          <button className="icon-btn" type="button" aria-label="关闭" onClick={onClose}>
            <IconClose />
          </button>
        </div>

        <div className="venue-dialog__body">
          {error ? (
            <div className="empty">
              <div className="empty__title">体验点加载失败</div>
              <p className="empty__desc">{error.message}。请检查网络后重试。</p>
              <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
                重新加载
              </button>
            </div>
          ) : loading || !detail ? (
            <div aria-busy="true" aria-label="体验点加载中">
              <div className="skeleton" style={{ height: 14, width: '32%' }} />
              <div className="skeleton" style={{ height: 16, width: '62%', marginTop: 'var(--gh-space-3)' }} />
              <div className="skeleton" style={{ height: 120, marginTop: 'var(--gh-space-5)' }} />
              <div className="skeleton" style={{ height: 120, marginTop: 'var(--gh-space-4)' }} />
            </div>
          ) : (
            <VenueDetailContent detail={detail} variant="dialog" />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
