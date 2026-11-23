/**
 * 补充原官网（xxrsm.com）合作体验点中当前站点缺失的门店。
 *
 * 数据源：scripts/fixtures/legacy-venues.json（2026-11-23 抓取的公开接口快照）
 * 规则：
 * - 只补缺：按「门店名 + 地址」模糊匹配；已存在记录不覆盖。
 * - 已存在但地址/省份/城市为空的记录（历史占位项）只补空字段，不动其它内容。
 * - 新增项写入 source=xxrsm 与 sourceUrl；缺少坐标时不写 lat/lng（前台列表照常展示，地图不点位）。
 * - 可重复执行：再次运行不会重复插入。
 *
 * 用法：
 *   DB_PATH=/opt/website/data/gh.sqlite npx tsx scripts/import-legacy-venues.ts
 *   npx tsx scripts/import-legacy-venues.ts --dry-run
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  createCollectionItem,
  initCollections,
  listCollection,
  updateCollectionItem,
} from '../src/data/collectionStore'
import type { VenueSummary } from '../src/data/business-extra'

type RawVenue = { id: number; store: string; prov: string; addr: string; models: string[] }
type Snapshot = { source: string; capturedAt: string; venues: RawVenue[] }

const DRY_RUN = process.argv.includes('--dry-run')
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SNAPSHOT_PATH = path.join(ROOT, 'scripts/fixtures/legacy-venues.json')

/** 归一化：去空白/标点/常见前缀，便于名称与地址比对 */
function norm(value: string): string {
  return String(value ?? '')
    .replace(/[\s\-—_()（）·,，.。、/\\]/g, '')
    .replace(/^(新疆|广西|宁夏|内蒙古|西藏|香港|澳门)/, '')
    .toLowerCase()
}

/** 地址相似度（字符二元组 Dice 系数），用于判断是否同一门店 */
function similarity(a: string, b: string): number {
  const x = norm(a)
  const y = norm(b)
  if (!x || !y) return 0
  if (x.includes(y) || y.includes(x)) return 1
  const bigrams = (text: string) => {
    const map = new Map<string, number>()
    for (let i = 0; i < text.length - 1; i += 1) {
      const key = text.slice(i, i + 2)
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }
  const left = bigrams(x)
  const right = bigrams(y)
  let overlap = 0
  let total = 0
  for (const [key, count] of left) {
    total += count
    if (right.has(key)) overlap += Math.min(count, right.get(key) ?? 0)
  }
  for (const count of right.values()) total += count
  return total === 0 ? 0 : (2 * overlap) / total
}

/** 从地址推导城市（优先「XX市」，其次「XX自治州」），失败返回空串不猜测 */
function deriveCity(addr: string): string {
  const text = String(addr ?? '').replace(/^[^省市区]{0,10}(省|自治区|特别行政区)/, '')
  const city = text.match(/([\u4e00-\u9fa5]{2,6}?)市/)
  if (city) return city[1]
  const prefecture = text.match(/([\u4e00-\u9fa5]{2,6}?)(壮族|苗族|彝族|回族|藏族|白族|傣族|景颇族|哈尼族|土家族|布依族|侗族|蒙古族|朝鲜族)*自治州/)
  return prefecture ? prefecture[1] : ''
}

/** 稳定的新增 id：xxrsm- + 归一化地址哈希，重复执行结果一致 */
function newVenueId(addr: string): string {
  return `xxrsm-${createHash('sha1').update(norm(addr)).digest('hex').slice(0, 7)}`
}

const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as Snapshot
initCollections()
const existing = listCollection('biz-venues') as VenueSummary[]

const added: string[] = []
const filled: string[] = []
const skipped: string[] = []
/** 导入前的门店数（新增后 existing 会追加，用于汇报前后对比） */
const baseCount = existing.length

// 倒序插入：createCollectionItem 置顶，倒序可保持与原站一致的展示顺序
for (const raw of [...snapshot.venues].reverse()) {
  const sameName = existing.filter((item) => norm(item.name) === norm(raw.store))
  const duplicate = sameName.find((item) => similarity(item.address, raw.addr) >= 0.55)
  if (duplicate) {
    skipped.push(`${raw.store}（${raw.addr}）`)
    continue
  }
  // 历史占位记录：同名但没有地址 → 只补空字段
  const placeholder = sameName.find((item) => !item.address)
  if (placeholder) {
    if (DRY_RUN) {
      filled.push(`${placeholder.name} ← 补地址：${raw.addr}`)
      continue
    }
    updateCollectionItem('biz-venues', placeholder.id, {
      address: raw.addr,
      province: placeholder.province || raw.prov,
      city: placeholder.city || deriveCity(raw.addr),
    })
    filled.push(`${placeholder.name} ← 补地址：${raw.addr}`)
    continue
  }
  const item = {
    id: newVenueId(raw.addr),
    name: raw.store,
    province: raw.prov,
    city: deriveCity(raw.addr),
    area: '',
    type: 'experience' as const,
    status: '营业中',
    ok: true,
    address: raw.addr,
    cover: '',
    products: raw.models,
    source: 'xxrsm' as const,
    sourceUrl: snapshot.source,
  }
  if (DRY_RUN) {
    added.push(`${raw.store}（${raw.prov} ${item.city || '城市待补'}）`)
    continue
  }
  createCollectionItem('biz-venues', item)
  existing.push(item)
  added.push(`${raw.store}（${raw.prov} ${item.city || '城市待补'}）`)
}

console.log(`数据源：${snapshot.source}（抓取于 ${snapshot.capturedAt}，共 ${snapshot.venues.length} 家）`)
console.log(`当前库：${baseCount} 家 → 导入后 ${baseCount + added.length} 家`)
console.log(`新增 ${added.length} 家${DRY_RUN ? '（预览，未写库）' : ''}`)
for (const line of added) console.log(`  + ${line}`)
console.log(`补齐 ${filled.length} 家占位记录`)
for (const line of filled) console.log(`  * ${line}`)
console.log(`跳过 ${skipped.length} 家（已存在）`)
