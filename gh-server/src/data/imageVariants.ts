/**
 * 服务端图片多尺寸变体生成（T1.5）。
 * ============================================================
 * 位图（png / jpg / jpeg / webp）上传成功后，自动按宽度档位 [480, 960, 1600] 生成 webp 变体：
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

/** 变体宽度档位（升序）；仅生成小于原图宽度的档位，不放大 */
const VARIANT_WIDTHS = [480, 960, 1600]

/** 参与变体生成的位图扩展名（SVG / GIF 及其它类型跳过） */
const BITMAP_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp'])

/** 变体输出格式与质量 */
const WEBP_QUALITY = 80

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
