/** 全站共用数据：语言选项、页脚 */
import type { SiteSocialConfig, SiteSocialItem } from './contentTypes'

export type LangOption = { code: string; label: string }

export const LANG_OPTIONS: LangOption[] = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-HK', label: '繁體中文' },
  { code: 'en', label: 'English' },
]

export const FOOTER_GROUPS = [
  { title: '产品', links: [{ label: '全部产品', to: '/products' }, { label: '产品对比', to: '/compare' }, { label: '天梯榜', to: '/ladder' }] },
  { title: '服务支持', links: [{ label: '服务支持', to: '/support' }, { label: '下载中心', to: '/downloads' }, { label: '型号支持', to: '/support/models' }, { label: '常见问题', to: '/faq' }, { label: '提交咨询', to: '/inquiry' }] },
  { title: '探索光魂', links: [{ label: '关于光魂', to: '/about' }, { label: '商业合作', to: '/business' }, { label: '合作案例', to: '/business/cases' }, { label: '电竞合作', to: '/brand/esports' }, { label: '合规与协议', to: '/legal/privacy' }] },
]

/** 站点级对外邮箱（单一真源；占位，上线前替换为真实邮箱） */
export const SITE_EMAILS = {
  /** 商务合作 */
  business: 'business@guanghun.example',
  /** 媒体送测 */
  press: 'press@guanghun.example',
} as const

/** 页脚公司信息（品牌大字下方一行） */
export const SITE_COMPANY = '光魂科技（深圳）有限公司'

/** 备案号：底部显示，可点击跳备案信息页 */
export const SITE_RECORD = { label: '粤ICP备 2026-000000 号', to: '/legal/records' }

export const FOOTER_LEGAL = [
  { label: '隐私政策', to: '/legal/privacy' },
  { label: '服务条款', to: '/legal/terms' },
  { label: 'Cookie 声明', to: '/legal/cookies' },
  { label: '备案信息', to: '/legal/records' },
]

/** 页脚社交兜底（后台未配置时使用）：每平台一条，无二维码则展示账号提示 */
export const FALLBACK_SOCIAL: SiteSocialConfig = {
  items: [
    { label: '微信', account: 'guanghun-official' },
    { label: '微博', account: '光魂电竞' },
    { label: 'B 站', account: '光魂官方' },
    { label: '抖音', account: '光魂' },
  ],
}

/**
 * 页脚社交归一化（§1.9 数据兼容）：
 * - 新形态 `{ items }` 收敛为合法 `SiteSocialItem[]`；
 * - 旧形态 `{ links, qr }` 两条列表按平台名称合并为「每平台一条」
 *   （同名二维码并入对应链接条目）；
 * - 非法 / 空值一律丢弃，**绝不抛错**，保证旧站点配置也能平滑渲染。
 */
export function normalizeSocial(raw: unknown): SiteSocialItem[] {
  if (!raw || typeof raw !== 'object') return []
  const record = raw as Record<string, unknown>
  const readText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
  if (Array.isArray(record.items)) {
    const items: SiteSocialItem[] = []
    for (const entry of record.items) {
      if (!entry || typeof entry !== 'object') continue
      const e = entry as Record<string, unknown>
      const label = readText(e.label)
      if (!label) continue
      const qr = readText(e.qr)
      const account = readText(e.account)
      const href = readText(e.href)
      items.push({
        label,
        ...(qr ? { qr } : {}),
        ...(account ? { account } : {}),
        ...(href && href !== '#' ? { href } : {}),
      })
    }
    return dedupeSocial(items)
  }
  // 旧形态：图标+链接 与 二维码 两条列表 → 按名称合并
  const links = Array.isArray(record.links) ? record.links : []
  const qr = Array.isArray(record.qr) ? record.qr : []
  const items: SiteSocialItem[] = []
  const byLabel = new Map<string, SiteSocialItem>()
  const push = (item: SiteSocialItem) => {
    byLabel.set(item.label, item)
    items.push(item)
  }
  for (const link of links) {
    if (!link || typeof link !== 'object') continue
    const l = link as Record<string, unknown>
    const label = readText(l.label)
    if (!label) continue
    const href = readText(l.href)
    push({ label, ...(href && href !== '#' ? { href } : {}) })
  }
  for (const entry of qr) {
    if (!entry || typeof entry !== 'object') continue
    const q = entry as Record<string, unknown>
    const label = readText(q.label)
    const image = readText(q.image)
    if (!label) continue
    const existing = byLabel.get(label)
    if (existing) {
      if (image) existing.qr = image
    } else {
      push({ label, ...(image ? { qr: image } : {}) })
    }
  }
  return dedupeSocial(items)
}

/** 按平台名去重（保留首次出现的一条），避免同名平台重复渲染图标 */
function dedupeSocial(items: SiteSocialItem[]): SiteSocialItem[] {
  const seen = new Set<string>()
  const out: SiteSocialItem[] = []
  for (const item of items) {
    const key = item.label.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}
