import { useParams } from 'react-router-dom'
import { PageView } from '../blocks/PageView'

/**
 * 品牌页（/brand/:slug）：按页面 key `brand-<slug>` 取内容库渲染（契约 §2 / §5）。
 *
 * 三个品牌页 key：brand-guanghun / brand-lab / brand-esports；未匹配的 slug 会因后端
 * 返回 404 而落入 PageView 的空态（不白屏）。
 */
export function BrandPage() {
  const { slug = '' } = useParams()
  return <PageView pageKey={`brand-${slug}`} />
}