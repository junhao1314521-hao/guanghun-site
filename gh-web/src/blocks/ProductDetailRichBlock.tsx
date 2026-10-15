/**
 * 28. productDetailRich 产品详情 · 详情图文（productDetailRich）。
 *
 * 渲染**当前产品**的 `detailHtml`（长图 / 图文混排）：
 * - 内容来自产品集合（由 `ProductDetailContext` 注入的当前产品详情），区块本身不存内容；
 * - 渲染前复用 `sanitizeRichText` 白名单净化（与 richText / html 模块同一安全边界）；
 * - 详情富文本为空时**不渲染、不占位**（停用后下方区块自动上移）。
 *
 * 与模板级 `richText` 区块的区别：后者内容由模板共用一份，无法按产品区分；本区块按产品取数。
 */
import { useProductDetail } from './ProductDetailContext'
import { sanitizeRichText } from './sanitize'

export function ProductDetailRichBlock() {
  const detail = useProductDetail()
  const html = detail?.detailHtml ? sanitizeRichText(detail.detailHtml) : ''
  if (!html.trim()) return null
  return <div className="pd-detail-rich" dangerouslySetInnerHTML={{ __html: html }} />
}
