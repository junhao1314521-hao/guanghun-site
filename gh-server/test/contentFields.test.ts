/**
 * 内容字段扩展测试：`articles.body`（富文本 HTML 正文）与 `downloads.fileUrl`（文件地址）
 * 在公开 `GET` 返回中可见（PRD 阶段 4C 内容字段扩展）。
 *
 * 隔离：DB_PATH 指向临时 SQLite 库，旧 JSON 路径指向不存在文件；临时端口启动真实 Express 应用。
 *
 * 运行：npm test
 */
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import type { Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'
import { buildCollectionSeed } from '../src/data/collectionStore'

const tmpDir = path.join(os.tmpdir(), `gh-content-fields-${process.pid}`)
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
process.env.BACKUP_DIR = path.join(tmpDir, 'backups')
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')

let server: Server
let base: string

before(async () => {
  rmSync(tmpDir, { recursive: true, force: true })
  server = createApp().listen(0)
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const addr = server.address()
  assert.ok(addr && typeof addr === 'object', '服务器应监听成功')
  base = `http://127.0.0.1:${addr.port}`
})

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  rmSync(tmpDir, { recursive: true, force: true })
})

const get = (p: string, init?: RequestInit) => fetch(base + p, init)

describe('内容字段扩展 · articles.body', () => {
  it('GET /api/articles/:id 返回非空富文本 body（且含 HTML 标签）', async () => {
    const id = buildCollectionSeed().articles[0].id
    const res = await get(`/api/articles/${encodeURIComponent(id)}`)
    assert.equal(res.status, 200)
    const detail = (await res.json()) as { id: string; body?: string }
    assert.equal(detail.id, id)
    assert.equal(typeof detail.body, 'string', 'articles 详情应含 body 字段')
    assert.ok((detail.body ?? '').length > 0, 'body 应非空')
    assert.match(detail.body ?? '', /<[a-z]+[^>]*>/, 'body 应为富文本 HTML')
  })

  it('GET /api/articles 列表项亦带 body（集合规范形状一致）', async () => {
    const res = await get('/api/articles')
    const body = (await res.json()) as { items: Array<{ body?: string }> }
    assert.ok(body.items.length > 0)
    assert.ok(body.items.every((item) => typeof item.body === 'string'), '列表项应含 body')
  })
})

describe('内容字段扩展 · downloads.fileUrl', () => {
  it('GET /api/downloads/:id 返回非空 fileUrl', async () => {
    const id = buildCollectionSeed().downloads[0].id
    const res = await get(`/api/downloads/${encodeURIComponent(id)}`)
    assert.equal(res.status, 200)
    const detail = (await res.json()) as { id: string; fileUrl?: string }
    assert.equal(detail.id, id)
    assert.equal(typeof detail.fileUrl, 'string', 'downloads 详情应含 fileUrl 字段')
    assert.ok((detail.fileUrl ?? '').length > 0, 'fileUrl 应非空')
  })

  it('GET /api/downloads 列表项亦带 fileUrl', async () => {
    const res = await get('/api/downloads')
    const body = (await res.json()) as { items: Array<{ fileUrl?: string }> }
    assert.ok(body.items.length > 0)
    assert.ok(body.items.every((item) => typeof item.fileUrl === 'string'), '列表项应含 fileUrl')
  })
})

describe('SEO · sitemap.xml / robots.txt', () => {
  it('GET /sitemap.xml → 200，含首页与若干详情 URL', async () => {
    const res = await get('/sitemap.xml')
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type') ?? '', /xml/)
    const xml = await res.text()
    assert.match(xml, /<urlset/)
    assert.ok(xml.includes(`${base}/<`) || /<loc>[^<]*\/<\/loc>/.test(xml), '应含首页 URL')
    assert.ok(/\/products\/[^<]+<\/loc>/.test(xml), '应含产品详情 URL')
    assert.ok(/\/articles\/[^<]+<\/loc>/.test(xml), '应含文章详情 URL')
    assert.ok(/\/downloads\/[^<]+<\/loc>/.test(xml), '应含下载详情 URL')
    assert.ok(/\/faq\/[^<]+<\/loc>/.test(xml), '应含 FAQ 详情 URL')
  })

  it('GET /robots.txt → 200，排除 /admin 并指向 sitemap', async () => {
    const res = await get('/robots.txt')
    assert.equal(res.status, 200)
    const txt = await res.text()
    assert.match(txt, /Disallow:\s*\/admin/)
    assert.match(txt, /Sitemap:\s*https?:\/\/[^\s]+\/sitemap\.xml/)
  })

  it('SITE_ORIGIN 生效：sitemap 使用该域名', async () => {
    const prev = process.env.SITE_ORIGIN
    process.env.SITE_ORIGIN = 'https://www.guanghun.example'
    const solo = createApp().listen(0)
    await new Promise<void>((resolve) => solo.once('listening', () => resolve()))
    try {
      const addr = solo.address()
      assert.ok(addr && typeof addr === 'object')
      const res = await fetch(`http://127.0.0.1:${addr.port}/sitemap.xml`)
      const xml = await res.text()
      assert.ok(xml.includes('https://www.guanghun.example/'), 'SITE_ORIGIN 应生效')
    } finally {
      await new Promise<void>((resolve) => solo.close(() => resolve()))
      if (prev === undefined) delete process.env.SITE_ORIGIN
      else process.env.SITE_ORIGIN = prev
    }
  })
})
