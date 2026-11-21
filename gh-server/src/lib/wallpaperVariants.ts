import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type WallpaperVariant = {
  key: string
  label: string
  width: number
  height: number
  url: string
  size: string
}

/** 标准下载档位：文件名后缀 → 像素尺寸。 */
const STEPS = [
  { key: '4k', label: '4K', width: 3840, height: 2160, suffix: '-3840' },
  { key: '2k', label: '2K', width: 2560, height: 1440, suffix: '-2560' },
  { key: 'fhd', label: '1080p', width: 1920, height: 1080, suffix: '-1920' },
]

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

/** 静态根目录：生产 STATIC_DIR + 仓库内 dist/public（开发与测试）。 */
function mediaRoots(): string[] {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const webDir = path.resolve(here, '../../../gh-web')
  return [
    process.env.STATIC_DIR ? path.resolve(process.env.STATIC_DIR) : '',
    path.join(webDir, 'dist'),
    path.join(webDir, 'public'),
  ].filter(Boolean)
}

/** 探测 /media 下的本地文件，命中返回字节数。 */
function probeMedia(url: string): number | null {
  if (!url.startsWith('/')) return null
  const rel = decodeURIComponent(url.split('?')[0]).replace(/^\/+/, '')
  if (rel.split('/').includes('..')) return null
  for (const root of mediaRoots()) {
    const file = path.join(root, rel)
    if (!existsSync(file)) continue
    try {
      return statSync(file).size
    } catch {
      // 读取失败按未命中处理，继续尝试下一个根目录
    }
  }
  return null
}

/**
 * 由 `fileUrl` 的档位后缀推导可下载尺寸，并逐个探测文件是否存在。
 * 只返回真实存在的档位；一个都探测不到时回落到数据里的原图单档，避免前台按钮失效。
 */
export function wallpaperVariantsOf(item: {
  fileUrl: string
  width: number
  height: number
  size: string
}): WallpaperVariant[] {
  const match = /^(.*?)-(\d+)(\.[a-z0-9]+)$/i.exec(item.fileUrl)
  const found: WallpaperVariant[] = []
  if (match) {
    const [, base, , ext] = match
    for (const step of STEPS) {
      const url = `${base}${step.suffix}${ext}`
      const bytes = probeMedia(url)
      if (bytes) {
        found.push({
          key: step.key,
          label: step.label,
          width: step.width,
          height: step.height,
          url,
          size: formatBytes(bytes),
        })
      }
    }
    // 原图后缀不在标准档位时（如 4096 宽源图），单独作为一档返回
    if (!found.some((variant) => variant.url === item.fileUrl)) {
      const bytes = probeMedia(item.fileUrl)
      if (bytes) {
        found.push({
          key: 'original',
          label: `${item.width}×${item.height}`,
          width: item.width,
          height: item.height,
          url: item.fileUrl,
          size: formatBytes(bytes),
        })
      }
    }
  }
  if (found.length === 0) {
    found.push({
      key: 'original',
      label: `${item.width}×${item.height}`,
      width: item.width,
      height: item.height,
      url: item.fileUrl,
      size: item.size,
    })
  }
  return found.sort((a, b) => b.width - a.width)
}
