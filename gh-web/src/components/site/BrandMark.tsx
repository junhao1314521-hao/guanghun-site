/**
 * 品牌图形 mark（SVDC · 光魂）。
 *
 * 由官方 LOGO 资产烘焙为透明 PNG（`public/brand/mark.png`），保证元素完整（含右下角三角）；
 * 用 CSS `filter: drop-shadow()` 做辉光 / 呼吸（见 site.css 的 `.logo__mark`）。
 */
export function BrandMark({ className }: { className?: string }) {
  return <img className={className} src="/brand/mark.png" alt="光魂" width={30} height={30} />
}
