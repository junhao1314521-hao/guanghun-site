/**
 * 下载中心 · 固件版本化（P1）契约测试。
 * ============================================================
 * 覆盖：
 * - 固件主文件不能通过 PUT 原地覆盖（409），清空 / 首次上传不受限；
 * - 发布新版本：旧版本归档到 history 首位、changelog 置顶、大小与 SHA-256 取自素材；
 * - 版本号重复（当前 / 历史）与非法文件 / 日期被拒绝；
 * - 历史版本条目里的文件不允许被改写；
 * - 发布后按表单整体保存（PUT 同一文件）不会被误拦。
 *
 * 隔离：临时 SQLite + 临时上传目录；临时端口启动真实 Express 应用。
 */
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import type { Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'

const dbDir = path.join(os.tmpdir(), `gh-download-versions-db-${process.pid}`)
process.env.DB_PATH = path.join(dbDir, 'gh.sqlite')
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `gh-download-versions-uploads-${process.pid}`)
process.env.CONTENT_STORE_PATH = path.join(dbDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(dbDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(dbDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(dbDir, 'legacy-audit-log.json')

type DownloadRow = Record<string, unknown> & {
  id: string
  version?: string
  fileUrl?: string
  sizeBytes?: number
  sha256?: string
  assetId?: string
  history?: Array<Record<string, unknown>>
  changelog?: Array<Record<string, unknown>>
}

let server: Server
let base = ''
let token = ''
let firmware: DownloadRow
let v1Url = ''
let v2Url = ''

const auth = () => ({ Authorization: `Bearer ${token}` })
const jsonAuth = () => ({ 'Content-Type': 'application/json', ...auth() })

/** 上传一个站内素材，返回公开地址 */
async function upload(name: string, bytes: Buffer): Promise<string> {
  const res = await fetch(`${base}/api/admin/uploads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(name), ...auth() },
    body: new Uint8Array(bytes),
  })
  assert.equal(res.status, 201, '素材上传应成功')
  return ((await res.json()) as { item: { url: string } }).item.url
}

/** 读取当前记录（每次都取最新，避免用过期快照断言） */
async function detail(id: string): Promise<DownloadRow> {
  const res = await fetch(`${base}/api/admin/resources/downloads/${id}`, { headers: auth() })
  assert.equal(res.status, 200)
  return ((await res.json()) as { item: DownloadRow }).item
}

/** PUT 整条记录 */
function save(row: DownloadRow) {
  return fetch(`${base}/api/admin/resources/downloads/${row.id}`, {
    method: 'PUT',
    headers: jsonAuth(),
    body: JSON.stringify(row),
  })
}

before(async () => {
  rmSync(dbDir, { recursive: true, force: true })
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

  v1Url = await upload('qa-firmware-v1.bin', Buffer.from('firmware-v1-payload'))
  v2Url = await upload('qa-firmware-v2.bin', Buffer.from('firmware-v2-payload-longer'))

  const created = await fetch(`${base}/api/admin/resources/downloads`, {
    method: 'POST',
    headers: jsonAuth(),
    body: JSON.stringify({
      name: 'QA 固件版本化',
      type: 'firmware',
      brand: '光魂',
      category: '软件',
      models: ['all'],
      version: 'v1.0.0',
      date: '2026-01-01',
      size: '19 B',
      fileUrl: v1Url,
      isLatest: true,
    }),
  })
  assert.equal(created.status, 201)
  firmware = ((await created.json()) as { item: DownloadRow }).item
})

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  rmSync(dbDir, { recursive: true, force: true })
  rmSync(process.env.UPLOAD_DIR!, { recursive: true, force: true })
})

describe('固件文件不允许原地覆盖', () => {
  it('PUT 把主文件换成另一个文件 → 409', async () => {
    const current = await detail(firmware.id)
    const res = await save({ ...current, fileUrl: v2Url })
    assert.equal(res.status, 409)
    const body = (await res.json()) as { error: string }
    assert.match(body.error, /不允许原地覆盖/)
    assert.equal((await detail(firmware.id)).fileUrl, v1Url, '被拒绝后文件应保持不变')
  })

  it('清空文件（待更新）允许；从空恢复到文件也允许', async () => {
    const current = await detail(firmware.id)
    const cleared = await save({ ...current, fileUrl: '' })
    assert.equal(cleared.status, 200)
    assert.equal((await detail(firmware.id)).fileUrl, '')

    const restored = await save({ ...(await detail(firmware.id)), fileUrl: v1Url })
    assert.equal(restored.status, 200)
    assert.equal((await detail(firmware.id)).fileUrl, v1Url)
  })
})

describe('发布新版本', () => {
  it('新版本成为当前版本，旧版本归档、changelog 置顶，大小与 SHA-256 取自素材', async () => {
    const res = await fetch(`${base}/api/admin/resources/downloads/${firmware.id}/versions`, {
      method: 'POST',
      headers: jsonAuth(),
      body: JSON.stringify({
        version: 'v1.1.0',
        date: '2026-02-02',
        fileUrl: v2Url,
        notes: ['修复 HDR 切换闪烁', '优化待机功耗'],
      }),
    })
    assert.equal(res.status, 201)
    const { item, previousVersion } = (await res.json()) as { item: DownloadRow; previousVersion: string }
    assert.equal(previousVersion, 'v1.0.0')
    assert.equal(item.version, 'v1.1.0')
    assert.equal(item.fileUrl, v2Url)
    assert.equal(item.isLatest, true)
    assert.equal(item.checksumType, 'SHA-256')
    assert.ok(item.sha256 && String(item.sha256).length === 64, 'SHA-256 应为 64 位十六进制')
    assert.ok(item.assetId === v2Url.slice('/uploads/'.length), 'assetId 应指向新素材')

    const archived = item.history?.[0]
    assert.ok(archived, '旧版本应归档到 history 首位')
    assert.equal(archived.version, 'v1.0.0')
    assert.equal(archived.fileUrl, v1Url)
    assert.equal(archived.date, '2026-01-01')

    assert.equal(item.changelog?.[0]?.version, 'v1.1.0')
    assert.deepEqual(item.changelog?.[0]?.notes, ['修复 HDR 切换闪烁', '优化待机功耗'])
    assert.equal(item.sizeBytes, 'firmware-v2-payload-longer'.length)
    assert.equal(item.size, `${'firmware-v2-payload-longer'.length} B`, '小于 1KB 时按字节展示')
  })

  it('发布后按表单整体保存（文件未变）→ 200', async () => {
    const current = await detail(firmware.id)
    const res = await save(current)
    assert.equal(res.status, 200)
  })

  it('版本号与当前 / 历史重复 → 422', async () => {
    for (const version of ['v1.1.0', 'v1.0.0']) {
      const res = await fetch(`${base}/api/admin/resources/downloads/${firmware.id}/versions`, {
        method: 'POST',
        headers: jsonAuth(),
        body: JSON.stringify({ version, fileUrl: v1Url }),
      })
      assert.equal(res.status, 422, `版本 ${version} 应被拒绝`)
      assert.match(((await res.json()) as { error: string }).error, /已存在/)
    }
  })

  it('非素材库文件 / 非法日期 → 422', async () => {
    const external = await fetch(`${base}/api/admin/resources/downloads/${firmware.id}/versions`, {
      method: 'POST',
      headers: jsonAuth(),
      body: JSON.stringify({ version: 'v1.2.0', fileUrl: 'https://example.com/fw.bin' }),
    })
    assert.equal(external.status, 422)

    const missing = await fetch(`${base}/api/admin/resources/downloads/${firmware.id}/versions`, {
      method: 'POST',
      headers: jsonAuth(),
      body: JSON.stringify({ version: 'v1.2.0', fileUrl: '/uploads/__not_exist__.bin' }),
    })
    assert.equal(missing.status, 422)

    const badDate = await fetch(`${base}/api/admin/resources/downloads/${firmware.id}/versions`, {
      method: 'POST',
      headers: jsonAuth(),
      body: JSON.stringify({ version: 'v1.2.0', date: '2026/02/02', fileUrl: v1Url }),
    })
    assert.equal(badDate.status, 422)
  })

  it('改写历史版本条目的文件 → 409', async () => {
    const current = await detail(firmware.id)
    const tampered = {
      ...current,
      history: (current.history ?? []).map((entry, index) =>
        index === 0 ? { ...entry, fileUrl: v2Url } : entry,
      ),
    }
    const res = await save(tampered)
    assert.equal(res.status, 409)
    assert.match(((await res.json()) as { error: string }).error, /历史版本/)
  })

  it('非固件资源不支持发布新版本 → 422', async () => {
    const created = await fetch(`${base}/api/admin/resources/downloads`, {
      method: 'POST',
      headers: jsonAuth(),
      body: JSON.stringify({ name: 'QA 说明书', type: 'manual', models: ['all'], version: 'v1.0', fileUrl: v1Url }),
    })
    assert.equal(created.status, 201)
    const id = ((await created.json()) as { item: { id: string } }).item.id
    const res = await fetch(`${base}/api/admin/resources/downloads/${id}/versions`, {
      method: 'POST',
      headers: jsonAuth(),
      body: JSON.stringify({ version: 'v1.1', fileUrl: v2Url }),
    })
    assert.equal(res.status, 422)
  })
})
