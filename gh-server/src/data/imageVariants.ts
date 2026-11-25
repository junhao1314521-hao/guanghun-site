/**
 * 服务端图片多尺寸变体生成（T1.5）。
 * ============================================================
 * 位图（png / jpg / jpeg / webp）上传成功后，自动按宽度档位 [480, 960, 1600, 2560] 生成 webp 变体：
 * - **不放大**：原图宽度不大于某档时跳过该档；
 * - 变体文件写入与主图相同的上传目录，沿用既有命名约定 `<时间戳>-<随机hex>-<基名>-<宽度>.webp`
 *   （与 uploadStore 的命名保持同构，`listUploads` / `nameFromFile` 可正常解析）；
 * - 生成后通过 `setVariants` 登记到 `upload_variants` 表，前台 `srcset` 与素材列表据此消费；
 *   变体文件本身仍由 `mediaStore.variantIdSet` 从素材列表隐藏（既有逻辑）。
 *
 * 适用范围：仅位图。SVG（矢量）与 GIF（可能为动图，转换丢帧）跳过；视频 / 文档 / 压缩包一律跳过。
 *
 * **优雅降级**：sharp 不可用、图片解码失败、磁盘写入失败等任何异常都只记录日志，
 * 返回已成功生成的变体（可能为空），绝不抛出——保持既有「单张原图」行为，不影响上传整体成功。
 */
import { randomBytes } from 'node:crypto'
import { statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { logger } from '../lib/logger'
import { setVariants, type MediaVariant } from './mediaStore'
import { ensureUploadDir, resolveUploadDir, type UploadItem } from './uploadStore'

/** 变体宽度档位（升序）；仅生成小于原图宽度的档位，不放大。
 *  增加 2560 档：大屏 / 高分屏下避免只拿到 1600 变体被拉伸。 */
const VARIANT_WIDTHS = [480, 960, 1600, 2560]

/** 参与变体生成的位图扩展名（SVG / GIF 及其它类型跳过） */
const BITMAP_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp'])

/** 变体输出格式与质量：大屏档位也用较高画质，避免 2560/1600 被拉伸时发虚 */
const WEBP_QUALITY = 86

/** 服务端归一化触发体积：超过 10MB 才转码，避免对正常体积图片做无谓的有损重编码 */
const NORMALIZE_TRIGGER = 10 * 1024 * 1024

/** 归一化后的长边上限与 WebP 质量：质量优先（肉眼接近原图），兼顾体积 */
const NORMALIZE_MAX_EDGE = 3200
const NORMALIZE_QUALITY = 90

/**
 * 图片处理管线版本：主图归一化参数 + 展示变体参数共同决定。
 * 素材元数据会记录该版本；参数升级后，同名 / 同内容重新上传会在原地址上重新生成，
 * 不会因为「已存在」而继续复用旧画质的成品。
 */
export const IMAGE_PIPELINE_VERSION = 'v3-3200-q90-variants86'

/** 像素数保护：超大图解码可能耗尽内存，直接拒绝 */
const MAX_PIXELS = 80_000_000

/** 取小写扩展名（不含点）；无扩展名返回空串 */
function extOf(name: string): string {
  const idx = name.lastIndexOf('.')
  if (idx <= 0 || idx === name.length - 1) return ''
  return name.slice(idx + 1).toLowerCase()
}

/** 去掉扩展名的基名 */
function stripExt(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(0, idx) : name
}

/** 变体文件名：沿用主图命名约定（时间戳-随机hex-基名-宽度.webp） */
function variantFileName(baseName: string, width: number): string {
  return `${Date.now()}-${randomBytes(4).toString('hex')}-${baseName}-${width}.webp`
}

/**
 * 为主图生成并登记多尺寸 webp 变体。
 * 返回实际生成的变体列表（按宽度升序，来自 `setVariants` 的归一化结果）；
 * 非位图、原图小于最小档位或任一步失败时返回空数组（调用方无需处理异常）。
 */
export async function generateImageVariants(item: UploadItem): Promise<MediaVariant[]> {
  if (!BITMAP_EXTS.has(extOf(item.id))) return []
  try {
    // 动态导入：sharp 缺失 / 原生模块不可用时也能优雅降级
    const sharp = (await import('sharp')).default
    const source = path.join(resolveUploadDir(), item.id)

    const metadata = await sharp(source).metadata()
    const originalWidth = metadata.width ?? 0
    const targets = VARIANT_WIDTHS.filter((width) => originalWidth > width)
    if (targets.length === 0) return []

    const dir = ensureUploadDir()
    const baseName = stripExt(item.name)
    const variants: MediaVariant[] = []
    // 串行处理（最多三档），避免并发压垮小实例；不引入队列框架
    for (const width of targets) {
      try {
        const buffer = await sharp(source)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer()
        const filename = variantFileName(baseName, width)
        const dest = path.join(dir, filename)
        writeFileSync(dest, buffer)
        variants.push({
          width,
          url: `/uploads/${encodeURIComponent(filename)}`,
          size: statSync(dest).size,
          type: 'image/webp',
        })
      } catch (error) {
        logger.warn('图片变体生成失败：跳过该档位', { id: item.id, width, error: String(error) })
      }
    }
    if (variants.length === 0) return []
    // 登记（内部按宽度升序归一化、按 url 去重）
    return setVariants(item.id, variants)
  } catch (error) {
    logger.warn('图片变体生成失败：保留单张原图', { id: item.id, error: String(error) })
    return []
  }
}

/**
 * 把图片转成指定扩展名的格式（用于「同名上传但扩展名不同」的原地替换）。
 * 目标格式仅支持 webp / jpg / jpeg / png；失败或非位图返回 null。
 */
export async function convertImageToExtension(
  bytes: Buffer,
  name: string,
  targetExt: string,
): Promise<NormalizedImage | null> {
  const ext = targetExt.toLowerCase()
  if (!BITMAP_EXTS.has(ext) || ext === 'gif') return null
  try {
    const sharp = (await import('sharp')).default
    const metadata = await sharp(bytes).metadata()
    const width = metadata.width ?? 0
    const height = metadata.height ?? 0
    if (width > 0 && height > 0 && width * height > MAX_PIXELS) {
      return { ok: false, status: 413, error: `图片分辨率过大（${width}×${height}），请先缩小后再上传` }
    }
    if ((metadata.pages ?? 1) > 1) return null
    const pipeline = sharp(bytes).resize({
      width: NORMALIZE_MAX_EDGE,
      height: NORMALIZE_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    const output =
      ext === 'webp'
        ? await pipeline.webp({ quality: NORMALIZE_QUALITY }).toBuffer()
        : ext === 'png'
          ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
          : await pipeline.jpeg({ quality: 92, mozjpeg: true }).toBuffer()
    const mime = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg'
    return { ok: true, bytes: output, name: `${stripExt(name)}.${ext}`, mime, compressed: true }
  } catch (error) {
    logger.warn('同名素材格式转换失败：保留新文件', { name, targetExt, error: String(error) })
    return null
  }
}

/** 归一化结果：压缩成功返回新字节/文件名，无需压缩或失败时保留原样 */
export type NormalizedImage =
  | { ok: true; bytes: Buffer; name: string; mime: string; compressed: boolean }
  | { ok: false; error: string; status: number }

/**
 * 服务端图片归一化：位图超过长边 3200 或体积超过 10MB 时，缩到长边 3200 并转 WebP 90。
 *
 * 浏览器端不再做有损预压缩，原图直传到这里，由服务端统一按「画质优先」参数处理：
 * - 尺寸 / 体积都在阈值内：原样保存，不做任何重编码；
 * - 超限：只做一次高质量转码，避免前端压缩 + 服务端二次压缩的叠加损失。
 *
 * GIF（可能动图）、SVG 与非位图原样返回；sharp 不可用或解码失败时同样原样返回。
 * 像素数超过保护阈值时拒绝（413），避免超大图拖垮进程。
 */
export async function normalizeOversizeImage(bytes: Buffer, name: string, mime: string | undefined): Promise<NormalizedImage> {
  const unchanged: NormalizedImage = { ok: true, bytes, name, mime: mime || 'application/octet-stream', compressed: false }
  if (!BITMAP_EXTS.has(extOf(name))) return unchanged
  try {
    const sharp = (await import('sharp')).default
    const metadata = await sharp(bytes).metadata()
    const width = metadata.width ?? 0
    const height = metadata.height ?? 0
    if (width > 0 && height > 0 && width * height > MAX_PIXELS) {
      return { ok: false, status: 413, error: `图片分辨率过大（${width}×${height}），请先缩小后再上传` }
    }
    // 动图（多帧）不做单帧转码，避免丢帧
    if ((metadata.pages ?? 1) > 1) return unchanged
    // 尺寸未超长边且体积未超阈值：保留原图，避免不必要的画质损失
    const oversize = bytes.length > NORMALIZE_TRIGGER || width > NORMALIZE_MAX_EDGE || height > NORMALIZE_MAX_EDGE
    if (!oversize) return unchanged
    const output = await sharp(bytes)
      .resize({ width: NORMALIZE_MAX_EDGE, height: NORMALIZE_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: NORMALIZE_QUALITY })
      .toBuffer()
    if (output.length === 0 || output.length >= bytes.length) return unchanged
    return {
      ok: true,
      bytes: output,
      name: `${stripExt(name)}.webp`,
      mime: 'image/webp',
      compressed: true,
    }
  } catch (error) {
    logger.warn('图片兜底压缩失败：保留原图', { name, error: String(error) })
    return unchanged
  }
}
