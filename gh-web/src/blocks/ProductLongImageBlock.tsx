/**
 * productLongImage 产品详情 · H5 长图。
 *
 * 读取当前产品的 `h5LongImages`（桌面）与 `h5LongImagesMobile`（移动）切片，
 * 按索引一一对应，复用 `LongImageBlock` 做无缝隙垂直拼接。
 * 占位宽度按 750px 设计稿居中；移动端铺满。
 * 没有上传任何切片时整块不渲染（BlockRenderer 也会跳过外壳）。
 */
import { useProductDetail } from './ProductDetailContext'
import { LongImageBlock } from './LongImageBlock'

export function ProductLongImageBlock({ props }: { props: Record<string, unknown> }) {
  const detail = useProductDetail()
  const desktop = detail?.h5LongImages ?? []
  const mobile = detail?.h5LongImagesMobile ?? []
  const count = Math.max(desktop.length, mobile.length)

  if (!count) return null

  const items = Array.from({ length: count }, (_, index) => ({
    image: desktop[index] ?? mobile[index] ?? '',
    imageMobile: mobile[index] ?? '',
    alt: `${detail?.model ?? ''} 产品长图 ${index + 1}`,
  })).filter((item) => item.image || item.imageMobile)

  if (!items.length) return null

  return (
    <div className="pdl-h5-long">
      <LongImageBlock props={{ ...props, items }} />
    </div>
  )
}
