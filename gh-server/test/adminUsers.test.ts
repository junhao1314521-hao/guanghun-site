/**
 * 后台 · 成员与权限接口测试（真实 admin_users）。
 *
 * 覆盖：成员列表、新建 / 账号唯一与口令强度、角色更新、登录与会话、
 * 强制下线、重置密码（旧口令失效 / 临时口令可登录）、删除与自我删除保护。
 */
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'

const tmpDir = path.join(os.tmpdir(), `gh-admin-users-${process.pid}`)
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
const get = (p: string, cookie?: string) => fetch(base + p, cookie ? { headers: { Cookie: cookie } } : undefined)
const del = (p: string, cookie?: string) =>
  fetch(base + p, { method: 'DELETE', ...(cookie ? { headers: { Cookie: cookie } } : {}) })

/** 提取 gh_admin Cookie */
function adminCookieOf(res: Response): string {
  const setCookie = res.headers.get('set-cookie') ?? ''
  const match = /gh_admin=([^;]+)/.exec(setCookie)
  assert.ok(match, '响应应下发 gh_admin Cookie')
  return `gh_admin=${match[1]}`
}

type TeamItem = { id: string; username: string; name: string; role: string; scopes: string[]; builtin: boolean; sessionCount: number }

describe('后台成员与权限 · 真实 admin_users', () => {
  let adminCookie = ''
  let createdId = ''
  let memberCookie = ''

  before(async () => {
    const login = await post('/api/admin/auth/login', { username: 'admin', password: 'admin123' })
    assert.equal(login.status, 200)
    adminCookie = adminCookieOf(login)
  })

  it('列表来自真实 admin_users：内置 admin 标记，初始含 admin / operator', async () => {
    const res = await get('/api/admin/admin-users', adminCookie)
    assert.equal(res.status, 200)
    const { items } = (await res.json()) as { items: TeamItem[] }
    assert.ok(items.length >= 2)
    const admin = items.find((item) => item.username === 'admin')
    assert.ok(admin)
    assert.equal(admin?.builtin, true)
    assert.equal(admin?.role, 'admin')
    assert.ok(admin?.scopes.includes('*'))
  })

  it('新建成员：口令强度与账号唯一性校验生效', async () => {
    const weak = await post(
      '/api/admin/admin-users',
      { username: 'qa-staff', name: '验收成员', role: 'operator', password: 'abcdefghij' },
      adminCookie,
    )
    assert.equal(weak.status, 400)

    const created = await post(
      '/api/admin/admin-users',
      { username: 'qa-staff', name: '验收成员', role: 'operator', password: 'QaStaff2026x' },
      adminCookie,
    )
    assert.equal(created.status, 201)
    const { item } = (await created.json()) as { item: TeamItem }
    assert.equal(item.username, 'qa-staff')
    assert.equal(item.role, 'operator')
    assert.ok(item.scopes.includes('content'))
    createdId = item.id

    const duplicate = await post(
      '/api/admin/admin-users',
      { username: 'qa-staff', name: '重复', role: 'operator', password: 'QaStaff2026x' },
      adminCookie,
    )
    assert.equal(duplicate.status, 400)
  })

  it('新成员可登录后台；operator 无系统权限（访问成员管理 403）', async () => {
    const login = await post('/api/admin/auth/login', { username: 'qa-staff', password: 'QaStaff2026x' })
    assert.equal(login.status, 200)
    memberCookie = adminCookieOf(login)

    const me = await get('/api/admin/auth/me', memberCookie)
    assert.equal(me.status, 200)
    assert.equal((await get('/api/admin/admin-users', memberCookie)).status, 403)
  })

  it('更新姓名 / 角色生效', async () => {
    const res = await put(`/api/admin/admin-users/${createdId}`, { name: '验收成员改', role: 'operator' }, adminCookie)
    assert.equal(res.status, 200)
    const { item } = (await res.json()) as { item: TeamItem }
    assert.equal(item.name, '验收成员改')

    // 内置 admin 不可降级
    const adminId = ((await (await get('/api/admin/admin-users', adminCookie)).json()) as { items: TeamItem[] }).items.find(
      (item) => item.username === 'admin',
    )?.id
    const demote = await put(`/api/admin/admin-users/${adminId}`, { role: 'operator' }, adminCookie)
    assert.equal(demote.status, 400)
  })

  it('强制下线作废该成员全部会话', async () => {
    const res = await post(`/api/admin/admin-users/${createdId}/logout`, {}, adminCookie)
    assert.equal(res.status, 200)
    assert.ok(((await res.json()) as { removed: number }).removed >= 1)
    assert.equal((await get('/api/admin/auth/me', memberCookie)).status, 401)
  })

  it('重置密码：旧口令失效，临时口令可登录', async () => {
    const adminLogin = await post('/api/admin/auth/login', { username: 'admin', password: 'admin123' })
    adminCookie = adminCookieOf(adminLogin)

    const reset = await post(`/api/admin/admin-users/${createdId}/reset-password`, {}, adminCookie)
    assert.equal(reset.status, 200)
    const { tempPassword } = (await reset.json()) as { tempPassword: string }
    assert.ok(tempPassword.length >= 10)

    assert.equal((await post('/api/admin/auth/login', { username: 'qa-staff', password: 'QaStaff2026x' })).status, 401)
    const relogin = await post('/api/admin/auth/login', { username: 'qa-staff', password: tempPassword })
    assert.equal(relogin.status, 200)
    memberCookie = adminCookieOf(relogin)
  })

  it('不能删除当前登录账号；可删除普通成员', async () => {
    const me = (await (await get('/api/admin/auth/me', adminCookie)).json()) as { id: string }
    assert.equal((await del(`/api/admin/admin-users/${me.id}`, adminCookie)).status, 400)

    const removed = await del(`/api/admin/admin-users/${createdId}`, adminCookie)
    assert.equal(removed.status, 200)
    const { items } = (await (await get('/api/admin/admin-users', adminCookie)).json()) as { items: TeamItem[] }
    assert.equal(items.some((item) => item.id === createdId), false)
    // 被删成员的会话也已失效
    assert.equal((await get('/api/admin/auth/me', memberCookie)).status, 401)
  })
})
