/**
 * 上传前图片压缩（仅静态位图）。
 * ============================================================
 * 后台上传大图时先在浏览器里缩放并转码，减少上传时间与磁盘占用：
 * - 只处理 png / jpeg / webp；svg（矢量）、gif（可能为动图）原样上传；
 * - 长边超过 3200 或体积超过 8MB 才重新编码，其余原样返回，避免无谓的画质损失；
 * - 输出 WebP（质量 0.9），浏览器不支持 WebP 编码时退回 JPEG 0.92；
 * - 解码失败、Canvas 不可用等任何异常都返回原文件，由服务端兜底压缩，不阻断上传。
 */

/** 参与压缩的 MIME（GIF / SVG 等不动） */
const BITMAP_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

/** 展示图长边上限（像素）：2K / 4K 全屏与 2 倍屏下仍保留足够细节 */
export const MAX_EDGE = 3200

/** 超过该体积就重新编码（尺寸未超限时尽量不动，避免不必要的画质损失） */
const TRIGGER_BYTES = 8 * 1024 * 1024

/** WebP 编码质量：质量优先，肉眼接近原图 */
const WEBP_QUALITY = 0.9

/** 像素数保护：超过该值不在浏览器里解码，交给服务端处理或拒绝 */
const MAX_PIXELS = 80_000_000

/** 解码结果：统一成可绘制对象 + 原始尺寸 + 释放钩子 */
type Decoded = { image: CanvasImageSource; width: number; height: number; release: () => void }

/** 用 createImageBitmap 解码（自动修正 EXIF 方向）；失败退回 <img> */
async function decode(file: File): Promise<Decoded | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      }
    } catch {
      // 部分浏览器不支持 imageOrientation 或格式解码失败：走 <img> 兜底
    }
  }
  try {
    const url = URL.createObjectURL(file)
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image()
        element.onload = () => resolve(element)
        element.onerror = () => reject(new Error('图片解码失败'))
        element.src = url
      })
      return {
        image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        release: () => URL.revokeObjectURL(url),
      }
    } catch (error) {
      URL.revokeObjectURL(url)
      throw error
    }
  } catch {
    return null
  }
}

/** Canvas → Blob（Safari 不支持 WebP 编码时退回 JPEG） */
function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob && blob.type === 'image/webp') {
        resolve(blob)
        return
      }
      canvas.toBlob((fallback) => resolve(fallback), 'image/jpeg', 0.92)
    }, 'image/webp', WEBP_QUALITY)
  })
}

/** 按输出 MIME 取扩展名，保证文件名与实际内容一致 */
function extensionFor(mime: string): string {
  if (mime === 'image/webp') return '.webp'
  if (mime === 'image/jpeg') return '.jpg'
  return '.png'
}

/** 替换扩展名（保留基名） */
function withExtension(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/, '') || 'image'
  return `${base}${ext}`
}

/**
 * 上传前预处理：需要时缩放/转码为 WebP。
 * 返回可直接上传的 File；无需处理或处理失败时原样返回。
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!BITMAP_TYPES.has(file.type) || file.size === 0) return file

  const decoded = await decode(file)
  if (!decoded) return file

  try {
    const { width, height } = decoded
    if (width <= 0 || height <= 0) return file
    if (width * height > MAX_PIXELS) return file

    const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
    const needResize = scale < 1
    const needShrink = file.size > TRIGGER_BYTES
    if (!needResize && !needShrink) return file

    const targetWidth = Math.max(1, Math.round(width * scale))
    const targetHeight = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const context = canvas.getContext('2d')
    if (!context) return file
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(decoded.image, 0, 0, targetWidth, targetHeight)

    const blob = await toBlob(canvas)
    if (!blob || blob.size === 0) return file
    // 没有缩放且压缩后反而更大：保留原文件
    if (!needResize && blob.size >= file.size) return file

    const compressed = new File([blob], withExtension(file.name, extensionFor(blob.type)), {
      type: blob.type,
      lastModified: file.lastModified,
    })
    return compressed.size < file.size ? compressed : file
  } catch {
    return file
  } finally {
    decoded.release()
  }
}
