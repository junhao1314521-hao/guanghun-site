/**
 * 回收站完整化测试：内容库页面 + 素材库文件纳入软删除。
 *
 * 覆盖：
 * - 非内置页面：删除 → 回收站(type=page) → 恢复写回内容库 → 再删 → 彻底删除；内置页面仍 400；恢复时 key 被占用 409；
 * - 素材文件：软删除后列表 / 文件夹计数 / 前台直链均不可见（磁盘保留）→ 恢复 → 再删 → 彻底删除删磁盘文件；
 * - 多尺寸变体：软删除 → 恢复 → 彻底删除时变体文件一并处理；
 * - 权限（operator 403 / 未登录 401）与审计（delete-upload / restore / purge）。
 *
 * 隔离：UPLOAD_DIR 指向临时目录；DB_PATH 指向临时 SQLite；临时端口启动真实 Express 应用。
 * 运行：npm test
 */
import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import type { Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'

const uploadDir = path.join(os.tmpdir(), `gh-trash-pu-uploads-${process.pid}`)
const dbDir = path.join(os.tmpdir(), `gh-trash-pu-db-${process.pid}`)
process.env.UPLOAD_DIR = uploadDir
process.env.DB_PATH = path.join(dbDir, 'gh.sqlite')
process.env.CONTENT_STORE_PATH = path.join(dbDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(dbDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(dbDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(dbDir, 'legacy-audit-log.json')

/** 最小 PNG / WebP 字节（仅签名，足以通过扩展名 + MIME 校验） */
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const WEBP_BYTES = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])

type TrashRow = { id: string; key: string; type: string; recordId: string; name: string }
type MediaItem = { id: string; name: string; url: string; folderId: string | null; variants: Array<{ width: number; url: string }> }

let server: Server
let base: string
let adminToken = ''
let operatorToken = ''

before(async () => {
  rmSync(uploadDir, { recursive: true, force: true })
  rmSync(dbDir, { recursive: true, force: true })
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
  rmSync(uploadDir, { recursive: true, force: true })
  rmSync(dbDir, { recursive: true, force: true })
})

const auth = (token = adminToken) => ({ Authorization: `Bearer ${token}` })
const jsonAuth = (token = adminToken) => ({ 'Content-Type': 'application/json', ...auth(token) })

/** 回收站列表（admin） */
async function trashList(): Promise<{ items: TrashRow[]; total: number }> {
  const res = await fetch(`${base}/api/admin/resources/trash`, { headers: auth() })
  assert.equal(res.status, 200)
  return (await res.json()) as { items: TrashRow[]; total: number }
}

/** 新建页面 */
function createPage(key: string, title: string) {
  return fetch(`${base}/api/admin/pages`, {
    method: 'POST',
    headers: jsonAuth(),
    body: JSON.stringify({ key, path: `/${key}`, title, blocks: [] }),
  })
}

const deletePage = (key: string) => fetch(`${base}/api/admin/pages/${encodeURIComponent(key)}`, { method: 'DELETE', headers: auth() })

/** 原始字节流上传（可带 query） */
function upload(body: Buffer, fileName: string, contentType: string, query = '') {
  return fetch(`${base}/api/admin/uploads${query}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'X-File-Name': encodeURIComponent(fileName), ...auth() },
    body: new Uint8Array(body),
  })
}

const deleteUpload = (id: string) =>
  fetch(`${base}/api/admin/uploads/${encodeURIComponent(id)}`, { method: 'DELETE', headers: auth() })

const restoreTrash = (id: string) =>
  fetch(`${base}/api/admin/resources/trash/${encodeURIComponent(id)}/restore`, { method: 'POST', headers: auth() })

const purgeTrash = (id: string) =>
  fetch(`${base}/api/admin/resources/trash/${encodeURIComponent(id)}`, { method: 'DELETE', headers: auth() })

const mediaList = async (): Promise<{ items: MediaItem[]; total: number }> =>
  (await (await fetch(`${base}/api/admin/uploads`, { headers: auth() })).json()) as { items: MediaItem[]; total: number }

describe('回收站：内容库页面（软删除 / 恢复 / 彻底删除）', () => {
  it('内置页面删除仍 → 400', async () => {
    const res = await deletePage('home')
    assert.equal(res.status, 400)
  })

  it('非内置页面：删除 → 回收站(type=page) → 恢复写回 → 再删 → 彻底删除', async () => {
    const key = 'trash-page-demo'
    assert.equal((await createPage(key, '回收站测试页')).status, 201)

    const del = await deletePage(key)
    assert.equal(del.status, 200)
    assert.deepEqual(await del.json(), { ok: true })
    // 页面已从内容库移除
    assert.equal((await fetch(`${base}/api/admin/pages/${key}`, { headers: auth() })).status, 404)

    const trash = await trashList()
    const entry = trash.items.find((item) => item.key === 'pages' && item.recordId === key)
    assert.ok(entry, '回收站应含该页面')
    assert.equal(entry.type, 'page')
    assert.equal(entry.name, '回收站测试页')

    // 恢复：按原 key 写回内容库
    assert.equal((await restoreTrash(entry.id)).status, 200)
    const restored = await fetch(`${base}/api/admin/pages/${key}`, { headers: auth() })
    assert.equal(restored.status, 200)
    const { page } = (await restored.json()) as { page: { title: string } }
    assert.equal(page.title, '回收站测试页')

    // 再删 + 彻底删除
    assert.equal((await deletePage(key)).status, 200)
    const entry2 = (await trashList()).items.find((item) => item.key === 'pages' && item.recordId === key)
    assert.ok(entry2)
    assert.equal((await purgeTrash(entry2.id)).status, 200)
    assert.ok(!(await trashList()).items.some((item) => item.id === entry2.id), '彻底删除后回收站不应再含该页面')
  })

  it('恢复页面时原 key 已被占用 → 409（不覆盖）', async () => {
    const key = 'trash-page-conflict'
    assert.equal((await createPage(key, '冲突页')).status, 201)
    assert.equal((await deletePage(key)).status, 200)
    // 用同 key 重建占位页面
    assert.equal((await createPage(key, '占位页')).status, 201)

    const entry = (await trashList()).items.find((item) => item.key === 'pages' && item.recordId === key)
    assert.ok(entry)
    assert.equal((await restoreTrash(entry.id)).status, 409, '原 key 被占用应拒绝恢复')

    // 清理：彻底删除该回收站条目
    assert.equal((await purgeTrash(entry.id)).status, 200)
  })
})

describe('回收站：素材文件（软删除 / 恢复 / 彻底删除）', () => {
  it('素材：软删除后列表 / 计数 / 直链不可见（磁盘保留）→ 恢复 → 再删 → 彻底删除删磁盘文件', async () => {
    // 建文件夹并上传到该文件夹
    const folderRes = await fetch(`${base}/api/admin/media/folders`, {
      method: 'POST',
      headers: jsonAuth(),
      body: JSON.stringify({ name: '回收站文件夹' }),
    })
    assert.equal(folderRes.status, 201)
    const { item: folder } = (await folderRes.json()) as { item: { id: string } }

    const up = await upload(PNG_BYTES, '回收站素材.png', 'image/png', `?folderId=${encodeURIComponent(folder.id)}`)
    assert.equal(up.status, 201)
    const { item } = (await up.json()) as { item: MediaItem }
    const id = item.id
    assert.ok(existsSync(path.join(uploadDir, id)), '上传后磁盘应存在该文件')

    const folderCount = async (): Promise<number> => {
      const res = (await (await fetch(`${base}/api/admin/media/folders`, { headers: auth() })).json()) as {
        items: Array<{ id: string; fileCount: number }>
      }
      return res.items.find((f) => f.id === folder.id)?.fileCount ?? -1
    }
    assert.equal(await folderCount(), 1)

    // 软删除
    assert.equal((await deleteUpload(id)).status, 200)
    assert.ok(existsSync(path.join(uploadDir, id)), '软删除后磁盘文件应保留')
    assert.ok(!(await mediaList()).items.some((entry) => entry.id === id), '软删除后素材列表不应含该素材')
    assert.equal(await folderCount(), 0, '软删除后文件夹计数应减少')
    assert.equal((await fetch(base + item.url)).status, 404, '软删除后前台直链应不可访问')

    const entry = (await trashList()).items.find((row) => row.key === 'uploads' && row.recordId === id)
    assert.ok(entry, '回收站应含该素材')
    assert.equal(entry.type, 'upload')
    assert.equal(entry.name, '回收站素材.png')

    // 恢复：写回元数据、文件恢复可见（不重新复制）
    assert.equal((await restoreTrash(entry.id)).status, 200)
    const restoredItem = (await mediaList()).items.find((row) => row.id === id)
    assert.ok(restoredItem, '恢复后素材应回到列表')
    assert.equal(restoredItem.folderId, folder.id, '恢复后文件夹归属应保持')
    assert.equal(await folderCount(), 1, '恢复后文件夹计数应复原')
    assert.equal((await fetch(base + item.url)).status, 200, '恢复后前台直链应可访问')

    // 再删 + 彻底删除 → 磁盘文件真正删除
    assert.equal((await deleteUpload(id)).status, 200)
    const entry2 = (await trashList()).items.find((row) => row.key === 'uploads' && row.recordId === id)
    assert.ok(entry2)
    assert.equal((await purgeTrash(entry2.id)).status, 200)
    assert.ok(!existsSync(path.join(uploadDir, id)), '彻底删除后磁盘文件应被删除')
  })

  it('多尺寸变体：软删除 → 恢复 → 彻底删除，变体文件一并处理', async () => {
    const up = await upload(PNG_BYTES, '变体主图.png', 'image/png')
    assert.equal(up.status, 201)
    const { item: master } = (await up.json()) as { item: MediaItem }

    // 独立上传 2 个变体文件并登记
    const variantUrls: string[] = []
    const payload: Array<{ width: number; url: string; size: number; type: string }> = []
    for (const width of [320, 640]) {
      const res = await upload(WEBP_BYTES, `变体主图-${width}.webp`, 'image/webp')
      assert.equal(res.status, 201)
      const { item } = (await res.json()) as { item: { url: string; size: number } }
      variantUrls.push(item.url)
      payload.push({ width, url: item.url, size: item.size, type: 'image/webp' })
    }
    const reg = await fetch(`${base}/api/admin/uploads/${encodeURIComponent(master.id)}/variants`, {
      method: 'POST',
      headers: jsonAuth(),
      body: JSON.stringify({ variants: payload }),
    })
    assert.equal(reg.status, 200)
    const variantFileIds = variantUrls.map((url) => decodeURIComponent(url.replace('/uploads/', '')))
    for (const vid of variantFileIds) assert.ok(existsSync(path.join(uploadDir, vid)), '登记后变体文件应存在')

    // 软删除主图 → 主图与变体直链均 404，变体元数据为空，磁盘文件保留
    assert.equal((await deleteUpload(master.id)).status, 200)
    assert.ok(existsSync(path.join(uploadDir, master.id)), '软删除后主图文件应保留')
    for (const vid of variantFileIds) assert.ok(existsSync(path.join(uploadDir, vid)), '软删除后变体文件应保留')
    assert.equal((await fetch(base + master.url)).status, 404)
    for (const url of variantUrls) assert.equal((await fetch(base + url)).status, 404)
    const variantsByUrl = (await (await fetch(`${base}/api/media/variants?url=${encodeURIComponent(master.url)}`)).json()) as {
      variants: unknown[]
    }
    assert.deepEqual(variantsByUrl.variants, [], '软删除后公开变体端点应返回空')

    const entry = (await trashList()).items.find((row) => row.key === 'uploads' && row.recordId === master.id)
    assert.ok(entry)

    // 恢复 → 变体元数据与直链恢复
    assert.equal((await restoreTrash(entry.id)).status, 200)
    const restored = (await mediaList()).items.find((row) => row.id === master.id)
    assert.ok(restored)
    assert.equal(restored.variants.length, 2, '恢复后变体清单应回到 2 条')
    assert.equal((await fetch(base + master.url)).status, 200)
    for (const url of variantUrls) assert.equal((await fetch(base + url)).status, 200)

    // 再删 + 彻底删除 → 主图与变体磁盘文件一并删除
    assert.equal((await deleteUpload(master.id)).status, 200)
    const entry2 = (await trashList()).items.find((row) => row.key === 'uploads' && row.recordId === master.id)
    assert.ok(entry2)
    assert.equal((await purgeTrash(entry2.id)).status, 200)
    assert.ok(!existsSync(path.join(uploadDir, master.id)), '彻底删除后主图文件应消失')
    for (const vid of variantFileIds) assert.ok(!existsSync(path.join(uploadDir, vid)), '彻底删除后变体文件应消失')
  })
})

describe('回收站：权限与审计（新增类型）', () => {
  it('回收站 RBAC：operator → 403，未登录 → 401', async () => {
    assert.equal((await fetch(`${base}/api/admin/resources/trash`, { headers: auth(operatorToken) })).status, 403)
    assert.equal((await fetch(`${base}/api/admin/resources/trash`)).status, 401)
  })

  it('页面与素材的软删除 / 恢复 / 彻底删除均写审计', async () => {
    // 页面：删除 / 恢复 / 再删 / 彻底删除
    const key = 'trash-audit-page'
    await createPage(key, '审计页')
    await deletePage(key)
    const pageEntry = (await trashList()).items.find((item) => item.key === 'pages' && item.recordId === key)
    assert.ok(pageEntry)
    await restoreTrash(pageEntry.id)
    await deletePage(key)
    const pageEntry2 = (await trashList()).items.find((item) => item.key === 'pages' && item.recordId === key)
    assert.ok(pageEntry2)
    await purgeTrash(pageEntry2.id)

    // 素材：上传 / 删除 / 恢复 / 再删 / 彻底删除
    const up = await upload(PNG_BYTES, '审计素材.png', 'image/png')
    const { item } = (await up.json()) as { item: MediaItem }
    await deleteUpload(item.id)
    const upEntry = (await trashList()).items.find((row) => row.key === 'uploads' && row.recordId === item.id)
    assert.ok(upEntry)
    await restoreTrash(upEntry.id)
    await deleteUpload(item.id)
    const upEntry2 = (await trashList()).items.find((row) => row.key === 'uploads' && row.recordId === item.id)
    assert.ok(upEntry2)
    await purgeTrash(upEntry2.id)

    const logs = (await (await fetch(`${base}/api/admin/resources/logs`, { headers: auth() })).json()) as {
      items: Array<{ action: string }>
    }
    const actions = logs.items.map((entry) => entry.action)
    assert.ok(actions.includes('delete'), '应含页面软删除审计')
    assert.ok(actions.includes('delete-upload'), '应含素材软删除审计')
    assert.ok(actions.includes('restore'), '应含恢复审计')
    assert.ok(actions.includes('purge'), '应含彻底删除审计')
  })
})
