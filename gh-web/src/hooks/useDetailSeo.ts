import { useEffect } from 'react'
import { DEFAULT_OG_IMAGE, ogImageUrl } from '../data/meta'
import { upsertMeta } from './usePageMeta'

export type DetailSeo = {
  /** 真实页面标题（覆盖壳层的通用标题），如「GH-M900 PRO 无线电竞鼠标 · 光魂」 */
  title?: string
  description?: string
  /** 页面主图地址（http(s) 绝对地址才作为分享图，否则回退默认图） */
  image?: string
  /** Open Graph 类型：product / article / website 等 */
  ogType?: string
}

/**
 * 详情页 SEO 覆盖：在壳层 `usePageMeta`（layout effect）之后，把**真实内容**写入
 * title / description / og:image / twitter 卡片，使分享与搜索结果更准确。
 *
 * 采用被动 effect（晚于壳层 layout effect 执行），确保覆盖生效；
 * 卸载时把 og:type / og:image / twitter 卡片恢复为站点默认，避免跨路由残留。
 */
export function useDetailSeo({ title, description, image, ogType }: DetailSeo): void {
  useEffect(() => {
    const url = ogImageUrl(image)
    const hasImage = /^https?:\/\//.test(image ?? '')

    if (title) {
      document.title = title
      upsertMeta('property', 'og:title', title)
      upsertMeta('name', 'twitter:title', title)
    }
    if (description) {
      upsertMeta('name', 'description', description)
      upsertMeta('property', 'og:description', description)
      upsertMeta('name', 'twitter:description', description)
    }
    upsertMeta('property', 'og:type', ogType ?? 'website')
    upsertMeta('property', 'og:image', url)
    upsertMeta('name', 'twitter:card', hasImage ? 'summary_large_image' : 'summary')
    upsertMeta('name', 'twitter:image', url)

    return () => {
      upsertMeta('property', 'og:type', 'website')
      upsertMeta('property', 'og:image', DEFAULT_OG_IMAGE)
      upsertMeta('name', 'twitter:card', 'summary')
      upsertMeta('name', 'twitter:image', DEFAULT_OG_IMAGE)
    }
  }, [title, description, image, ogType])
}
