/**
 * 结构化数据集合存储（前后台单一数据源）——阶段 5a 起改用 SQLite。
 *
 * - 存储：单库 `data/gh.sqlite`（`DB_PATH` 可覆盖）中的 `collections` 表；旧
 *   `data/collection-store.json` 仅在首次启动时被一次性导入（不删除）。
 * - 启动：某集合 key 无记录时用现有前台数据模块导出生成 seed 并写入。
 *   逐 key 装载：已有记录原样保留，缺失的 key 用 seed 回填；**已有记录缺失的新增字段**按 seed 追加式补齐
 *   （仅补 `undefined`，不覆盖已有值；如 `articles.body` / `downloads.fileUrl`），实现结构演进不丢已有写入。
 * - 写入：任一新建 / 更新 / 删除后立即**事务落库**；`createCollectionItem` 置顶（sort 取当前最小值 -1）。
 * - 规范形状 = 前台现有形状（products.ts / articles.ts / ladder.ts / support*.ts / business*.ts / auth.ts 导出）。
 */
import type { DatabaseSync } from 'node:sqlite'
import { logger } from '../lib/logger'
import { getDb, resolveDbPath, runInTransaction } from './db'
import { buildCollectionEnOverlays } from './collectionSeedEn'
import { DEFAULT_LOCALE, localizeRecord, type Locale } from './locale'
import { PRODUCTS, type Product } from './products'
import { LADDER_METRICS, type LadderMetric } from './ladder'
import { ARTICLES, type ArticleSummary } from './articles'
import {
  DOWNLOAD_ITEMS,
  FAQ_ITEMS,
  MODEL_SUPPORTS,
  type DownloadItem,
  type FaqItem,
  type ModelSupport,
} from './support-extra'
import {
  BIZ_CASES,
  BIZ_SCENES,
  BIZ_VENUES,
  type CaseSummary,
  type SceneItem,
  type VenueSummary,
} from './business-extra'
import { INQUIRIES, type InquirySummary } from './auth'
import { TEMPLATES, type TemplateItem } from './templates'
import { LEGAL_DOCS, type LegalDoc } from './legal'
import { TAXONOMY_ITEMS, type TaxonomyItem } from './taxonomy'
import { PRODUCT_CATEGORIES, type ProductCategoryItem } from './productCategories'
import { TEST_RECORDS, type TestRecord } from './testRecords'
import { TEST_METHODS, type TestMethod } from './methods'
import { SERVICE_SPOTS, type ServiceSpot } from './serviceInfo'
import { RESERVATIONS, type ReservationSummary } from './reservations'
import { SUBSCRIBERS, type Subscriber } from './subscribers'
import { BRAND_ASSET_ITEMS, type BrandAssetItem } from './brandAssets'

/** 集合 key（与后台栏目 key 一致） */
export type CollectionKey =
  | 'products'
  | 'rankings'
  | 'articles'
  | 'downloads'
  | 'faqs'
  | 'models'
  | 'biz-content'
  | 'biz-cases'
  | 'biz-venues'
  | 'inquiries'
  | 'templates'
  | 'legal'
  | 'taxonomy'
  | 'product-categories'
  | 'test-records'
  | 'methods'
  | 'service-info'
  | 'reservations'
  | 'subscribers'
  | 'brand-assets'

/** 集合 → 记录类型（规范形状 = 前台现有形状） */
export type CollectionMap = {
  products: Product[]
  rankings: LadderMetric[]
  articles: ArticleSummary[]
  downloads: DownloadItem[]
  faqs: FaqItem[]
  models: ModelSupport[]
  'biz-content': SceneItem[]
  'biz-cases': CaseSummary[]
  'biz-venues': VenueSummary[]
  inquiries: InquirySummary[]
  templates: TemplateItem[]
  legal: LegalDoc[]
  taxonomy: TaxonomyItem[]
  'product-categories': ProductCategoryItem[]
  'test-records': TestRecord[]
  methods: TestMethod[]
  'service-info': ServiceSpot[]
  reservations: ReservationSummary[]
  subscribers: Subscriber[]
  'brand-assets': BrandAssetItem[]
}

/** 某集合的记录类型 */
export type CollectionItem<K extends CollectionKey> = CollectionMap[K][number]

/** 集合 key 全清单（顺序固定） */
export const COLLECTION_KEYS: CollectionKey[] = [
  'products',
  'rankings',
  'articles',
  'downloads',
  'faqs',
  'models',
  'biz-content',
  'biz-cases',
  'biz-venues',
  'inquiries',
  'templates',
  'legal',
  'taxonomy',
  'product-categories',
  'test-records',
  'methods',
  'service-info',
  'reservations',
  'subscribers',
  'brand-assets',
]

/** 已就绪的数据库路径（DB_PATH 变化时需重新检查 / 回填；显式 initCollections 可重复调用） */
let readyPath = ''

/** 深拷贝（JSON 往返）：seed 与内存态解耦，避免写操作污染静态真源 */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * 生成 seed：逐一来自前台数据模块导出，**不改写文案或数据**。
 * 返回深拷贝，调用方可安全改写而不会污染模块常量。
 *
 * 双语：英文以「只读覆盖层」（`collectionSeedEn`）在读取时按 id 叠加，**不写入记录本体**，
 * 因此 seed / 落库 / 中文响应形状完全不变；英文下缺覆盖的记录回退中文。
 */
export function buildCollectionSeed(): CollectionMap {
  const seed: CollectionMap = {
    products: PRODUCTS,
    rankings: LADDER_METRICS,
    articles: ARTICLES,
    downloads: DOWNLOAD_ITEMS,
    faqs: FAQ_ITEMS,
    models: MODEL_SUPPORTS,
    'biz-content': BIZ_SCENES,
    'biz-cases': BIZ_CASES,
    'biz-venues': BIZ_VENUES,
    inquiries: INQUIRIES,
    templates: TEMPLATES,
    legal: LEGAL_DOCS,
    taxonomy: TAXONOMY_ITEMS,
    'product-categories': PRODUCT_CATEGORIES,
    'test-records': TEST_RECORDS,
    methods: TEST_METHODS,
    'service-info': SERVICE_SPOTS,
    reservations: RESERVATIONS,
    subscribers: SUBSCRIBERS,
    'brand-assets': BRAND_ASSET_ITEMS,
  }
  return clone(seed)
}

/** 英文覆盖层（懒加载并缓存：模块常量，进程内不变） */
let enOverlayCache: ReturnType<typeof buildCollectionEnOverlays> | null = null
function enOverlays(): ReturnType<typeof buildCollectionEnOverlays> {
  if (!enOverlayCache) enOverlayCache = buildCollectionEnOverlays()
  return enOverlayCache
}

/**
 * 初始化（或重新检查）集合存储：为**无记录**的集合 key 用 seed 回填。
 * 每次调用都会检查，便于测试模拟「重启」；已有写入一律保留。
 */
export function initCollections(): void {
  getDb()
  const seed = buildCollectionSeed()
  let backfilled = 0
  let fieldPatched = 0
  runInTransaction((tx) => {
    const insert = tx.prepare('INSERT INTO collections(key, id, data, sort) VALUES(?, ?, ?, ?)')
    for (const key of COLLECTION_KEYS) {
      const count = (tx.prepare('SELECT COUNT(*) AS n FROM collections WHERE key = ?').get(key) as { n: number }).n
      if (count > 0) {
        // 已有记录：做**追加式字段回填**——seed 中新增的字段（如 articles.body / downloads.fileUrl）
        // 若记录缺失则用 seed 默认值补齐（**不覆盖**已有值），实现「结构演进不丢已有写入」。
        if (key === 'articles' || key === 'downloads' || key === 'products') fieldPatched += backfillMissingFields(tx, key, seed[key])
        continue
      }
      seed[key].forEach((record, index) => insert.run(key, record.id, JSON.stringify(record), index))
      backfilled += 1
    }
  })
  readyPath = resolveDbPath()
  if (backfilled > 0) logger.info('结构化数据集合已由 seed 回填', { keys: backfilled })
  if (fieldPatched > 0) logger.info('结构化数据集合已追加式补齐新增字段', { records: fieldPatched })
}

/** 追加式字段回填：按 id 用 seed 记录补齐既有记录**缺失**的字段（仅 `undefined`，不覆盖已有值）；返回修补条数 */
function backfillMissingFields(tx: DatabaseSync, key: CollectionKey, seedRecords: ReadonlyArray<{ id: string }>): number {
  const seedById = new Map(seedRecords.map((record) => [record.id, record as unknown as Record<string, unknown>]))
  const rows = tx.prepare('SELECT id, data FROM collections WHERE key = ?').all(key) as Array<{ id: string; data: string }>
  let patched = 0
  const update = tx.prepare('UPDATE collections SET data = ? WHERE key = ? AND id = ?')
  for (const row of rows) {
    const seedRecord = seedById.get(row.id)
    if (!seedRecord) continue
    let current: Record<string, unknown>
    try {
      current = JSON.parse(row.data) as Record<string, unknown>
    } catch {
      continue
    }
    let changed = false
    for (const [field, value] of Object.entries(seedRecord)) {
      if (current[field] === undefined) {
        current[field] = value
        changed = true
      }
    }
    if (changed) {
      update.run(JSON.stringify(current), key, row.id)
      patched += 1
    }
  }
  return patched
}

/** 内部取用（确保已初始化；DB_PATH 变化时重新检查） */
function data(): void {
  if (readyPath !== resolveDbPath()) initCollections()
}

/** 以通用记录视角取某集合（供写操作） */
type CollectionRecord = { id: string } & Record<string, unknown>

/** 生成稳定且可读的新 id */
function newId(key: string): string {
  return `${key}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** 判断字符串是否为受支持的集合 key */
export function isCollectionKey(key: string): key is CollectionKey {
  return (COLLECTION_KEYS as string[]).includes(key)
}

/* ---------------- 读取 ---------------- */

/** 应用英文覆盖层（locale='en' 且该 id 有覆盖时浅合并；否则原样）——记录本体不含 `en`，故中文形状不变 */
function applyEnOverlay(key: CollectionKey, record: Record<string, unknown>, locale: Locale): Record<string, unknown> {
  if (locale !== 'en') return record
  const overlay = enOverlays()[key]?.[String(record.id)]
  return overlay ? { ...record, ...overlay } : record
}

/** 列出某集合全部记录（规范形状；按 sort 升序，sort 越小越靠前 / 越新）。
 *  locale='en' 时叠加英文覆盖层（缺覆盖回退中文）。 */
export function listCollection<K extends CollectionKey>(key: K, locale: Locale = DEFAULT_LOCALE): CollectionMap[K] {
  data()
  const rows = getDb()
    .prepare('SELECT data FROM collections WHERE key = ? ORDER BY sort ASC, rowid ASC')
    .all(key) as Array<{ data: string }>
  const records = rows.map((row) => localizeRecord(applyEnOverlay(key, JSON.parse(row.data) as Record<string, unknown>, locale), locale))
  return records as CollectionMap[K]
}

/** 按 id 取单条记录；未命中返回 undefined。locale 语义同 `listCollection`。 */
export function getCollectionItem<K extends CollectionKey>(
  key: K,
  id: string,
  locale: Locale = DEFAULT_LOCALE,
): CollectionItem<K> | undefined {
  data()
  const row = getDb().prepare('SELECT data FROM collections WHERE key = ? AND id = ?').get(key, id) as
    | { data: string }
    | undefined
  if (!row) return undefined
  const record = JSON.parse(row.data) as Record<string, unknown>
  return localizeRecord(applyEnOverlay(key, record, locale), locale) as CollectionItem<K>
}

/* ---------------- 写入 ---------------- */

/** 新建记录：id 缺失或冲突时自动生成；写入后立即事务落库（置顶） */
export function createCollectionItem<K extends CollectionKey>(
  key: K,
  input: Record<string, unknown>,
): CollectionItem<K> {
  data()
  const db = getDb()
  const requested = typeof input.id === 'string' ? input.id.trim() : ''
  const conflict = requested
    ? (db.prepare('SELECT 1 AS x FROM collections WHERE key = ? AND id = ?').get(key, requested) as { x: number } | undefined)
    : undefined
  const id = requested && !conflict ? requested : newId(key)
  const item: CollectionRecord = { ...input, id }
  runInTransaction((tx) => {
    const min = (tx.prepare('SELECT COALESCE(MIN(sort), 0) AS m FROM collections WHERE key = ?').get(key) as { m: number }).m
    tx.prepare('INSERT INTO collections(key, id, data, sort) VALUES(?, ?, ?, ?)').run(key, id, JSON.stringify(item), min - 1)
  })
  return item as CollectionItem<K>
}

/** 更新记录（浅合并 patch，id 不可改）；未命中返回 undefined；写入后立即事务落库 */
export function updateCollectionItem<K extends CollectionKey>(
  key: K,
  id: string,
  patch: Record<string, unknown>,
): CollectionItem<K> | undefined {
  data()
  const row = getDb().prepare('SELECT data FROM collections WHERE key = ? AND id = ?').get(key, id) as
    | { data: string }
    | undefined
  if (!row) return undefined
  const current = JSON.parse(row.data) as CollectionRecord
  const next: CollectionRecord = { ...current, ...patch, id }
  runInTransaction((tx) => {
    tx.prepare('UPDATE collections SET data = ? WHERE key = ? AND id = ?').run(JSON.stringify(next), key, id)
  })
  return next as CollectionItem<K>
}

/** 删除记录；返回是否命中；写入后立即事务落库 */
export function deleteCollectionItem(key: CollectionKey, id: string): boolean {
  data()
  const result = runInTransaction((tx) => tx.prepare('DELETE FROM collections WHERE key = ? AND id = ?').run(key, id))
  return Number(result.changes) > 0
}

/** 将某集合重置为 seed（深拷贝自现有前台数据模块）；写入后立即事务落库 */
export function resetCollection<K extends CollectionKey>(key: K): CollectionMap[K] {
  data()
  const seed = buildCollectionSeed()
  const records = seed[key]
  runInTransaction((tx) => {
    tx.prepare('DELETE FROM collections WHERE key = ?').run(key)
    const insert = tx.prepare('INSERT INTO collections(key, id, data, sort) VALUES(?, ?, ?, ?)')
    records.forEach((record, index) => insert.run(key, record.id, JSON.stringify(record), index))
  })
  return records as CollectionMap[K]
}

/** 将全部集合重置为 seed（清空后按 seed 重建，单事务）；供后台「重置为初始」使用 */
export function resetAllCollections(): void {
  data()
  const seed = buildCollectionSeed()
  runInTransaction((tx) => {
    tx.prepare('DELETE FROM collections').run()
    const insert = tx.prepare('INSERT INTO collections(key, id, data, sort) VALUES(?, ?, ?, ?)')
    for (const key of COLLECTION_KEYS) {
      seed[key].forEach((record, index) => insert.run(key, record.id, JSON.stringify(record), index))
    }
  })
  logger.info('结构化数据集合已重置为 seed', { keys: COLLECTION_KEYS.length })
}
