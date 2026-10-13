/**
 * 结构化数据集合存储测试：seed 生成 + 前后台单一数据源 + 持久化 + 重置。
 *
 * 零外部依赖 —— Node 内置 test runner + 全局 fetch，在临时端口启动真实 Express 应用。
 * 通过 `DB_PATH` 指向临时 SQLite 库实现存储隔离（阶段 5a），避免污染仓库 data/ 目录。
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
import {
  buildCollectionSeed,
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  initCollections,
  listCollection,
  resetCollection,
  updateCollectionItem,
} from '../src/data/collectionStore'
import { getDb } from '../src/data/db'

/** 隔离的临时目录 + 独立 SQLite 库（每个测试进程独立） */
const tmpDir = path.join(os.tmpdir(), `gh-collection-store-${process.pid}`)
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
/** 旧 JSON 路径指向不存在的临时文件，避免迁移仓库 data/ 目录 */
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')

let server: Server
let base: string
let token: string

before(async () => {
  rmSync(tmpDir, { recursive: true, force: true })
  // 生成 seed 并落库
  initCollections()

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
/** 读取落库集合（断言持久化） */
const diskStore = (): Record<string, Array<{ id: string }>> => {
  const rows = getDb().prepare('SELECT key, data FROM collections').all() as Array<{ key: string; data: string }>
  const out: Record<string, Array<{ id: string }>> = {}
  for (const row of rows) (out[row.key] ??= []).push(JSON.parse(row.data))
  return out
}

describe('结构化数据集合存储（单一数据源 / 持久化 / 重置）', () => {
  it('seed 生成后 listCollection(products) 非空且数量与 seed 一致', () => {
    const seed = buildCollectionSeed()
    const products = listCollection('products')
    assert.ok(products.length > 0, '产品集合应非空')
    assert.equal(products.length, seed.products.length, '产品数量应与 seed 一致')
    assert.equal(products.length, 8, 'seed 产品应为 8 条')
    // 每个集合都应有记录且均带稳定 id
    for (const key of ['products', 'rankings', 'articles', 'downloads', 'faqs', 'biz-content', 'biz-cases', 'biz-venues', 'inquiries'] as const) {
      const items = listCollection(key)
      assert.ok(items.length > 0, `${key} 集合应非空`)
      for (const item of items) assert.equal(typeof item.id, 'string', `${key} 每条记录应含字符串 id`)
    }
  })

  it('后台 PUT 更新产品 → 前台 /api/products 立即反映（证明单一数据源）', async () => {
    const first = listCollection('products')[0]
    const id = first.id
    const updatedName = `${first.name} · 已改`

    const res = await get(`/api/admin/resources/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ name: updatedName }),
    })
    assert.equal(res.status, 200, '后台更新应成功')
    const { item } = (await res.json()) as { item: { id: string; name: string } }
    assert.equal(item.id, id)
    assert.equal(item.name, updatedName)

    // 前台读端点即时反映
    const pub = (await (await get('/api/products')).json()) as { items: Array<{ id: string; name: string }> }
    const hit = pub.items.find((entry) => entry.id === id)
    assert.ok(hit, '前台应能找到该产品')
    assert.equal(hit.name, updatedName, '前台应读到后台更新后的名称')
  })

  it('新建 / 删除落盘后重新 initCollections()（模拟重启）仍生效', () => {
    const created = createCollectionItem('faqs', { q: '临时：如何重置？', a: '调用集合存储的 resetCollection。', category: '下载与安装' })
    assert.ok(created.id, '新建记录应有 id')

    // 落盘断言
    const onDisk = diskStore().faqs.some((row) => row.id === created.id)
    assert.ok(onDisk, '新建记录应已落盘')

    // 模拟重启：重新从磁盘加载
    initCollections()
    assert.ok(getCollectionItem('faqs', created.id), '新建记录应在重新初始化后仍存在')

    const ok = deleteCollectionItem('faqs', created.id)
    assert.equal(ok, true, '删除应命中')
    initCollections()
    assert.equal(getCollectionItem('faqs', created.id), undefined, '删除记录应在重新初始化后消失')
    assert.ok(!diskStore().faqs.some((row) => row.id === created.id), '删除应已落盘')
  })

  it('resetCollection 恢复 seed', () => {
    const id = listCollection('products')[0].id
    updateCollectionItem('products', id, { name: '被改坏的名字' })
    assert.equal(getCollectionItem('products', id)?.name, '被改坏的名字')

    resetCollection('products')
    assert.deepEqual(listCollection('products'), buildCollectionSeed().products, '重置后应与 seed 完全一致')
  })

  it('后台列表返回 { items, total }，且与前台同源（数量一致）', async () => {
    const res = await get('/api/admin/resources/rankings', { headers: auth() })
    assert.equal(res.status, 200)
    const body = (await res.json()) as { items: unknown[]; total: number }
    assert.equal(body.total, body.items.length)
    assert.equal(body.items.length, listCollection('rankings').length)

    const pub = (await (await get('/api/ladder')).json()) as { metrics: unknown[] }
    assert.equal(pub.metrics.length, body.items.length)
  })

  it('models 集合 seed 非空、数量与 MODEL_SUPPORTS 一致，且每条形状合规', () => {
    const seed = buildCollectionSeed()
    const models = listCollection('models')
    assert.ok(models.length > 0, '型号支持集合应非空')
    assert.equal(models.length, seed.models.length, '型号数量应与 seed 一致')
    assert.equal(models.length, 4, 'seed 型号应为 4 条')
    for (const item of models) {
      assert.equal(typeof item.id, 'string', '每条型号记录应含字符串 id')
      assert.ok(item.model, '每条型号记录应含 model')
      assert.ok(item.line, '每条型号记录应含 line')
      assert.ok(item.summary, '每条型号记录应含 summary')
      assert.ok(Array.isArray(item.downloads), '型号记录应含 downloads 数组')
      assert.ok(Array.isArray(item.faqs), '型号记录应含 faqs 数组')
      assert.ok(Array.isArray(item.guides), '型号记录应含 guides 数组')
    }
  })

  it('前台 /api/support/model/:id 返回记录与 seed 逐字一致', async () => {
    const target = buildCollectionSeed().models.find((item) => item.id === 'gh-p400')
    assert.ok(target, 'seed 应含 gh-p400')
    const pub = (await (await get('/api/support/model/gh-p400')).json()) as unknown
    assert.deepEqual(pub, target, '响应应与 seed 记录逐字一致')
  })

  it('/api/support/model/:id 未命中 → 404', async () => {
    const res = await get('/api/support/model/__nope__')
    assert.equal(res.status, 404)
    const body = (await res.json()) as { error?: string }
    assert.ok(body.error, '未命中应返回 error 字段')
  })

  it('后台 PUT 更新型号支持 → 前台 /api/support/model/:id 立即反映（单一数据源）', async () => {
    const first = listCollection('models')[0]
    const id = first.id
    const updatedSummary = `${first.summary}（已改）`

    const res = await get(`/api/admin/resources/models/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ summary: updatedSummary }),
    })
    assert.equal(res.status, 200, '后台更新型号应成功')
    const { item } = (await res.json()) as { item: { id: string; summary: string } }
    assert.equal(item.id, id)
    assert.equal(item.summary, updatedSummary)

    // 前台读端点即时反映
    const pub = (await (await get(`/api/support/model/${id}`)).json()) as { id: string; summary: string }
    assert.equal(pub.id, id)
    assert.equal(pub.summary, updatedSummary, '前台应读到后台更新后的型号摘要')
  })

  it('POST /api/inquiry 落库 contact/model/message，后台「咨询工单」可见（契约 §11.2）', async () => {
    const res = await get('/api/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '测试用户',
        contact: 'tester@example.com',
        model: 'GH-M900 PRO',
        topic: '连接问题',
        message: '无法完成配对',
      }),
    })
    assert.equal(res.status, 200, '前台提交咨询应成功')
    const { ticketId } = (await res.json()) as { ticketId: string }
    assert.ok(ticketId, '应返回 ticketId')

    const admin = await get('/api/admin/resources/inquiries', { headers: auth() })
    assert.equal(admin.status, 200)
    const { items } = (await admin.json()) as { items: Array<Record<string, unknown>> }
    const hit = items.find((item) => item.id === ticketId)
    assert.ok(hit, '后台列表应能看到新提交的工单')
    assert.equal(hit.contact, 'tester@example.com', '联系方式应持久化')
    assert.equal(hit.model, 'GH-M900 PRO', '型号应持久化')
    assert.equal(hit.message, '无法完成配对', '问题描述应持久化')

    // seed 记录同样补齐三字段（形状向后兼容）
    const seed = buildCollectionSeed().inquiries[0]
    assert.equal(typeof seed.contact, 'string')
    assert.equal(typeof seed.model, 'string')
    assert.equal(typeof seed.message, 'string')
  })

  it('模板集合：从页面快照创建 → 列表可见 → 删除生效（契约 §11 扩展）', async () => {
    const home = (await (await get('/api/content/pages/home')).json()) as { page: { blocks: unknown[] } }

    const created = await get('/api/admin/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ name: '首页模板', scope: '营销页', pageKey: 'home' }),
    })
    assert.equal(created.status, 201, '新建模板应成功')
    const { template } = (await created.json()) as {
      template: { id: string; name: string; scope: string; blockCount: number; blocks: unknown[]; createdAt: string }
    }
    assert.equal(template.name, '首页模板')
    assert.equal(template.scope, '营销页')
    assert.equal(template.blockCount, home.page.blocks.length, 'blockCount 应与页面区块数一致')
    assert.equal(template.blocks.length, home.page.blocks.length, '快照 blocks 应与页面区块一致')
    assert.ok(!Number.isNaN(Date.parse(template.createdAt)), 'createdAt 应为 ISO 时间')

    const list = (await (await get('/api/admin/templates', { headers: auth() })).json()) as {
      items: Array<{ id: string }>
      total: number
    }
    assert.ok(list.items.some((item) => item.id === template.id), '列表应含新建模板')
    assert.equal(list.total, list.items.length)

    const removed = await get(`/api/admin/templates/${template.id}`, { method: 'DELETE', headers: auth() })
    assert.equal(removed.status, 200)
    const after = (await (await get('/api/admin/templates', { headers: auth() })).json()) as { items: Array<{ id: string }> }
    assert.ok(!after.items.some((item) => item.id === template.id), '删除后列表不应再含该模板')

    const miss = await get('/api/admin/templates/__nope__', { method: 'DELETE', headers: auth() })
    assert.equal(miss.status, 404, '删除未命中应 404')
  })
})
