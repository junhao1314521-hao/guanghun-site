/** 全站共用数据：语言选项、页脚 */

export type LangOption = { code: string; label: string }

export const LANG_OPTIONS: LangOption[] = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-HK', label: '繁體中文' },
  { code: 'en', label: 'English' },
]

export const FOOTER_GROUPS = [
  { title: '产品', links: [{ label: '全部产品', to: '/products' }, { label: '天梯榜', to: '/ladder' }, { label: '产品对比', to: '/compare' }, { label: '文章', to: '/articles' }] },
  { title: '服务', links: [{ label: '服务支持', to: '/support' }, { label: '下载中心', to: '/downloads' }, { label: '常见问题', to: '/faq' }, { label: '提交咨询', to: '/inquiry' }] },
  { title: '关于', links: [{ label: '关于光魂', to: '/about' }, { label: '商业合作', to: '/business' }, { label: '联系我们', to: '/contact' }, { label: '体验点', to: '/business/venues' }] },
]

/** 站点级对外邮箱（单一真源；占位，上线前替换为真实邮箱） */
export const SITE_EMAILS = {
  /** 商务合作 */
  business: 'business@guanghun.example',
  /** 媒体送测 */
  press: 'press@guanghun.example',
} as const

export const FOOTER_LEGAL = [
  { label: '隐私政策', to: '/legal/privacy' },
  { label: '服务条款', to: '/legal/terms' },
  { label: 'Cookie 声明', to: '/legal/cookies' },
  { label: '备案信息', to: '/legal/records' },
]