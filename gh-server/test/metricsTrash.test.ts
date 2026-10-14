/**
 * 数据分析真实化 + 回收站软删除测试。
 *
 * 覆盖：公开埋点（/api/track/*）→ 四个 scope 返回真实且随上报变化的数字；
 * 集合记录软删除 → 前台不再返回 → 回收站可见 → 恢复 → 彻底删除；id 占用冲突 409；审计落库；RBAC。
 *
 * 隔离：DB_PATH 指向临时 SQLite 库；临时端口启动真实 Express 应用。
 * 运行：npm test
 */
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import type { Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'

const tmpDir = path.join(os.tmpdir(), `gh-metrics-trash-${process.pid}`)
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')

/** 分析响应形状 */
type Analytics = {
  title: string
  desc: string
  summary: Array<{ key: string; label: string; value: number; delta: string; trend: 'up' | 'down' }>
  series: Array<{ label: string; value: number }>
  tableTitle: string
  columns: string[]
  rows: Array<Array<string | number>>
}

type TrashList = {
  items: Array<{ id: string; key: string; recordId: string; name: string; deletedAt: string; deletedBy: string }>
  total: number
}

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
const jsonAuth = (token: string) => ({ 'Content-Type': 'application/json', ...auth(token) })

const track = (kind: 'view' | 'download', body: Record<string, unknown>) =>
  get(`/api/track/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

const analytics = async (scope: string): Promise<Analytics> => {
  const res = await get(`/api/admin/analytics/${scope}`, { headers: auth(adminToken) })
  assert.equal(res.status, 200, `${scope} 应 200`)
  return (await res.json()) as Analytics
}

const summaryValue = (data: Analytics, key: string): number => data.summary.find((s) => s.key === key)?.value ?? -1

describe('数据分析：公开埋点 → 真实统计（traffic / downloads）', () => {
  it('初始无埋点：traffic 与 downloads 均为 0（不编造）', async () => {
    const traffic = await analytics('traffic')
    assert.equal(summaryValue(traffic, 'pv'), 0)
    const downloads = await analytics('downloads')
    assert.equal(summaryValue(downloads, 'total'), 0)
    assert.ok(Array.isArray(traffic.series) && traffic.series.length === 7, '近 7 日序列应存在')
  })

  it('上报 view 后 traffic 的 PV / 今日浏览 / 热门页面随之变化', async () => {
    for (let i = 0; i < 3; i += 1) {
      const res = await track('view', { path: '/products/gh-54027x1qe' })
      assert.equal(res.status, 200)
    }
    await track('view', { path: '/' })

    const traffic = await analytics('traffic')
    assert.equal(summaryValue(traffic, 'pv'), 4, 'PV 应等于上报次数')
    assert.equal(summaryValue(traffic, 'today'), 4, '今日浏览应为 4')
    assert.equal(summaryValue(traffic, 'pages'), 2, '覆盖页面应为 2 个不同路径')
    // 热门页面 TOP：/products/gh-54027x1qe 出现 3 次
    const topRow = traffic.rows.find((row) => row[0] === '/products/gh-54027x1qe')
    assert.ok(topRow, '热门页面应含该路径')
    assert.equal(topRow[1], 3)
    // 当日序列之和 = 今日浏览
    assert.equal(summaryValue(traffic, 'hot'), 3)
  })

  it('上报 download 后 downloads 的点击量与明细随之变化（映射为资料名称）', async () => {
    for (let i = 0; i < 2; i += 1) await track('download', { id: 'gh-54027x1qe-firmware' })

    const downloads = await analytics('downloads')
    assert.equal(summaryValue(downloads, 'total'), 2)
    assert.equal(summaryValue(downloads, 'today'), 2)
    assert.equal(summaryValue(downloads, 'items'), 1, '仅 1 个不同资料被点击')
    const row = downloads.rows.find((r) => r[0] === '54027X1QE-W54 固件升级包')
    assert.ok(row, '下载明细应把 id 映射为资料名称')
    assert.equal(row[1], 2)
  })

  it('products / content 为集合真实计数（非写死）', async () => {
    const products = await analytics('products')
    assert.equal(summaryValue(products, 'products'), 8, 'seed 产品应为 8 条')
    assert.ok(summaryValue(products, 'reviews') > 0, '评测文章数应 > 0')
    assert.ok(summaryValue(products, 'views') >= 3, '产品页浏览应包含上面上报的 3 次')

    const content = await analytics('content')
    assert.ok(summaryValue(content, 'articles') > 0, '文章总数应 > 0')
    assert.ok(summaryValue(content, 'categories') > 0)
    assert.ok(content.series.length > 0, '按分类计数序列应非空')
  })

  it('埋点输入校验：非法 path / id → 400', async () => {
    assert.equal((await track('view', { path: 'no-slash' })).status, 400)
    assert.equal((await track('download', {})).status, 400)
  })

  it('未知 scope → 404', async () => {
    const res = await get('/api/admin/analytics/__nope__', { headers: auth(adminToken) })
    assert.equal(res.status, 404)
  })
})

describe('回收站：软删除 / 恢复 / 彻底删除（集合记录 + 前台联动）', () => {
  it('删除集合记录 → 前台不再返回，回收站可见；恢复后前台恢复', async () => {
    const before = (await (await get('/api/products')).json()) as { items: Array<{ id: string }> }
    const targetId = before.items[0].id

    const del = await get(`/api/admin/resources/products/${targetId}`, { method: 'DELETE', headers: auth(adminToken) })
    assert.equal(del.status, 200)

    // 前台不再返回
    const after = (await (await get('/api/products')).json()) as { items: Array<{ id: string }> }
    assert.ok(!after.items.some((item) => item.id === targetId), '前台不应再含已删除记录')

    // 回收站可见
    const trash = (await (await get('/api/admin/resources/trash', { headers: auth(adminToken) })).json()) as TrashList
    const entry = trash.items.find((item) => item.key === 'products' && item.recordId === targetId)
    assert.ok(entry, '回收站应含该记录')
    assert.equal(entry.deletedBy, 'admin')
    assert.ok(!Number.isNaN(Date.parse(entry.deletedAt)))

    // 恢复
    const restore = await get(`/api/admin/resources/trash/${entry.id}/restore`, {
      method: 'POST',
      headers: auth(adminToken),
    })
    assert.equal(restore.status, 200)
    const restored = (await (await get('/api/products')).json()) as { items: Array<{ id: string }> }
    assert.ok(restored.items.some((item) => item.id === targetId), '恢复后前台应重新可见')
    assert.equal(
      ((await (await get('/api/admin/resources/trash', { headers: auth(adminToken) })).json()) as TrashList).items.find(
        (item) => item.id === entry.id,
      ),
      undefined,
    )
  })

  it('恢复时原 id 被占用 → 409（不覆盖）', async () => {
    const targetId = 'gh-28027x1qe'
    assert.equal(
      (await get(`/api/admin/resources/products/${targetId}`, { method: 'DELETE', headers: auth(adminToken) })).status,
      200,
    )
    // 用相同 id 新建一条占位记录
    const recreated = await get('/api/admin/resources/products', {
      method: 'POST',
      headers: jsonAuth(adminToken),
      body: JSON.stringify({ id: targetId, model: 'GH-K870', name: '重占位' }),
    })
    assert.equal(recreated.status, 201)

    const trash = (await (await get('/api/admin/resources/trash', { headers: auth(adminToken) })).json()) as TrashList
    const entry = trash.items.find((item) => item.key === 'products' && item.recordId === targetId)
    assert.ok(entry)
    const restore = await get(`/api/admin/resources/trash/${entry.id}/restore`, {
      method: 'POST',
      headers: auth(adminToken),
    })
    assert.equal(restore.status, 409, '原 id 被占用应拒绝恢复')

    // 清理：彻底删除该回收站条目
    assert.equal(
      (await get(`/api/admin/resources/trash/${entry.id}`, { method: 'DELETE', headers: auth(adminToken) })).status,
      200,
    )
  })

  it('彻底删除 → 回收站不再含该条目', async () => {
    const targetId = 'gh-32x1ue'
    await get(`/api/admin/resources/products/${targetId}`, { method: 'DELETE', headers: auth(adminToken) })
    let trash = (await (await get('/api/admin/resources/trash', { headers: auth(adminToken) })).json()) as TrashList
    const entry = trash.items.find((item) => item.key === 'products' && item.recordId === targetId)
    assert.ok(entry)

    const purge = await get(`/api/admin/resources/trash/${entry.id}`, { method: 'DELETE', headers: auth(adminToken) })
    assert.equal(purge.status, 200)
    trash = (await (await get('/api/admin/resources/trash', { headers: auth(adminToken) })).json()) as TrashList
    assert.ok(!trash.items.some((item) => item.id === entry.id), '彻底删除后回收站不应再含该条目')

    // 未命中 → 404
    assert.equal(
      (await get(`/api/admin/resources/trash/${entry.id}`, { method: 'DELETE', headers: auth(adminToken) })).status,
      404,
    )
  })

  it('软删除 / 恢复 / 彻底删除均写审计', async () => {
    const targetId = 'gh-27x1u'
    await get(`/api/admin/resources/products/${targetId}`, { method: 'DELETE', headers: auth(adminToken) })
    let trash = (await (await get('/api/admin/resources/trash', { headers: auth(adminToken) })).json()) as TrashList
    const entry = trash.items.find((item) => item.key === 'products' && item.recordId === targetId)
    assert.ok(entry)
    await get(`/api/admin/resources/trash/${entry.id}/restore`, { method: 'POST', headers: auth(adminToken) })
    await get(`/api/admin/resources/products/${targetId}`, { method: 'DELETE', headers: auth(adminToken) })
    trash = (await (await get('/api/admin/resources/trash', { headers: auth(adminToken) })).json()) as TrashList
    const entry2 = trash.items.find((item) => item.key === 'products' && item.recordId === targetId)
    assert.ok(entry2)
    await get(`/api/admin/resources/trash/${entry2.id}`, { method: 'DELETE', headers: auth(adminToken) })

    const logs = (await (await get('/api/admin/resources/logs', { headers: auth(adminToken) })).json()) as {
      items: Array<{ action: string; target: string }>
    }
    const actions = logs.items.map((l) => l.action)
    assert.ok(actions.includes('delete'), '应含软删除审计')
    assert.ok(actions.includes('restore'), '应含恢复审计')
    assert.ok(actions.includes('purge'), '应含彻底删除审计')
  })

  it('回收站 RBAC：operator → 403，admin → 200；未登录 → 401', async () => {
    assert.equal((await get('/api/admin/resources/trash', { headers: auth(operatorToken) })).status, 403)
    assert.equal((await get('/api/admin/resources/trash', { headers: auth(adminToken) })).status, 200)
    assert.equal((await get('/api/admin/resources/trash')).status, 401)
  })
})
