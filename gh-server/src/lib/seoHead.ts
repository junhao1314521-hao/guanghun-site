/**
 * 服务端 SEO 头部注入（R-26）。
 *
 * 背景：前端是 SPA，`<title>` / description / canonical / OG / JSON-LD 原本只由浏览器端
 * `usePageMeta` 写入。百度蜘蛛、微信 / 社交平台的抓取器普遍**不执行 JS**，看到的就是
 * `index.html` 里的默认标题与占位 canonical，等于全站只有一条元信息。
 *
 * 做法：在 SPA 回退返回 `index.html` 之前，按路由把真实 meta 写进 HTML 响应
 * （同时移除模板里的默认 title / description / robots / canonical / og / twitter，避免重复）。
 * 浏览器端脚本仍会再写一遍同样的值，保持页面内切换路由时即时更新。
 *
 * 数据来源：内容库 / 集合（与前台同一份数据），静态路由表镜像 `gh-web/src/data/meta.ts`。
 */
import { readFileSync, statSync } from 'node:fs'
import { getCollectionItem } from '../data/collectionStore'

type StaticMeta = { title: string; description: string; indexable: boolean }

/** 静态路由元信息（与前端 meta.ts 保持一致；未列出的路径按 noindex 处理） */
const STATIC_META: Record<string, StaticMeta> = {
  '/': { title: '光魂 · OLED 电竞显示器官网', description: '以实测数据定义电竞装备性能。参数公开、方法公开、来源可查。', indexable: true },
  '/products': { title: '全部产品 · 光魂', description: '光魂 OLED 电竞显示器，覆盖 540Hz 旗舰到主流电竞 IPS，可按品类、接口与价格筛选。', indexable: true },
  '/articles': { title: '文章与评测 · 光魂', description: '产品评测、使用教程与行业观察；测试方法与数据来源公开。', indexable: true },
  '/news': { title: '新闻与动态 · 光魂', description: '产品发布、品牌动态与活动公告。', indexable: true },
  '/ladder': { title: '天梯榜 · 光魂', description: '以实测数据排序的电竞装备天梯榜，测试方法与数据来源公开。', indexable: true },
  '/center': { title: '光魂 Center · 设备管理软件', description: '一套软件管理全部光魂设备：按键与宏、性能参数调节、灯效场景、固件更新与配置云同步。', indexable: true },
  '/support': { title: '服务与支持 · 光魂', description: '保修政策与要点、服务网点、常见问题与驱动 / 固件下载。', indexable: true },
  '/downloads': { title: '下载中心 · 光魂', description: '驱动、固件、说明书与工具下载，按类别、类型与型号筛选。', indexable: true },
  '/faq': { title: '常见问题 · 光魂', description: '安装、使用、保修与售后高频问题的解答。', indexable: true },
  '/contact': { title: '联系我们 · 光魂', description: '客服热线、商务邮箱、办事处地址与服务时间。', indexable: true },
  '/business': { title: '商业合作 · 光魂', description: '媒体送测、渠道分销与品牌联名等合作方式及联系方式。', indexable: true },
  '/business/scenes': { title: '场景与方案 · 光魂', description: '面向电竞、创作、办公与差旅的场景化装备方案。', indexable: true },
  '/business/cases': { title: '合作案例 · 光魂', description: '赛事、高校与品牌联名等合作案例。', indexable: true },
  '/business/venues': { title: '产品体验点 · 光魂', description: '全国合作体验点地图：按城市、省份与机型查找实机体验。', indexable: true },
  '/about': { title: '关于光魂 · 品牌与实验室', description: '品牌理念、光魂实验室、发展历程与团队文化。', indexable: true },
  '/legal/privacy': { title: '隐私政策 · 光魂', description: '光魂官网隐私政策。', indexable: true },
  '/legal/terms': { title: '服务条款 · 光魂', description: '光魂官网服务条款。', indexable: true },
  '/legal/cookies': { title: 'Cookie 声明 · 光魂', description: '光魂官网 Cookie 使用声明。', indexable: true },
  '/legal/records': { title: '备案信息 · 光魂', description: '网站备案与主体信息。', indexable: true },
}

/** 默认分享图（1200×630，随前端产物部署） */
const DEFAULT_OG_IMAGE = '/og-cover.jpg'

export type HeadMeta = {
  title: string
  description: string
  indexable: boolean
  image: string
  jsonLd?: Record<string, unknown>
}

/** 读取记录上的字符串字段（集合条目为结构化对象，缺失一律回退空串） */
function str(record: unknown, key: string): string {
  if (!record || typeof record !== 'object') return ''
  const value = (record as Record<string, unknown>)[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** 相对路径 → 绝对地址；已是 http(s) 则原样返回 */
function absolute(url: string, origin: string): string {
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return `${origin}${url}`
  return `${origin}/${url}`
}

/** 详情页元信息：命中返回，未命中返回 undefined */
function detailMeta(pathname: string, origin: string): HeadMeta | undefined {
  const product = /^\/products\/([^/]+)$/.exec(pathname)
  if (product) {
    const item = getCollectionItem('products', decodeURIComponent(product[1]))
    if (!item) return undefined
    const model = str(item, 'model')
    const name = str(item, 'name')
    const specs = Array.isArray((item as Record<string, unknown>).specs)
      ? ((item as Record<string, unknown>).specs as unknown[]).filter((v): v is string => typeof v === 'string')
      : []
    const gallery = Array.isArray((item as Record<string, unknown>).gallery)
      ? ((item as Record<string, unknown>).gallery as unknown[]).filter((v): v is string => typeof v === 'string')
      : []
    const priceValue = Number((item as Record<string, unknown>).priceValue) || 0
    const buyUrl = str(item, 'buyUrl')
    const canonical = `${origin}${pathname}`
    const image = gallery[0] ? absolute(gallery[0], origin) : `${origin}${DEFAULT_OG_IMAGE}`
    return {
      title: `${model} ${name} · 光魂`,
      description: specs.length > 0 ? `${model} ${name}：${specs.join(' · ')}。` : `光魂 ${model} ${name}：参数、实测数据与下载资料。`,
      indexable: true,
      image,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `${model} ${name}`,
        model,
        brand: { '@type': 'Brand', name: '光魂' },
        image: [image],
        ...(priceValue > 0
          ? {
              offers: {
                '@type': 'Offer',
                price: String(priceValue),
                priceCurrency: 'CNY',
                availability: 'https://schema.org/InStock',
                url: buyUrl || canonical,
              },
            }
          : {}),
      },
    }
  }

  const article = /^\/articles\/([^/]+)$/.exec(pathname)
  if (article) {
    const item = getCollectionItem('articles', decodeURIComponent(article[1]))
    if (!item) return undefined
    const title = str(item, 'title')
    const desc = str(item, 'desc')
    const date = str(item, 'date')
    const image = `${origin}${DEFAULT_OG_IMAGE}`
    return {
      title: `${title} · 光魂`,
      description: desc || `${title}：光魂产品评测与使用说明。`,
      indexable: true,
      image,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description: desc,
        ...(date ? { datePublished: date } : {}),
        author: { '@type': 'Organization', name: '光魂' },
        mainEntityOfPage: `${origin}${pathname}`,
        image: [image],
      },
    }
  }

  const download = /^\/downloads\/([^/]+)$/.exec(pathname)
  if (download) {
    const item = getCollectionItem('downloads', decodeURIComponent(download[1]))
    if (!item) return undefined
    const name = str(item, 'name')
    return {
      title: `${name} · 下载中心 · 光魂`,
      description: str(item, 'note') || `${name} 官方下载。`,
      indexable: true,
      image: `${origin}${DEFAULT_OG_IMAGE}`,
    }
  }

  const faq = /^\/faq\/([^/]+)$/.exec(pathname)
  if (faq) {
    const item = getCollectionItem('faqs', decodeURIComponent(faq[1]))
    if (!item) return undefined
    const q = str(item, 'q')
    const a = str(item, 'a')
    return {
      title: `${q} · 常见问题 · 光魂`,
      description: a || q,
      indexable: true,
      image: `${origin}${DEFAULT_OG_IMAGE}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } },
        ],
      },
    }
  }

  const bizCase = /^\/business\/cases\/([^/]+)$/.exec(pathname)
  if (bizCase) {
    const item = getCollectionItem('biz-cases', decodeURIComponent(bizCase[1]))
    if (!item) return undefined
    const title = str(item, 'title') || str(item, 'name') || '合作案例'
    return {
      title: `${title} · 合作案例 · 光魂`,
      description: str(item, 'desc') || str(item, 'summary') || `${title}：光魂合作案例。`,
      indexable: true,
      image: `${origin}${DEFAULT_OG_IMAGE}`,
    }
  }

  const venue = /^\/business\/venues\/([^/]+)$/.exec(pathname)
  if (venue) {
    const item = getCollectionItem('biz-venues', decodeURIComponent(venue[1]))
    if (!item) return undefined
    const title = str(item, 'name') || str(item, 'title') || '产品体验点'
    return {
      title: `${title} · 产品体验点 · 光魂`,
      description: str(item, 'address') || str(item, 'desc') || `${title}：光魂产品体验点。`,
      indexable: true,
      image: `${origin}${DEFAULT_OG_IMAGE}`,
    }
  }

  return undefined
}

/** 解析某路径的头部元信息（未收录路径统一 noindex） */
export function resolveHead(pathname: string, origin: string): HeadMeta {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const staticMeta = STATIC_META[clean]
  if (staticMeta) return { ...staticMeta, image: `${origin}${DEFAULT_OG_IMAGE}` }
  const detail = detailMeta(clean, origin)
  if (detail) return detail
  return {
    title: '光魂 · OLED 电竞显示器官网',
    description: '以实测数据定义电竞装备性能。参数公开、方法公开、来源可查。',
    indexable: false,
    image: `${origin}${DEFAULT_OG_IMAGE}`,
  }
}

/** HTML 文本转义 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 组装要注入 <head> 的标签 */
function buildHeadTags(meta: HeadMeta, pathname: string, origin: string): string {
  const canonical = `${origin}${pathname}`
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="robots" content="${meta.indexable ? 'index,follow' : 'noindex,follow'}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:type" content="${/^\/products\//.test(pathname) ? 'product' : /^\/articles\//.test(pathname) ? 'article' : 'website'}" />`,
    `<meta property="og:site_name" content="光魂" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(meta.image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(meta.image)}" />`,
  ]
  if (meta.jsonLd) {
    const json = JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')
    tags.push(`<script type="application/ld+json">${json}</script>`)
  }
  return tags.join('\n    ')
}

/** index.html 缓存（按 mtime 失效，便于部署替换后立即生效） */
const cache = new Map<string, { mtimeMs: number; html: string }>()

/** 把头部标签注入模板：先移除默认 title / description / robots / canonical / og / twitter */
export function renderIndexHtml(indexFile: string, pathname: string, origin: string): string {
  const stat = statSync(indexFile)
  let entry = cache.get(indexFile)
  if (!entry || entry.mtimeMs !== stat.mtimeMs) {
    entry = { mtimeMs: stat.mtimeMs, html: readFileSync(indexFile, 'utf8') }
    cache.set(indexFile, entry)
  }
  const meta = resolveHead(pathname, origin)
  const stripped = entry.html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta name="description"[^>]*>\s*/gi, '')
    .replace(/<meta name="robots"[^>]*>\s*/gi, '')
    .replace(/<link rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<meta property="og:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<meta name="twitter:[^"]*"[^>]*>\s*/gi, '')
  return stripped.replace(/<\/head>/i, `    ${buildHeadTags(meta, pathname, origin)}\n  </head>`)
}
