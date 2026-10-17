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

/** 区块草稿：type + props（+ 可选 style / enabled），id 由 toPage 按序号确定性生成 */
type Draft = { type: BlockType; props: Record<string, unknown>; style?: BlockStyle; enabled?: boolean }

/** 将区块草稿组装为页面；区块 id 形如 `home-b1`，稳定且可读（enabled 缺省为 true）。
 *  `pageEnabled` 缺省为 true；传 false 可令页面默认下线（后台仍可开启）。 */
function toPage(key: string, path: string, title: string, description: string, drafts: Draft[], pageEnabled = true): Page {
  const blocks: Block[] = drafts.map((draft, index) => {
    const block: Block = {
      id: `${key}-b${index + 1}`,
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
   站点配置（导航 / 页脚）
   ============================================================ */

const SITE: SiteConfig = {
  nav: [
    { label: '产品', href: '/products' },
    { label: '光魂 Center', href: '/center', badge: 'new' },
    { label: '天梯榜', href: '/ladder', badge: 'hot' },
    { label: '服务与支持', href: '/support' },
    { label: '探索光魂', href: '/about' },
  ],
  footer: [
    {
      title: '产品',
      links: [
        { label: '全部产品', href: '/products' },
        { label: '产品对比', href: '/compare' },
        { label: '天梯榜', href: '/ladder' },
      ],
    },
    {
      title: '服务与支持',
      links: [
        { label: '下载中心', href: '/downloads' },
        { label: '型号与兼容', href: '/support/models' },
        { label: '常见问题', href: '/faq' },
        { label: '提交咨询', href: '/inquiry' },
      ],
    },
    {
      title: '探索光魂',
      links: [
        { label: '探索光魂', href: '/about' },
        { label: '商业合作', href: '/business' },
        { label: '合作案例', href: '/business/cases' },
        { label: '电竞合作', href: '/brand/esports' },
        { label: '合规与协议', href: '/legal/privacy' },
      ],
    },
  ],
  // —— 下拉面板推荐卡开关：默认关闭（后台可在「站点配置 · 主导航」开启）——
  navFeatureEnabled: false,
  // —— 顶栏公告条（后台可改文案 / 链接 / 定时 / 是否可关闭）——
  announcement: {
    enabled: true,
    text: '54027X1QE 第四代 W-OLED 旗舰上市 · 预约到店体验新品',
    href: '/business/venues',
    dismissible: true,
  },
  // —— 顶栏右侧行动按钮：按反馈默认不放 CTA（顶栏更干净）；
  //     能力保留，运营可在「站点配置 → 顶栏按钮」里随时填文案与链接启用 ——
  topCta: {},
  // —— 表单安全开关：默认开启图形验证码，第三方登录仅留位 ——
  auth: { captcha: true, thirdParty: false },
  // —— 保修参数：三年质保（含烧屏保护），到期前 30 天提醒 ——
  warranty: { years: 3, remindDays: 30, snParse: false },
  // —— 页脚社交（§1.9）：每个平台一条（二维码 / 账号 / 链接三项选填）——
  social: {
    items: [
      { label: '微信', account: 'guanghun-official' },
      { label: '微博', account: '光魂电竞' },
      { label: 'B 站', account: '光魂官方' },
      { label: '抖音', account: '光魂' },
    ],
  },
  // —— 店铺渠道：顶栏「店铺」圆钮下拉用；href 为占位，上线前替换为真实店铺链接 ——
  shopChannels: [
    { name: '天猫', href: 'https://tmall.example/' },
    { name: '京东', href: 'https://jd.example/' },
    { name: '淘宝', href: 'https://taobao.example/' },
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

/** 服务支持页「快速入口」的跳转目标（按 QUICK_ENTRIES 的 id 映射） */
const SUPPORT_QUICK_HREF: Record<string, string> = {
  model: '/support',
  download: '/downloads',
  faq: '/faq',
  contact: '/contact',
}

/** 首屏 / 全屏海报的统一按钮口径：只保留一个「立即购买」按钮，
 *  链接保持原来的产品详情页（品牌 / 场景类海报回退到产品总览）；文案与链接后台均可改。 */
function posterButtons(detailHref: string): { primary: Record<string, unknown> } {
  return {
    primary: { label: '立即购买', href: detailHref },
  }
}

/** 海报文案位置：水平居中、纵向靠上（复刻客户参考：标题落在卡高约 16% 处，下方留给产品主体） */
const POSTER_POSITION = { x: 50, y: 16 }

function buildHome(): Page {
  return toPage('home', '/', '首页', '首页装修：首屏、场景、重点产品、天梯榜、评测、品牌、服务、合作与新闻。', [
    {
      type: 'carousel',
      props: {
        slides: home.HERO_SLIDES.map((slide) => {
          const detail = slide.primaryTo ?? '/products'
          return {
            eyebrow: slide.eyebrow,
            // 默认不显示眉题 / 数据点（后台可开启）
            eyebrowEnabled: false,
            title: slide.title,
            desc: slide.desc,
            mediaTag: slide.mediaTag,
            image: slide.poster ?? `/media/home/${slide.id}.svg`,
            ...(slide.posterMobile ? { imageMobile: slide.posterMobile } : {}),
            ...(slide.mediaContain ? { mediaContain: true } : {}),
            ...(slide.scrim === false ? { scrim: false } : {}),
            ...(slide.theme ? { theme: slide.theme } : {}),
            ...posterButtons(detail),
            stats: slide.stats,
            statsEnabled: false,
            contentPosition: slide.position ?? POSTER_POSITION,
          }
        }),
        autoplay: true,
        // 首屏恢复满屏高度：21:9 素材按 cover 铺满，裁掉两侧空白，产品保持完整
        height: 'full',
        // 代码动画作为第 1 张（可关闭；关闭后仅展示下面配置的海报）
        motion: true,
      },
      // 首页首屏海报：通栏铺满视口宽度，磨砂顶栏浮于其上
      style: { theme: 'dark', container: 'full' },
    },
    // —— 五张全屏海报（§1.3）：一张海报 = 一个区块（hero），各自独立、上下无缝衔接 ——
    // 与首屏同一套字段 / 口径：默认关眉题与数据点、文案居中偏上、只留一个「立即购买」按钮；
    // 高度档位统一为 21:9 宽幅（h-r219）；通栏满宽、无圆角、无上下留白，相邻海报之间不留间隙。
    {
      type: 'hero',
      props: {
        eyebrow: 'FLAGSHIP / 26.5" 2K@540Hz',
        eyebrowEnabled: false,
        statsEnabled: false,
        title: ['54027X1QE 标准款'],
        subtitle: '八面出锋 大巧不工',
        media: '/media/home/showcase/gh-54027x1qe.jpg',
        mediaType: 'image',
        mediaTag: '54027X1QE 主视觉',
        ...posterButtons('/products/gh-54027x1qe'),
        contentPosition: POSTER_POSITION,
        height: 'r219',
        theme: 'dark',
      },
      style: { container: 'full' },
    },
    {
      type: 'hero',
      props: {
        eyebrow: 'DUAL-MODE / 4K@165 · FHD@330',
        eyebrowEnabled: false,
        statsEnabled: false,
        title: ['32X1UE 双模款'],
        subtitle: '一机两用 高分辨与高刷兼得',
        media: '/media/home/showcase/gh-32x1ue.jpg',
        mediaType: 'image',
        mediaTag: '32X1UE 主视觉',
        ...posterButtons('/products/gh-32x1ue'),
        contentPosition: POSTER_POSITION,
        height: 'r219',
        theme: 'dark',
      },
      style: { container: 'full' },
    },
    {
      type: 'hero',
      props: {
        eyebrow: 'BEST SELLER / 26.5" 2K@280Hz',
        eyebrowEnabled: false,
        statsEnabled: false,
        title: ['28027X1QE 热销款'],
        subtitle: '平民超跑 1500 nit 峰值亮度',
        media: '/media/home/showcase/gh-28027x1qe.jpg',
        mediaType: 'image',
        mediaTag: '28027X1QE 主视觉',
        ...posterButtons('/products/gh-28027x1qe'),
        contentPosition: POSTER_POSITION,
        height: 'r219',
        theme: 'dark',
      },
      style: { container: 'full' },
    },
    {
      type: 'hero',
      props: {
        eyebrow: 'ESPORTS IPS / 27" 2K@200Hz',
        eyebrowEnabled: false,
        statsEnabled: false,
        title: ['27Q1F 电竞款'],
        subtitle: '27 英寸 2K 200Hz Fast IPS，HDR 与广色域兼得',
        media: '/media/products/gh-27q1f.jpg',
        mediaType: 'image',
        mediaTag: '27Q1F 主视觉',
        ...posterButtons('/products/gh-27q1f'),
        contentPosition: POSTER_POSITION,
        height: 'r219',
        theme: 'dark',
      },
      style: { container: 'full' },
    },
    {
      type: 'hero',
      props: {
        eyebrow: 'ENTRY / 23.8" FHD@200Hz',
        eyebrowEnabled: false,
        statsEnabled: false,
        title: ['24H1 入门款'],
        subtitle: '23.8 英寸 FHD 200Hz 电竞显示器，HDR400',
        media: '/media/products/gh-24h1.jpg',
        mediaType: 'image',
        mediaTag: '24H1 主视觉',
        ...posterButtons('/products/gh-24h1'),
        contentPosition: POSTER_POSITION,
        height: 'r219',
        theme: 'dark',
      },
      style: { container: 'full' },
    },
    // —— 2×2 产品矩阵（§1.4）：图片铺满卡面，型号 + 一句话 + 按钮悬浮右下 ——
    {
      type: 'productMatrix',
      props: {
        // 复刻客户示例：不带区块标题；图片约 1:1；卡片间距见 .blk-pmatrix__grid 的 5px
        source: 'product',
        columns: 2,
        ratio: '1:1',
        cropFocus: 'center',
        mobileLayout: 'rail',
        items: [
          {
            productId: 'gh-54027x1qe',
            desc: '26.5 英寸 2K@540Hz 第四代 W-OLED 旗舰',
            buttons: [
              { label: '进一步了解', href: '/products/gh-54027x1qe' },
              { label: '购买', href: '/products/gh-54027x1qe' },
            ],
          },
          {
            productId: 'gh-32x1ue',
            desc: '4K@165 / FHD@330 双模 OLED，一机两用',
            buttons: [
              { label: '进一步了解', href: '/products/gh-32x1ue' },
              { label: '购买', href: '/products/gh-32x1ue' },
            ],
          },
          {
            productId: 'gh-28027x1qe',
            desc: '2K@280Hz，1500 nit 峰值亮度的超跑之选',
            buttons: [
              { label: '进一步了解', href: '/products/gh-28027x1qe' },
              { label: '购买', href: '/products/gh-28027x1qe' },
            ],
          },
          {
            productId: 'gh-27q1f',
            desc: '27 英寸 2K 200Hz Fast IPS 高性价比之选',
            buttons: [
              { label: '进一步了解', href: '/products/gh-27q1f' },
              { label: '购买', href: '/products/gh-27q1f' },
            ],
          },
        ],
      },
      // 通栏满幅：卡片铺满视口宽度（与上方海报、下方模块无缝相接）
      style: { container: 'full' },
    },
    // —— 固件与驱动（§1.5）：3 张卡自动带最新版本与日期（取下载中心 downloads 最新一条）——
    {
      type: 'cards',
      props: {
        title: '固件与驱动',
        icon: 'download',
        subtitle: '保持最新版本，获得更好的兼容与调校。',
        ctaLabel: '前往下载中心',
        ctaHref: '/downloads',
        // 标题行左侧搜索栏（简约，复用站点输入框）：占位文字与跳转地址后台可改
        searchPlaceholder: '搜索型号',
        searchHref: '/search',
        layout: 'entries',
        columns: 3,
        autoVersions: true,
        items: [
          { icon: 'chip', tag: '固件', title: '固件一键升级', desc: '在光魂 Center 里检查更新并升级，每次附带变更说明。', href: '/downloads', downloadType: 'firmware' },
          { icon: 'sliders', tag: '驱动', title: '驱动与调色配置', desc: 'ICC 与调色文件公开下载，无需注册。', href: '/downloads', downloadType: 'driver' },
          { icon: 'refresh', tag: '软件', title: '光魂 Center', desc: '按键、参数、灯效与固件统一在一处管理。', href: '/center', downloadType: 'software' },
        ],
      },
    },
    // —— 留言（§1.6）：左文案 + 右表单；轻量分流默认开启（后台可关）——
    {
      type: 'contact',
      props: {
        title: '没找到答案？留言给我们',
        desc: '有问题或想合作？填好表单提交，我们会在工作时间内跟进。',
        channel: 'inquiry',
        showForm: true,
      },
    },
    // —— 信任条（§1.7）：页脚上面的最后一块 ——
    {
      type: 'trustBar',
      props: {
        columns: 4,
        items: [
          { icon: 'flask', text: '小雪人评测实验室' },
          { icon: 'shield', text: '三年质保' },
          { icon: 'check', text: '官方正品' },
          { icon: 'box', text: '顺丰包邮' },
        ],
      },
    },
    /* ——— 以下为内容库保留区块，默认停用（enabled:false），后台可随时开启 ———
       停用后下方模块自动上移，不留空位。 */
    {
      enabled: false,
      type: 'cards',
      props: {
        layout: 'trust',
        columns: 4,
        items: [
          { title: '小雪人评测实验室', desc: '统一方法与样本量' },
          { title: '三年质保', desc: '含 OLED 烧屏保护' },
          { title: '官方正品', desc: '全国联保' },
          { title: '顺丰包邮', desc: '15 天无理由退换' },
        ],
      },
    },
    {
      enabled: false,
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
    {
      enabled: false,
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
          model: product.model,
          title: product.name,
          desc: SHOWCASE_COPY[product.id] ?? product.name,
          price: product.price,
          specs: product.specs,
          features: product.features,
          cta: { label: '查看详情', href: `/products/${product.id}` },
        })),
      },
      style: { container: 'full', background: 'soft' },
    },
    { enabled: false, type: 'ranking', props: { title: '实测天梯榜', icon: 'trophy', subtitle: '所有数值来自同一套可复现的测试方法。', metric: 'overall', limit: 6, teaser: true } },
    { enabled: false, type: 'articleList', props: { title: '评测与解析', icon: 'book', subtitle: '参数公开、方法公开，结论可复现。', ctaLabel: '查看全部内容', ctaHref: '/articles', source: 'review', limit: 3 } },
    { enabled: false, type: 'stats', props: { title: '品牌数字', icon: 'chip', subtitle: '用可核对的数字，说明我们是谁、做了些什么。', footnote: '数据截至 2026 年，均按同一套公开口径统计，可在「关于光魂」逐条核对。', items: home.BRAND_STATS } },
    {
      enabled: false,
      type: 'cards',
      props: {
        title: '服务与支持',
        icon: 'help',
        subtitle: '从选型到售后，一站直达。',
        ctaLabel: '进入服务与支持',
        ctaHref: '/support',
        layout: 'spotlight',
        columns: 4,
        items: home.SERVICE_ENTRIES.map((entry) => ({
          title: entry.title,
          desc: entry.desc,
          href: SERVICE_HREF[entry.id] ?? '/support',
        })),
      },
    },
    // 服务承诺条（§1.8）：与信任条内容重复，默认停用
    {
      enabled: false,
      type: 'cards',
      props: {
        title: '服务承诺',
        icon: 'shield',
        subtitle: '买前买后，都由同一套标准兜底。',
        layout: 'trust',
        columns: 3,
        items: [
          { tag: '质保', title: '三年质保，含烧屏保障', desc: '全系 OLED 面板覆盖烧屏保护，全国联保；序列号即可查保修状态。' },
          { tag: '物流', title: '顺丰包邮，现货速发', desc: '到货即验机，15 天无理由退换。' },
          { tag: '服务', title: '专属服务，全程可跟进', desc: '面板服务与技术支持由同一套工单承接，进度随时可查。' },
        ],
      },
    },
    {
      enabled: false,
      type: 'cards',
      props: {
        title: '选购指南',
        icon: 'compass',
        subtitle: '不知道从哪看起？按这三条主线快速定位。',
        ctaLabel: '浏览全部产品',
        ctaHref: '/products',
        layout: 'steps',
        columns: 3,
        items: [
          { tag: '按用途', title: '先定用途，再定型号', desc: '电竞看刷新率与响应，创作看色准与色域，办公看护眼与接口。', href: '/products' },
          { tag: '看实测', title: '用同一把尺子做比较', desc: '综合、色准、亮度、响应四项出自同一套测试方法，可逐条核对。', href: '/ladder' },
          { tag: '读评测', title: '结论要能自己复现', desc: '参数、仪器与样本数全部公开，谁都能照着做一遍。', href: '/articles' },
        ],
      },
    },
    { enabled: false, type: 'faqList', props: { title: '常见问题', source: 'support', limit: 4, ctaLabel: '查看全部问题', ctaHref: '/faq' } },
    {
      enabled: false,
      type: 'cards',
      props: {
        title: '体验与合作',
        icon: 'chat',
        subtitle: '到店试玩，或与我们共同做一场活动。',
        ctaLabel: '查看全部体验点',
        ctaHref: '/business/venues',
        columns: 3,
        items: home.SPOTS.map((spot) => ({
          tag: spot.status,
          title: spot.name,
          desc: `${spot.area} · ${spot.note}`,
          href: '/business/venues',
        })),
      },
    },
    {
      enabled: false,
      type: 'subscribe',
      props: {
        title: '订阅新品与固件更新',
        desc: '留下邮箱，第一时间收到新品发布、固件更新与活动通知。',
        source: 'home',
        points: ['新品发布第一时间知悉', '固件更新与调校配置提醒', '不定期线下体验活动邀请'],
      },
    },
    { enabled: false, type: 'articleList', props: { title: '新闻与动态', icon: 'refresh', subtitle: '产品发布、活动与品牌更新。', ctaLabel: '查看全部新闻', ctaHref: '/news', source: 'news', limit: 6 } },
  ])
}

/** 探索光魂（原「关于光魂」）：品牌理念 → 关键事实 → 测试实验室（图文＋3 步合并） → 发展历程 → 新闻 → 文化 → 招聘 → 电竞合作 → 合规（默认停用） → 引导 */
function buildAbout(): Page {
  return toPage('about', '/about', '探索光魂', '探索光魂装修。', [
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
    // 测试实验室（T5.8 合并）：原「测试实验室」图文 + 原「光魂实验室」3 步卡合为一个区块（图 + 3 步同屏）
    {
      type: 'imageText',
      props: {
        image: '/media/about/lab.svg',
        title: '测试实验室',
        body: [
          '收样登记 → 仪器实测 → 方法复核，每一步都可追溯。',
          '收样登记：记录样机编号、批次与环境条件。',
          '仪器实测：色度计 / 亮度计 / 响应测试仪 / 均匀度台架。',
          '方法复核：样本 n≥3，口径与版本公开，结果可复现。',
          ...about.LAB_POINTS,
        ].join('\n'),
        side: 'right',
      },
    },
    {
      type: 'timeline',
      props: { title: '发展历程', items: about.TIMELINE.map((item) => ({ time: item.year, title: item.title, desc: item.tag })) },
    },
    {
      type: 'cards',
      props: {
        title: '媒体报道 · 荣誉',
        icon: 'cap',
        columns: 3,
        items: [
          { tag: '媒体报道', title: '硬件媒体 B · 540Hz OLED 深度评测', desc: '2026-09' },
          { tag: '媒体报道', title: '电竞媒体 C · 赛场装备专题', desc: '2026-08' },
          { tag: '荣誉', title: '2026 年度 OLED 旗舰显示器', desc: '编辑部推荐' },
        ],
      },
    },
    { type: 'cards', props: { title: '企业文化', icon: 'venn', columns: 3, items: about.CULTURE_TAGS.map((tag) => ({ title: tag })) } },
    {
      type: 'cards',
      props: {
        title: '加入我们',
        icon: 'chat',
        columns: 3,
        // 岗位卡带投递入口（此前只有岗位名，无法投递）
        items: about.JOBS.map((job) => ({ title: job, desc: '投递至 hr@guanghun.example', href: `mailto:hr@guanghun.example?subject=${encodeURIComponent(`应聘：${job}`)}` })),
      },
    },
    // 电竞合作（T5.8 / §4.13）：品牌线 /brand/esports 下线后，内容并入探索光魂（保留原有文案要点）
    {
      type: 'cards',
      props: {
        title: '电竞合作',
        icon: 'chat',
        subtitle: '与选手一起打磨每一帧画面。',
        columns: 3,
        items: (brand.BRAND_PROFILES.find((profile) => profile.slug === 'esports')?.points ?? []).map((point) => ({
          title: point,
        })),
      },
    },
    // 合规与条款：页脚 / /legal/* 已有入口，默认停用（后台可开启）
    {
      enabled: false,
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

/** Center 软件：软件首屏（含底部下载条）→ 核心能力 → 功能深读 ×2 → 更新日志 → FAQ */
function buildCenter(): Page {
  return toPage('center', '/center', 'Center 软件', 'Center 软件装修。', [
    {
      type: 'hero',
      props: {
        // 与首页首屏同一套文案格式与排版：眉题默认不显示、标题 + 一句话、文案居中偏上；
        // 下载入口不再占用文案区按钮，改为海报底部悬浮的下载条（downloadIds）
        eyebrow: 'SOFTWARE / 配套软件',
        eyebrowEnabled: false,
        statsEnabled: false,
        title: ['光魂 Center'],
        subtitle: '一套软件，管理全部光魂显示器。',
        mediaTag: '软件界面',
        image: '/media/center/hero.svg',
        contentPosition: POSTER_POSITION,
        // 底部悬浮下载条：从下载中心勾选 Windows / macOS 两个安装包（版本与大小自动取真实值）
        downloadIds: ['center-win', 'center-mac'],
      },
      // hero 海报同样通栏，与首页 carousel 保持一致
      style: { theme: 'dark', container: 'full' },
    },
    {
      // 核心能力：能力网格布局（编号 + 图标块 + 标题 + 说明）；item.id 同时作为锚点（/center#manage 等）
      type: 'cards',
      props: {
        title: '核心能力',
        layout: 'capability',
        columns: 3,
        items: center.CAPABILITIES.map((item) => ({
          id: item.id,
          icon: item.icon,
          title: item.title,
          desc: item.desc,
        })),
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
      type: 'timeline',
      props: { title: '更新日志', items: center.CHANGELOG.map((item) => ({ time: item.version, title: item.title, desc: item.date })) },
      // 锚点 #changelog：供站内 / 站外深链直达本区块
      style: { anchor: 'changelog' },
    },
    { type: 'faqList', props: { title: '常见问题', source: 'center', limit: 10 } },
  ])
}

/** 商业合作首页：合作方向与权益 → 合作流程 → 案例 → 品牌资料 → 申请 → 联系方式（§4.9：8 块 → 6 块） */
function buildBusiness(): Page {
  return toPage('business', '/business', '商业合作首页', '商业合作首页装修。', [
    // 顶部全屏海报（纯图片、无文案）：固定 480px 高，宽屏铺满；图片由后台替换
    {
      type: 'fullscreenVisual',
      props: {
        media: '',
        mediaType: 'image',
        height: 'custom',
        heightValue: 480,
        alt: '商业合作顶部横幅（待上传）',
      },
      style: { container: 'full' },
    },
    // ①「合作方向」：6 条单一真源（删除与 COOP_DIRECTIONS 重复的 4 条硬编码）
    {
      type: 'cards',
      props: {
        title: '合作方向',
        subtitle: '选择最接近的合作方式；提交后由对应团队对接。',
        columns: 3,
        items: business.COOP_DIRECTIONS.map((item) => ({ tag: item.id, title: item.title, desc: item.desc })),
      },
    },
    // ② 合作流程：横向流程模块（序号 + 连接线；移动端纵向）
    {
      type: 'timeline',
      props: {
        title: '合作流程',
        layout: 'flow',
        items: [
          { time: '01', title: '提交申请', desc: '填写合作表单，说明合作类型与诉求。' },
          { time: '02', title: '送测 / 商务对接', desc: '媒体送测按送测规范寄送样机；商务合作由专人对接，确认方案与合作条款。' },
          { time: '03', title: '落地执行', desc: '签订协议，按计划推进并同步进展。' },
        ],
      },
    },
    {
      type: 'cards',
      props: {
        title: '精选合作案例',
        columns: 3,
        items: business.COOP_CASES.map((item) => ({ tag: item.tag, title: item.title, desc: item.desc, href: '/business/cases' })),
        ctaLabel: '查看全部案例',
        ctaHref: '/business/cases',
      },
    },
    // 品牌资料（B 端）：由独立集合 brand-assets 驱动，锚点 brand-assets
    // （导航「品牌资料下载」→ /business#brand-assets；与 C 端下载中心数据分开）
    {
      type: 'brandAssetList',
      props: {
        title: '品牌资料',
        subtitle: '面向渠道、媒体与合作方的品牌规范、Logo、产品图与送测物料。',
        category: 'all',
        limit: 0,
        ctaLabel: '申请品牌资料',
        ctaHref: '/inquiry',
      },
      style: { anchor: 'brand-assets' },
    },
    {
      type: 'contact',
      props: {
        title: '提交合作申请',
        desc: '提交后进入与产品咨询同一套工单系统，来源字段标注为「商业合作」。',
        channel: 'business',
        showForm: true,
        // R5.2：联系方式只留邮箱与地址，并入表单左栏，不再单独占一个区块
        points: ['商务合作邮箱：business@guanghun.example', '办公地址：广东省深圳市 · 光魂（到访需提前预约）'],
      },
      // R5.5：表单区块上下留白收紧（md → sm），整块高度下降
      style: { paddingY: 'sm' },
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
        title: '企业批量采购',
        subtitle: '面向团队与门店的整单采购支持 ｜ 从选型到部署一站对接',
        items: [
          { icon: 'cube', title: '批量采购价', desc: '按数量分档给出阶梯价，整单报价更透明，支持跨型号组合下单。' },
          { icon: 'shield', title: '对公 + 增票', desc: '支持对公转账与增值税专用发票，合同、账期按企业流程对接。' },
          { icon: 'cloud', title: '全国配送安装', desc: '全国范围配送，可预约上门安装与线材整理，统一交付标准。' },
          { icon: 'sliders', title: '专属技术对接', desc: '配备对接人跟进固件、显示配置与售后，批量设备集中管理。' },
        ],
        wechat: 'xxrsm001',
        email: '1009742523@qq.com',
        hotline: '15913908438',
        showContact: true,
      },
    },
  ])
}

/** 服务支持首页：快速入口 → 下载 → 保修 → 网点 → 联系 → FAQ → 引导 */
function buildSupport(): Page {
  return toPage('support', '/support', '服务与支持首页', '服务与支持首页装修。', [
    {
      type: 'cards',
      props: {
        title: '快速入口',
        icon: 'help',
        columns: 3,
        // 每张卡带跳转目标（此前无链接，点了没反应）
        items: support.QUICK_ENTRIES.map((entry) => ({ tag: entry.id, title: entry.title, desc: entry.desc, href: SUPPORT_QUICK_HREF[entry.id] ?? '/support' })),
      },
    },
    // 下载中心：支持首页只放精选（完整列表去 /downloads，避免页面过长）；锚点 #download
    { type: 'downloadList', props: { title: '下载中心', icon: 'download', subtitle: '说明书、固件与调校配置，最新资料优先。', category: 'all', limit: 6, ctaLabel: '查看全部资料', ctaHref: '/downloads' }, style: { anchor: 'download' } },
    // 保修与售后：锚点 #warranty，供导航「保修与售后」深链直达（R4-②）
    { type: 'cards', props: { title: '保修与售后', icon: 'shield', columns: 2, items: support.WARRANTY_POINTS.map((point) => ({ title: point })) }, style: { anchor: 'warranty' } },
    // 服务承诺条（三年质保 · 顺丰 · 15 天退换）；与首页信任条同源，默认停用（§4.3）
    {
      enabled: false,
      type: 'cards',
      props: {
        title: '服务承诺',
        icon: 'shield',
        columns: 3,
        items: [
          { title: '三年质保', desc: '全系含 OLED 烧屏保护，全国联保。' },
          { title: '顺丰包邮', desc: '现货速发，支持 15 天无理由退换。' },
          { title: '专属服务', desc: '面板服务与技术支持，工单全程可跟进。' },
        ],
      },
    },
    // 数据源区块：网点/体验点取自集合 service-info（后台「服务信息」维护，改后前台即时生效）
    {
      type: 'venueList',
      props: { title: '服务网点与体验点', source: 'service', scope: 'all', columns: 2, limit: 0, showStatus: true },
    },
    // 联系我们：与 /contact 重复，默认停用（§4.3）
    {
      enabled: false,
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
    // FAQ：锚点 #faq，供导航「常见问题」深链直达；补「查看全部」CTA → /faq（§4.6）
    { type: 'faqList', props: { title: '常见问题', source: 'support', limit: 10, ctaLabel: '查看全部', ctaHref: '/faq' }, style: { anchor: 'faq' } },
    {
      type: 'contact',
      props: {
        title: '没找到你要的答案？',
        desc: '提交咨询并附上型号与现象；处理进度与补充材料都在个人中心里跟进。',
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
      // 「办事处与体验点」默认停用（§4.14）：完整列表在 /business/venues，页面留「联系渠道 + 服务时间 + 引导」三块
      enabled: false,
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
        desc: '在线提交咨询并附上型号与现象，处理进度与补充材料都在个人中心里跟进。',
        channel: 'inquiry',
        showForm: false,
      },
    },
  ])
}

/** 新闻/资讯列表（资讯唯一列表页；默认停用，后台可开） */
function buildNews(): Page {
  return toPage('news', '/news', '新闻列表', '新闻列表装修 + 数据源区块。', [
    { type: 'articleList', props: { title: '全部动态', subtitle: '产品发布、活动与资讯动态。', source: 'news', limit: 0, pageSize: 9 } },
  ], false)
}

/** 品牌页（每个 slug 一页）；T5.8/§4.13：品牌线三页默认全部下线（内容已并入探索光魂），后台可开 */
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
  ], false)
}

/** 产品列表 */
function buildProducts(): Page {
  return toPage('products', '/products', '产品列表', '产品列表装修 + 数据源区块。', [
    // 顶部全屏海报（纯图片、无文案）：固定 480px 高，宽屏铺满；图片由后台替换
    {
      type: 'fullscreenVisual',
      props: {
        media: '',
        mediaType: 'image',
        height: 'custom',
        heightValue: 480,
        alt: '全部产品顶部横幅（待上传）',
      },
      style: { container: 'full' },
    },
    // 全部产品（带筛选/排序）——productGrid 的范围/呈现/字段全部可配（见后台装修器）
    { type: 'productGrid', props: { title: '全部产品', subtitle: '按类别、连接方式与价格筛选在售产品。', scope: 'all', limit: 24, columns: 3, cardTone: 'dark' } },
    // 样板：按分类——只挑一个品类
    { type: 'productGrid', props: { title: 'OLED 旗舰', subtitle: '只展示「OLED旗舰」分类的全部型号。', scope: 'category', category: 'OLED旗舰', limit: 6, columns: 3, showFilter: false, cardTone: 'dark' } },
  ])
}

/** 天梯榜 */
function buildLadder(): Page {
  return toPage('ladder', '/ladder', '天梯榜', '天梯榜装修 + 数据源区块。', [
    { type: 'ranking', props: { title: '综合榜', subtitle: '所有数值来自同一套可复现的测试方法；榜单仅供选购参考。', metric: 'overall', limit: 10 } },
    // 数据源区块：测评方法取自集合 methods（后台「测评方法」维护，改后前台即时生效）
    {
      type: 'methodList',
      props: { title: '测试方法', subtitle: '测试方法公开、可复现；方法升级后历史文章引用旧版数值保持不变。', limit: 0 },
    },
  ])
}

/** 文章列表（评测 / 教程 / 技术；资讯并入 /news，默认停用，后台可开） */
function buildArticles(): Page {
  return toPage('articles', '/articles', '文章列表', '文章列表装修 + 数据源区块。', [
    { type: 'articleList', props: { title: '全部文章', subtitle: '评测、教程与技术解析；参数与方法公开，来源可查。', source: 'all', limit: 0, pageSize: 9 } },
  ], false)
}

/** 下载中心 */
function buildDownloads(): Page {
  return toPage('downloads', '/downloads', '下载中心', '下载中心装修 + 数据源区块。', [
    // 顶部全屏海报（纯图片、无文案）：固定 480px 高，宽屏铺满；图片由后台替换
    {
      type: 'fullscreenVisual',
      props: {
        media: '',
        mediaType: 'image',
        height: 'custom',
        heightValue: 480,
        alt: '下载中心顶部横幅（待上传）',
      },
      style: { container: 'full' },
    },
    { type: 'downloadList', props: { title: '全部资料', subtitle: '驱动、固件与说明书；同一份资料可关联到多个型号。', category: 'all', limit: 0, pageSize: 10 } },
  ])
}

/** 常见问题 */
function buildFaq(): Page {
  return toPage('faq', '/faq', '常见问题', '常见问题装修 + 数据源区块。', [
    { type: 'faqList', props: { title: '全部问答', subtitle: '驱动安装、连接配对、固件更新与售后相关的高频问答。', source: 'support', limit: 0, pageSize: 10 } },
  ])
}

/** 型号支持索引（T5.5）：放进内容库、区块驱动。
 *  复用既有 cards 卡片网格（title / 文案 / 列数可后台调整；页面可整体停用），
 *  原手写页不再渲染；卡片数据取自已收录型号（models 集合的 seed 快照），详情页 /support/model/:id 不变。
 *  说明：未新建数据源区块类型（避免改动后台区块目录控件），故此处采用需求清单允许的
 *  「复用现有卡片网格」方式；「每页条数」由所列型号数量决定（当前型号较少，无需分页）。 */
function buildModelSupport(): Page {
  return toPage('model-support', '/support/models', '型号与兼容', '型号与兼容索引装修（卡片网格数据源区块）。', [
    {
      type: 'cards',
      props: {
        title: '全部型号',
        subtitle: '选择型号，查看对应的说明书、固件、校色配置、使用指南与常见问题。',
        ctaLabel: '下载中心',
        ctaHref: '/downloads',
        layout: 'grid',
        columns: 3,
        items: supportExtra.MODEL_SUPPORTS.map((model) => ({
          tag: model.line,
          title: model.model,
          desc: model.summary,
          href: `/support/model/${model.id}`,
        })),
      },
    },
  ])
}

/** 咨询提交 */
function buildInquiry(): Page {
  return toPage('inquiry', '/inquiry', '咨询提交', '咨询提交装修。', [
    {
      type: 'contact',
      props: {
        title: '提交咨询',
        desc: '填写型号与现象，提交后可在个人中心跟踪处理进度。',
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
        // 四套布局共用同一产品数据与字段逻辑；默认目录式，后台可切换，前台 ?layout= 可临时预览
        type: 'productDetailLayout',
        props: {
          layout: 'toc',
          showBuy: false,
          // §4.22 3-2：主 CTA「立即购买」取当前产品的「购买链接」(buyUrl)；次 CTA「预约体验」→ 体验点
          primaryLabel: '立即购买',
          primaryHref: '',
          secondaryLabel: '预约体验',
          secondaryHref: '/business/venues',
          primaryFromProduct: true,
          showBadges: true,
          showPrice: true,
          showSummary: true,
          buyTitle: '准备入手？',
          buySubtitle: '先把参数看明白，再决定也不迟。',
          buyPrimaryLabel: '预约体验',
          buyPrimaryHref: '/business/venues',
          buySecondaryLabel: '在线顾问',
          buySecondaryHref: '/inquiry',
        },
      },
      // H5 长图：按产品读取切片；未上传时前台自动跳过（不占位）
      { type: 'productLongImage', props: {} },
      // 购买 / 咨询收口放在长图之后，保证「参数 → 长图 → 咨询」的阅读顺序
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
          cardTone: 'dark',
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
      // §4.20 / T5.17：系列页自带产品网格，模板里不再重复放 productGrid（同一批产品不出现两次）
    ]),
    toPage('template-compare', '/compare', '产品对比模板', '产品对比装修区。', [
      { type: 'text', props: { title: '产品对比', body: '选择最多 4 款同品类产品进行参数对比。', align: 'left' } },
      { type: 'productGrid', props: { title: '可选产品', source: 'all', limit: 8, columns: 4, cardTone: 'dark' } },
    ]),
    toPage('template-article', '/articles/:id', '文章详情模板', '文章详情装修区。', [
      // 文末「相关产品」：导流回产品（区块化，后台可增删）
      {
        type: 'productGrid',
        props: {
          title: '相关产品',
          icon: 'monitor',
          subtitle: '与本文主题相关的型号。',
          ctaLabel: '查看全部产品',
          ctaHref: '/products',
          source: 'featured',
          limit: 4,
          columns: 4,
          showFilter: false,
          cardTone: 'dark',
        },
      },
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
    toPage('template-model', '/support/model/:id', '型号与兼容模板', '型号与兼容装修区。', [
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
    buildModelSupport(),
    buildInquiry(),
  ]
  return { pages, site: SITE }
}