/**
 * 数据可信度审计（阶段 6 · 数据机制）
 * ============================================================
 * 目的：把「没有真实来源的数字 / 承诺」在发布前暴露出来，避免再次出现编造数据或改一处漏一处。
 *
 * 规则（只告警、不阻断发布）：
 * - 区块标记 `dataStatus = 'verified'` 且有 `dataSource` → 视为可核对，跳过；
 * - 其余区块扫描用户可见文案：命中承诺词（包邮 / 现货 / 无理由 / 售罄 …）或
 *   带单位的效果数字（倍 / % / 小时 / 所 / 个 / 款 / 人次）→ 列入待补清单；
 * - 区块标记 `dataStatus = 'pending'` → 一律列入，并注明前台已降级。
 *
 * 只扫文案字段：图片 / 链接 / 媒体地址与 `dataStatus`、`dataSource` 本身不参与，避免路径里的数字误报。
 */
import type { Block, Page } from '../data/contentTypes'

export type DataAuditReason = 'pending' | 'claim-without-source'

export type DataAuditItem = {
  pageKey: string
  pageTitle: string
  blockId: string
  blockType: string
  /** 字段路径，如 `results[0].value`，便于运营定位 */
  field: string
  text: string
  reason: DataAuditReason
}

/** 承诺类关键词：出现即需要来源 */
const CLAIM_WORDS = /(包邮|现货速发|现货|无理由|售罄|秒罄|好评率|销量)/
/** 效果类数字：金额 / 倍数 / 时长 / 覆盖量等，必须能对应统计口径 */
const CLAIM_NUMBERS = /\d+(?:[.,]\d+)?\s*(?:倍|%|万\+|小时|分钟|所|个|款|人次)/
/** 功能上限之类的规则描述（「选择最多 4 款」）不算数据承诺，先剔除再匹配 */
const RULE_PHRASES = /(?:最多|至少|不超过|可选|选择)\s*\d+\s*(?:款|个|所|台)?/g

/** 去除规则描述后再判断是否为数据承诺 */
function isClaim(text: string): boolean {
  const cleaned = text.replace(RULE_PHRASES, '')
  return CLAIM_WORDS.test(cleaned) || CLAIM_NUMBERS.test(cleaned)
}

/** 不参与扫描的字段（媒体地址、链接、标识） */
const SKIP_KEYS = new Set([
  'id',
  'href',
  'url',
  'src',
  'media',
  'mediaUrl',
  'poster',
  'posterMobile',
  'image',
  'images',
  'gallery',
  'background',
  'video',
  'anchor',
  'dataStatus',
  'dataSource',
])

function walkStrings(value: unknown, path: string, visit: (text: string, field: string) => void): void {
  if (typeof value === 'string') {
    if (value.trim()) visit(value, path)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkStrings(entry, `${path}[${index}]`, visit))
    return
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    // 指标条目（value + unit 分开存）：合并成一个串再匹配，「12」「所」单独看都命中不了
    if (
      (typeof record.value === 'string' || typeof record.value === 'number') &&
      typeof record.unit === 'string' &&
      record.unit
    ) {
      visit(`${record.value}${record.unit}`, path ? `${path}.value` : 'value')
    }
    for (const [key, entry] of Object.entries(value)) {
      if (SKIP_KEYS.has(key)) continue
      walkStrings(entry, path ? `${path}.${key}` : key, visit)
    }
  }
}

/** 单个区块的待补项；通过返回空数组表示该区块无需提示 */
export function auditBlock(block: Block): Omit<DataAuditItem, 'pageKey' | 'pageTitle'>[] {
  const props = (block.props ?? {}) as Record<string, unknown>
  const status = props.dataStatus
  const source = typeof props.dataSource === 'string' ? props.dataSource.trim() : ''
  if (status === 'verified' && source) return []

  const hits: Omit<DataAuditItem, 'pageKey' | 'pageTitle'>[] = []
  walkStrings(props, '', (text, field) => {
    if (status === 'pending') {
      hits.push({ blockId: block.id, blockType: block.type, field, text, reason: 'pending' })
      return
    }
    if (isClaim(text)) {
      hits.push({ blockId: block.id, blockType: block.type, field, text, reason: 'claim-without-source' })
    }
  })
  return hits
}

/** 审计若干页面；默认由调用方传入（便于测试注入固定页面） */
export function auditPages(pages: Page[]): DataAuditItem[] {
  const items: DataAuditItem[] = []
  for (const page of pages) {
    for (const block of page.blocks ?? []) {
      for (const hit of auditBlock(block)) {
        items.push({ pageKey: page.key, pageTitle: page.title, ...hit })
      }
    }
  }
  return items
}
