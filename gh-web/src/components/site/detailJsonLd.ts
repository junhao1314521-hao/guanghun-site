/**
 * 详情页专属结构化数据（JSON-LD 节点构造）。
 *
 * 与 `data/meta.ts` 的站点级 @graph（Organization / WebSite / WebPage / BreadcrumbList）
 * 互补：这里只产出**页面主体实体**（Product / BlogPosting / FAQPage / SoftwareApplication）。
 * 字段全部来自页面既有数据，不臆造评分 / 库存等未确认信息；可选字段缺省时自动省略。
 */
import type { ArticleDetail } from '../../data/articles'
import { BRAND, SITE_URL, canonicalUrl, ogImageUrl } from '../../data/meta'
import type { ProductDetail } from '../../data/products'
import type { DownloadDetail, DownloadType, FaqDetail } from '../../data/support-extra'

/** 产品详情 → Product（含品牌；能解析出数值价时附 Offer） */
export function productJsonLd(detail: ProductDetail, image?: string): Record<string, unknown> {
  const url = canonicalUrl(`/products/${detail.id}`)
  const price = detail.price.replace(/[^\d.]/g, '')
  return {
    '@type': 'Product',
    name: `${detail.model} ${detail.name}`,
    description: `${detail.model} ${detail.name} 的标称与实测参数、下载资料与相关信息。`,
    sku: detail.model,
    category: detail.name,
    brand: { '@type': 'Brand', name: BRAND },
    image: [ogImageUrl(image)],
    url,
    offers: price
      ? {
          '@type': 'Offer',
          price,
          priceCurrency: 'CNY',
          availability:
            detail.status.level === 'warning' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          url,
        }
      : undefined,
  }
}

/** 文章详情 → BlogPosting（标题 / 摘要 / 发布时间 / 作者 / 发布方） */
export function articleJsonLd(article: ArticleDetail, image?: string): Record<string, unknown> {
  const url = canonicalUrl(`/articles/${article.id}`)
  return {
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.desc,
    datePublished: article.date,
    author: { '@type': 'Organization', name: article.author },
    publisher: { '@type': 'Organization', name: BRAND, url: SITE_URL },
    mainEntityOfPage: url,
    url,
    image: [ogImageUrl(image)],
    inLanguage: 'zh-CN',
  }
}

/** 问答详情 → FAQPage（单题为主实体，含可机读答案） */
export function faqJsonLd(detail: FaqDetail): Record<string, unknown> {
  return {
    '@type': 'FAQPage',
    url: canonicalUrl(`/faq/${detail.id}`),
    mainEntity: [
      {
        '@type': 'Question',
        name: detail.q,
        acceptedAnswer: { '@type': 'Answer', text: detail.a },
      },
    ],
  }
}

/** 下载类型 → SoftwareApplication 分类（键须与 DownloadType 五类枚举一致） */
const APP_CATEGORY: Record<DownloadType, string> = {
  manual: 'ReferenceApplication',
  firmware: 'FirmwareApplication',
  driver: 'DriverApplication',
  software: 'UtilitiesApplication',
  calibration: 'UtilitiesApplication',
}

/** 资料详情 → SoftwareApplication（版本 / 发布日期 / 免费 / 下载地址） */
export function downloadJsonLd(detail: DownloadDetail): Record<string, unknown> {
  const url = canonicalUrl(`/downloads/${detail.id}`)
  return {
    '@type': 'SoftwareApplication',
    name: detail.name,
    applicationCategory: APP_CATEGORY[detail.type],
    softwareVersion: detail.version,
    datePublished: detail.date,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
    url,
    downloadUrl: detail.fileUrl || undefined,
  }
}
