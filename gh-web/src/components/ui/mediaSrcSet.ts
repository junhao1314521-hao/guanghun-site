/**
 * 图片多尺寸资源（srcset）解析与登记：与 `MediaImg` 分离，避免同文件混合「组件 + 工具」导出。
 *
 * 数据流（有则用、无则退）：
 *   1) 上传主图时，浏览器端 Canvas 生成 320/640/1280 变体并作为独立文件上传，
 *      再登记到后端（`POST /api/admin/uploads/:id/variants`）；
 *   2) 消费侧（`MediaImg`）解析某地址的候选集：
 *      - 命中本地登记表（如素材库列表返回的 `variants` 预登记）→ 直接输出 `srcset`；
 *      - 否则对 `/uploads/` 地址经公开端点 `GET /api/media/variants?url=...` **懒加载**并登记（去重 + 缓存）；
 *      - 非 `/uploads/` 地址、无变体、请求失败 → 退化为单张（不输出 srcset，不报错、不裂图）。
 */
import { useEffect, useState } from 'react'
import { fetchVariants } from '../../api/media'

/** 变体最小信息（宽度 + 地址） */
export type SrcSetVariant = { width: number; url: string }

/** 默认 sizes：窄屏满宽、宽屏约半栏（可被调用方 `sizes` 或登记项内置值覆盖） */
const DEFAULT_SIZES = '(max-width: 767px) 100vw, 50vw'

/** 登记表：key = 原始图片地址，value = 候选集 */
const SRCSET_REGISTRY: Record<string, { srcSet: string; sizes?: string }> = {}
/** 已解析过的地址（含「无变体」的空结果），避免重复请求 */
const RESOLVED = new Set<string>()
/** 在途请求：同一地址并发渲染只发一次 */
const PENDING = new Map<string, Promise<void>>()

/** 由变体列表构造 srcset 字符串（按宽度升序，形如 `/uploads/a-320.webp 320w, ...`） */
export function buildSrcSet(variants: SrcSetVariant[]): string {
  return [...variants]
    .filter((variant) => variant && typeof variant.url === 'string' && variant.url.length > 0)
    .sort((a, b) => a.width - b.width)
    .map((variant) => `${variant.url} ${variant.width}w`)
    .join(', ')
}

/** 登记某地址的多尺寸候选（variants 为空则忽略）；供「拿到素材数据时」预登记，减少一次请求 */
export function registerSrcSet(src: string, variants: SrcSetVariant[] | undefined): void {
  if (!src || !variants || variants.length === 0) return
  const srcSet = buildSrcSet(variants)
  if (!srcSet) return
  SRCSET_REGISTRY[src] = { srcSet }
  RESOLVED.add(src)
}

/** 取某地址的多尺寸候选集；未登记时返回空对象（调用方据此省略 srcset/sizes） */
export function srcSetFor(src: string, sizes?: string): { srcSet?: string; sizes?: string } {
  const entry = SRCSET_REGISTRY[src]
  if (!entry) return {}
  return { srcSet: entry.srcSet, sizes: sizes ?? entry.sizes ?? DEFAULT_SIZES }
}

/** 是否可对某地址发起变体查询（仅本地 /uploads/ 素材） */
function canResolve(src: string): boolean {
  return typeof src === 'string' && src.startsWith('/uploads/')
}

/** 懒加载并登记某地址的变体；同地址去重，失败静默（退化为单张） */
function resolveSrcSet(src: string): Promise<void> {
  const existing = PENDING.get(src)
  if (existing) return existing
  const task = fetchVariants(src)
    .then((variants) => {
      registerSrcSet(src, variants)
    })
    .catch(() => {
      // 请求失败：按「无变体」处理，退化为单张
    })
    .finally(() => {
      RESOLVED.add(src)
      PENDING.delete(src)
    })
  PENDING.set(src, task)
  return task
}

/**
 * 组件内解析某地址的 srcset：命中登记表即时返回；否则对 `/uploads/` 地址懒加载后触发重渲染。
 * 非 `/uploads/` 地址、已解析但无变体者直接返回空（退化为单张）。
 */
export function useSrcSetFor(src: string, sizes?: string): { srcSet?: string; sizes?: string } {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!canResolve(src) || SRCSET_REGISTRY[src] || RESOLVED.has(src)) return
    let alive = true
    void resolveSrcSet(src).then(() => {
      if (alive) setTick((n) => n + 1)
    })
    return () => {
      alive = false
    }
  }, [src])
  return srcSetFor(src, sizes)
}
