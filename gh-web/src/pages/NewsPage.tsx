import { PageView } from '../blocks/PageView'

/**
 * 新闻列表（/news）：由内容库 `news` 页驱动（标题正文 + 动态列表数据源区块）。
 */
export function NewsPage() {
  return <PageView pageKey="news" />
}