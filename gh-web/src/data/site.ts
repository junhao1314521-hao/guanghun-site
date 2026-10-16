/** 全站共用数据：语言选项、页脚 */
import type { ShopChannel, SiteSocialConfig, SiteSocialItem } from './contentTypes'

export type LangOption = { code: string; label: string; short?: string }

/**
 * 语言「可选列表」单一真源（顶栏 / 抽屉下拉都读它）。
 * 客户要求只保留「中文 / English」两项：移除繁体入口，标签同时把「简体中文」简写为「中文」。
 * `short`：仅用于顶栏触发项的「简写」文案——客户要求触发项由「中文」收成单个「中」字，
 * 下拉列表仍展示完整 `label`（中文 / English），故把简写独立成一字段，不动列表文案。
 */
export const LANG_OPTIONS: LangOption[] = [
  { code: 'zh-CN', label: '中文', short: '中' },
  { code: 'en', label: 'English' },
]

/**
 * 已知语言的标签（含已从「可选列表」下线的繁体）。
 * 繁体虽不再出现在下拉里，但保留其标签与文案字典（见 i18n.tsx 的 MESSAGES['zh-HK']），
 * 以便切换逻辑仍能识别该语言码并给出正确的「建设中」提示，不拿中文冒充（AC-15③）。
 */
export const LANG_LABELS: Record<string, string> = {
  'zh-CN': '中文',
  'zh-HK': '繁體中文',
  en: 'English',
}

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

/**
 * 店铺渠道兜底（后台未配置时使用）：天猫 / 京东 / 淘宝。
 * 注意：`href` 为占位外链，**上线前替换为真实店铺链接**。
 */
export const FALLBACK_SHOP_CHANNELS: ShopChannel[] = [
  { name: '天猫', href: 'https://tmall.example/' },
  { name: '京东', href: 'https://jd.example/' },
  { name: '淘宝', href: 'https://taobao.example/' },
]

/** 店铺渠道排序：任一条配置了 `order` 时按数值升序（稳定），否则保持数组原序 */
export function orderShopChannels(channels: ShopChannel[]): ShopChannel[] {
  if (!channels.some((channel) => typeof channel.order === 'number')) return channels
  return channels
    .map((channel, index) => ({ channel, index }))
    .sort((a, b) => (a.channel.order ?? a.index) - (b.channel.order ?? b.index))
    .map((entry) => entry.channel)
}
