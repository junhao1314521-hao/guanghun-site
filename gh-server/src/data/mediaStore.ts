/**
 * 素材库「文件夹 + 分类」存储（PRD 后台改造）。
 *
 * - 磁盘层仍由 `uploadStore.ts` 负责（文件字节落 `data/uploads/`）；
 *   本模块只维护**虚拟目录**与**文件元数据**，存于 SQLite（`data/gh.sqlite`）：
 *   - `upload_folders`：虚拟文件夹（支持 `parent_id` 一层以上的树形），不映射磁盘目录；
 *   - `upload_meta`：按素材 id（磁盘文件名）记录 `folder_id` 与 `category` 覆盖值。
 * - 分类（category）：`image|icon|doc|video|other`，缺省由 MIME 自动推导；`upload_meta.category`
 *   非空时作为**手工覆盖**优先返回（见 `categoryOf` / `toMediaItem`）。
 * - 未分类：`upload_meta` 无记录或 `folder_id` 为 NULL 均视为「未分类」（folderId = null）。
 * - 幂等：`syncMediaMeta()` 在启动时为磁盘上已有但缺少元数据的文件补 `folder_id=null` +
 *   自动推导 `category`（`INSERT OR IGNORE`，重复调用无副作用）。
 * - 删除文件夹策略：将其内文件移入「未分类」，其子文件夹上提一层（不级联删除）。
 */
import { randomBytes } from 'node:crypto'
import { getDb, runInTransaction } from './db'
import { listUploads, type UploadItem } from './uploadStore'
import { hiddenUploadIds } from './trashStore'

/** 素材分类（稳定键；中文标签见 `CATEGORY_LABELS`） */
export type MediaCategory = 'image' | 'icon' | 'doc' | 'video' | 'other'

/** 全部分类（固定顺序，供筛选 UI 使用） */
export const MEDIA_CATEGORIES: readonly MediaCategory[] = ['image', 'icon', 'doc', 'video', 'other']

/** 分类键 → 中文标签 */
export const CATEGORY_LABELS: Record<MediaCategory, string> = {
  image: '图片',
  icon: '图标',
  doc: '文档',
  video: '视频',
  other: '其它',
}

/** 判断字符串是否为合法分类键 */
export function isMediaCategory(value: string): value is MediaCategory {
  return (MEDIA_CATEGORIES as readonly string[]).includes(value)
}

/** 扩展名 → 分类兜底（MIME 缺失或无法判定时使用） */
const EXT_CATEGORY: Record<string, MediaCategory> = {
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
  gif: 'image',
  svg: 'icon',
  mp4: 'video',
  webm: 'video',
  mov: 'video',
  // 文档：PDF / 文本 / Office（Word / Excel / PPT）/ 压缩包 统一归「文档」分类
  pdf: 'doc',
  txt: 'doc',
  md: 'doc',
  csv: 'doc',
  doc: 'doc',
  docx: 'doc',
  xls: 'doc',
  xlsx: 'doc',
  ppt: 'doc',
  pptx: 'doc',
  zip: 'doc',
  rar: 'doc',
  '7z': 'doc',
}

/**
 * 由 MIME（可回退扩展名）推导分类。
 * - `image/svg+xml` → icon；其余 `image/*` → image；`video/*` → video；
 * - pdf / text / zip / office 文档 → doc；其余 → other。
 */
export function categoryOf(type: string | undefined, name?: string): MediaCategory {
  const mime = (type ?? '').split(';')[0].trim().toLowerCase()
  if (mime === 'image/svg+xml') return 'icon'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (
    mime === 'application/pdf' ||
    mime.startsWith('text/') ||
    mime.includes('zip') ||
    mime.includes('word') ||
    mime.includes('sheet') ||
    mime.includes('presentation')
  ) {
    return 'doc'
  }
  const ext = (name ?? '').split('.').pop()?.toLowerCase() ?? ''
  return EXT_CATEGORY[ext] ?? 'other'
}

/**
 * 图片尺寸变体（对主图的衍生小图）。
 * 由浏览器端 Canvas 在上传主图时生成并作为独立文件上传，此处仅记录元数据。
 */
export type MediaVariant = {
  /** 变体宽度（像素） */
  width: number
  /** 变体公开地址：/uploads/<文件名> */
  url: string
  /** 变体字节数 */
  size: number
  /** 变体 MIME 类型（如 image/webp） */
  type: string
}

/** 素材条目（含文件夹归属、分类与尺寸变体，对外形状） */
export type MediaItem = UploadItem & {
  /** 所属文件夹 id；null = 未分类 */
  folderId: string | null
  /** 分类（MIME 自动推导或手工覆盖） */
  category: MediaCategory
  /** 该主图的尺寸变体列表（无变体时为空数组，字段只增不改） */
  variants: MediaVariant[]
}

/** 文件夹条目（对外形状） */
export type FolderItem = {
  id: string
  name: string
  /** 父文件夹 id；null = 顶层 */
  parentId: string | null
  /** 排序值（越小越靠前） */
  sort: number
  createdAt: string
  /** 该文件夹内的素材数 */
  fileCount: number
}

/** 素材筛选 / 分页参数 */
export type MediaQuery = {
  /** 具体文件夹 id | 'uncategorized'（未分类）| 'all'/undefined（全部） */
  folderId?: string
  /** 分类键 */
  category?: string
  /** 关键词（匹配文件名，忽略大小写） */
  q?: string
  /** 类型：含 '/' 按 MIME 精确匹配，否则按主类型（前缀）匹配 */
  type?: string
  /** 页码（从 1 起，默认 1） */
  page?: number
  /** 每页条数（默认 200） */
  pageSize?: number
}

/** 表行类型 */
type FolderRow = { id: string; name: string; parent_id: string | null; sort: number | null; created_at: string | null }
type MetaRow = { id: string; folder_id: string | null; category: string | null }
type VariantRow = { main_id: string; url: string; width: number | null; size: number | null; type: string | null }

/** 读取全部文件元数据（按素材 id 建索引） */
function metaMap(): Map<string, MetaRow> {
  const db = getDb()
  const rows = db.prepare('SELECT id, folder_id, category FROM upload_meta').all() as MetaRow[]
  return new Map(rows.map((row) => [row.id, row]))
}

/**
 * 由公开地址还原磁盘文件名：`/uploads/<encodeURIComponent(id)>` → id。
 * 非 `/uploads/` 前缀返回 null；解码失败回退原始串（与 uploadStore.publicUrl 对称）。
 */
export function fileIdFromUrl(url: string): string | null {
  const prefix = '/uploads/'
  if (typeof url !== 'string' || !url.startsWith(prefix)) return null
  const name = url.slice(prefix.length).split(/[?#]/)[0]
  if (!name) return null
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

/** 读取全部变体（按 main_id 分组，组内按宽度升序） */
function variantsMap(): Map<string, MediaVariant[]> {
  const db = getDb()
  const rows = db
    .prepare('SELECT main_id, url, width, size, type FROM upload_variants ORDER BY width ASC')
    .all() as VariantRow[]
  const map = new Map<string, MediaVariant[]>()
  for (const row of rows) {
    const list = map.get(row.main_id) ?? []
    list.push({ width: row.width ?? 0, url: row.url, size: row.size ?? 0, type: row.type ?? '' })
    map.set(row.main_id, list)
  }
  return map
}

/** 从变体表派生「变体文件 id」集合（用于素材列表隐藏变体、文件夹计数排除） */
function variantIdSet(map: Map<string, MediaVariant[]>): Set<string> {
  const set = new Set<string>()
  for (const list of map.values()) {
    for (const variant of list) {
      const id = fileIdFromUrl(variant.url)
      if (id) set.add(id)
    }
  }
  return set
}

/** 某主图的变体列表（按宽度升序；无变体返回空数组） */
export function variantsFor(mainId: string): MediaVariant[] {
  return variantsMap().get(mainId) ?? []
}

/** 由公开地址查变体（供公开端点使用）；非 /uploads/ 或未命中返回空数组 */
export function variantsByUrl(url: string): MediaVariant[] {
  const id = fileIdFromUrl(url)
  return id ? variantsFor(id) : []
}

/** 变体文件的 id 集合（全量） */
export function variantIds(): Set<string> {
  return variantIdSet(variantsMap())
}

/** 某主图对应的变体文件 id 列表（删除主图时级联清理磁盘文件） */
export function variantFileIds(mainId: string): string[] {
  return variantsFor(mainId)
    .map((variant) => fileIdFromUrl(variant.url))
    .filter((id): id is string => Boolean(id))
}

/** 归一化单个变体入参；非法（无 /uploads/ 地址）返回 null */
function normalizeVariant(raw: unknown): MediaVariant | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as { url?: unknown; width?: unknown; size?: unknown; type?: unknown }
  if (typeof record.url !== 'string' || !record.url.startsWith('/uploads/')) return null
  const width = Math.max(0, Math.floor(Number(record.width) || 0))
  const size = Math.max(0, Math.floor(Number(record.size) || 0))
  const type = typeof record.type === 'string' ? record.type : ''
  return { width, url: record.url, size, type }
}

/**
 * 写入（整体替换）某主图的变体元数据；返回归一化并按宽度升序后的列表。
 * 去重（同 url 只保留一条），过滤非法项。
 */
export function setVariants(mainId: string, variants: unknown): MediaVariant[] {
  const list = Array.isArray(variants) ? variants : []
  const seen = new Set<string>()
  const normalized: MediaVariant[] = []
  for (const raw of list) {
    const variant = normalizeVariant(raw)
    if (!variant || seen.has(variant.url)) continue
    seen.add(variant.url)
    normalized.push(variant)
  }
  normalized.sort((a, b) => a.width - b.width)
  const now = new Date().toISOString()
  runInTransaction((tx) => {
    tx.prepare('DELETE FROM upload_variants WHERE main_id = ?').run(mainId)
    const stmt = tx.prepare(
      'INSERT INTO upload_variants(main_id, url, width, size, type, sort, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?)',
    )
    normalized.forEach((variant, index) => stmt.run(mainId, variant.url, variant.width, variant.size, variant.type, index, now))
  })
  return normalized
}

/** 删除某主图的变体元数据（删除主图时调用） */
export function deleteVariants(mainId: string): void {
  getDb().prepare('DELETE FROM upload_variants WHERE main_id = ?').run(mainId)
}

/** 磁盘素材 + 元数据 → 对外 MediaItem（分类：覆盖值优先，否则 MIME 推导） */
function toMediaItem(item: UploadItem, row: MetaRow | undefined, variants: MediaVariant[] = []): MediaItem {
  const category = row?.category && isMediaCategory(row.category) ? row.category : categoryOf(item.type, item.name)
  return { ...item, folderId: row?.folder_id ?? null, category, variants }
}

/** 单条磁盘素材 → MediaItem（供上传 / 更新端点回包使用） */
export function mediaItem(item: UploadItem): MediaItem {
  return toMediaItem(item, metaMap().get(item.id), variantsFor(item.id))
}

/**
 * 列出素材（磁盘层 + 元数据合并后按文件夹 / 分类 / 关键词 / 类型筛选，再分页）。
 * 响应 `{ items, total }`，`total` 为**筛选后总数**（非当前页条数）。
 */
export function listMedia(query: MediaQuery = {}): { items: MediaItem[]; total: number } {
  const meta = metaMap()
  const variants = variantsMap()
  // 变体文件作为独立素材落盘，但**不出现在素材列表中**（由主图的 variants 字段承载），
  // 避免素材库被同一张图的多个尺寸重复占位。
  const hidden = variantIdSet(variants)
  // 软删除（回收站中）的素材：磁盘文件保留，但列表 / 计数不可见，彻底删除后才移除。
  const softDeleted = hiddenUploadIds()
  let items = listUploads()
    .filter((item) => !hidden.has(item.id) && !softDeleted.has(item.id))
    .map((item) => toMediaItem(item, meta.get(item.id), variants.get(item.id) ?? []))

  const folderId = query.folderId
  if (folderId && folderId !== 'all') {
    items = folderId === 'uncategorized'
      ? items.filter((item) => item.folderId === null)
      : items.filter((item) => item.folderId === folderId)
  }
  if (query.category) items = items.filter((item) => item.category === query.category)
  const q = query.q?.trim().toLowerCase()
  if (q) items = items.filter((item) => item.name.toLowerCase().includes(q))
  if (query.type) {
    const type = query.type.toLowerCase()
    items = items.filter((item) =>
      type.includes('/') ? item.type.toLowerCase() === type : item.type.toLowerCase().startsWith(`${type}/`),
    )
  }

  const total = items.length
  const pageSize = query.pageSize && query.pageSize > 0 ? Math.floor(query.pageSize) : 200
  const page = query.page && query.page > 0 ? Math.floor(query.page) : 1
  const start = (page - 1) * pageSize
  return { items: items.slice(start, start + pageSize), total }
}

/* ============================================================
   文件夹 CRUD
   ============================================================ */

/** 由表行构造 FolderItem（fileCount 由调用方按磁盘有效归属计算） */
function toFolderItem(row: FolderRow, fileCount = 0): FolderItem {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    sort: row.sort ?? 0,
    createdAt: row.created_at ?? '',
    fileCount,
  }
}

/** 目录 id 是否存在 */
export function folderExists(id: string): boolean {
  const db = getDb()
  return Boolean(db.prepare('SELECT 1 FROM upload_folders WHERE id = ?').get(id))
}

/** 判断 `maybeChild` 是否为 `ancestorId` 的后代（用于阻止把文件夹移动到自身子孙下） */
function isDescendant(ancestorId: string, maybeChild: string): boolean {
  const db = getDb()
  let current: string | null = maybeChild
  const seen = new Set<string>()
  while (current) {
    if (current === ancestorId) return true
    if (seen.has(current)) return false
    seen.add(current)
    const row = db.prepare('SELECT parent_id FROM upload_folders WHERE id = ?').get(current) as { parent_id: string | null } | undefined
    current = row?.parent_id ?? null
  }
  return false
}

/** 列出全部文件夹（含文件数）+ 未分类素材数 */
export function listFolders(): { items: FolderItem[]; total: number; uncategorized: number } {
  const db = getDb()
  const rows = db.prepare('SELECT id, name, parent_id, sort, created_at FROM upload_folders ORDER BY sort ASC, created_at ASC').all() as FolderRow[]
  const meta = metaMap()
  const counts = new Map<string, number>()
  let uncategorized = 0
  const hidden = variantIds()
  const softDeleted = hiddenUploadIds()
  for (const item of listUploads()) {
    if (hidden.has(item.id)) continue // 变体文件不计入素材数
    if (softDeleted.has(item.id)) continue // 软删除（回收站中）的素材不计入文件夹计数
    const folderId = meta.get(item.id)?.folder_id ?? null
    if (folderId) counts.set(folderId, (counts.get(folderId) ?? 0) + 1)
    else uncategorized += 1
  }
  const items = rows.map((row) => toFolderItem(row, counts.get(row.id) ?? 0))
  return { items, total: items.length, uncategorized }
}

/** 新建文件夹；`parentId` 需为已存在文件夹或 null */
export function createFolder(name: string, parentId: string | null = null): FolderItem {
  const db = getDb()
  const id = `folder-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`
  const createdAt = new Date().toISOString()
  const max = (db.prepare('SELECT COALESCE(MAX(sort), 0) AS m FROM upload_folders').get() as { m: number }).m
  const sort = max + 1
  db.prepare('INSERT INTO upload_folders(id, name, parent_id, sort, created_at) VALUES(?, ?, ?, ?, ?)').run(
    id,
    name,
    parentId,
    sort,
    createdAt,
  )
  return { id, name, parentId, sort, createdAt, fileCount: 0 }
}

/**
 * 重命名 / 移动文件夹（浅合并 patch）。
 * 返回更新后的条目；未命中返回 null；移动成环（到自身或子孙下）返回 'cycle'。
 */
export function updateFolder(id: string, patch: { name?: string; parentId?: string | null }): FolderItem | null | 'cycle' {
  const db = getDb()
  const row = db.prepare('SELECT id, name, parent_id, sort, created_at FROM upload_folders WHERE id = ?').get(id) as FolderRow | undefined
  if (!row) return null
  const name = patch.name ?? row.name
  let parentId = row.parent_id
  if (patch.parentId !== undefined) {
    parentId = patch.parentId
    if (parentId !== null) {
      if (parentId === id || !folderExists(parentId) || isDescendant(id, parentId)) return 'cycle'
    }
  }
  db.prepare('UPDATE upload_folders SET name = ?, parent_id = ? WHERE id = ?').run(name, parentId, id)
  const meta = metaMap()
  const softDeleted = hiddenUploadIds()
  const fileCount = listUploads().filter(
    (item) => !softDeleted.has(item.id) && meta.get(item.id)?.folder_id === id,
  ).length
  return toFolderItem({ ...row, name, parent_id: parentId }, fileCount)
}

/**
 * 删除文件夹（非空策略：移入「未分类」）：
 * - 该文件夹内文件全部置为未分类（`folder_id = NULL`，保留分类覆盖）；
 * - 其子文件夹上提一层（parent_id 改为被删文件夹的父级），不级联删除。
 * 未命中返回 false。
 */
export function deleteFolder(id: string): boolean {
  const db = getDb()
  const row = db.prepare('SELECT id, parent_id FROM upload_folders WHERE id = ?').get(id) as { id: string; parent_id: string | null } | undefined
  if (!row) return false
  runInTransaction((tx) => {
    tx.prepare('UPDATE upload_meta SET folder_id = NULL, updated_at = ? WHERE folder_id = ?').run(new Date().toISOString(), id)
    tx.prepare('UPDATE upload_folders SET parent_id = ? WHERE parent_id = ?').run(row.parent_id, id)
    tx.prepare('DELETE FROM upload_folders WHERE id = ?').run(id)
  })
  return true
}

/* ============================================================
   文件元数据写入
   ============================================================ */

/** 设置单个文件的所属文件夹（保留已有分类覆盖） */
export function setFileFolder(id: string, folderId: string | null): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO upload_meta(id, folder_id, category, updated_at) VALUES(?, ?, NULL, ?)
     ON CONFLICT(id) DO UPDATE SET folder_id = excluded.folder_id, updated_at = excluded.updated_at`,
  ).run(id, folderId, new Date().toISOString())
}

/** 手工覆盖单个文件的分类（保留已有文件夹归属） */
export function setFileCategory(id: string, category: MediaCategory): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO upload_meta(id, folder_id, category, updated_at) VALUES(?, NULL, ?, ?)
     ON CONFLICT(id) DO UPDATE SET category = excluded.category, updated_at = excluded.updated_at`,
  ).run(id, category, new Date().toISOString())
}

/** 批量移动文件到指定文件夹（folderId 为 null 表示移入「未分类」） */
export function moveFiles(ids: string[], folderId: string | null): void {
  if (ids.length === 0) return
  const now = new Date().toISOString()
  runInTransaction((tx) => {
    const stmt = tx.prepare(
      `INSERT INTO upload_meta(id, folder_id, category, updated_at) VALUES(?, ?, NULL, ?)
       ON CONFLICT(id) DO UPDATE SET folder_id = excluded.folder_id, updated_at = excluded.updated_at`,
    )
    for (const id of ids) stmt.run(id, folderId, now)
  })
}

/** 删除单个文件的元数据（素材删除时调用） */
export function deleteFileMeta(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM upload_meta WHERE id = ?').run(id)
}

/**
 * 启动时同步：为磁盘上已有但缺少元数据的文件补 `folder_id=null` + 自动推导 `category`。
 * 幂等（`INSERT OR IGNORE`），仅在需要时写库。
 */
export function syncMediaMeta(): void {
  const items = listUploads()
  if (items.length === 0) return
  const now = new Date().toISOString()
  runInTransaction((tx) => {
    const stmt = tx.prepare('INSERT OR IGNORE INTO upload_meta(id, folder_id, category, updated_at) VALUES(?, NULL, ?, ?)')
    for (const item of items) stmt.run(item.id, categoryOf(item.type, item.name), now)
  })
}
