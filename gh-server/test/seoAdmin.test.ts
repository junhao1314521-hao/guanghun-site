/**
 * SEO 元信息后台覆盖测试。
 *
 * 覆盖：默认值列表、公开覆盖接口、保存 / 重置、校验（未知路径、空标题、超长）、
 * 服务端 head 注入、sitemap 与 noindex 的一致性。
 */
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'
import { resolveHead } from '../src/lib/seoHead'

const tmpDir = path.join(os.tmpdir(), `gh-seo-${process.pid}`)
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')
process.env.UPLOAD_DIR = path.join(tmpDir, 'uploads')

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

const post = (p: string, body: unknown, cookie?: string) =>
  fetch(base + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  })
const put = (p: string, body: unknown, cookie?: string) =>
  fetch(base + p, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  })
const get = (p: string, cookie?: string) =>
  fetch(base + p, cookie ? { headers: { Cookie: cookie } } : undefined)
const del = (p: string, cookie?: string) =>
  fetch(base + p, { method: 'DELETE', ...(cookie ? { headers: { Cookie: cookie } } : {}) })

type AdminItem = {
  path: string
  title: string
  description: string
  indexable: boolean
  image: string
  defaultTitle: string
  defaultDescription: string
  defaultIndexable: boolean
  override: boolean
  updatedAt: string
}

describe('SEO 元信息后台覆盖', () => {
  let cookie = ''

  before(async () => {
    const login = await post('/api/admin/auth/login', { username: 'admin', password: 'admin123' })
    assert.equal(login.status, 200)
    cookie = (login.headers.get('set-cookie') ?? '').split(';')[0]
    assert.match(cookie, /gh_admin=/)
  })

  it('后台列表返回全部静态路由与默认值，初始均未覆盖', async () => {
    const res = await get('/api/admin/seo', cookie)
    assert.equal(res.status, 200)
    const body = (await res.json()) as { items: AdminItem[] }
    assert.ok(body.items.length >= 20)
    const products = body.items.find((item) => item.path === '/products')
    assert.ok(products, '应包含 /products')
    assert.equal(products.override, false)
    assert.equal(products.title, products.defaultTitle)
    assert.ok(products.defaultDescription.length > 0)
  })

  it('未登录不可读取 / 修改后台 SEO', async () => {
    const list = await get('/api/admin/seo')
    assert.equal(list.status, 401)
    const write = await put('/api/admin/seo', {
      path: '/products',
      title: 'x',
      description: 'y',
      indexable: true,
    })
    assert.equal(write.status, 401)
  })

  it('公开接口初始为空（未覆盖）', async () => {
    const res = await get('/api/seo/meta')
    assert.equal(res.status, 200)
    const body = (await res.json()) as { items: unknown[] }
    assert.deepEqual(body.items, [])
  })

  it('保存覆盖后：后台 / 公开接口 / 服务端 head / sitemap 同步', async () => {
    const save = await put(
      '/api/admin/seo',
      {
        path: '/products',
        title: '产品总览 · 光魂（自定义）',
        description: '后台自定义的产品页描述，用于验证覆盖链路。',
        indexable: false,
        image: '/og-cover.jpg',
      },
      cookie,
    )
    assert.equal(save.status, 200)
    const saved = (await save.json()) as { item: AdminItem }
    assert.equal(saved.item.override, true)
    assert.equal(saved.item.indexable, false)
    assert.equal(saved.item.image, '/og-cover.jpg')

    const pub = (await (await get('/api/seo/meta')).json()) as {
      items: Array<{ path: string; title: string; indexable: boolean }>
    }
    const entry = pub.items.find((item) => item.path === '/products')
    assert.ok(entry)
    assert.equal(entry.title, '产品总览 · 光魂（自定义）')
    assert.equal(entry.indexable, false)

    const head = resolveHead('/products', 'https://example.test')
    assert.equal(head.title, '产品总览 · 光魂（自定义）')
    assert.equal(head.indexable, false)
    assert.equal(head.image, 'https://example.test/og-cover.jpg')

    // sitemap 同步移除被设为 noindex 的路径
    const sitemap = await (await get('/sitemap.xml')).text()
    assert.ok(!sitemap.includes('/products</loc>'), 'noindex 路径不应出现在 sitemap')
  })

  it('非法路径 / 空标题 / 超长标题被拒绝', async () => {
    const unknown = await put(
      '/api/admin/seo',
      { path: '/no-such', title: '标题', description: '描述', indexable: true },
      cookie,
    )
    assert.equal(unknown.status, 400)

    const empty = await put(
      '/api/admin/seo',
      { path: '/products', title: '   ', description: '描述', indexable: true },
      cookie,
    )
    assert.equal(empty.status, 400)

    const tooLong = await put(
      '/api/admin/seo',
      { path: '/products', title: '标'.repeat(81), description: '描述', indexable: true },
      cookie,
    )
    assert.equal(tooLong.status, 400)

    const badImage = await put(
      '/api/admin/seo',
      {
        path: '/products',
        title: '标题',
        description: '描述',
        indexable: true,
        image: 'javascript:alert(1)',
      },
      cookie,
    )
    assert.equal(badImage.status, 400)
  })

  it('恢复默认：删除覆盖并回落到默认值，sitemap 重新收录', async () => {
    const res = await del('/api/admin/seo?path=%2Fproducts', cookie)
    assert.equal(res.status, 200)
    const body = (await res.json()) as { item: AdminItem }
    assert.equal(body.item.override, false)
    assert.equal(body.item.title, body.item.defaultTitle)
    assert.equal(body.item.image, '')

    const head = resolveHead('/products', 'https://example.test')
    assert.equal(head.title, '全部产品 · 光魂')
    assert.equal(head.indexable, true)

    const pub = (await (await get('/api/seo/meta')).json()) as { items: unknown[] }
    assert.deepEqual(pub.items, [])

    const sitemap = await (await get('/sitemap.xml')).text()
    assert.ok(sitemap.includes('/products</loc>'), '恢复后 /products 应重新出现在 sitemap')
  })
})
