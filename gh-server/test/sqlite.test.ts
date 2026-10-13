/**
 * SQLite 持久化测试（阶段 5a）：seed 初始化 / 重启持久化 / 旧 JSON 迁移 / 集合与审计一致性 / 连续写不丢。
 *
 * 通过 `DB_PATH` 指向独立临时库实现隔离；每个用例使用全新库文件（db.ts 在路径变化时重开连接，
 * 各 store 亦按路径重新 seed）。旧 JSON 迁移来源用临时文件精确控制。
 *
 * 运行：npm test
 */
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { after, describe, it } from 'node:test'
import { getDb } from '../src/data/db'
import { buildSeed } from '../src/data/contentSeed'
import { getPage, getSiteConfig, listPages, savePage } from '../src/data/contentStore'
import {
  buildCollectionSeed,
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from '../src/data/collectionStore'
import { getResourceItem, listResource } from '../src/data/adminResourceStore'
import { appendAudit, listAudit } from '../src/data/auditStore'

/** 本次测试进程的根临时目录 */
const root = path.join(os.tmpdir(), `gh-sqlite-${process.pid}`)
mkdirSync(root, { recursive: true })

let counter = 0

/** 切换到全新的临时 DB（旧 JSON 迁移来源默认指向不存在文件 → 由 seed 初始化） */
function freshDb(): string {
  counter += 1
  const n = counter
  const file = path.join(root, `db-${n}.sqlite`)
  process.env.DB_PATH = file
  process.env.CONTENT_STORE_PATH = path.join(root, `gone-content-${n}.json`)
  process.env.COLLECTION_STORE_PATH = path.join(root, `gone-collection-${n}.json`)
  process.env.ADMIN_RESOURCE_STORE_PATH = path.join(root, `gone-admin-${n}.json`)
  process.env.AUDIT_LOG_PATH = path.join(root, `gone-audit-${n}.json`)
  return file
}

after(() => {
  if (existsSync(root)) rmSync(root, { recursive: true, force: true })
})

describe('SQLite 持久化（阶段 5a）', () => {
  it('① 空 DB 首次启动即按 seed 初始化（内容库 / 站点 / 集合 / 后台资源）', () => {
    freshDb()
    const seed = buildSeed()
    assert.equal(listPages().length, seed.pages.length, '内容库页面应按 seed 初始化')
    assert.ok(getSiteConfig().nav.length > 0, '站点配置应按 seed 初始化')
    assert.equal(listCollection('products').length, buildCollectionSeed().products.length, '集合应按 seed 初始化')
    assert.ok((listResource('products')?.length ?? 0) > 0, '后台资源应按 seed 初始化')

    const marker = getDb().prepare('SELECT value FROM meta WHERE key = ?').get('migrated_json') as { value: string }
    assert.equal(marker.value, '1', '首次启动应写入迁移标记')
  })

  it('② 写入后重新打开 DB（独立连接）数据仍在', () => {
    const file = freshDb()
    assert.ok(getPage('home'), 'home 页应存在')
    savePage('home', { title: '首页 · SQLite 持久化' })

    // 独立连接重开同一库文件，验证数据确实落盘（而非仅内存）
    const raw = new DatabaseSync(file)
    const row = raw.prepare('SELECT data FROM content_pages WHERE key = ?').get('home') as { data: string }
    raw.close()
    assert.equal((JSON.parse(row.data) as { title: string }).title, '首页 · SQLite 持久化')
  })

  it('③ 首次启动从旧 JSON 迁移一次并标记 meta；旧文件保留且不重复导入', () => {
    counter += 1
    const n = counter
    const file = path.join(root, `mig-${n}.sqlite`)
    const contentFile = path.join(root, `mig-content-${n}.json`)
    const collectionFile = path.join(root, `mig-collection-${n}.json`)
    const adminFile = path.join(root, `mig-admin-${n}.json`)
    const auditFile = path.join(root, `mig-audit-${n}.json`)
    process.env.DB_PATH = file
    process.env.CONTENT_STORE_PATH = contentFile
    process.env.COLLECTION_STORE_PATH = collectionFile
    process.env.ADMIN_RESOURCE_STORE_PATH = adminFile
    process.env.AUDIT_LOG_PATH = auditFile

    const seed = buildSeed()
    writeFileSync(
      contentFile,
      JSON.stringify({
        pages: seed.pages.map((page) => (page.key === 'home' ? { ...page, title: '首页 · 迁移自 JSON' } : page)),
        site: seed.site,
        builtinKeys: seed.pages.map((page) => page.key),
      }),
    )
    writeFileSync(collectionFile, JSON.stringify({ products: [{ id: 'mig-p1', name: '迁移产品' }] }))
    writeFileSync(adminFile, JSON.stringify({ nav: [{ id: 'mig-n1', label: '迁移导航' }] }))
    writeFileSync(
      auditFile,
      JSON.stringify([{ id: 'mig-a1', at: '2026-01-01T00:00:00.000Z', actor: 'admin', action: 'login', target: '后台', ip: '127.0.0.1' }]),
    )

    // 首次读取触发迁移
    assert.equal(getPage('home')?.title, '首页 · 迁移自 JSON', '内容库应迁移自旧 JSON')
    assert.equal((getCollectionItem('products', 'mig-p1') as { name?: string } | undefined)?.name, '迁移产品')
    assert.equal((getResourceItem('nav', 'mig-n1') as { label?: string } | undefined)?.label, '迁移导航')
    assert.equal(listAudit().items[0]?.id, 'mig-a1')

    const marker = getDb().prepare('SELECT value FROM meta WHERE key = ?').get('migrated_json') as { value: string }
    assert.equal(marker.value, '1', '迁移完成后应标记 meta')

    // 迁移后再修改；切走再切回（模拟重启重开同一库）不应被旧 JSON 覆盖
    savePage('home', { title: '首页 · 迁移后修改' })
    process.env.DB_PATH = path.join(root, `mig-other-${n}.sqlite`)
    getDb()
    process.env.DB_PATH = file
    assert.equal(getPage('home')?.title, '首页 · 迁移后修改', '迁移为一次性，重开不应重复导入旧 JSON')

    // 旧 JSON 文件保留未删
    for (const f of [contentFile, collectionFile, adminFile, auditFile]) assert.ok(existsSync(f), `旧文件应保留：${f}`)
  })

  it('④ 集合 CRUD 与审计写入读回一致', () => {
    freshDb()
    const created = createCollectionItem('faqs', { q: '临时问答', a: '答案', category: '测试' })
    assert.ok(created.id, '新建记录应有 id')
    assert.equal(getCollectionItem('faqs', created.id)?.q, '临时问答', '读回应与写入一致')

    const updated = updateCollectionItem('faqs', created.id, { a: '答案（已改）' })
    assert.equal(updated?.a, '答案（已改）')
    assert.equal(listCollection('faqs')[0].id, created.id, '新建记录应置顶')

    assert.equal(deleteCollectionItem('faqs', created.id), true)
    assert.equal(getCollectionItem('faqs', created.id), undefined, '删除后应读不到')

    const e1 = appendAudit({ actor: 'admin', action: 'update', target: 'x/1', ip: '1.2.3.4' })
    const e2 = appendAudit({ actor: 'admin', action: 'delete', target: 'x/2' })
    const { items, total } = listAudit()
    assert.equal(total, 2)
    assert.equal(items[0].id, e2.id, '最新审计应在前')
    assert.equal(items[1].id, e1.id)
    assert.equal(items[0].ip, '', '未传 ip 时应为空串')
  })

  it('⑤ 连续写不丢数据（集合 60 条 + 审计 60 条）', () => {
    freshDb()
    const count = 60
    for (let i = 0; i < count; i += 1) {
      createCollectionItem('templates', { id: `tmpl-${i}`, name: `模板 ${i}` })
      appendAudit({ actor: 'tester', action: 'create', target: `templates/tmpl-${i}` })
    }
    assert.equal(listCollection('templates').length, count, '集合写入不应丢失')
    assert.equal(listAudit().total, count, '审计写入不应丢失')

    // 独立连接复核落盘条数
    const raw = new DatabaseSync(process.env.DB_PATH as string)
    const rows = raw.prepare('SELECT COUNT(*) AS n FROM collections WHERE key = ?').get('templates') as { n: number }
    const audits = raw.prepare('SELECT COUNT(*) AS n FROM audit_log').get() as { n: number }
    raw.close()
    assert.equal(rows.n, count)
    assert.equal(audits.n, count)
  })
})
