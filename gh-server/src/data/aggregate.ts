/**
 * 聚合端点派生（契约 §11.4 收口）。
 *
 * 背景：`/api/home`、`/api/support`、`/api/business`、`/api/center`、`/api/brand/*`、`/api/search`
 * 等聚合端点的「页面主体」已由内容库区块驱动，但其响应中仍有由静态模块直接承载的列表。
 * 本模块把这些**可由结构化集合承载的部分**改为从集合存储（单一数据源）派生，
 * 响应形状（键名与嵌套结构）与既有静态模块完全一致；无集合对应的纯配置字段（首屏文案、
 * 能力清单等）仍取自既有内容模块（它们同时是内容库 seed 的真源）。
 *
 * 所有函数均为纯函数：集合数据由调用方（路由层）通过 `listCollection(...)` 注入，
 * 便于复用既有「路由层完成派生」的约定与被单测覆盖。
 */
import type { Product } from './products'
import type { LadderMetric } from './ladder'
import { buildNews, type ArticleSummary } from './articles'
import type { DownloadItem, FaqItem } from './support-extra'
import type { CaseSummary } from './business-extra'
import {
  FEATURED_PRODUCTS,
  LADDER_TEASER_ROWS,
  type ArticleCard,
  type FeaturedProduct,
  type LadderRow as HomeLadderRow,
  type NewsItem as HomeNewsItem,
} from './home'
import type { CoopCase } from './business'
import { CENTER_VERSION, type DownloadItem as CenterDownload } from './center'
import type { BrandProduct, BrandProfile } from './brand'
import type { SearchKind, SearchResult } from './search'

/* ---------------- 首页 ---------------- */

/**
 * 首页重点产品：选取顺序与视觉样式沿用首页既有配置（seed），
 * 型号 / 名称 / 参数 / 价格 / 标记取自产品集合 → 后台改产品，首页同步反映。
 */
export function buildFeaturedProducts(products: Product[]): FeaturedProduct[] {
  return FEATURED_PRODUCTS.map((seed) => {
    const product = products.find((item) => item.id === seed.id)
    if (!product) return seed
    return {
      id: product.id,
      model: product.model,
      name: product.name,
      specs: product.specs,
      price: product.price,
      ...(product.flag ? { tag: product.flag } : {}),
      background: seed.background,
      art: product.variant,
    }
  })
}

/** 首页天梯榜 teaser：取综合榜前 3 名，来自榜单集合（后台改榜单，首页同步反映） */
export function buildLadderTeaser(rankings: LadderMetric[]): HomeLadderRow[] {
  const overall = rankings.find((metric) => metric.id === 'overall') ?? rankings[0]
  if (!overall) return LADDER_TEASER_ROWS
  return overall.rows
    .filter((row) => row.score !== null)
    .slice(0, 3)
    .map((row, index) => ({
      rank: row.rank || String(index + 1).padStart(2, '0'),
      model: row.model,
      category: row.name,
      fill: `${row.score}%`,
      value: String(row.score),
    }))
}

/** 首页新闻：由文章集合派生（复用 /api/news 的派生逻辑，字段与既有 NEWS 一致） */
export function buildHomeNews(articles: ArticleSummary[]): HomeNewsItem[] {
  return buildNews(articles).map(({ date, tag, title }) => ({ date, tag, title }))
}

/** 首页技术评测：取文章集合前 3 篇，映射为首页卡片形状 */
export function buildTechArticles(articles: ArticleSummary[]): ArticleCard[] {
  return articles.slice(0, 3).map((article) => ({
    id: article.id,
    tag: article.categoryLabel,
    accent: article.accent,
    title: article.title,
    desc: article.desc,
    date: article.date,
    meta: article.meta,
  }))
}

/* ---------------- 服务支持 ---------------- */

/** 服务支持页下载列表：由下载集合派生（优先用接口派生的型号显示名） */
export function buildSupportDownloads(downloads: DownloadItem[]): Array<{ name: string; models: string; version: string; size: string; date: string }> {
  return downloads.map((item) => ({
    name: item.name,
    models: (item.modelNames ?? item.models).join(' / '),
    version: item.version,
    size: item.size,
    date: item.date,
  }))
}

/** 服务支持页问答：由问答集合派生（仅取 q / a，形状与既有 FAQS 一致） */
export function buildSupportFaqs(faqs: FaqItem[]): Array<{ q: string; a: string }> {
  return faqs.map((item) => ({ q: item.q, a: item.a }))
}

/* ---------------- 商业合作 ---------------- */

/** 商业合作首页案例：由合作案例集合派生 */
export function buildBusinessCases(cases: CaseSummary[]): CoopCase[] {
  return cases.map((item) => ({ tag: item.category, title: item.title, desc: item.summary }))
}

/* ---------------- Center 软件 ---------------- */

/** Center 下载项：取自下载集合中类型为「软件」的记录（Center 安装包即在该集合内） */
export function buildCenterDownloads(downloads: DownloadItem[]): CenterDownload[] {
  return downloads
    .filter((item) => item.type === 'software')
    .map((item) => ({ os: item.note, version: item.version, size: item.size, date: item.date }))
}

/** Center 版本号：与下载集合中 Center 安装包的版本保持同源 */
export function buildCenterVersion(downloads: DownloadItem[]): string {
  return downloads.find((item) => item.type === 'software')?.version ?? CENTER_VERSION
}

/* ---------------- 品牌 ---------------- */

/** 品牌关联产品：以档案既有 id 列表为选取配置，名称取自产品集合 */
export function buildBrandProducts(profile: BrandProfile, products: Product[]): BrandProduct[] {
  return profile.products.map((item) => {
    const product = products.find((p) => p.id === item.id)
    return { id: item.id, name: product ? product.model : item.name }
  })
}

/* ---------------- 全站搜索 ---------------- */

export type SearchCounts = Record<'全部' | SearchKind, number>

/**
 * 全站搜索：结果与计数由产品 / 文章 / 榜单 / 下载四个集合派生
 * （原为接口层占位文案，与内容库同源后即为真实数据）。
 */
export function buildSearchData(input: {
  products: Product[]
  articles: ArticleSummary[]
  rankings: LadderMetric[]
  downloads: DownloadItem[]
}): { items: SearchResult[]; counts: SearchCounts } {
  const { products, articles, rankings, downloads } = input
  const items: SearchResult[] = [
    ...products.map((product) => ({
      id: product.id,
      kind: '产品' as const,
      title: [`${product.model} `, product.name],
      desc: product.specs.join(' / '),
      source: `产品库 · ${product.category}`,
      date: `更新于 ${product.releasedAt}`,
      to: `/products/${product.id}`,
    })),
    ...articles.map((article) => ({
      id: article.id,
      kind: '文章' as const,
      title: [article.title],
      desc: article.desc,
      source: `${article.categoryLabel} · ${article.tag}`,
      date: article.date,
      to: `/articles/${article.id}`,
    })),
    ...rankings.map((metric) => ({
      id: `ladder-${metric.id}`,
      kind: '天梯榜' as const,
      title: [metric.label, '榜'],
      desc: `${metric.label}榜 · 单位 ${metric.unit}`,
      source: '天梯榜 · 实测',
      date: '',
      to: '/ladder',
    })),
    ...downloads.map((item) => ({
      id: item.id,
      kind: '支持资料' as const,
      title: [item.name],
      desc: item.note,
      source: `下载中心 · ${item.category}`,
      date: item.date,
      to: `/downloads/${item.id}`,
    })),
  ]
  return {
    items,
    counts: {
      全部: items.length,
      产品: products.length,
      文章: articles.length,
      天梯榜: rankings.length,
      支持资料: downloads.length,
    },
  }
}
