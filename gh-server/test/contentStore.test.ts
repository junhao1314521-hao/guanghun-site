/**
 * 内容库后端测试（契约 §6 / §7）：公开端点 + 后台端点 + 持久化落库 + 重置。
 *
 * 零外部依赖 —— Node 内置 test runner + 全局 fetch，在临时端口启动真实 Express 应用。
 * 通过 `DB_PATH` 指向临时 SQLite 库实现存储隔离（阶段 5a）；旧 JSON 路径指向不存在的
 * 临时文件，避免误迁移仓库 data/ 数据。启动前预置一份「已存在的内容库」（由 seed 改写 home 标题），
 * 以此验证启动读库。
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
import { BLOCK_TYPES } from '../src/data/blockCatalog'
import { buildSeed } from '../src/data/contentSeed'
import { getDb } from '../src/data/db'

/** 隔离的临时目录 + 独立 SQLite 库（每个测试进程独立） */
const tmpDir = path.join(os.tmpdir(), `gh-content-store-${process.pid}`)
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
/** 旧 JSON 路径指向不存在的临时文件，避免迁移仓库 data/ 目录 */
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')

/** seed 真源：用于构造「已存在的内容库」并断言页面数量 */
const seed = buildSeed()

// 预置 DB：home 标题被改写，用于证明启动时「读库」而非重新生成 seed
{
  const db = getDb()
  const insert = db.prepare('INSERT OR REPLACE INTO content_pages(key, data, updated_at) VALUES(?, ?, ?)')
  for (const page of seed.pages) {
    const stored = page.key === 'home' ? { ...page, title: '首页 · 已存盘' } : page
    insert.run(stored.key, JSON.stringify(stored), stored.updatedAt)
  }
  db.prepare('INSERT OR REPLACE INTO site_config(id, data) VALUES(1, ?)').run(JSON.stringify(seed.site))
}

let server: Server
let base: string
let token: string

before(async () => {
  server = createApp().listen(0)
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const addr = server.address()
  assert.ok(addr && typeof addr === 'object', '服务器应监听成功')
  base = `http://127.0.0.1:${addr.port}`

  const login = await fetch(`${base}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  })
  assert.equal(login.status, 200, '后台登录应成功')
  token = ((await login.json()) as { token: string }).token
})

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  rmSync(tmpDir, { recursive: true, force: true })
})

const get = (p: string, init?: RequestInit) => fetch(base + p, init)
const auth = () => ({ Authorization: `Bearer ${token}` })
/** 读取落库页面（断言持久化） */
const diskPages = (): Array<{ key: string; title: string; blocks: unknown[] }> =>
  (getDb().prepare('SELECT data FROM content_pages ORDER BY rowid ASC').all() as Array<{ data: string }>).map(
    (row) => JSON.parse(row.data),
  )

describe('公开端点（契约 §6.1）', () => {
  it('GET /api/content/pages → { items, total }，列表项不含 blocks', async () => {
    const res = await get('/api/content/pages')
    assert.equal(res.status, 200)
    const body = (await res.json()) as { items: Array<Record<string, unknown>>; total: number }
    assert.equal(body.total, seed.pages.length)
    assert.equal(body.items.length, seed.pages.length)
    const home = body.items.find((item) => item.key === 'home')
    assert.ok(home, '列表应含 home 页面')
    for (const key of ['key', 'path', 'title', 'blockCount', 'updatedAt']) assert.ok(key in home, `列表项应含 ${key}`)
    assert.equal(typeof home.blockCount, 'number')
    assert.ok(!('blocks' in home), '列表项不应含 blocks')
  })

  it('GET /api/content/pages/home → { page }，且为磁盘已存版本（证明启动读盘）', async () => {
    const res = await get('/api/content/pages/home')
    assert.equal(res.status, 200)
    const { page } = (await res.json()) as { page: { title: string; blocks: unknown[] } }
    assert.equal(page.title, '首页 · 已存盘', '应加载磁盘文件而非重新生成 seed')
    assert.ok(Array.isArray(page.blocks) && page.blocks.length > 0)
  })

  it('GET /api/content/pages/:key 未命中 → 404', async () => {
    const res = await get('/api/content/pages/__nope__')
    assert.equal(res.status, 404)
    assert.ok('error' in ((await res.json()) as object))
  })

  it('GET /api/content/site → { nav, footer }', async () => {
    const res = await get('/api/content/site')
    assert.equal(res.status, 200)
    const body = (await res.json()) as { nav: unknown[]; footer: unknown[] }
    assert.ok(Array.isArray(body.nav) && body.nav.length > 0)
    assert.ok(Array.isArray(body.footer) && body.footer.length > 0)
  })

  it('GET /api/content/blocks/types → { items } 覆盖全部区块类型（与目录数量一致）', async () => {
    const res = await get('/api/content/blocks/types')
    assert.equal(res.status, 200)
    const { items } = (await res.json()) as { items: Array<{ type: string; name: string; group: string; fields: unknown[] }> }
    assert.equal(items.length, BLOCK_TYPES.length)
    for (const item of items) {
      assert.ok(item.type && item.name && item.group, '目录项应含 type / name / group')
      assert.ok(Array.isArray(item.fields), '目录项应含 fields 数组')
    }
    assert.ok(items.some((item) => item.type === 'hero'))
    assert.ok(items.some((item) => item.type === 'layout'))
    // 自定义模块三类（自由内容区块）
    assert.ok(items.some((item) => item.type === 'richText'))
    assert.ok(items.some((item) => item.type === 'html'))
    assert.ok(items.some((item) => item.type === 'embed'))
  })
})

describe('后台鉴权（契约 §6.2）', () => {
  it('无 token → 401', async () => {
    const res = await get('/api/admin/pages')
    assert.equal(res.status, 401)
    assert.ok('error' in ((await res.json()) as object))
  })

  it('无效 token → 401', async () => {
    const res = await get('/api/admin/pages', { headers: { Authorization: 'Bearer bad-token' } })
    assert.equal(res.status, 401)
  })

  it('有效 token → 200 { items, total }', async () => {
    const res = await get('/api/admin/pages', { headers: auth() })
    assert.equal(res.status, 200)
    const body = (await res.json()) as { items: unknown[]; total: number }
    assert.equal(body.total, seed.pages.length)
    assert.equal(body.items.length, seed.pages.length)
  })
})

describe('后台页面读写与持久化（契约 §6.2 / §7）', () => {
  it('GET /api/admin/pages/:key → { page }；未命中 404', async () => {
    const res = await get('/api/admin/pages/home', { headers: auth() })
    assert.equal(res.status, 200)
    const { page } = (await res.json()) as { page: { key: string } }
    assert.equal(page.key, 'home')

    const miss = await get('/api/admin/pages/__nope__', { headers: auth() })
    assert.equal(miss.status, 404)
  })

  it('PUT /api/admin/pages/:key 全量覆盖 blocks → { page } 并落盘', async () => {
    const current = (await (await get('/api/admin/pages/home', { headers: auth() })).json()) as {
      page: { blocks: Array<Record<string, unknown>> }
    }
    const blocks = current.page.blocks.slice(0, 1).map((block) => ({ ...block, enabled: false }))
    const res = await get('/api/admin/pages/home', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ blocks, title: '首页 · 已改' }),
    })
    assert.equal(res.status, 200)
    const { page } = (await res.json()) as { page: { title: string; blocks: unknown[]; updatedAt: string } }
    assert.equal(page.title, '首页 · 已改')
    assert.equal(page.blocks.length, 1)
    assert.ok(!Number.isNaN(Date.parse(page.updatedAt)), 'updatedAt 应为 ISO 时间')

    // 公开端即时反映
    const pub = (await (await get('/api/content/pages/home')).json()) as { page: { title: string; blocks: unknown[] } }
    assert.equal(pub.page.title, '首页 · 已改')
    assert.equal(pub.page.blocks.length, 1)

    // 已事务落库
    const homeOnDisk = diskPages().find((p) => p.key === 'home')
    assert.ok(homeOnDisk)
    assert.equal(homeOnDisk.title, '首页 · 已改')
    assert.equal(homeOnDisk.blocks.length, 1)
  })

  it('PUT 非法 blocks → 400', async () => {
    const res = await get('/api/admin/pages/home', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ blocks: [{ id: 'x', type: '不存在的类型', props: {} }] }),
    })
    assert.equal(res.status, 400)
  })

  it('POST /api/admin/pages 新建 → 201；重复 key → 409；缺字段 → 400', async () => {
    const created = await get('/api/admin/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ key: 'promo', path: '/promo', title: '专题页' }),
    })
    assert.equal(created.status, 201)
    const { page } = (await created.json()) as { page: { key: string; blocks: unknown[] } }
    assert.equal(page.key, 'promo')
    assert.deepEqual(page.blocks, [])

    const dup = await get('/api/admin/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ key: 'promo', path: '/promo', title: '专题页' }),
    })
    assert.equal(dup.status, 409)

    const bad = await get('/api/admin/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ key: 'no-title' }),
    })
    assert.equal(bad.status, 400)
  })

  it('DELETE 内置页面 → 400；DELETE 新建页面 → { ok: true }', async () => {
    const builtin = await get('/api/admin/pages/home', { method: 'DELETE', headers: auth() })
    assert.equal(builtin.status, 400)

    const removed = await get('/api/admin/pages/promo', { method: 'DELETE', headers: auth() })
    assert.equal(removed.status, 200)
    assert.deepEqual(await removed.json(), { ok: true })

    const gone = await get('/api/admin/pages/promo', { headers: auth() })
    assert.equal(gone.status, 404)
  })

  it('POST /api/admin/pages/:key/reset 重置为 seed', async () => {
    const res = await get('/api/admin/pages/home/reset', { method: 'POST', headers: auth() })
    assert.equal(res.status, 200)
    const { page } = (await res.json()) as { page: { title: string; blocks: unknown[] } }
    const seedHome = seed.pages.find((p) => p.key === 'home')!
    assert.equal(page.title, seedHome.title)
    assert.equal(page.blocks.length, seedHome.blocks.length)

    const miss = await get('/api/admin/pages/__nope__/reset', { method: 'POST', headers: auth() })
    assert.equal(miss.status, 404)
  })

  it('PUT /api/admin/site 保存站点配置 → { site } 并生效', async () => {
    const site = { nav: [{ label: '新导航项', href: '/new' }], footer: seed.site.footer }
    const res = await get('/api/admin/site', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify(site),
    })
    assert.equal(res.status, 200)
    const saved = (await res.json()) as { site: { nav: Array<{ label: string }> } }
    assert.equal(saved.site.nav[0].label, '新导航项')

    const pub = (await (await get('/api/content/site')).json()) as { nav: Array<{ label: string }> }
    assert.equal(pub.nav[0].label, '新导航项')

    const bad = await get('/api/admin/site', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ nav: 'oops' }),
    })
    assert.equal(bad.status, 400)
  })

  it('PUT /api/admin/blocks/enabled 停用区块类型 → /api/content/blocks/types 标记 enabled:false', async () => {
    const all = (await (await get('/api/content/blocks/types')).json()) as { items: Array<{ type: string; enabled?: boolean }> }
    const enabled = all.items.map((item) => item.type).filter((type) => type !== 'embed')

    const res = await get('/api/admin/blocks/enabled', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ enabled }),
    })
    assert.equal(res.status, 200)

    const after = (await (await get('/api/content/blocks/types')).json()) as {
      items: Array<{ type: string; enabled?: boolean }>
    }
    assert.equal(after.items.length, BLOCK_TYPES.length, '目录仍返回全部区块类型')
    assert.equal(after.items.find((item) => item.type === 'embed')?.enabled, false, '停用的 embed 应为 enabled:false')
    assert.equal(after.items.find((item) => item.type === 'video')?.enabled, true, '未停用的 video 仍为 enabled:true')

    // 非法类型 → 400
    const bad = await get('/api/admin/blocks/enabled', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ enabled: ['not-a-type'] }),
    })
    assert.equal(bad.status, 400)

    // 恢复为全部启用
    await get('/api/admin/blocks/enabled', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ enabled: all.items.map((item) => item.type) }),
    })
    const restored = (await (await get('/api/content/blocks/types')).json()) as {
      items: Array<{ type: string; enabled?: boolean }>
    }
    assert.ok(restored.items.every((item) => item.enabled === true), '恢复后应全部启用')
  })

  it('PUT /api/admin/theme 保存令牌 → /api/content/site 可见（白名单外键被过滤）', async () => {
    const res = await get('/api/admin/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ theme: { '--gh-container-max': '1280px', '--evil-x': '1px' } }),
    })
    assert.equal(res.status, 200)
    const { theme } = (await res.json()) as { theme: Record<string, string> }
    assert.equal(theme['--gh-container-max'], '1280px')
    assert.ok(!('--evil-x' in theme), '白名单外的键应被丢弃')

    const site = (await (await get('/api/content/site')).json()) as { theme?: Record<string, string> }
    assert.equal(site.theme?.['--gh-container-max'], '1280px', '站点配置应含主题令牌')

    // PUT /site（仅 nav/footer）应浅合并、不丢失 theme
    await get('/api/admin/site', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ nav: seed.site.nav, footer: seed.site.footer }),
    })
    const after = (await (await get('/api/content/site')).json()) as { theme?: Record<string, string> }
    assert.equal(after.theme?.['--gh-container-max'], '1280px', '保存导航不应清空主题令牌')
  })
})