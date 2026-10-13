/**
 * 内容库启动容错测试（契约 §7）：旧 JSON 损坏 → 跳过迁移、回退 seed、DB 落库为完整 seed。
 *
 * 该文件在独立测试进程中运行，故可独占 `DB_PATH` / `CONTENT_STORE_PATH` 的初始化时机：
 * 先在顶层写入一份损坏的旧 JSON，再于测试中触发首次读取（惰性初始化）。
 *
 * 运行：npm test
 */
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, it } from 'node:test'
import { buildSeed } from '../src/data/contentSeed'
import { buildSeedEn } from '../src/data/contentSeedEn'
import { listPages } from '../src/data/contentStore'
import { getDb } from '../src/data/db'

/** 隔离的临时目录 + 独立 SQLite 库（本进程独立） */
const tmpDir = path.join(os.tmpdir(), `gh-content-store-corrupt-${process.pid}`)
const legacyFile = path.join(tmpDir, 'legacy-content-store.json')
mkdirSync(tmpDir, { recursive: true })
process.env.DB_PATH = path.join(tmpDir, 'gh.sqlite')
process.env.CONTENT_STORE_PATH = legacyFile
// 顶层：在首次读取（惰性 initStore）前写入损坏的旧 JSON
writeFileSync(legacyFile, '{ 这不是合法的 JSON ', 'utf8')

after(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

describe('内容库启动容错（契约 §7）', () => {
  it('旧 JSON 损坏 → 跳过迁移并回退 seed，且完整 seed 已落库', () => {
    const items = listPages()
    assert.equal(items.length, buildSeed().pages.length, '应回退为完整 seed 页面')

    // 完整 seed 已写入 SQLite；除中文 seed 外，还包含追加式回填的英文 `__en` 变体页
    const row = getDb().prepare('SELECT COUNT(*) AS n FROM content_pages').get() as { n: number }
    assert.equal(row.n, buildSeed().pages.length + buildSeedEn().length, 'DB 应落库完整 seed 页面及英文变体')

    // 旧 JSON 文件保持原样（不删除、不重写）
    assert.equal(readFileSync(legacyFile, 'utf8'), '{ 这不是合法的 JSON ', '旧 JSON 文件应保持不动')
  })
})
