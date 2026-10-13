import { Router, type Request } from 'express'
import { variantsByUrl } from '../data/mediaStore'

/**
 * 公开素材端点（挂载于 `/api/media`，无需鉴权）。
 *
 *   GET /api/media/variants?url=/uploads/<文件名> → { url, variants: MediaVariant[] }
 *
 * 用途：前台 `MediaImg` 通过该端点按 `src` 解析出多尺寸候选（`srcset`）。
 * 契约：
 *   - 命中 → 返回该主图的变体列表（按宽度升序）；
 *   - 未命中 / 非 `/uploads/` 地址 / 无变体 → **200 + 空数组**（前端据此退化为单张，不报错、不裂图）。
 *   - 不做 404，避免前台每张图片都产生错误态请求。
 */
export const mediaRouter = Router()

/** 解析单个查询参数为字符串（非字符串 / 缺失返回空串） */
function queryString(req: Request, key: string): string {
  const value = req.query[key]
  return typeof value === 'string' ? value : ''
}

mediaRouter.get('/variants', (req, res) => {
  const url = queryString(req, 'url')
  res.json({ url, variants: variantsByUrl(url) })
})
