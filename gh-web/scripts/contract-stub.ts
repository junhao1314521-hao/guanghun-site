/**
 * 本地接口契约桩（仅联调用，非生产）
 * =================================
 * 目的：让前端在不依赖真实后端的情况下，验证「配置 VITE_API_BASE 后全站经真实 HTTP 链路渲染」。
 * 它按《光魂官网 · 后端接口契约 v1》的 12 条端点返回与 mock 完全同构的 JSON，
 * 也可作为后端实现的参考实现（payload 组装逻辑与 src/api/*.ts 一一对应）。
 *
 * 用法（Node，需借 esbuild 打包 TS 后运行）：
 *   npx esbuild scripts/contract-stub.ts --bundle --platform=node --format=esm --outfile=/tmp/contract-stub.mjs
 *   node /tmp/contract-stub.mjs            # 默认监听 :8788
 *   PORT=9000 node /tmp/contract-stub.mjs
 *
 * 前端联调：
 *   VITE_API_BASE=http://localhost:8788 npm run build
 */
import http from 'node:http'
import * as products from '../src/data/products'
import * as ladder from '../src/data/ladder'
import * as search from '../src/data/search'
import * as home from '../src/data/home'
import * as support from '../src/data/support'
import * as business from '../src/data/business'
import * as about from '../src/data/about'
import * as center from '../src/data/center'
import * as account from '../src/data/account'
import * as legal from '../src/data/legal'

const PORT = Number(process.env.PORT ?? 8788)

/** 按路径产出响应体；返回 `null` 表示未命中该资源（→ 404） */
function resolve(pathname: string, query: URLSearchParams): unknown | null {
  switch (pathname) {
    case '/api/products':
      return { items: products.PRODUCTS, total: products.PRODUCT_TOTAL }
    case '/api/ladder':
      return { metrics: ladder.LADDER_METRICS, meta: ladder.LADDER_META }
    case '/api/search': {
      const q = (query.get('q') ?? '').trim().toLowerCase()
      const items = q
        ? search.SEARCH_RESULTS.filter((r) =>
            `${r.title.join('')} ${r.desc} ${r.source}`.toLowerCase().includes(q),
          )
        : search.SEARCH_RESULTS
      return { items, counts: search.KIND_COUNTS }
    }
    case '/api/home':
      return {
        heroSlides: home.HERO_SLIDES,
        coopTags: home.COOP_TAGS,
        featuredProducts: home.FEATURED_PRODUCTS,
        scenes: home.SCENES,
        spots: home.SPOTS,
        brandStats: home.BRAND_STATS,
        ladderTeaserRows: home.LADDER_TEASER_ROWS,
        news: home.NEWS,
        serviceEntries: home.SERVICE_ENTRIES,
        techArticles: home.TECH_ARTICLES,
      }
    case '/api/support':
      return {
        quickEntries: support.QUICK_ENTRIES,
        downloads: support.DOWNLOADS,
        warrantyPoints: support.WARRANTY_POINTS,
        spots: support.SUPPORT_SPOTS,
        faqs: support.FAQS,
      }
    case '/api/business':
      return {
        directions: business.COOP_DIRECTIONS,
        releaseSteps: business.RELEASE_STEPS,
        releaseRules: business.RELEASE_RULES,
        releasePrepare: business.RELEASE_PREPARE,
        cases: business.COOP_CASES,
        brandAssets: business.BRAND_ASSETS,
        coopTypeOptions: business.COOP_TYPE_OPTIONS,
        contacts: business.COOP_CONTACTS,
      }
    case '/api/about':
      return {
        PHILOSOPHY_POINTS: about.PHILOSOPHY_POINTS,
        FACTS: about.FACTS,
        LAB_POINTS: about.LAB_POINTS,
        TIMELINE: about.TIMELINE,
        NEWS: about.NEWS,
        CULTURE_TAGS: about.CULTURE_TAGS,
        JOBS: about.JOBS,
        LEGAL_CARDS: about.LEGAL_CARDS,
      }
    case '/api/center':
      return {
        CENTER_VERSION: center.CENTER_VERSION,
        CAPABILITIES: center.CAPABILITIES,
        FEATURES: center.FEATURES,
        DEVICE_SUPPORT: center.DEVICE_SUPPORT,
        DOWNLOADS: center.DOWNLOADS,
        INSTALL_STEPS: center.INSTALL_STEPS,
        REQUIREMENTS: center.REQUIREMENTS,
        CHANGELOG: center.CHANGELOG,
        CENTER_FAQS: center.CENTER_FAQS,
      }
    case '/api/account':
      return {
        PROFILE: account.PROFILE,
        ACCOUNT_NAV: account.ACCOUNT_NAV,
        OVERVIEW_STATS: account.OVERVIEW_STATS,
        OVERVIEW_ALERT: account.OVERVIEW_ALERT,
        ACCOUNT_DEVICES: account.ACCOUNT_DEVICES,
        ACCOUNT_TICKETS: account.ACCOUNT_TICKETS,
        FAVORITES: account.FAVORITES,
        SECURITY: account.SECURITY,
      }
    case '/api/legal':
      return legal.LEGAL_DOCS
  }
  if (pathname.startsWith('/api/products/')) {
    return products.getProductDetail(decodeURIComponent(pathname.slice('/api/products/'.length))) ?? null
  }
  if (pathname.startsWith('/api/legal/')) {
    const slug = decodeURIComponent(pathname.slice('/api/legal/'.length))
    return legal.LEGAL_DOCS.find((doc) => doc.slug === slug) ?? null
  }
  return null
}

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
    const body = resolve(url.pathname, url.searchParams)
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    }
    if (body === null) {
      res.writeHead(404, headers)
      res.end(JSON.stringify({ error: '未找到该资源' }))
      return
    }
    res.writeHead(200, headers)
    res.end(JSON.stringify(body))
  })
  .listen(PORT, () => console.log(`契约桩已启动：http://localhost:${PORT}`))