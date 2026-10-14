/**
 * 端到端集成测试：真实 HTTP 全链路（同源托管前端产物 + API + 探针 + 缓存 + 压缩）。
 * 覆盖「前端构建产物经后端同源托管」这一生产拓扑，替代人工点检。
 *
 * 前置：前端已构建为同源产物（`VITE_API_BASE= npm run build`，产物 `gh-web/dist`）。
 * 运行：`npm run test:e2e`（自动构建后执行）；亦可在 dist 已就绪时 `node --import tsx --test test/e2e.test.ts`。
 */
import assert from 'node:assert/strict'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import type { Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createApp } from '../src/app'

const here = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(here, '../../gh-web/dist')

/** 隔离到临时 SQLite 库，避免读写仓库 data/ 目录（旧 JSON 路径指向不存在文件 → 由 seed 初始化） */
const tmpDir = path.join(os.tmpdir(), `gh-e2e-${process.pid}`)
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')

let server: Server
let base: string
let assetJs: string

before(async () => {
  assert.ok(
    existsSync(path.join(distDir, 'index.html')),
    `未找到前端产物：${distDir}。请先构建（gh-web：VITE_API_BASE= npm run build），或直接运行 npm run test:e2e`,
  )
  // createApp 在调用时读取 STATIC_DIR，故此处设置即可启用同源托管
  process.env.STATIC_DIR = distDir

  const assets = readdirSync(path.join(distDir, 'assets'))
  assetJs = assets.find((f) => f.startsWith('index-') && f.endsWith('.js')) ?? ''
  assert.ok(assetJs, '未找到预期的 assets 入口 JS（index-*.js）')

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

describe('端到端：同源托管前端 + API', () => {
  it('首页 / → 200 HTML、含挂载点、index.html 不缓存', async () => {
    const res = await get('/')
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type') ?? '', /text\/html/)
    assert.equal(res.headers.get('cache-control'), 'no-cache')
    const html = await res.text()
    assert.match(html, /<div id="root">/)
    assert.match(html, /type="module"/)
  })

  it('SPA 深链 /products/gh-54027x1qe → 200 且回退 index.html', async () => {
    const res = await get('/products/gh-54027x1qe', { headers: { Accept: 'text/html' } })
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type') ?? '', /text\/html/)
    assert.match(await res.text(), /<div id="root">/)
  })

  it('带 hash 的产物 → 长缓存 immutable', async () => {
    const res = await get(`/assets/${assetJs}`)
    assert.equal(res.status, 200)
    assert.match(res.headers.get('cache-control') ?? '', /immutable/)
  })

  it('静态可发现性文件随产物可直接访问：robots.txt / sitemap.xml / favicon.svg', async () => {
    for (const f of ['/robots.txt', '/sitemap.xml', '/favicon.svg']) {
      assert.equal((await get(f)).status, 200, `${f} 应可访问`)
    }
  })

  it('API 与静态共存：/api/products → 200 且字段正确', async () => {
    const res = await get('/api/products')
    assert.equal(res.status, 200)
    const body = (await res.json()) as Record<string, unknown>
    assert.ok('items' in body && 'total' in body)
  })

  it('API 未命中不被 SPA 回退吞掉：/api/products/nope → 404 JSON', async () => {
    const res = await get('/api/products/nope', { headers: { Accept: 'text/html' } })
    assert.equal(res.status, 404)
    assert.ok('error' in ((await res.json()) as object))
  })

  it('探针与请求 ID 在同源模式下仍生效', async () => {
    const res = await get('/readyz')
    assert.equal(res.status, 200)
    assert.ok(res.headers.get('x-request-id'), '应带 X-Request-Id')
  })

  it('gzip：前端产物与 API JSON 均按 Accept-Encoding 压缩', async () => {
    const js = await get(`/assets/${assetJs}`, { headers: { 'Accept-Encoding': 'gzip' } })
    assert.equal(js.headers.get('content-encoding'), 'gzip', '入口 JS 应被 gzip')

    const api = await get('/api/home', { headers: { 'Accept-Encoding': 'gzip' } })
    assert.equal(api.headers.get('content-encoding'), 'gzip', 'API JSON 应被 gzip')
  })

  it('未知深链（前端路由范围内）→ 回退 index.html 由前端渲染 404 空态', async () => {
    const res = await get('/no-such-page', { headers: { Accept: 'text/html' } })
    assert.equal(res.status, 200)
    assert.match(await res.text(), /<div id="root">/)
  })
})