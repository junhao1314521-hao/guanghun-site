/**
 * 图片 / 媒体字段「建议上传尺寸」提示的集中映射模块。
 * ============================================================
 * 把「字段 → 尺寸提示」收敛为**一张映射表 + 一个兜底默认值**（本文件），
 * 避免散落在各处的 if 判断；装修器（BlockEditor）与资源表单
 * （AdminResourceFormPage）共用同一份规则。
 *
 * 覆盖两类字段来源：
 * - 装修器区块：`区块类型.字段名`（如 `hero.media` / `imageText.image`）；
 * - 资源表单：`资源 key.字段 key`（如 `products.gallery` / `articles.coverImage`）。
 *
 * 其中「海报（hero / carousel slide）」与「产品矩阵」的宽高比随区块配置变化，
 * 故这两类走 `resolveMediaHint` 的**动态分支**（读 `height` / `ratio`），
 * 其余命中静态映射表，未命中回退 `DEFAULT_MEDIA_HINT`。
 */
import type { BlockType } from '../../data/contentTypes'

/** 尺寸提示（结构化：便于安全区预览复用比例 + 建议尺寸） */
export type MediaHint = {
  /** 建议尺寸，如 2560×1440 */
  size: string
  /** 宽高比，如 16:9 */
  ratio: string
  /** 建议单文件大小，如 ≤2MB（可选） */
  maxSize?: string
  /** 支持格式说明（可选；缺省「支持 jpg/png/webp」） */
  formats?: string
  /** 额外说明（可选，如「建议 ≤20 张」） */
  extra?: string
}

const DEFAULT_FORMATS = '支持 jpg/png/webp'

/** 兜底默认值：未命中任何映射的图片字段 */
export const DEFAULT_MEDIA_HINT: MediaHint = { size: '1600×900', ratio: '16:9', maxSize: '≤2MB' }

/**
 * 渲染成一行提示文案，例：
 * `建议上传 2560×1440（16:9）· ≤2MB · 支持 jpg/png/webp`
 */
export function mediaHintText(hint: MediaHint): string {
  const parts = [`建议上传 ${hint.size}（${hint.ratio}）`]
  if (hint.maxSize) parts.push(hint.maxSize)
  parts.push(hint.formats ?? DEFAULT_FORMATS)
  if (hint.extra) parts.push(hint.extra)
  return parts.join(' · ')
}

/* ============================================================
   静态映射表（不含随配置变化的动态分支）
   ============================================================ */

/** 海报默认（满屏 / 矮一档 / 自定义 一律按 16:9 给出参考） */
const POSTER_FULL: MediaHint = { size: '2560×1440', ratio: '16:9', maxSize: '≤2MB' }
/** 海报 21:9 宽幅档位 */
const POSTER_WIDE: MediaHint = { size: '2520×1080', ratio: '21:9', maxSize: '≤2MB' }
/** 海报手机竖版图（imageMobile） */
const POSTER_MOBILE: MediaHint = { size: '1080×1920', ratio: '9:16', maxSize: '≤2MB' }
/** 产品矩阵：按图片比例 */
const MATRIX_16_9: MediaHint = { size: '1920×1080', ratio: '16:9', maxSize: '≤2MB' }
const MATRIX_1_1: MediaHint = { size: '1200×1200', ratio: '1:1', maxSize: '≤2MB' }
const MATRIX_3_4: MediaHint = { size: '1200×1600', ratio: '3:4', maxSize: '≤2MB' }

/** 海报里直接参与「整屏比例」的主体图字段（比例随高度档位变化） */
const POSTER_RATIO_FIELDS = new Set(['media', 'image', 'poster'])

/** 装修器区块字段 → 尺寸提示（key = `区块类型.字段名`） */
const BLOCK_MEDIA_HINTS: Record<string, MediaHint> = {
  'video.url': { size: '1920×1080', ratio: '16:9', maxSize: '≤50MB', formats: '支持 mp4/webm/mov' },
  'video.poster': { size: '1920×1080', ratio: '16:9', maxSize: '≤2MB' },
  'imageText.image': { size: '1600×1200', ratio: '4:3', maxSize: '≤2MB' },
  'imageGrid.image': { size: '1200×900', ratio: '4:3', maxSize: '≤2MB' },
  'cards.media': { size: '1600×900', ratio: '16:9', maxSize: '≤2MB' },
  'cards.image': { size: '1600×900', ratio: '16:9', maxSize: '≤2MB' },
  'showcase.media': { size: '1920×1080', ratio: '16:9', maxSize: '≤4MB' },
  'embed.poster': { size: '1920×1080', ratio: '16:9', maxSize: '≤2MB' },
}

/** 资源表单字段 → 尺寸提示（key = `资源 key.字段 key`） */
const RESOURCE_MEDIA_HINTS: Record<string, MediaHint> = {
  // 产品相册
  'products.gallery': { size: '1600×1200', ratio: '4:3', maxSize: '≤2MB', extra: '建议 ≤20 张' },
  // 文章 / 新闻封面
  'articles.coverImage': { size: '1600×900', ratio: '16:9', maxSize: '≤2MB' },
  // 品牌资料 / 合作案例 / 体验点等：通用值
  'biz-content.cover': DEFAULT_MEDIA_HINT,
  'biz-cases.cover': DEFAULT_MEDIA_HINT,
  'biz-venues.cover': DEFAULT_MEDIA_HINT,
}

/** 海报高度档位 → 提示（r219 为 21:9 宽幅，其余按 16:9 参考） */
function posterHint(height: unknown): MediaHint {
  return height === 'r219' ? POSTER_WIDE : POSTER_FULL
}

/** 产品矩阵图片比例 → 提示（缺省 / 1:1 均为 1200×1200） */
function matrixHint(ratio: unknown): MediaHint {
  if (ratio === '16:9') return MATRIX_16_9
  if (ratio === '3:4') return MATRIX_3_4
  return MATRIX_1_1
}

/** resolveMediaHint 入参（装修器与资源表单两种来源二选一） */
export type MediaHintInput = {
  /** 装修器：区块类型 */
  blockType?: BlockType
  /** 装修器：字段名 */
  fieldName?: string
  /** 装修器：区块 props（用于读 height / ratio） */
  blockProps?: Record<string, unknown>
  /** 装修器：条目 props（carousel slide / 矩阵条目，读其 height） */
  itemProps?: Record<string, unknown>
  /** 资源表单：资源 key */
  resourceKey?: string
  /** 资源表单：字段 key */
  fieldKey?: string
}

/** 解析字段建议尺寸：动态分支（海报 / 矩阵）→ 静态映射表 → 兜底默认值 */
export function resolveMediaHint(input: MediaHintInput): MediaHint {
  const { blockType, fieldName, blockProps, itemProps, resourceKey, fieldKey } = input

  // 资源表单：按「资源 key.字段 key」取，未命中回退默认
  if (resourceKey && fieldKey) {
    return RESOURCE_MEDIA_HINTS[`${resourceKey}.${fieldKey}`] ?? DEFAULT_MEDIA_HINT
  }

  if (!blockType || !fieldName) return DEFAULT_MEDIA_HINT

  // 海报（hero / carousel slide）：比例随高度档位变化
  if (blockType === 'hero' || blockType === 'carousel') {
    if (fieldName === 'imageMobile') return POSTER_MOBILE
    if (POSTER_RATIO_FIELDS.has(fieldName)) return posterHint(itemProps?.height ?? blockProps?.height)
  }

  // 产品矩阵：比例随「图片比例」变化
  if (blockType === 'productMatrix' && (fieldName === 'image' || fieldName === 'imageMobile')) {
    return matrixHint(blockProps?.ratio)
  }

  return BLOCK_MEDIA_HINTS[`${blockType}.${fieldName}`] ?? DEFAULT_MEDIA_HINT
}

/** 是否需要渲染「虚线安全区预览」：海报主体图 + 产品矩阵图 */
export function isSafetyAreaField(blockType: BlockType | undefined, fieldName: string): boolean {
  if (!blockType) return false
  if (blockType === 'hero' || blockType === 'carousel') return POSTER_RATIO_FIELDS.has(fieldName)
  if (blockType === 'productMatrix') return fieldName === 'image' || fieldName === 'imageMobile'
  return false
}

/** '16:9' → '16 / 9'（CSS aspect-ratio 取值） */
export function ratioToAspect(ratio: string): string {
  return ratio.replace(':', ' / ')
}
