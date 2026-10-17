/**
 * 内容库英文 seed（双语：中文为默认 / 回退，英文为 `__en` 变体）。
 *
 * 与 `contentSeed.ts` 一一对应：相同的页面 key（追加 `__en` 后缀）、相同的区块顺序与
 * 区块类型 / 样式，仅把 props 内可见文案译为英文。数据源区块（productGrid /
 * articleList / ranking / downloadList / faqList）的列表项由集合层 localize 提供，
 * 此处只译区块标题 / 描述。
 *
 * 媒体地址、产品 id 等跨语言不变量沿用中文 seed 同一来源，避免重复维护。
 *
 * 由 `contentStore.initStore` 追加式回填：仅当某 `__en` 变体不存在时写入，已存在一律保留。
 */
import type { Block, BlockStyle, BlockType, Page, SiteConfig } from './contentTypes'
import { EN_KEY_SUFFIX } from './locale'

/** seed 生成的固定时间戳：与中文 seed 一致，保证重复构建结果一致 */
const SEED_TIMESTAMP = '2026-10-12T00:00:00.000Z'

type Draft = { type: BlockType; props: Record<string, unknown>; style?: BlockStyle; enabled?: boolean }

/** 组装英文变体页：key = baseKey + `__en`；区块 id 沿用 `${baseKey}-b<n>` 以保持平行（enabled 缺省 true）。
 *  `pageEnabled` 缺省为 true；传 false 可令英文变体页默认下线（与中文页保持一致）。 */
function toPage(baseKey: string, path: string, title: string, description: string, drafts: Draft[], pageEnabled = true): Page {
  const key = `${baseKey}${EN_KEY_SUFFIX}`
  const blocks: Block[] = drafts.map((draft, index) => {
    const block: Block = {
      id: `${baseKey}-b${index + 1}`,
      type: draft.type,
      enabled: draft.enabled !== false,
      props: draft.props,
    }
    if (draft.style) block.style = draft.style
    return block
  })
  return { key, path, title, description, blocks, updatedAt: SEED_TIMESTAMP, enabled: pageEnabled }
}

/* ============================================================
   英文站点配置（nav / footer 覆盖；enabledBlocks / theme 仍取主配置）
   ============================================================ */

export const SITE_EN: NonNullable<SiteConfig['en']> = {
  nav: [
    { label: 'Products', href: '/products' },
    { label: 'Center', href: '/center', badge: 'new' },
    { label: 'Rankings', href: '/ladder', badge: 'hot' },
    { label: 'Support', href: '/support' },
    { label: 'Explore', href: '/about' },
  ],
  // 公告条与顶栏 CTA 的英文文案：不配则英文语境下不展示（不以中文冒充英文）
  announcement: {
    enabled: true,
    text: '54027X1QE — 4th-gen W-OLED flagship now shipping · Book an in-store demo',
    href: '/business/venues',
    dismissible: true,
  },
  // 顶栏 CTA 默认不放（与中文站一致）；能力保留，后台可随时配置启用
  topCta: {},
  // 店铺渠道英文覆盖（品牌名为专有名词；href 占位，上线前替换为真实店铺链接）
  shopChannels: [
    { name: 'Tmall', href: 'https://tmall.example/' },
    { name: 'JD', href: 'https://jd.example/' },
    { name: 'Taobao', href: 'https://taobao.example/' },
  ],
  footer: [
    {
      title: 'Products',
      links: [
        { label: 'All products', href: '/products' },
        { label: 'Compare', href: '/compare' },
        { label: 'Rankings', href: '/ladder' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Downloads', href: '/downloads' },
        { label: 'Models & compatibility', href: '/support/models' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Submit a ticket', href: '/inquiry' },
      ],
    },
    {
      title: 'Explore',
      links: [
        { label: 'About Guanghun', href: '/about' },
        { label: 'Business partnerships', href: '/business' },
        { label: 'Case studies', href: '/business/cases' },
        { label: 'Esports partnerships', href: '/brand/esports' },
        { label: 'Compliance & policies', href: '/legal/privacy' },
      ],
    },
  ],
}

/* ============================================================
   首页英文变体
   ============================================================ */

const SHOWCASE_COPY_EN: Record<string, string> = {
  'gh-54027x1qe':
    'Flagship series: 26.5" 2K@540Hz with a 4th-gen W-OLED panel and 0.03 ms GTG response.',
  'gh-32x1ue':
    'Dual-mode switching: 4K@165Hz and FHD@330Hz in one, with an imported LG META OLED panel.',
  'gh-28027x1qe':
    '26.5" 2K@280Hz, 1500 nit peak brightness and 3.68M-pixel light control — a value flagship.',
  'gh-27q1f':
    '27" 2K 200Hz Fast IPS; HDR and wide gamut at an accessible price.',
}

function buildHomeEn(): Page {
  return toPage('home', '/', 'Home', 'Homepage: hero, five posters, product matrix, firmware, message and trust bar.', [
    {
      type: 'carousel',
      props: {
        slides: [
          {
            eyebrow: 'MEASURED, NOT MARKETED',
            title: 'Define performance with data',
            desc: 'Every number is reproducible. Every method is public. Every source is traceable.',
            mediaTag: 'Lab',
            image: '/media/home/hero-01.svg',
            primary: { label: 'Buy now', href: '/products' },
            stats: [{ value: '540 Hz', label: 'Refresh rate' }, { value: '0.03 ms', label: 'Response' }],
          },
          {
            eyebrow: 'NEW RELEASE',
            title: 'Lightning 540Hz',
            desc: 'The flagship OLED gaming monitor — 2K@540Hz engineered for the fastest plays.',
            mediaTag: 'Monitor',
            image: '/media/home/hero-02.svg',
            primary: { label: 'Buy now', href: '/products/gh-54027x1qe' },
          },
          {
            eyebrow: 'CENTER SOFTWARE',
            title: 'One app for every device',
            desc: 'Tune params, macros, lighting and firmware — all in one place.',
            mediaTag: 'Software',
            image: '/media/home/hero-03.svg',
            primary: { label: 'Buy now', href: '/center' },
          },
        ],
        autoplay: true,
        motion: true,
      },
      style: { theme: 'dark', container: 'full' },
    },
    // —— Five full-screen posters: one poster = one block (hero); height 21:9 wide (h-r219) ——
    {
      type: 'hero',
      props: {
        eyebrow: 'FLAGSHIP / 26.5" 2K@540Hz',
        eyebrowEnabled: false,
        title: ['54027X1QE Standard'],
        subtitle: 'A masterclass in restraint',
        media: '/media/home/showcase/gh-54027x1qe.jpg',
        mediaType: 'image',
        mediaTag: '54027X1QE key visual',
        primary: { label: 'Buy now', href: '/products/gh-54027x1qe' },
        contentPosition: { x: 50, y: 16 },
        height: 'r219',
        theme: 'dark',
      },
    },
    {
      type: 'hero',
      props: {
        eyebrow: 'DUAL-MODE / 4K@165 · FHD@330',
        eyebrowEnabled: false,
        title: ['32X1UE Dual-mode'],
        subtitle: 'One monitor, two ways to play',
        media: '/media/home/showcase/gh-32x1ue.jpg',
        mediaType: 'image',
        mediaTag: '32X1UE key visual',
        primary: { label: 'Buy now', href: '/products/gh-32x1ue' },
        contentPosition: { x: 50, y: 16 },
        height: 'r219',
        theme: 'dark',
      },
    },
    {
      type: 'hero',
      props: {
        eyebrow: 'BEST SELLER / 26.5" 2K@280Hz',
        eyebrowEnabled: false,
        title: ['28027X1QE Best seller'],
        subtitle: '1500 nit peak brightness, value flagship',
        media: '/media/home/showcase/gh-28027x1qe.jpg',
        mediaType: 'image',
        mediaTag: '28027X1QE key visual',
        primary: { label: 'Buy now', href: '/products/gh-28027x1qe' },
        contentPosition: { x: 50, y: 16 },
        height: 'r219',
        theme: 'dark',
      },
    },
    {
      type: 'hero',
      props: {
        eyebrow: 'ESPORTS IPS / 27" 2K@200Hz',
        eyebrowEnabled: false,
        title: ['27Q1F Esports'],
        subtitle: '27" 2K 200Hz Fast IPS with HDR and wide gamut',
        media: '/media/products/gh-27q1f.jpg',
        mediaType: 'image',
        mediaTag: '27Q1F key visual',
        primary: { label: 'Buy now', href: '/products/gh-27q1f' },
        contentPosition: { x: 50, y: 16 },
        height: 'r219',
        theme: 'dark',
      },
    },
    {
      type: 'hero',
      props: {
        eyebrow: 'ENTRY / 23.8" FHD@200Hz',
        eyebrowEnabled: false,
        title: ['24H1 Entry'],
        subtitle: '23.8" FHD 200Hz esports monitor with HDR400',
        media: '/media/products/gh-24h1.jpg',
        mediaType: 'image',
        mediaTag: '24H1 key visual',
        primary: { label: 'Buy now', href: '/products/gh-24h1' },
        contentPosition: { x: 50, y: 16 },
        height: 'r219',
        theme: 'dark',
      },
    },
    // —— 2×2 product matrix ——
    {
      type: 'productMatrix',
      props: {
        // Same shape as the ZH home: no block title, ~1:1 media, near-flush cards
        source: 'product',
        columns: 2,
        ratio: '1:1',
        cropFocus: 'center',
        mobileLayout: 'rail',
        items: [
          { productId: 'gh-54027x1qe', desc: '26.5" 2K@540Hz 4th-gen W-OLED flagship', buttons: [{ label: 'Learn more', href: '/products/gh-54027x1qe' }, { label: 'Buy', href: '/products/gh-54027x1qe' }] },
          { productId: 'gh-32x1ue', desc: 'Dual-mode OLED: 4K@165 / FHD@330 in one', buttons: [{ label: 'Learn more', href: '/products/gh-32x1ue' }, { label: 'Buy', href: '/products/gh-32x1ue' }] },
          { productId: 'gh-28027x1qe', desc: '2K@280Hz with 1500 nit peak brightness', buttons: [{ label: 'Learn more', href: '/products/gh-28027x1qe' }, { label: 'Buy', href: '/products/gh-28027x1qe' }] },
          { productId: 'gh-27q1f', desc: '27" 2K 200Hz Fast IPS, best value', buttons: [{ label: 'Learn more', href: '/products/gh-27q1f' }, { label: 'Buy', href: '/products/gh-27q1f' }] },
        ],
      },
      // Full-bleed: cards span the viewport width (flush with the posters above / blocks below)
      style: { container: 'full' },
    },
    // —— Firmware & drivers: three cards auto-carry the latest version ——
    {
      type: 'cards',
      props: {
        title: 'Firmware & drivers',
        icon: 'download',
        subtitle: 'Stay on the latest version for better compatibility and tuning.',
        ctaLabel: 'Go to download center',
        ctaHref: '/downloads',
        layout: 'entries',
        columns: 3,
        autoVersions: true,
        items: [
          { tag: 'Firmware', title: 'One-click firmware upgrade', desc: 'Check and upgrade inside Guanghun Center, with change notes.', href: '/downloads', downloadType: 'firmware' },
          { tag: 'Driver', title: 'Drivers & color profiles', desc: 'ICC and calibration files, no registration required.', href: '/downloads', downloadType: 'driver' },
          { tag: 'Software', title: 'Guanghun Center', desc: 'Params, macros, lighting and firmware in one place.', href: '/center', downloadType: 'software' },
        ],
      },
    },
    {
      type: 'contact',
      props: {
        title: "Didn't find an answer? Leave a message",
        desc: 'Questions or partnership? Submit the form and we will follow up during business hours.',
        channel: 'inquiry',
        showForm: true,
      },
    },
    {
      type: 'trustBar',
      props: {
        columns: 4,
        items: [
          { icon: 'flask', text: 'Snowman Review Lab' },
          { icon: 'shield', text: '3-year warranty' },
          { icon: 'check', text: 'Genuine products' },
          { icon: 'box', text: 'Free SF Express shipping' },
        ],
      },
    },
    /* ——— Retained blocks, disabled by default (can be enabled in admin) ——— */
    { enabled: false, type: 'cards', props: { layout: 'trust', columns: 4, items: [
      { title: 'Snowman Review Lab', desc: 'One method, one sample size' },
      { title: '3-year warranty', desc: 'With OLED burn-in cover' },
      { title: 'Genuine products', desc: 'Nationwide service' },
      { title: 'Free SF Express shipping', desc: '15-day no-reason returns' },
    ] } },
    {
      enabled: false,
      type: 'cards',
      props: {
        title: 'Choose by scenario',
        desc: 'Display setups for different use cases.',
        ctaLabel: 'Browse all products',
        ctaHref: '/products',
        layout: 'rail',
        overlay: true,
        ratio: '4 / 5',
        columns: 3,
        items: [
          { tag: 'Esports', title: 'Competitive play', desc: 'High refresh and fast response for precise aiming.', href: '/products', media: '/media/home/scenes/fps.svg', mediaType: 'image' },
          { tag: 'Creative', title: 'Content & color', desc: 'Native 10-bit and 99% DCI-P3 for editing and grading.', href: '/products', media: '/media/home/scenes/moba.svg', mediaType: 'image' },
          { tag: 'Office', title: 'Work & comfort', desc: 'Low blue light and stable brightness for all-day use.', href: '/products', media: '/media/home/scenes/mmo.svg', mediaType: 'image' },
        ],
      },
    },
    {
      enabled: false,
      type: 'showcase',
      props: {
        title: 'Featured products',
        subtitle: 'Flagships and mains, backed by measured data.',
        ctaLabel: 'Go to product center',
        ctaHref: '/products',
        alternate: true,
        items: [
          { productId: 'gh-54027x1qe', media: '/media/products/gh-54027x1qe.svg', mediaType: 'image', eyebrow: '54027X1QE-W54 · Flagship', title: 'Lightning 540Hz OLED Monitor', desc: SHOWCASE_COPY_EN['gh-54027x1qe'], specs: [{ k: 'Refresh rate', v: '540 Hz' }, { k: 'Response', v: '0.03 ms' }], cta: { label: 'View details', href: '/products/gh-54027x1qe' } },
          { productId: 'gh-32x1ue', media: '/media/products/gh-32x1ue.svg', mediaType: 'image', eyebrow: '32X1UE-W16 · Dual-mode', title: 'Meta Dual-mode 4K Monitor', desc: SHOWCASE_COPY_EN['gh-32x1ue'], specs: [{ k: 'Resolution', v: '4K@165 / FHD@330' }, { k: 'Panel', v: 'META OLED' }], cta: { label: 'View details', href: '/products/gh-32x1ue' } },
          { productId: 'gh-28027x1qe', media: '/media/products/gh-28027x1qe.svg', mediaType: 'image', eyebrow: '28027X1QE-W28 · Best seller', title: 'Lightning 280Hz OLED Monitor', desc: SHOWCASE_COPY_EN['gh-28027x1qe'], specs: [{ k: 'Refresh rate', v: '280 Hz' }, { k: 'Peak brightness', v: '1500 nit' }], cta: { label: 'View details', href: '/products/gh-28027x1qe' } },
        ],
      },
      style: { container: 'full', background: 'soft' },
    },
    { enabled: false, type: 'ranking', props: { title: 'Rankings', subtitle: 'Every number comes from the same reproducible test method.', metric: 'overall', limit: 6, teaser: true } },
    {
      enabled: false,
      type: 'articleList',
      props: {
        title: 'Reviews',
        subtitle: 'Params and methods are public; results are reproducible.',
        ctaLabel: 'View all reviews',
        ctaHref: '/articles',
        source: 'all',
        limit: 3,
      },
    },
    {
      enabled: false,
      type: 'stats',
      props: {
        title: 'By the numbers',
        subtitle: 'What we have done, in verifiable numbers.',
        footnote: 'Figures as of 2026, counted under one published methodology — verifiable on the About page.',
        items: [
          { label: 'Founded', value: '2019', note: 'Started in displays, with our own lab and in-house firmware.' },
          { label: 'R&D and test team', value: '40', unit: '+', note: 'Covering structure, electronics, firmware and UX validation.' },
          { label: 'Test records logged', value: '1,200', unit: '+', note: 'Each traceable to its original test conditions and sample ID.' },
        ],
      },
    },
    {
      enabled: false,
      type: 'cards',
      props: {
        title: 'Service entries',
        subtitle: 'From selection to after-sales, one stop.',
        ctaLabel: 'Open support',
        ctaHref: '/support',
        columns: 4,
        items: [
          { title: 'Downloads', desc: 'Drivers, firmware and manuals.', href: '/support' },
          { title: 'FAQ', desc: 'High-frequency setup and pairing help.', href: '/faq' },
          { title: 'Submit a ticket', desc: 'Model + symptom, tracked in your account.', href: '/inquiry' },
          { title: 'Warranty', desc: 'Coverage, claims and service points.', href: '/support' },
        ],
      },
    },
    {
      enabled: false,
      type: 'cards',
      props: {
        title: 'Business · Experience spots',
        subtitle: 'Offline experience, channel and esports partnerships.',
        ctaLabel: 'View all venues',
        ctaHref: '/business/venues',
        columns: 3,
        items: [
          { tag: 'Open', title: 'Guanghun Lab Shenzhen', desc: 'Nanshan, Shenzhen' },
          { tag: 'Open', title: 'Guanghun Lab Shanghai', desc: 'Pudong, Shanghai' },
          { tag: 'Coming soon', title: 'Guanghun Lab Chengdu', desc: 'Yulin, Chengdu' },
        ],
      },
    },
    {
      enabled: false,
      type: 'cards',
      props: {
        title: 'News & updates',
        subtitle: 'Product launches, events and brand updates.',
        ctaLabel: 'View all news',
        ctaHref: '/news',
        columns: 3,
        items: [
          { tag: 'Release', title: 'Lightning 540Hz launch', desc: '2026-09' },
          { tag: 'Event', title: 'Esports sponsorship', desc: '2026-08' },
          { tag: 'Update', title: 'Center 2.1 firmware', desc: '2026-07' },
        ],
      },
    },
  ])
}

/* ============================================================
   关于光魂
   ============================================================ */

function buildAboutEn(): Page {
  return toPage('about', '/about', 'Explore', 'Explore Guanghun.', [
    {
      type: 'imageText',
      props: {
        image: '/media/about/brand.svg',
        title: 'We trust data over adjectives',
        body: 'Performance is a measurement problem, not a marketing one.\nEvery claim we publish is reproducible in our lab.\nMethods are public; sources are traceable.',
        side: 'left',
      },
    },
    {
      type: 'stats',
      props: {
        title: 'Key facts',
        items: [
          { label: 'Founded', value: '2020' },
          { label: 'HQ', value: 'Shenzhen, CN' },
          { label: 'Products tested', value: '120+' },
          { label: 'Lab uptime', value: '99.6%' },
        ],
      },
    },
    {
      type: 'imageText',
      props: {
        image: '/media/about/lab.svg',
        title: 'Testing lab',
        body: 'A dedicated measurement lab for response time, peak brightness, color accuracy and uniformity.\nFixtures and methods are documented and versioned.\nHistorical numbers stay fixed to the method used at the time.',
        side: 'right',
      },
    },
    {
      type: 'timeline',
      props: {
        title: 'Milestones',
        items: [
          { time: '2020', title: 'Founded', desc: 'Started in Shenzhen' },
          { time: '2022', title: 'First rankings', desc: 'Open measurement method' },
          { time: '2024', title: 'Center software', desc: 'One app for all devices' },
          { time: '2026', title: '120+ products', desc: 'Tested and published' },
        ],
      },
    },
    {
      type: 'cards',
      props: {
        title: 'Newsroom',
        columns: 3,
        items: [
          { tag: 'Release', title: 'Lightning 540Hz launch', desc: '2026-09', href: '/news' },
          { tag: 'Event', title: 'Esports sponsorship', desc: '2026-08', href: '/news' },
          { tag: 'Update', title: 'Center 2.1 firmware', desc: '2026-07', href: '/news' },
        ],
      },
    },
    {
      type: 'cards',
      props: {
        title: 'Culture',
        columns: 3,
        items: [
          { title: 'Measured' },
          { title: 'Open methods' },
          { title: 'Player-first' },
        ],
      },
    },
    {
      type: 'cards',
      props: {
        title: 'Careers',
        columns: 3,
        items: [
          { title: 'Hardware test engineer' },
          { title: 'Software engineer' },
          { title: 'Esports partnerships' },
        ],
      },
    },
    // Esports partnerships: merged into Explore after the /brand/* pages are taken offline (§4.13)
    {
      type: 'cards',
      props: {
        title: 'Esports partnerships',
        columns: 3,
        items: [
          { title: 'Co-define display specs with pro teams and players' },
          { title: 'Track-side feedback flows back into R&D and testing' },
          { title: 'Supply monitors and tech support for events and campus esports venues' },
        ],
      },
    },
    // Compliance: already reachable from the footer / /legal/*; disabled by default (§4.8)
    {
      enabled: false,
      type: 'cards',
      props: {
        title: 'Compliance & terms',
        columns: 3,
        items: [
          { title: 'Privacy policy', desc: 'How we handle data', href: '/legal/privacy' },
          { title: 'Terms of service', desc: 'Using this site', href: '/legal/terms' },
          { title: 'Cookie policy', desc: 'Cookies in use', href: '/legal/cookies' },
        ],
      },
    },
    {
      type: 'contact',
      props: {
        title: 'Want to know more, or work with us?',
        desc: 'Product and after-sales questions go to Support; channel, review and esports partnerships go to Business.',
        channel: 'inquiry',
        showForm: false,
      },
    },
    {
      type: 'richText',
      props: {
        html:
          '<h3>Rich text module example</h3>' +
          '<p>Supports <strong>bold</strong>, <em>italic</em>, <a href="/products">in-site links</a>, plus images and GIFs.</p>' +
          '<ul><li>List item one</li><li>List item two</li></ul>' +
          '<figure><img src="/media/about/brand.svg" alt="Sample image"><figcaption>Image and caption (sanitized on render)</figcaption></figure>',
      },
    },
    {
      type: 'html',
      props: {
        html:
          '<h3>HTML module example</h3>' +
          '<table><thead><tr><th>Model</th><th>Refresh rate</th></tr></thead>' +
          '<tbody><tr><td>27Q1F</td><td>200 Hz</td></tr><tr><td>24H1</td><td>200 Hz</td></tr></tbody></table>' +
          '<p style="color:#8a8a94">Harmless placeholder content; static HTML (tables / inline styles) allowed.</p>',
        note: 'Product specs comparison sample',
      },
    },
    {
      type: 'embed',
      props: {
        code:
          '<style>body{margin:0;font-family:system-ui;display:grid;place-items:center;height:100%;background:#0b0c12;color:#e6e7ee}</style>' +
          '<div id="demo">Embed module example</div>' +
          '<script>document.getElementById("demo").textContent="Hello from sandbox (script inside sandbox)"</script>',
        height: 240,
        allowScripts: true,
        videoUrl: '',
        poster: '',
      },
    },
  ])
}

/* ============================================================
   Center 软件
   ============================================================ */

function buildCenterEn(): Page {
  return toPage('center', '/center', 'Center Software', 'Center software.', [
    {
      type: 'hero',
      props: {
        eyebrow: 'SOFTWARE / Companion app',
        eyebrowEnabled: false,
        statsEnabled: false,
        title: ['Guanghun Center'],
        subtitle: 'One app to manage every Guanghun display.',
        mediaTag: 'Software UI',
        image: '/media/center/hero.svg',
        contentPosition: { x: 50, y: 16 },
        // Floating download bar at the poster bottom (pick entries from the download center)
        downloadIds: ['center-win', 'center-mac'],
      },
      style: { theme: 'dark', container: 'full' },
    },
    {
      // Core capabilities: capability grid layout (index + icon tile + title + desc);
      // item.id doubles as the anchor and is kept identical to the Chinese page so
      // deep links such as /center#manage work in both languages.
      type: 'cards',
      props: {
        title: 'Core capabilities',
        layout: 'capability',
        columns: 3,
        items: [
          { id: 'manage', icon: 'grid', title: 'Unified device management', desc: 'Every connected Guanghun display in one list — input, refresh rate and firmware at a glance.' },
          { id: 'macro', icon: 'keyboard', title: 'Presets & scenes', desc: 'Save brightness, gamut and HDR settings as presets and switch them per scenario.' },
          { id: 'tuning', icon: 'sliders', title: 'OSD & color', desc: 'Brightness, gamut, tone and response levels in one place, measured on the same scale as our leaderboard.' },
          { id: 'lighting', icon: 'light', title: 'Eye care & lighting', desc: 'Low blue light, flicker-free backlight and ambient lighting follow your scene.' },
          { id: 'firmware', icon: 'refresh', title: 'Firmware & drivers', desc: 'New versions are surfaced in one place, with release notes before and after updating.' },
          { id: 'sync', icon: 'cloud', title: 'Cloud profiles', desc: 'Sign in and your presets follow your account across machines and reinstalls.' },
        ],
      },
    },
    {
      type: 'imageText',
      props: {
        image: '/media/center/feature1.svg',
        title: 'Granular control',
        body: 'Every tunable parameter is exposed in the UI.\nPresets ship per title; you can also build your own and share them.',
        side: 'right',
      },
    },
    {
      type: 'imageText',
      props: {
        image: '/media/center/feature2.svg',
        title: 'Full-speed connectivity',
        body: 'DP 2.1 at 80 Gbps keeps 540Hz at full speed.\nProfile switching is instant, with no re-plugging.',
        side: 'left',
      },
    },
    {
      type: 'timeline',
      props: {
        title: 'Changelog',
        items: [
          { time: 'v2.1.0', title: 'Cloud profiles', desc: '2026-09' },
          { time: 'v2.0.0', title: 'Config sync', desc: '2026-06' },
          { time: 'v1.5.0', title: 'Firmware OTA', desc: '2026-03' },
        ],
      },
    },
    { type: 'faqList', props: { title: 'FAQ', source: 'center', limit: 10 } },
  ])
}

/* ============================================================
   商业合作
   ============================================================ */

function buildBusinessEn(): Page {
  return toPage('business', '/business', 'Business', 'Business partnerships.', [
    // ① + ⑦ merged: directions & benefits (§4.9: 8 blocks → 6)
    {
      type: 'cards',
      props: {
        title: 'Directions & benefits',
        columns: 3,
        items: [
          { tag: 'channel', title: 'Channel distribution', desc: 'Regional and category partners.' },
          { tag: 'review', title: 'Review & sampling', desc: 'Press and creator sampling program.' },
          { tag: 'esports', title: 'Esports', desc: 'Team and tournament sponsorships.' },
          { title: 'Channel reselling', desc: 'Authorized channels and pricing structure.' },
          { title: 'Esports co-op', desc: 'Arena gear and event exposure.' },
          { title: 'Content co-creation', desc: 'Joint reviews, streams and distribution.' },
          { title: 'Co-branding', desc: 'Co-branded models and custom looks.' },
        ],
      },
    },
    // ② + ⑧ merged: one partnership process line
    {
      type: 'timeline',
      props: {
        title: 'Partnership process',
        items: [
          { time: '01', title: 'Submit an application', desc: 'Fill in the form with the partnership type and goals.' },
          { time: '02', title: 'Sampling / business contact', desc: 'Press sampling follows the sampling guide; business deals are handled by a dedicated contact.' },
          { time: '03', title: 'Execution', desc: 'Sign the agreement and move forward as planned.' },
        ],
      },
    },
    {
      type: 'cards',
      props: {
        title: 'Case studies',
        columns: 3,
        items: [
          { tag: 'Esports', title: 'Team sponsorship', desc: 'Multi-year gear supply', href: '/business/cases' },
          { tag: 'Retail', title: 'Flagship store', desc: 'Shenzhen Nanshan', href: '/business/cases' },
          { tag: 'Press', title: 'Editorial review', desc: 'Independent teardown', href: '/business/cases' },
        ],
      },
    },
    {
      type: 'brandAssetList',
      props: {
        title: 'Brand assets',
        subtitle: 'Brand guidelines, logos, product imagery and press kits for partners, press and channels.',
        category: 'all',
        limit: 0,
        ctaLabel: 'Request brand assets',
        ctaHref: '/inquiry',
      },
      style: { anchor: 'brand-assets' },
    },
    {
      type: 'contact',
      props: {
        title: 'Submit a partnership',
        desc: 'Submissions enter the same ticket system as product inquiries, tagged as Business.',
        channel: 'business',
        showForm: true,
      },
    },
    {
      type: 'cards',
      props: {
        title: 'Contacts',
        columns: 3,
        items: [
          { title: 'Business', desc: 'business@guanghun.example' },
          { title: 'Press / sampling', desc: 'press@guanghun.example' },
          { title: 'Esports', desc: 'esports@guanghun.example' },
        ],
      },
    },
  ])
}

function buildBusinessScenesEn(): Page {
  return toPage('business-scenes', '/business/scenes', 'Partnership scenarios', 'Scenarios + data-source block.', [
    {
      type: 'cards',
      props: {
        title: 'Scenarios & solutions',
        columns: 3,
        items: [
          { image: '/media/business/scene-arena.svg', tag: 'Arena', title: 'Esports arena', desc: 'On-site gear and rapid swap.' },
          { image: '/media/business/scene-studio.svg', tag: 'Studio', title: 'Creator studio', desc: 'Low-latency capture setup.' },
          { image: '/media/business/scene-retail.svg', tag: 'Retail', title: 'Retail flagship', desc: 'Try-before-buy experience.' },
        ],
      },
    },
  ])
}

function buildBusinessCasesEn(): Page {
  return toPage('business-cases', '/business/cases', 'Case studies', 'Case studies + data-source block.', [
    {
      type: 'caseList',
      props: {
        title: 'Case studies',
        subtitle: 'Partnerships with teams, retail and press.',
        scope: 'all',
        limit: 0,
        pageSize: 9,
        columns: 3,
        showMeta: true,
      },
    },
  ])
}

function buildBusinessVenuesEn(): Page {
  return toPage('business-venues', '/business/venues', 'Experience spots', 'Venues + data-source block.', [
    {
      type: 'venueList',
      props: {
        title: 'Experience spots',
        subtitle: 'Try the gear and tuning in person.',
        scope: 'all',
        groupBy: 'province',
        showModels: true,
        dialog: true,
        limit: 0,
        pageSize: 0,
        columns: 3,
        showStatus: true,
      },
    },
    {
      type: 'b2bValue',
      props: {
        title: 'Bulk purchasing for business',
        subtitle: 'Volume orders for teams and stores ｜ from model selection to deployment',
        items: [
          { icon: 'cube', title: 'Volume pricing', desc: 'Tiered pricing by quantity with a transparent quote, and mixed-model orders in one go.' },
          { icon: 'shield', title: 'Corporate + VAT invoice', desc: 'Bank transfer and VAT invoices supported; contracts and terms follow your process.' },
          { icon: 'cloud', title: 'Nationwide delivery & setup', desc: 'Nationwide shipping with on-site setup and cable management on request.' },
          { icon: 'sliders', title: 'Dedicated tech contact', desc: 'A named contact for firmware, display profiles and after-sales across fleets.' },
        ],
        wechat: 'xxrsm001',
        email: '1009742523@qq.com',
        hotline: '15913908438',
        showContact: true,
      },
    },
  ])
}

/* ============================================================
   服务与支持
   ============================================================ */

function buildSupportEn(): Page {
  return toPage('support', '/support', 'Support', 'Support home.', [
    {
      type: 'cards',
      props: {
        title: 'Quick entries',
        columns: 3,
        items: [
          { tag: 'download', title: 'Downloads', desc: 'Drivers, firmware, manuals.' },
          { tag: 'faq', title: 'FAQ', desc: 'Setup, pairing, firmware.' },
          { tag: 'ticket', title: 'Submit a ticket', desc: 'Model + symptom.' },
        ],
      },
    },
    { type: 'downloadList', props: { title: 'Downloads', category: 'all', limit: 20 } },
    {
      enabled: false,
      type: 'cards',
      props: {
        title: 'Warranty & after-sales',
        columns: 2,
        items: [
          { title: '2-year warranty' },
          { title: 'Claim process' },
          { title: 'Service points' },
          { title: 'Return policy' },
        ],
      },
    },
    // Data-source block: spots come from the service-info collection (edited in admin, live on the site)
    {
      type: 'venueList',
      props: { title: 'Service & experience spots', source: 'service', scope: 'all', columns: 2, limit: 0, showStatus: true },
    },
    {
      enabled: false,
      type: 'cards',
      props: {
        title: 'Contact us',
        columns: 3,
        items: [
          { tag: 'phone', title: 'Hotline', desc: '400-000-0000 · 9–21 daily' },
          { tag: 'email', title: 'Email', desc: 'support@guanghun.example · 24h' },
          { tag: 'chat', title: 'Live chat', desc: 'In-app · 9–21 daily' },
        ],
      },
    },
    { type: 'faqList', props: { title: 'FAQ', source: 'support', limit: 10, ctaLabel: 'View all', ctaHref: '/faq' } },
    {
      type: 'contact',
      props: {
        title: "Can't find your answer?",
        desc: 'Submit a ticket with the model and symptom; progress and materials are tracked in your account.',
        channel: 'inquiry',
        showForm: false,
      },
    },
  ])
}

/* ============================================================
   联系我们
   ============================================================ */

function buildContactEn(): Page {
  return toPage('contact', '/contact', 'Contact', 'Contact us.', [
    {
      type: 'cards',
      props: {
        title: 'Channels',
        columns: 3,
        items: [
          { tag: 'phone', title: 'Hotline', desc: '400-000-0000 · 9–21 daily' },
          { tag: 'email', title: 'Email', desc: 'support@guanghun.example · 24h' },
          { tag: 'chat', title: 'Live chat', desc: 'In-app · 9–21 daily' },
        ],
      },
    },
    {
      type: 'cards',
      props: {
        title: 'Service hours',
        columns: 3,
        items: [
          { title: 'Mon–Fri', desc: '09:00–21:00' },
          { title: 'Sat–Sun', desc: '10:00–18:00' },
          { title: 'Holidays', desc: 'Live chat only' },
        ],
      },
    },
    {
      // Offices block disabled by default (§4.14): full list lives on /business/venues
      enabled: false,
      type: 'cards',
      props: {
        title: 'Offices & spots',
        columns: 2,
        items: [
          { title: 'Guanghun · Shenzhen', desc: 'Nanshan · 400-000-0000 · 9–21' },
          { title: 'Guanghun · Shanghai', desc: 'Pudong · 400-000-0000 · 9–21' },
        ],
      },
    },
    {
      type: 'contact',
      props: {
        title: 'Need a human?',
        desc: 'Submit a ticket with the model and symptom; progress and materials are tracked in your account.',
        channel: 'inquiry',
        showForm: false,
      },
    },
  ])
}

/* ============================================================
   新闻 / 产品 / 天梯榜 / 文章 / 下载 / FAQ / 咨询（数据源为主）
   ============================================================ */

function buildNewsEn(): Page {
  return toPage('news', '/news', 'News', 'News + data-source block.', [
    { type: 'text', props: { title: 'News & updates', body: 'Product launches, events and brand updates.', align: 'left' } },
    { type: 'articleList', props: { title: 'Latest', source: 'news', limit: 0, pageSize: 9 } },
  ], false)
}

function buildProductsEn(): Page {
  return toPage('products', '/products', 'Products', 'Products + data-source block.', [
    { type: 'text', props: { title: 'Products', body: 'Filter in-stock products by category, connection and price.', align: 'left' } },
    { type: 'productGrid', props: { title: 'All products', source: 'all', limit: 24, columns: 3 } },
    // Sample: hand-picked (order is the display order)
    { type: 'productGrid', props: { title: 'Editor picks', subtitle: 'Hand-picked models; the order is adjustable.', scope: 'manual', ids: ['gh-54027x1qe', 'gh-32x1ue', 'gh-28027x1qe', 'gh-27q1f'], limit: 8, columns: 4, showFilter: false } },
    // Sample: by category (OLED flagship only)
    { type: 'productGrid', props: { title: 'OLED flagship', subtitle: 'Every model in the "OLED flagship" category.', scope: 'category', category: 'OLED旗舰', limit: 6, columns: 3, showFilter: false } },
  ])
}

function buildLadderEn(): Page {
  return toPage('ladder', '/ladder', 'Rankings', 'Rankings + data-source block.', [
    {
      type: 'text',
      props: { title: 'Rankings', body: 'All numbers come from the same reproducible test method. Rankings are not industry verdicts — they are buying references only.', align: 'left' },
    },
    { type: 'ranking', props: { title: 'Overall', metric: 'overall', limit: 10 } },
    // Data-source block: methods come from the methods collection (edited in admin, live on the site)
    {
      type: 'methodList',
      props: { title: 'Test method', subtitle: 'Methods are public and reproducible; when a method is upgraded, historical articles keep the older numbers.', limit: 0 },
    },
  ])
}

function buildArticlesEn(): Page {
  return toPage('articles', '/articles', 'Articles', 'Articles + data-source block.', [
    { type: 'text', props: { title: 'Articles', body: 'Reviews, tutorials and industry notes. Params and methods are public; sources are traceable.', align: 'left' } },
    { type: 'articleList', props: { title: 'All articles', source: 'all', limit: 0, pageSize: 9 } },
    // Sample: hand-picked + rail presentation
    { type: 'articleList', props: { title: 'Editor picks', subtitle: 'Hand-picked articles; the order is adjustable.', scope: 'manual', ids: ['latency-end-to-end', 'driver-firmware-guide', 'test-methodology'], limit: 0, showFilter: false, layout: 'rail' } },
  ], false)
}

function buildDownloadsEn(): Page {
  return toPage('downloads', '/downloads', 'Downloads', 'Downloads + data-source block.', [
    { type: 'text', props: { title: 'Downloads', body: 'Drivers, firmware and manuals. One file can map to multiple models.', align: 'left' } },
    { type: 'downloadList', props: { title: 'All files', category: 'all', limit: 0, pageSize: 10 } },
    // Sample: hand-picked + rail card presentation
    { type: 'downloadList', props: { title: 'Recommended', subtitle: 'Hand-picked files; the order is adjustable.', scope: 'manual', ids: ['center-win', 'gh-54027x1qe-firmware', 'gh-32x1ue-manual'], limit: 0, showFilter: false, layout: 'rail' } },
  ])
}

function buildFaqEn(): Page {
  return toPage('faq', '/faq', 'FAQ', 'FAQ + data-source block.', [
    { type: 'text', props: { title: 'FAQ', body: 'High-frequency questions on driver install, pairing, firmware and after-sales.', align: 'left' } },
    { type: 'faqList', props: { title: 'All questions', source: 'support', limit: 0, pageSize: 10 } },
  ])
}

function buildModelSupportEn(): Page {
  return toPage('model-support', '/support/models', 'Model support', 'Model support index.', [
    {
      type: 'cards',
      props: {
        title: 'All models',
        subtitle: 'Pick a model to see its manuals, firmware, calibration files, guides and FAQs.',
        ctaLabel: 'Downloads',
        ctaHref: '/downloads',
        layout: 'grid',
        columns: 3,
        items: [
          { tag: 'OLED flagship', title: '54027X1QE-W54', desc: '26.5" 2K@540Hz flagship OLED with DP 2.1 full speed and Center tuning.', href: '/support/model/gh-54027x1qe' },
          { tag: 'Dual-mode', title: '32X1UE-W16', desc: '31.5" 4K@165 / FHD@330 dual-mode OLED esports display.', href: '/support/model/gh-32x1ue' },
          { tag: 'Esports IPS', title: '27Q1F', desc: '27" 2K 200Hz Fast IPS esports display with HDMI 2.1.', href: '/support/model/gh-27q1f' },
          { tag: 'Accessory', title: 'GH-ARM01', desc: 'Monitor arm with VESA 75/100 and 9 kg load capacity.', href: '/support/model/gh-arm01' },
        ],
      },
    },
  ])
}

function buildInquiryEn(): Page {
  return toPage('inquiry', '/inquiry', 'Submit a ticket', 'Submit a ticket.', [
    {
      type: 'contact',
      props: {
        title: 'Submit a ticket',
        desc: 'Fill in the model and symptom; track progress in your account.',
        channel: 'inquiry',
        showForm: true,
      },
    },
  ])
}

/* ============================================================
   明细页模板（英文变体）
   与中文模板一一对应：相同的区块类型与顺序，仅译可见文案。
   必要性：模板页若缺英文变体，英文端会回退到中文模板，导致明细页出现中文标签。
   ============================================================ */

function buildTemplatesEn(): Page[] {
  return [
    toPage(
      'template-product',
      '/products/:id',
      'Product detail template',
      'Product detail area (one shared template for all products; data comes from the product collection).',
      [
        {
          type: 'productHero',
          props: {
            // §4.22 3-2: primary CTA "Buy now" takes the product buyUrl; secondary "Book a demo" → venues
            primaryLabel: 'Buy now',
            primaryHref: '',
            secondaryLabel: 'Book a demo',
            secondaryHref: '/business/venues',
            primaryFromProduct: true,
            showBadges: true,
            showPrice: true,
            showSummary: true,
          },
        },
        {
          type: 'productSpecs',
          props: {
            title: 'Specifications',
            showTabs: true,
            showGuides: true,
            guideDownloadLabel: 'Go to downloads',
            guideContactLabel: 'Submit a ticket',
          },
        },
        // Product detail rich text: renders the current product's detailHtml (no render when empty)
        { type: 'productDetailRich', props: {} },
        {
          type: 'productBuy',
          props: {
            title: 'Ready to buy?',
            subtitle: 'Read the specs first — no rush.',
            primaryLabel: 'Add to compare',
            primaryHref: '/compare',
            secondaryLabel: 'Talk to a specialist',
            secondaryHref: '/inquiry',
            points: [
              'Nationwide warranty per official policy',
              '7-day returns (unused, original packaging)',
              'Public params and methods; reproducible results',
            ],
          },
        },
        {
          type: 'productGrid',
          props: {
            title: 'Related products',
            subtitle: 'Same category, comparable models.',
            ctaLabel: 'Browse all products',
            ctaHref: '/products',
            source: 'featured',
            limit: 4,
            columns: 4,
          },
        },
        {
          type: 'articleList',
          props: {
            title: 'Related reviews',
            subtitle: 'The full process behind the numbers.',
            ctaLabel: 'View all reviews',
            ctaHref: '/articles',
            source: 'review',
            limit: 3,
          },
        },
      ],
    ),
    toPage('template-series', '/products/series/:slug', 'Product series template', 'Product series area.', [
      { type: 'text', props: { title: 'Product series', body: 'Browse products by series.', align: 'left' } },
      // §4.20 / T5.17: the series page has its own grid; no duplicated productGrid here
    ]),
    toPage('template-compare', '/compare', 'Compare template', 'Compare area.', [
      {
        type: 'text',
        props: { title: 'Compare products', body: 'Pick up to 4 products of the same category and compare their specs.', align: 'left' },
      },
      { type: 'productGrid', props: { title: 'Selectable products', source: 'all', limit: 8, columns: 4 } },
    ]),
    toPage('template-article', '/articles/:id', 'Article detail template', 'Article detail area.', [
      { type: 'articleList', props: { title: 'Related reading', source: 'all', limit: 3 } },
    ]),
    toPage('template-download', '/downloads/:id', 'Download detail template', 'Download detail area.', [
      { type: 'downloadList', props: { title: 'Related downloads', category: 'all', limit: 4 } },
    ]),
    toPage('template-faq', '/faq/:id', 'FAQ detail template', 'FAQ detail area.', [
      { type: 'faqList', props: { title: 'Related FAQ', source: 'support', limit: 4 } },
    ]),
    toPage('template-case', '/business/cases/:id', 'Case study template', 'Case study area.', [
      { type: 'text', props: { title: 'About this case', body: 'Case details are subject to the official final announcement.', align: 'left' } },
      {
        type: 'caseList',
        props: {
          title: 'More cases',
          subtitle: 'Other partnerships worth a look.',
          ctaLabel: 'View all cases',
          ctaHref: '/business/cases',
          scope: 'all',
          limit: 3,
          columns: 3,
          showMeta: true,
        },
      },
    ]),
    toPage('template-venue', '/business/venues/:id', 'Venue template', 'Venue area.', [
      {
        type: 'venueList',
        props: {
          title: 'More venues',
          subtitle: 'Try the gear at a spot near you.',
          ctaLabel: 'View all venues',
          ctaHref: '/business/venues',
          scope: 'all',
          limit: 3,
          columns: 3,
          showStatus: true,
        },
      },
    ]),
    toPage('template-model', '/support/model/:id', 'Model support template', 'Model support area.', [
      { type: 'faqList', props: { title: 'FAQ', source: 'support', limit: 4 } },
    ]),
  ]
}

/** 构建英文 seed：全部主要页面英文变体（key 追加 `__en`） */
export function buildSeedEn(): Page[] {
  return [
    buildHomeEn(),
    buildAboutEn(),
    buildCenterEn(),
    buildBusinessEn(),
    buildBusinessScenesEn(),
    buildBusinessCasesEn(),
    buildBusinessVenuesEn(),
    buildSupportEn(),
    buildContactEn(),
    buildNewsEn(),
    buildProductsEn(),
    buildLadderEn(),
    buildArticlesEn(),
    buildDownloadsEn(),
    buildFaqEn(),
    buildModelSupportEn(),
    buildInquiryEn(),
    ...buildTemplatesEn(),
  ]
}
