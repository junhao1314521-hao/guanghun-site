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
import { STATIC_SEO, type StaticSeo } from '../data/seoDefaults'
import { getSeoOverride } from '../data/seoStore'

type StaticMeta = StaticSeo

/** 静态路由元信息（默认值来自 data/seoDefaults，后台可覆盖；未列出的路径按 noindex 处理） */
const STATIC_META: Record<string, StaticMeta> = STATIC_SEO

/** 默认分享图（1200×630，随前端产物部署） */
const DEFAULT_OG_IMAGE = '/og-cover.jpg'

export type HeadMeta = {
  title: string
  description: string
  indexable: boolean
  image: string
  /** 规范地址覆盖（站点相对路径）；用于旧路由别名指向新地址，缺省按当前路径 */
  canonical?: string
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
  if (staticMeta) {
    // 后台可覆盖静态路由的标题 / 描述 / 收录开关；canonical 等其余字段仍取默认
    const override = getSeoOverride(clean)
    const merged = override
      ? { ...staticMeta, title: override.title, description: override.description, indexable: override.indexable }
      : staticMeta
    // 分享图：后台覆盖优先（站内路径补 origin），未设置用默认分享图
    const image = override?.image ? absolute(override.image, origin) : `${origin}${DEFAULT_OG_IMAGE}`
    return { ...merged, image }
  }
  const detail = detailMeta(clean, origin)
  if (detail) return detail
  return {
    title: '光魂 · OLED 电竞显示器官网',
    description: '光魂 OLED 电竞显示器：2K 540Hz 与 4K 双模，参数、测试方法与固件版本可查。',
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
  const canonical = `${origin}${meta.canonical ?? pathname}`
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

/** 静态 HTML 缓存（按 mtime 失效，便于部署替换后立即生效） */
const cache = new Map<string, { mtimeMs: number; html: string }>()

/** 读取并缓存静态 HTML 原文（index.html 与 Center 等独立静态页共用） */
function readCached(file: string): string {
  const stat = statSync(file)
  let entry = cache.get(file)
  if (!entry || entry.mtimeMs !== stat.mtimeMs) {
    entry = { mtimeMs: stat.mtimeMs, html: readFileSync(file, 'utf8') }
    cache.set(file, entry)
  }
  return entry.html
}

/** 移除模板里的默认头部标签，避免与注入值重复 */
function stripDefaultHead(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta name="description"[^>]*>\s*/gi, '')
    .replace(/<meta name="robots"[^>]*>\s*/gi, '')
    .replace(/<link rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<meta property="og:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<meta name="twitter:[^"]*"[^>]*>\s*/gi, '')
}

/** 把某路径的头部标签注入 HTML */
function injectHead(html: string, pathname: string, origin: string): string {
  const meta = resolveHead(pathname, origin)
  return stripDefaultHead(html).replace(
    /<\/head>/i,
    `    ${buildHeadTags(meta, pathname, origin)}\n  </head>`,
  )
}

/** 把头部标签注入模板：先移除默认 title / description / robots / canonical / og / twitter */
export function renderIndexHtml(indexFile: string, pathname: string, origin: string): string {
  return injectHead(readCached(indexFile), pathname, origin)
}

/** 为独立静态页（如 /center）注入真实头部元信息，不改变页面结构与样式 */
export function renderStaticHtml(file: string, pathname: string, origin: string): string {
  return injectHead(readCached(file), pathname, origin)
}

/**
 * 注入首屏启动数据（当前用于公告条）：
 * 公告条由站点配置异步到达后插入，会把下方内容整体下移 36px（CLS）。服务端把「当前有效的公告」
 * 作为同步可用的 `window.__GH_BOOTSTRAP__` 写进 HTML，React 首帧即可渲染出公告条，
 * 配置请求返回后只做一次同值确认，不再发生插入位移。
 *
 * 放在 `</body>` 前：内联脚本先执行，模块脚本随后挂载时数据已就绪。
 */
export function injectBootstrap(html: string, data: unknown): string {
  if (!html.includes('</body>')) return html
  // `</script>` 注入防护：JSON 里的 `<` 统一转义
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return html.replace(/<\/body>/i, `<script>window.__GH_BOOTSTRAP__=${json}</script></body>`)
}

export type PreloadImage = {
  /** 图片地址（建议已转绝对地址） */
  href: string
  /** 媒体条件；用于移动端 / 桌面端各预加载一张，缺省表示所有视口 */
  media?: string
}

/**
 * 注入首屏关键图片的 preload。
 *
 * 首屏图地址来自内容库 / 集合接口：浏览器必须先下载并执行 JS、再等接口返回，才能从
 * React 渲染出的 `<img>` 里发现这张图，LCP 因此被推迟了「JS + 接口」这一整段。
 * 服务端把同一地址写进 `<head>`，HTML 解析阶段就开始下载，渲染时直接命中缓存。
 */
export function injectPreloadImages(html: string, items: PreloadImage[]): string {
  const tags = items
    .filter((item) => item.href.trim())
    .map(
      (item) =>
        `<link rel="preload" as="image" href="${escapeHtml(item.href.trim())}"${item.media ? ` media="${escapeHtml(item.media)}"` : ''} fetchpriority="high" />`,
    )
  if (tags.length === 0) return html
  return html.replace(/<\/head>/i, `    ${tags.join('\n    ')}\n  </head>`)
}
