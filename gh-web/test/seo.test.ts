/**
 * SEO 一致性测试：`data/meta.ts` 单一真源 ↔ `public/robots.txt` ↔ `public/sitemap.xml`。
 * 任一处新增 / 改动路由而忘了同步，本测试会失败。
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { INDEXABLE_PATHS, PAGE_META, SITE_URL, buildJsonLd, canonicalUrl, pageMetaFor, withSeoOverride } from '../src/data/meta'

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

describe('英文站元信息（lang=en）', () => {
  it('静态路由输出英文标题与描述', () => {
    const meta = pageMetaFor('/products', 'en')
    expect(meta.title).toBe('All products · Guanghun')
    expect(meta.description).toContain('Guanghun')
  })

  it('动态路由输出英文标题', () => {
    expect(pageMetaFor('/products/gh-54027x1qe', 'en').title).toBe('Product details · Guanghun')
    expect(pageMetaFor('/me/inquiries', 'en').title).toBe('Account · Guanghun')
  })

  it('未收录路径在英文站回落英文 404 口径', () => {
    const meta = pageMetaFor('/no-such-page', 'en')
    expect(meta.title).toBe('Page not found · Guanghun')
    expect(meta.indexable).toBe(false)
  })

  it('中文站保持原口径', () => {
    expect(pageMetaFor('/products').title).toBe('全部产品 · 光魂')
  })
})

describe('后台 SEO 覆盖', () => {
  const base = pageMetaFor('/products')

  it('覆盖标题 / 描述 / 收录，保留路径与权重口径', () => {
    const merged = withSeoOverride(base, {
      title: '产品总览 · 光魂',
      description: '后台自定义的产品页描述。',
      indexable: false,
    })
    expect(merged.title).toBe('产品总览 · 光魂')
    expect(merged.description).toBe('后台自定义的产品页描述。')
    expect(merged.indexable).toBe(false)
    expect(merged.path).toBe('/products')
    expect(merged.changefreq).toBe(base.changefreq)
    expect(merged.priority).toBe(base.priority)
  })

  it('无覆盖时原样返回，不影响默认口径', () => {
    expect(withSeoOverride(base, undefined)).toBe(base)
    expect(withSeoOverride(base, null)).toBe(base)
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