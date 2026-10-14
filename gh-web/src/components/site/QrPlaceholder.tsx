import { useI18n } from '../../i18n'

/**
 * 二维码占位（纯矢量，非破图）：白底 + 黑模块的**示意图形**，不可扫描；
 * 正式上线替换为真实码图。此处的尺寸 / 留白即为上传规范（正方形、四周留白 ≥ 8%）。
 */
export function QrBox({ label, className }: { label: string; className?: string }) {
  const { t } = useI18n()
  return (
    <div className={className ? `qr__box ${className}` : 'qr__box'}>
      <svg viewBox="0 0 33 33" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={t('footer.qrAria', { label })}>
        <rect width="33" height="33" fill="#FFFFFF" />
        <g fill="#101014">
          <rect x="1" y="1" width="7" height="7" />
          <rect x="2" y="2" width="5" height="5" fill="#FFFFFF" />
          <rect x="3" y="3" width="3" height="3" />
          <rect x="25" y="1" width="7" height="7" />
          <rect x="26" y="2" width="5" height="5" fill="#FFFFFF" />
          <rect x="27" y="3" width="3" height="3" />
          <rect x="1" y="25" width="7" height="7" />
          <rect x="2" y="26" width="5" height="5" fill="#FFFFFF" />
          <rect x="3" y="27" width="3" height="3" />
          <rect x="12" y="12" width="2" height="2" />
          <rect x="16" y="12" width="2" height="2" />
          <rect x="20" y="12" width="2" height="2" />
          <rect x="12" y="16" width="2" height="2" />
          <rect x="18" y="15" width="2" height="2" />
          <rect x="21" y="16" width="2" height="2" />
          <rect x="14" y="19" width="2" height="2" />
          <rect x="19" y="19" width="2" height="2" />
          <rect x="12" y="21" width="2" height="2" />
          <rect x="16" y="21" width="2" height="2" />
          <rect x="20" y="21" width="2" height="2" />
          <rect x="22" y="20" width="2" height="2" />
        </g>
      </svg>
    </div>
  )
}

/** 带标签的二维码占位（页脚「关注我们」用）；附「示意」说明，避免被误当可扫真码 */
export function QrPlaceholder({ label }: { label: string }) {
  const { t } = useI18n()
  return (
    <div className="qr">
      <QrBox label={label} />
      <span className="qr__label">{label}</span>
      <span className="field__hint" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
        {t('footer.qrNote')}
      </span>
    </div>
  )
}
