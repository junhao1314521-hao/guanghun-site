/**
 * 大文件分片上传 + SHA-256 去重（P2）契约测试。
 * ============================================================
 * 覆盖：
 * - init 预检（扩展名 / 大小）与分片计划；
 * - 乱序上传、状态查询（断点续传依据）、非末片必须满片；
 * - 未收齐时 complete → 409 并返回缺失下标；
 * - complete 合并后文件可公开访问、字节一致；
 * - 放弃任务后状态 404；
 * - 同文件夹同内容去重（复用已有素材），不同文件夹同内容仅提示 duplicates。
 *
 * 隔离：临时 SQLite + 临时上传根目录（分片目录位于其同级）。
 */
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import type { Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'

const CHUNK_SIZE = 5 * 1024 * 1024
const root = path.join(os.tmpdir(), `gh-chunks-${process.pid}`)
const dbDir = path.join(root, 'db')
process.env.DB_PATH = path.join(dbDir, 'gh.sqlite')
process.env.UPLOAD_DIR = path.join(root, 'uploads')
process.env.CONTENT_STORE_PATH = path.join(dbDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(dbDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(dbDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(dbDir, 'legacy-audit-log.json')

let server: Server
let base = ''
let token = ''
/** 文件夹 A / B（去重测试用） */
let folderA = ''
let folderB = ''

const auth = () => ({ Authorization: `Bearer ${token}` })
const jsonAuth = () => ({ 'Content-Type': 'application/json', ...auth() })

type UploadItem = { id: string; name: string; url: string; size: number }
type UploadResponse = {
  item: UploadItem
  reused?: boolean
  duplicateOf?: string
  duplicates?: Array<{ id: string; name: string }>
}

/** 单文件上传（一次性字节流） */
async function uploadOnce(bytes: Buffer, name: string, folderId?: string): Promise<UploadResponse> {
  const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : ''
  const res = await fetch(`${base}/api/admin/uploads${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(name), ...auth() },
    body: new Uint8Array(bytes),
  })
  assert.equal(res.status, 201, `上传 ${name} 应成功`)
  return (await res.json()) as UploadResponse
}

/** 初始化分片任务 */
async function initChunk(name: string, size: number, folderId?: string) {
  const res = await fetch(`${base}/api/admin/uploads/chunks`, {
    method: 'POST',
    headers: jsonAuth(),
    body: JSON.stringify({ name, size, mime: 'application/octet-stream', folderId: folderId ?? null }),
  })
  return {
    status: res.status,
    body: (await res.json()) as
      | { uploadId: string; chunkSize: number; totalChunks: number; received: number[] }
      | { error: string },
  }
}

/** 上传某一分片 */
async function putPart(uploadId: string, index: number, bytes: Buffer) {
  const res = await fetch(`${base}/api/admin/uploads/chunks/${uploadId}/${index}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream', ...auth() },
    body: new Uint8Array(bytes),
  })
  return { status: res.status, body: (await res.json()) as { received?: number[]; error?: string } }
}

before(async () => {
  rmSync(root, { recursive: true, force: true })
  server = createApp().listen(0)
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const addr = server.address()
  assert.ok(addr && typeof addr === 'object')
  base = `http://127.0.0.1:${addr.port}`

  const login = await fetch(`${base}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  })
  assert.equal(login.status, 200)
  token = ((await login.json()) as { token: string }).token

  for (const [name, target] of [
    ['去重-A', 'A'],
    ['去重-B', 'B'],
  ] as const) {
    const res = await fetch(`${base}/api/admin/media/folders`, {
      method: 'POST',
      headers: jsonAuth(),
      body: JSON.stringify({ name }),
    })
    assert.equal(res.status, 201)
    const id = ((await res.json()) as { item: { id: string } }).item.id
    if (target === 'A') folderA = id
    else folderB = id
  }
})

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  rmSync(root, { recursive: true, force: true })
})

describe('分片上传', () => {
  it('init 预检：非法扩展名 415、超限 413、正常返回分片计划', async () => {
    const badExt = await initChunk('evil.js', 100)
    assert.equal(badExt.status, 415)

    const tooBig = await initChunk('huge.bin', 60 * 1024 * 1024)
    assert.equal(tooBig.status, 413)

    const ok = await initChunk('qa-chunk.bin', CHUNK_SIZE + 100)
    assert.equal(ok.status, 201)
    assert.ok('uploadId' in ok.body)
    if ('uploadId' in ok.body) {
      assert.equal(ok.body.chunkSize, CHUNK_SIZE)
      assert.equal(ok.body.totalChunks, 2)
      assert.deepEqual(ok.body.received, [])
    }
  })

  it('乱序上传、状态可查；未收齐时 complete → 409 并返回缺失下标', async () => {
    const init = await initChunk('qa-chunk.bin', CHUNK_SIZE + 100)
    assert.equal(init.status, 201)
    assert.ok('uploadId' in init.body)
    if (!('uploadId' in init.body)) return
    const { uploadId } = init.body

    const last = await putPart(uploadId, 1, Buffer.alloc(100, 9))
    assert.equal(last.status, 200)
    assert.deepEqual(last.body.received, [1])

    // 非最后一片必须满 5MB
    const shortFirst = await putPart(uploadId, 0, Buffer.alloc(1024, 3))
    assert.equal(shortFirst.status, 422)

    const missing = await fetch(`${base}/api/admin/uploads/chunks/${uploadId}/complete`, {
      method: 'POST',
      headers: auth(),
    })
    assert.equal(missing.status, 409)
    const missingBody = (await missing.json()) as { missing?: number[] }
    assert.deepEqual(missingBody.missing, [0])

    const status = (await (
      await fetch(`${base}/api/admin/uploads/chunks/${uploadId}`, { headers: auth() })
    ).json()) as { received: number[]; complete: boolean }
    assert.deepEqual(status.received, [1])
    assert.equal(status.complete, false)

    const first = await putPart(uploadId, 0, Buffer.alloc(CHUNK_SIZE, 3))
    assert.equal(first.status, 200)
    assert.deepEqual(first.body.received, [0, 1])

    const done = await fetch(`${base}/api/admin/uploads/chunks/${uploadId}/complete`, {
      method: 'POST',
      headers: auth(),
    })
    assert.equal(done.status, 201)
    const { item } = (await done.json()) as UploadResponse
    assert.ok(item.url.startsWith('/uploads/'))
    assert.equal(item.size, CHUNK_SIZE + 100)

    // 合并后的字节与分片一致（抽查首尾）
    const bytes = Buffer.from(await (await fetch(base + item.url)).arrayBuffer())
    assert.equal(bytes.length, CHUNK_SIZE + 100)
    assert.equal(bytes[0], 3)
    assert.equal(bytes[CHUNK_SIZE], 9)

    // 完成后任务目录应清理
    const gone = await fetch(`${base}/api/admin/uploads/chunks/${uploadId}`, { headers: auth() })
    assert.equal(gone.status, 404)
  })

  it('放弃任务后状态 404', async () => {
    const init = await initChunk('qa-abort.bin', 1024)
    assert.ok('uploadId' in init.body)
    if (!('uploadId' in init.body)) return
    const abort = await fetch(`${base}/api/admin/uploads/chunks/${init.body.uploadId}`, {
      method: 'DELETE',
      headers: auth(),
    })
    assert.equal(abort.status, 200)
    const status = await fetch(`${base}/api/admin/uploads/chunks/${init.body.uploadId}`, { headers: auth() })
    assert.equal(status.status, 404)
  })
})

describe('SHA-256 去重', () => {
  it('同文件夹同内容：第二次复用已有素材，不重复占用磁盘', async () => {
    const payload = Buffer.from(`dedup-${Date.now()}-same-folder`)
    const first = await uploadOnce(payload, 'dedup-a.bin', folderA)
    assert.equal(first.reused, undefined)

    const totalBefore = ((await (await fetch(`${base}/api/admin/uploads`, { headers: auth() })).json()) as {
      total: number
    }).total

    const second = await uploadOnce(payload, 'dedup-a-copy.bin', folderA)
    assert.equal(second.reused, true)
    assert.equal(second.item.id, first.item.id, '应复用第一个素材')
    assert.equal(second.duplicateOf, first.item.name)

    const totalAfter = ((await (await fetch(`${base}/api/admin/uploads`, { headers: auth() })).json()) as {
      total: number
    }).total
    assert.equal(totalAfter, totalBefore, '同文件夹去重不应增加素材数量')
  })

  it('不同文件夹同内容：保留新文件，并在响应中提示 duplicates', async () => {
    const payload = Buffer.from(`dedup-${Date.now()}-cross-folder`)
    const first = await uploadOnce(payload, 'dedup-b.bin', folderA)
    const second = await uploadOnce(payload, 'dedup-b-copy.bin', folderB)

    assert.equal(second.reused, undefined)
    assert.notEqual(second.item.id, first.item.id)
    assert.ok(second.duplicates?.some((entry) => entry.id === first.item.id), '应提示其他文件夹存在同内容')
  })

  it('分片上传同样走去重：同文件夹同内容复用', async () => {
    const payload = Buffer.alloc(CHUNK_SIZE + 10, 5)
    const first = await uploadOnce(payload, 'chunk-dup.bin', folderA)
    const init = await initChunk('chunk-dup-copy.bin', payload.length, folderA)
    assert.ok('uploadId' in init.body)
    if (!('uploadId' in init.body)) return
    await putPart(init.body.uploadId, 0, payload.subarray(0, CHUNK_SIZE))
    await putPart(init.body.uploadId, 1, payload.subarray(CHUNK_SIZE))
    const done = await fetch(`${base}/api/admin/uploads/chunks/${init.body.uploadId}/complete`, {
      method: 'POST',
      headers: auth(),
    })
    assert.equal(done.status, 201)
    const body = (await done.json()) as UploadResponse
    assert.equal(body.reused, true)
    assert.equal(body.item.id, first.item.id)
  })
})
