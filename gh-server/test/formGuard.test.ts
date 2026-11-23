/**
 * 公开表单验证码策略（after3）测试：
 * 同一来源连续失败 3 次内不要求验证码，第 4 次起要求；通过验证码后可正常登录并清零计数。
 *
 * 说明：`captchaRequired()` 在 NODE_ENV=test 下默认关闭，本用例显式设置 CAPTCHA_ENABLED=1
 * 覆盖 after3 分支；进程内计数为单实例语义（生产为单进程 systemd，多实例需网关承担）。
 */
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'

const tmpDir = path.join(os.tmpdir(), `gh-formguard-${process.pid}`)
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')
process.env.UPLOAD_DIR = path.join(tmpDir, 'uploads')
// 测试态默认关闭验证码；显式开启以覆盖 after3 策略
process.env.CAPTCHA_ENABLED = '1'

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
  delete process.env.CAPTCHA_ENABLED
  rmSync(tmpDir, { recursive: true, force: true })
})

const post = (p: string, body: unknown) =>
  fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

/** 从验证码 SVG 中提取 4 位字符（与前端展示方式一致：每个字符一个 <text>） */
function codeFromSvg(svg: string): string {
  return [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map((m) => m[1]).join('').trim()
}

describe('验证码 after3 策略', () => {
  const username = 'captcha3user'
  const password = 'Passw0rd!2026'

  it('连续失败 3 次后第 4 次要求验证码，验证通过后可登录', async () => {
    const reg = await post('/api/auth/register', {
      username,
      email: `${username}@example.com`,
      password,
    })
    assert.equal(reg.status, 201)

    // 前 2 次失败：不要求验证码；第 3 次失败后计数达到阈值，响应立即标记 captchaRequired
    for (let i = 1; i <= 3; i += 1) {
      const res = await post('/api/auth/login', { username, password: 'WrongPass!1' })
      assert.equal(res.status, 401, `第 ${i} 次失败应为 401`)
      const body = (await res.json()) as { captchaRequired?: boolean }
      assert.equal(body.captchaRequired, i >= 3, `第 ${i} 次失败 captchaRequired 应为 ${i >= 3}`)
    }

    // 第 4 次失败：checkCaptcha 先行拦截 → 400 + captchaRequired
    const blocked = await post('/api/auth/login', { username, password: 'WrongPass!1' })
    assert.equal(blocked.status, 400)
    const blockedBody = (await blocked.json()) as { captchaRequired?: boolean; error?: string }
    assert.equal(blockedBody.captchaRequired, true)
    assert.match(String(blockedBody.error), /验证码/)

    // 携带正确验证码 + 正确口令：登录成功
    const cap = await fetch(base + '/api/captcha')
    const capBody = (await cap.json()) as { token?: string; svg?: string }
    assert.ok(capBody.token && capBody.svg)
    const code = codeFromSvg(capBody.svg)
    assert.ok(code.length >= 3)
    const ok = await post('/api/auth/login', {
      username,
      password,
      captchaToken: capBody.token,
      captchaCode: code,
    })
    assert.equal(ok.status, 200)

    // 成功后清零：再次失败不再要求验证码
    const cleared = await post('/api/auth/login', { username, password: 'WrongPass!1' })
    assert.equal(cleared.status, 401)
    const clearedBody = (await cleared.json()) as { captchaRequired?: boolean }
    assert.equal(clearedBody.captchaRequired, false)
  })
})
