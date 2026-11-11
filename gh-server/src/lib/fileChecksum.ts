import { createHash } from 'node:crypto'
import { createReadStream, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { resolveUploadDir } from '../data/uploadStore'

/**
 * 本地上传文件的 SHA-256 计算（按需 + 内存缓存）。
 *
 * - 仅处理 `/uploads/...` 本地文件；外链无法读取，返回 undefined；
 * - 缓存键为绝对路径，失效条件为 mtime 或 size 变化（文件被替换 / 重新上传后自动重算）；
 * - 流式读取，避免大固件包一次性读入内存。
 */
const cache = new Map<string, { mtimeMs: number; size: number; sha256: string }>()

/** 解析 `/uploads/...` 到磁盘绝对路径；不存在返回 undefined */
function localPath(fileUrl?: string): string | undefined {
  const url = (fileUrl ?? '').trim()
  if (!url.startsWith('/uploads/')) return undefined
  let name = url.slice('/uploads/'.length).split('?')[0]
  try {
    name = decodeURIComponent(name)
  } catch {
    // 解码失败按原串处理
  }
  const file = path.join(resolveUploadDir(), name)
  return existsSync(file) ? file : undefined
}

/** 计算文件 SHA-256；非本地文件 / 不存在 / 读取失败返回 undefined */
export async function sha256OfUpload(fileUrl?: string): Promise<string | undefined> {
  const file = localPath(fileUrl)
  if (!file) return undefined
  let stat: ReturnType<typeof statSync>
  try {
    stat = statSync(file)
  } catch {
    return undefined
  }
  const hit = cache.get(file)
  if (hit && hit.mtimeMs === stat.mtimeMs && hit.size === stat.size) return hit.sha256

  const sha256 = await new Promise<string | undefined>((resolve) => {
    const hash = createHash('sha256')
    const stream = createReadStream(file)
    stream.on('error', () => resolve(undefined))
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  })
  if (!sha256) return undefined
  cache.set(file, { mtimeMs: stat.mtimeMs, size: stat.size, sha256 })
  return sha256
}
