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
        eyebrow: 'Series',
        links: [
          { label: 'OLED flagship series', to: '/products/series/oled' },
          { label: 'Dual-mode series', to: '/products/series/dual' },
          { label: 'Gaming IPS series', to: '/products/series/ips' },
          { label: 'Desktop accessories', to: '/products/series/accessory' },
        ],
      },
      {
        eyebrow: 'Featured models',
        links: [
          { label: '54027X1QE-W54 540Hz OLED', to: '/products/gh-54027x1qe' },
          { label: '32X1UE-W16 dual-mode 4K OLED', to: '/products/gh-32x1ue' },
          { label: '28027X1QE-W28 280Hz OLED', to: '/products/gh-28027x1qe' },
        ],
      },
    ],
    feature: { eyebrow: 'FEATURED', title: '54027X1QE-W54', desc: '26.5" 2K@540Hz · 0.03 ms GTG' },
  },
  {
    key: 'ladder',
    columns: [
      {
        eyebrow: 'Rankings',
        links: [
          { label: 'Overall', to: '/ladder' },
          { label: 'OLED flagship', to: '/ladder?type=oled' },
          { label: 'Dual-mode', to: '/ladder?type=dual' },
          { label: 'Gaming IPS', to: '/ladder?type=ips' },
        ],
      },
      {
        eyebrow: 'Popular',
        links: [
          { label: 'Response time rankings', to: '/ladder/latency' },
          { label: 'Peak brightness rankings', to: '/ladder/battery' },
          { label: 'Color accuracy rankings', to: '/ladder/sensor' },
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
        eyebrow: 'Brand',
        links: [
          { label: 'Brand profile · Guanghun', to: '/brand/guanghun' },
          { label: 'Guanghun Lab', to: '/brand/lab' },
          { label: 'Esports partnerships', to: '/brand/esports' },
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
