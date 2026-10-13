/**
 * 双语（中/英）locale 工具（零外部依赖）。
 *
 * 设计（与《内容库与装修契约》一致）：
 * - 中文为默认 / 回退语言；英文为可选变体。
 * - 页面变体：英文页以 baseKey + `__en` 后缀存入同一张 `content_pages` 表
 *   （如 `home` 的英文变体为 `home__en`）。命中即用，未命中回退中文 baseKey。
 * - 集合变体：单条记录上挂 `en` 字段（部分覆盖），按 locale 浅合并后剔除 `en`，缺字段回退中文。
 * - 站点配置：`SiteConfig.en`（可选）存英文 nav/footer 覆盖，按 locale 取用。
 *
 * 这样既不破坏既有中文数据形状，又让「缺英文就回退中文」成为统一规则。
 */
import type { Request } from 'express'

/** 英文页面变体 key 后缀 */
export const EN_KEY_SUFFIX = '__en'

/** 受支持的 locale（其余一律按默认中文处理） */
export type Locale = 'zh-CN' | 'en'

/** 默认 locale（中文） */
export const DEFAULT_LOCALE: Locale = 'zh-CN'

/**
 * 从请求 `?locale=` 解析 locale；非 'en' 一律视为默认中文。
 * （未来扩展其它语言时在此收敛，调用方无感。）
 */
export function readLocale(req: Request): Locale {
  const raw = typeof req.query.locale === 'string' ? req.query.locale : Array.isArray(req.query.locale) ? req.query.locale[0] : ''
  return raw === 'en' ? 'en' : DEFAULT_LOCALE
}

/** 是否为英文变体 key（以 `__en` 结尾） */
export function isEnKey(key: string): boolean {
  return key.endsWith(EN_KEY_SUFFIX)
}

/** 取 baseKey：去掉 `__en` 后缀（非变体 key 原样返回） */
export function baseKeyOfKey(key: string): string {
  return isEnKey(key) ? key.slice(0, -EN_KEY_SUFFIX.length) : key
}

/** 由 baseKey 构造英文变体 key */
export function enKeyOf(baseKey: string): string {
  return `${baseKey}${EN_KEY_SUFFIX}`
}

/**
 * 按_locale 合并记录上的 `en` 部分覆盖字段，并在结果中剔除 `en`（保持响应形状干净）。
 * - locale='en' 且 record.en 为对象：浅合并 `{ ...record, ...record.en }` 后删 `en`；
 * - 其余情况：返回**剔除 `en` 后的副本**（避免把内部覆盖字段透出给前台）。
 * - 无 `en` 字段：原样返回（深拷贝以避免调用方改写库内对象）。
 */
export function localizeRecord<T extends Record<string, unknown>>(record: T, locale: Locale): T {
  const enOverlay = (record as unknown as { en?: unknown }).en
  const clone = { ...record }
  delete (clone as { en?: unknown }).en
  if (locale === 'en' && enOverlay && typeof enOverlay === 'object' && !Array.isArray(enOverlay)) {
    Object.assign(clone, enOverlay)
  }
  return clone
}

/** 批量 localize（保持数组语义；返回新数组，不改写入参元素） */
export function localizeRecords<T extends Record<string, unknown>>(records: T[], locale: Locale): T[] {
  return records.map((record) => localizeRecord(record, locale))
}
