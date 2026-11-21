import { PageView } from '../blocks/PageView'

/**
 * 文章列表（一级页面）：由内容库页面 key `articles` 驱动渲染其区块序列
 * （text 区块 + articleList 数据源区块）。
 *
 * 通过 `blockDefaults` 为 articleList 区块注入 `showFilter`，在区块内保留原文章列表页的
 * 分类筛选（含 URL `?category=` 深链）与空态。
 */
export function ArticlesPage() {
  return (
    <>
      {/* 该页由区块驱动，没有自带 h1；补一个只读标题，保证页面有唯一一级标题 */}
      <h1 className="sr-only">文章与评测</h1>
      <PageView pageKey="articles" blockDefaults={{ articleList: { showFilter: true } }} />
    </>
  )
}