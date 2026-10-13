/**
 * 宽屏下拉菜单（Mega Menu）英文覆盖：与 `data/nav.ts` 的 `MEGA_PANELS` 一一对应
 * （相同的 `key`、`to` 与结构，仅译可见文案）。语言为英文时由 SiteHeader / MobileDrawer 选用，
 * 保证二级栏目与一级导航同为英文；未覆盖到的项仍回退中文。
 *
 * 说明：`center` 面板已随一级项改为「单页展示、无下拉」而移除（见 nav.ts 的 NAV_ITEMS）。
 */
import type { MegaPanel } from './nav'

export const MEGA_PANELS_EN: MegaPanel[] = [
  {
    key: 'products',
    columns: [
      {
        eyebrow: 'Overview',
        links: [
          { label: 'All products', to: '/products' },
          { label: 'Compare products', to: '/compare' },
        ],
      },
      {
        eyebrow: 'Featured models',
        links: [
          { label: 'GH-M900 PRO flagship mouse', to: '/products/gh-m900-pro' },
          { label: 'GH-K870 tri-mode keyboard', to: '/products/gh-k870' },
          { label: 'GH-H500 wireless headset', to: '/products/gh-h500' },
        ],
      },
    ],
    feature: { eyebrow: 'FEATURED', title: 'GH-M900 PRO', desc: '58 g lightweight · 26,000 DPI optical engine' },
  },
  {
    key: 'ladder',
    columns: [
      {
        eyebrow: 'Rankings',
        links: [
          { label: 'Overall', to: '/ladder' },
          { label: 'Mice', to: '/ladder?type=mouse' },
          { label: 'Keyboards', to: '/ladder?type=keyboard' },
          { label: 'Headsets', to: '/ladder?type=headset' },
        ],
      },
      {
        eyebrow: 'Popular',
        links: [
          { label: 'End-to-end latency TOP 10', to: '/ladder?metric=latency' },
          { label: 'Battery rankings', to: '/ladder?metric=battery' },
        ],
      },
    ],
    feature: { eyebrow: 'RANKING', title: 'Rankings · Overall', desc: 'All specs public, methods reproducible' },
  },
  {
    key: 'articles',
    columns: [
      {
        eyebrow: 'Categories',
        links: [
          { label: 'All articles', to: '/articles' },
          { label: 'Reviews', to: '/articles?category=review' },
          { label: 'Guides', to: '/articles?category=guide' },
          { label: 'Insights', to: '/articles?category=insight' },
          { label: 'Brand', to: '/articles?category=brand' },
        ],
      },
    ],
    feature: { eyebrow: 'LATEST', title: 'Latest reviews', desc: 'Latest reviews; images per official release' },
  },
  {
    key: 'support',
    columns: [
      {
        eyebrow: 'Support',
        links: [
          { label: 'Support home', to: '/support' },
          { label: 'Downloads', to: '/downloads' },
          { label: 'FAQ', to: '/faq' },
        ],
      },
      {
        eyebrow: 'Contact',
        links: [
          { label: 'Submit a ticket', to: '/inquiry' },
          { label: 'Contact us', to: '/contact' },
        ],
      },
    ],
    feature: { eyebrow: 'SUPPORT', title: 'Warranty & after-sales', desc: 'Hotline · online tickets' },
  },
  {
    key: 'business',
    columns: [
      {
        eyebrow: 'Partnerships',
        links: [
          { label: 'Business home', to: '/business' },
          { label: 'Scenarios', to: '/business/scenes' },
          { label: 'Case studies', to: '/business/cases' },
          { label: 'Experience spots', to: '/business/venues' },
        ],
      },
    ],
    feature: { eyebrow: 'B2B', title: 'Business partnerships', desc: 'Channel / esports / content' },
  },
  {
    key: 'about',
    columns: [
      {
        eyebrow: 'About',
        links: [
          { label: 'About Guanghun', to: '/about' },
          { label: 'Newsroom', to: '/news' },
        ],
      },
      {
        eyebrow: 'Compliance',
        links: [
          { label: 'Privacy policy', to: '/legal/privacy' },
          { label: 'Terms of service', to: '/legal/terms' },
          { label: 'Cookie policy', to: '/legal/cookies' },
          { label: 'Registration info', to: '/legal/records' },
        ],
      },
    ],
    feature: { eyebrow: 'BRAND', title: 'Brand philosophy', desc: 'Performance defined by measured data' },
  },
]
