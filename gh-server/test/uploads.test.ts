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
import { BRAND_ASSET_ITEMS } from '../src/data/brandAssets'
import { DOWNLOAD_ITEMS } from '../src/data/support-extra'

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

/**
 * 种子数据 ↔ 素材库白名单 一致性守卫（跨模块）
 *
 * 背景：下载中心 / 品牌资料的 `fileUrl` 一旦写成站内路径（`/uploads/...`），语义上就等于
 * 「这个文件存在于素材库」。但素材库有扩展名白名单，白名单外的扩展名（如曾经的 .exe / .dmg）
 * 根本传不上去 —— 前台照着这个地址渲染下载按钮，必然是死链。
 *
 * 这条测试把两个模块的一致性钉死：凡是种子里出现的**站内文件**，都按真实口径真的走一遍上传端点。
 * 以后往种子里加新文件类型时，测试会先要求声明 Content-Type，再验证白名单是否放行。
 */
describe('种子资源的站内文件地址必须能通过上传白名单', () => {
  /** 浏览器对各类文件实际上报的 Content-Type（按真机口径发送，而非硬编码放行） */
  const CT_BY_EXT: Record<string, string> = {
    bin: 'application/octet-stream',
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    exe: 'application/octet-stream',
    pdf: 'application/pdf',
  }

  it('逐个扩展名走一遍上传端点，均应 201', async () => {
    const urls = [
      ...DOWNLOAD_ITEMS.map((it) => it.fileUrl),
      ...BRAND_ASSET_ITEMS.map((it) => it.fileUrl),
    ].filter((url): url is string => typeof url === 'string' && url.startsWith('/uploads/'))

    assert.ok(urls.length >= 10, `种子站内文件仅 ${urls.length} 条，疑似数据源漏读`)

    /** 扩展名 → 首个样例文件名（每个扩展名只探一次，避免重复写盘） */
    const byExt = new Map<string, string>()
    for (const url of urls) {
      const name = url.split('/').pop() ?? ''
      const ext = name.split('.').pop()?.toLowerCase() ?? ''
      if (!byExt.has(ext)) byExt.set(ext, name)
    }

    const undeclared = [...byExt.keys()].filter((ext) => !CT_BY_EXT[ext])
    assert.deepEqual(
      undeclared,
      [],
      `种子出现未声明的扩展名：${undeclared.join(', ')}；请确认素材库白名单是否放行，并补充 CT_BY_EXT`,
    )

    for (const [ext, name] of byExt) {
      const res = await upload(Buffer.from(`seed-${ext}-probe`), name, CT_BY_EXT[ext])
      assert.equal(
        res.status,
        201,
        `种子站内文件 .${ext}（${name}）无法通过上传白名单 → 前台引用该地址必是死链`,
      )
    }
  })
})

describe('素材引用保护（R-22）', () => {
  it('被产品记录引用：返回引用明细；不带 force 删除 409，带 force 才成功', async () => {
    const created = await fetch(`${base}/api/admin/resources/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ id: 'gh-ref-probe', name: '引用测试产品', model: 'REF-PROBE' }),
    })
    assert.equal(created.status, 201, '应能创建测试产品')

    const up = await upload(PNG_BYTES, 'ref-probe.png', 'image/png')
    assert.equal(up.status, 201)
    const { item } = (await up.json()) as { item: { id: string; url: string } }

    const put = await fetch(`${base}/api/admin/resources/products/gh-ref-probe`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ gallery: [item.url] }),
    })
    assert.equal(put.status, 200, '应能把素材地址写进产品相册')

    const refs = await fetch(`${base}/api/admin/uploads/${item.id}/references`, { headers: auth() })
    const report = (await refs.json()) as {
      count: number
      refs: Array<{ location: string; to?: string }>
    }
    assert.ok(report.count >= 1, '应统计到集合记录里的引用')
    assert.ok(
      report.refs.some((ref) => ref.location.includes('引用测试产品')),
      `引用位置应包含记录名，实际：${report.refs.map((ref) => ref.location).join(' / ')}`,
    )
    assert.ok(
      report.refs.some((ref) => ref.to === '/admin/products/gh-ref-probe'),
      `引用应带可跳转的后台地址，实际：${report.refs.map((ref) => ref.to ?? '-').join(' / ')}`,
    )

    const blocked = await fetch(`${base}/api/admin/uploads/${item.id}`, { method: 'DELETE', headers: auth() })
    assert.equal(blocked.status, 409, '仍被引用时删除应被拒绝')

    const forced = await fetch(`${base}/api/admin/uploads/${item.id}?force=1`, { method: 'DELETE', headers: auth() })
    assert.equal(forced.status, 200, '显式 force 后应允许删除')

    await fetch(`${base}/api/admin/resources/products/gh-ref-probe`, { method: 'DELETE', headers: auth() })
  })
})

describe('素材原地替换（R-22）', () => {
  it('替换后地址不变、内容更新；Content-Type 与原扩展名不符 → 415', async () => {
    const up = await upload(PNG_BYTES, 'replace-me.png', 'image/png')
    assert.equal(up.status, 201)
    const { item } = (await up.json()) as { item: { id: string; url: string } }

    const nextBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
    const rep = await fetch(`${base}/api/admin/uploads/${encodeURIComponent(item.id)}/replace`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png', ...auth() },
      body: new Uint8Array(nextBytes),
    })
    assert.equal(rep.status, 200)
    const body = (await rep.json()) as { item: { url: string; size: number } }
    assert.equal(body.item.url, item.url, '替换后公开地址应保持不变')
    assert.equal(body.item.size, nextBytes.length, '替换后大小应更新')

    const pub = await fetch(`${base}${item.url}`)
    assert.equal(pub.status, 200)
    assert.deepEqual(Buffer.from(await pub.arrayBuffer()), nextBytes, '公开地址应返回新内容')

    const bad = await fetch(`${base}/api/admin/uploads/${encodeURIComponent(item.id)}/replace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf', ...auth() },
      body: new Uint8Array(nextBytes),
    })
    assert.equal(bad.status, 415, '内容类型与原扩展名不符时应拒绝')
  })
})
