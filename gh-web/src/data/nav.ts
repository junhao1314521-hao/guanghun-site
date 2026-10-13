/** 主导航与宽屏下拉菜单（Mega Menu）数据：单一真源，移动端抽屉由此克隆 */

export type MegaLink = { label: string; to: string }
export type MegaColumn = { eyebrow: string; links: MegaLink[] }
export type MegaFeature = { eyebrow: string; title: string; desc: string }
export type MegaPanel = { key: string; columns: MegaColumn[]; feature: MegaFeature }

export type NavItem = {
  label: string
  to: string
  /** 对应下拉菜单面板 key；空串表示该一级项无下拉（直接跳转） */
  menu: string
  /** 顶栏高亮归属（未设置则不参与高亮） */
  nav?: string
}

/**
 * 一级导航。
 * Center 为单页展示（无需下拉），`menu: ''` → 顶栏/抽屉都按普通链接直达 `/center`。
 */
export const NAV_ITEMS: NavItem[] = [
  { label: '产品', to: '/products', menu: 'products', nav: 'products' },
  { label: 'Center', to: '/center', menu: '', nav: 'center' },
  { label: '天梯榜', to: '/ladder', menu: 'ladder', nav: 'ladder' },
  { label: '文章', to: '/articles', menu: 'articles' },
  { label: '服务支持', to: '/support', menu: 'support', nav: 'support' },
  { label: '商业合作', to: '/business', menu: 'business', nav: 'business' },
  { label: '关于光魂', to: '/about', menu: 'about', nav: 'about' },
]

/**
 * 下拉菜单面板（仅保留「点进去确有内容」的链接）。
 *
 * 维护口径：只收录**目标页真实存在**且语义成立的目的地；已移除的失效形态：
 * - 锚点深链（如 `/center#download`、`/support#warranty`）——目标页无对应锚点；
 * - 不存在的详情 id（如 `/articles/latency-test`）与无效榜单指标（`/ladder/weight`）；
 * - 产品列表 `?line= / ?scene= / ?tag=`——筛选状态未走 URL，深链不生效。
 * 若后续需要「按分类/场景直达筛选」，应先把区块筛选改为 URL 驱动再回收这些入口。
 */
export const MEGA_PANELS: MegaPanel[] = [
  {
    key: 'products',
    columns: [
      {
        eyebrow: '产品总览',
        links: [
          { label: '全部产品', to: '/products' },
          { label: '产品对比', to: '/compare' },
        ],
      },
      {
        eyebrow: '精选型号',
        links: [
          { label: 'GH-M900 PRO 旗舰鼠标', to: '/products/gh-m900-pro' },
          { label: 'GH-K870 三模键盘', to: '/products/gh-k870' },
          { label: 'GH-H500 无线耳机', to: '/products/gh-h500' },
        ],
      },
    ],
    feature: { eyebrow: 'FEATURED', title: 'GH-M900 PRO', desc: '58 g 轻量 · 26,000 DPI 光学引擎' },
  },
  {
    key: 'ladder',
    columns: [
      {
        eyebrow: '榜单',
        links: [
          { label: '综合榜', to: '/ladder' },
          { label: '鼠标榜', to: '/ladder?type=mouse' },
          { label: '键盘榜', to: '/ladder?type=keyboard' },
          { label: '耳机榜', to: '/ladder?type=headset' },
        ],
      },
      {
        eyebrow: '热门条目',
        links: [
          { label: '端到端延迟 TOP 10', to: '/ladder?metric=latency' },
          { label: '续航实测排行', to: '/ladder?metric=battery' },
        ],
      },
    ],
    feature: { eyebrow: 'RANKING', title: '天梯榜 · 综合榜', desc: '全部参数公开、方法可复现' },
  },
  {
    key: 'articles',
    columns: [
      {
        eyebrow: '分类',
        links: [
          { label: '全部文章', to: '/articles' },
          { label: '评测', to: '/articles?category=review' },
          { label: '教程', to: '/articles?category=guide' },
          { label: '行业观察', to: '/articles?category=insight' },
          { label: '品牌动态', to: '/articles?category=brand' },
        ],
      },
    ],
    feature: { eyebrow: 'LATEST', title: '最新评测', desc: '最新评测文章，配图以官方发布为准' },
  },
  {
    key: 'support',
    columns: [
      {
        eyebrow: '支持',
        links: [
          { label: '服务支持', to: '/support' },
          { label: '下载中心', to: '/downloads' },
          { label: '常见问题', to: '/faq' },
        ],
      },
      {
        eyebrow: '联系',
        links: [
          { label: '提交咨询', to: '/inquiry' },
          { label: '联系我们', to: '/contact' },
        ],
      },
    ],
    feature: { eyebrow: 'SUPPORT', title: '保修与售后', desc: '400 电话 · 在线工单' },
  },
  {
    key: 'business',
    columns: [
      {
        eyebrow: '合作',
        links: [
          { label: '商业合作', to: '/business' },
          { label: '合作场景', to: '/business/scenes' },
          { label: '合作案例', to: '/business/cases' },
          { label: '体验点', to: '/business/venues' },
        ],
      },
    ],
    feature: { eyebrow: 'B2B', title: '商务合作', desc: '渠道 / 赛事 / 内容合作' },
  },
  {
    key: 'about',
    columns: [
      {
        eyebrow: '关于',
        links: [
          { label: '关于光魂', to: '/about' },
          { label: '新闻中心', to: '/news' },
        ],
      },
      {
        eyebrow: '合规',
        links: [
          { label: '隐私政策', to: '/legal/privacy' },
          { label: '服务条款', to: '/legal/terms' },
          { label: 'Cookie 声明', to: '/legal/cookies' },
          { label: '备案信息', to: '/legal/records' },
        ],
      },
    ],
    feature: { eyebrow: 'BRAND', title: '品牌理念', desc: '以实测数据定义性能' },
  },
]

/** 页面 → 顶栏高亮归属；未列出的页面（如客户中心、搜索页）不参与高亮 */
export const PAGE_NAV: Record<string, string | undefined> = {
  home: 'products',
  list: 'products',
  detail: 'products',
  ladder: 'ladder',
  center: 'center',
  support: 'support',
  business: 'business',
  about: 'about',
  account: undefined,
  search: undefined,
}

/** 路由路径 → 设计页面标识（.mk-page[data-page] 与 PAGE_NAV 的键，单一真源） */
export function pageIdFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return 'home'
  if (segments[0] === 'products') return segments.length > 1 ? 'detail' : 'list'
  return segments[0]
}
