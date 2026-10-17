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
  /** 角标是否摇动（隔几秒轻摇一下；缺省不摇，`prefers-reduced-motion` 下不摇） */
  badgeShake?: boolean
}

/**
 * 一级导航（2.0：7 → 5）。
 * - 光魂 Center / 天梯榜 为单页展示（无下拉），`menu: ''` → 顶栏/抽屉都按普通链接直达；
 * - 「关于光魂」改名「探索光魂」并吸收「商业合作」；「评测与资讯」整项移除（页面保留）。
 */
export const NAV_ITEMS: NavItem[] = [
  { label: '产品', to: '/products', menu: 'products', nav: 'products' },
  { label: '光魂 Center', to: '/center', menu: '', nav: 'center', badge: 'new', badgeShake: true },
  { label: '天梯榜', to: '/ladder', menu: '', nav: 'ladder', badge: 'hot', badgeShake: true },
  { label: '服务与支持', to: '/support', menu: 'support', nav: 'support' },
  { label: '探索光魂', to: '/about', menu: 'about', nav: 'about' },
]

/**
 * 下拉菜单面板（2.0：二级 45 → 16 条）。
 *
 * 仅保留三个有下拉的一级项（产品 / 服务支持 / 探索光魂）；「光魂 Center」「天梯榜」无下拉。
 * 移除的条目（按场景选择 / 产品系列 / 品牌档案 / 光魂实验室 / 热门条目等）收进各自页面，不再占下拉。
 * 推荐卡（feature）由站点配置 `navFeatureEnabled` 开关控制，默认不渲染（数据保留）。
 */
export const MEGA_PANELS: MegaPanel[] = [
  {
    key: 'products',
    columns: [
      {
        eyebrow: '精选型号',
        links: [
          { label: '54027X1QE-W54 540Hz OLED', to: '/products/gh-54027x1qe' },
          { label: '32X1UE-W16 双模 4K OLED', to: '/products/gh-32x1ue' },
          { label: '28027X1QE-W28 280Hz OLED', to: '/products/gh-28027x1qe' },
        ],
      },
      {
        eyebrow: '快速入口',
        links: [
          { label: '全部产品', to: '/products' },
          { label: '产品对比', to: '/compare' },
        ],
      },
    ],
    feature: { eyebrow: 'FEATURED', title: '54027X1QE-W54', desc: '26.5 英寸 2K@540Hz · 0.03 ms GTG' },
  },
  {
    key: 'support',
    columns: [
      {
        eyebrow: '支持与文档',
        links: [
          // 「服务与支持」一级项本身即聚合门户，二级不再重复列一次（原自重复项已删除）
          { label: '下载中心', to: '/downloads' },
          { label: '型号与兼容', to: '/support/models' },
          { label: '常见问题', to: '/faq' },
          // 保修与售后：独立入口，直达服务支持页的保修区块（页面内锚点 #warranty）
          { label: '保修与售后', to: '/support#warranty' },
        ],
      },
      {
        eyebrow: '联系',
        links: [{ label: '提交咨询', to: '/inquiry' }],
      },
    ],
    feature: { eyebrow: 'SUPPORT', title: '保修与售后', desc: '400 电话 · 在线工单' },
  },
  {
    key: 'about',
    columns: [
      {
        eyebrow: '品牌',
        links: [
          { label: '关于光魂', to: '/about' },
          { label: '电竞合作', to: '/brand/esports' },
        ],
      },
      {
        eyebrow: '合作',
        links: [
          { label: '商业合作', to: '/business' },
          { label: '合作案例', to: '/business/cases' },
          // 品牌资料入口暂指向合作页内的品牌资料区块锚点；后续将替换为独立入口
          { label: '品牌资料下载', to: '/business#brand-assets' },
        ],
      },
      {
        eyebrow: '合规',
        links: [{ label: '合规与协议', to: '/legal/privacy' }],
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
  // 服务与支持下的独立页面（下载中心 / 常见问题 / 提交咨询）同属该一级项，顶栏需保持高亮
  downloads: 'support',
  faq: 'support',
  inquiry: 'support',
  business: 'about',
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
