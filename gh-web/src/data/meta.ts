/**
 * 站点 SEO 单一真源：路由级标题 / 描述 / 可收录性 / 规范链接 / 结构化数据。
 *
 * - 运行时由 `usePageMeta` 注入 <title>、meta、canonical、OG；
 * - 收录口径与 `public/robots.txt`、`public/sitemap.xml` 保持一致（有测试守护）；
 * - `SITE_URL` 为占位域名，上线前替换为正式域名（同时替换 robots / sitemap）。
 */

/** 站点根地址（占位；浏览器运行时优先使用当前访问域名，避免 IP / 正式域名下 canonical 指向占位域） */
export const SITE_URL = 'https://www.guanghun.example'

/** 当前运行时站点源：浏览器用 location.origin，构建/测试环境回退 SITE_URL */
export function siteOrigin(): string {
  // 单测在 jsdom 下运行，location.origin 是 localhost；保持测试与 sitemap 真源一致。
  if (import.meta.env?.MODE === 'test') return SITE_URL
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return SITE_URL
}

/** 品牌名（用于标题后缀与结构化数据） */
export const BRAND = '光魂'

export const DEFAULT_TITLE = '光魂 · OLED 电竞显示器官网'
export const DEFAULT_DESCRIPTION = '以实测数据定义电竞装备性能。参数公开、方法公开、来源可查。'

/**
 * 默认分享图（Open Graph / Twitter 卡片）。
 *
 * `public/og-cover.jpg` 由品牌海报裁切为 1200×630，随代码一起部署；
 * 详情页会用各自的真实主图覆盖它（见 `useDetailSeo`）。
 */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-cover.jpg`

/** 运行时默认分享图：跟随当前访问域名，避免分享卡片指向占位域 */
export function defaultOgImage(): string {
  return `${siteOrigin()}/og-cover.jpg`
}

/**
 * 解析页面的分享图地址：仅接受可公开抓取的 http(s) 绝对地址；
 * 内联 data URI、相对路径、空值一律回退到 `DEFAULT_OG_IMAGE`（不臆造外链）。
 */
export function ogImageUrl(src?: string): string {
  if (src && /^https?:\/\//.test(src)) return src
  if (src && src.startsWith('/')) return `${siteOrigin()}${src}`
  return defaultOgImage()
}

export type PageMeta = {
  /** 路由路径（静态路由为精确值） */
  path: string
  /** 完整文档标题（已含品牌，不再拼接） */
  title: string
  description: string
  /** 是否允许搜索引擎收录（与 robots.txt 口径一致） */
  indexable: boolean
  /** sitemap 用；不收录的页面不提供 */
  changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  priority?: number
}

/** 静态路由的 SEO 元信息（顺序即 sitemap 顺序） */
export const PAGE_META: PageMeta[] = [
  { path: '/', title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, indexable: true, changefreq: 'weekly', priority: 1.0 },
  {
    path: '/products',
    title: '全部产品 · 光魂',
    description: '光魂 OLED 电竞显示器，覆盖 540Hz 旗舰到主流电竞 IPS，可按品类、接口与价格筛选。',
    indexable: true,
    changefreq: 'weekly',
    priority: 0.9,
  },
  {
    path: '/articles',
    title: '文章与评测 · 光魂',
    description: '产品评测、使用教程与行业观察；测试方法与数据来源公开。',
    indexable: true,
    changefreq: 'weekly',
    priority: 0.7,
  },
  {
    path: '/news',
    title: '新闻与动态 · 光魂',
    description: '产品发布、品牌动态与活动公告。',
    indexable: true,
    changefreq: 'weekly',
    priority: 0.6,
  },
  {
    path: '/ladder',
    title: '天梯榜 · 光魂',
    description: '以实测数据排序的电竞装备天梯榜，测试方法与数据来源公开。',
    indexable: true,
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    path: '/center',
    title: '光魂 Center · 设备管理软件',
    description: '一套软件管理全部光魂设备：按键与宏、性能参数调节、灯效场景、固件更新与配置云同步。',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    path: '/support',
    title: '服务与支持 · 光魂',
    description: '保修政策与要点、服务网点、常见问题与驱动 / 固件下载。',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.7,
  },
  {
    path: '/downloads',
    title: '下载中心 · 光魂',
    description: '驱动、固件、说明书与工具下载，按类别、类型与型号筛选。',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    path: '/faq',
    title: '常见问题 · 光魂',
    description: '安装、使用、保修与售后高频问题的解答。',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    path: '/contact',
    title: '联系我们 · 光魂',
    description: '客服热线、商务邮箱、办事处地址与服务时间。',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    path: '/business',
    title: '商业合作 · 光魂',
    description: '媒体送测、渠道分销与品牌联名等合作方式及联系方式。',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.7,
  },
  {
    path: '/business/scenes',
    title: '场景与方案 · 光魂',
    description: '面向电竞、创作、办公与差旅的场景化装备方案。',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    path: '/business/cases',
    title: '合作案例 · 光魂',
    description: '赛事、高校与品牌联名等合作案例。',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    path: '/business/venues',
    title: '产品体验点 · 光魂',
    description: '全国合作体验点地图：按城市、省份与机型查找光魂 / 极创显示器实机体验。',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    path: '/about',
    title: '探索光魂 · 品牌与测试方法',
    description: '品牌主张、在售产品线、公开的测试方法与服务承诺。',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.6,
  },
  { path: '/legal/privacy', title: '隐私政策 · 光魂', description: '光魂官网隐私政策。', indexable: true, changefreq: 'yearly', priority: 0.3 },
  { path: '/legal/terms', title: '服务条款 · 光魂', description: '光魂官网服务条款。', indexable: true, changefreq: 'yearly', priority: 0.3 },
  { path: '/legal/cookies', title: 'Cookie 声明 · 光魂', description: '光魂官网 Cookie 使用声明。', indexable: true, changefreq: 'yearly', priority: 0.3 },
  { path: '/legal/records', title: '备案信息 · 光魂', description: '网站备案与主体信息。', indexable: true, changefreq: 'yearly', priority: 0.3 },

  // —— 不收录（会话 / 查询 / 表单 / 错误类，或内容未建设）——
  { path: '/search', title: '搜索 · 光魂', description: '全站搜索结果。', indexable: false },
  { path: '/compare', title: '产品对比 · 光魂', description: '多款产品的参数对比。', indexable: false },
  { path: '/inquiry', title: '提交咨询 · 光魂', description: '在线提交咨询与售后工单。', indexable: false },
  { path: '/login', title: '登录 · 光魂', description: '登录光魂账号。', indexable: false },
  { path: '/register', title: '注册 · 光魂', description: '注册光魂账号。', indexable: false },
  { path: '/forgot', title: '找回密码 · 光魂', description: '找回光魂账号密码。', indexable: false },
  { path: '/me', title: '个人中心 · 光魂', description: '工单、设备、收藏与订阅通知。', indexable: false },
  { path: '/403', title: '无权限 · 光魂', description: '无权限访问该页面。', indexable: false },
  { path: '/500', title: '服务异常 · 光魂', description: '服务暂时不可用。', indexable: false },
]

/** 允许收录的静态路径（sitemap 由此生成 / 校验） */
export const INDEXABLE_PATHS = PAGE_META.filter((m) => m.indexable).map((m) => m.path)

/** 规范链接：去掉尾部斜杠（根路径除外），避免同一页面多 URL */
export function canonicalUrl(pathname: string): string {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/'
  return new URL(clean, siteOrigin()).toString()
}

/** 语言在 URL 上的查询键（英文以 `?lang=en` 表示；中文为默认、不带参数） */
export const LANG_QUERY_KEY = 'lang'

/** 英文变体 URL：在规范链接上追加 `?lang=en`（供 hreflang / canonical 使用） */
export function englishUrl(pathname: string): string {
  const url = new URL(canonicalUrl(pathname))
  url.searchParams.set(LANG_QUERY_KEY, 'en')
  return url.toString()
}

/**
 * 语言相关的 SEO 链接（单一真源）：
 * - canonical 自引用（英文页指向英文 URL，避免被判定为中文页的重复内容）；
 * - alternates 覆盖 zh-CN / en / x-default，供 `hreflang` 输出。
 */
export function hreflangLinks(
  pathname: string,
  lang: string,
): { canonical: string; alternates: Array<{ hreflang: string; href: string }> } {
  const zh = canonicalUrl(pathname)
  const en = englishUrl(pathname)
  return {
    canonical: lang === 'en' ? en : zh,
    alternates: [
      { hreflang: 'zh-CN', href: zh },
      { hreflang: 'en', href: en },
      { hreflang: 'x-default', href: zh },
    ],
  }
}

/** 按当前路径取 SEO 元信息；动态路由与未知路径给出相应口径 */
export function pageMetaFor(pathname: string): PageMeta {
  const exact = PAGE_META.find((m) => m.path === pathname)
  if (exact) return exact

  if (/^\/products\/series\/[^/]+$/.test(pathname)) {
    return { path: pathname, title: '产品系列 · 光魂', description: '按系列浏览光魂产品与规格。', indexable: true }
  }
  if (/^\/products\/[^/]+$/.test(pathname)) {
    return { path: pathname, title: '产品详情 · 光魂', description: '光魂产品的标称与实测参数、下载资料与相关信息。', indexable: true }
  }
  if (/^\/articles\/[^/]+$/.test(pathname)) {
    return { path: pathname, title: '文章详情 · 光魂', description: '光魂评测、教程与行业观察。', indexable: true }
  }
  if (/^\/downloads\/[^/]+$/.test(pathname)) {
    return { path: pathname, title: '资源详情 · 光魂', description: '驱动、固件与说明书的版本、校验值与更新日志。', indexable: true }
  }
  if (/^\/faq\/[^/]+$/.test(pathname)) {
    return { path: pathname, title: '问答详情 · 光魂', description: '光魂常见问题解答。', indexable: true }
  }
  if (/^\/business\/cases\/[^/]+$/.test(pathname)) {
    return { path: pathname, title: '合作案例 · 光魂', description: '光魂合作案例的背景、方案与成果。', indexable: true }
  }
  if (/^\/business\/venues\/[^/]+$/.test(pathname)) {
    return { path: pathname, title: '产品体验点详情 · 光魂', description: '门店地址、可体验机型与到店导航。', indexable: true }
  }
  if (/^\/ladder\/[^/]+$/.test(pathname)) {
    return { path: pathname, title: '天梯榜 · 光魂', description: '按单项指标排序的电竞装备实测榜。', indexable: true }
  }
  if (/^\/brand\/[^/]+$/.test(pathname)) {
    return { path: pathname, title: '品牌 · 光魂', description: '光魂品牌理念、里程碑与相关产品。', indexable: true }
  }
  if (/^\/support\/model\/[^/]+$/.test(pathname)) {
    return { path: pathname, title: '型号与兼容 · 光魂', description: '按型号查询驱动、固件、说明书与相关问答。', indexable: true }
  }
  if (/^\/me(\/.*)?$/.test(pathname)) {
    return { path: pathname, title: '个人中心 · 光魂', description: '工单、设备、收藏与订阅通知。', indexable: false }
  }
  // 未知路径（含 404）：不收录；标题与站内 404 文案一致
  return {
    path: pathname,
    title: '页面未找到 · 光魂',
    description: '你访问的页面不存在或已被移动，请从导航重新进入。',
    indexable: false,
  }
}

/** 面包屑（首页 → 各级），用于 BreadcrumbList 结构化数据 */
function breadcrumbItems(pathname: string): Array<{ name: string; url: string }> {
  const items = [{ name: BRAND, url: canonicalUrl('/') }]
  const segments = pathname.split('/').filter(Boolean)
  let acc = ''
  for (const seg of segments) {
    acc += `/${seg}`
    const meta = PAGE_META.find((m) => m.path === acc)
    items.push({ name: meta ? meta.title.replace(` · ${BRAND}`, '') : seg, url: canonicalUrl(acc) })
  }
  return items
}

/**
 * 结构化数据（JSON-LD @graph）。
 * 仅使用站点自有、可公开的字段，不臆造评分 / 库存等未确认信息。
 */
export function buildJsonLd(pathname: string): Record<string, unknown>[] {
  const meta = pageMetaFor(pathname)
  const url = canonicalUrl(pathname)
  const origin = siteOrigin()

  const organization = {
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: BRAND,
    url: origin,
    slogan: DEFAULT_DESCRIPTION,
  }

  const website = {
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    name: BRAND,
    url: origin,
    inLanguage: 'zh-CN',
    publisher: { '@id': `${origin}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${origin}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }

  const webpage = {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: meta.title,
    description: meta.description,
    isPartOf: { '@id': `${origin}/#website` },
  }

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems(pathname).map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return [organization, website, webpage, breadcrumb]
}