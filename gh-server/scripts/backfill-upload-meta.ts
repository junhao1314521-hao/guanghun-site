/**
 * 一次性回填：素材库元数据 + 下载资料 assetId。
 *
 * - 扫描 UPLOAD_DIR（默认 gh-server/data/uploads），为每个文件补：
 *   kind / size_bytes / sha256 / mime / visibility / status；
 * - usage_scope 按引用来源回填：downloads → download，products → product，其余 other；
 * - 下载资料中 fileUrl 为 /uploads/<文件> 的记录补 assetId（= 文件名），
 *   isLatest 缺省补 true，releaseNotes 缺省补空串。
 *
 * 可重复执行：已有 kind 不会被覆盖，其余字段按磁盘实况刷新。
 * 运行：cd gh-server && npm run backfill:uploads
 */
import { createReadStream, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { getDb } from '../src/data/db'
import { kindOfFile, mimeOfFile, resolveUploadDir } from '../src/data/uploadStore'

type Row = { key: string; id: string; data: string }

async function sha256File(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(file)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

function decodeUploadId(url: string): string | null {
  if (!url.startsWith('/uploads/')) return null
  const raw = url.slice('/uploads/'.length).split(/[?#]/)[0]
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

async function main(): Promise<void> {
  const dropExternal = process.argv.includes('--drop-external')
  const db = getDb()
  const dir = resolveUploadDir()
  const files = readdirSync(dir).filter((name) => !name.startsWith('.') && statSync(path.join(dir, name)).isFile())

  const downloadRows = db.prepare("SELECT key, id, data FROM collections WHERE key = 'downloads'").all() as Row[]
  const productRows = db.prepare("SELECT key, id, data FROM collections WHERE key = 'products'").all() as Row[]
  const downloadText = downloadRows.map((row) => row.data).join('\n')
  const productText = productRows.map((row) => row.data).join('\n')

  const upsert = db.prepare(
    `INSERT INTO upload_meta(id, kind, usage_scope, size_bytes, sha256, mime, visibility, status, updated_at)
     VALUES(?, ?, ?, ?, ?, ?, 'public', 'active', ?)
     ON CONFLICT(id) DO UPDATE SET
       kind = COALESCE(upload_meta.kind, excluded.kind),
       usage_scope = excluded.usage_scope,
       size_bytes = excluded.size_bytes,
       sha256 = excluded.sha256,
       mime = excluded.mime,
       updated_at = excluded.updated_at`,
  )

  let updated = 0
  for (const filename of files) {
    const full = path.join(dir, filename)
    const stat = statSync(full)
    const sha256 = await sha256File(full)
    const usage = downloadText.includes(filename) ? 'download' : productText.includes(filename) ? 'product' : 'other'
    upsert.run(filename, kindOfFile(filename), usage, stat.size, sha256, mimeOfFile(filename), new Date().toISOString())
    updated += 1
  }

  // 下载资料补 assetId / isLatest / releaseNotes
  const updateDownload = db.prepare("UPDATE collections SET data = ? WHERE key = 'downloads' AND id = ?")
  let downloadsUpdated = 0
  for (const row of downloadRows) {
    let item: Record<string, unknown>
    try {
      item = JSON.parse(row.data) as Record<string, unknown>
    } catch {
      continue
    }
    const url = typeof item.fileUrl === 'string' ? item.fileUrl : ''
    let changed = false
    // 已确认不做任意外链：可选清理历史外链（清空后前台显示「待更新」）
    if (dropExternal && /^https?:\/\//i.test(url)) {
      delete item.fileUrl
      delete item.assetId
      changed = true
    }
    const assetId = decodeUploadId(typeof item.fileUrl === 'string' ? item.fileUrl : '')
    if (assetId && item.assetId !== assetId) {
      item.assetId = assetId
      changed = true
    }
    if (item.isLatest === undefined) {
      item.isLatest = true
      changed = true
    }
    if (item.releaseNotes === undefined) {
      item.releaseNotes = ''
      changed = true
    }
    if (changed) {
      updateDownload.run(JSON.stringify(item), row.id)
      downloadsUpdated += 1
    }
  }

  console.log(
    JSON.stringify(
      {
        files: files.length,
        uploadMetaUpdated: updated,
        downloads: downloadRows.length,
        downloadsUpdated,
        downloadWithAssetId: downloadRows.filter((row) => {
          try {
            return Boolean(decodeUploadId(String((JSON.parse(row.data) as { fileUrl?: string }).fileUrl ?? '')))
          } catch {
            return false
          }
        }).length,
      },
      null,
      2,
    ),
  )
}

await main()
