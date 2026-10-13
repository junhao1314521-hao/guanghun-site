/**
 * SEO 一致性测试：`data/meta.ts` 单一真源 ↔ `public/robots.txt` ↔ `public/sitemap.xml`。
 * 任一处新增 / 改动路由而忘了同步，本测试会失败。
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { INDEXABLE_PATHS, PAGE_META, SITE_URL, buildJsonLd, canonicalUrl, pageMetaFor } from '../src/data/meta'

const read = (p: string) => readFileSync(path.resolve(process.cwd(), p), 'utf8')
const sitemap = read('public/sitemap.xml')
const robots = read('public/robots.txt')

const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
const nonIndexablePaths = PAGE_META.filter((m) => !m.indexable).map((m) => m.path)

describe('sitemap.xml 与 meta 真源一致', () => {
  it('收录路径逐条出现在 sitemap 中', () => {
    for (const p of INDEXABLE_PATHS) {
      expect(locs).toContain(canonicalUrl(p))
    }
  })

  it('sitemap 条目数与收录路径数一致（无多余 / 遗漏）', () => {
    expect(locs).toHaveLength(INDEXABLE_PATHS.length)
  })

  it('不收录页面不出现在 sitemap 中', () => {
    for (const p of nonIndexablePaths) {
      expect(locs).not.toContain(canonicalUrl(p))
    }
  })

  it('sitemap 全部使用站点根地址', () => {
    for (const loc of locs) expect(loc.startsWith(SITE_URL)).toBe(true)
  })
})

describe('robots.txt 与 meta 真源一致', () => {
  it('每个不收录路径都有 Disallow', () => {
    for (const p of nonIndexablePaths) {
      expect(robots).toContain(`Disallow: ${p}`)
    }
  })

  it('Sitemap 地址与站点根地址一致', () => {
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`)
  })

  it('域名口径统一（robots 与 sitemap 同域）', () => {
    const host = new URL(SITE_URL).host
    const sitemapHost = new URL(locs[0]).host
    expect(sitemapHost).toBe(host)
    expect(robots).toContain(host)
  })
})

describe('pageMetaFor 口径', () => {
  it('未知路径（含 404）→ 不收录', () => {
    expect(pageMetaFor('/no-such-page').indexable).toBe(false)
  })

  it('产品 / 文章详情 → 收录；个人中心 → 不收录', () => {
    expect(pageMetaFor('/products/gh-m900-pro').indexable).toBe(true)
    expect(pageMetaFor('/articles/some-post').indexable).toBe(true)
    expect(pageMetaFor('/me/inquiries').indexable).toBe(false)
  })

  it('canonical 去尾斜杠（根路径除外）', () => {
    expect(canonicalUrl('/')).toBe(`${SITE_URL}/`)
    expect(canonicalUrl('/products/')).toBe(`${SITE_URL}/products`)
  })
})

describe('结构化数据 JSON-LD', () => {
  it('包含 Organization / WebSite / WebPage / BreadcrumbList', () => {
    const types = buildJsonLd('/products').map((node) => node['@type'])
    expect(types).toEqual(['Organization', 'WebSite', 'WebPage', 'BreadcrumbList'])
  })

  it('面包屑 position 从 1 连续递增', () => {
    const crumb = buildJsonLd('/legal/privacy').find((n) => n['@type'] === 'BreadcrumbList') as {
      itemListElement: Array<{ position: number }>
    }
    expect(crumb.itemListElement.map((i) => i.position)).toEqual([1, 2, 3])
  })
})