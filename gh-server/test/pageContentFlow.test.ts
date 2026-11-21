/**
 * 页面内容链路测试：
 * 1) 后台保存只写草稿，前台不变；发布后前台立即读到新内容；
 * 2) 区块引用校验：危险链接、不存在的产品 / 系列在保存时被拒，合法引用可保存。
 *
 * 隔离：临时 SQLite；临时端口启动真实 Express 应用。
 * 运行：npm test
 */
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import type { Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'

const dbDir = path.join(os.tmpdir(), `gh-page-flow-db-${process.pid}`)
process.env.DB_PATH = path.join(dbDir, 'gh.sqlite')
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `gh-page-flow-uploads-${process.pid}`)
process.env.CONTENT_STORE_PATH = path.join(dbDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(dbDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(dbDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(dbDir, 'legacy-audit-log.json')

let server: Server
let base = ''
let token = ''

const auth = () => ({ Authorization: `Bearer ${token}` })
const jsonAuth = () => ({ 'Content-Type': 'application/json', ...auth() })

/** 读前台页面（走公开接口，验证真实生效链路） */
async function publicPage(key: string): Promise<{
  title: string
  blocks?: Array<{ type: string; props: Record<string, unknown> }>
}> {
  const res = await fetch(`${base}/api/content/pages/${key}`)
  assert.equal(res.status, 200)
  return ((await res.json()) as { page: { title: string } }).page
}

before(async () => {
  rmSync(dbDir, { recursive: true, force: true })
  server = createApp().listen(0)
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const addr = server.address()
  assert.ok(addr && typeof addr === 'object')
  base = `http://127.0.0.1:${addr.port}`
  const res = await fetch(`${base}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  })
  assert.equal(res.status, 200)
  token = ((await res.json()) as { token: string }).token
})

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  rmSync(dbDir, { recursive: true, force: true })
})

describe('草稿 → 发布 → 前台生效', () => {
  it('保存只写草稿，发布后前台立即更新', async () => {
    const original = await publicPage('home')

    const save = await fetch(`${base}/api/admin/pages/home`, {
      method: 'PUT',
      headers: jsonAuth(),
      body: JSON.stringify({ title: '发布链路测试标题' }),
    })
    assert.equal(save.status, 200)
    assert.equal(((await save.json()) as { draft: boolean }).draft, true)

    assert.equal((await publicPage('home')).title, original.title, '未发布时前台必须保持原样')

    const publish = await fetch(`${base}/api/admin/pages/home/publish`, { method: 'POST', headers: auth() })
    assert.equal(publish.status, 200)

    assert.equal((await publicPage('home')).title, '发布链路测试标题', '发布后前台应立即读到新标题')
  })

  it('上传图片 → 写入区块 → 发布后前台可见且图片地址可访问', async () => {
    // 1×1 PNG：只验证链路，不依赖具体画面
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    const upload = await fetch(`${base}/api/admin/uploads`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'image/png', 'X-File-Name': encodeURIComponent('e2e.png') },
      body: new Uint8Array(png),
    })
    assert.equal(upload.status, 201)
    const { item } = (await upload.json()) as { item: { url: string; size: number } }
    assert.ok(item.url.startsWith('/uploads/'))

    const save = await fetch(`${base}/api/admin/pages/home`, {
      method: 'PUT',
      headers: jsonAuth(),
      body: JSON.stringify({
        blocks: [{ id: 'b1', type: 'fullscreenVisual', props: { media: item.url, alt: '上传链路' } }],
      }),
    })
    assert.equal(save.status, 200)
    const publish = await fetch(`${base}/api/admin/pages/home/publish`, { method: 'POST', headers: auth() })
    assert.equal(publish.status, 200)

    const page = await publicPage('home')
    const hero = page.blocks?.find((block) => block.type === 'fullscreenVisual')
    assert.equal(hero?.props.media, item.url, '发布后前台区块应使用新上传的图片')

    const image = await fetch(`${base}${item.url}`)
    assert.equal(image.status, 200)
    assert.equal(image.headers.get('content-type')?.split(';')[0], 'image/png')
    assert.equal((await image.arrayBuffer()).byteLength, item.size, '前台取到的字节数应与上传一致')
  })
})

describe('区块引用校验', () => {
  const postPage = (key: string, blocks: unknown) =>
    fetch(`${base}/api/admin/pages`, {
      method: 'POST',
      headers: jsonAuth(),
      body: JSON.stringify({ key, path: `/${key}`, title: '引用校验', blocks }),
    })

  it('拒绝 javascript: 等危险链接', async () => {
    const res = await postPage('ref-bad-link', [
      { id: 'b1', type: 'hero', props: { primary: { label: '点我', href: 'javascript:alert(1)' } } },
    ])
    assert.equal(res.status, 422)
    assert.match(((await res.json()) as { error: string }).error, /链接地址不安全/)
  })

  it('拒绝不存在的产品引用', async () => {
    const res = await postPage('ref-bad-product', [
      { id: 'b1', type: 'showcase', props: { items: [{ productId: 'gh-not-exist', title: 'x' }] } },
    ])
    assert.equal(res.status, 422)
    assert.match(((await res.json()) as { error: string }).error, /不存在的产品/)
  })

  it('拒绝匹配不到产品的系列', async () => {
    const res = await postPage('ref-bad-series', [
      { id: 'b1', type: 'productGrid', props: { source: 'series', seriesId: 'no-such-series' } },
    ])
    assert.equal(res.status, 422)
    assert.match(((await res.json()) as { error: string }).error, /没有匹配的产品/)
  })

  it('接受真实产品引用与站内链接', async () => {
    const products = (await (await fetch(`${base}/api/products`)).json()) as { items: Array<{ id: string }> }
    assert.ok(products.items.length > 0)
    const productId = products.items[0].id
    const res = await postPage('ref-ok', [
      { id: 'b1', type: 'showcase', props: { items: [{ productId, title: 'x' }] } },
      { id: 'b2', type: 'hero', props: { primary: { label: '产品', href: `/products/${productId}` } } },
    ])
    assert.equal(res.status, 201)
  })
})
