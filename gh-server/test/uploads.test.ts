/**
 * 后台文件上传 / 素材库测试（零依赖）。
 *
 * 通过 `UPLOAD_DIR` 指向临时目录实现落盘隔离；登录签发内存 token 后按契约调用三个端点。
 * 运行：npm test
 */
import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import type { Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'

/** 隔离的临时上传目录（每个测试进程独立） */
const uploadDir = path.join(os.tmpdir(), `gh-uploads-${process.pid}`)
const dbDir = path.join(os.tmpdir(), `gh-uploads-db-${process.pid}`)
process.env.UPLOAD_DIR = uploadDir
/** 审计 / 业务数据隔离到临时 SQLite 库，避免污染仓库 data/ 目录 */
process.env.DB_PATH = path.join(dbDir, 'gh.sqlite')
process.env.CONTENT_STORE_PATH = path.join(dbDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(dbDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(dbDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(dbDir, 'legacy-audit-log.json')

/** 最小 PNG 字节（仅 PNG 签名，用于验证字节流原样落盘） */
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

let server: Server
let base: string
let token: string
/** 本次上传成功的素材 id（供后续列表 / 删除用例串联） */
let uploadedId = ''

before(async () => {
  if (existsSync(uploadDir)) rmSync(uploadDir, { recursive: true, force: true })

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
  if (existsSync(uploadDir)) rmSync(uploadDir, { recursive: true, force: true })
  if (existsSync(dbDir)) rmSync(dbDir, { recursive: true, force: true })
})

const auth = () => ({ Authorization: `Bearer ${token}` })

/** 以原始字节流上传：文件名经 X-File-Name（URL 编码）传递 */
function upload(body: Buffer, fileName: string, contentType: string, headers: Record<string, string> = auth()) {
  return fetch(`${base}/api/admin/uploads`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'X-File-Name': encodeURIComponent(fileName), ...headers },
    body: new Uint8Array(body),
  })
}

describe('后台文件上传 / 素材库', () => {
  it('无令牌上传 → 401', async () => {
    const res = await upload(PNG_BYTES, 'a.png', 'image/png', {})
    assert.equal(res.status, 401)
    const body = (await res.json()) as { error?: string }
    assert.ok(body.error, '401 应返回 error')
  })

  it('带令牌上传 PNG → 201，URL 以 /uploads/ 开头，磁盘存在且公开可访问', async () => {
    const res = await upload(PNG_BYTES, '测试图.png', 'image/png')
    assert.equal(res.status, 201)
    const { item } = (await res.json()) as {
      item: { id: string; name: string; url: string; size: number; type: string; uploadedAt: string }
    }
    assert.ok(item.id.endsWith('.png'), 'id 应保留扩展名')
    assert.equal(item.name, '测试图.png', 'name 应为安全化后的原始名')
    assert.ok(item.url.startsWith('/uploads/'), 'url 应指向公开路径')
    assert.equal(item.url, `/uploads/${encodeURIComponent(item.id)}`)
    assert.equal(item.size, PNG_BYTES.length, 'size 应为字节数')
    assert.equal(item.type, 'image/png')
    assert.ok(!Number.isNaN(Date.parse(item.uploadedAt)), 'uploadedAt 应为可解析时间')
    uploadedId = item.id

    // 磁盘存在该文件
    assert.ok(existsSync(path.join(uploadDir, item.id)), '磁盘上应存在该文件')

    // 公开访问：/uploads/<文件名> → 200 且字节数正确
    const pub = await fetch(base + item.url)
    assert.equal(pub.status, 200, '公开 URL 应可访问')
    assert.equal((await pub.arrayBuffer()).byteLength, PNG_BYTES.length, '返回字节数应一致')
  })

  it('GET 列表首条即上传项，且 total 一致', async () => {
    const res = await fetch(`${base}/api/admin/uploads`, { headers: auth() })
    assert.equal(res.status, 200)
    const body = (await res.json()) as { items: Array<{ id: string }>; total: number }
    assert.equal(body.total, body.items.length)
    assert.ok(body.items.some((entry) => entry.id === uploadedId), '列表应包含刚上传的素材')
  })

  it('DELETE（软删除）后列表为空、磁盘文件保留；彻底删除后文件消失', async () => {
    const res = await fetch(`${base}/api/admin/uploads/${encodeURIComponent(uploadedId)}`, {
      method: 'DELETE',
      headers: auth(),
    })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true })
    // 软删除：磁盘文件保留（已进入回收站）
    assert.ok(existsSync(path.join(uploadDir, uploadedId)), '软删除后磁盘文件应保留')

    const list = (await (await fetch(`${base}/api/admin/uploads`, { headers: auth() })).json()) as {
      items: unknown[]
      total: number
    }
    assert.equal(list.total, 0)
    assert.deepEqual(list.items, [])

    // 软删除后公开直链不可访问（回收站拦截）
    assert.equal((await fetch(`${base}/uploads/${encodeURIComponent(uploadedId)}`)).status, 404)

    // 回收站可见（type=素材）→ 彻底删除 → 磁盘文件消失
    const trash = (await (await fetch(`${base}/api/admin/resources/trash`, { headers: auth() })).json()) as {
      items: Array<{ id: string; key: string; type: string; recordId: string }>
    }
    const entry = trash.items.find((item) => item.key === 'uploads' && item.recordId === uploadedId)
    assert.ok(entry, '回收站应含该素材')
    assert.equal(entry.type, 'upload')

    const purge = await fetch(`${base}/api/admin/resources/trash/${entry.id}`, { method: 'DELETE', headers: auth() })
    assert.equal(purge.status, 200)
    assert.ok(!existsSync(path.join(uploadDir, uploadedId)), '彻底删除后磁盘文件应消失')
  })

  it('DELETE 未命中 → 404', async () => {
    const res = await fetch(`${base}/api/admin/uploads/__nope__.png`, {
      method: 'DELETE',
      headers: auth(),
    })
    assert.equal(res.status, 404)
  })

  it('空 body → 400', async () => {
    const res = await upload(Buffer.alloc(0), 'empty.png', 'image/png')
    assert.equal(res.status, 400)
    assert.ok('error' in ((await res.json()) as object))
  })

  it('恶意扩展名（.js）→ 415', async () => {
    const res = await upload(Buffer.from('console.log(1)'), 'evil.js', 'text/javascript')
    assert.equal(res.status, 415)
    assert.ok('error' in ((await res.json()) as object))
  })

  it('视频（.mp4）可上传 → 201，且 URL 公开可取回', async () => {
    const res = await upload(Buffer.from('\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00'), 'demo.mp4', 'video/mp4')
    assert.equal(res.status, 201)
    const { item } = (await res.json()) as { item: { id: string; url: string; type: string } }
    assert.ok(item.id.endsWith('.mp4'), 'id 应保留 .mp4 扩展名')
    assert.equal(item.type, 'video/mp4')
    const pub = await fetch(base + item.url)
    assert.equal(pub.status, 200, '视频公开 URL 应可访问')
    assert.equal(pub.headers.get('content-type'), 'video/mp4')
  })

  it('扩展名允许但内容类型不符（.svg 伪装成 html）→ 415', async () => {
    const res = await upload(Buffer.from('<html></html>'), 'fake.svg', 'text/html')
    assert.equal(res.status, 415)
  })

  it('超出大小限制 → 413（独立低阈值实例）', async () => {
    const prev = process.env.UPLOAD_MAX_SIZE
    process.env.UPLOAD_MAX_SIZE = '1kb'
    const limited = createApp().listen(0)
    await new Promise<void>((resolve) => limited.once('listening', () => resolve()))
    try {
      const addr = limited.address()
      assert.ok(addr && typeof addr === 'object')
      const url = `http://127.0.0.1:${addr.port}/api/admin/uploads`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'image/png', 'X-File-Name': 'big.png', ...auth() },
        body: new Uint8Array(Buffer.alloc(4096, 1)),
      })
      assert.equal(res.status, 413, '超过 limit 应返回 413')
    } finally {
      await new Promise<void>((resolve) => limited.close(() => resolve()))
      if (prev === undefined) delete process.env.UPLOAD_MAX_SIZE
      else process.env.UPLOAD_MAX_SIZE = prev
    }
  })
})
