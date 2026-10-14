/**
 * 角色权限模型（RBAC）测试（PRD 阶段 4C）。
 *
 * 隔离：DB_PATH 指向临时 SQLite 库，旧 JSON 路径指向不存在文件；临时端口启动真实 Express 应用。
 *
 * 覆盖：operator 访问越权栏目 → 403；admin → 200；未登录 → 401；
 * 内容类端点 operator 可访问（200）；`/auth/me` 返回 role / roleName / scopes。
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

const tmpDir = path.join(os.tmpdir(), `gh-rbac-${process.pid}`)
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
process.env.BACKUP_DIR = path.join(tmpDir, 'backups')
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')

let server: Server
let base: string
let adminToken = ''
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

describe('阶段 4C · 会话用户角色字段', () => {
  it('GET /auth/me 返回 role / roleName / scopes（admin）', async () => {
    const res = await get('/api/admin/auth/me', { headers: auth(adminToken) })
    assert.equal(res.status, 200)
    const profile = (await res.json()) as { username: string; role: string; roleName: string; scopes: string[] }
    assert.equal(profile.username, 'admin')
    assert.equal(profile.role, 'admin')
    assert.equal(profile.roleName, '超级管理员')
    assert.deepEqual(profile.scopes, ['*'])
  })

  it('GET /auth/me 返回 role / roleName / scopes（operator）', async () => {
    const res = await get('/api/admin/auth/me', { headers: auth(operatorToken) })
    const profile = (await res.json()) as { role: string; roleName: string; scopes: string[] }
    assert.equal(profile.role, 'operator')
    assert.equal(profile.roleName, '内容运营')
    assert.deepEqual(profile.scopes, ['content'])
  })
})

describe('阶段 4C · 按栏目 / 操作鉴权', () => {
  it('系统设置类栏目（roles）：operator → 403，admin → 200', async () => {
    const op = await get('/api/admin/resources/roles', { headers: auth(operatorToken) })
    assert.equal(op.status, 403)
    assert.ok('error' in ((await op.json()) as object))

    const ad = await get('/api/admin/resources/roles', { headers: auth(adminToken) })
    assert.equal(ad.status, 200)
  })

  it('内容类栏目（articles 集合）：operator → 200', async () => {
    const res = await get('/api/admin/resources/articles', { headers: auth(operatorToken) })
    assert.equal(res.status, 200)
  })

  it('内容库 pages：operator → 200（内容权限）', async () => {
    const res = await get('/api/admin/pages', { headers: auth(operatorToken) })
    assert.equal(res.status, 200)
  })

  it('备份端点：operator → 403，admin → 200', async () => {
    const op = await get('/api/admin/backups', { headers: auth(operatorToken) })
    assert.equal(op.status, 403)
    const ad = await get('/api/admin/backups', { headers: auth(adminToken) })
    assert.equal(ad.status, 200)
  })

  it('重置（系统设置）：operator → 403，admin → 200', async () => {
    const op = await get(
      '/api/admin/reset',
      { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth(operatorToken) }, body: JSON.stringify({ scope: 'pages' }) },
    )
    assert.equal(op.status, 403)
    const ad = await get(
      '/api/admin/reset',
      { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth(adminToken) }, body: JSON.stringify({ scope: 'pages' }) },
    )
    assert.equal(ad.status, 200)
  })

  it('未登录：系统设置栏目 → 401、内容库 → 401', async () => {
    assert.equal((await get('/api/admin/resources/roles')).status, 401)
    assert.equal((await get('/api/admin/pages')).status, 401)
  })
})

describe('阶段 4C · 角色 CRUD（/api/admin/roles）', () => {
  it('列表返回内置角色与权限类别', async () => {
    const res = await get('/api/admin/roles', { headers: auth(adminToken) })
    assert.equal(res.status, 200)
    const body = (await res.json()) as { items: Array<{ key: string; builtin: boolean }>; allScopes: string[] }
    assert.ok(body.items.some((role) => role.key === 'admin' && role.builtin))
    assert.ok(body.items.some((role) => role.key === 'operator'))
    assert.deepEqual(body.allScopes, ['content', 'backups', 'publish', 'system'])
  })

  it('operator 无权访问角色端点 → 403', async () => {
    assert.equal((await get('/api/admin/roles', { headers: auth(operatorToken) })).status, 403)
  })

  it('新建 → 编辑 → 删除自定义角色', async () => {
    const created = await fetch(`${base}/api/admin/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth(adminToken) },
      body: JSON.stringify({ key: 'editor', name: '编辑', desc: '测试角色', scopes: ['content'] }),
    })
    assert.equal(created.status, 201)
    const role = ((await created.json()) as { item: { key: string; scopes: string[] } }).item
    assert.equal(role.key, 'editor')

    const updated = await fetch(`${base}/api/admin/roles/editor`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth(adminToken) },
      body: JSON.stringify({ name: '高级编辑', scopes: ['content', 'publish'] }),
    })
    assert.equal(updated.status, 200)
    const ur = (await updated.json()) as { item: { name: string; scopes: string[] } }
    assert.equal(ur.item.name, '高级编辑')
    assert.deepEqual(ur.item.scopes, ['content', 'publish'])

    const del = await fetch(`${base}/api/admin/roles/editor`, { method: 'DELETE', headers: auth(adminToken) })
    assert.equal(del.status, 200)
    assert.equal((await get('/api/admin/roles', { headers: auth(adminToken) })).status, 200)
  })

  it('内置角色不可删除 → 400', async () => {
    const res = await fetch(`${base}/api/admin/roles/admin`, { method: 'DELETE', headers: auth(adminToken) })
    assert.equal(res.status, 400)
  })

  it('admin 角色权限固定为全部（编辑后仍为 *）', async () => {
    const res = await fetch(`${base}/api/admin/roles/admin`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth(adminToken) },
      body: JSON.stringify({ name: '超级管理员', scopes: ['content'] }),
    })
    assert.equal(res.status, 200)
    const body = (await res.json()) as { item: { scopes: string[] } }
    assert.deepEqual(body.item.scopes, ['*'])
  })
})
