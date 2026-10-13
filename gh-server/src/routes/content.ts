import { Router } from 'express'
import * as about from '../data/about'
import * as account from '../data/account'
import * as business from '../data/business'
import * as center from '../data/center'
import * as home from '../data/home'
import * as support from '../data/support'
import { listCollection } from '../data/collectionStore'
import { readLocale } from '../data/locale'
import {
  buildBusinessCases,
  buildCenterDownloads,
  buildCenterVersion,
  buildFeaturedProducts,
  buildHomeNews,
  buildLadderTeaser,
  buildSupportDownloads,
  buildSupportFaqs,
  buildTechArticles,
} from '../data/aggregate'

/**
 * 内容型端点（各返回单份聚合载荷）：
 * GET /api/home、/api/support、/api/business、/api/about、/api/center、/api/account
 *
 * 键名严格对齐契约：home/support/business 为 camelCase；
 * about/center/account 沿用原始大写常量名（切勿统一）。
 *
 * 单一数据源（契约 §11.4 收口）：聚合载荷中可由结构化集合承载的列表改为从集合存储派生
 * （产品 / 榜单 / 文章 / 下载 / 问答 / 合作案例），后台改集合 → 聚合端点同步反映；
 * 无集合对应的纯配置字段（首屏文案、能力清单等）仍取自既有内容模块（内容库 seed 同源）。
 */
export const contentRouter = Router()

contentRouter.get('/home', (req, res) => {
  const collections = {
    products: listCollection('products', readLocale(req)),
    rankings: listCollection('rankings', readLocale(req)),
    articles: listCollection('articles', readLocale(req)),
  }
  res.json({
    heroSlides: home.HERO_SLIDES,
    coopTags: home.COOP_TAGS,
    featuredProducts: buildFeaturedProducts(collections.products),
    scenes: home.SCENES,
    spots: home.SPOTS,
    brandStats: home.BRAND_STATS,
    ladderTeaserRows: buildLadderTeaser(collections.rankings),
    news: buildHomeNews(collections.articles),
    serviceEntries: home.SERVICE_ENTRIES,
    techArticles: buildTechArticles(collections.articles),
  })
})

contentRouter.get('/support', (req, res) => {
  const locale = readLocale(req)
  res.json({
    quickEntries: support.QUICK_ENTRIES,
    downloads: buildSupportDownloads(listCollection('downloads', locale)),
    warrantyPoints: support.WARRANTY_POINTS,
    spots: support.SUPPORT_SPOTS,
    faqs: buildSupportFaqs(listCollection('faqs', locale)),
  })
})

contentRouter.get('/business', (req, res) => {
  res.json({
    directions: business.COOP_DIRECTIONS,
    releaseSteps: business.RELEASE_STEPS,
    releaseRules: business.RELEASE_RULES,
    releasePrepare: business.RELEASE_PREPARE,
    cases: buildBusinessCases(listCollection('biz-cases', readLocale(req))),
    brandAssets: business.BRAND_ASSETS,
    coopTypeOptions: business.COOP_TYPE_OPTIONS,
    contacts: business.COOP_CONTACTS,
  })
})

contentRouter.get('/about', (_req, res) => {
  // about 的字段（理念 / 关键事实 / 里程碑 / 招聘 / 合规卡等）无对应结构化集合，
  // 其内容与内容库 `about` 页 seed 同源，故仍取自内容模块；形状不变。
  res.json({
    PHILOSOPHY_POINTS: about.PHILOSOPHY_POINTS,
    FACTS: about.FACTS,
    LAB_POINTS: about.LAB_POINTS,
    TIMELINE: about.TIMELINE,
    NEWS: about.NEWS,
    CULTURE_TAGS: about.CULTURE_TAGS,
    JOBS: about.JOBS,
    LEGAL_CARDS: about.LEGAL_CARDS,
  })
})

contentRouter.get('/center', (req, res) => {
  const downloads = listCollection('downloads', readLocale(req))
  res.json({
    CENTER_VERSION: buildCenterVersion(downloads),
    CAPABILITIES: center.CAPABILITIES,
    FEATURES: center.FEATURES,
    DEVICE_SUPPORT: center.DEVICE_SUPPORT,
    DOWNLOADS: buildCenterDownloads(downloads),
    INSTALL_STEPS: center.INSTALL_STEPS,
    REQUIREMENTS: center.REQUIREMENTS,
    CHANGELOG: center.CHANGELOG,
    // Center 专属问答无对应结构化集合，仍取自内容模块（形状不变）。
    CENTER_FAQS: center.CENTER_FAQS,
  })
})

contentRouter.get('/account', (_req, res) => {
  // 注意：占位实现不校验登录；真实上线需接入鉴权（见契约 §5 待确认）
  res.json({
    PROFILE: account.PROFILE,
    ACCOUNT_NAV: account.ACCOUNT_NAV,
    OVERVIEW_STATS: account.OVERVIEW_STATS,
    OVERVIEW_ALERT: account.OVERVIEW_ALERT,
    ACCOUNT_DEVICES: account.ACCOUNT_DEVICES,
    ACCOUNT_TICKETS: account.ACCOUNT_TICKETS,
    FAVORITES: account.FAVORITES,
    SECURITY: account.SECURITY,
  })
})
