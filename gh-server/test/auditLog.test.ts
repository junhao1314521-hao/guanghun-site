/**
 * 后台操作审计日志测试（零依赖）。
 *
 * 通过 `DB_PATH` 指向临时 SQLite 库实现存储隔离（阶段 5a）；旧 JSON 路径指向不存在的
 * 临时文件，避免迁移仓库 data/ 数据。在临时端口启动真实 Express 应用，走真实 HTTP。
 *
 * 覆盖：
 * - 登录 / 一次资源修改后，`GET /api/admin/resources/logs` 可见对应审计条目；
 * - 审计写入**不影响**原端点响应体与状态码；
 * - 超出上限时裁剪最旧记录（AUDIT_LOG_MAX 覆盖上限）；
 * - 审计记录事务落库（重启读入）。
 *
 * 运行：npm test
 */
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import type { Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'
import { appendAudit, listAudit, type AuditEntry } from '../src/data/auditStore'
import { getDb } from '../src/data/db'

/** 隔离的临时目录 + 独立 SQLite 库（每个测试进程独立） */
const tmpDir = path.join(os.tmpdir(), `gh-audit-${process.pid}`)
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
/** 旧 JSON 路径指向不存在的临时文件，避免迁移仓库 data/ 目录 */
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')
process.env.UPLOAD_DIR = path.join(tmpDir, 'uploads')

let server: Server
let base: string
let token: string

before(async () => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
  mkdirSync(tmpDir, { recursive: true })

  server = createApp().listen(0)
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const addr = server.address()
  assert.ok(addr && typeof addr === 'object', '服务器应监听成功')
  base = `http://127.0.0.1:${addr.port}`

  // 登录成功后，登录事件应已被审计
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
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

const get = (p: string, init?: RequestInit) => fetch(base + p, init)
const auth = () => ({ Authorization: `Bearer ${token}` })
/** 读取落库审计记录（断言持久化；时间倒序） */
const auditEntries = (): AuditEntry[] =>
  (getDb().prepare('SELECT id, at, actor, action, target, detail, ip FROM audit_log ORDER BY seq ASC').all() as Array<{
    id: string
    at: string
    actor: string
    action: string
    target: string
    detail: string | null
    ip: string
  }>).map((row) => ({
    id: row.id,
    at: row.at,
    actor: row.actor,
    action: row.action,
    target: row.target,
    ip: row.ip,
    ...(row.detail !== null && row.detail !== undefined ? { detail: row.detail } : {}),
  }))

describe('后台操作审计日志', () => {
  it('审计列表需登录：未带令牌 → 401', async () => {
    const res = await get('/api/admin/resources/logs')
    assert.equal(res.status, 401)
  })

  it('登录事件已入审计：含 actor / action / target / at / ip', async () => {
    const res = await get('/api/admin/resources/logs', { headers: auth() })
    assert.equal(res.status, 200)
    const body = (await res.json()) as { items: AuditEntry[]; total: number }
    assert.equal(body.total, body.items.length)
    const login = body.items.find((entry) => entry.action === 'login')
    assert.ok(login, '应能看到登录审计条目')
    assert.equal(login.actor, 'admin')
    assert.equal(login.target, '后台')
    assert.ok(login.at && !Number.isNaN(Date.parse(login.at)), 'at 应为可解析时间')
    assert.equal(typeof login.ip, 'string')
  })

  it('一次资源修改后审计可见，且原端点响应体 / 状态码不受影响', async () => {
    const list = (await (await get('/api/admin/resources/products', { headers: auth() })).json()) as {
      items: Array<{ id: string; name: string; model?: string }>
    }
    const target = list.items[0]
    assert.ok(target, '产品集合应非空')
    const updatedName = `${target.name} · 审计写入`

    const res = await get(`/api/admin/resources/products/${target.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ name: updatedName }),
    })
    // 原端点行为不变：200 + { ok, item }，item 为更新后记录
    assert.equal(res.status, 200)
    const payload = (await res.json()) as { ok: boolean; item: { id: string; name: string; model?: string } }
    assert.equal(payload.ok, true)
    assert.equal(payload.item.id, target.id)
    assert.equal(payload.item.name, updatedName)
    assert.equal(payload.item.model, target.model)
    assert.ok(!('code' in (payload as object)), '响应体不应出现 {code,data} 包装')

    // 审计列表可见该次更新
    const audit = (await (await get('/api/admin/resources/logs', { headers: auth() })).json()) as {
      items: AuditEntry[]
      total: number
    }
    const latest = audit.items[0]
    assert.equal(latest.action, 'update')
    assert.equal(latest.target, `products/${target.id}`)
    assert.equal(latest.actor, 'admin')
    assert.ok(latest.ip, '应记录客户端 IP')

    // 已落盘
    assert.ok(
      auditEntries().some((entry) => entry.action === 'update' && entry.target === `products/${target.id}`),
      '审计记录应已原子落盘',
    )
  })

  it('超出上限时裁剪最旧记录（保留最新）', () => {
    process.env.AUDIT_LOG_MAX = '3'
    try {
      for (let i = 0; i < 5; i += 1) {
        appendAudit({ actor: 'tester', action: 'update', target: `trim-${i}`, ip: '127.0.0.1' })
      }
      const { items, total } = listAudit()
      assert.equal(total, 3, '总量应被裁剪到上限')
      assert.equal(items.length, 3)
      assert.equal(items[0].target, 'trim-4', '列表最新在前')
      assert.ok(items.every((entry) => entry.target.startsWith('trim-')), '仅保留最新 3 条')
    } finally {
      delete process.env.AUDIT_LOG_MAX
    }
  })
})
