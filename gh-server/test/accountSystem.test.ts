/**
 * 前台会员账号体系测试（阶段 5）：注册 / 登录 / 会话 Cookie / 找回密码 / 按用户隔离 + 与后台隔离。
 *
 * 隔离：DB_PATH 指向临时 SQLite 库，旧 JSON 路径指向不存在文件，在临时端口启动真实 Express 应用。
 * 运行：npm test
 */
import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'
import { getDb } from '../src/data/db'
import { purgeExpiredAnonymizedData } from '../src/data/accountRetention'

const tmpDir = path.join(os.tmpdir(), `gh-account-${process.pid}`)
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')
process.env.UPLOAD_DIR = path.join(tmpDir, 'uploads')

/** 1×1 PNG：设备登记凭证的最小合法载荷 */
const RECEIPT =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

/** 与 RECEIPT 字节不同的合法凭证：用于构造「认领凭证与原记录不一致」的冒领场景 */
const RECEIPT_OTHER = 'data:image/png;base64,QUJDRA=='

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

  it('新注册账号的收藏为空（不预置用户从未收藏的演示型号）', async () => {
    const res = await get('/api/account/favorites', cookie)
    assert.equal(res.status, 200)
    const body = (await res.json()) as { items: unknown[] }
    assert.equal(body.items.length, 0, '收藏必须由用户自己产生，注册时不应预置')
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

  it('两个用户的 devices 互不可见（新账号不预置设备）', async () => {
    const a = (await (await get('/api/account/devices', cookieA)).json()) as { items: unknown[] }
    const b = (await (await get('/api/account/devices', cookieB)).json()) as { items: unknown[] }
    assert.equal(a.items.length, 0, '注册后不应再预置演示设备')
    assert.equal(b.items.length, 0)

    const addA = await post(
      '/api/account/devices',
      { model: 'GH-A', sn: 'SN-ISO-A', purchasedAt: '2025-01-01', receipt: RECEIPT },
      cookieA,
    )
    assert.equal(addA.status, 201)
    const addB = await post(
      '/api/account/devices',
      { model: 'GH-B', sn: 'SN-ISO-B', purchasedAt: '2025-01-01', receipt: RECEIPT },
      cookieB,
    )
    assert.equal(addB.status, 201)

    const da = (await (await get('/api/account/devices', cookieA)).json()) as { items: Array<{ sn: string }> }
    const db = (await (await get('/api/account/devices', cookieB)).json()) as { items: Array<{ sn: string }> }
    assert.ok(da.items.some((item) => item.sn === 'SN-ISO-A'))
    assert.ok(!da.items.some((item) => item.sn === 'SN-ISO-B'))
    assert.ok(db.items.some((item) => item.sn === 'SN-ISO-B'))
    assert.ok(!db.items.some((item) => item.sn === 'SN-ISO-A'))
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
  /** 第二个账号：验证序列号跨账号唯一 */
  let otherCookie = ''

  before(async () => {
    const r = await post('/api/auth/register', { username: 'writer', email: 'writer@example.com', password: 'pass1234' })
    cookie = userCookie(r)
  })

  it('登记设备 → 待审核；保修 36 个月；重复序列号（含跨账号）→ 409；删除 → 列表消失', async () => {
    const add = await post(
      '/api/account/devices',
      { model: 'GH-K870', sn: 'SN-TEST-001', purchasedAt: '2025-01-15', channel: '官方商城', receipt: RECEIPT },
      cookie,
    )
    assert.equal(add.status, 201)
    let items = ((await add.json()) as { items: Array<{ id: string; sn: string; status: string; warrantyEnd: string; remainingDays: number }> }).items
    const created = items.find((d) => d.sn === 'SN-TEST-001')
    assert.ok(created, '列表应包含新登记设备')
    assert.equal(created.status, 'pending')
    assert.equal(created.warrantyEnd, '2028-01-15', '保修到期 = 购买日期 + 36 个月')
    assert.ok(created.remainingDays > 0)

    // 同账号重复登记 → 409
    assert.equal(
      (await post('/api/account/devices', { model: 'GH-K870', sn: 'SN-TEST-001', purchasedAt: '2025-01-15', receipt: RECEIPT }, cookie)).status,
      409,
    )

    // 跨账号重复登记 → 409（SN 全局唯一）
    const other = await post('/api/auth/register', { username: 'writerb', email: 'writerb@example.com', password: 'pass1234' })
    otherCookie = userCookie(other)
    assert.equal(
      (await post('/api/account/devices', { model: 'GH-K870', sn: 'SN-TEST-001', purchasedAt: '2025-01-15', receipt: RECEIPT }, otherCookie)).status,
      409,
    )

    const removed = await del(`/api/account/devices/${created.id}`, cookie)
    assert.equal(removed.status, 200)
    items = ((await removed.json()) as { items: Array<{ sn: string }> }).items
    assert.ok(!items.some((d) => d.sn === 'SN-TEST-001'))
  })

  it('后台审核：通过后在保且用户不可删除；驳回需填原因并释放序列号', async () => {
    const admin = await post('/api/admin/auth/login', { username: 'admin', password: 'admin123' })
    assert.equal(admin.status, 200)
    const adminCookie = (admin.headers.get('set-cookie') ?? '').split(';')[0]
    assert.match(adminCookie, /gh_admin=/)

    // 通过流程
    const addA = await post(
      '/api/account/devices',
      { model: 'GH-K870', sn: 'SN-REVIEW-OK', purchasedAt: '2024-06-01', receipt: RECEIPT },
      cookie,
    )
    assert.equal(addA.status, 201)
    const okItem = ((await addA.json()) as { items: Array<{ id: string; sn: string }> }).items.find((d) => d.sn === 'SN-REVIEW-OK')
    assert.ok(okItem)

    const approved = await post(`/api/admin/device-registrations/${okItem.id}/review`, { action: 'approve' }, adminCookie)
    assert.equal(approved.status, 200)
    const approvedItem = ((await approved.json()) as { item: { status: string; statusText: string; warrantyEnd: string } }).item
    assert.equal(approvedItem.status, 'active')
    assert.equal(approvedItem.statusText, '在保')
    assert.equal(approvedItem.warrantyEnd, '2027-06-01')

    // 已通过 → 用户不可删除
    assert.equal((await del(`/api/account/devices/${okItem.id}`, cookie)).status, 400)
    // 重复审核 → 400
    assert.equal(
      (await post(`/api/admin/device-registrations/${okItem.id}/review`, { action: 'approve' }, adminCookie)).status,
      400,
    )

    // 驳回流程：缺原因 → 400；填原因 → 成功，且 SN 可被他人重新登记
    const addB = await post(
      '/api/account/devices',
      { model: 'GH-K870', sn: 'SN-REVIEW-NO', purchasedAt: '2024-06-01', receipt: RECEIPT },
      otherCookie,
    )
    assert.equal(addB.status, 201)
    const noItem = ((await addB.json()) as { items: Array<{ id: string; sn: string }> }).items.find((d) => d.sn === 'SN-REVIEW-NO')
    assert.ok(noItem)

    assert.equal(
      (await post(`/api/admin/device-registrations/${noItem.id}/review`, { action: 'reject' }, adminCookie)).status,
      400,
    )
    const rejected = await post(
      `/api/admin/device-registrations/${noItem.id}/review`,
      { action: 'reject', reason: '凭证模糊' },
      adminCookie,
    )
    assert.equal(rejected.status, 200)
    const rejectedItem = ((await rejected.json()) as { item: { status: string; rejectReason: string } }).item
    assert.equal(rejectedItem.status, 'rejected')
    assert.equal(rejectedItem.rejectReason, '凭证模糊')

    // 驳回后序列号释放（其他账号可重新登记）
    assert.equal(
      (
        await post(
          '/api/account/devices',
          { model: 'GH-K870', sn: 'SN-REVIEW-NO', purchasedAt: '2024-06-01', receipt: RECEIPT },
          cookie,
        )
      ).status,
      201,
    )
  })

  it('新增收藏后列表包含该项（按名称去重）', async () => {
    const res = await post('/api/account/favorites', { name: 'GH-TEST 收藏项', spec: '测试 · ¥1' }, cookie)
    assert.equal(res.status, 201)
    const items = ((await res.json()) as { items: Array<{ name: string }> }).items
    assert.ok(items.some((item) => item.name === 'GH-TEST 收藏项'))
    // 重复新增不产生重复项
    const again = await post('/api/account/favorites', { name: 'GH-TEST 收藏项' }, cookie)
    const items2 = ((await again.json()) as { items: Array<{ name: string }> }).items
    assert.equal(items2.filter((item) => item.name === 'GH-TEST 收藏项').length, 1)
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
    // 时间线只能来自真实记录：初始只有会员自己的一条提交，不虚构客服 / 内部备注
    const initial = ((await (await get(`/api/account/inquiries/${ticketId}`, cookie)).json()) as {
      timeline: Array<{ kind: string; text: string }>
    }).timeline
    assert.equal(initial.length, 1)
    assert.equal(initial[0].kind, 'customer')
    assert.ok(initial[0].text.includes('原始'))
    const reply = await post(`/api/account/inquiries/${ticketId}/replies`, { text: '补充说明' }, cookie)
    assert.equal(reply.status, 200)
    const detail = ((await reply.json()) as { detail: { timeline: Array<{ kind: string; text: string }> } }).detail
    assert.equal(detail.timeline.length, 2, '回复后只应在真实提交条目之后追加一条')
    assert.ok(detail.timeline.some((entry) => entry.text === '补充说明'))
    assert.ok(!detail.timeline.some((entry) => entry.text.includes('已按指引导出日志')))

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

describe('注销数据生命周期 · 去标识化保留 / SN 认领 / 到期清理', () => {
  /** 注册一个独立账号并返回 Cookie */
  const registerUser = async (username: string) => {
    const res = await post('/api/auth/register', {
      username,
      email: `${username}@example.com`,
      password: 'pass1234',
    })
    assert.equal(res.status, 201)
    return userCookie(res)
  }

  const adminCookie = async () => {
    const res = await post('/api/admin/auth/login', { username: 'admin', password: 'admin123' })
    assert.equal(res.status, 200)
    return (res.headers.get('set-cookie') ?? '').split(';')[0]
  }

  it('注销：立即删除账号与凭证文件；工单/设备去标识化保留且后台不可再审', async () => {
    const lifeCookie = await registerUser('lifecycle')
    const admin = await adminCookie()

    const inquiry = await post(
      '/api/inquiry',
      { name: '生命周期', contact: 'life@example.com', model: 'GH-K870', topic: '保修咨询', message: '屏幕闪烁' },
      lifeCookie,
    )
    assert.equal(inquiry.status, 200)
    const { ticketId } = (await inquiry.json()) as { ticketId: string }

    const device = await post(
      '/api/account/devices',
      { model: 'GH-K870', sn: 'SN-LIFE-001', purchasedAt: '2024-06-01', receipt: RECEIPT },
      lifeCookie,
    )
    assert.equal(device.status, 201)
    const item = ((await device.json()) as { items: Array<{ id: string; sn: string; status: string }> }).items.find(
      (d) => d.sn === 'SN-LIFE-001',
    )
    assert.ok(item)
    assert.equal((await post(`/api/admin/device-registrations/${item.id}/review`, { action: 'approve' }, admin)).status, 200)

    // 注销前记录凭证文件真实存在
    const receiptUrl = (
      getDb().prepare('SELECT receipt_url FROM device_registrations WHERE sn = ?').get('SN-LIFE-001') as {
        receipt_url: string
      }
    ).receipt_url
    const receiptFile = path.join(tmpDir, 'uploads', path.basename(receiptUrl))
    assert.ok(existsSync(receiptFile), '注销前凭证文件应存在')

    assert.equal((await post('/api/account/delete', {}, lifeCookie)).status, 200)

    // 账号侧：会话失效、后台会员列表不再出现
    assert.equal((await get('/api/auth/me', lifeCookie)).status, 401)
    const members = (await (await get('/api/admin/members?q=lifecycle', admin)).json()) as { total: number }
    assert.equal(members.total, 0, '注销后后台会员列表不应再出现该账号')

    // 工单侧：联系方式与归属被清除，售后正文与处理记录保留
    const inquiryRow = getDb().prepare("SELECT data FROM collections WHERE key = 'inquiries' AND id = ?").get(ticketId) as
      | { data: string }
      | undefined
    assert.ok(inquiryRow, '注销不应删除售后工单')
    const stored = JSON.parse(inquiryRow.data) as Record<string, unknown>
    assert.equal(stored.userId, undefined, 'userId 应被清除')
    assert.equal(stored.contact, undefined, 'contact 应被清除')
    assert.equal(stored.name, undefined, 'name 应被清除')
    assert.match(String(stored.title), /^已注销用户/, 'title 应改为匿名标题')
    assert.equal(stored.tag, '已注销')
    assert.equal(typeof stored.anonymizedAt, 'string')

    // 设备侧：解绑账号、凭证地址与文件清除、保留 SN 与保修信息
    const deviceRow = getDb()
      .prepare('SELECT user_id, receipt_url, anonymized_at, purchased_at FROM device_registrations WHERE sn = ?')
      .get('SN-LIFE-001') as { user_id: string; receipt_url: string; anonymized_at: string; purchased_at: string }
    assert.match(deviceRow.user_id, /^deleted:/, 'user_id 应替换为不可逆匿名标记')
    assert.equal(deviceRow.receipt_url, '', '凭证地址应清空')
    assert.equal(typeof deviceRow.anonymized_at, 'string')
    assert.equal(deviceRow.purchased_at, '2024-06-01', '保修信息应保留')
    assert.ok(!existsSync(receiptFile), '凭证文件应被删除')

    // 后台设备列表：展示已注销且不再提供审核入口（接口层拒绝）
    const adminList = (await (await get('/api/admin/device-registrations', admin)).json()) as {
      items: Array<{ sn: string; username: string; anonymized: boolean; receiptUrl: string }>
    }
    const listed = adminList.items.find((d) => d.sn === 'SN-LIFE-001')
    assert.ok(listed)
    assert.equal(listed.anonymized, true)
    assert.equal(listed.username, '（账号已注销）')
    assert.equal(listed.receiptUrl, '')
    assert.equal((await post(`/api/admin/device-registrations/${item.id}/review`, { action: 'approve' }, admin)).status, 400)

    // 注销留痕不含联系方式
    const audit = getDb()
      .prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'account-deleted'")
      .get() as { n: number }
    assert.ok(audit.n >= 1, '注销应写审计日志')

    // 新账号认领同一 SN：沿用原保修信息，凭证重新审核
    const claimant = await registerUser('claimant')
    const claim = await post(
      '/api/account/devices',
      { model: 'GH-K870', sn: 'SN-LIFE-001', purchasedAt: '2026-01-01', receipt: RECEIPT },
      claimant,
    )
    assert.equal(claim.status, 201, '已注销记录应允许新账号认领同一 SN')
    const claimed = ((await claim.json()) as { items: Array<{ id: string; sn: string; status: string; warrantyEnd: string }> }).items.find(
      (d) => d.sn === 'SN-LIFE-001',
    )
    assert.ok(claimed)
    assert.equal(claimed.status, 'pending', '认领后需重新审核')
    assert.equal(claimed.warrantyEnd, '2027-06-01', '保修到期应沿用原购买日期')
    const afterClaim = getDb()
      .prepare('SELECT user_id, anonymized_at, receipt_url FROM device_registrations WHERE sn = ?')
      .get('SN-LIFE-001') as { user_id: string; anonymized_at: string | null; receipt_url: string }
    assert.doesNotMatch(afterClaim.user_id, /^deleted:/, '认领后应绑定新账号')
    assert.equal(afterClaim.anonymized_at, null)
    assert.ok(afterClaim.receipt_url.startsWith('/uploads/'), '认领后应保存新凭证')

    // 到期清理：24 个月内的工单保留，超期后删除
    const purge = (now: Date) => purgeExpiredAnonymizedData(now)
    assert.equal(purge(new Date()).inquiries, 0, '未超期的已注销工单不应删除')
    getDb()
      .prepare("UPDATE collections SET data = ? WHERE key = 'inquiries' AND id = ?")
      .run(JSON.stringify({ ...stored, anonymizedAt: '2022-01-01T00:00:00.000Z' }), ticketId)
    assert.equal(purge(new Date()).inquiries, 1, '超过 24 个月的已注销工单应删除')
    assert.equal(
      (getDb().prepare("SELECT COUNT(*) AS n FROM collections WHERE key = 'inquiries' AND id = ?").get(ticketId) as { n: number }).n,
      0,
    )

    // 到期清理：保修结束 + 6 个月内的设备保留，超期后删除并释放 SN
    const claimId = claimed.id
    getDb().prepare('UPDATE device_registrations SET anonymized_at = ? WHERE id = ?').run('2026-01-01T00:00:00.000Z', claimId)
    assert.equal(purge(new Date()).devices, 0, '保修期内的已注销设备不应删除')
    getDb()
      .prepare('UPDATE device_registrations SET purchased_at = ?, anonymized_at = ? WHERE id = ?')
      .run('2020-01-01', '2020-06-01T00:00:00.000Z', claimId)
    assert.equal(purge(new Date()).devices, 1, '超过保修结束 + 6 个月的已注销设备应删除')
    assert.equal(
      (getDb().prepare('SELECT COUNT(*) AS n FROM device_registrations WHERE sn = ?').get('SN-LIFE-001') as { n: number }).n,
      0,
    )
    // SN 已释放：新账号可正常登记（走新建记录而非认领）
    const fresh = await post(
      '/api/account/devices',
      { model: 'GH-K870', sn: 'SN-LIFE-001', purchasedAt: '2026-05-01', receipt: RECEIPT },
      claimant,
    )
    assert.equal(fresh.status, 201)
  })

  it('SN 认领防冒领：凭证指纹比对、不一致需显式确认、驳回还原为可认领', async () => {
    const admin = await adminCookie()

    /** 登记 + 通过 + 注销，留下一条「注销遗留、可被认领」的设备记录 */
    async function seedClaimable(sn: string, username: string): Promise<string> {
      const owner = await registerUser(username)
      const res = await post(
        '/api/account/devices',
        { model: 'GH-K870', sn, purchasedAt: '2024-06-01', receipt: RECEIPT },
        owner,
      )
      assert.equal(res.status, 201)
      const { items } = (await res.json()) as { items: Array<{ id: string }> }
      const deviceId = items[0].id
      assert.equal((await post(`/api/admin/device-registrations/${deviceId}/review`, { action: 'approve' }, admin)).status, 200)
      assert.equal((await post('/api/account/delete', {}, owner)).status, 200)
      return deviceId
    }

    // —— 场景 1：凭证不一致 → 后台标记；未显式确认不得通过；驳回后还原为可认领 ——
    await seedClaimable('SN-CLAIM-001', 'claim-origin-1')
    const stranger = await registerUser('claim-stranger')
    const claim = await post(
      '/api/account/devices',
      { model: 'GH-K870', sn: 'SN-CLAIM-001', purchasedAt: '2024-06-01', receipt: RECEIPT_OTHER },
      stranger,
    )
    assert.equal(claim.status, 201, '已注销记录允许新账号认领')
    const { items: claimedItems } = (await claim.json()) as { items: Array<{ id: string }> }
    const claimedId = claimedItems[0].id

    // 后台可见「认领」及指纹不一致
    const list = (await (await get('/api/admin/device-registrations', admin)).json()) as {
      items: Array<{ id: string; claimed: boolean; claimHashMatch: boolean | null; receiptUrl: string }>
    }
    const hit = list.items.find((d) => d.id === claimedId)
    assert.ok(hit)
    assert.equal(hit.claimed, true, '认领记录应带认领标记')
    assert.equal(hit.claimHashMatch, false, '凭证指纹与原记录不一致应如实标记')

    // 未显式确认 → 拒绝通过（避免误放行冒领）
    const blindApprove = await post(`/api/admin/device-registrations/${claimedId}/review`, { action: 'approve' }, admin)
    assert.equal(blindApprove.status, 400)
    assert.match(((await blindApprove.json()) as { error: string }).error, /不一致/)

    // 认领人不能自行删除认领记录（避免销毁原始凭证证据）
    assert.equal((await del(`/api/account/devices/${claimedId}`, stranger)).status, 400)

    // 驳回 → 还原为「注销遗留」记录：原指纹保留、SN 仍可被真正机主认领
    const claimantReceipt = (
      getDb().prepare('SELECT receipt_url FROM device_registrations WHERE id = ?').get(claimedId) as {
        receipt_url: string
      }
    ).receipt_url
    const claimantFile = path.join(tmpDir, 'uploads', path.basename(claimantReceipt))
    assert.ok(existsSync(claimantFile), '认领凭证应已落盘')
    const rejected = await post(
      `/api/admin/device-registrations/${claimedId}/review`,
      { action: 'reject', reason: '凭证与原记录不一致' },
      admin,
    )
    assert.equal(rejected.status, 200)
    const restored = (
      getDb()
        .prepare('SELECT user_id, status, anonymized_at, receipt_url, receipt_sha256, claimed_at FROM device_registrations WHERE id = ?')
        .get(claimedId) as {
        user_id: string
        status: string
        anonymized_at: string | null
        receipt_url: string
        receipt_sha256: string | null
        claimed_at: string | null
      }
    )
    assert.match(restored.user_id, /^deleted:/, '驳回后应还原为注销遗留归属')
    assert.equal(restored.status, 'active', '应还原原审核状态')
    assert.equal(typeof restored.anonymized_at, 'string')
    assert.equal(restored.receipt_url, '', '认领凭证地址应清空')
    assert.equal(restored.claimed_at, null)
    assert.ok(restored.receipt_sha256, '原凭证指纹应保留，供真正机主再次认领时比对')
    assert.ok(!existsSync(claimantFile), '冒领凭证文件应被清理')

    // 真正机主（同凭证）重新认领：指纹一致，审核可直接通过
    const owner2 = await registerUser('claim-owner2')
    const reclaim = await post(
      '/api/account/devices',
      { model: 'GH-K870', sn: 'SN-CLAIM-001', purchasedAt: '2024-06-01', receipt: RECEIPT },
      owner2,
    )
    assert.equal(reclaim.status, 201)
    const { items: reclaimItems } = (await reclaim.json()) as { items: Array<{ id: string }> }
    const reclaimId = reclaimItems[0].id
    const list2 = (await (await get('/api/admin/device-registrations', admin)).json()) as {
      items: Array<{ id: string; claimHashMatch: boolean | null }>
    }
    assert.equal(list2.items.find((d) => d.id === reclaimId)?.claimHashMatch, true, '同凭证认领指纹应一致')
    assert.equal((await post(`/api/admin/device-registrations/${reclaimId}/review`, { action: 'approve' }, admin)).status, 200)

    // —— 场景 2：凭证不一致但管理员核对后显式确认，可通过 ——
    await seedClaimable('SN-CLAIM-002', 'claim-origin-2')
    const stranger2 = await registerUser('claim-stranger2')
    const claim2 = await post(
      '/api/account/devices',
      { model: 'GH-K870', sn: 'SN-CLAIM-002', purchasedAt: '2024-06-01', receipt: RECEIPT_OTHER },
      stranger2,
    )
    assert.equal(claim2.status, 201)
    const { items: claimed2 } = (await claim2.json()) as { items: Array<{ id: string }> }
    assert.equal(
      (await post(`/api/admin/device-registrations/${claimed2[0].id}/review`, { action: 'approve' }, admin)).status,
      400,
    )
    const confirmed = await post(
      `/api/admin/device-registrations/${claimed2[0].id}/review`,
      { action: 'approve', confirmMismatch: true },
      admin,
    )
    assert.equal(confirmed.status, 200, '管理员显式确认后可通过')
    assert.equal(((await confirmed.json()) as { item: { status: string } }).item.status, 'active')
  })

  it('已注销工单：后台不可回复 / 改状态，会员侧接口不可用', async () => {
    const admin = await adminCookie()
    const cookie = await registerUser('ticket-lock-owner')
    const inquiry = await post(
      '/api/inquiry',
      { name: '锁单', contact: 'lock@example.com', model: 'GH-K870', topic: '保修咨询', message: '侧键失灵' },
      cookie,
    )
    assert.equal(inquiry.status, 200)
    const { ticketId } = (await inquiry.json()) as { ticketId: string }

    // 注销前：后台可更新、会员可补充回复（确认拦截来自注销，而非接口本身不可用）
    assert.equal((await put(`/api/admin/resources/inquiries/${ticketId}`, { tag: '处理中' }, admin)).status, 200)
    assert.equal((await post(`/api/account/inquiries/${ticketId}/replies`, { text: '补充说明' }, cookie)).status, 200)

    assert.equal((await post('/api/account/delete', {}, cookie)).status, 200)

    // 会员侧：会话失效，工单列表与补充回复均不可用
    assert.equal((await get('/api/account/inquiries', cookie)).status, 401, '注销后工单列表不可访问')
    assert.equal(
      (await post(`/api/account/inquiries/${ticketId}/replies`, { text: '再次补充' }, cookie)).status,
      401,
      '注销后工单回复不可用',
    )

    // 后台侧：已注销工单禁止回复 / 状态变更，给出明确文案
    const denied = await put(`/api/admin/resources/inquiries/${ticketId}`, { tag: '已解决' }, admin)
    assert.equal(denied.status, 400, '已注销工单不得后台变更状态')
    assert.match(((await denied.json()) as { error: string }).error, /已注销/)
    const row = JSON.parse(
      (
        getDb().prepare("SELECT data FROM collections WHERE key = 'inquiries' AND id = ?").get(ticketId) as {
          data: string
        }
      ).data,
    ) as { tag: string; anonymizedAt?: string }
    assert.equal(row.tag, '已注销', '被拒绝的更新不应落库')
    assert.equal(typeof row.anonymizedAt, 'string')
  })

  it('SN 认领防冒领：凭证指纹不一致时通过需显式确认，一致时可直接通过', async () => {
    const admin = await adminCookie()
    // 内容不同的合法 PNG 载荷：指纹必然与原始凭证不同
    const OTHER_RECEIPT = `data:image/png;base64,${Buffer.from('guanghun-claim-different-receipt').toString('base64')}`

    /** 登记 → 取记录 id → 注销，返回注销前的凭证指纹 */
    const seedAnonymized = async (ownerName: string, sn: string): Promise<string> => {
      const cookie = await registerUser(ownerName)
      const res = await post(
        '/api/account/devices',
        { model: 'GH-K870', sn, purchasedAt: '2024-06-01', receipt: RECEIPT },
        cookie,
      )
      assert.equal(res.status, 201)
      const fingerprint = (
        getDb().prepare('SELECT receipt_sha256 FROM device_registrations WHERE sn = ?').get(sn) as {
          receipt_sha256: string
        }
      ).receipt_sha256
      assert.match(fingerprint, /^[0-9a-f]{64}$/, '登记时应落原始凭证指纹')
      assert.equal((await post('/api/account/delete', {}, cookie)).status, 200)
      return fingerprint
    }

    /** 认领并返回后台视图 */
    const claim = async (claimantName: string, sn: string, receipt: string) => {
      const cookie = await registerUser(claimantName)
      const res = await post(
        '/api/account/devices',
        { model: 'GH-K870', sn, purchasedAt: '2026-01-01', receipt },
        cookie,
      )
      assert.equal(res.status, 201, '已注销记录应允许认领')
      const items = (
        (await (await get('/api/admin/device-registrations', admin)).json()) as {
          items: Array<{ id: string; sn: string; claimed: boolean; claimHashMatch: boolean | null }>
        }
      ).items
      const item = items.find((d) => d.sn === sn)
      assert.ok(item, '后台应能看到认领记录')
      return item
    }

    // 场景 A：冒领者提交不同凭证 → 指纹不一致，通过必须显式确认
    const originFingerprint = await seedAnonymized('claimguard-owner', 'SN-CLAIM-GUARD')
    const mismatched = await claim('claimguard-stranger', 'SN-CLAIM-GUARD', OTHER_RECEIPT)
    assert.equal(mismatched.claimed, true, '认领记录应带认领标记')
    assert.equal(mismatched.claimHashMatch, false, '不同凭证应判定为指纹不一致')
    // 原始指纹在认领后仍保留（用于审计与后续比对）
    assert.equal(
      (getDb().prepare('SELECT receipt_sha256 FROM device_registrations WHERE sn = ?').get('SN-CLAIM-GUARD') as {
        receipt_sha256: string
      }).receipt_sha256,
      originFingerprint,
    )
    const denied = await post(`/api/admin/device-registrations/${mismatched.id}/review`, { action: 'approve' }, admin)
    assert.equal(denied.status, 400, '指纹不一致时不得直接通过')
    assert.match(((await denied.json()) as { error: string }).error, /不一致/)
    const forced = await post(
      `/api/admin/device-registrations/${mismatched.id}/review`,
      { action: 'approve', confirmMismatch: true },
      admin,
    )
    assert.equal(forced.status, 200, '管理员显式确认后可通过')

    // 场景 B：同一凭证认领 → 指纹一致，可直接通过
    await seedAnonymized('claimguard-owner2', 'SN-CLAIM-SAME')
    const matched = await claim('claimguard-legit', 'SN-CLAIM-SAME', RECEIPT)
    assert.equal(matched.claimed, true)
    assert.equal(matched.claimHashMatch, true, '相同凭证应判定为指纹一致')
    assert.equal(
      (await post(`/api/admin/device-registrations/${matched.id}/review`, { action: 'approve' }, admin)).status,
      200,
      '指纹一致时无需二次确认',
    )
  })
})

describe('找回密码 · 通知通道预留', () => {
  it('生产环境且未配置通道：不回传令牌，回执与已发送一致', async () => {
    const prevNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    delete process.env.NOTIFY_CHANNEL
    delete process.env.NOTIFY_WEBHOOK_URL
    try {
      const res = await post('/api/auth/forgot', { email: 'alice@example.com' })
      assert.equal(res.status, 200)
      const body = (await res.json()) as { ok: boolean; sentTo?: string; devToken?: string }
      assert.equal(body.ok, true)
      assert.equal(body.sentTo, 'alice@example.com')
      assert.equal(body.devToken, undefined, '生产环境不得直出令牌')
    } finally {
      if (prevNodeEnv === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = prevNodeEnv
    }
  })

  it('配置 webhook 后：真实投递（含 Bearer），响应不含令牌', async () => {
    const received: Array<{ auth?: string; body: Record<string, unknown> }> = []
    const hook = createServer((req, res) => {
      let raw = ''
      req.on('data', (chunk) => {
        raw += chunk
      })
      req.on('end', () => {
        received.push({ auth: req.headers.authorization, body: JSON.parse(raw) as Record<string, unknown> })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end('{"ok":true}')
      })
    })
    await new Promise<void>((resolve) => hook.listen(0, '127.0.0.1', () => resolve()))
    const addr = hook.address()
    assert.ok(addr && typeof addr === 'object')
    process.env.NOTIFY_CHANNEL = 'webhook'
    process.env.NOTIFY_WEBHOOK_URL = `http://127.0.0.1:${addr.port}/notify`
    process.env.NOTIFY_WEBHOOK_TOKEN = 'test-token'
    try {
      const res = await post('/api/auth/forgot', { email: 'alice@example.com' })
      assert.equal(res.status, 200)
      const body = (await res.json()) as { devToken?: string }
      assert.equal(body.devToken, undefined, '已接入通道时不得回传令牌')
      assert.equal(received.length, 1, '网关应收到一条通知')
      assert.equal(received[0].auth, 'Bearer test-token')
      assert.equal(received[0].body.purpose, 'password-reset')
      assert.equal(received[0].body.to, 'alice@example.com')
      assert.match(String(received[0].body.text), /[0-9a-f]{48}/, '通知正文应包含 48 位令牌')
    } finally {
      delete process.env.NOTIFY_CHANNEL
      delete process.env.NOTIFY_WEBHOOK_URL
      delete process.env.NOTIFY_WEBHOOK_TOKEN
      await new Promise<void>((resolve) => hook.close(() => resolve()))
    }
  })
})
