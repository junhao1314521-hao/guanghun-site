/**
 * 静态图 WebP 内容协商：Accept 含 image/webp 且存在同名 .webp 时返回 WebP，否则回退原图。
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import type { Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'

const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'gh-webp-'))
const staticDir = path.join(tmpDir, 'dist')
mkdirSync(path.join(staticDir, 'media'), { recursive: true })
writeFileSync(path.join(staticDir, 'index.html'), '<html><body>ok</body></html>')
writeFileSync(path.join(staticDir, 'media', 'photo.jpg'), Buffer.from('JPEG-DATA'))
writeFileSync(path.join(staticDir, 'media', 'photo.webp'), Buffer.from('WEBP-DATA'))
writeFileSync(path.join(staticDir, 'media', 'plain.jpg'), Buffer.from('PLAIN-JPEG'))

process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
process.env.STATIC_DIR = staticDir
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')

let server: Server
let base: string

before(async () => {
  const app = createApp()
  server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  base = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('静态图 WebP 协商', () => {
  it('支持 WebP 时返回同名 .webp，并声明 Vary: Accept', async () => {
    const res = await fetch(`${base}/media/photo.jpg`, { headers: { accept: 'image/webp,*/*' } })
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('content-type'), 'image/webp')
    assert.match(res.headers.get('vary') ?? '', /accept/i)
    assert.equal(Buffer.from(await res.arrayBuffer()).toString(), 'WEBP-DATA')
  })

  it('不支持 WebP 时回退原图', async () => {
    const res = await fetch(`${base}/media/photo.jpg`, { headers: { accept: 'image/jpeg' } })
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('content-type'), 'image/jpeg')
    assert.equal(Buffer.from(await res.arrayBuffer()).toString(), 'JPEG-DATA')
  })

  it('没有 .webp 时即使声明支持也返回原图', async () => {
    const res = await fetch(`${base}/media/plain.jpg`, { headers: { accept: 'image/webp' } })
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('content-type'), 'image/jpeg')
    assert.equal(Buffer.from(await res.arrayBuffer()).toString(), 'PLAIN-JPEG')
  })
})
