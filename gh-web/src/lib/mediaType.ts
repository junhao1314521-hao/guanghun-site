/**
 * 素材类型判断（后台素材库 / 素材选择弹窗 / 文件字段共用）。
 * ============================================================
 * 历史素材可能缺少 MIME（早期上传 / 外部导入），只按 `type` 判断会把图片显示成文档。
 * 口径：MIME → 扩展名 → 业务 kind 三级回退，避免同一份素材在不同界面表现不一致。
 */

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)$/i
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i

type MediaLike = {
  /** MIME，可能为空 */
  type?: string
  /** 原始文件名或公开地址 */
  name?: string
  /** 业务类型（服务端推导） */
  kind?: string
}

/** 是否图片素材 */
export function isImageMedia(item: MediaLike): boolean {
  if (item.type?.startsWith('image/')) return true
  if (item.name && IMAGE_EXT.test(item.name)) return true
  return item.kind === 'image'
}

/** 是否视频素材 */
export function isVideoMedia(item: MediaLike): boolean {
  if (item.type?.startsWith('video/')) return true
  if (item.name && VIDEO_EXT.test(item.name)) return true
  return item.kind === 'video'
}

/** 是否 PDF */
export function isPdfMedia(item: MediaLike): boolean {
  return item.type === 'application/pdf' || Boolean(item.name && /\.pdf$/i.test(item.name))
}

/** 取地址 / 文件名中的文件名部分（用于展示与标题） */
export function mediaFileName(urlOrName: string): string {
  if (!urlOrName) return ''
  const raw = urlOrName.split('/').pop() || urlOrName
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** 字节数 → 与下载中心一致的大小文案（B / KB / MB / GB） */
export function formatBytesLabel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}
