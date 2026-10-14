/**
 * 后端契约测试：断言《光魂官网 · 后端接口契约 v1》的 12 条端点行为。
 * 零外部依赖 —— 使用 Node 内置 test runner + 全局 fetch，在临时端口启动真实 Express 应用。
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

/** 隔离到临时 SQLite 库，避免读写仓库 data/ 目录（旧 JSON 路径指向不存在文件 → 由 seed 初始化） */
const tmpDir = path.join(os.tmpdir(), `gh-contract-${process.pid}`)
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')

let server: Server
let base: string

before(async () => {
  const app = createApp()
  server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const addr = server.address()
  assert.ok(addr && typeof addr === 'object', '服务器应监听成功')
  base = `http://127.0.0.1:${addr.port}`
})

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  rmSync(tmpDir, { recursive: true, force: true })
})

const get = (path: string, init?: RequestInit) => fetch(base + path, init)

/** 核心端点 → 期望的顶层键（键名严格对齐契约，勿统一大小写） */
const ENDPOINTS: Array<{ path: string; keys: string[] }> = [
  { path: '/api/products', keys: ['items', 'total'] },
  { path: '/api/products/gh-54027x1qe', keys: ['id', 'model'] },
  { path: '/api/search', keys: ['items', 'counts'] },
  { path: '/api/ladder', keys: ['metrics', 'meta'] },
  { path: '/api/legal', keys: [] },
  { path: '/api/legal/privacy', keys: ['slug', 'title'] },
  { path: '/api/home', keys: ['heroSlides', 'brandStats', 'news', 'techArticles'] },
  { path: '/api/support', keys: ['quickEntries', 'downloads', 'faqs'] },
  { path: '/api/business', keys: ['directions', 'cases', 'contacts'] },
  { path: '/api/about', keys: ['PHILOSOPHY_POINTS', 'FACTS', 'TIMELINE', 'JOBS'] },
  { path: '/api/center', keys: ['CENTER_VERSION', 'CAPABILITIES', 'CHANGELOG'] },
]

describe('契约 §2：核心端点', () => {
  for (const { path, keys } of ENDPOINTS) {
    it(`${path} → 200 且含预期字段`, async () => {
      const res = await get(path)
      assert.equal(res.status, 200, `${path} 应返回 200`)
      const body = (await res.json()) as Record<string, unknown>
      // 契约 §1.3：响应体直接是数据本身，不做 { code, data } 包装
      assert.ok(!('code' in body) && !('data' in body), `${path} 不应被 {code,data} 包装`)
      for (const k of keys) assert.ok(k in body, `${path} 应含字段 ${k}`)
    })
  }
})

describe('契约 §1.4：未命中语义', () => {
  it('/api/products/:id 未命中 → 404', async () => {
    const res = await get('/api/products/__nope__')
    assert.equal(res.status, 404)
    assert.ok('error' in ((await res.json()) as object))
  })

  it('/api/legal/:slug 未命中 → 404', async () => {
    const res = await get('/api/legal/__nope__')
    assert.equal(res.status, 404)
    assert.ok('error' in ((await res.json()) as object))
  })

  it('未注册路径 → 404', async () => {
    const res = await get('/api/__nope__')
    assert.equal(res.status, 404)
    assert.ok('error' in ((await res.json()) as object))
  })

  it('空结果不报错：搜索无命中仍 200 + 空数组', async () => {
    const res = await get('/api/search?q=zzzzz-no-match')
    assert.equal(res.status, 200)
    const body = (await res.json()) as { items: unknown[] }
    assert.deepEqual(body.items, [])
  })
})

describe('健康检查与响应头', () => {
  it('/healthz → 200 ok:true', async () => {
    const res = await get('/healthz')
    assert.equal(res.status, 200)
    const body = (await res.json()) as { ok: boolean }
    assert.equal(body.ok, true)
  })

  it('安全响应头已下发', async () => {
    const res = await get('/api/home')
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN')
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
  })

  it('缓存策略：数据类 no-cache、账号类 no-store、ETag 存在', async () => {
    const data = await get('/api/home')
    assert.equal(data.headers.get('cache-control'), 'no-cache')
    assert.ok(data.headers.get('etag'), '/api/home 应带 ETag')

    // 账号类数据不落盘：以个人中心端点（未登录 401）确认响应头仍为 no-store
    const account = await get('/api/account/me')
    assert.equal(account.headers.get('cache-control'), 'no-store')
  })

  it('gzip：接受压缩时返回 gzip 编码', async () => {
    const res = await get('/api/home', { headers: { 'Accept-Encoding': 'gzip' } })
    assert.equal(res.headers.get('content-encoding'), 'gzip')
  })
})

describe('运维加固：可观测性与限流', () => {
  it('/readyz → 200 ok:true', async () => {
    const res = await get('/readyz')
    assert.equal(res.status, 200)
    const body = (await res.json()) as { ok: boolean; uptimeSec: number }
    assert.equal(body.ok, true)
    assert.equal(typeof body.uptimeSec, 'number')
  })

  it('每个响应带 X-Request-Id，并透传入站值', async () => {
    const auto = await get('/healthz')
    assert.ok(auto.headers.get('x-request-id'), '应自动分配 X-Request-Id')

    const mine = 'trace-abc-123'
    const echo = await get('/healthz', { headers: { 'X-Request-Id': mine } })
    assert.equal(echo.headers.get('x-request-id'), mine, '应透传入站 X-Request-Id')
  })

  it('超限 → 429 且带 Retry-After（独立低阈值实例）', async () => {
    const prev = process.env.RATE_LIMIT_MAX
    process.env.RATE_LIMIT_MAX = '2'
    const limited = createApp().listen(0)
    await new Promise<void>((resolve) => limited.once('listening', () => resolve()))
    try {
      const addr = limited.address()
      assert.ok(addr && typeof addr === 'object')
      const url = `http://127.0.0.1:${addr.port}/api/home`
      assert.equal((await fetch(url)).status, 200)
      assert.equal((await fetch(url)).status, 200)
      const third = await fetch(url)
      assert.equal(third.status, 429, '第三次应被限流')
      assert.ok(third.headers.get('retry-after'), '应带 Retry-After')
    } finally {
      await new Promise<void>((resolve) => limited.close(() => resolve()))
      if (prev === undefined) delete process.env.RATE_LIMIT_MAX
      else process.env.RATE_LIMIT_MAX = prev
    }
  })

  it('健康检查不参与限流', async () => {
    const prev = process.env.RATE_LIMIT_MAX
    process.env.RATE_LIMIT_MAX = '1'
    const limited = createApp().listen(0)
    await new Promise<void>((resolve) => limited.once('listening', () => resolve()))
    try {
      const addr = limited.address()
      assert.ok(addr && typeof addr === 'object')
      const url = `http://127.0.0.1:${addr.port}/healthz`
      for (let i = 0; i < 5; i++) assert.equal((await fetch(url)).status, 200)
    } finally {
      await new Promise<void>((resolve) => limited.close(() => resolve()))
      if (prev === undefined) delete process.env.RATE_LIMIT_MAX
      else process.env.RATE_LIMIT_MAX = prev
    }
  })
})

/**
 * 在指定环境变量下新建一个独立实例执行断言，结束后关闭并原样还原环境变量。
 * 用于验证「仅在特定部署配置下才生效」的加固分支（CORS 白名单、HSTS），
 * 避免与默认实例互相污染。
 */
async function withApp(
  env: Record<string, string | undefined>,
  fn: (base: string) => Promise<void>,
): Promise<void> {
  const saved: Record<string, string | undefined> = {}
  for (const key of Object.keys(env)) {
    saved[key] = process.env[key]
    if (env[key] === undefined) delete process.env[key]
    else process.env[key] = env[key]
  }
  const server = createApp().listen(0)
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  try {
    const addr = server.address()
    assert.ok(addr && typeof addr === 'object')
    await fn(`http://127.0.0.1:${addr.port}`)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    for (const key of Object.keys(env)) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  }
}

describe('运维加固分支：CORS 白名单与 HSTS（按环境变量）', () => {
  it('未配置 CORS_ORIGINS → 放开跨域（回 *）', async () => {
    await withApp({ CORS_ORIGINS: undefined }, async (b) => {
      const res = await fetch(`${b}/api/home`, { headers: { Origin: 'https://any.example' } })
      assert.equal(res.headers.get('access-control-allow-origin'), '*')
    })
  })

  it('配置 CORS_ORIGINS → 白名单内放行、白名单外不回 ACAO', async () => {
    await withApp({ CORS_ORIGINS: 'https://www.gh.com,https://gh.com' }, async (b) => {
      const allowed = await fetch(`${b}/api/home`, { headers: { Origin: 'https://www.gh.com' } })
      assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://www.gh.com')
      const blocked = await fetch(`${b}/api/home`, { headers: { Origin: 'https://evil.example' } })
      assert.equal(blocked.headers.get('access-control-allow-origin'), null)
    })
  })

  it('TRUST_PROXY：置 1 → 下发 HSTS；未设置 → 不下发', async () => {
    await withApp({ TRUST_PROXY: undefined }, async (b) => {
      const res = await fetch(`${b}/healthz`)
      assert.equal(res.headers.get('strict-transport-security'), null)
    })
    await withApp({ TRUST_PROXY: '1' }, async (b) => {
      const res = await fetch(`${b}/healthz`)
      assert.match(
        res.headers.get('strict-transport-security') ?? '',
        /max-age=31536000/,
        'TRUST_PROXY=1 时应下发 HSTS',
      )
    })
  })
})