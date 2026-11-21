/**
 * 将原官网（xxrsm.com）公开的说明书、固件与 Center 安装包导入当前站点。
 *
 * 特点：
 * - 以 deploy/legacy-downloads/catalog.json（真实抓取快照）为唯一数据源；
 * - 文件下载到本机 uploads，自动计算 SHA-256，已存在且大小一致时直接复用；
 * - 写入 SQLite 的 downloads / models 集合，可重复执行（按 id 更新，不重复插入）；
 * - 不覆盖后台新增的其它条目，只处理本次目录内的记录。
 *
 * 用法：
 *   DB_PATH=/opt/website/data/gh.sqlite UPLOAD_DIR=/opt/website/data/uploads \
 *     npx tsx scripts/import-legacy-downloads.ts
 *
 * 可选参数：
 *   --dry-run        只打印计划，不下载文件、不写数据库
 *   --skip-download  不下载文件（仅用于本地校验字段映射）
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  ALL_MODELS,
  DOWNLOAD_BRANDS,
  type DownloadHistoryEntry,
} from '../src/data/support-extra'
import {
  createCollectionItem,
  getCollectionItem,
  initCollections,
  listCollection,
  updateCollectionItem,
} from '../src/data/collectionStore'
import { resolveUploadDir } from '../src/data/uploadStore'

type ManualRow = { brand: string; model: string; size: number; updatedAt: string; url: string }
type FwFile = { file?: string; url: string; size?: string | number }
type FwHistory = { ver: string; date: string; size?: string; url: string; file?: string }
type FwTool = { file?: string; url: string }
type FwRow = {
  brand: string
  model: string
  spec?: string
  desc?: string
  ver?: string
  date?: string
  csOnly?: boolean
  latest?: FwFile[]
  history?: FwHistory[]
  tool?: FwTool[]
  changelog?: string[]
}
type ControlRow = {
  name: string
  brand: string
  version: string
  size: string
  platform: string
  updated: string
  download: string
  sha256?: string
  versions?: Array<{ v: string; date: string; notes?: string; file: string; sha256?: string }>
  compat?: string
}
type Catalog = {
  source: string
  capturedAt: string
  manuals: ManualRow[]
  firmware: FwRow[]
  control: ControlRow[]
}

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const SKIP_DOWNLOAD = args.has('--skip-download') || DRY_RUN
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const CATALOG_PATH = path.join(ROOT, 'deploy/legacy-downloads/catalog.json')

/** 在售产品型号 → 产品 id（与原站型号名精确对应时才映射） */
const PRODUCT_MODEL_MAP: Record<string, string> = {
  '27X1QE-W54': 'gh-54027x1qe',
  '27X1QE-W28': 'gh-28027x1qe',
  '32X1UE-W16': 'gh-32x1ue',
  '27X1UE-Q16': 'gh-27x1ue-q16',
  '32X1UE-Q24': 'gh-32x1ue-q24',
  '27X1QE-Q32': 'gh-27x1qe-q32',
  '27X1QE-500': 'gh-27x1qe-500',
  '27X1UE-QD': 'gh-27x1ue-qd',
  G27K: 'gh-g27k180',
}

/** 已存在的手册下载项 id（避免重复建档） */
const MANUAL_ID_MAP: Record<string, string> = {
  '27X1QE-W54': 'gh-54027x1qe-manual',
  '27X1QE-W28': 'gh-28027x1qe-manual',
  '32X1UE-W16': 'gh-32x1ue-manual',
  '27X1UE-Q16': 'gh-27x1ue-q16-manual',
  '32X1UE-Q24': 'gh-32x1ue-q24-manual',
  '27X1QE-Q32': 'gh-27x1qe-q32-manual',
  '27X1QE-500': 'gh-27x1qe-500-manual',
  '27X1UE-QD': 'gh-27x1ue-qd-manual',
  G27K: 'gh-g27k180-manual',
}

function log(message: string): void {
  console.log(message)
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').toUpperCase()
}

function sha256File(file: string): string {
  return sha256(readFileSync(file))
}

function fmtSize(bytes?: number): string {
  if (!bytes) return '待更新'
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function isoDate(raw?: string): string {
  if (!raw) return ''
  const m = raw.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (!m) return raw
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

function decodeName(fileOrUrl?: string): string {
  if (!fileOrUrl) return ''
  try {
    return decodeURIComponent(fileOrUrl.split('?')[0])
  } catch {
    return fileOrUrl.split('?')[0]
  }
}

function extOf(fileOrUrl?: string): string {
  const name = decodeName(fileOrUrl)
  const m = name.match(/\.([a-z0-9]+)$/i)
  return m ? `.${m[1].toLowerCase()}` : ''
}

function slugify(text: string): string {
  const ascii = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const hash = createHash('sha1').update(text).digest('hex').slice(0, 6)
  return ascii.length >= 3 ? `${ascii}-${hash}` : `m-${hash}`
}

/** 手册文件名里通常带有 1.0 / 1.1 这类版本号，只取扩展名前的最后一段数字 */
function versionFromFileName(file?: string): string {
  const base = decodeName(file).replace(/\.[a-z0-9]+$/i, '')
  const matches = base.match(/\d+(?:\.\d+)+/g)
  return matches?.length ? `v${matches[matches.length - 1]}` : ''
}

function cleanText(raw?: string): string {
  return (raw ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** 把原站的“[新增] …”格式转成可读的「新增：…」 */
function cleanChangelog(lines?: string[]): string[] {
  const out: string[] = []
  let section = ''
  for (const raw of lines ?? []) {
    const line = cleanText(raw)
    if (!line) continue
    const marker = line.match(/^\[(.+)\]$/)
    if (marker) {
      section = marker[1]
      continue
    }
    // 原站部分条目已写成「修复：xxx」，避免二次叠加成「修复：：xxx」
    const prefixed = section && !line.startsWith(`${section}：`) && !line.startsWith(`${section}:`)
    out.push(prefixed ? `${section}：${line}` : line)
  }
  return out
}

function categoryOf(brand: string, model: string, spec = ''): string {
  const text = `${model} ${spec}`.toUpperCase()
  if (text.includes('OLED') || text.includes('QD') || /S1Q|X1Q/.test(text)) return 'OLED 旗舰'
  if (text.includes('双模')) return '双模高刷'
  if (brand === '极创') return '电竞 IPS'
  if (/S1F|X1UP/.test(text)) return '电竞 IPS'
  return '电竞 IPS'
}

async function fetchBuffer(url: string, attempt = 1): Promise<Buffer> {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1200 * attempt))
      return fetchBuffer(url, attempt + 1)
    }
    throw new Error(`下载失败 HTTP ${res.status}: ${url}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

type DownloadResult = { fileUrl: string; bytes: number; sha256: string; reused: boolean }

const report = { reused: 0, downloaded: 0, failed: 0, skipped: 0 }
const failures: string[] = []

/**
 * 确保目标文件存在：同大小则复用；否则下载并计算 SHA-256。
 * 返回可直接写入 fileUrl 的 /uploads/<文件名>。
 */
async function ensureFile(options: {
  url: string
  fileName: string
  expectedBytes?: number
  reuseUrl?: string
}): Promise<DownloadResult | null> {
  const uploadDir = resolveUploadDir()
  const target = path.join(uploadDir, options.fileName)
  const existingUrl = options.reuseUrl || ''
  if (existingUrl.startsWith('/uploads/')) {
    const existingFile = path.join(uploadDir, path.basename(existingUrl))
    if (existsSync(existingFile)) {
      const size = statSync(existingFile).size
      if (!options.expectedBytes || size === options.expectedBytes) {
        report.reused += 1
        return { fileUrl: existingUrl, bytes: size, sha256: sha256File(existingFile), reused: true }
      }
    }
  }
  if (existsSync(target)) {
    const size = statSync(target).size
    if (!options.expectedBytes || size === options.expectedBytes) {
      report.reused += 1
      return { fileUrl: `/uploads/${options.fileName}`, bytes: size, sha256: sha256File(target), reused: true }
    }
  }
  if (SKIP_DOWNLOAD) {
    report.skipped += 1
    return options.expectedBytes
      ? { fileUrl: `/uploads/${options.fileName}`, bytes: options.expectedBytes, sha256: '', reused: false }
      : null
  }
  try {
    const buffer = await fetchBuffer(options.url)
    if (options.expectedBytes && buffer.length !== options.expectedBytes) {
      throw new Error(`大小不一致：期望 ${options.expectedBytes}，实际 ${buffer.length}`)
    }
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true })
    writeFileSync(target, buffer)
    report.downloaded += 1
    return { fileUrl: `/uploads/${options.fileName}`, bytes: buffer.length, sha256: sha256(buffer), reused: false }
  } catch (err) {
    report.failed += 1
    failures.push(`${options.fileName}: ${(err as Error).message}`)
    return null
  }
}

function toolKey(file: string): string {
  const name = decodeName(file)
  if (name.includes('SDC固件升级工具1.6')) return 'sdc-1.6'
  if (name.includes('SDC升级工具')) return 'sdc'
  if (name.includes('SL固件')) return 'sl'
  if (name.includes('极创固件')) return 'jc'
  if (name.includes('G251FE')) return 'g251fe'
  if (name.includes('固件升级工具1.2')) return 'fw-1.2'
  if (name.includes('固件升级工具')) return 'fw'
  return `tool-${slugify(name)}`
}

async function main(): Promise<void> {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8')) as Catalog
  log(`目录快照：${catalog.source}（抓取于 ${catalog.capturedAt}）`)
  log(`模式：${DRY_RUN ? 'dry-run（不写库、不下载）' : SKIP_DOWNLOAD ? 'skip-download' : '正式导入'}`)
  log(`上传目录：${resolveUploadDir()}`)

  if (!DRY_RUN) initCollections()

  const existingDownloads = DRY_RUN ? [] : (listCollection('downloads') as Array<Record<string, unknown>>)
  const existingById = new Map(existingDownloads.map((item) => [String(item.id), item]))

  const items: Array<Record<string, unknown>> = []
  const legacyModels = new Map<string, Record<string, unknown>>()

  const modelIdFor = (brand: string, model: string, category: string): string => {
    const productId = PRODUCT_MODEL_MAP[model]
    if (productId) return productId
    const id = `legacy-${slugify(`${brand}-${model}`)}`
    if (!legacyModels.has(id)) {
      legacyModels.set(id, {
        id,
        model,
        line: category,
        summary: `历史型号 · ${brand}`,
        faqs: [],
        guides: [],
      })
    }
    return id
  }

  // 升级工具：同一 URL 只下载一次
  const toolByUrl = new Map<string, { name: string; fileUrl: string; size: string; sizeBytes: number; sha256: string }>()
  for (const row of catalog.firmware) {
    for (const tool of row.tool ?? []) {
      if (!tool.url || toolByUrl.has(tool.url)) continue
      const key = toolKey(tool.file ?? tool.url)
      const ext = extOf(tool.file ?? tool.url) || '.rar'
      const fileName = `tool-${key}${ext}`
      const reuseUrl =
        key === 'sdc-1.6'
          ? '/uploads/SDC-firmware-tool-1.6.rar'
          : key === 'jc'
            ? '/uploads/JC-firmware-tool.rar'
            : ''
      const result = await ensureFile({ url: tool.url, fileName, reuseUrl })
      if (!result) continue
      const name = decodeName(tool.file ?? tool.url).replace(/\.[a-z0-9]+$/i, '')
      toolByUrl.set(tool.url, {
        name,
        fileUrl: result.fileUrl,
        size: fmtSize(result.bytes),
        sizeBytes: result.bytes,
        sha256: result.sha256,
      })
    }
  }

  // —— 说明书 ——
  for (const row of catalog.manuals) {
    const category = categoryOf(row.brand, row.model)
    const modelId = modelIdFor(row.brand, row.model, category)
    const existingId = MANUAL_ID_MAP[row.model] ?? `manual-${slugify(`${row.brand}-${row.model}`)}`
    const existing = existingById.get(existingId) as Record<string, unknown> | undefined
    const ext = extOf(row.url) || '.pdf'
    const fileName = `manual-${slugify(`${row.brand}-${row.model}`)}${ext}`
    const result = await ensureFile({
      url: row.url,
      fileName,
      expectedBytes: row.size,
      reuseUrl: typeof existing?.fileUrl === 'string' ? existing.fileUrl : '',
    })
    const version =
      (typeof existing?.version === 'string' && existing.version.startsWith('v') ? existing.version : '') ||
      versionFromFileName(decodeName(row.url).split('/').pop())

    items.push({
      id: existingId,
      name: `${row.model} 使用说明书`,
      category,
      type: 'manual',
      brand: row.brand,
      models: [modelId],
      version,
      size: fmtSize(row.size),
      date: isoDate(row.updatedAt),
      note: `适用于 ${row.brand} ${row.model}`,
      platform: '全平台',
      os: '全平台',
      releasedAt: isoDate(row.updatedAt),
      sizeBytes: row.size,
      isLatest: true,
      checksumType: 'SHA-256',
      fileUrl: result?.fileUrl ?? '',
      sha256: result?.sha256 ?? '',
    })
  }

  // —— 固件 ——
  for (const row of catalog.firmware) {
    const category = categoryOf(row.brand, row.model, `${row.spec ?? ''} ${row.desc ?? ''}`)
    const modelId = modelIdFor(row.brand, row.model, category)
    const productId = PRODUCT_MODEL_MAP[row.model]
    const id = productId ? `${productId}-firmware` : `fw-${slugify(`${row.brand}-${row.model}`)}`
    const existing = existingById.get(id) as Record<string, unknown> | undefined
    const latest = (row.latest ?? []).find((file) => Boolean(file.url))

    let main: DownloadResult | null = null
    if (latest) {
      const ext = extOf(latest.file ?? latest.url) || '.bin'
      const fileName = `fw-${slugify(`${row.brand}-${row.model}`)}-${row.ver ?? 'latest'}${ext}`
      main = await ensureFile({
        url: latest.url,
        fileName,
        reuseUrl: typeof existing?.fileUrl === 'string' ? existing.fileUrl : '',
      })
    }

    const history: DownloadHistoryEntry[] = []
    for (const old of row.history ?? []) {
      if (!old.url) continue
      const ext = extOf(old.file ?? old.url) || '.bin'
      const fileName = `fw-${slugify(`${row.brand}-${row.model}`)}-${old.ver}${ext}`
      const result = await ensureFile({ url: old.url, fileName })
      if (!result) continue
      history.push({
        version: `v${old.ver}`,
        date: isoDate(old.date),
        size: fmtSize(result.bytes),
        sizeBytes: result.bytes,
        fileUrl: result.fileUrl,
        sha256: result.sha256,
      })
    }

    const tools = (row.tool ?? [])
      .map((tool) => toolByUrl.get(tool.url))
      .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool))
      .map((tool) => ({ ...tool }))

    const changelogNotes = cleanChangelog(row.changelog)
    const changelog = row.ver && changelogNotes.length
      ? [{ version: `v${row.ver}`, date: isoDate(row.date), notes: changelogNotes }]
      : undefined

    items.push({
      id,
      name: `${row.model} 固件升级包`,
      category,
      type: 'firmware',
      brand: row.brand,
      models: [modelId],
      version: row.ver ? `v${row.ver}` : '待更新',
      size: main ? fmtSize(main.bytes) : '待更新',
      date: isoDate(row.date),
      note: cleanText(row.desc) || `适用于 ${row.model}`,
      csOnly: Boolean(row.csOnly),
      platform: 'Windows',
      os: 'Windows 10 / 11',
      releasedAt: isoDate(row.date),
      sizeBytes: main?.bytes ?? 0,
      isLatest: true,
      checksumType: 'SHA-256',
      fileUrl: main?.fileUrl ?? '',
      sha256: main?.sha256 ?? '',
      changelog,
      history: history.length ? history : undefined,
      tools: tools.length ? tools : undefined,
    })
  }

  // —— Center ——
  const control = catalog.control[0]
  if (control) {
    const centerUrl = decodeName(control.download)
    const centerFile = 'Center-1.3.4-win64-setup.exe'
    const center = await ensureFile({
      url: new URL(control.download, catalog.source).toString(),
      fileName: centerFile,
      reuseUrl: '/uploads/Center-1.3.4-win64-setup.exe',
    })
    const history: DownloadHistoryEntry[] = []
    for (const old of control.versions ?? []) {
      if (!old.file) continue
      const oldFile = `Center-${old.v.replace(/^v/, '')}-win64-setup.exe`
      const result = await ensureFile({
        url: new URL(old.file, catalog.source).toString(),
        fileName: oldFile,
        reuseUrl: `/uploads/${oldFile}`,
      })
      if (!result) continue
      history.push({
        version: old.v,
        date: isoDate(old.date),
        size: fmtSize(result.bytes),
        sizeBytes: result.bytes,
        fileUrl: result.fileUrl,
        sha256: result.sha256 || (old.sha256 ?? '').toUpperCase(),
      })
    }
    items.push({
      id: 'center-win',
      name: 'Center 显示器调校软件 · Windows 安装包',
      category: '软件',
      type: 'software',
      brand: '光魂',
      models: [ALL_MODELS],
      version: control.version,
      size: center ? fmtSize(center.bytes) : control.size,
      date: isoDate(control.updated),
      note: `支持 ${control.platform}`,
      platform: 'Windows',
      os: control.platform,
      releasedAt: isoDate(control.updated),
      sizeBytes: center?.bytes ?? 0,
      isLatest: true,
      checksumType: 'SHA-256',
      fileUrl: center?.fileUrl ?? '',
      sha256: center?.sha256 ?? (control.sha256 ?? '').toUpperCase(),
      history: history.length ? history : undefined,
    })
    log(`Center：${control.version}（${centerUrl}）`)
  }

  // —— 原站没有公开文件的两条：统一显示待更新 ——
  const pendingNotes: Record<string, string> = {
    'gh-54027x1qe-firmware': '原厂暂未公开固件文件，可在 Center 中检查更新或联系客服获取。',
    'gh-32x1ue-driver': '原厂暂未提供公开驱动文件，可联系客服获取。',
  }
  for (const [id, note] of Object.entries(pendingNotes)) {
    if (items.some((item) => item.id === id)) continue
    const existing = existingById.get(id)
    if (!existing) continue
    items.push({
      ...existing,
      brand: (typeof existing.brand === 'string' && existing.brand) || '光魂',
      version: '待更新',
      size: '待更新',
      date: '',
      releasedAt: '',
      sizeBytes: 0,
      fileUrl: '',
      sha256: '',
      note,
    })
  }

  log(`说明书：${catalog.manuals.length} 条；固件：${catalog.firmware.length} 条；下载项合计 ${items.length} 条`)
  log(`文件：复用 ${report.reused}，下载 ${report.downloaded}，跳过 ${report.skipped}，失败 ${report.failed}`)
  if (failures.length) failures.forEach((line) => log(`  ! ${line}`))

  if (DRY_RUN) {
    log('dry-run：未写入数据库。')
    return
  }

  // 先补型号，保证下载列表能派生正确的型号名
  for (const model of legacyModels.values()) {
    if (getCollectionItem('models', String(model.id))) continue
    createCollectionItem('models', model)
  }
  log(`新增历史型号：${legacyModels.size}`)

  let created = 0
  let updated = 0
  for (const item of items) {
    const id = String(item.id)
    if (getCollectionItem('downloads', id)) {
      updateCollectionItem('downloads', id, item)
      updated += 1
    } else {
      createCollectionItem('downloads', item)
      created += 1
    }
  }
  log(`下载项写入：新增 ${created}，更新 ${updated}`)
  log(`可选品牌：${DOWNLOAD_BRANDS.join(' / ')}`)

  if (report.failed > 0) {
    log('存在文件下载失败，请重试或检查网络。')
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
