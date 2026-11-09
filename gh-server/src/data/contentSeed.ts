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

/** 区块草稿：type + props（+ 可选 style / enabled / 固定 id），id 缺省由 toPage 按序号确定性生成 */
type Draft = { id?: string; type: BlockType; props: Record<string, unknown>; style?: BlockStyle; enabled?: boolean }

/** 将区块草稿组装为页面；区块 id 形如 `home-b1`，稳定且可读（enabled 缺省为 true）。
 *  `pageEnabled` 缺省为 true；传 false 可令页面默认下线（后台仍可开启）。 */
function toPage(key: string, path: string, title: string, description: string, drafts: Draft[], pageEnabled = true): Page {
  const blocks: Block[] = drafts.map((draft, index) => {
    const block: Block = {
      id: draft.id ?? `${key}-b${index + 1}`,
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
  // —— 页脚动画：默认关闭，页脚保持纯色干净（后台可在「站点配置 · 页脚」开启）——
  footerMotion: false,
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
  // —— 表单安全开关：默认「连续失败 3 次后才出验证码」，登录体验与防刷兼顾 ——
  auth: {
    captcha: true,
    thirdParty: false,
    captchaMode: 'after3',
    registerEnabled: true,
    login: {
      title: '登录光魂账号',
      subtitle: '登录后可跟踪咨询进度、管理已登记设备与订阅通知。',
      headline: '把每一块屏的参数，测给你看',
      description: '不写形容词，只给可复现的测试记录与版本号。',
      poster: '/media/home/showcase/poster-1.jpg',
      points: ['跟踪咨询与预约进度', '登记与管理我的设备', '收藏型号与下载资料'],
      agreement: '登录即表示同意《服务条款》与《隐私政策》',
    },
    wechat: { enabled: false },
    phone: { enabled: false },
  },
  // —— 保修参数：三年质保（含烧屏保护），到期前 30 天提醒 ——
  warranty: { years: 3, remindDays: 30, snParse: false },
  // —— 页脚社交（§1.9）：每个平台一条（二维码 / 账号 / 链接三项选填），账号取自官网对外公布信息 ——
  social: {
    items: [
      { label: '微信', account: 'xxrsm001', qr: '/media/site/wechat-qr-placeholder.svg' },
      { label: '小红书', href: 'https://www.xiaohongshu.com/' },
      { label: 'B 站', href: 'https://space.bilibili.com/51365206' },
      { label: '抖音', account: '光魂官方旗舰店', qr: '/media/site/douyin-qr-placeholder.svg' },
    ],
  },
  // —— 店铺渠道：顶栏「店铺」圆钮下拉用；链接取自官网对外公布入口 ——
  shopChannels: [
    { name: '京东', href: 'https://mall.jd.com/index-12338213.html' },
    { name: '抖音', href: 'https://www.douyin.com/search/%E5%85%89%E9%AD%82%E5%AE%98%E6%96%B9%E6%97%97%E8%88%B0%E5%BA%97' },
    { name: '淘宝 / 天猫', href: 'https://xiaoxuerenshuma.taobao.com/' },
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
  'gh-27x1qe-500': '26.5 英寸 2K@500Hz QD-OLED，满速 DP 2.1 与 0.03 ms 灰阶响应。',
}

/** 首页：首屏轮播 → 场景 → 重点产品（通栏展示） → 天梯榜 → 评测 → 品牌 → 服务 → 合作 → 新闻 */
/** 首页「服务与支持」四张卡的跳转目标（按 SERVICE_ENTRIES 的 id 映射） */
const SERVICE_HREF: Record<string, string> = {
  model: '/support',
  download: '/downloads',
  faq: '/faq',
  contact: '/contact',
}

/** 服务支持页「快速入口」的跳转目标已并入 QUICK_ENTRIES（entry.href），不再单独映射 */

/** 首屏 / 全屏海报的统一按钮口径：只保留一个「立即购买」按钮，
 *  链接保持原来的产品详情页（品牌 / 场景类海报回退到产品总览）；文案与链接后台均可改。 */
function posterButtons(detailHref: string): { primary: Record<string, unknown> } {
  return {
    primary: { label: '立即购买', href: detailHref },
  }
}

/** 海报文案位置：水平居中、纵向靠上（复刻客户参考：标题落在卡高约 16% 处，下方留给产品主体） */
const POSTER_POSITION = { x: 50, y: 16 }

/** 构建首页种子页：首屏、场景、重点产品、天梯榜、评测、品牌、服务、合作与新闻区块 */
function buildHome(): Page {
  return toPage('home', '/', '首页', '首页装修：首屏、场景、重点产品、天梯榜、评测、品牌、服务、合作与新闻。', [
    {
      type: 'carousel',
      props: {
        slides: home.HERO_SLIDES.map((slide) => {
          const detail = slide.primaryTo ?? '/products'
          return {
            eyebrow: slide.eyebrow,
            // 大疆官网式首屏：保留一行系列小字（12px 半透明白）
            eyebrowEnabled: true,
            title: slide.title,
            desc: slide.desc,
            mediaTag: slide.mediaTag,
            image: slide.poster ?? `/media/home/${slide.id}.svg`,
            ...(slide.posterMobile ? { imageMobile: slide.posterMobile } : {}),
            ...(slide.mediaContain ? { mediaContain: true } : {}),
            ...(slide.scrim === false ? { scrim: false } : {}),
            ...(slide.theme ? { theme: slide.theme } : {}),
            // 大疆官网式文案：主按钮「立即购买」+ 次按钮「了解更多」
            primary: { label: '立即购买', href: detail },
            secondary: { label: '了解更多', href: slide.secondaryTo ?? detail },
            stats: slide.stats,
            statsEnabled: false,
            contentPosition: slide.position ?? POSTER_POSITION,
          }
        }),
        autoplay: true,
        // 首屏轮播保留左右切换按钮（贴边竖条），底部仍只留圆点
        arrows: true,
        // 首屏为最高一级：满屏高度（100svh，上限 940px）；下方三张海报用 21:9 封顶 660px，形成明确层级
        height: 'full',
        // 代码动画默认关闭：首屏第一张改为固定展示静态主视觉（后台可随时开启）
        motion: false,
      },
      // 首页首屏海报：通栏铺满视口宽度，磨砂顶栏浮于其上
      style: { theme: 'dark', container: 'full' },
    },
    // —— 三张全屏海报（§1.3）：一张海报 = 一个区块（hero），各自独立、上下无缝衔接 ——
    // 与首屏同一套字段 / 口径：默认关眉题与数据点、文案居中偏上、只留一个「立即购买」按钮；
    // 高度档位统一为 21:9 宽幅（h-r219，封顶 660px）——比首屏矮一级，避免视觉反超首屏；
    // 通栏满宽、无圆角、无上下留白，相邻海报之间不留间隙。
    {
      type: 'hero',
      props: {
        eyebrow: 'FLAGSHIP / 26.5" 2K@540Hz',
        eyebrowEnabled: false,
        statsEnabled: false,
        title: ['54027X1QE 标准款'],
        subtitle: '八面出锋 大巧不工',
        media: '/media/home/showcase/poster-1.jpg',
        mediaType: 'image',
        mediaTag: '54027X1QE 主视觉',
        scrim: false,
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
        media: '/media/home/showcase/poster-2.jpg',
        mediaType: 'image',
        mediaTag: '32X1UE 主视觉',
        scrim: false,
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
        media: '/media/home/showcase/poster-3.jpg',
        mediaType: 'image',
        mediaTag: '28027X1QE 主视觉',
        scrim: false,
        ...posterButtons('/products/gh-28027x1qe'),
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
            ],
          },
          {
            productId: 'gh-32x1ue',
            desc: '4K@165 / FHD@330 双模 OLED，一机两用',
            buttons: [
              { label: '进一步了解', href: '/products/gh-32x1ue' },
            ],
          },
          {
            productId: 'gh-28027x1qe',
            desc: '2K@280Hz，1500 nit 峰值亮度的超跑之选',
            buttons: [
              { label: '进一步了解', href: '/products/gh-28027x1qe' },
            ],
          },
          {
            productId: 'gh-27x1ue-qd',
            desc: '26.5 英寸 4K@240Hz QD-OLED，满速 DP 2.1',
            buttons: [
              { label: '进一步了解', href: '/products/gh-27x1ue-qd' },
            ],
          },
        ],
      },
      // 通栏满幅：卡片铺满视口宽度（与上方海报、下方模块无缝相接）
      style: { container: 'full' },
    },
    // —— 资料坞（§1.5）：取下载中心各类型最新一条，行内直接下载 ——
    {
      type: 'downloadDock',
      props: {
        title: '固件与驱动',
        desc: '保持最新版本，获得更好的兼容与调校。以下为该类型当前最新文件。',
        showFirmware: true,
        showDriver: true,
        showSoftware: true,
        moreLabel: '全部资料',
        moreHref: '/downloads',
      },
      style: { background: 'soft' },
    },
    // —— 咨询分流（§1.6）：首页不内嵌表单，先分流再进 /inquiry 预选类型 ——
    {
      type: 'inquiryDock',
      props: {
        title: '还有问题？找对入口，回复更快。',
        desc: '先选问题类型，我们会带着对应模板和负责人接手；复杂问题可在工单里补图、补日志。',
        points: ['工作日 09:00–21:00 在线', '售前 / 售后工单 1 个工作日首次响应', '登录后可在「我的工单」查看进度'],
        quickEnabled: true,
        quickPlaceholder: '用一句话描述你的问题，例如：54027X1QE 更新固件后 HDR 偏暗',
        quickCta: '快速提问',
        quickTip: '提交后可在「我的工单」查看进度；需要填型号与截图时再用完整表单。',
        channels: [
          { label: '售前咨询', desc: '选型、参数、兼容', type: 'pre', action: '立即咨询' },
          { label: '售后报修', desc: '故障、保修、换新', type: 'after', action: '提交工单' },
          { label: '商务合作', desc: '渠道、送测、赛事', type: 'business', action: '合作申请' },
        ],
        primaryLabel: '提交咨询',
        primaryHref: '/inquiry',
        secondaryLabel: '常见问题',
        secondaryHref: '/faq',
        links: ['我的工单|/me/inquiries', '保修与设备|/me/devices', '服务时间说明|/support'],
      },
    },
    // —— 信任条（§1.7）：页脚上面的最后一块 ——
    {
      type: 'trustBar',
      props: {
        columns: 4,
        items: [
          { icon: 'flask', text: '实测数据', desc: '小雪人评测实验室 · 方法与样本公开' },
          { icon: 'shield', text: '三年质保', desc: '含 OLED 烧屏保护，全国联保' },
          { icon: 'check', text: '官方直营', desc: '官网 · 京东 · 抖音旗舰店' },
          { icon: 'box', text: '顺丰包邮', desc: '全国配送，整机包邮' },
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

/**
 * 探索光魂（初期品牌版，6 屏）：
 * 主张 → 我们是谁 → 怎么做事 → 在售产品线 → 怎么测 + 关键事实 → 历程 → 引导。
 * 已按「只写能验证的事」删除实验室、赛事合作、媒体报道 / 荣誉、文化三卡、招聘与合规区块；
 * 后续有真实素材时，后台新开对应区块（cards / stats）即可，无需改代码。
 */
function buildAbout(): Page {
  return toPage('about', '/about', '探索光魂', '探索光魂：品牌主张、在售产品线、公开的测试方法与服务承诺。', [
    // ① 首屏主张：与首页海报同一套渲染规格（r219、文案居中偏上、单主按钮 + 次按钮）
    {
      type: 'hero',
      props: {
        eyebrow: 'GUANGHUN / 探索光魂',
        eyebrowEnabled: true,
        statsEnabled: false,
        // 单行整句（桌面端不折行）：方案稿是一句话，断两行会让第二行孤立
        title: '把每一块屏的参数，测给你看',
        subtitle: '不写形容词，只给可复现的测试记录与版本号。',
        media: '/media/home/showcase/poster-1.jpg',
        mediaType: 'image',
        mediaTag: '探索光魂 主视觉',
        scrim: false,
        primary: { label: '查看全系产品', href: '/products' },
        secondary: { label: '看天梯榜', href: '/ladder' },
        // 文案上移到 14%：单行标题更矮，按钮要离开产品图主体
        contentPosition: { x: 50, y: 14 },
        height: 'r219',
        theme: 'dark',
      },
      // anchor 供本页专用样式（放大主标题）与深链定位
      style: { container: 'full', anchor: 'about-hero' },
    },
    // ② 我们是谁：一段起点 + 三条「已经做到的事」，全部是现在能验证的
    {
      type: 'imageText',
      props: {
        // 用深色场景图而不是白底产品图：16:9 裁切后不会出现整块白底
        image: '/media/home/showcase/poster-2.jpg',
        title: '我们是谁',
        body: [
          '光魂是一个还在早期的电竞显示器品牌。产品线不多，所以每一款的参数都自己测一遍再写。',
          '参数按实测记录写，没有数据的项标注「暂无」，不填 0',
          '测试方法、条件与版本随结果一起公开，方法升级后旧数据保留原版本',
          '说明书、固件、驱动与调校文件在下载中心直接取，不用先找客服',
        ].join('\n'),
        // 左文右图，与方案一致
        side: 'right',
      },
      // 首屏之后留一档完整留白，避免图文块贴着海报
      style: { paddingY: 'md', anchor: 'about-who' },
    },
    // ③ 我们怎么做事：三条具体做法，不写价值观口号
    {
      type: 'cards',
      props: {
        title: '我们怎么做事',
        subtitle: '三条能落到日常的做法，而不是三句口号。',
        icon: 'chip',
        columns: 3,
        items: [
          { title: '参数按实测写', desc: '亮度、色域、响应时间以实测记录为准；没有测过的项写「暂无」。' },
          { title: '方法与版本公开', desc: '同一套测试脚本跑全部型号，条件与版本号随结果一起公开。' },
          { title: '资料公开可取', desc: '说明书、固件、驱动与校色文件在下载中心直接下载，无需注册。' },
        ],
      },
      style: { paddingY: 'sm', background: 'soft' },
    },
    // ④ 在售产品线：四类均为产品库真实分类，点击进产品列表对应筛选
    {
      type: 'cards',
      props: {
        title: '在售产品线',
        subtitle: '按类别查看该系列的全部型号与实测参数。',
        icon: 'monitor',
        columns: 4,
        items: [
          // 数量取自产品库实况（/api/products）：OLED 旗舰 7 款、双模高刷 2 款；
          // IPS 与周边当前无上架型号，标注「暂未上架」且不给死链。
          { tag: '在售 7 款', title: 'OLED 旗舰', desc: '2K / 4K 高刷 OLED，540Hz、500Hz 与 240Hz 多档。', href: `/products?category=${encodeURIComponent('OLED旗舰')}` },
          { tag: '在售 2 款', title: '双模高刷', desc: '4K 高画质与 FHD 高刷在同一台机器上切换。', href: `/products?category=${encodeURIComponent('双模高刷')}` },
          { tag: '暂未上架', title: '电竞 IPS', desc: '高刷 IPS，适合长时间使用与多场景；当前无上架型号。' },
          { tag: '暂未上架', title: '周边', desc: '支架、线材与配套附件；随整机方案一起上架。' },
        ],
      },
      style: { paddingY: 'sm', anchor: 'about-lines' },
    },
    // ⑤ 怎么测：数据源区块，读后台「测评方法」集合（仅已发布），版本号随方法展示
    {
      type: 'methodList',
      props: {
        title: '怎么测',
        subtitle: '收样登记 → 仪器实测 → 方法复核，每一步都留记录；方法升级后旧版本数据不覆盖。',
        limit: 3,
      },
      style: { paddingY: 'sm', background: 'soft' },
    },
    // ⑥ 关键事实：只放能对得上的数字，每条补口径
    {
      type: 'stats',
      props: {
        title: '关键事实',
        items: [
          { value: '2', label: '在售产品线', note: 'OLED 旗舰 7 款 / 双模高刷 2 款' },
          { value: '9', label: '在售型号', note: '以产品库当前上架型号计' },
          { value: 'v2', label: '天梯榜测试方法', note: '方法升级后旧数据保留原版本' },
          { value: '3', unit: '年', label: '整机质保', note: '含 OLED 烧屏保护' },
        ],
        footnote: '数字口径以产品库与站点配置为准，更新日期见各条目说明。',
      },
      style: { paddingY: 'sm' },
    },
    // ⑦ 发展历程：只留四个节点，描述写「做了什么」
    {
      type: 'timeline',
      props: {
        title: '发展历程',
        // 横向流程：年份 + 做了什么 + 一句影响，比「表格行」更像一条历程
        layout: 'flow',
        items: about.TIMELINE.map((item) => ({ time: item.year, title: item.title, desc: item.desc ?? item.tag })),
      },
      style: { paddingY: 'sm', background: 'soft' },
    },
    // ⑧ 页尾引导：三个真实入口，不放表单
    {
      type: 'contact',
      props: {
        title: '接下来，从哪里开始？',
        desc: '看产品、查资料、谈合作，三条路都有人接。',
        channel: 'inquiry',
        showForm: false,
      },
      style: { paddingY: 'sm' },
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
        mediaTag: 'Center 软件',
        image: '/media/center/hero-space.jpg',
        contentPosition: POSTER_POSITION,
        // 底部悬浮下载条：从下载中心勾选 Windows 安装包（版本与大小自动取真实值）
        downloadIds: ['center-win'],
      },
      // hero 海报同样通栏，与首页 carousel 保持一致
      style: { theme: 'dark', container: 'full' },
    },
    {
      // 核心能力：能力网格布局（编号 + 图标块 + 标题 + 说明）；item.id 同时作为锚点（/center#manage 等）
      type: 'cards',
      props: {
        title: '核心能力',
        subtitle: '显示调校、电竞增强、设备与固件，三类能力集中在一个窗口里。',
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
      // 支持的设备：机型（等宽换行）+ 支持状态标签；锚点 #devices
      id: 'center-devices',
      type: 'cards',
      props: {
        title: '支持的设备',
        subtitle: '连接后自动识别型号，并按面板能力展示对应的调校项。',
        layout: 'grid',
        columns: 2,
        items: center.DEVICE_SUPPORT.map((device) => ({
          tag: device.statusText,
          title: device.title,
          desc: device.models,
        })),
      },
      style: { anchor: 'devices' },
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
      // 下载与安装：三步编号流程（数据源 center.INSTALL_STEPS）；锚点 #install
      id: 'center-install',
      type: 'cards',
      props: {
        title: '下载与安装',
        subtitle: '下载 Windows 安装包后，三步完成初始配置。',
        layout: 'steps',
        items: center.INSTALL_STEPS.map((step) => ({ title: step, desc: '' })),
      },
      style: { anchor: 'install' },
    },
    {
      // 运行要求：等分横排（系统 / 最低 / 推荐）；锚点 #requirements
      id: 'center-req',
      type: 'cards',
      props: {
        title: '运行要求',
        layout: 'trust',
        items: [
          { tag: '系统', title: 'Windows 10 / 11', desc: '64 位，暂不提供 macOS 版本' },
          ...center.REQUIREMENTS.map((req) => ({ tag: '配置', title: req.k, desc: req.v })),
        ],
      },
      style: { anchor: 'requirements' },
    },
    {
      id: 'center-b5',
      type: 'timeline',
      props: { title: '更新日志', items: center.CHANGELOG.map((item) => ({ time: item.version, title: item.title, desc: item.date })) },
      // 锚点 #changelog：供站内 / 站外深链直达本区块
      style: { anchor: 'changelog' },
    },
    { id: 'center-b6', type: 'faqList', props: { title: '常见问题', source: 'center', limit: 10 } },
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
  return toPage('business-venues', '/business/venues', '产品体验点', '全国合作体验点：地图、城市与机型筛选。', [
    {
      type: 'venueExplorer',
      style: { container: 'full', paddingY: 'sm' },
      props: {
        eyebrow: 'PRODUCT EXPERIENCE',
        title: '产品体验点',
        subtitle: '先摸到那台机器，再决定。全国合作门店提供光魂与极创全系显示器实机体验。',
        limit: 0,
        showMap: true,
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
    {
      type: 'contactChannels',
      props: {
        eyebrow: 'CONTACT · 联系我们',
        title: '与你，直接对话。',
        subtitle: '小雪人数码官方网站 · 集显示器资讯、评测、资源、技术解析于一体。',
        items: [
          { label: '官方网站', value: 'www.xxrsm.com', href: 'https://www.xxrsm.com', copy: false },
          { label: '福利号微信', value: 'xxrsm004 / xxrsm001', copy: true },
          { label: 'QQ 交流群', value: '770256041', copy: true },
          { label: 'B站 / 抖音', value: '小雪人兄弟', copy: false },
          { label: '抖音', value: '小雪人评测', copy: false },
        ],
      },
    },
  ])
}

/** 服务支持首页：快速入口 → 下载 → 保修 → 网点 → 联系 → FAQ → 引导 */
function buildSupport(): Page {
  return toPage('support', '/support', '服务与支持首页', '服务与支持首页装修。', [
    // 页头：标题 + 搜索 + 热门词 + 登录引导，全部由后台装修器维护
    {
      type: 'supportHero',
      props: {
        title: '服务与支持',
        desc: '从固件下载到保修寄修，选好你的设备，快速找到对应资料与服务入口。',
        showSearch: true,
        searchPlaceholder: '搜索型号、资料或问题关键词',
        hotKeywords: ['固件更新', 'HDR', '烧屏', '保修'],
        loginLabel: '登录查看我的设备、保修剩余与工单进度',
        loginHref: '/me/devices',
      },
      style: { container: 'full' },
    },
    // 设备选择：读取 models 集合，选中后写 ?model=，下方下载自动跟随
    {
      type: 'supportDevicePicker',
      props: {
        title: '先选择你的设备',
        desc: '选择型号后，下方资料与下载会自动跟随。',
        limit: 4,
        allLabel: '全部型号',
        allHref: '/support/models',
      },
      style: { background: 'soft', paddingY: 'md', anchor: 'devices' },
    },
    // 四张任务卡：只保留真实可用入口，去掉重复的 6 卡墙
    {
      type: 'cards',
      props: {
        title: '按任务找入口',
        icon: 'grid',
        layout: 'capability',
        columns: 4,
        items: [
          { icon: 'download', title: '下载与固件', desc: '固件、说明书、升级与调校工具，按型号归档。', href: '/downloads' },
          { icon: 'shield', title: '保修与报修', desc: '查看保修政策、登记设备，在线提交寄修申请。', href: '/support#warranty' },
          { icon: 'book', title: '常见问题', desc: '安装、连接、HDR 与售后的高频问题，按分类浏览。', href: '/faq' },
          { icon: 'help', title: '联系人工', desc: '工作日 09:00–21:00 在线，复杂问题可提交工单。', href: '/inquiry' },
        ],
      },
    },
    // 下载：跟随设备选择；未选设备时展示最新资料
    {
      type: 'downloadList',
      props: {
        title: '当前设备资料',
        icon: 'download',
        subtitle: '说明书、固件与调校工具，选择设备后自动按型号收敛。',
        category: 'all',
        limit: 4,
        showFilter: false,
        followDevice: true,
        ctaLabel: '查看全部资料',
        ctaHref: '/downloads',
      },
      style: { anchor: 'download' },
    },
    // 保修与售后：锚点 #warranty，供任务卡深链直达
    { type: 'cards', props: { title: '保修与售后', icon: 'shield', columns: 2, items: support.WARRANTY_POINTS.map((point) => ({ title: point })) }, style: { anchor: 'warranty' } },
    // 服务承诺条（默认停用）
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
    // 体验点已移出服务支持页：属于售前决策内容，统一由 /business/venues 承载
    // FAQ：分类筛选 + 搜索，只展示 6 条高频；完整列表在 /faq
    { type: 'faqList', props: { title: '常见问题', source: 'support', limit: 6, showFilter: true, ctaLabel: '查看全部', ctaHref: '/faq' }, style: { anchor: 'faq' } },
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
    // 全部产品（带筛选/排序）：极简卡（型号 / 名称 / 参数 / 状态），底部按系列入口
    // 顶部海报不再内置空模块——需要时在后台装修器添加「全屏海报」并上传图片即可
    {
      type: 'productGrid',
      props: {
        title: '全部产品',
        subtitle: '按类别、连接方式与价格筛选在售产品。',
        scope: 'all',
        limit: 24,
        columns: 3,
        cardTone: 'light',
        showFilter: true,
        showSpecs: true,
        showStatus: true,
        showModel: true,
        showFlag: true,
        showPrice: false,
        showCta: false,
        showSeriesNav: true,
      },
    },
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
          // §4.22 3-2：主 CTA「去淘宝购买」取当前产品的购买链接(buyUrl)；次 CTA「加入对比」→ /compare?ids=<当前产品>
          primaryLabel: '去淘宝购买',
          primaryHref: '',
          secondaryLabel: '加入对比',
          secondaryHref: '',
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
          cardTone: 'light',
        },
      },
    ]),
    toPage('template-series', '/products/series/:slug', '产品系列模板', '产品系列装修区。', [
      { type: 'text', props: { title: '产品系列', body: '按系列浏览产品。', align: 'left' } },
      // §4.20 / T5.17：系列页自带产品网格，模板里不再重复放 productGrid（同一批产品不出现两次）
    ]),
    toPage('template-compare', '/compare', '产品对比模板', '产品对比装修区。', [
      { type: 'text', props: { title: '产品对比', body: '选择最多 4 款同品类产品进行参数对比。', align: 'left' } },
      { type: 'productGrid', props: { title: '可选产品', source: 'all', limit: 8, columns: 4, cardTone: 'light' } },
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
          cardTone: 'light',
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