/**
 * 服务端 SEO 头部注入（R-26）：不执行 JS 的抓取器也能拿到真实 title / canonical / JSON-LD。
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { renderIndexHtml, resolveHead } from '../src/lib/seoHead'

const tmpDir = path.join(os.tmpdir(), `gh-seo-head-${process.pid}`)
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')

const ORIGIN = 'http://8.163.108.144:3002'
let indexFile = ''

before(() => {
  rmSync(tmpDir, { recursive: true, force: true })
  mkdirSync(tmpDir, { recursive: true })
  indexFile = path.join(tmpDir, 'index.html')
  writeFileSync(
    indexFile,
    '<html><head><title>默认标题</title><meta name="description" content="默认描述" />' +
      '<link rel="canonical" href="https://www.guanghun.example/" />' +
      '<meta property="og:title" content="旧 OG" /><meta name="twitter:card" content="summary" />' +
      '</head><body></body></html>',
  )
})

after(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('服务端 SEO 头部', () => {
  it('静态路由：命中真实标题并允许收录', () => {
    const meta = resolveHead('/downloads', ORIGIN)
    assert.equal(meta.title, '下载中心 · 光魂')
    assert.equal(meta.indexable, true)
    assert.equal(meta.image, `${ORIGIN}/og-cover.jpg`)
  })

  it('未收录路由：noindex', () => {
    assert.equal(resolveHead('/admin', ORIGIN).indexable, false)
    assert.equal(resolveHead('/login', ORIGIN).indexable, false)
  })

  it('产品详情：标题带型号，输出 Product 结构化数据', () => {
    const meta = resolveHead('/products/gh-54027x1qe', ORIGIN)
    assert.ok(meta.title.includes('光魂'))
    assert.equal(meta.indexable, true)
    assert.equal(meta.jsonLd?.['@type'], 'Product')
  })

  it('注入 HTML：移除模板默认标签，只保留一份 title / canonical', () => {
    const html = renderIndexHtml(indexFile, '/downloads', ORIGIN)
    assert.equal((html.match(/<title>/g) ?? []).length, 1)
    assert.ok(html.includes('<title>下载中心 · 光魂</title>'))
    assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1)
    assert.ok(html.includes(`href="${ORIGIN}/downloads"`))
    assert.ok(!html.includes('www.guanghun.example'))
    assert.equal((html.match(/property="og:title"/g) ?? []).length, 1)
    assert.ok(html.includes('noindex') === false)
  })
})
