/**
 * 阶段 5b 测试：鉴权加固（密码哈希 / Cookie 会话 / CSRF）+ 备份 / 恢复 / 重置。
 *
 * 隔离：DB_PATH 指向临时 SQLite 库，BACKUP_DIR 指向临时目录，旧 JSON 路径指向不存在文件。
 * 在临时端口启动真实 Express 应用，走真实 HTTP。
 *
 * 运行：npm test
 */
import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import type { Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'
import { getDb } from '../src/data/db'
import { buildCollectionSeed } from '../src/data/collectionStore'
import { hashPassword, verifyPassword } from '../src/data/admin'

/** 隔离的临时目录 + 独立 SQLite 库 + 独立备份目录 */
const tmpDir = path.join(os.tmpdir(), `gh-auth-backup-${process.pid}`)
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
process.env.BACKUP_DIR = path.join(tmpDir, 'backups')
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')

let server: Server
let base: string
/** 会话令牌（用于 Bearer 兼容分支） */
let token = ''
/** 登录下发的会话 cookie 值（`gh_admin=<token>` 的原始串） */
let cookie = ''

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
const auth = () => ({ Authorization: `Bearer ${token}` })

describe('阶段 5b · 密码哈希与 timing-safe 比较', () => {
  it('hashPassword / verifyPassword：正确密码通过、错误密码拒绝、盐不同则哈希不同', () => {
    const a = hashPassword('admin123')
    const b = hashPassword('admin123')
    assert.notEqual(a.salt, b.salt, '每次应使用随机盐')
    assert.notEqual(a.hash, b.hash, '不同盐应产生不同哈希')
    assert.equal(verifyPassword('admin123', a.salt, a.hash), true)
    assert.equal(verifyPassword('wrong', a.salt, a.hash), false)
    // 哈希长度不匹配时不抛错，直接判否
    assert.equal(verifyPassword('admin123', a.salt, 'deadbeef'), false)
  })

  it('登录后 admin_users 表中不再是明文密码', async () => {
    const login = await get('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    })
    assert.equal(login.status, 200)
    const body = (await login.json()) as { token: string }
    token = body.token
    const setCookie = login.headers.get('set-cookie') ?? ''
    const match = /gh_admin=([^;]+)/.exec(setCookie)
    assert.ok(match, '响应应下发 gh_admin Cookie')
    cookie = `gh_admin=${match[1]}`

    const rows = getDb().prepare('SELECT username, salt, hash FROM admin_users').all() as Array<{
      username: string
      salt: string
      hash: string
    }>
    assert.ok(rows.length >= 2, '应有种子账号')
    for (const row of rows) {
      assert.ok(row.salt.length > 0 && row.hash.length > 0, '应存储 salt + hash')
      assert.ok(!row.hash.includes('admin123') && !row.hash.includes('oper123'), '哈希列不应包含明文')
    }
    // 表列不包含 password（结构断言：无明文列）
    const cols = (getDb().prepare('PRAGMA table_info(admin_users)').all() as Array<{ name: string }>).map((c) => c.name)
    assert.ok(!cols.includes('password'), 'admin_users 不应存在明文 password 列')
  })

  it('错误密码 → 401', async () => {
    const res = await get('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrong-password' }),
    })
    assert.equal(res.status, 401)
  })
})

describe('阶段 5b · Cookie 会话与 Bearer 兼容', () => {
  it('登录响应 Set-Cookie 带 HttpOnly / SameSite=Lax', () => {
    // 用上一条用例捕获的 set-cookie 重新登录一次以独立断言
    return get('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'operator', password: 'oper123' }),
    }).then((res) => {
      const setCookie = res.headers.get('set-cookie') ?? ''
      assert.match(setCookie, /gh_admin=/)
      assert.match(setCookie, /HttpOnly/i)
      assert.match(setCookie, /SameSite=Lax/i)
    })
  })

  it('仅用 Cookie（不带 Authorization）访问 /auth/me → 200', async () => {
    const res = await get('/api/admin/auth/me', { headers: { Cookie: cookie } })
    assert.equal(res.status, 200)
    const profile = (await res.json()) as { username: string }
    assert.equal(profile.username, 'admin')
  })

  it('Bearer 兼容分支仍可用 → /auth/me 200', async () => {
    const res = await get('/api/admin/auth/me', { headers: auth() })
    assert.equal(res.status, 200)
  })

  it('既无 Cookie 也无 token → 401', async () => {
    const res = await get('/api/admin/auth/me')
    assert.equal(res.status, 401)
  })

  it('注销清除 Cookie 并失效会话', async () => {
    const res = await get('/api/admin/auth/logout', { method: 'POST', headers: { Cookie: cookie } })
    assert.equal(res.status, 200)
    const cleared = res.headers.get('set-cookie') ?? ''
    assert.match(cleared, /gh_admin=;/)
    // 会话已失效
    const me = await get('/api/admin/auth/me', { headers: { Cookie: cookie } })
    assert.equal(me.status, 401)
    // 重新登录供后续用例使用
    const relogin = await get('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    })
    token = ((await relogin.json()) as { token: string }).token
    cookie = `gh_admin=${token}`
  })
})

describe('阶段 5b · CSRF 防护', () => {
  it('写操作携带非法 Origin → 403', async () => {
    const res = await get('/api/admin/backups', {
      method: 'POST',
      headers: { ...auth(), Origin: 'https://evil.example' },
    })
    assert.equal(res.status, 403)
    assert.ok('error' in ((await res.json()) as object))
  })

  it('写操作同源 Origin（与请求 Host 一致）→ 放行', async () => {
    const host = base.replace(/^https?:\/\//, '')
    const res = await get('/api/admin/backups', {
      method: 'POST',
      headers: { ...auth(), Origin: `http://${host}` },
    })
    assert.equal(res.status, 201)
  })
})

describe('阶段 5b · 备份 / 恢复 / 重置', () => {
  it('POST /backups 生成备份 → 列表可见 → 下载 → 删除', async () => {
    const created = await get('/api/admin/backups', { method: 'POST', headers: auth() })
    assert.ok(created.status === 200 || created.status === 201)
    const { item } = (await created.json()) as { item: { id: string; name: string; size: number; at: string } }
    assert.ok(item.id.endsWith('.json'), '备份 id 应为文件名')
    assert.ok(item.size > 0, '备份应非空')
    assert.ok(!Number.isNaN(Date.parse(item.at)), 'at 应为可解析时间')

    const list = (await (await get('/api/admin/backups', { headers: auth() })).json()) as {
      items: Array<{ id: string }>
      total: number
    }
    assert.equal(list.total, list.items.length)
    assert.ok(list.items.some((entry) => entry.id === item.id), '列表应含新建备份')

    const download = await get(`/api/admin/backups/${encodeURIComponent(item.id)}/download`, { headers: auth() })
    assert.equal(download.status, 200)
    assert.match(download.headers.get('content-type') ?? '', /application\/json/)
    const snap = (await download.json()) as { version: number; data: { content_pages: unknown[] } }
    assert.equal(typeof snap.version, 'number')
    assert.ok(snap.data.content_pages.length > 0, '快照应含内容页面')

    // 清理：仅删除该备份
    const removed = await get(`/api/admin/backups/${encodeURIComponent(item.id)}`, { method: 'DELETE', headers: auth() })
    assert.equal(removed.status, 200)

    const miss = await get('/api/admin/backups/__nope__.json', { method: 'DELETE', headers: auth() })
    assert.equal(miss.status, 404)
  })

  it('POST /backups/:id/restore 覆盖恢复（先自动生成恢复前快照）', async () => {
    // 建立基线备份
    const created = await get('/api/admin/backups', { method: 'POST', headers: auth() })
    const { item } = (await created.json()) as { item: { id: string } }

    // 修改一条产品名
    const products = (await (await get('/api/admin/resources/products', { headers: auth() })).json()) as {
      items: Array<{ id: string; name: string }>
    }
    const target = products.items[0]
    await get(`/api/admin/resources/products/${target.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ name: '被改坏的名字' }),
    })

    // 恢复 → 200
    const restore = await get(`/api/admin/backups/${encodeURIComponent(item.id)}/restore`, {
      method: 'POST',
      headers: auth(),
    })
    assert.equal(restore.status, 200)
    assert.deepEqual(await restore.json(), { ok: true })

    // 数据已回到基线
    const after = (await (await get('/api/admin/resources/products', { headers: auth() })).json()) as {
      items: Array<{ id: string; name: string }>
    }
    assert.equal(after.items.find((p) => p.id === target.id)?.name, target.name, '恢复后应回到基线名称')

    // 恢复前快照已自动生成
    const list = (await (await get('/api/admin/backups', { headers: auth() })).json()) as { items: Array<{ name: string }> }
    assert.ok(list.items.some((entry) => entry.name.includes('pre-restore')), '应自动生成 pre-restore 快照')
  })

  it('POST /reset（scope=collections, key=products）→ 数据回到 seed', async () => {
    const seedProducts = buildCollectionSeed().products
    const id = seedProducts[0].id
    await get(`/api/admin/resources/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ name: '重置前被改' }),
    })

    const res = await get('/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ scope: 'collections', key: 'products' }),
    })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true })

    const after = (await (await get('/api/admin/resources/products', { headers: auth() })).json()) as {
      items: Array<{ name: string }>
    }
    assert.equal(after.items.length, seedProducts.length)
    assert.deepEqual(after.items.map((p) => p.name), seedProducts.map((p) => p.name))
  })

  it('POST /reset（scope=all）→ 200；非法 scope → 400', async () => {
    const ok = await get('/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ scope: 'all' }),
    })
    assert.equal(ok.status, 200)

    const bad = await get('/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ scope: 'nope' }),
    })
    assert.equal(bad.status, 400)
  })
})
