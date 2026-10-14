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
  /** 右上角角标：new / hot（缺省无）；badgeText 覆盖默认文案（如「免费」） */
  badge?: 'new' | 'hot'
  badgeText?: string
  /** 角标是否摇动（隔几秒摇一下；缺省不摇） */
  badgeShake?: boolean
}

/**
 * 一级导航。
 * 光魂 Center 为单页展示（无需下拉），`menu: ''` → 顶栏/抽屉都按普通链接直达 `/center`。
 */
export const NAV_ITEMS: NavItem[] = [
  { label: '产品', to: '/products', menu: 'products', nav: 'products' },
  { label: '光魂 Center', to: '/center', menu: '', nav: 'center', badge: 'new', badgeShake: true },
  { label: '天梯榜', to: '/ladder', menu: 'ladder', nav: 'ladder', badge: 'hot', badgeShake: true },
  { label: '评测与资讯', to: '/articles', menu: 'articles' },
  { label: '服务支持', to: '/support', menu: 'support', nav: 'support' },
  { label: '商业合作', to: '/business', menu: 'business', nav: 'business' },
  { label: '关于光魂', to: '/about', menu: 'about', nav: 'about' },
]

/**
 * 下拉菜单面板（仅保留「点进去确有内容」的链接）。
 *
 * 维护口径：只收录**目标页真实存在**且语义成立的目的地。
 * 随本轮工程改造，以下形态已恢复可用：
 * - 锚点深链（`/center#download`、`/support#warranty`）——区块已支持 `style.anchor`，可页内定位；
 * - 产品列表 `?scene=`、评测列表 `?category=`、天梯 `?type=`——筛选状态已「全量进 URL」，深链生效。
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
        eyebrow: '产品系列',
        links: [
          { label: 'OLED 旗舰系列', to: '/products/series/oled' },
          { label: '双模高刷系列', to: '/products/series/dual' },
          { label: '电竞 IPS 系列', to: '/products/series/ips' },
          { label: '桌面周边系列', to: '/products/series/accessory' },
        ],
      },
      {
        eyebrow: '精选型号',
        links: [
          { label: '54027X1QE-W54 540Hz OLED', to: '/products/gh-54027x1qe' },
          { label: '32X1UE-W16 双模 4K OLED', to: '/products/gh-32x1ue' },
          { label: '28027X1QE-W28 280Hz OLED', to: '/products/gh-28027x1qe' },
        ],
      },
      {
        eyebrow: '按场景选择',
        links: [
          { label: '高刷 · 决胜毫秒', to: '/products?scene=scene-01' },
          { label: '色准 · 创作', to: '/products?scene=scene-02' },
          { label: '护眼 · 高效', to: '/products?scene=scene-03' },
          { label: '沉浸 · 影音', to: '/products?scene=scene-04' },
        ],
      },
    ],
    feature: { eyebrow: 'FEATURED', title: '54027X1QE-W54', desc: '26.5 英寸 2K@540Hz · 0.03 ms GTG' },
  },
  {
    key: 'ladder',
    columns: [
      {
        eyebrow: '榜单',
        links: [
          { label: '综合榜', to: '/ladder' },
          { label: 'OLED 旗舰榜', to: '/ladder?type=oled' },
          { label: '双模高刷榜', to: '/ladder?type=dual' },
          { label: '电竞 IPS 榜', to: '/ladder?type=ips' },
        ],
      },
      {
        eyebrow: '热门条目',
        links: [
          { label: '响应时间排行', to: '/ladder/latency' },
          { label: '峰值亮度排行', to: '/ladder/battery' },
          { label: '色准排行', to: '/ladder/sensor' },
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
          { label: '全部内容', to: '/articles' },
          { label: '评测', to: '/articles?category=review' },
          { label: '教程', to: '/articles?category=guide' },
          { label: '技术', to: '/articles?category=tech' },
        ],
      },
      {
        eyebrow: '动态',
        links: [
          { label: '新闻中心', to: '/news' },
          { label: '资讯', to: '/articles?category=news' },
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
          { label: '型号支持', to: '/support/models' },
          { label: '常见问题', to: '/faq' },
        ],
      },
      {
        eyebrow: '联系',
        links: [
          { label: '提交咨询', to: '/inquiry' },
          { label: '联系我们', to: '/contact' },
          { label: '保修与售后', to: '/support#warranty' },
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
        links: [{ label: '关于光魂', to: '/about' }],
      },
      {
        eyebrow: '品牌',
        links: [
          { label: '品牌档案 · 光魂', to: '/brand/guanghun' },
          { label: '光魂实验室', to: '/brand/lab' },
          { label: '电竞合作', to: '/brand/esports' },
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
