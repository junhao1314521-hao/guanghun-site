/**
 * 图片多尺寸变体（上传变体文件 → 登记 → 列表消费 → 公开查询 → 级联删除）测试（零依赖）。
 *
 * 通过 `UPLOAD_DIR` 落盘隔离、DB 隔离到临时 SQLite。覆盖：
 * - 主图 + 变体文件独立上传、登记端点（{ variants }）；
 * - `MediaItem.variants` 只增字段、旧素材兼容（variants: []）；
 * - 素材列表隐藏变体文件、文件夹计数排除变体；
 * - 公开端点 `GET /api/media/variants?url=...`（命中 / 未知 / 非 uploads 均 200）；
 * - 删除主图级联删除变体文件与元数据；
 * - 权限 401、未命中 404、缺清单 400。
 * 运行：npm test
 */
import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import type { Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'

const uploadDir = path.join(os.tmpdir(), `gh-variants-uploads-${process.pid}`)
const dbDir = path.join(os.tmpdir(), `gh-variants-db-${process.pid}`)
process.env.UPLOAD_DIR = uploadDir
process.env.DB_PATH = path.join(dbDir, 'gh.sqlite')
process.env.CONTENT_STORE_PATH = path.join(dbDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(dbDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(dbDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(dbDir, 'legacy-audit-log.json')

/** 最小 PNG / WebP 字节（仅签名，足以通过扩展名 + MIME 校验） */
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const WEBP_BYTES = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])

type Variant = { width: number; url: string; size: number; type: string }
type Item = {
  id: string
  name: string
  url: string
  size: number
  type: string
  variants: Variant[]
}

let server: Server
let base: string
let token: string

/** 主图 id / url（供后续用例串联） */
let masterId = ''
let masterUrl = ''
/** 变体清单（登记后） */
let variants: Variant[] = []

before(async () => {
  if (existsSync(uploadDir)) rmSync(uploadDir, { recursive: true, force: true })
  if (existsSync(dbDir)) rmSync(dbDir, { recursive: true, force: true })

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

/** 原始字节流上传（可覆盖鉴权头） */
function upload(body: Buffer, fileName: string, contentType: string, headers: Record<string, string> = auth()) {
  return fetch(`${base}/api/admin/uploads`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'X-File-Name': encodeURIComponent(fileName), ...headers },
    body: new Uint8Array(body),
  })
}

describe('图片多尺寸变体', () => {
  it('无令牌登记 → 401', async () => {
    const res = await fetch(`${base}/api/admin/uploads/x.png/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variants: [] }),
    })
    assert.equal(res.status, 401)
  })

  it('上传主图 → variants 为空数组（字段只增，旧素材兼容）', async () => {
    const res = await upload(PNG_BYTES, '主图.png', 'image/png')
    assert.equal(res.status, 201)
    const { item } = (await res.json()) as { item: Item }
    masterId = item.id
    masterUrl = item.url
    assert.deepEqual(item.variants, [], '未登记变体时应为空数组')
  })

  it('上传 3 个变体文件（独立素材）+ 登记到主图 → item.variants 升序', async () => {
    const generated: Variant[] = []
    for (const width of [320, 640, 1280]) {
      const res = await upload(WEBP_BYTES, `主图-${width}.webp`, 'image/webp')
      assert.equal(res.status, 201)
      const { item } = (await res.json()) as { item: Item }
      generated.push({ width, url: item.url, size: item.size, type: item.type })
    }
    // 乱序提交，验证后端会按宽度升序归一化
    const payload = [generated[2], generated[0], generated[1]]
    const res = await fetch(`${base}/api/admin/uploads/${encodeURIComponent(masterId)}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ variants: payload }),
    })
    assert.equal(res.status, 200)
    const { item } = (await res.json()) as { item: Item }
    assert.equal(item.variants.length, 3)
    assert.deepEqual(
      item.variants.map((v) => v.width),
      [320, 640, 1280],
      '变体应按宽度升序',
    )
    variants = item.variants
    assert.equal(item.variants[0].type, 'image/webp')
  })

  it('变体文件公开可访问（/uploads/... → 200，字节数一致）', async () => {
    for (const variant of variants) {
      const res = await fetch(base + variant.url)
      assert.equal(res.status, 200, `变体应可公开访问：${variant.url}`)
      assert.equal((await res.arrayBuffer()).byteLength, variant.size)
    }
  })

  it('素材列表：主图带 variants，且变体文件被隐藏（total 不含变体）', async () => {
    const res = await fetch(`${base}/api/admin/uploads`, { headers: auth() })
    assert.equal(res.status, 200)
    const body = (await res.json()) as { items: Item[]; total: number }
    assert.equal(body.total, 1, '素材列表应只含主图，变体文件不单列')
    assert.equal(body.items.length, 1)
    assert.equal(body.items[0].id, masterId)
    assert.equal(body.items[0].variants.length, 3)
  })

  it('公开端点：命中返回变体；未知 / 非 uploads 地址返回空数组（200）', async () => {
    const hit = await fetch(`${base}/api/media/variants?url=${encodeURIComponent(masterUrl)}`)
    assert.equal(hit.status, 200)
    const hitBody = (await hit.json()) as { url: string; variants: Variant[] }
    assert.equal(hitBody.variants.length, 3)
    assert.deepEqual(hitBody.variants.map((v) => v.width), [320, 640, 1280])

    const miss = await fetch(`${base}/api/media/variants?url=${encodeURIComponent('/uploads/__nope__.png')}`)
    assert.equal(miss.status, 200)
    assert.deepEqual(((await miss.json()) as { variants: Variant[] }).variants, [])

    const external = await fetch(`${base}/api/media/variants?url=${encodeURIComponent('https://cdn.example.com/a.png')}`)
    assert.equal(external.status, 200)
    assert.deepEqual(((await external.json()) as { variants: Variant[] }).variants, [])
  })

  it('登记未命中素材 → 404；缺 variants 数组 → 400', async () => {
    const notFound = await fetch(`${base}/api/admin/uploads/__nope__.png/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ variants: [] }),
    })
    assert.equal(notFound.status, 404)

    const bad = await fetch(`${base}/api/admin/uploads/${encodeURIComponent(masterId)}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({}),
    })
    assert.equal(bad.status, 400)
  })

  it('软删除主图 → 变体文件保留、列表清空；彻底删除 → 变体与主图文件消失', async () => {
    const variantFileIds = variants
      .map((variant) => variant.url.replace('/uploads/', ''))
      .map((name) => decodeURIComponent(name))
    for (const id of variantFileIds) assert.ok(existsSync(path.join(uploadDir, id)), '软删除前变体文件应存在')

    const res = await fetch(`${base}/api/admin/uploads/${encodeURIComponent(masterId)}`, {
      method: 'DELETE',
      headers: auth(),
    })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true })

    // 软删除：磁盘文件（主图 + 变体）保留，仅元数据移入回收站
    for (const id of variantFileIds) assert.ok(existsSync(path.join(uploadDir, id)), '软删除后变体文件应保留')
    assert.ok(existsSync(path.join(uploadDir, masterId)), '软删除后主图文件应保留')

    const list = (await (await fetch(`${base}/api/admin/uploads`, { headers: auth() })).json()) as {
      items: unknown[]
      total: number
    }
    assert.equal(list.total, 0)
    assert.deepEqual(list.items, [])

    // 公开端点返回空（变体元数据已随软删除移除）
    const pub = (await (await fetch(`${base}/api/media/variants?url=${encodeURIComponent(masterUrl)}`)).json()) as {
      variants: Variant[]
    }
    assert.deepEqual(pub.variants, [])

    // 软删除后主图 / 变体直链均不可访问（回收站拦截）
    assert.equal((await fetch(base + masterUrl)).status, 404)
    for (const variant of variants) assert.equal((await fetch(base + variant.url)).status, 404)

    // 回收站可见 → 彻底删除 → 磁盘文件（主图 + 变体）消失
    const trash = (await (await fetch(`${base}/api/admin/resources/trash`, { headers: auth() })).json()) as {
      items: Array<{ id: string; key: string; recordId: string }>
    }
    const entry = trash.items.find((item) => item.key === 'uploads' && item.recordId === masterId)
    assert.ok(entry, '回收站应含该主图')
    const purge = await fetch(`${base}/api/admin/resources/trash/${entry.id}`, { method: 'DELETE', headers: auth() })
    assert.equal(purge.status, 200)
    for (const id of variantFileIds) assert.ok(!existsSync(path.join(uploadDir, id)), '彻底删除后变体文件应消失')
    assert.ok(!existsSync(path.join(uploadDir, masterId)), '彻底删除后主图文件应消失')
  })
})
