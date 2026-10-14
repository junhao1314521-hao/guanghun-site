/**
 * 由 `src/data/meta.ts`（SEO 单一真源）生成 `public/sitemap.xml` 与 `public/robots.txt`。
 *
 * 为什么用生成而不是手写：`test/seo.test.ts` 会校验两个文件与 meta 真源一致；
 * 手写容易漏同步。新增路由后执行 `npm run gen:seo` 即可。
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { PAGE_META, SITE_URL, canonicalUrl } from '../src/data/meta'

const indexable = PAGE_META.filter((m) => m.indexable)
const nonIndexable = PAGE_META.filter((m) => !m.indexable)

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<!-- 由 scripts/gen-seo.ts 从 src/data/meta.ts 生成，请勿手改 -->',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...indexable.map(
    (m) =>
      `  <url><loc>${canonicalUrl(m.path)}</loc><changefreq>${m.changefreq ?? 'monthly'}</changefreq><priority>${(m.priority ?? 0.5).toFixed(1)}</priority></url>`,
  ),
  '</urlset>',
  '',
].join('\n')

const robots = [
  '# 由 scripts/gen-seo.ts 从 src/data/meta.ts 生成，请勿手改',
  'User-agent: *',
  'Allow: /',
  ...nonIndexable.map((m) => `Disallow: ${m.path}`),
  '',
  `Sitemap: ${SITE_URL}/sitemap.xml`,
  '',
].join('\n')

writeFileSync(path.resolve(process.cwd(), 'public/sitemap.xml'), sitemap)
writeFileSync(path.resolve(process.cwd(), 'public/robots.txt'), robots)
console.log(`SEO 文件已生成：收录 ${indexable.length} 条 / 不收录 ${nonIndexable.length} 条`)
