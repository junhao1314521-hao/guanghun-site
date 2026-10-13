/**
 * 浏览器端图片多尺寸变体生成（Canvas，零依赖）。
 * ============================================================
 * - 仅对**位图**（png / jpeg / webp）生成变体；`image/svg+xml`（矢量）与 `image/gif`（动图，
 *   Canvas 会破坏动画）跳过，仅上传原图。
 * - 档位：320 / 640 / 1280；**按需缩小、不放大原图**（仅保留小于原图宽度的档位），保持宽高比。
 * - 输出格式：浏览器支持 WebP 时统一输出 `image/webp`（体积更小），否则保持原格式（png / jpg）。
 * - 质量：0.8。
 * - 任何失败（解码 / 编码 / 不支持）都返回空数组，调用方仅上传原图，不阻断上传。
 */

/** 变体目标宽度档位（像素） */
export const VARIANT_WIDTHS = [320, 640, 1280] as const

/** 变体编码质量 */
export const VARIANT_QUALITY = 0.8

/** 参与多尺寸生成的位图 MIME */
const BITMAP_MIMES = ['image/jpeg', 'image/png', 'image/webp']

/** 生成的变体（含字节流与命名所需的扩展名 / MIME） */
export type GeneratedVariant = {
  /** 目标宽度（像素） */
  width: number
  /** 变体字节 */
  blob: Blob
  /** 目标扩展名（不含点） */
  ext: string
  /** 目标 MIME */
  mime: string
}

/** 是否位图（按 MIME，回退扩展名）；SVG / GIF 返回 false */
export function isBitmapImage(file: { type?: string; name?: string }): boolean {
  const mime = (file.type ?? '').toLowerCase()
  if (BITMAP_MIMES.includes(mime)) return true
  const ext = (file.name ?? '').split('.').pop()?.toLowerCase() ?? ''
  return ['png', 'jpg', 'jpeg', 'webp'].includes(ext)
}

/** 生成变体文件名：`原名-320.webp`（基名取原名去掉最后一个扩展名） */
export function variantFileName(originalName: string, width: number, ext: string): string {
  const dot = originalName.lastIndexOf('.')
  const base = dot > 0 ? originalName.slice(0, dot) : originalName
  return `${base}-${width}.${ext}`
}

/** 目标宽度档位：仅保留小于原图宽度的档位（不放大原图） */
export function pickVariantWidths(naturalWidth: number): number[] {
  return VARIANT_WIDTHS.filter((width) => width < naturalWidth)
}

/** 浏览器是否支持 Canvas 编码 WebP（惰性检测，只测一次） */
let webpSupport: boolean | null = null
function supportsWebp(): boolean {
  if (webpSupport !== null) return webpSupport
  let result = false
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    result = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    result = false
  }
  webpSupport = result
  return result
}

/** 选择变体输出格式：支持 WebP 用 WebP，否则保持原格式 */
function outputFormat(mime: string): { mime: string; ext: string } {
  if (supportsWebp()) return { mime: 'image/webp', ext: 'webp' }
  if (mime === 'image/jpeg') return { mime: 'image/jpeg', ext: 'jpg' }
  return { mime: 'image/png', ext: 'png' }
}

/** 解码后的图片源与其固有尺寸（附带资源释放回调） */
type DecodedImage = { source: CanvasImageSource; width: number; height: number; cleanup: () => void }

/** 解码图片：优先 createImageBitmap（性能好），回退 Image + objectURL */
async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('图片解码失败'))
      el.src = url
    })
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, cleanup: () => URL.revokeObjectURL(url) }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

/** 将 Canvas 编码为 Blob（不支持 toBlob 时返回 null） */
function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== 'function') {
      resolve(null)
      return
    }
    canvas.toBlob((blob) => resolve(blob), mime, quality)
  })
}

/**
 * 对位图生成多尺寸变体（320/640/1280；按需缩小、不放大原图）。
 * 非位图（SVG/GIF）、解码失败或编码失败 → 返回空数组（调用方仅上传原图）。
 */
export async function generateImageVariants(file: File): Promise<GeneratedVariant[]> {
  if (!isBitmapImage(file)) return []
  let decoded: DecodedImage
  try {
    decoded = await decodeImage(file)
  } catch {
    return []
  }
  const { source, width, height, cleanup } = decoded
  if (!width || !height) {
    cleanup()
    return []
  }
  const widths = pickVariantWidths(width)
  const format = outputFormat(file.type)
  const variants: GeneratedVariant[] = []
  try {
    for (const targetWidth of widths) {
      const targetHeight = Math.max(1, Math.round((height * targetWidth) / width))
      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = targetHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) continue
      ctx.drawImage(source, 0, 0, targetWidth, targetHeight)
      const blob = await canvasToBlob(canvas, format.mime, VARIANT_QUALITY)
      if (!blob) continue
      variants.push({ width: targetWidth, blob, ext: format.ext, mime: format.mime })
    }
  } catch {
    // 单档失败不阻断其余档位
  } finally {
    cleanup()
  }
  return variants
}
