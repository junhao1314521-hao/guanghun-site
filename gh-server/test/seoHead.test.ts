/**
 * 服务端 SEO 头部注入（R-26）：不执行 JS 的抓取器也能拿到真实 title / canonical / JSON-LD。
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { renderIndexHtml, resolveHead, injectBootstrap, injectPreloadImages } from '../src/lib/seoHead'

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

describe('首屏启动数据注入（公告条防 CLS）', () => {
  it('以普通内联脚本注入到 </body> 前（模块脚本是延迟执行，首帧前已就绪）', () => {
    const html = injectBootstrap('<html><body><div id="root"></div><script type="module" src="/a.js"></script></body></html>', {
      announcement: { text: '测试公告' },
    })
    assert.ok(/<script>window\.__GH_BOOTSTRAP__=\{"announcement":\{"text":"测试公告"\}\}<\/script><\/body>/.test(html))
  })

  it('公告文案里的标签被转义，不会提前闭合脚本', () => {
    const html = injectBootstrap('<html><body></body></html>', {
      announcement: { text: '</script><img src=x onerror=alert(1)>' },
    })
    assert.ok(!html.includes('</script><img'))
    assert.ok(html.includes('\\u003c/script>'))
  })

  it('没有 body 的模板原样返回', () => {
    const raw = '<html><head></head></html>'
    assert.equal(injectBootstrap(raw, { announcement: null }), raw)
  })
})

describe('首屏图片 preload（LCP）', () => {
  it('空列表原样返回，不插入多余标签', () => {
    const raw = '<html><head></head><body></body></html>'
    assert.equal(injectPreloadImages(raw, []), raw)
    assert.equal(injectPreloadImages(raw, [{ href: '  ' }]), raw)
  })

  it('注入到 </head> 前，带 fetchpriority=high', () => {
    const html = injectPreloadImages('<html><head><title>t</title></head><body></body></html>', [
      { href: 'http://example.com/a.jpg' },
    ])
    assert.ok(
      html.includes('<link rel="preload" as="image" href="http://example.com/a.jpg" fetchpriority="high" />'),
      '应插入 preload 标签',
    )
    assert.ok(html.indexOf('rel="preload"') < html.indexOf('</head>'), '应位于 head 内')
  })

  it('桌面 / 移动各一张时输出 media 条件', () => {
    const html = injectPreloadImages('<html><head></head><body></body></html>', [
      { href: '/a.jpg', media: '(min-width: 901px)' },
      { href: '/b.jpg', media: '(max-width: 900px)' },
    ])
    assert.ok(html.includes('href="/a.jpg" media="(min-width: 901px)"'))
    assert.ok(html.includes('href="/b.jpg" media="(max-width: 900px)"'))
  })

  it('地址里的引号与尖括号被转义，不会破坏属性', () => {
    const html = injectPreloadImages('<html><head></head><body></body></html>', [
      { href: '/a.jpg?x="><script>' },
    ])
    assert.ok(!html.includes('"><script>'))
    assert.ok(html.includes('&quot;&gt;&lt;script&gt;'))
  })
})
