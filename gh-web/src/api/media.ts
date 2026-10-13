/**
 * 接口层 · 公开素材端点（后端 /api/media，无需鉴权）。
 * ============================================================
 *   GET /api/media/variants?url=/uploads/<文件名> → { url, variants: MediaVariant[] }
 *
 * 用途：前台/后台 `MediaImg` 按图片地址解析多尺寸候选，以便输出 `srcset/sizes`。
 * 契约：未命中 / 非 `/uploads/` 地址 / 无变体 → 200 + 空数组（据此退化为单张）。
 */
import { transport } from './client'
import type { MediaVariant } from './adminUploads'

/**
 * 查询某图片地址的尺寸变体列表。
 * 任何失败（网络 / 非 2xx / 结构异常）均返回空数组，保证消费侧「有则用、无则退」不报错。
 */
export async function fetchVariants(url: string, signal?: AbortSignal): Promise<MediaVariant[]> {
  try {
    const res = await transport<{ url: string; variants: MediaVariant[] }>(
      { path: '/api/media/variants', query: { url }, signal },
      () => ({ url, variants: [] }),
    )
    return Array.isArray(res?.variants) ? res.variants : []
  } catch {
    return []
  }
}
