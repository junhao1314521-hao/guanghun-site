/**
 * 后台 · 会员管理接口测试。
 *
 * 覆盖：真实 users 列表与脱敏、搜索 / 状态筛选、冻结后拒绝登录并作废会话、
 * 解冻恢复登录、重置密码（临时密码可用 / 旧密码失效）、强制下线、明文联系方式接口权限。
 *
 * 隔离：DB_PATH 指向临时 SQLite 库，在随机端口启动真实 Express 应用。
 */
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'

const tmpDir = path.join(os.tmpdir(), `gh-members-${process.pid}`)
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

/** 从 Set-Cookie 提取指定 Cookie 的 `name=value` */
function cookieOf(res: Response, name: string): string {
  const setCookie = res.headers.get('set-cookie') ?? ''
  const match = new RegExp(`${name}=([^;]+)`).exec(setCookie)
  assert.ok(match, `响应应下发 ${name} Cookie`)
  return `${name}=${match[1]}`
}

type MemberItem = {
  id: string
  username: string
  name: string
  email: string
  phone: string
  status: string
  sessionCount: number
  deviceCount: number
}

type MemberListBody = { items: MemberItem[]; total: number; page: number; pageSize: number }

describe('后台会员管理 · 真实账号 / 脱敏 / 状态 / 会话', () => {
  let adminCookie = ''
  let memberCookie = ''
  let memberId = ''

  before(async () => {
    const admin = await post('/api/admin/auth/login', { username: 'admin', password: 'admin123' })
    assert.equal(admin.status, 200)
    adminCookie = cookieOf(admin, 'gh_admin')

    const reg = await post('/api/auth/register', {
      username: 'member-one',
      email: 'member.one@example.com',
      password: 'pass1234',
    })
    assert.equal(reg.status, 201)
    memberCookie = cookieOf(reg, 'gh_user')
    await put('/api/account/settings', { name: '张会员', phone: '13800138000' }, memberCookie)
  })

  it('登录后台后可从真实 users 表查到会员，联系方式默认脱敏', async () => {
    const res = await get('/api/admin/members?page=1&pageSize=20', adminCookie)
    assert.equal(res.status, 200)
    const body = (await res.json()) as MemberListBody
    assert.equal(body.total, 1)
    const item = body.items[0]
    assert.equal(item.username, 'member-one')
    assert.equal(item.name, '张会员')
    assert.equal(item.status, 'active')
    assert.equal(item.deviceCount, 0)
    memberId = item.id
    // 脱敏：不回传明文邮箱 / 手机号
    assert.notEqual(item.email, 'member.one@example.com')
    assert.match(item.email, /\*\*\*/)
    assert.notEqual(item.phone, '13800138000')
    assert.match(item.phone, /\*/)
  })

  it('搜索命中用户名，未命中关键词返回空列表', async () => {
    const hit = (await (await get('/api/admin/members?q=member-one', adminCookie)).json()) as MemberListBody
    assert.equal(hit.total, 1)
    const miss = (await (await get('/api/admin/members?q=no-such-user', adminCookie)).json()) as MemberListBody
    assert.equal(miss.total, 0)
  })

  it('冻结后会员无法登录，原有会话立即失效', async () => {
    const freeze = await post(`/api/admin/members/${memberId}/status`, { status: 'frozen' }, adminCookie)
    assert.equal(freeze.status, 200)
    assert.equal(((await freeze.json()) as { item: MemberItem }).item.status, 'frozen')

    // 原 gh_user 会话已被作废
    assert.equal((await get('/api/auth/me', memberCookie)).status, 401)

    // 正确密码也被拒绝（403 frozen）
    const login = await post('/api/auth/login', { username: 'member-one', password: 'pass1234' })
    assert.equal(login.status, 403)

    const filtered = (await (await get('/api/admin/members?status=frozen', adminCookie)).json()) as MemberListBody
    assert.equal(filtered.total, 1)
  })

  it('解冻后可重新登录', async () => {
    const unfreeze = await post(`/api/admin/members/${memberId}/status`, { status: 'active' }, adminCookie)
    assert.equal(unfreeze.status, 200)
    const login = await post('/api/auth/login', { username: 'member-one', password: 'pass1234' })
    assert.equal(login.status, 200)
    memberCookie = cookieOf(login, 'gh_user')
  })

  it('重置密码返回一次性临时密码：新密码可登录、旧密码失效', async () => {
    const reset = await post(`/api/admin/members/${memberId}/reset-password`, {}, adminCookie)
    assert.equal(reset.status, 200)
    const { tempPassword } = (await reset.json()) as { tempPassword: string }
    assert.ok(tempPassword.length >= 8)

    assert.equal((await post('/api/auth/login', { username: 'member-one', password: 'pass1234' })).status, 401)
    const relogin = await post('/api/auth/login', { username: 'member-one', password: tempPassword })
    assert.equal(relogin.status, 200)
    memberCookie = cookieOf(relogin, 'gh_user')
  })

  it('强制下线作废全部会话', async () => {
    const detail = (await (await get(`/api/admin/members/${memberId}`, adminCookie)).json()) as { item: { sessionCount: number } }
    assert.equal(detail.item.sessionCount, 1)

    const res = await post(`/api/admin/members/${memberId}/logout`, {}, adminCookie)
    assert.equal(res.status, 200)
    assert.equal((await get('/api/auth/me', memberCookie)).status, 401)
  })

  it('明文联系方式接口返回完整值，未登录 / 前台身份不可访问', async () => {
    const res = await get(`/api/admin/members/${memberId}/contact`, adminCookie)
    assert.equal(res.status, 200)
    const body = (await res.json()) as { email: string; phone: string }
    assert.equal(body.email, 'member.one@example.com')
    assert.equal(body.phone, '13800138000')

    assert.equal((await get(`/api/admin/members/${memberId}/contact`)).status, 401)
    assert.equal((await get(`/api/admin/members/${memberId}/contact`, memberCookie)).status, 401)
  })

  it('会员运营：保存标签与内部备注，并可按标签筛选', async () => {
    const saved = await put(`/api/admin/members/${memberId}/ops`, { tags: ['VIP', '高价值'], note: '已电话沟通' }, adminCookie)
    assert.equal(saved.status, 200)
    const savedItem = (await saved.json()) as { item: { tags: string[]; note: string } }
    assert.deepEqual(savedItem.item.tags, ['VIP', '高价值'])
    assert.equal(savedItem.item.note, '已电话沟通')

    const hit = (await (await get('/api/admin/members?tag=VIP', adminCookie)).json()) as MemberListBody
    assert.equal(hit.total, 1)
    const miss = (await (await get('/api/admin/members?tag=不存在', adminCookie)).json()) as MemberListBody
    assert.equal(miss.total, 0)

    const tags = (await (await get('/api/admin/members-tags', adminCookie)).json()) as { items: string[] }
    assert.ok(tags.items.includes('VIP'))

    const detail = (await (await get(`/api/admin/members/${memberId}`, adminCookie)).json()) as {
      item: { tags: string[]; note: string }
    }
    assert.deepEqual(detail.item.tags, ['VIP', '高价值'])
    assert.equal(detail.item.note, '已电话沟通')
  })

  it('不存在的会员返回 404', async () => {
    const res = await get('/api/admin/members/u-not-found', adminCookie)
    assert.equal(res.status, 404)
  })
})
