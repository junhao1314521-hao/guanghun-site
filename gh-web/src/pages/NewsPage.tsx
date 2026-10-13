import { PageView } from '../blocks/PageView'

/**
 * 新闻列表（/news）：由内容库 `news` 页驱动（标题正文 + 动态列表数据源区块）。
 *
 * 注意：当前路由表中 `/news` 仍指向 ArticlesPage（App.tsx 受本阶段边界冻结），
 * 需将 App.tsx 的 `/news` 路由元素改为本组件后方可生效。
 */
export function NewsPage() {
  return <PageView pageKey="news" />
}