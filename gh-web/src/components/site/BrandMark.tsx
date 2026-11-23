import { useI18n } from '../../i18n'

/**
 * 品牌图形 mark（SVDC · 光魂）。
 *
 * 由官方 LOGO 资产烘焙为透明 PNG（`public/brand/mark.png`），保证元素完整（含右下角三角）；
 * 用 CSS `filter: drop-shadow()` 做辉光 / 呼吸（见 site.css 的 `.logo__mark`）。
 */
export function BrandMark({ className }: { className?: string }) {
  const { t } = useI18n()
  return <img className={className} src="/brand/mark.png" alt={t('brand.name')} width={30} height={30} />
}
