import type { Express, Request, Response } from 'express'
import { listPages } from '../data/contentStore'
import { listCollection } from '../data/collectionStore'
import { LEGAL_DOCS } from '../data/legal'

/**
 * SEO：动态生成 `GET /sitemap.xml` 与 `GET /robots.txt`（挂载于站点根，非 /api）。
 *
 * - `sitemap.xml`：内容库页面路径 + 产品 / 文章 / 下载 / FAQ / 合作案例 / 体验点的详情 URL
 *   （+ 法律页），全部来自**单一数据源**（内容库 + 集合），后台改动即时反映；
 *   模板页（路径含 `:`，如 `/products/:id`）是渲染骨架，不作为可访问地址收录。
 * - 域名：优先环境变量 `SITE_ORIGIN`；未设置时回退为请求 Host（`req.protocol://req.get('host')`）。
 * - `robots.txt`：保持排除 `/admin` 等无收录价值页面，并指向动态 sitemap。
 *
 * 与前端静态文件的关系：`gh-web/public` 下亦有静态 `robots.txt` / `sitemap.xml`。
 * 本路由在 `registerRoutes` 中注册，早于 `app.ts` 的 `express.static(STATIC_DIR)` 与 SPA 回退，
 * 故**同源部署时以本动态版本为准**（静态文件仅在未挂载本服务的纯静态托管场景生效）。
 */
export function registerSeoRoutes(app: Express): void {
  app.get('/sitemap.xml', (req: Request, res: Response) => {
    const origin = resolveOrigin(req)
    const urls = collectSitemapPaths()
    const body = buildSitemapXml(origin, urls)
    res.type('application/xml').setHeader('Cache-Control', 'public, max-age=3600')
    res.send(body)
  })

  app.get('/robots.txt', (req: Request, res: Response) => {
    const origin = resolveOrigin(req)
    res.type('text/plain').setHeader('Cache-Control', 'public, max-age=3600')
    res.send(buildRobotsTxt(origin))
  })
}

/** 解析站点源（origin）：`SITE_ORIGIN` 优先，否则由请求推导 */
function resolveOrigin(req: Request): string {
  const env = (process.env.SITE_ORIGIN ?? '').trim()
  if (env) return env.replace(/\/+$/, '')
  return `${req.protocol}://${req.get('host') ?? ''}`
}

/** 收集全部可收录的站点相对路径（去重，保序） */
function collectSitemapPaths(): string[] {
  const paths: string[] = []
  const seen = new Set<string>()
  const add = (p: string): void => {
    if (!p || !p.startsWith('/')) return
    if (p.includes(':')) return // 模板页（含 :id / :slug）不收录
    if (seen.has(p)) return
    seen.add(p)
    paths.push(p)
  }

  // 1) 内容库页面路径
  for (const page of listPages()) add(page.path)
  // 2) 法律页（静态文档）
  for (const doc of LEGAL_DOCS) add(`/legal/${doc.slug}`)
  // 3) 各类详情页
  for (const item of listCollection('products')) add(`/products/${item.id}`)
  for (const item of listCollection('articles')) add(`/articles/${item.id}`)
  for (const item of listCollection('downloads')) add(`/downloads/${item.id}`)
  for (const item of listCollection('faqs')) add(`/faq/${item.id}`)
  for (const item of listCollection('biz-cases')) add(`/business/cases/${item.id}`)
  for (const item of listCollection('biz-venues')) add(`/business/venues/${item.id}`)

  return paths
}

/** XML 文本转义 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 组装 sitemap.xml */
function buildSitemapXml(origin: string, paths: string[]): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]
  for (const p of paths) {
    lines.push(`  <url><loc>${escapeXml(origin + p)}</loc></url>`)
  }
  lines.push('</urlset>')
  return `${lines.join('\n')}\n`
}

/** 组装 robots.txt（排除 /admin 等，指向动态 sitemap） */
function buildRobotsTxt(origin: string): string {
  return [
    '# 光魂官网 · robots.txt（由后端动态生成）',
    'User-agent: *',
    'Allow: /',
    '',
    '# 会话 / 查询 / 表单类页面无收录价值',
    'Disallow: /search',
    'Disallow: /account',
    'Disallow: /compare',
    'Disallow: /inquiry',
    'Disallow: /login',
    'Disallow: /register',
    'Disallow: /forgot',
    'Disallow: /me',
    '',
    '# 后台管理系统不收录',
    'Disallow: /admin',
    '',
    '# 错误状态页不收录',
    'Disallow: /403',
    'Disallow: /500',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n')
}
