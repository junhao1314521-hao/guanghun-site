/**
 * 文件上传与素材库存储（零依赖，无 multipart 解析）。
 *
 * - 落盘目录：`gh-server/data/uploads`（可由环境变量 `UPLOAD_DIR` 覆盖，便于测试隔离）。
 * - 文件名安全化：仅取最后一段（去除路径分隔符 / 目录穿越），危险字符替换为 `_`，
 *   生成稳定唯一名 `时间戳-随机-安全原名`，保留原扩展名。
 * - 白名单：扩展名 + 内容类型双重校验；脚本 / 可执行 / 可内联执行类（如 .js/.mjs/.html）一律拒绝（415）；
 *   允许常见图片 / 文档扩展名（含 .svg，但要求 Content-Type 为 image/svg+xml）。
 * - 元数据（大小 / 类型 / 上传时间）直接从磁盘派生，无需额外索引文件；空目录天然返回空列表。
 */
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** 素材条目（对外形状，对齐上传契约） */
export type UploadItem = {
  /** 稳定标识：即磁盘文件名（含扩展名） */
  id: string
  /** 安全化后的原始文件名 */
  name: string
  /** 公开可访问路径：/uploads/<文件名> */
  url: string
  /** 字节数 */
  size: number
  /** MIME 类型 */
  type: string
  /** 上传时间（ISO 字符串） */
  uploadedAt: string
}

/** 上传落盘结果：成功带 item，失败带 HTTP 状态与错误文案 */
export type SaveUploadResult =
  | { ok: true; item: UploadItem }
  | { ok: false; status: number; error: string }

/** 默认落盘目录：gh-server/data/uploads（相对本模块定位，避免依赖 cwd） */
const DEFAULT_DIR = fileURLToPath(new URL('../../data/uploads', import.meta.url))

/** 解析当前落盘目录（每次读取，保证测试可在初始化前注入 UPLOAD_DIR） */
export function resolveUploadDir(): string {
  return process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : DEFAULT_DIR
}

/** 确保目录存在并返回其绝对路径（启动时调用） */
export function ensureUploadDir(): string {
  const dir = resolveUploadDir()
  mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * 通用兜底 MIME：Office / 压缩包等二进制格式，浏览器常以空或 octet-stream 上报，
 * 故这些类别的白名单额外放行 `application/octet-stream`（不影响图片 / 视频 / SVG 的严格校验）。
 */
const OCTET = 'application/octet-stream'

/** 扩展名（小写，不含点）→ 允许的 MIME 白名单 */
const EXT_MIME: Record<string, string[]> = {
  // 图片
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  svg: ['image/svg+xml'],
  // 视频
  mp4: ['video/mp4'],
  webm: ['video/webm'],
  mov: ['video/quicktime'],
  // 文档 · PDF
  pdf: ['application/pdf'],
  // 文档 · 文本
  txt: ['text/plain'],
  md: ['text/markdown', 'text/x-markdown', 'text/plain'],
  csv: ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain', OCTET],
  // 文档 · Office（Word / Excel / PPT）
  doc: ['application/msword', OCTET],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', OCTET],
  xls: ['application/vnd.ms-excel', OCTET],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', OCTET],
  ppt: ['application/vnd.ms-powerpoint', OCTET],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', OCTET],
  // 压缩包
  zip: ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip', OCTET],
  rar: ['application/vnd.rar', 'application/x-rar-compressed', 'application/x-rar', OCTET],
  '7z': ['application/x-7z-compressed', OCTET],
}

/** 各扩展名的默认 MIME（请求未带 Content-Type 时回退） */
const EXT_DEFAULT_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
}

/**
 * 上传大小分档（字节）与类型标签。图片 10MB / 文档 50MB / 视频 200MB。
 * - 环境变量覆盖：`UPLOAD_MAX_SIZE_IMAGE` / `UPLOAD_MAX_SIZE_DOC` / `UPLOAD_MAX_SIZE_VIDEO`；
 * - 旧变量 `UPLOAD_MAX_SIZE`（不区分类型）作为**兜底**：当分档变量缺失时对三类同时生效。
 */
const MB = 1024 * 1024

/** 尺寸分类：图片 / 视频 / 文档（其余归文档） */
export type SizeKind = 'image' | 'video' | 'doc'

/** 各分类默认限额（字节） */
const DEFAULT_LIMITS: Record<SizeKind, number> = { image: 10 * MB, doc: 50 * MB, video: 200 * MB }

/** 分档限额对应的环境变量名 */
const LIMIT_ENV: Record<SizeKind, string> = {
  image: 'UPLOAD_MAX_SIZE_IMAGE',
  doc: 'UPLOAD_MAX_SIZE_DOC',
  video: 'UPLOAD_MAX_SIZE_VIDEO',
}

/** 分类中文标签（错误提示用） */
const LIMIT_LABEL: Record<SizeKind, string> = { image: '图片', doc: '文档', video: '视频' }

/** 解析尺寸串（如 '10mb' / '1kb' / '2097152'）为字节数；无法解析返回 null */
function parseSize(raw: string | undefined): number | null {
  if (!raw) return null
  const matched = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i.exec(raw.trim())
  if (!matched) return null
  const value = Number(matched[1])
  if (!Number.isFinite(value) || value <= 0) return null
  const unit = (matched[2] ?? 'b').toLowerCase()
  const factor = unit === 'gb' ? 1024 * MB : unit === 'mb' ? MB : unit === 'kb' ? 1024 : 1
  return Math.floor(value * factor)
}

/** 由扩展名推断尺寸分类 */
export function sizeKindOf(ext: string): SizeKind {
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) return 'image'
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video'
  return 'doc'
}

/** 指定分类的限额（字节）：分档变量优先，其次旧 UPLOAD_MAX_SIZE，最后内置默认 */
export function limitForKind(kind: SizeKind): number {
  return parseSize(process.env[LIMIT_ENV[kind]]) ?? parseSize(process.env.UPLOAD_MAX_SIZE) ?? DEFAULT_LIMITS[kind]
}

/** 三档中的最大限额（字节）；供上传解析器设置整体上限，使各类型都能到达按类型校验 */
export function maxUploadLimit(): number {
  return Math.max(limitForKind('image'), limitForKind('doc'), limitForKind('video'))
}

/** 字节数 → 可读限额（< 1MB 用 KB，否则用 MB；保留 1 位小数） */
function formatLimit(bytes: number): string {
  if (bytes < MB) return `${Math.round((bytes / 1024) * 10) / 10}KB`
  return `${Math.round((bytes / MB) * 10) / 10}MB`
}

/** 归一化 Content-Type：去掉参数（如 ; charset=utf-8）并转小写 */
function normalizeMime(raw: string | undefined): string {
  return (raw ?? '').split(';')[0].trim().toLowerCase()
}

/**
 * 安全化文件基名：
 * - 仅取最后一段（同时消除 `/` 与 `\` 路径分隔符，杜绝目录穿越）；
 * - 保留 Unicode 字母 / 数字 / `.` `_` `-`，其余（含空白）替换为 `_`；
 * - 去掉首尾的点与空格（避免隐藏文件与 `..`）。
 */
function sanitizeBaseName(raw: string): string {
  const last = raw.replace(/\\/g, '/').split('/').pop() ?? ''
  const cleaned = last
    .replace(/[^\p{L}\p{N}._-]/gu, '_')
    .replace(/^[.\s]+/, '')
    .replace(/[.\s]+$/, '')
  return cleaned || 'file'
}

/** 取小写扩展名（不含点）；无扩展名返回空串 */
function extOf(name: string): string {
  const idx = name.lastIndexOf('.')
  if (idx <= 0 || idx === name.length - 1) return ''
  return name.slice(idx + 1).toLowerCase()
}

/** 从生成的文件名还原原始（安全化后）基名：`时间戳-随机-hex-安全原名` */
function nameFromFile(filename: string): string {
  const matched = /^\d+-[0-9a-f]+-(.*)$/.exec(filename)
  return matched ? matched[1] : filename
}

/** 由扩展名推断 MIME（列表展示用） */
function typeFromFile(filename: string): string {
  return EXT_DEFAULT_MIME[extOf(filename)] ?? 'application/octet-stream'
}

/** 公开访问 URL：文件名做百分号编码，确保含非 ASCII 文件名时也可直接请求 */
function publicUrl(filename: string): string {
  return `/uploads/${encodeURIComponent(filename)}`
}

/**
 * 保存上传的原始字节流。
 * 校验顺序：文件名 / 扩展名白名单（415）→ 内容类型白名单（415）→ 落盘。
 */
export function saveUpload(
  bytes: Buffer,
  originalName: string,
  contentType: string | undefined,
): SaveUploadResult {
  const safeName = sanitizeBaseName(originalName)
  const ext = extOf(safeName)
  const allowed = ext ? EXT_MIME[ext] : undefined
  if (!allowed) {
    return { ok: false, status: 415, error: `不支持的文件类型：${ext ? `.${ext}` : '未知扩展名'}` }
  }
  const mime = normalizeMime(contentType)
  if (mime && !allowed.includes(mime)) {
    return { ok: false, status: 415, error: `文件内容类型不被允许：${mime}` }
  }
  // 大小限额按类型分档（图片 / 文档 / 视频）；超限给出含类型与限额的中文提示
  const kind = sizeKindOf(ext)
  const limit = limitForKind(kind)
  if (bytes.length > limit) {
    return {
      ok: false,
      status: 413,
      error: `${LIMIT_LABEL[kind]}超过大小限制：最大 ${formatLimit(limit)}（当前 ${formatLimit(bytes.length)}）`,
    }
  }
  const dir = ensureUploadDir()
  const filename = `${Date.now()}-${randomBytes(4).toString('hex')}-${safeName}`
  const file = path.join(dir, filename)
  writeFileSync(file, bytes)
  const stat = statSync(file)
  return {
    ok: true,
    item: {
      id: filename,
      name: safeName,
      url: publicUrl(filename),
      size: stat.size,
      type: mime || EXT_DEFAULT_MIME[ext],
      uploadedAt: new Date(stat.mtimeMs).toISOString(),
    },
  }
}

/** 列出素材（按上传时间倒序；目录不存在时返回空列表） */
export function listUploads(): UploadItem[] {
  const dir = resolveUploadDir()
  if (!existsSync(dir)) return []
  const items: UploadItem[] = []
  for (const filename of readdirSync(dir)) {
    if (filename.startsWith('.')) continue
    const file = path.join(dir, filename)
    let stat
    try {
      stat = statSync(file)
    } catch {
      continue
    }
    if (!stat.isFile()) continue
    items.push({
      id: filename,
      name: nameFromFile(filename),
      url: publicUrl(filename),
      size: stat.size,
      type: typeFromFile(filename),
      uploadedAt: new Date(stat.mtimeMs).toISOString(),
    })
  }
  // 上传时间倒序；同一毫秒内以文件名（含时间戳前缀）兜底排序，保证顺序稳定
  items.sort((a, b) => {
    if (a.uploadedAt !== b.uploadedAt) return a.uploadedAt < b.uploadedAt ? 1 : -1
    return a.id < b.id ? 1 : -1
  })
  return items
}

/**
 * 删除素材（按 id = 磁盘文件名）。
 * 仅接受目录内的单文件名（拒绝分隔符 / 隐藏文件 / 目录穿越）；未命中返回 false。
 */
export function deleteUpload(id: string): boolean {
  if (!id || id !== path.basename(id) || id.startsWith('.')) return false
  const file = path.join(resolveUploadDir(), id)
  try {
    if (!existsSync(file) || !statSync(file).isFile()) return false
    unlinkSync(file)
    return true
  } catch {
    return false
  }
}
