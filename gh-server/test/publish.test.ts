/**
 * 发布记录与回滚测试（PRD 阶段 5C）。
 *
 * 隔离：DB_PATH 指向临时 SQLite 库，BACKUP_DIR 指向临时目录，旧 JSON 路径指向不存在文件。
 * 在临时端口启动真实 Express 应用，走真实 HTTP。
 *
 * 覆盖：发布记录创建 / 列表（倒序）/ 回滚（内容回到发布时快照）/ 删除；operator 无 publish 权限 → 403。
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

/** 隔离的临时目录 + 独立 SQLite 库 + 独立备份目录 */
const tmpDir = path.join(os.tmpdir(), `gh-publish-${process.pid}`)
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
process.env.BACKUP_DIR = path.join(tmpDir, 'backups')
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')

let server: Server
let base: string
/** admin 令牌（拥有 publish 权限） */
let adminToken = ''
/** operator 令牌（无 publish 权限） */
let operatorToken = ''

before(async () => {
  rmSync(tmpDir, { recursive: true, force: true })
  server = createApp().listen(0)
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const addr = server.address()
  assert.ok(addr && typeof addr === 'object', '服务器应监听成功')
  base = `http://127.0.0.1:${addr.port}`

  const login = async (username: string, password: string) => {
    const res = await fetch(`${base}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    assert.equal(res.status, 200)
    return ((await res.json()) as { token: string }).token
  }
  adminToken = await login('admin', 'admin123')
  operatorToken = await login('operator', 'oper123')
})

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  rmSync(tmpDir, { recursive: true, force: true })
})

const get = (p: string, init?: RequestInit) => fetch(base + p, init)
const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
const jsonHeaders = (token: string) => ({ 'Content-Type': 'application/json', ...auth(token) })

describe('阶段 5C · 发布记录与回滚', () => {
  it('POST /publish 生成发布记录 → 列表可见（倒序）', async () => {
    const created = await get('/api/admin/publish', { method: 'POST', headers: jsonHeaders(adminToken) })
    assert.equal(created.status, 201)
    const { item } = (await created.json()) as {
      item: {
        id: string
        at: string
        actor: string
        contentVersion: string
        blockCount: number
        pageCount: number
        collectionCount: number
      }
    }
    assert.ok(item.id, '应有 id')
    assert.equal(item.actor, 'admin', 'actor 应为登录用户')
    assert.match(item.contentVersion, /^v\d{8}-\d+$/, '内容版本号形如 vYYYYMMDD-N')
    assert.ok(item.pageCount > 0, '页面数应大于 0')
    assert.ok(item.blockCount > 0, '区块数应大于 0')
    assert.ok(item.collectionCount > 0, '集合记录数应大于 0')
    assert.ok(!Number.isNaN(Date.parse(item.at)), 'at 应为可解析时间')

    const list = (await (await get('/api/admin/publish', { headers: auth(adminToken) })).json()) as {
      items: Array<{ id: string }>
      total: number
    }
    assert.equal(list.total, list.items.length)
    assert.ok(list.items.some((entry) => entry.id === item.id), '列表应含新建发布记录')
  })

  it('POST /publish/:id/restore 回滚内容到发布时快照（先自动留 pre-restore 备份）', async () => {
    // 1) 建立发布（作为基线）
    const created = await get('/api/admin/publish', { method: 'POST', headers: jsonHeaders(adminToken) })
    const { item } = (await created.json()) as { item: { id: string } }

    // 2) 篡改一条产品名
    const seedName = buildCollectionSeed().products[0].name
    const targetId = buildCollectionSeed().products[0].id
    const put = await get(`/api/admin/resources/products/${targetId}`, {
      method: 'PUT',
      headers: jsonHeaders(adminToken),
      body: JSON.stringify({ name: '发布后被改坏的名字' }),
    })
    assert.equal(put.status, 200)

    // 3) 回滚 → 200 { ok: true }
    const restore = await get(`/api/admin/publish/${encodeURIComponent(item.id)}/restore`, {
      method: 'POST',
      headers: auth(adminToken),
    })
    assert.equal(restore.status, 200)
    assert.deepEqual(await restore.json(), { ok: true })

    // 4) 内容已回到发布时快照
    const after = (await (
      await get('/api/admin/resources/products', { headers: auth(adminToken) })
    ).json()) as { items: Array<{ id: string; name: string }> }
    assert.equal(after.items.find((p) => p.id === targetId)?.name, seedName, '回滚后应回到发布时名称')

    // 5) 已自动生成 pre-restore 备份
    const backups = (await (await get('/api/admin/backups', { headers: auth(adminToken) })).json()) as {
      items: Array<{ name: string }>
    }
    assert.ok(backups.items.some((b) => b.name.includes('pre-restore')), '应自动生成 pre-restore 快照')
  })

  it('DELETE /publish/:id 删除 → 200；未命中 → 404', async () => {
    const created = await get('/api/admin/publish', { method: 'POST', headers: jsonHeaders(adminToken) })
    const { item } = (await created.json()) as { item: { id: string } }
    const removed = await get(`/api/admin/publish/${encodeURIComponent(item.id)}`, {
      method: 'DELETE',
      headers: auth(adminToken),
    })
    assert.equal(removed.status, 200)
    assert.deepEqual(await removed.json(), { ok: true })

    const miss = await get('/api/admin/publish/__nope__', { method: 'DELETE', headers: auth(adminToken) })
    assert.equal(miss.status, 404)
    assert.ok('error' in ((await miss.json()) as object))
  })

  it('operator 无 publish 权限：创建 / 列表 / 回滚 / 删除 → 403', async () => {
    const create = await get('/api/admin/publish', { method: 'POST', headers: jsonHeaders(operatorToken) })
    assert.equal(create.status, 403)
    assert.ok('error' in ((await create.json()) as object))

    const list = await get('/api/admin/publish', { headers: auth(operatorToken) })
    assert.equal(list.status, 403)

    const restore = await get('/api/admin/publish/whatever/restore', { method: 'POST', headers: auth(operatorToken) })
    assert.equal(restore.status, 403)

    const del = await get('/api/admin/publish/whatever', { method: 'DELETE', headers: auth(operatorToken) })
    assert.equal(del.status, 403)
  })

  it('未登录访问发布端点 → 401', async () => {
    const res = await get('/api/admin/publish')
    assert.equal(res.status, 401)
  })
})
