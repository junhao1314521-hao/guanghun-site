import { useMemo } from 'react'
import { buildJsonLd } from '../../data/meta'

/**
 * 站点级结构化数据注入（JSON-LD @graph：Organization / WebSite / WebPage / BreadcrumbList）。
 * 随路由变化更新；字段全部取自 `data/meta.ts`，不臆造未确认信息。
 */
export function JsonLd({ pathname }: { pathname: string }) {
  const json = useMemo(
    () => JSON.stringify({ '@context': 'https://schema.org', '@graph': buildJsonLd(pathname) }),
    [pathname],
  )
  // eslint-disable-next-line react/no-danger -- JSON-LD 必须以内联脚本注入
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}

/**
 * 页面专属结构化数据（Product / Article(BlogPosting) / FAQPage / SoftwareApplication 等）。
 * 与外壳的全局 `@graph` 脚本分离，便于详情页按自身数据独立注入，互不覆盖。
 * 传入数组时自动包一层 `@graph`。
 */
export function JsonLdNode({ node }: { node: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = useMemo(
    () =>
      JSON.stringify(
        Array.isArray(node)
          ? { '@context': 'https://schema.org', '@graph': node }
          : { '@context': 'https://schema.org', ...node },
      ),
    [node],
  )
  // eslint-disable-next-line react/no-danger -- JSON-LD 必须以内联脚本注入
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
