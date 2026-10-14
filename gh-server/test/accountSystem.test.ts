/**
 * 前台会员账号体系测试（阶段 5）：注册 / 登录 / 会话 Cookie / 找回密码 / 按用户隔离 + 与后台隔离。
 *
 * 隔离：DB_PATH 指向临时 SQLite 库，旧 JSON 路径指向不存在文件，在临时端口启动真实 Express 应用。
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

const tmpDir = path.join(os.tmpdir(), `gh-account-${process.pid}`)
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')

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

/** 从响应 Set-Cookie 中提取 `gh_user=<token>`（供后续请求作为 Cookie 使用） */
function userCookie(res: Response): string {
  const setCookie = res.headers.get('set-cookie') ?? ''
  const match = /gh_user=([^;]+)/.exec(setCookie)
  assert.ok(match, '响应应下发 gh_user Cookie')
  return `gh_user=${match[1]}`
}

describe('前台账号体系 · 注册 / 登录 / 会话', () => {
  let cookie = ''

  it('注册 → 201 且下发 gh_user Cookie（HttpOnly + SameSite=Lax）', async () => {
    const res = await post('/api/auth/register', { username: 'alice', email: 'alice@example.com', password: 'pass1234' })
    assert.equal(res.status, 201)
    const setCookie = res.headers.get('set-cookie') ?? ''
    assert.match(setCookie, /gh_user=/)
    assert.match(setCookie, /HttpOnly/i)
    assert.match(setCookie, /SameSite=Lax/i)
    const body = (await res.json()) as { user: { username: string; email: string } }
    assert.equal(body.user.username, 'alice')
    assert.equal(body.user.email, 'alice@example.com')
    cookie = userCookie(res)
  })

  it('密码不以明文落库（users 表仅存 salt + hash）', () => {
    const rows = getDb().prepare('SELECT username, salt, hash FROM users').all() as Array<{ salt: string; hash: string }>
    assert.ok(rows.length >= 1)
    for (const row of rows) {
      assert.ok(row.salt.length > 0 && row.hash.length > 0)
      assert.ok(!row.hash.includes('pass1234'), '哈希列不应包含明文')
    }
    const cols = (getDb().prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>).map((c) => c.name)
    assert.ok(!cols.includes('password'), 'users 不应存在明文 password 列')
  })

  it('仅用 Cookie GET /api/auth/me → 200', async () => {
    const res = await get('/api/auth/me', cookie)
    assert.equal(res.status, 200)
    const body = (await res.json()) as { user: { username: string } }
    assert.equal(body.user.username, 'alice')
  })

  it('无 Cookie GET /api/auth/me → 401', async () => {
    assert.equal((await get('/api/auth/me')).status, 401)
  })

  it('登出清除 Cookie，之后 /auth/me → 401', async () => {
    const res = await post('/api/auth/logout', {}, cookie)
    assert.equal(res.status, 200)
    assert.match(res.headers.get('set-cookie') ?? '', /gh_user=;/)
    assert.equal((await get('/api/auth/me', cookie)).status, 401)
  })

  it('重复注册同名 / 同邮箱被拒（409）', async () => {
    const sameName = await post('/api/auth/register', { username: 'alice', email: 'other@example.com', password: 'pass1234' })
    assert.equal(sameName.status, 409)
    const sameEmail = await post('/api/auth/register', { username: 'alice2', email: 'alice@example.com', password: 'pass1234' })
    assert.equal(sameEmail.status, 409)
  })

  it('弱密码 → 400', async () => {
    const res = await post('/api/auth/register', { username: 'weakling', email: 'weak@example.com', password: 'abcdef' })
    assert.equal(res.status, 400)
  })

  it('错误密码登录 → 401；正确密码登录 → 200', async () => {
    assert.equal((await post('/api/auth/login', { username: 'alice', password: 'wrong' })).status, 401)
    const ok = await post('/api/auth/login', { username: 'alice', password: 'pass1234' })
    assert.equal(ok.status, 200)
    cookie = userCookie(ok)
  })

  it('找回密码：forgot 拿令牌 → reset 改密 → 新密码登录成功、旧密码失败', async () => {
    const forgot = await post('/api/auth/forgot', { email: 'alice@example.com' })
    assert.equal(forgot.status, 200)
    const { devToken } = (await forgot.json()) as { devToken?: string }
    assert.ok(devToken, '开发环境应直出重置令牌')

    const reset = await post('/api/auth/reset', { token: devToken, password: 'newpass99' })
    assert.equal(reset.status, 200)
    // 令牌一次性：再次使用失败
    assert.equal((await post('/api/auth/reset', { token: devToken, password: 'another99' })).status, 400)

    assert.equal((await post('/api/auth/login', { username: 'alice', password: 'pass1234' })).status, 401)
    const relogin = await post('/api/auth/login', { username: 'alice', password: 'newpass99' })
    assert.equal(relogin.status, 200)
    cookie = userCookie(relogin)
  })

  it('修改密码后原会话失效（需重新登录）', async () => {
    const res = await post('/api/auth/password', { currentPassword: 'newpass99', newPassword: 'fresh123' }, cookie)
    assert.equal(res.status, 200)
    assert.equal((await get('/api/auth/me', cookie)).status, 401, '改密应作废全部会话')
    const relogin = await post('/api/auth/login', { username: 'alice', password: 'fresh123' })
    assert.equal(relogin.status, 200)
    cookie = userCookie(relogin)
  })
})

describe('前台账号体系 · 个人中心按用户隔离', () => {
  let cookieA = ''
  let cookieB = ''

  before(async () => {
    const a = await post('/api/auth/register', { username: 'userA', email: 'a@example.com', password: 'pass1234' })
    cookieA = userCookie(a)
    const b = await post('/api/auth/register', { username: 'userB', email: 'b@example.com', password: 'pass1234' })
    cookieB = userCookie(b)
  })

  it('未登录访问 /api/account/devices → 401', async () => {
    assert.equal((await get('/api/account/devices')).status, 401)
  })

  it('两个用户的 devices 互不可见（序列号按用户区分）', async () => {
    const da = (await (await get('/api/account/devices', cookieA)).json()) as { items: Array<{ sn: string }> }
    const db = (await (await get('/api/account/devices', cookieB)).json()) as { items: Array<{ sn: string }> }
    assert.ok(da.items[0].sn.includes('USERA'))
    assert.ok(db.items[0].sn.includes('USERB'))
    assert.notEqual(da.items[0].sn, db.items[0].sn)
  })

  it('两个用户的 notifications 互不可见（A 改动不影响 B）', async () => {
    const before = (await (await get('/api/account/notifications', cookieB)).json()) as {
      items: Array<{ id: string; enabled: boolean }>
    }
    const campaignBefore = before.items.find((i) => i.id === 'campaign')?.enabled

    // A 打开「活动通知」
    const items = ((await (await get('/api/account/notifications', cookieA)).json()) as {
      items: Array<{ id: string; enabled: boolean }>
    }).items.map((i) => (i.id === 'campaign' ? { ...i, enabled: true } : i))
    const saved = await put('/api/account/notifications', { items }, cookieA)
    assert.equal(saved.status, 200)

    const aAfter = (await (await get('/api/account/notifications', cookieA)).json()) as {
      items: Array<{ id: string; enabled: boolean }>
    }
    const bAfter = (await (await get('/api/account/notifications', cookieB)).json()) as {
      items: Array<{ id: string; enabled: boolean }>
    }
    assert.equal(aAfter.items.find((i) => i.id === 'campaign')?.enabled, true)
    assert.equal(bAfter.items.find((i) => i.id === 'campaign')?.enabled, campaignBefore, 'B 的通知设置不应受 A 影响')
  })

  it('咨询按用户归属：A 提交的咨询 A 可见、B 不可见', async () => {
    const created = await post(
      '/api/inquiry',
      { name: 'A', contact: 'a@example.com', model: 'GH-M900 PRO', topic: '连接问题', message: '偶发断连' },
      cookieA,
    )
    assert.equal(created.status, 200)
    const { ticketId } = (await created.json()) as { ticketId: string }

    const aList = (await (await get('/api/account/inquiries', cookieA)).json()) as { items: Array<{ id: string }> }
    const bList = (await (await get('/api/account/inquiries', cookieB)).json()) as { items: Array<{ id: string }> }
    assert.ok(aList.items.some((i) => i.id === ticketId), 'A 应看到自己的咨询')
    assert.ok(!bList.items.some((i) => i.id === ticketId), 'B 不应看到 A 的咨询')
    // 越权访问详情 → 404
    assert.equal((await get(`/api/account/inquiries/${ticketId}`, cookieB)).status, 404)
  })

  it('账号设置：更新基本资料后回读一致', async () => {
    const res = await put('/api/account/settings', { name: '甲用户', phone: '13800000000' }, cookieA)
    assert.equal(res.status, 200)
    const back = (await (await get('/api/account/settings', cookieA)).json()) as {
      user: { name: string; phone: string }
    }
    assert.equal(back.user.name, '甲用户')
    assert.equal(back.user.phone, '13800000000')
  })
})

describe('前台账号体系 · 与后台鉴权隔离', () => {
  it('前台 gh_user Cookie 不能访问后台端点；后台仍需 gh_admin', async () => {
    const reg = await post('/api/auth/register', { username: 'frontonly', email: 'front@example.com', password: 'pass1234' })
    const cookie = userCookie(reg)
    // 用前台 Cookie 访问后台 /auth/me → 401（两套会话互不通用）
    assert.equal((await get('/api/admin/auth/me', cookie)).status, 401)
    // 后台自身登录仍可用
    const admin = await post('/api/admin/auth/login', { username: 'admin', password: 'admin123' })
    assert.equal(admin.status, 200)
    assert.match(admin.headers.get('set-cookie') ?? '', /gh_admin=/)
  })
})

describe('前台账号体系 · 个人中心写操作', () => {
  let cookie = ''

  before(async () => {
    const r = await post('/api/auth/register', { username: 'writer', email: 'writer@example.com', password: 'pass1234' })
    cookie = userCookie(r)
  })

  it('登记设备 → 列表可见；重复序列号 → 400；删除 → 列表消失', async () => {
    const add = await post('/api/account/devices', { model: 'GH-K870', sn: 'SN-TEST-001' }, cookie)
    assert.equal(add.status, 201)
    let items = ((await add.json()) as { items: Array<{ sn: string }> }).items
    assert.ok(items.some((d) => d.sn === 'SN-TEST-001'))

    assert.equal((await post('/api/account/devices', { model: 'GH-K870', sn: 'SN-TEST-001' }, cookie)).status, 400)

    const removed = await del('/api/account/devices/SN-TEST-001', cookie)
    assert.equal(removed.status, 200)
    items = ((await removed.json()) as { items: Array<{ sn: string }> }).items
    assert.ok(!items.some((d) => d.sn === 'SN-TEST-001'))
  })

  it('取消收藏后列表减少', async () => {
    const list = (await (await get('/api/account/favorites', cookie)).json()) as { items: Array<{ name: string }> }
    const name = list.items[0].name
    const res = await del(`/api/account/favorites/${encodeURIComponent(name)}`, cookie)
    assert.equal(res.status, 200)
    const after = (await (await get('/api/account/favorites', cookie)).json()) as { items: Array<{ name: string }> }
    assert.ok(!after.items.some((i) => i.name === name))
  })

  it('更换邮箱：冲突 → 400；成功 → 回读一致', async () => {
    await post('/api/auth/register', { username: 'taken', email: 'taken@example.com', password: 'pass1234' })
    assert.equal((await post('/api/account/email', { email: 'taken@example.com' }, cookie)).status, 400)

    const ok = await post('/api/account/email', { email: 'writer2@example.com' }, cookie)
    assert.equal(ok.status, 200)
    const me = (await (await get('/api/account/me', cookie)).json()) as { user: { email: string } }
    assert.equal(me.user.email, 'writer2@example.com')
  })

  it('工单补充回复：本人工单可见；越权 → 404', async () => {
    const created = await post(
      '/api/inquiry',
      { name: 'W', contact: 'writer2@example.com', model: 'GH-M900 PRO', topic: '补充', message: '原始' },
      cookie,
    )
    const { ticketId } = (await created.json()) as { ticketId: string }
    const reply = await post(`/api/account/inquiries/${ticketId}/replies`, { text: '补充说明' }, cookie)
    assert.equal(reply.status, 200)
    const detail = ((await reply.json()) as { detail: { timeline: Array<{ text: string }> } }).detail
    assert.ok(detail.timeline.some((entry) => entry.text === '补充说明'))

    const other = await post('/api/auth/register', { username: 'other2', email: 'other2@example.com', password: 'pass1234' })
    const otherCookie = userCookie(other)
    assert.equal((await post(`/api/account/inquiries/${ticketId}/replies`, { text: '越权' }, otherCookie)).status, 404)
  })

  it('退出指定登录设备：吊销后该会话失效', async () => {
    const second = await post('/api/auth/login', { username: 'writer', password: 'pass1234' })
    const secondCookie = userCookie(second)
    const settings = (await (await get('/api/account/settings', cookie)).json()) as {
      loginDevices: Array<{ token?: string; current?: boolean }>
    }
    const other = settings.loginDevices.find((device) => !device.current)
    assert.ok(other?.token, '应存在非当前会话')
    assert.equal((await del(`/api/account/sessions/${other!.token}`, cookie)).status, 200)
    assert.equal((await get('/api/auth/me', secondCookie)).status, 401)
  })

  it('注销账号：会话失效且无法再登录', async () => {
    const res = await post('/api/account/delete', {}, cookie)
    assert.equal(res.status, 200)
    assert.equal((await get('/api/auth/me', cookie)).status, 401)
    assert.equal((await post('/api/auth/login', { username: 'writer', password: 'pass1234' })).status, 401)
  })
})
