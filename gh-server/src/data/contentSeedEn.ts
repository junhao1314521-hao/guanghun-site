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

type Draft = { type: BlockType; props: Record<string, unknown>; style?: BlockStyle }

/** 组装英文变体页：key = baseKey + `__en`；区块 id 沿用 `${baseKey}-b<n>` 以保持平行 */
function toPage(baseKey: string, path: string, title: string, description: string, drafts: Draft[]): Page {
  const key = `${baseKey}${EN_KEY_SUFFIX}`
  const blocks: Block[] = drafts.map((draft, index) => {
    const block: Block = { id: `${baseKey}-b${index + 1}`, type: draft.type, enabled: true, props: draft.props }
    if (draft.style) block.style = draft.style
    return block
  })
  return { key, path, title, description, blocks, updatedAt: SEED_TIMESTAMP }
}

/* ============================================================
   英文站点配置（nav / footer 覆盖；enabledBlocks / theme 仍取主配置）
   ============================================================ */

export const SITE_EN: SiteConfig['en'] = {
  nav: [
    { label: 'Products', href: '/products' },
    { label: 'Center', href: '/center' },
    { label: 'Rankings', href: '/ladder' },
    { label: 'Articles', href: '/articles' },
    { label: 'Support', href: '/support' },
    { label: 'Business', href: '/business' },
    { label: 'About', href: '/about' },
  ],
  footer: [
    {
      title: 'Products',
      links: [
        { label: 'All products', href: '/products' },
        { label: 'Rankings', href: '/ladder' },
        { label: 'Compare', href: '/compare' },
        { label: 'Articles', href: '/articles' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Support home', href: '/support' },
        { label: 'Downloads', href: '/downloads' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Submit a ticket', href: '/inquiry' },
      ],
    },
    {
      title: 'About',
      links: [
        { label: 'About Guanghun', href: '/about' },
        { label: 'Business', href: '/business' },
        { label: 'Contact us', href: '/contact' },
        { label: 'Experience spots', href: '/business/venues' },
      ],
    },
  ],
}

/* ============================================================
   首页英文变体
   ============================================================ */

const SHOWCASE_COPY_EN: Record<string, string> = {
  'gh-m900-pro':
    'Flagship wireless gaming mouse. 58 g lightweight body and 0.6 ms end-to-end latency, balancing endurance and feel.',
  'gh-k870':
    '87-key tri-mode mechanical keyboard with hot-swap switches and low-latency wireless — stable for long sessions.',
  'gh-h500':
    '50 mm driver gaming headset with 7.1 surround and 2.4 G low latency — pinpoint sound with ease.',
  'gh-p400':
    '900×400 oversized mouse pad. Spill-resistant surface and 3 mm thickness leave room for sweeping motions.',
}

function buildHomeEn(): Page {
  return toPage('home', '/', 'Home', 'Homepage: hero, scenes, featured products, rankings, reviews, brand, services, partnerships and news.', [
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
            primary: { label: 'Explore products', href: '/products' },
            secondary: { label: 'See the rankings', href: '/ladder' },
            stats: [{ k: 'Latency', v: '0.6 ms' }, { k: 'Weight', v: '58 g' }],
          },
          {
            eyebrow: 'NEW RELEASE',
            title: 'GH-M900 Pro',
            desc: 'The lightest flagship in its class — engineered for the fastest plays.',
            mediaTag: 'Mouse',
            image: '/media/home/hero-02.svg',
            primary: { label: 'View details', href: '/products/gh-m900-pro' },
          },
          {
            eyebrow: 'CENTER SOFTWARE',
            title: 'One app for every device',
            desc: 'Tune params, macros, lighting and firmware — all in one place.',
            mediaTag: 'Software',
            image: '/media/home/hero-03.svg',
            primary: { label: 'Download Center', href: '/center#download' },
          },
        ],
        autoplay: true,
      },
      style: { theme: 'dark', container: 'full' },
    },
    {
      type: 'cards',
      props: {
        title: 'Choose by scenario',
        desc: 'Peripheral combos for different use cases.',
        ctaLabel: 'Browse all products',
        ctaHref: '/products',
        layout: 'rail',
        overlay: true,
        ratio: '4 / 5',
        columns: 3,
        items: [
          { tag: 'FPS', title: 'Competitive FPS', desc: 'Ultra-light mice and fast switches for precise aiming.', href: '/products', media: '/media/home/scenes/fps.svg', mediaType: 'image' },
          { tag: 'MOBA', title: 'MOBA & RTS', desc: 'Durable keys and macro-ready boards for long sessions.', href: '/products', media: '/media/home/scenes/moba.svg', mediaType: 'image' },
          { tag: 'MMO', title: 'MMO & Productivity', desc: 'Multi-button layouts and ergonomic support for all-day use.', href: '/products', media: '/media/home/scenes/mmo.svg', mediaType: 'image' },
        ],
      },
    },
    {
      type: 'showcase',
      props: {
        title: 'Featured products',
        subtitle: 'Flagships and mains, backed by measured data.',
        ctaLabel: 'Go to product center',
        ctaHref: '/products',
        alternate: true,
        items: [
          { productId: 'gh-m900-pro', media: '/media/products/gh-m900-pro.svg', mediaType: 'image', eyebrow: 'M900 Pro · Flagship', title: 'GH-M900 Pro', desc: SHOWCASE_COPY_EN['gh-m900-pro'], specs: [{ k: 'Weight', v: '58 g' }, { k: 'Latency', v: '0.6 ms' }], cta: { label: 'View details', href: '/products/gh-m900-pro' } },
          { productId: 'gh-k870', media: '/media/products/gh-k870.svg', mediaType: 'image', eyebrow: 'K870 · Tri-mode', title: 'GH-K870', desc: SHOWCASE_COPY_EN['gh-k870'], specs: [{ k: 'Keys', v: '87' }, { k: 'Connection', v: 'Tri-mode' }], cta: { label: 'View details', href: '/products/gh-k870' } },
          { productId: 'gh-h500', media: '/media/products/gh-h500.svg', mediaType: 'image', eyebrow: 'H500 · Surround', title: 'GH-H500', desc: SHOWCASE_COPY_EN['gh-h500'], specs: [{ k: 'Driver', v: '50 mm' }, { k: 'Surround', v: '7.1' }], cta: { label: 'View details', href: '/products/gh-h500' } },
        ],
      },
      style: { container: 'full', background: 'soft' },
    },
    { type: 'ranking', props: { title: 'Rankings', subtitle: 'Every number comes from the same reproducible test method.', metric: 'overall', limit: 6, teaser: true } },
    {
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
      type: 'stats',
      props: {
        title: 'By the numbers',
        subtitle: 'What we have done, in verifiable numbers.',
        footnote: 'Figures as of 2026, counted under one published methodology — verifiable on the About page.',
        items: [
          { label: 'Founded', value: '2019', note: 'Started in peripherals, with our own lab and in-house firmware.' },
          { label: 'R&D and test team', value: '40', unit: '+', note: 'Covering structure, electronics, firmware and UX validation.' },
          { label: 'Test records logged', value: '1,200', unit: '+', note: 'Each traceable to its original test conditions and sample ID.' },
        ],
      },
    },
    {
      type: 'cards',
      props: {
        title: 'Service entries',
        subtitle: 'From selection to after-sales, one stop.',
        ctaLabel: 'Open support',
        ctaHref: '/support',
        columns: 4,
        items: [
          { title: 'Downloads', desc: 'Drivers, firmware and manuals.', href: '/support' },
          { title: 'FAQ', desc: 'High-frequency setup and pairing help.', href: '/support#faq' },
          { title: 'Submit a ticket', desc: 'Model + symptom, tracked in your account.', href: '/support#contact' },
          { title: 'Warranty', desc: 'Coverage, claims and service points.', href: '/support' },
        ],
      },
    },
    {
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
      type: 'cards',
      props: {
        title: 'News & updates',
        subtitle: 'Product launches, events and brand updates.',
        ctaLabel: 'View all news',
        ctaHref: '/news',
        columns: 3,
        items: [
          { tag: 'Release', title: 'M900 Pro launch', desc: '2026-09' },
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
  return toPage('about', '/about', 'About', 'About Guanghun.', [
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
        body: 'A dedicated measurement lab for latency, weight, switch life, battery and acoustics.\nFixtures and methods are documented and versioned.\nHistorical numbers stay fixed to the method used at the time.',
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
          { tag: 'Release', title: 'M900 Pro launch', desc: '2026-09', href: '/news' },
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
    {
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
          '<table><thead><tr><th>Model</th><th>Weight</th></tr></thead>' +
          '<tbody><tr><td>GH-A1</td><td>58 g</td></tr><tr><td>GH-B2</td><td>62 g</td></tr></tbody></table>' +
          '<p style="color:#8a8a94">Harmless placeholder content; static HTML (tables / inline styles) allowed.</p>',
        note: 'Product weight comparison sample',
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
        title: ['Guanghun Center'],
        desc: 'One app to manage every Guanghun device: params, macros, lighting, firmware and config sync — all in one place.',
        mediaTag: 'Software UI',
        image: '/media/center/hero.svg',
        primary: { label: 'Download', href: '/center#download' },
        secondary: { label: 'Changelog', href: '/center#changelog' },
      },
      style: { theme: 'dark', container: 'full' },
    },
    {
      type: 'cards',
      props: {
        title: 'Core capabilities',
        columns: 3,
        items: [
          { tag: 'tune', title: 'Param tuning', desc: 'DPI, polling, debounce and lift-off.' },
          { tag: 'macro', title: 'Macros', desc: 'Record, edit and bind to any key.' },
          { tag: 'rgb', title: 'Lighting', desc: 'Per-key and zone effects.' },
          { tag: 'fw', title: 'Firmware', desc: 'Update with one click.' },
          { tag: 'sync', title: 'Config sync', desc: 'Carry settings across devices.' },
          { tag: 'cloud', title: 'Cloud profiles', desc: 'Sign in to back up profiles.' },
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
        title: 'Low-latency wireless',
        body: '2.4 G wireless stays under 1 ms end-to-end with Center active.\nProfile switching is instant, with no re-pairing.',
        side: 'left',
      },
    },
    {
      type: 'cards',
      props: {
        title: 'Supported devices',
        columns: 3,
        items: [
          { tag: 'Supported', title: 'Mice', desc: 'M900 Pro, K700, M500' },
          { tag: 'Supported', title: 'Keyboards', desc: 'K870, K700, K300' },
          { tag: 'Supported', title: 'Headsets', desc: 'H500, H300' },
        ],
      },
    },
    {
      type: 'cards',
      props: {
        title: 'Download & install',
        columns: 2,
        items: [
          { title: 'Windows', desc: 'v2.1.0 · 48 MB · 2026-09' },
          { title: 'macOS', desc: 'v2.1.0 · 52 MB · 2026-09' },
        ],
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
    {
      type: 'cards',
      props: {
        title: 'Partnership directions',
        columns: 3,
        items: [
          { tag: 'channel', title: 'Channel distribution', desc: 'Regional and category partners.', href: '/business#apply' },
          { tag: 'review', title: 'Review & sampling', desc: 'Press and creator sampling program.', href: '/business#apply' },
          { tag: 'esports', title: 'Esports', desc: 'Team and tournament sponsorships.', href: '/business#apply' },
        ],
      },
    },
    {
      type: 'timeline',
      props: {
        title: 'Media & review sampling',
        items: [
          { time: '01', title: 'Apply with outlet and audience' },
          { time: '02', title: 'Sign NDA and confirm scope' },
          { time: '03', title: 'Receive sample and test method' },
          { time: '04', title: 'Publish with cited sources' },
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
      type: 'cards',
      props: {
        title: 'Brand assets',
        columns: 2,
        items: [
          { tag: 'Logo', title: 'Logo pack', desc: 'SVG + PNG' },
          { tag: 'Guidelines', title: 'Brand guidelines', desc: 'PDF' },
        ],
      },
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
      type: 'cards',
      props: {
        title: 'Case studies',
        columns: 3,
        items: [
          { image: '/media/business/case-team.svg', tag: 'Esports', title: 'Team sponsorship', desc: 'Multi-year gear supply', href: '/business/cases/case-team' },
          { image: '/media/business/case-store.svg', tag: 'Retail', title: 'Flagship store', desc: 'Shenzhen Nanshan', href: '/business/cases/case-store' },
          { image: '/media/business/case-press.svg', tag: 'Press', title: 'Editorial review', desc: 'Independent teardown', href: '/business/cases/case-press' },
        ],
      },
    },
  ])
}

function buildBusinessVenuesEn(): Page {
  return toPage('business-venues', '/business/venues', 'Experience spots', 'Venues + data-source block.', [
    {
      type: 'cards',
      props: {
        title: 'Experience spots',
        columns: 3,
        items: [
          { image: '/media/business/venue-sz.svg', tag: 'Open', title: 'Guanghun Shenzhen', desc: 'Nanshan · Coastal City · L2', href: '/business/venues/venue-sz' },
          { image: '/media/business/venue-sh.svg', tag: 'Open', title: 'Guanghun Shanghai', desc: 'Pudong · IFC · L3', href: '/business/venues/venue-sh' },
          { image: '/media/business/venue-cd.svg', tag: 'Coming soon', title: 'Guanghun Chengdu', desc: 'Yulin · ITO · B1', href: '/business/venues/venue-cd' },
        ],
      },
    },
  ])
}

/* ============================================================
   服务支持
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
    {
      type: 'cards',
      props: {
        title: 'Service & experience spots',
        columns: 2,
        items: [
          { tag: 'Open', title: 'Guanghun Shenzhen', desc: 'Nanshan · South' },
          { tag: 'Open', title: 'Guanghun Shanghai', desc: 'Pudong · East' },
        ],
      },
    },
    {
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
    { type: 'faqList', props: { title: 'FAQ', source: 'support', limit: 10 } },
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
    { type: 'articleList', props: { title: 'Latest', source: 'news', limit: 8 } },
  ])
}

function buildProductsEn(): Page {
  return toPage('products', '/products', 'Products', 'Products + data-source block.', [
    { type: 'text', props: { title: 'Products', body: 'Filter in-stock products by category, connection and price.', align: 'left' } },
    { type: 'productGrid', props: { title: 'All products', source: 'all', limit: 24, columns: 3 } },
    // Sample: hand-picked (order is the display order)
    { type: 'productGrid', props: { title: 'Editor picks', subtitle: 'Hand-picked models; the order is adjustable.', scope: 'manual', ids: ['gh-m900-pro', 'gh-k870', 'gh-h500', 'gh-p400'], limit: 8, columns: 4, showFilter: false } },
    // Sample: by category (mice only)
    { type: 'productGrid', props: { title: 'Gaming mice', subtitle: 'Every model in the "Mice" category.', scope: 'category', category: '鼠标', limit: 6, columns: 3, showFilter: false } },
  ])
}

function buildLadderEn(): Page {
  return toPage('ladder', '/ladder', 'Rankings', 'Rankings + data-source block.', [
    {
      type: 'text',
      props: { title: 'Rankings', body: 'All numbers come from the same reproducible test method. Rankings are not industry verdicts — they are buying references only.', align: 'left' },
    },
    { type: 'ranking', props: { title: 'Overall', metric: 'overall', limit: 10 } },
    {
      type: 'text',
      props: { title: 'Test method', body: 'Methods are public and reproducible; when a method is upgraded, historical articles keep the older numbers.', align: 'left' },
    },
  ])
}

function buildArticlesEn(): Page {
  return toPage('articles', '/articles', 'Articles', 'Articles + data-source block.', [
    { type: 'text', props: { title: 'Articles', body: 'Reviews, tutorials and industry notes. Params and methods are public; sources are traceable.', align: 'left' } },
    { type: 'articleList', props: { title: 'All articles', source: 'all', limit: 12 } },
    // Sample: hand-picked + rail presentation
    { type: 'articleList', props: { title: 'Editor picks', subtitle: 'Hand-picked articles; the order is adjustable.', scope: 'manual', ids: ['latency-end-to-end', 'driver-firmware-guide', 'test-methodology'], limit: 0, showFilter: false, layout: 'rail' } },
  ])
}

function buildDownloadsEn(): Page {
  return toPage('downloads', '/downloads', 'Downloads', 'Downloads + data-source block.', [
    { type: 'text', props: { title: 'Downloads', body: 'Drivers, firmware and manuals. One file can map to multiple models.', align: 'left' } },
    { type: 'downloadList', props: { title: 'All files', category: 'all', limit: 20 } },
    // Sample: hand-picked + rail card presentation
    { type: 'downloadList', props: { title: 'Recommended', subtitle: 'Hand-picked files; the order is adjustable.', scope: 'manual', ids: ['center-win', 'k870-driver', 'h500-manual'], limit: 0, showFilter: false, layout: 'rail' } },
  ])
}

function buildFaqEn(): Page {
  return toPage('faq', '/faq', 'FAQ', 'FAQ + data-source block.', [
    { type: 'text', props: { title: 'FAQ', body: 'High-frequency questions on driver install, pairing, firmware and after-sales.', align: 'left' } },
    { type: 'faqList', props: { title: 'All questions', source: 'support', limit: 20 } },
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
            primaryLabel: 'Add to compare',
            primaryHref: '/compare',
            secondaryLabel: 'Talk to a specialist',
            secondaryHref: '/support#contact',
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
        {
          type: 'productBuy',
          props: {
            title: 'Ready to buy?',
            subtitle: 'Read the specs first — no rush.',
            primaryLabel: 'Add to compare',
            primaryHref: '/compare',
            secondaryLabel: 'Talk to a specialist',
            secondaryHref: '/support#contact',
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
      { type: 'productGrid', props: { title: 'Series products', source: 'series', seriesId: '', limit: 12, columns: 3 } },
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
        type: 'cards',
        props: {
          title: 'More cases',
          columns: 3,
          items: [
            { image: '/media/business/case-team.svg', tag: 'Esports', title: 'Team sponsorship', desc: 'Multi-year gear supply', href: '/business/cases/case-team' },
            { image: '/media/business/case-store.svg', tag: 'Retail', title: 'Flagship store', desc: 'Shenzhen Nanshan', href: '/business/cases/case-store' },
            { image: '/media/business/case-press.svg', tag: 'Press', title: 'Editorial review', desc: 'Independent teardown', href: '/business/cases/case-press' },
          ],
        },
      },
    ]),
    toPage('template-venue', '/business/venues/:id', 'Venue template', 'Venue area.', [
      {
        type: 'cards',
        props: {
          title: 'More venues',
          columns: 3,
          items: [
            { image: '/media/business/venue-sz.svg', tag: 'Open', title: 'Guanghun Shenzhen', desc: 'Nanshan · Coastal City · L2', href: '/business/venues/venue-sz' },
            { image: '/media/business/venue-sh.svg', tag: 'Open', title: 'Guanghun Shanghai', desc: 'Pudong · IFC · L3', href: '/business/venues/venue-sh' },
            { image: '/media/business/venue-cd.svg', tag: 'Coming soon', title: 'Guanghun Chengdu', desc: 'Yulin · ITO · B1', href: '/business/venues/venue-cd' },
          ],
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
    buildInquiryEn(),
    ...buildTemplatesEn(),
  ]
}
