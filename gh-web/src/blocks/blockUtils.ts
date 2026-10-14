/**
 * 区块渲染工具：把内容库返回的 `props: Record<string, unknown>` 安全收敛为
 * 契约 §4 的字段类型，供 16 类区块组件消费。
 *
 * 内容库数据来自网络（后端 / 后台可编辑），字段缺失或类型不符时一律回退到
 * 空值 / 兜底值，避免渲染期抛错——三态与健壮性不能回退。
 */
import type { BlockLink, BlockStyle, StatItem } from './types'

/** 收窄为普通对象；数组 / null / 原始值一律返回空对象 */
export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

/** 收窄为字符串 */
export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

/** 收窄为有限数字 */
export function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** 收窄为布尔 */
export function asBool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/** 收窄为数组 */
export function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

/** 收窄为字符串数组（过滤非字符串项） */
export function asStringArray(value: unknown): string[] {
  return asArray<unknown>(value).filter((item): item is string => typeof item === 'string')
}

/**
 * 数据源区块「手动挑选」：scope === 'manual' 且给了 ids 时，按 ids 顺序挑选并排序；
 * 否则原样返回。用于文章 / 下载 / 问答等集合型区块的「挑具体几条」能力。
 */
export function pickByIds<T extends { id?: string }>(items: T[], scope: string, ids: string[]): T[] {
  if (scope !== 'manual' || ids.length === 0) return items
  const order = new Map(ids.map((id, index) => [id, index]))
  return items
    .filter((item) => Boolean(item.id) && order.has(item.id as string))
    .sort((a, b) => (order.get(a.id as string) ?? 0) - (order.get(b.id as string) ?? 0))
}

/** 收窄为 { label, href } 链接；两者缺一即视为无效 */
export function asLink(value: unknown): BlockLink | null {
  const record = asRecord(value)
  const label = asString(record.label)
  const href = asString(record.href)
  return label && href ? { label, href } : null
}

/** 收窄为 { value, label, unit?, note? } 数值项数组 */
export function asStatItems(value: unknown): StatItem[] {
  return asArray<Record<string, unknown>>(value)
    .map((item) => ({
      value: asString(item.value),
      label: asString(item.label),
      unit: asString(item.unit),
      note: asString(item.note),
    }))
    .filter((item) => item.value || item.label)
}

/** columns → 网格类名（仅接受 2 / 3 / 4） */
export function gridClass(value: unknown, fallback: 2 | 3 | 4 = 3): string {
  const columns = value === 2 || value === 3 || value === 4 ? value : fallback
  return `blk-grid blk-grid--${columns}`
}

/** container → 容器宽度类名（缺省 normal；'full' 通栏由外壳类名控制，见 shellClass） */
export function containerClass(value: BlockStyle['container']): string {
  const container = value === 'wide' || value === 'narrow' || value === 'full' ? value : 'normal'
  return `blk__container--${container}`
}

/** BlockStyle → 区块外壳类名（令牌组合，不引入新视觉语言） */
export function shellClass(style: BlockStyle | undefined): string {
  const classes = ['blk']
  if (style?.background && style.background !== 'none') classes.push(`blk--bg-${style.background}`)
  classes.push(`blk--py-${style?.paddingY ?? 'md'}`)
  if (style?.align === 'center') classes.push('blk--align-center')
  if (style?.theme === 'dark') classes.push('blk--theme-dark')
  // 通栏 / 全宽：不套内容容器的内边距与最大宽度，由区块内部自行控制铺满
  if (style?.container === 'full') classes.push('blk--full')
  return classes.join(' ')
}

/**
 * 区块锚点 → 合法 id（仅保留字母 / 数字 / 连字符 / 下划线；空串或非法返回 undefined）。
 * 用于 `/support#warranty` 这类页内深链定位；不改变 shellClass 的视觉语义。
 */
export function normalizeAnchor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const id = value.trim().replace(/[^A-Za-z0-9_-]/g, '')
  return id.length > 0 ? id : undefined
}

/** 正文多行文本 → 段落数组（内容库以 `\n` 连接多段） */
export function splitBody(body: string): string[] {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/** 图片地址是否可直接渲染（排除空值） */
export function hasImage(value: string): boolean {
  return value.trim().length > 0
}