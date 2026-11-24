import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { resolveUploadDir } from '../data/uploadStore'

export type FileStatus = 'ok' | 'missing' | 'placeholder' | 'external' | 'unknown'

/**
 * 判定运维录入的文件地址是否真实可用。
 * - 本地上传：查 UPLOAD_DIR 下文件是否存在；
 * - 外链：占位域名（*.example）标记 placeholder，其余标记 external（不主动发请求）；
 * - 空值：missing。
 */
export type FileStatusResult = { fileStatus: FileStatus; actualSizeBytes?: number }

export function fileStatusOf(fileUrl?: string): FileStatusResult {
  const url = (fileUrl ?? '').trim()
  if (!url) return { fileStatus: 'missing' }
  if (/^https?:\/\//i.test(url)) {
    return { fileStatus: /\.example(\/|:|$)/i.test(url) ? 'placeholder' : 'external' }
  }
  if (url.startsWith('/uploads/')) {
    const name = decodeURIComponent(url.slice('/uploads/'.length).split('?')[0])
    const file = path.join(resolveUploadDir(), name)
    if (!existsSync(file)) return { fileStatus: 'missing' }
    try {
      return { fileStatus: 'ok', actualSizeBytes: statSync(file).size }
    } catch {
      return { fileStatus: 'missing' }
    }
  }
  return { fileStatus: 'unknown' }
}

/**
 * 回源兜底探测：本机素材库缺失时，若运维配置了 `UPLOADS_FALLBACK_ORIGIN`，
 * 用 HEAD 请求核实该文件在源站是否真实存在（5 分钟缓存，避免每次列表都打源站）。
 *
 * 仅对 `/uploads/*` 生效；源站不可达 / 404 / 超时一律回退 missing——
 * 不允许「假设存在」导致前台放出无法下载的按钮。
 */
const FALLBACK_PROBE_TTL = 5 * 60 * 1000
const fallbackProbeCache = new Map<string, { result: FileStatusResult; at: number }>()
const fallbackProbeInflight = new Map<string, Promise<FileStatusResult>>()

function fallbackOrigin(): string {
  return (process.env.UPLOADS_FALLBACK_ORIGIN ?? '').trim().replace(/\/+$/, '')
}

export async function fileStatusOfAsync(fileUrl?: string): Promise<FileStatusResult> {
  const local = fileStatusOf(fileUrl)
  if (local.fileStatus !== 'missing') return local
  const url = (fileUrl ?? '').trim()
  if (!url.startsWith('/uploads/')) return local
  const origin = fallbackOrigin()
  if (!origin) return local

  const cacheKey = `${origin}${url}`
  const cached = fallbackProbeCache.get(cacheKey)
  if (cached && Date.now() - cached.at < FALLBACK_PROBE_TTL) return cached.result
  const inflight = fallbackProbeInflight.get(cacheKey)
  if (inflight) return inflight

  const task = (async (): Promise<FileStatusResult> => {
    try {
      const res = await fetch(cacheKey, { method: 'HEAD', signal: AbortSignal.timeout(2500) })
      if (!res.ok) return { fileStatus: 'missing' }
      const length = Number(res.headers.get('content-length'))
      return { fileStatus: 'external', actualSizeBytes: Number.isFinite(length) && length > 0 ? length : undefined }
    } catch {
      return { fileStatus: 'missing' }
    }
  })()
  fallbackProbeInflight.set(cacheKey, task)
  try {
    const result = await task
    fallbackProbeCache.set(cacheKey, { result, at: Date.now() })
    return result
  } finally {
    fallbackProbeInflight.delete(cacheKey)
  }
}
