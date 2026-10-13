import { PageView } from '../blocks/PageView'

/**
 * 常见问题（深度线 · 列表）：由内容库页面 key `faq` 驱动渲染其区块序列
 * （text 区块 + faqList 数据源区块）。
 *
 * 通过 `blockDefaults` 为 faqList 区块注入 `showFilter`，在区块内保留原常见问题页的
 * 类别筛选（含 URL `?category=` 深链）与空态。
 */
export function FaqPage() {
  return <PageView pageKey="faq" blockDefaults={{ faqList: { showFilter: true } }} />
}