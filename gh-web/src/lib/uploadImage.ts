/**
 * 上传图片（含多尺寸变体）编排：把「上传主图 → 变体登记」串成一次调用。
 * ============================================================
 * 1) 上传主图：沿用原始字节流 `POST /api/admin/uploads`（返回素材条目，**服务端已自动生成变体**）；
 * 2) 服务端已返回变体 → 仅做本地 srcset 预登记（立即生效），不再生成第二套档位；
 * 3) 仅当服务端未返回变体（旧版部署 / 非位图 / 生成失败）时，才回退到浏览器端 Canvas 生成
 *    320/640/1280 变体并 `POST /api/admin/uploads/:id/variants` 登记。
 *
 * 容错：变体生成 / 上传 / 登记任一环节失败都**不影响主图**（best-effort），
 * 失败时退化为单张（仅主图），不抛错、不阻断。
 */
import { registerUploadVariants, uploadFile, type MediaVariant, type UploadItem } from '../api/adminUploads'
import { registerSrcSet } from '../components/ui/mediaSrcSet'
import { generateImageVariants, isBitmapImage, variantFileName } from './imageVariants'

/**
 * 上传一个文件：图片会附带多尺寸变体（位图），其余文件等同 `uploadFile`。
 * 返回**主图**的素材条目（含登记后的 `variants`）。
 */
export async function uploadImage(file: File, folderId?: string | null): Promise<UploadItem> {
  const master = await uploadFile(file, folderId)

  // 服务端已在上传时自动生成多尺寸变体（见 gh-server/src/data/imageVariants.ts），
  // 变体清单随主图一起返回；此处只需做本地 srcset 预登记，避免浏览器端再生成一套档位互相覆盖。
  // 仅当服务端未返回变体（旧版部署 / 非位图 / 变体生成失败）时，才回退到浏览器端 Canvas 生成。
  const serverVariants = (master as UploadItem & { variants?: MediaVariant[] }).variants
  if (serverVariants && serverVariants.length > 0) {
    registerSrcSet(master.url, serverVariants)
    return master
  }

  if (!isBitmapImage(file)) return master

  try {
    const generated = await generateImageVariants(file)
    if (generated.length === 0) return master

    const variants: MediaVariant[] = []
    for (const variant of generated) {
      const name = variantFileName(file.name, variant.width, variant.ext)
      const uploaded = await uploadFile(new File([variant.blob], name, { type: variant.mime }), folderId)
      variants.push({ width: variant.width, url: uploaded.url, size: uploaded.size, type: uploaded.type })
    }
    if (variants.length === 0) return master

    const updated = await registerUploadVariants(master.id, variants)
    registerSrcSet(master.url, variants)
    return updated ?? master
  } catch {
    // 变体链路失败：主图已成功，退化为单张（不抛错）
    return master
  }
}
