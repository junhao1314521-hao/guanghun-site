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

/** 扩展名（小写，不含点）→ 允许的 MIME 白名单 */
const EXT_MIME: Record<string, string[]> = {
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  svg: ['image/svg+xml'],
  mp4: ['video/mp4'],
  webm: ['video/webm'],
  mov: ['video/quicktime'],
  pdf: ['application/pdf'],
  zip: ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip'],
  txt: ['text/plain'],
  md: ['text/markdown', 'text/x-markdown', 'text/plain'],
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
  zip: 'application/zip',
  txt: 'text/plain',
  md: 'text/markdown',
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
