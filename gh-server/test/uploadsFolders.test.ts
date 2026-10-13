/**
 * 素材库「文件夹 + 分类 + 筛选 + 批量移动」测试（零依赖）。
 *
 * 通过 `UPLOAD_DIR` 指向临时目录实现落盘隔离，DB 隔离到临时 SQLite 库。
 * 覆盖：文件夹 CRUD、上传落指定文件夹、按文件夹 / 分类 / 关键词 / 类型筛选、批量移动、
 * 分类手工覆盖、删除非空文件夹（移入未分类）、成环防护、权限 401。
 * 运行：npm test
 */
import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import type { Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'

const uploadDir = path.join(os.tmpdir(), `gh-media-uploads-${process.pid}`)
const dbDir = path.join(os.tmpdir(), `gh-media-db-${process.pid}`)
process.env.UPLOAD_DIR = uploadDir
process.env.DB_PATH = path.join(dbDir, 'gh.sqlite')
process.env.CONTENT_STORE_PATH = path.join(dbDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(dbDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(dbDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(dbDir, 'legacy-audit-log.json')

/** 最小 PNG 字节（含签名，足以通过落盘与类型校验） */
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

let server: Server
let base: string
let token: string

/** 文件夹 id（后续用例串联） */
let folderId = ''
let childId = ''

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

/** 后台 JSON 请求 */
function api(pathname: string, init: RequestInit = {}, withAuth = true): Promise<Response> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) }
  if (withAuth) headers['Authorization'] = `Bearer ${token}`
  return fetch(`${base}/api/admin${pathname}`, { ...init, headers })
}

/** 以原始字节流上传（可指定目标文件夹） */
function upload(body: Buffer, fileName: string, contentType = 'image/png', query = '') {
  return fetch(`${base}/api/admin/uploads${query}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'X-File-Name': encodeURIComponent(fileName), ...auth() },
    body: new Uint8Array(body),
  })
}

type Item = { id: string; name: string; type: string; folderId: string | null; category: string }

describe('素材库 · 文件夹与分类', () => {
  it('未登录访问文件夹 → 401', async () => {
    const res = await api('/media/folders', {}, false)
    assert.equal(res.status, 401)
  })

  it('初始文件夹列表为空', async () => {
    const res = await api('/media/folders')
    assert.equal(res.status, 200)
    const body = (await res.json()) as { items: unknown[]; total: number; uncategorized: number }
    assert.equal(body.total, 0)
    assert.deepEqual(body.items, [])
    assert.equal(body.uncategorized, 0)
  })

  it('新建文件夹（含子文件夹）→ 201 [item]', async () => {
    const res = await api('/media/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '图片素材' }),
    })
    assert.equal(res.status, 201)
    const { item } = (await res.json()) as { item: { id: string; name: string; parentId: string | null; fileCount: number } }
    assert.equal(item.name, '图片素材')
    assert.equal(item.parentId, null)
    assert.equal(item.fileCount, 0)
    folderId = item.id

    const child = await api('/media/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '子集', parentId: folderId }),
    })
    assert.equal(child.status, 201)
    childId = ((await child.json()) as { item: { id: string } }).item.id
    assert.ok(childId)
  })

  it('空名 → 400', async () => {
    const res = await api('/media/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '   ' }),
    })
    assert.equal(res.status, 400)
  })

  it('上传到指定文件夹 → item 带 folderId 与自动分类 image', async () => {
    const res = await upload(PNG_BYTES, '放入.png', 'image/png', `?folderId=${encodeURIComponent(folderId)}`)
    assert.equal(res.status, 201)
    const { item } = (await res.json()) as { item: Item }
    assert.equal(item.folderId, folderId)
    assert.equal(item.category, 'image')
  })

  it('上传到不存在的文件夹 → 400（且不落盘）', async () => {
    const res = await upload(PNG_BYTES, 'foto.png', 'image/png', '?folderId=__nope__')
    assert.equal(res.status, 400)
  })

  it('GET ?folderId= 只返回该文件夹文件', async () => {
    // 另传一个未分类文件
    await upload(PNG_BYTES, '自由.png')
    const res = await api(`/uploads?folderId=${encodeURIComponent(folderId)}`)
    const body = (await res.json()) as { items: Item[]; total: number }
    assert.equal(body.total, 1)
    assert.equal(body.items.length, 1)
    assert.equal(body.items[0].folderId, folderId)
  })

  it('按 category / q / type 筛选生效', async () => {
    const byCategory = (await (await api('/uploads?category=image')).json()) as { items: Item[]; total: number }
    assert.equal(byCategory.total, 2, '两张 PNG 均为 image 分类')

    const byQ = (await (await api(`/uploads?q=${encodeURIComponent('自由')}`)).json()) as { items: Item[]; total: number }
    assert.equal(byQ.total, 1)
    assert.equal(byQ.items[0].name, '自由.png')

    const byType = (await (await api('/uploads?type=image')).json()) as { items: Item[]; total: number }
    assert.equal(byType.total, 2)
  })

  it('未分类筛选', async () => {
    const res = (await (await api('/uploads?folderId=uncategorized')).json()) as { items: Item[]; total: number }
    assert.equal(res.total, 1)
    assert.equal(res.items[0].name, '自由.png')
  })

  it('批量移动 → 目标文件夹，筛选与计数同步', async () => {
    const uncat = (await (await api('/uploads?folderId=uncategorized')).json()) as { items: Item[] }
    const id = uncat.items[0].id
    const res = await api('/uploads/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id], folderId }),
    })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true })

    const inFolder = (await (await api(`/uploads?folderId=${encodeURIComponent(folderId)}`)).json()) as { total: number }
    assert.equal(inFolder.total, 2)

    const folders = (await (await api('/media/folders')).json()) as {
      items: Array<{ id: string; fileCount: number }>
      uncategorized: number
    }
    assert.equal(folders.uncategorized, 0)
    assert.equal(folders.items.find((f) => f.id === folderId)?.fileCount, 2)
  })

  it('移动目标不存在 → 400', async () => {
    const res = await api('/uploads/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ['x.png'], folderId: '__nope__' }),
    })
    assert.equal(res.status, 400)
  })

  it('手工覆盖分类（PATCH）→ 生效；非法分类 400', async () => {
    const list = (await (await api(`/uploads?folderId=${encodeURIComponent(folderId)}`)).json()) as { items: Item[] }
    const id = list.items[0].id
    const ok = await api(`/uploads/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'doc' }),
    })
    assert.equal(ok.status, 200)
    const { item } = (await ok.json()) as { item: Item }
    assert.equal(item.category, 'doc')

    const bad = await api(`/uploads/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'bogus' }),
    })
    assert.equal(bad.status, 400)

    // 覆盖后按 doc 筛选应命中
    const byDoc = (await (await api('/uploads?category=doc')).json()) as { total: number }
    assert.ok(byDoc.total >= 1)
  })

  it('重命名文件夹（PATCH）', async () => {
    const res = await api(`/media/folders/${encodeURIComponent(folderId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '图片素材（改）' }),
    })
    assert.equal(res.status, 200)
    const { item } = (await res.json()) as { item: { name: string; fileCount: number } }
    assert.equal(item.name, '图片素材（改）')
    assert.equal(item.fileCount, 2)
  })

  it('把文件夹移动到自身子孙下 → 400（成环防护）', async () => {
    const res = await api(`/media/folders/${encodeURIComponent(folderId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId: childId }),
    })
    assert.equal(res.status, 400)
  })

  it('删除非空文件夹 → 文件移入未分类，子文件夹上提一层', async () => {
    const res = await api(`/media/folders/${encodeURIComponent(folderId)}`, { method: 'DELETE' })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true })

    const uncat = (await (await api('/uploads?folderId=uncategorized')).json()) as { total: number }
    assert.equal(uncat.total, 2, '被删文件夹内文件进入未分类')

    const folders = (await (await api('/media/folders')).json()) as {
      items: Array<{ id: string; parentId: string | null }>
      total: number
    }
    assert.equal(folders.total, 1, '仅剩子文件夹')
    assert.equal(folders.items[0].id, childId)
    assert.equal(folders.items[0].parentId, null, '子文件夹上提为顶层')
  })

  it('重命名未命中 → 404；删除未命中 → 404', async () => {
    const rename = await api('/media/folders/__nope__', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
    })
    assert.equal(rename.status, 404)
    const del = await api('/media/folders/__nope__', { method: 'DELETE' })
    assert.equal(del.status, 404)
  })
})
