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
import type { CropPreviewSpec } from './ImageCropPreview'

/** 尺寸提示（结构化：便于上传校验、安全区预览复用比例 + 建议尺寸） */
export type MediaHint = {
  /** 建议尺寸，如 2560×1440；不限制高度的长图写「宽 1240」 */
  size: string
  /** 宽高比，如 16:9 */
  ratio: string
  /** 建议单文件大小，如 ≤2MB（可选） */
  maxSize?: string
  /** 支持格式说明（可选；缺省「支持 jpg/png/webp」） */
  formats?: string
  /** 背景要求（可选）：transparent 透明底 / white 白底 / any 不限 */
  background?: 'transparent' | 'white' | 'any'
  /** 构图要求（可选），如「主体占画面 70–75%，底部留 15%」 */
  subject?: string
  /** 额外说明（可选，如「建议 ≤20 张」） */
  extra?: string
}

const DEFAULT_FORMATS = '支持 jpg/png/webp'

/** 背景要求 → 提示文案 */
const BACKGROUND_TEXT: Record<NonNullable<MediaHint['background']>, string> = {
  transparent: '透明底 PNG',
  white: '白底',
  any: '背景不限',
}

/** 兜底默认值：未命中任何映射的图片字段 */
export const DEFAULT_MEDIA_HINT: MediaHint = { size: '1600×900', ratio: '16:9', maxSize: '≤2MB' }

/**
 * 渲染成一行提示文案，例：
 * `建议上传 2000×2000（1:1）· ≤10MB · 透明底 PNG · 支持 png（透明底）/ jpg · 主体占画面 70–75%`
 */
export function mediaHintText(hint: MediaHint): string {
  const parts = [`建议上传 ${hint.size}${hint.ratio === '不限高' ? '' : `（${hint.ratio}）`}`]
  if (hint.maxSize) parts.push(hint.maxSize)
  if (hint.background && hint.background !== 'any') parts.push(BACKGROUND_TEXT[hint.background])
  parts.push(hint.formats ?? DEFAULT_FORMATS)
  if (hint.subject) parts.push(hint.subject)
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

/** 产品主图：1:1 透明底，首图即详情页主图，Center 页同源 */
const PRODUCT_MAIN: MediaHint = {
  size: '2000×2000',
  ratio: '1:1',
  maxSize: '≤10MB',
  formats: '支持 png / jpg',
  background: 'transparent',
  subject: '主体占画面 70–75%，底部留 15%',
}

/** 资源表单字段 → 尺寸提示（key = `资源 key.字段 key`） */
const RESOURCE_MEDIA_HINTS: Record<string, MediaHint> = {
  // 产品相册：第一张 = 详情页主图 = 产品网格首图 = Center 页卡片图
  'products.gallery': { ...PRODUCT_MAIN, extra: '第一张即详情页主图' },
  // 产品详情页 H5 长图：所有切片必须同宽，否则拼接错位
  'products.h5LongImages': {
    size: '宽 1240',
    ratio: '不限高',
    maxSize: '≤2MB',
    formats: '支持 jpg/png',
    extra: '所有切片宽度必须一致，按从上到下的顺序上传',
  },
  'products.h5LongImagesMobile': {
    size: '宽 750',
    ratio: '不限高',
    maxSize: '≤2MB',
    formats: '支持 jpg/png',
    extra: '所有切片宽度必须一致，按从上到下的顺序上传',
  },
  // 产品 3D 预览封面
  'products.model3dPoster': {
    size: '2000×2000',
    ratio: '1:1',
    maxSize: '≤10MB',
    formats: '支持 png（透明底）/ jpg',
    background: 'transparent',
    subject: '与 3D 模型的拍摄视角保持一致',
  },
  // 文章 / 新闻封面
  'articles.coverImage': { size: '1600×900', ratio: '16:9', maxSize: '≤2MB', subject: '主体居中，四周留 8% 安全区' },
  // 品牌资料
  'biz-content.cover': { size: '1600×900', ratio: '16:9', maxSize: '≤2MB', subject: '主体居中，四周留 8% 安全区' },
  // 合作案例
  'biz-cases.cover': { size: '1600×900', ratio: '16:9', maxSize: '≤2MB', subject: '主体居中，四周留 8% 安全区' },
  // 体验点（门店）
  'biz-venues.cover': { size: '1600×1200', ratio: '4:3', maxSize: '≤2MB', subject: '门店主体居中，避免贴边' },
  'biz-venues.gallery': { size: '1600×1200', ratio: '4:3', maxSize: '≤2MB', subject: '门店主体居中，避免贴边', extra: '第一张也会作为封面' },
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

/**
 * 下游裁切预览位（与前台真实版式对齐）：
 * - 产品相册首图同时出现在「产品列表卡 4:3」「详情页主图 1:1」「Center 卡 2.4:1」三处，
 *   所以给三个预览框，运营能直接看到会不会被裁；
 * - 其余图片位按自身的建议比例给一个页面裁切预览。
 */
export function resolveMediaCrops(
  resourceKey: string,
  fieldKey: string,
  hint: MediaHint,
): CropPreviewSpec[] | undefined {
  if (resourceKey === 'products' && fieldKey === 'gallery') {
    return [
      { label: '产品列表卡 4:3', ratio: '4 / 3', fit: 'cover', tone: 'dark' },
      { label: '详情页主图 1:1', ratio: '1 / 1', fit: 'contain', tone: 'dark' },
      { label: 'Center 卡（约 2.4:1）', ratio: '2.37 / 1', fit: 'contain', tone: 'dark' },
    ]
  }
  if (!/^\d+(\.\d+)?:\d+(\.\d+)?$/.test(hint.ratio)) return undefined
  return [{ label: `页面裁切 ${hint.ratio}`, ratio: ratioToAspect(hint.ratio), fit: 'cover' }]
}
