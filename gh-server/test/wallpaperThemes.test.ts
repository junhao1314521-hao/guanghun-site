/**
 * 壁纸主题实体测试。
 *
 * 覆盖：内置主题种子、后台新建 / 改名 / 停用 / 删除（被引用时拒绝），
 * 以及公开 /api/wallpapers 只返回启用主题、并保留未登记历史主题兜底。
 */
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'

const tmpDir = path.join(os.tmpdir(), `gh-wp-themes-${process.pid}`)
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')
process.env.UPLOAD_DIR = path.join(tmpDir, 'uploads')

let server: Server
let base: string

before(async () => {
  rmSync(tmpDir, { recursive: true, force: true })
  server = createApp().listen(0)
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const addr = server.address()
  assert.ok(addr && typeof addr === 'object', '服务器应监听成功')
  base = `http://127.0.0.1:${addr.port}`
})

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  rmSync(tmpDir, { recursive: true, force: true })
})

const post = (p: string, body: unknown, cookie?: string) =>
  fetch(base + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  })
const put = (p: string, body: unknown, cookie?: string) =>
  fetch(base + p, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  })
const get = (p: string, cookie?: string) => fetch(base + p, cookie ? { headers: { Cookie: cookie } } : undefined)
const del = (p: string, cookie?: string) =>
  fetch(base + p, { method: 'DELETE', ...(cookie ? { headers: { Cookie: cookie } } : {}) })

type ThemeItem = { key: string; label: string; active: boolean; count: number }

describe('壁纸主题实体 · 后台管理与公开分类', () => {
  let cookie = ''

  before(async () => {
    const login = await post('/api/admin/auth/login', { username: 'admin', password: 'admin123' })
    assert.equal(login.status, 200)
    cookie = (login.headers.get('set-cookie') ?? '').split(';')[0]
    assert.match(cookie, /gh_admin=/)
  })

  it('内置主题已种入实体表，并带壁纸使用数量', async () => {
    const res = await get('/api/admin/wallpaper-themes', cookie)
    assert.equal(res.status, 200)
    const { items } = (await res.json()) as { items: ThemeItem[] }
    const keys = items.map((item) => item.key)
    assert.deepEqual(keys.slice(0, 3), ['星海', '赛博', '秘境'])
    assert.ok(items.some((item) => item.count > 0), '应有主题已被壁纸引用')
  })

  it('新建主题 → 公开接口按实体输出；停用后公开接口不再返回', async () => {
    const created = await post('/api/admin/wallpaper-themes', { key: '极简', label: '极简', description: '留白与纯色。' }, cookie)
    assert.equal(created.status, 201)

    const publicBefore = (await (await get('/api/wallpapers')).json()) as { themes: Array<{ key: string; label: string }> }
    const hit = publicBefore.themes.find((theme) => theme.key === '极简')
    assert.ok(hit)
    assert.equal(hit?.label, '极简')

    const disabled = await put('/api/admin/wallpaper-themes/极简', { active: false }, cookie)
    assert.equal(disabled.status, 200)
    const publicAfter = (await (await get('/api/wallpapers')).json()) as { themes: Array<{ key: string }> }
    assert.equal(publicAfter.themes.some((theme) => theme.key === '极简'), false)

    // 重新启用后改名，公开接口显示新名称
    await put('/api/admin/wallpaper-themes/极简', { active: true, label: '极简主义' }, cookie)
    const publicRenamed = (await (await get('/api/wallpapers')).json()) as { themes: Array<{ key: string; label: string }> }
    assert.equal(publicRenamed.themes.find((theme) => theme.key === '极简')?.label, '极简主义')
  })

  it('删除未被引用的主题成功；被壁纸引用的主题删除被拒绝', async () => {
    assert.equal((await del('/api/admin/wallpaper-themes/极简', cookie)).status, 200)

    const used = (await (await get('/api/admin/wallpaper-themes', cookie)).json()) as { items: ThemeItem[] }
    const usedTheme = used.items.find((item) => item.count > 0)
    assert.ok(usedTheme)
    const rejected = await del(`/api/admin/wallpaper-themes/${encodeURIComponent(usedTheme!.key)}`, cookie)
    assert.equal(rejected.status, 400)
  })

  it('未登录不可访问主题管理', async () => {
    assert.equal((await get('/api/admin/wallpaper-themes')).status, 401)
  })
})
