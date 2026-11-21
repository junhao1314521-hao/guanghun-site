/**
 * 下载资料型号约束测试：手填错误型号 id 必须在写入前被拒绝，避免固件 / 说明书挂到别的型号。
 *
 * 隔离：临时 SQLite；临时端口启动真实 Express 应用。
 * 运行：npm test
 */
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import type { Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'

const dbDir = path.join(os.tmpdir(), `gh-downloads-models-db-${process.pid}`)
process.env.DB_PATH = path.join(dbDir, 'gh.sqlite')
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `gh-downloads-models-uploads-${process.pid}`)
process.env.CONTENT_STORE_PATH = path.join(dbDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(dbDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(dbDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(dbDir, 'legacy-audit-log.json')

let server: Server
let base = ''
let token = ''

const jsonAuth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` })

before(async () => {
  rmSync(dbDir, { recursive: true, force: true })
  server = createApp().listen(0)
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const addr = server.address()
  assert.ok(addr && typeof addr === 'object')
  base = `http://127.0.0.1:${addr.port}`
  const res = await fetch(`${base}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  })
  assert.equal(res.status, 200)
  token = ((await res.json()) as { token: string }).token
})

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  rmSync(dbDir, { recursive: true, force: true })
})

describe('下载资料适用型号校验', () => {
  it('拒绝不存在的型号 id', async () => {
    const res = await fetch(`${base}/api/admin/resources/downloads`, {
      method: 'POST',
      headers: jsonAuth(),
      body: JSON.stringify({ name: '测试固件', models: ['gh-not-exist'] }),
    })
    assert.equal(res.status, 422)
    const body = (await res.json()) as { error: string }
    assert.match(body.error, /适用型号不存在/)
  })

  it('接受型号库中的真实 id，且前台只在对应型号下出现', async () => {
    const modelsRes = await fetch(`${base}/api/admin/resources/models`, { headers: jsonAuth() })
    assert.equal(modelsRes.status, 200)
    const { items } = (await modelsRes.json()) as { items: Array<{ id: string; model?: string }> }
    assert.ok(items.length > 0, '型号库应有种子数据')
    const modelId = items[0].id

    const createRes = await fetch(`${base}/api/admin/resources/downloads`, {
      method: 'POST',
      headers: jsonAuth(),
      body: JSON.stringify({ name: '测试固件', models: [modelId], category: 'firmware' }),
    })
    assert.equal(createRes.status, 201, JSON.stringify(await createRes.clone().json()))
    const { item } = (await createRes.json()) as { item: { id: string } }

    const list = await fetch(`${base}/api/downloads`)
    assert.equal(list.status, 200)
    const data = (await list.json()) as { items: Array<{ id: string; models?: string[] }> }
    const created = data.items.find((row) => row.id === item.id)
    assert.ok(created, '资料应出现在下载中心')
    assert.ok(created.models?.includes(modelId), '资料应只关联所选型号')

    await fetch(`${base}/api/admin/resources/downloads/${encodeURIComponent(item.id)}`, {
      method: 'DELETE',
      headers: jsonAuth(),
    })
  })
})
