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
export function fileStatusOf(fileUrl?: string): { fileStatus: FileStatus; actualSizeBytes?: number } {
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
