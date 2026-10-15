/**
 * 宽屏下拉菜单（Mega Menu）英文覆盖：与 `data/nav.ts` 的 `MEGA_PANELS` 一一对应
 * （相同的 `key`、`to` 与结构，仅译可见文案）。语言为英文时由 SiteHeader / MobileDrawer 选用，
 * 保证二级栏目与一级导航同为英文；未覆盖到的项仍回退中文。
 *
 * 2.0：下拉面板收敛为 3 个（products / support / about）；
 * `ladder` / `articles` / `business` 面板已随一级项结构调整移除，
 * 「关于光魂」对应面板 key 仍为 `about`（前台文案为「探索光魂 / Explore」）。
 */
import type { MegaPanel } from './nav'

export const MEGA_PANELS_EN: MegaPanel[] = [
  {
    key: 'products',
    columns: [
      {
        eyebrow: 'Featured models',
        links: [
          { label: '54027X1QE-W54 540Hz OLED', to: '/products/gh-54027x1qe' },
          { label: '32X1UE-W16 dual-mode 4K OLED', to: '/products/gh-32x1ue' },
          { label: '28027X1QE-W28 280Hz OLED', to: '/products/gh-28027x1qe' },
        ],
      },
      {
        eyebrow: 'Quick links',
        links: [
          { label: 'All products', to: '/products' },
          { label: 'Compare products', to: '/compare' },
        ],
      },
    ],
    feature: { eyebrow: 'FEATURED', title: '54027X1QE-W54', desc: '26.5" 2K@540Hz · 0.03 ms GTG' },
  },
  {
    key: 'support',
    columns: [
      {
        eyebrow: 'Support',
        links: [
          { label: 'Support home', to: '/support' },
          { label: 'Downloads', to: '/downloads' },
          { label: 'Model support', to: '/support/models' },
          { label: 'FAQ', to: '/faq' },
        ],
      },
      {
        eyebrow: 'Contact',
        links: [{ label: 'Submit a ticket', to: '/inquiry' }],
      },
    ],
    feature: { eyebrow: 'SUPPORT', title: 'Warranty & after-sales', desc: 'Hotline · online tickets' },
  },
  {
    key: 'about',
    columns: [
      {
        eyebrow: 'Brand',
        links: [
          { label: 'About Guanghun', to: '/about' },
          { label: 'Esports partnerships', to: '/brand/esports' },
        ],
      },
      {
        eyebrow: 'Partnerships',
        links: [
          { label: 'Business partnerships', to: '/business' },
          { label: 'Case studies', to: '/business/cases' },
          // Brand assets entry points to the in-page anchor for now; will be a standalone entry later.
          { label: 'Brand assets', to: '/business#brand-assets' },
        ],
      },
      {
        eyebrow: 'Compliance',
        links: [{ label: 'Compliance & policies', to: '/legal/privacy' }],
      },
    ],
    feature: { eyebrow: 'BRAND', title: 'Brand philosophy', desc: 'Performance defined by measured data' },
  },
]
