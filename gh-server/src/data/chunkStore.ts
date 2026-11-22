/**
 * 大文件分片上传（P2）。
 * ============================================================
 * 背景：单请求上传 200MB 视频 / 300MB 安装包在弱网下极易失败，且无法续传。
 * 方案：客户端把文件切成固定大小分片，逐片上传；服务端按 `uploadId` 暂存，
 * 收齐后合并成完整字节流，复用 `saveUpload` 的校验 / 落盘 / 元数据链路。
 *
 * 目录：上传目录的**同级** `.upload-chunks/<uploadId>/`（不在公开 /uploads 下，避免被直接访问）。
 * 结构：`meta.json` + `<index>.part`；超过 24 小时未完成的目录在下次 init 时清理。
 * 安全：uploadId 为 32 位十六进制，且所有路径都经 `path.resolve` 前缀校验，避免目录穿越。
 */
import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { precheckUpload, resolveUploadDir, type UploadPrecheck } from './uploadStore'

/** 分片大小：5MB（小尺寸文件只会有 1 片） */
export const CHUNK_SIZE = 5 * 1024 * 1024
/** 未完成分片保留时长：24 小时 */
const CHUNK_TTL_MS = 24 * 60 * 60 * 1000
/** uploadId 形态：32 位小写十六进制 */
const ID_PATTERN = /^[a-f0-9]{32}$/

type ChunkMeta = {
  id: string
  name: string
  size: number
  mime: string
  folderId: string | null
  createdAt: string
}

export type ChunkInitInput = {
  name: string
  size: number
  mime?: string
  folderId?: string | null
}

export type ChunkInitResult =
  | { ok: true; uploadId: string; chunkSize: number; totalChunks: number; received: number[] }
  | { ok: false; status: number; error: string }

export type ChunkStatus = {
  uploadId: string
  name: string
  size: number
  chunkSize: number
  totalChunks: number
  received: number[]
  complete: boolean
}

export type ChunkWriteResult = { ok: true; received: number[] } | { ok: false; status: number; error: string }

/** 分片根目录（上传目录同级，避免公开访问） */
function chunksRoot(): string {
  const root = path.join(path.dirname(resolveUploadDir()), '.upload-chunks')
  mkdirSync(root, { recursive: true })
  return root
}

/** uploadId → 分片目录（校验 id 并确保仍位于根目录内） */
function chunkDir(uploadId: string): string | null {
  if (!ID_PATTERN.test(uploadId)) return null
  const root = chunksRoot()
  const dir = path.resolve(root, uploadId)
  return dir.startsWith(root + path.sep) ? dir : null
}

/** 读取 meta.json；缺失或损坏返回 undefined */
function readMeta(dir: string): ChunkMeta | undefined {
  const file = path.join(dir, 'meta.json')
  if (!existsSync(file)) return undefined
  try {
    const meta = JSON.parse(readFileSync(file, 'utf8')) as ChunkMeta
    return meta && typeof meta.size === 'number' && typeof meta.name === 'string' ? meta : undefined
  } catch {
    return undefined
  }
}

/** 已收到的分片下标（升序） */
function receivedIndexes(dir: string): number[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .map((name) => /^(\d+)\.part$/.exec(name))
    .filter((matched): matched is RegExpExecArray => Boolean(matched))
    .map((matched) => Number(matched[1]))
    .sort((a, b) => a - b)
}

/** 清理超过保留期的未完成分片（best-effort，不阻断上传） */
function cleanupStale(root: string): void {
  const now = Date.now()
  for (const name of readdirSync(root)) {
    if (!ID_PATTERN.test(name)) continue
    const dir = path.join(root, name)
    try {
      if (now - statSync(dir).mtimeMs > CHUNK_TTL_MS) rmSync(dir, { recursive: true, force: true })
    } catch {
      // 并发删除 / 权限问题：忽略，下次再试
    }
  }
}

/** 初始化分片上传：复用单文件上传的扩展名 / MIME / 大小预检 */
export function initChunkUpload(input: ChunkInitInput): ChunkInitResult {
  const check: UploadPrecheck = precheckUpload(input.name, input.size, input.mime)
  if (!check.ok) return check
  const root = chunksRoot()
  cleanupStale(root)
  const uploadId = randomBytes(16).toString('hex')
  const dir = path.join(root, uploadId)
  mkdirSync(dir, { recursive: true })
  const meta: ChunkMeta = {
    id: uploadId,
    name: check.safeName,
    size: input.size,
    mime: check.mime,
    folderId: input.folderId ?? null,
    createdAt: new Date().toISOString(),
  }
  writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta))
  return {
    ok: true,
    uploadId,
    chunkSize: CHUNK_SIZE,
    totalChunks: Math.ceil(input.size / CHUNK_SIZE),
    received: [],
  }
}

/** 查询分片状态（用于断点续传：刷新 / 重试后看哪些片已收） */
export function chunkUploadStatus(uploadId: string): ChunkStatus | undefined {
  const dir = chunkDir(uploadId)
  if (!dir) return undefined
  const meta = readMeta(dir)
  if (!meta) return undefined
  const totalChunks = Math.ceil(meta.size / CHUNK_SIZE)
  const received = receivedIndexes(dir)
  return {
    uploadId,
    name: meta.name,
    size: meta.size,
    chunkSize: CHUNK_SIZE,
    totalChunks,
    received,
    complete: received.length === totalChunks,
  }
}

/** 写入单个分片（幂等覆盖）；下标或长度非法时拒绝 */
export function putChunk(uploadId: string, index: number, bytes: Buffer): ChunkWriteResult {
  const dir = chunkDir(uploadId)
  if (!dir) return { ok: false, status: 400, error: '上传 ID 不合法' }
  const meta = readMeta(dir)
  if (!meta) return { ok: false, status: 404, error: '分片任务不存在或已过期' }
  const totalChunks = Math.ceil(meta.size / CHUNK_SIZE)
  if (!Number.isInteger(index) || index < 0 || index >= totalChunks) {
    return { ok: false, status: 400, error: `分片下标应在 0–${totalChunks - 1} 之间` }
  }
  if (bytes.length === 0) return { ok: false, status: 400, error: '分片内容为空' }
  if (bytes.length > CHUNK_SIZE) {
    return { ok: false, status: 413, error: `单个分片不能超过 ${Math.round(CHUNK_SIZE / 1024 / 1024)}MB` }
  }
  // 除最后一片外必须满片，避免客户端算错分片边界导致合并后内容错位
  if (index < totalChunks - 1 && bytes.length !== CHUNK_SIZE) {
    return { ok: false, status: 422, error: '非最后一片的大小必须为 5MB' }
  }
  const part = path.join(dir, `${index}.part`)
  const temp = path.join(dir, `.${index}-${randomBytes(4).toString('hex')}.tmp`)
  writeFileSync(temp, bytes)
  renameSync(temp, part)
  return { ok: true, received: receivedIndexes(dir) }
}

export type ChunkAssembleResult =
  | { ok: true; meta: ChunkMeta; bytes: Buffer; sha256: string }
  | { ok: false; status: number; error: string; missing?: number[] }

/** 合并分片：校验齐全与总大小；返回完整字节流（不落正式上传目录） */
export function assembleChunks(uploadId: string): ChunkAssembleResult {
  const dir = chunkDir(uploadId)
  if (!dir) return { ok: false, status: 400, error: '上传 ID 不合法' }
  const meta = readMeta(dir)
  if (!meta) return { ok: false, status: 404, error: '分片任务不存在或已过期' }
  const totalChunks = Math.ceil(meta.size / CHUNK_SIZE)
  const received = new Set(receivedIndexes(dir))
  const missing = Array.from({ length: totalChunks }, (_, index) => index).filter((index) => !received.has(index))
  if (missing.length > 0) {
    return { ok: false, status: 409, error: `分片未上传完整（缺少 ${missing.length} 片）`, missing }
  }
  const parts: Buffer[] = []
  for (let index = 0; index < totalChunks; index += 1) {
    parts.push(readFileSync(path.join(dir, `${index}.part`)))
  }
  const bytes = Buffer.concat(parts)
  if (bytes.length !== meta.size) {
    return { ok: false, status: 422, error: `合并后大小不一致（期望 ${meta.size}，实际 ${bytes.length}）` }
  }
  return { ok: true, meta, bytes, sha256: createHash('sha256').update(bytes).digest('hex') }
}

/** 删除分片目录（完成 / 放弃 / 失败回滚） */
export function removeChunkUpload(uploadId: string): boolean {
  const dir = chunkDir(uploadId)
  if (!dir || !existsSync(dir)) return false
  rmSync(dir, { recursive: true, force: true })
  return true
}

/** 分片任务的元信息（完成时用于取文件名 / MIME / 文件夹） */
export function chunkUploadMeta(uploadId: string): ChunkMeta | undefined {
  const dir = chunkDir(uploadId)
  return dir ? readMeta(dir) : undefined
}
