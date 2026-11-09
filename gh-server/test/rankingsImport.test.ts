/**
 * 天梯榜 CSV 批量导入测试。
 *
 * 隔离：DB_PATH 指向临时 SQLite 库；临时端口启动真实 Express 应用。
 * 覆盖：指标列表 / 覆盖导入并自动排名 / ∞ 置顶 / 追加合并 / 非法输入 / 权限。
 */
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import type { Server } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app'

const tmpDir = path.join(os.tmpdir(), `gh-rankings-import-${process.pid}`)
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
process.env.BACKUP_DIR = path.join(tmpDir, 'backups')
process.env.CONTENT_STORE_PATH = path.join(tmpDir, 'legacy-content-store.json')
process.env.COLLECTION_STORE_PATH = path.join(tmpDir, 'legacy-collection-store.json')
process.env.ADMIN_RESOURCE_STORE_PATH = path.join(tmpDir, 'legacy-admin-resources.json')
process.env.AUDIT_LOG_PATH = path.join(tmpDir, 'legacy-audit-log.json')

let server: Server
let base = ''
let adminToken = ''
let operatorToken = ''

before(async () => {
  rmSync(tmpDir, { recursive: true, force: true })
  server = createApp().listen(0)
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const addr = server.address()
  assert.ok(addr && typeof addr === 'object', '服务器应监听成功')
  base = `http://127.0.0.1:${addr.port}`

  const login = async (username: string, password: string): Promise<string> => {
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
  rmSync(tmpDir, { recursive: true, force: true })
})

/** 带后台令牌请求 */
function call(token: string, method: string, url: string, body?: unknown): Promise<Response> {
  return fetch(base + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

/** 导入接口的简写 */
function importRows(token: string, body: unknown) {
  return call(token, 'POST', '/api/admin/rankings/import', body)
}

describe('天梯榜 · CSV 批量导入', () => {
  it('GET /rankings/metrics 返回全部指标与条目数', async () => {
    const res = await call(adminToken, 'GET', '/api/admin/rankings/metrics')
    assert.equal(res.status, 200)
    const data = (await res.json()) as { items: Array<{ id: string; label: string; count: number }> }
    assert.ok(data.items.length >= 7)
    const overall = data.items.find((item) => item.id === 'overall')
    assert.ok(overall)
    assert.equal(overall.label, '综合')
    assert.ok(overall.count > 0)
  })

  it('覆盖导入：按数值自动排名（2 位零填充）', async () => {
    const res = await importRows(adminToken, {
      metric: 'overall',
      mode: 'replace',
      rows: [
        { model: 'QA-LOW', name: '测试品牌', score: '10.5' },
        { model: 'QA-HIGH', name: '测试品牌', score: '99.9' },
        { model: 'QA-MID', name: '测试品牌', score: '50' },
      ],
    })
    assert.equal(res.status, 200)
    const data = (await res.json()) as { ok: boolean; imported: number; metric: { total: number } }
    assert.equal(data.ok, true)
    assert.equal(data.imported, 3)
    assert.equal(data.metric.total, 3)

    const ladder = await fetch(`${base}/api/ladder`)
    const payload = (await ladder.json()) as {
      metrics: Array<{ id: string; rows: Array<{ rank: string; model: string; score: number | null }> }>
    }
    const rows = payload.metrics.find((item) => item.id === 'overall')?.rows ?? []
    assert.deepEqual(
      rows.map((row) => row.model),
      ['QA-HIGH', 'QA-MID', 'QA-LOW'],
    )
    assert.deepEqual(
      rows.map((row) => row.rank),
      ['01', '02', '03'],
    )
  })

  it('对比度 ∞：inf 行置顶且 score 为 null', async () => {
    const res = await importRows(adminToken, {
      metric: 'contrast',
      mode: 'replace',
      rows: [
        { model: 'QA-LCD', name: '测试品牌', score: '1500' },
        { model: 'QA-OLED', name: '测试品牌', score: '∞', inf: '是' },
        { model: 'QA-IPS', name: '测试品牌', score: '900' },
      ],
    })
    assert.equal(res.status, 200)
    const ladder = await fetch(`${base}/api/ladder`)
    const payload = (await ladder.json()) as {
      metrics: Array<{ id: string; rows: Array<{ rank: string; model: string; score: number | null; inf?: boolean }> }>
    }
    const rows = payload.metrics.find((item) => item.id === 'contrast')?.rows ?? []
    assert.equal(rows[0].model, 'QA-OLED')
    assert.equal(rows[0].score, null)
    assert.equal(rows[0].inf, true)
    assert.equal(rows[2].model, 'QA-IPS')
  })

  it('追加导入：同型号覆盖、旧行保留并重新排名', async () => {
    const res = await importRows(adminToken, {
      metric: 'overall',
      mode: 'append',
      rows: [
        { model: 'QA-LOW', name: '测试品牌', score: '120' },
        { model: 'QA-NEW', name: '测试品牌', score: '5' },
      ],
    })
    assert.equal(res.status, 200)
    const data = (await res.json()) as { imported: number; metric: { total: number } }
    assert.equal(data.imported, 2)
    assert.equal(data.metric.total, 4)

    const ladder = await fetch(`${base}/api/ladder`)
    const payload = (await ladder.json()) as {
      metrics: Array<{ id: string; rows: Array<{ model: string; score: number | null }> }>
    }
    const rows = payload.metrics.find((item) => item.id === 'overall')?.rows ?? []
    assert.deepEqual(
      rows.map((row) => row.model),
      ['QA-LOW', 'QA-HIGH', 'QA-MID', 'QA-NEW'],
    )
    assert.equal(rows.find((row) => row.model === 'QA-LOW')?.score, 120)
  })

  it('中文指标名可用；operator（content 权限）可导入', async () => {
    const res = await importRows(operatorToken, {
      metric: '亮度',
      mode: 'replace',
      rows: [
        { model: 'QA-A', name: '测试品牌', score: '300' },
        { model: 'QA-B', name: '测试品牌', score: '500' },
      ],
    })
    assert.equal(res.status, 200)
  })

  it('非法输入 → 400：指标不存在 / 数值缺失 / 产品 ID 不存在 / 型号重复', async () => {
    const badMetric = await importRows(adminToken, {
      metric: '不存在',
      mode: 'replace',
      rows: [{ model: 'X', name: 'Y', score: '1' }],
    })
    assert.equal(badMetric.status, 400)

    const badScore = await importRows(adminToken, {
      metric: 'overall',
      mode: 'replace',
      rows: [{ model: 'QA-X', name: '测试品牌' }],
    })
    assert.equal(badScore.status, 400)

    const badProduct = await importRows(adminToken, {
      metric: 'overall',
      mode: 'replace',
      rows: [{ model: 'QA-X', name: '测试品牌', score: '1', productId: 'no-such-product' }],
    })
    assert.equal(badProduct.status, 400)

    const duplicate = await importRows(adminToken, {
      metric: 'overall',
      mode: 'replace',
      rows: [
        { model: 'QA-DUP', name: '测试品牌', score: '1' },
        { model: 'QA-DUP', name: '测试品牌', score: '2' },
      ],
    })
    assert.equal(duplicate.status, 400)
    const payload = (await duplicate.json()) as { errors: string[] }
    assert.ok(payload.errors[0].includes('型号重复'))
  })

  it('未登录 → 401', async () => {
    const res = await call('', 'POST', '/api/admin/rankings/import', {
      metric: 'overall',
      rows: [{ model: 'X', name: 'Y', score: '1' }],
    })
    assert.equal(res.status, 401)
  })
})
