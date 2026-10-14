/**
 * 内容库 seed（契约 §5 / §7 的真源）。
 *
 * 由现有 `src/data/*.ts` 内容映射生成「页面 → 有序区块列表」：
 * - 区块顺序严格对应 `gh-web` 页面组件从上到下的顺序；
 * - 区块字段名严格对齐契约 §4，不得自创或改名；
 * - 站点配置（nav / footer）映射自 `gh-web/src/data/nav.ts` 与 `site.ts`。
 *
 * 本文件不读磁盘、不依赖运行时状态，纯函数式产出，便于 resetPage 复用。
 */
import * as about from './about'
import * as brand from './brand'
import * as business from './business'
import * as businessExtra from './business-extra'
import * as center from './center'
import * as home from './home'
import * as support from './support'
import * as supportExtra from './support-extra'
import type { Block, BlockStyle, BlockType, Page, SiteConfig } from './contentTypes'

/** seed 生成的固定时间戳：保证重复构建结果一致（保存操作会写入真实时间） */
const SEED_TIMESTAMP = '2026-10-12T00:00:00.000Z'

/** 区块草稿：type + props（+ 可选 style），id 由 toPage 按序号确定性生成 */
type Draft = { type: BlockType; props: Record<string, unknown>; style?: BlockStyle }

/** 将区块草稿组装为页面；区块 id 形如 `home-b1`，稳定且可读 */
function toPage(key: string, path: string, title: string, description: string, drafts: Draft[]): Page {
  const blocks: Block[] = drafts.map((draft, index) => {
    const block: Block = { id: `${key}-b${index + 1}`, type: draft.type, enabled: true, props: draft.props }
    if (draft.style) block.style = draft.style
    return block
  })
  return { key, path, title, description, blocks, updatedAt: SEED_TIMESTAMP }
}

/* ============================================================
   站点配置（导航 / 页脚）
   ============================================================ */

const SITE: SiteConfig = {
  nav: [
    { label: '产品', href: '/products' },
    { label: '光魂 Center', href: '/center', badge: 'new', badgeShake: true },
    { label: '天梯榜', href: '/ladder', badge: 'hot', badgeShake: true },
    { label: '评测与资讯', href: '/articles' },
    { label: '服务支持', href: '/support' },
    { label: '商业合作', href: '/business' },
    { label: '关于光魂', href: '/about' },
  ],
  footer: [
    {
      title: '产品',
      links: [
        { label: '全部产品', href: '/products' },
        { label: '天梯榜', href: '/ladder' },
        { label: '产品对比', href: '/compare' },
        { label: '文章', href: '/articles' },
      ],
    },
    {
      title: '服务',
      links: [
        { label: '服务支持', href: '/support' },
        { label: '下载中心', href: '/downloads' },
        { label: '常见问题', href: '/faq' },
        { label: '提交咨询', href: '/inquiry' },
      ],
    },
    {
      title: '关于',
      links: [
        { label: '关于光魂', href: '/about' },
        { label: '商业合作', href: '/business' },
        { label: '联系我们', href: '/contact' },
        { label: '体验点', href: '/business/venues' },
      ],
    },
  ],
}

/* ============================================================
   单页构造
   ============================================================ */

/**
 * 首页「重点产品」通栏展示条目文案（自编简洁文案，关联现有产品 id）。
 * key = 产品 id，媒体地址沿用 `/media/products/<id>.svg` 占位，字段支持 image/video/gif。
 */
const SHOWCASE_COPY: Record<string, string> = {
  'gh-54027x1qe': '闪电序列旗舰：26.5 英寸 2K@540Hz，第四代 W-OLED 面板与 0.03 ms 灰阶响应。',
  'gh-32x1ue': 'Meta 双模切换：4K@165Hz 与 FHD@330Hz 一机两用，进口 LG META OLED 面板。',
  'gh-28027x1qe': '26.5 英寸 2K@280Hz，1500 nit 峰值亮度与 368 万像素级控光，平民超跑。',
  'gh-27q1f': '27 英寸 2K 200Hz Fast IPS，HDR 与广色域兼得的高性价比电竞之选。',
}

/** 首页：首屏轮播 → 场景 → 重点产品（通栏展示） → 天梯榜 → 评测 → 品牌 → 服务 → 合作 → 新闻 */
/** 首页「服务与支持」四张卡的跳转目标（按 SERVICE_ENTRIES 的 id 映射） */
const SERVICE_HREF: Record<string, string> = {
  model: '/support',
  download: '/downloads',
  faq: '/faq',
  contact: '/contact',
}

function buildHome(): Page {
  return toPage('home', '/', '首页', '首页装修：首屏、场景、重点产品、天梯榜、评测、品牌、服务、合作与新闻。', [
    {
      type: 'carousel',
      props: {
        slides: home.HERO_SLIDES.map((slide) => ({
          eyebrow: slide.eyebrow,
          title: slide.title,
          desc: slide.desc,
          mediaTag: slide.mediaTag,
          image: slide.poster ?? `/media/home/${slide.id}.svg`,
          ...(slide.posterMobile ? { imageMobile: slide.posterMobile } : {}),
          primary: { label: slide.primary, href: slide.primaryTo ?? '#' },
          ...(slide.secondary ? { secondary: { label: slide.secondary, href: slide.secondaryTo ?? '#' } } : {}),
          stats: slide.stats,
        })),
        autoplay: true,
      },
      // 首页首屏海报：通栏铺满视口宽度，磨砂顶栏浮于其上
      style: { theme: 'dark', container: 'full' },
    },
    // 重点产品：通栏分段式展示（左右交替），数据来自产品集合
    {
      type: 'showcase',
      props: {
        title: '重点产品',
        icon: 'monitor',
        subtitle: '以实测数据说话的旗舰与主力机型。',
        ctaLabel: '进入产品中心',
        ctaHref: '/products',
        alternate: true,
        items: home.FEATURED_PRODUCTS.slice(0, 3).map((product) => ({
          productId: product.id,
          media: `/media/home/showcase/${product.id}.jpg`,
          mediaType: 'image',
          eyebrow: product.tag ? `${product.model} · ${product.tag}` : product.model,
          title: product.name,
          desc: SHOWCASE_COPY[product.id] ?? product.name,
          specs: product.specs,
          cta: { label: '查看详情', href: `/products/${product.id}` },
        })),
      },
      style: { container: 'full', background: 'soft' },
    },
    // 按场景选择：横向滑动 rail，卡片链接带 ?scene= 场景参数（筛选走 URL）
    {
      type: 'cards',
      props: {
        title: '按场景选择',
        icon: 'grid',
        subtitle: '从电竞对战到内容创作，按使用场景组合你的显示方案。',
        ctaLabel: '浏览全部产品',
        ctaHref: '/products',
        layout: 'rail',
        overlay: true,
        ratio: '3 / 4',
        columns: 4,
        items: home.SCENES.map((scene) => ({
          tag: scene.tag,
          title: scene.title,
          desc: scene.desc,
          href: `/products?scene=${scene.id}`,
          media: `/media/home/scenes/${scene.id}.jpg`,
          mediaType: 'image',
        })),
      },
    },
    // teaser：首页只展示局部榜单（底部渐变虚化），数据与 /ladder 页同源
    { type: 'ranking', props: { title: '实测天梯榜', icon: 'trophy', subtitle: '所有数值来自同一套可复现的测试方法。', metric: 'overall', limit: 6, teaser: true } },
    { type: 'articleList', props: { title: '评测与解析', icon: 'book', subtitle: '参数公开、方法公开，结论可复现。', ctaLabel: '查看全部内容', ctaHref: '/articles', source: 'review', limit: 3 } },
    { type: 'stats', props: { title: '数据一览', icon: 'chip', subtitle: '用可核对的数字，说明我们做了什么。', footnote: '数据截至 2026 年，均按同一套公开口径统计，可在「关于光魂」逐条核对。', items: home.BRAND_STATS } },
    {
      type: 'cards',
      props: {
        title: '服务与支持',
        icon: 'help',
        subtitle: '从选型到售后，一站直达。',
        ctaLabel: '进入服务支持',
        ctaHref: '/support',
        layout: 'spotlight',
        columns: 4,
        // 四张卡分别指向 支持 / 下载 / FAQ / 联系（此前全部指向 /support）
        items: home.SERVICE_ENTRIES.map((entry) => ({
          title: entry.title,
          desc: entry.desc,
          href: SERVICE_HREF[entry.id] ?? '/support',
        })),
      },
    },
    {
      type: 'cards',
      props: {
        title: '体验与合作',
        icon: 'chat',
        subtitle: '线下体验、渠道与赛事合作。',
        ctaLabel: '查看全部体验点',
        ctaHref: '/business/venues',
        columns: 3,
        items: home.SPOTS.map((spot) => ({ tag: spot.status, title: spot.name, desc: spot.area, href: '/business/venues' })),
      },
    },
    { type: 'articleList', props: { title: '新闻与动态', icon: 'refresh', subtitle: '产品发布、活动与品牌更新。', ctaLabel: '查看全部新闻', ctaHref: '/news', source: 'news', limit: 6 } },
    {
      type: 'contact',
      props: {
        title: '没找到答案？留言给我们',
        desc: '有问题或想合作？填好表单提交，我们会在工作时间内跟进。',
        channel: 'inquiry',
        showForm: true,
      },
    },
  ])
}

/** 关于光魂：品牌理念 → 关键事实 → 测试实验室 → 发展历程 → 新闻 → 文化 → 招聘 → 合规 → 引导 */
function buildAbout(): Page {
  return toPage('about', '/about', '关于光魂', '关于光魂装修。', [
    {
      type: 'imageText',
      props: {
        image: '/media/about/brand.svg',
        title: '我们相信数据比形容词可信',
        body: about.PHILOSOPHY_POINTS.join('\n'),
        side: 'left',
      },
    },
    { type: 'stats', props: { title: '关键事实', items: about.FACTS } },
    {
      type: 'imageText',
      props: { image: '/media/about/lab.svg', title: '测试实验室', body: about.LAB_POINTS.join('\n'), side: 'right' },
    },
    {
      type: 'timeline',
      props: { title: '发展历程', items: about.TIMELINE.map((item) => ({ time: item.year, title: item.title, desc: item.tag })) },
    },
    {
      type: 'cards',
      props: {
        title: '新闻中心',
        columns: 3,
        items: about.NEWS.map((item) => ({ tag: item.tag, title: item.title, desc: item.date, href: '/news' })),
      },
    },
    { type: 'cards', props: { title: '企业文化', columns: 3, items: about.CULTURE_TAGS.map((tag) => ({ title: tag })) } },
    { type: 'cards', props: { title: '加入我们', columns: 3, items: about.JOBS.map((job) => ({ title: job })) } },
    {
      type: 'cards',
      props: {
        title: '合规与条款',
        columns: 3,
        items: about.LEGAL_CARDS.map((card) => ({ title: card.title, desc: card.desc, href: card.to })),
      },
    },
    {
      type: 'contact',
      props: {
        title: '想了解更多，或与我们合作？',
        desc: '产品、评测与售后问题走服务支持；渠道、送测与赛事合作走商业合作。',
        channel: 'inquiry',
        showForm: false,
      },
    },
  ])
}

/** Center 软件：软件首屏 → 核心能力 → 功能深读 ×2 → 支持设备 → 下载 → 更新日志 → FAQ */
function buildCenter(): Page {
  return toPage('center', '/center', 'Center 软件', 'Center 软件装修。', [
    {
      type: 'hero',
      props: {
        eyebrow: 'SOFTWARE / 配套软件',
        title: ['光魂 Center'],
        desc: '一套软件管理全部光魂显示器：色彩与亮度、HDR 与刷新率、校色配置同步，都在同一个界面里完成。',
        mediaTag: '软件界面',
        image: '/media/center/hero.svg',
        primary: { label: '立即下载', href: '/downloads' },
        secondary: { label: '查看更新日志', href: '/center' },
      },
      // hero 海报同样通栏，与首页 carousel 保持一致
      style: { theme: 'dark', container: 'full' },
    },
    {
      type: 'cards',
      props: {
        title: '核心能力',
        columns: 3,
        items: center.CAPABILITIES.map((item) => ({ tag: item.id, title: item.title, desc: item.desc })),
      },
    },
    {
      type: 'imageText',
      props: {
        image: '/media/center/feature1.svg',
        title: center.FEATURES[0].title,
        body: `${center.FEATURES[0].desc}\n${center.FEATURES[0].points.join('\n')}`,
        side: 'right',
      },
    },
    {
      type: 'imageText',
      props: {
        image: '/media/center/feature2.svg',
        title: center.FEATURES[1].title,
        body: `${center.FEATURES[1].desc}\n${center.FEATURES[1].points.join('\n')}`,
        side: 'left',
      },
    },
    {
      type: 'cards',
      props: {
        title: '支持的设备',
        columns: 3,
        items: center.DEVICE_SUPPORT.map((item) => ({ tag: item.statusText, title: item.title, desc: item.models })),
      },
    },
    {
      type: 'cards',
      props: {
        title: '下载与安装',
        columns: 2,
        items: center.DOWNLOADS.map((item) => ({ title: item.os, desc: `${item.version} · ${item.size} · ${item.date}` })),
      },
    },
    {
      type: 'timeline',
      props: { title: '更新日志', items: center.CHANGELOG.map((item) => ({ time: item.version, title: item.title, desc: item.date })) },
    },
    { type: 'faqList', props: { title: '常见问题', source: 'center', limit: 10 } },
  ])
}

/** 商业合作首页：合作方向 → 送测流程 → 案例 → 品牌资料 → 申请 → 联系方式 */
function buildBusiness(): Page {
  return toPage('business', '/business', '商业合作首页', '商业合作首页装修。', [
    {
      type: 'cards',
      props: {
        title: '合作方向',
        columns: 3,
        items: business.COOP_DIRECTIONS.map((item) => ({ tag: item.id, title: item.title, desc: item.desc, href: '/business' })),
      },
    },
    {
      type: 'timeline',
      props: {
        title: '媒体与评测送测',
        items: business.RELEASE_STEPS.map((step, index) => ({ time: String(index + 1).padStart(2, '0'), title: step })),
      },
    },
    {
      type: 'cards',
      props: {
        title: '合作案例',
        columns: 3,
        items: business.COOP_CASES.map((item) => ({ tag: item.tag, title: item.title, desc: item.desc, href: '/business/cases' })),
      },
    },
    {
      type: 'cards',
      props: {
        title: '品牌资料下载',
        columns: 2,
        items: business.BRAND_ASSETS.map((asset) => ({ tag: asset.tag, title: asset.title, desc: asset.format })),
      },
    },
    {
      type: 'contact',
      props: {
        title: '提交合作申请',
        desc: '提交后进入与产品咨询同一套工单系统，来源字段标注为「商业合作」。',
        channel: 'business',
        showForm: true,
      },
    },
    {
      type: 'cards',
      props: {
        title: '联系方式',
        columns: 3,
        items: business.COOP_CONTACTS.map((item) => ({ title: item.title, desc: item.rows.map((row) => `${row.k}：${row.v}`).join('；') })),
      },
    },
  ])
}

/** 合作场景列表 */
function buildBusinessScenes(): Page {
  return toPage('business-scenes', '/business/scenes', '合作场景列表', '合作场景装修 + 数据源区块。', [
    {
      type: 'cards',
      props: {
        title: '场景与方案',
        columns: 3,
        items: businessExtra.BIZ_SCENES.map((scene) => ({
          image: scene.cover,
          tag: scene.eyebrow,
          title: scene.title,
          desc: scene.desc,
        })),
      },
    },
  ])
}

/** 合作案例列表 */
function buildBusinessCases(): Page {
  return toPage('business-cases', '/business/cases', '合作案例列表', '合作案例装修 + 数据源区块。', [
    {
      type: 'caseList',
      props: {
        title: '合作案例',
        subtitle: '与战队、渠道与媒体的合作项目。',
        scope: 'all',
        limit: 0,
        pageSize: 9,
        columns: 3,
        showMeta: true,
      },
    },
  ])
}

/** 体验点列表 */
function buildBusinessVenues(): Page {
  return toPage('business-venues', '/business/venues', '体验点列表', '体验点装修 + 数据源区块。', [
    {
      type: 'venueList',
      props: {
        title: '线下体验点',
        subtitle: '就近体验实机与调参。',
        scope: 'all',
        limit: 0,
        pageSize: 9,
        columns: 3,
        showStatus: true,
      },
    },
  ])
}

/** 服务支持首页：快速入口 → 下载 → 保修 → 网点 → 联系 → FAQ → 引导 */
function buildSupport(): Page {
  return toPage('support', '/support', '服务支持首页', '服务支持首页装修。', [
    {
      type: 'cards',
      props: {
        title: '快速入口',
        columns: 3,
        items: support.QUICK_ENTRIES.map((entry) => ({ tag: entry.id, title: entry.title, desc: entry.desc })),
      },
    },
    { type: 'downloadList', props: { title: '下载中心', category: 'all', limit: 20 } },
    { type: 'cards', props: { title: '保修与售后', columns: 2, items: support.WARRANTY_POINTS.map((point) => ({ title: point })) } },
    // 数据源区块：网点/体验点取自集合 service-info（后台「服务信息」维护，改后前台即时生效）
    {
      type: 'venueList',
      props: { title: '服务网点与体验点', source: 'service', scope: 'all', columns: 2, limit: 0, showStatus: true },
    },
    {
      type: 'cards',
      props: {
        title: '联系我们',
        columns: 3,
        items: supportExtra.CONTACT_PAYLOAD.channels.map((channel) => ({
          tag: channel.kind,
          title: channel.label,
          desc: `${channel.value} · ${channel.note}`,
        })),
      },
    },
    { type: 'faqList', props: { title: '常见问题', source: 'support', limit: 10 } },
    {
      type: 'contact',
      props: {
        title: '没找到你要的答案？',
        desc: '提交咨询并附上型号与现象；处理进度与补充材料都在客户中心里跟进。',
        channel: 'inquiry',
        showForm: false,
      },
    },
  ])
}

/** 联系我们：联系渠道 → 服务时间 → 办事处 → 引导 */
function buildContact(): Page {
  return toPage('contact', '/contact', '联系我们', '联系我们装修。', [
    {
      type: 'cards',
      props: {
        title: '联系渠道',
        columns: 3,
        items: supportExtra.CONTACT_PAYLOAD.channels.map((channel) => ({
          tag: channel.kind,
          title: channel.label,
          desc: `${channel.value} · ${channel.note}`,
        })),
      },
    },
    {
      type: 'cards',
      props: {
        title: '服务时间',
        columns: 3,
        items: supportExtra.CONTACT_PAYLOAD.hours.map((item) => ({ title: item.days, desc: item.time })),
      },
    },
    {
      type: 'cards',
      props: {
        title: '办事处与体验点',
        columns: 2,
        items: supportExtra.CONTACT_PAYLOAD.offices.map((office) => ({
          title: `光魂 · ${office.city}`,
          desc: `${office.address} · ${office.phone} · ${office.hours}`,
        })),
      },
    },
    {
      type: 'contact',
      props: {
        title: '需要人工协助？',
        desc: '在线提交咨询并附上型号与现象，处理进度与补充材料都在客户中心里跟进。',
        channel: 'inquiry',
        showForm: false,
      },
    },
  ])
}

/** 新闻列表 */
function buildNews(): Page {
  return toPage('news', '/news', '新闻列表', '新闻列表装修 + 数据源区块。', [
    { type: 'text', props: { body: '产品发布、活动与品牌动态。', align: 'left' } },
    { type: 'articleList', props: { title: '全部动态', source: 'news', limit: 0, pageSize: 9 } },
  ])
}

/** 品牌页（每个 slug 一页） */
function buildBrandPage(profile: brand.BrandProfile): Page {
  return toPage(`brand-${profile.slug}`, `/brand/${profile.slug}`, `品牌页 · ${profile.name}`, `${profile.name}品牌页装修。`, [
    {
      type: 'imageText',
      props: {
        image: profile.cover,
        title: profile.tagline,
        body: `${profile.intro}\n${profile.points.join('\n')}`,
        side: 'left',
      },
    },
    {
      type: 'timeline',
      props: { title: '品牌里程碑', items: profile.milestones.map((item) => ({ time: item.year, title: item.text })) },
    },
    {
      type: 'cards',
      props: {
        title: '关联产品',
        columns: 3,
        items: profile.products.map((product) => ({ title: product.name, desc: '查看产品详情与实测数据。', href: `/products/${product.id}` })),
      },
    },
    {
      type: 'contact',
      props: {
        title: '想进一步了解光魂？',
        desc: '产品与售后问题走服务支持；渠道、送测与赛事合作走商业合作。',
        channel: 'inquiry',
        showForm: false,
      },
    },
  ])
}

/** 产品列表 */
function buildProducts(): Page {
  return toPage('products', '/products', '产品列表', '产品列表装修 + 数据源区块。', [
    { type: 'text', props: { body: '按类别、连接方式与价格筛选在售产品。', align: 'left' } },
    // 全部产品（带筛选/排序）——productGrid 的范围/呈现/字段全部可配（见后台装修器）
    { type: 'productGrid', props: { title: '全部产品', scope: 'all', limit: 24, columns: 3 } },
    // 样板：按分类——只挑一个品类
    { type: 'productGrid', props: { title: 'OLED 旗舰', subtitle: '只展示「OLED旗舰」分类的全部型号。', scope: 'category', category: 'OLED旗舰', limit: 6, columns: 3, showFilter: false } },
  ])
}

/** 天梯榜 */
function buildLadder(): Page {
  return toPage('ladder', '/ladder', '天梯榜', '天梯榜装修 + 数据源区块。', [
    {
      type: 'text',
      props: { body: '所有数值来自同一套可复现的测试方法。榜单不代表行业结论，仅供选购参考。', align: 'left' },
    },
    { type: 'ranking', props: { title: '综合榜', metric: 'overall', limit: 10 } },
    // 数据源区块：测评方法取自集合 methods（后台「测评方法」维护，改后前台即时生效）
    {
      type: 'methodList',
      props: { title: '测试方法', subtitle: '测试方法公开、可复现；方法升级后历史文章引用旧版数值保持不变。', limit: 0 },
    },
  ])
}

/** 文章列表 */
function buildArticles(): Page {
  return toPage('articles', '/articles', '文章列表', '文章列表装修 + 数据源区块。', [
    { type: 'text', props: { body: '评测、教程与行业观察；参数与方法公开，来源可查。', align: 'left' } },
    { type: 'articleList', props: { title: '全部文章', source: 'all', limit: 0, pageSize: 9 } },
  ])
}

/** 下载中心 */
function buildDownloads(): Page {
  return toPage('downloads', '/downloads', '下载中心', '下载中心装修 + 数据源区块。', [
    { type: 'text', props: { body: '驱动、固件与说明书；同一份资料可关联到多个型号。', align: 'left' } },
    { type: 'downloadList', props: { title: '全部资料', category: 'all', limit: 0, pageSize: 10 } },
  ])
}

/** 常见问题 */
function buildFaq(): Page {
  return toPage('faq', '/faq', '常见问题', '常见问题装修 + 数据源区块。', [
    { type: 'text', props: { body: '驱动安装、连接配对、固件更新与售后相关的高频问答。', align: 'left' } },
    { type: 'faqList', props: { title: '全部问答', source: 'support', limit: 0, pageSize: 10 } },
  ])
}

/** 咨询提交 */
function buildInquiry(): Page {
  return toPage('inquiry', '/inquiry', '咨询提交', '咨询提交装修。', [
    {
      type: 'contact',
      props: {
        title: '提交咨询',
        desc: '填写型号与现象，提交后可在客户中心跟踪处理进度。',
        channel: 'inquiry',
        showForm: true,
      },
    },
  ])
}

/** 模板页：仅描述装修区，明细主体由结构化模板组件渲染（契约 §5） */
function buildTemplates(): Page[] {
  return [
    toPage('template-product', '/products/:id', '产品详情模板', '产品详情装修区（主体区块化：所有产品共用此模板，数据来自产品集合）。', [
      {
        type: 'productHero',
        props: {
          // 主 CTA 为线索型动作（不做电商购买）：预约体验 → 体验点；次 CTA 加入对比
          primaryLabel: '预约体验',
          primaryHref: '/business/venues',
          secondaryLabel: '加入对比',
          secondaryHref: '/compare',
          showBadges: true,
          showPrice: true,
          showSummary: true,
        },
      },
      {
        type: 'productSpecs',
        props: {
          title: '参数规格',
          showTabs: true,
          showGuides: true,
          guideDownloadLabel: '前往下载中心',
          guideContactLabel: '提交咨询',
        },
      },
      {
        type: 'productBuy',
        props: {
          title: '准备入手？',
          subtitle: '先把参数看明白，再决定也不迟。',
          primaryLabel: '预约体验',
          primaryHref: '/business/venues',
          secondaryLabel: '在线顾问',
          secondaryHref: '/inquiry',
        },
      },
      {
        type: 'productGrid',
        props: {
          title: '相关产品',
          subtitle: '同品类、可一起对比的机型。',
          ctaLabel: '查看全部产品',
          ctaHref: '/products',
          source: 'featured',
          limit: 4,
          columns: 4,
        },
      },
      {
        type: 'articleList',
        props: {
          title: '相关评测',
          subtitle: '参数与实测的完整过程。',
          ctaLabel: '查看全部评测',
          ctaHref: '/articles',
          source: 'review',
          limit: 3,
        },
      },
    ]),
    toPage('template-series', '/products/series/:slug', '产品系列模板', '产品系列装修区。', [
      { type: 'text', props: { title: '产品系列', body: '按系列浏览产品。', align: 'left' } },
      { type: 'productGrid', props: { title: '系列产品', source: 'series', seriesId: '', limit: 12, columns: 3 } },
    ]),
    toPage('template-compare', '/compare', '产品对比模板', '产品对比装修区。', [
      { type: 'text', props: { title: '产品对比', body: '选择最多 4 款同品类产品进行参数对比。', align: 'left' } },
      { type: 'productGrid', props: { title: '可选产品', source: 'all', limit: 8, columns: 4 } },
    ]),
    toPage('template-article', '/articles/:id', '文章详情模板', '文章详情装修区。', [
      { type: 'articleList', props: { title: '相关阅读', source: 'all', limit: 3 } },
    ]),
    toPage('template-download', '/downloads/:id', '资源详情模板', '资源详情装修区。', [
      { type: 'downloadList', props: { title: '相关下载', category: 'all', limit: 4 } },
    ]),
    toPage('template-faq', '/faq/:id', '问答详情模板', '问答详情装修区。', [
      { type: 'faqList', props: { title: '相关问答', source: 'support', limit: 4 } },
    ]),
    toPage('template-case', '/business/cases/:id', '合作案例详情模板', '合作案例详情装修区。', [
      { type: 'text', props: { title: '关于本案例', body: '案例内容以官方最终公布为准。', align: 'left' } },
      {
        type: 'caseList',
        props: {
          title: '更多案例',
          subtitle: '可一并参考的合作项目。',
          ctaLabel: '查看全部案例',
          ctaHref: '/business/cases',
          scope: 'all',
          limit: 3,
          columns: 3,
          showMeta: true,
        },
      },
    ]),
    toPage('template-venue', '/business/venues/:id', '体验点详情模板', '体验点详情装修区。', [
      {
        type: 'venueList',
        props: {
          title: '更多体验点',
          subtitle: '就近选择门店体验实机。',
          ctaLabel: '查看全部体验点',
          ctaHref: '/business/venues',
          scope: 'all',
          limit: 3,
          columns: 3,
          showStatus: true,
        },
      },
    ]),
    toPage('template-model', '/support/model/:id', '型号支持模板', '型号支持装修区。', [
      { type: 'faqList', props: { title: '常见问题', source: 'support', limit: 4 } },
      { type: 'downloadList', props: { title: '相关下载', category: 'all', limit: 4 } },
    ]),
  ]
}

/** 构建 seed：全部页面 + 站点配置（契约 §5 页面 registry） */
export function buildSeed(): { pages: Page[]; site: SiteConfig } {
  const pages: Page[] = [
    buildHome(),
    buildAbout(),
    buildCenter(),
    buildBusiness(),
    buildBusinessScenes(),
    buildBusinessCases(),
    buildBusinessVenues(),
    buildSupport(),
    buildContact(),
    buildNews(),
    ...brand.BRAND_PROFILES.map(buildBrandPage),
    buildProducts(),
    ...buildTemplates(),
    buildLadder(),
    buildArticles(),
    buildDownloads(),
    buildFaq(),
    buildInquiry(),
  ]
  return { pages, site: SITE }
}