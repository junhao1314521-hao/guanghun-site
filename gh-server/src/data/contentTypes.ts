/**
 * 内容库类型定义（对齐《光魂官网 · 内容库与装修契约 v1》§3 / §6.3）。
 * 字段名即契约，不得自创或改名。
 */

/**
 * 区块类型（共 32 类：契约 §3 的 16 类基础 + 自定义模块 3 类 + `showcase` +
 * 产品详情主体 3 类 + 商业合作 2 类 + 测评方法 1 类 + B2B 采购价值 1 类 + 邮件订阅 1 类 +
 * 产品矩阵 1 类 + 产品详情图文 1 类 + 品牌资料 1 类 + 信任条 1 类）。
 *
 * `richText` / `html` / `embed` 为「自定义模块（自由内容区块）」三类：
 * - richText：受控富文本（渲染时白名单净化）；
 * - html：更完整的静态 HTML（渲染时白名单净化，更宽标签集）；
 * - embed：代码嵌入（沙箱 iframe，允许脚本但与主站隔离）。
 */
export type BlockType =
  | 'hero' | 'carousel' | 'video' | 'text' | 'imageText' | 'imageGrid'
  | 'stats' | 'cards' | 'timeline'
  | 'productGrid' | 'articleList' | 'ranking' | 'downloadList' | 'faqList'
  | 'contact' | 'layout'
  | 'richText' | 'html' | 'embed'
  // 通栏产品展示（首页「重点产品」分段式；新增类型，扩展 §4）
  | 'showcase'
  // 产品详情主体区块（详情页「主体区块化」：读取当前产品数据，模板级配置统一生效）
  | 'productHero' | 'productSpecs' | 'productBuy'
  // 商业合作数据源区块（集合 biz-cases / biz-venues，支持全部 / 手动挑选）
  | 'caseList' | 'venueList'
  // 测评方法数据源区块（集合 methods）
  | 'methodList'
  // B2B 采购价值 + 商务联系区块（可后台编辑 / 可关闭；扩展 §4）
  | 'b2bValue'
  // 邮件订阅（首页 / 页脚；写入 subscribers 集合，扩展 §4）
  | 'subscribe'
  // 产品矩阵（§1.4 新建：图片铺满卡面 + 半透明面板悬浮右下；关联产品 / 手填两种数据源）
  | 'productMatrix'
  // 产品详情 · 详情图文（渲染当前产品的 detailHtml；模板级配置，作用于所有产品）
  | 'productDetailRich'
  // 品牌资料（B 端，独立集合 brand-assets；与下载中心数据分开）
  | 'brandAssetList'
  // 信任条（§1.7 新建：分隔线横排，四项均分、项间竖线、上下细线收边、无卡片底）
  | 'trustBar'

/** 区块样式（契约 §3） */
export type BlockStyle = {
  /** 区块底色 */
  background?: 'none' | 'soft' | 'solid' | 'gradient'
  /** 上下留白 */
  paddingY?: 'sm' | 'md' | 'lg'
  /** 对齐 */
  align?: 'left' | 'center'
  /** 强制明暗 */
  theme?: 'auto' | 'light' | 'dark'
  /** 内容宽度；'full' 表示通栏 / 全宽（破出内容容器，铺满视口宽度） */
  container?: 'wide' | 'normal' | 'narrow' | 'full'
  /**
   * 页内锚点 id（扩展字段）：渲染为区块外壳的 `id`，使 `/support#warranty` 这类
   * 深链可直接定位到该区块。缺省不生成锚点。仅允许字母、数字、连字符与下划线。
   */
  anchor?: string
}

/** 区块（契约 §3） */
export type Block = {
  /** 稳定唯一 id（前端/后端一致） */
  id: string
  type: BlockType
  /** 停用则不渲染（前台与预览都跳过） */
  enabled: boolean
  /** 按 §4 类型字段 */
  props: Record<string, unknown>
  style?: BlockStyle
}

/** 页面（契约 §3） */
export type Page = {
  /** 页面 key（§2） */
  key: string
  /** 前台路由（模板页可含 :param） */
  path: string
  /** 后台显示名 */
  title: string
  description?: string
  /** 有序 */
  blocks: Block[]
  /** ISO */
  updatedAt: string
  /**
   * 页面启用状态（扩展字段；缺省 / true = 上线，false = 已下线）。
   * 下线后前台该路由给出「已下线」空态，指向它的导航 / 页脚 / 区块链接被级联过滤。
   */
  enabled?: boolean
}

/** 页面列表项：不含 blocks（契约 §6.1） */
export type PageMeta = {
  key: string
  path: string
  title: string
  description?: string
  /** 区块数量，供列表展示 */
  blockCount: number
  updatedAt: string
  /** 页面启用状态（扩展字段；缺省 / true = 上线，false = 已下线） */
  enabled?: boolean
}

/** 区块字段元信息（契约 §6.3） */
export type BlockFieldMeta = {
  name: string
  label: string
  /** `code`＝等宽代码编辑（html/embed）；`rich`＝轻量富文本编辑（richText）；`ref`＝从集合挑选条目（source 指定集合）；
   *  `position`＝海报文案位置（九宫格快捷位 + 拖拽，值为 `{ x, y }` 百分比坐标 0–100） */
  kind: 'text' | 'textarea' | 'number' | 'switch' | 'select' | 'list' | 'image' | 'media' | 'link' | 'code' | 'rich' | 'ref' | 'position'
  options?: { label: string; value: string }[]
  placeholder?: string
  /** `ref` 字段的数据来源集合（当前支持 'products'），值以 ID 列表保存、顺序即展示顺序 */
  source?: string
}

/** 区块类型目录项（契约 §6.3） */
export type BlockTypeMeta = {
  type: BlockType
  name: string
  group: '内容' | '数据' | '结构'
  fields: BlockFieldMeta[]
  /** 数组型字段（items/slides）的条目字段定义 */
  listFields?: BlockFieldMeta[]
  /**
   * 启用状态（扩展字段，向后兼容）：
   * 由站点配置 `enabledBlocks` 派生；缺省 / true 表示启用，false 表示已停用。
   * 停用后装修器「新增区块」选择器不再列出该类型（已存在区块不受影响）。
   */
  enabled?: boolean
}

/** 站点链接（导航 / 页脚复用；契约 §6.1 的 { nav, footer }）
 *  扩展字段：`badge` 为入口右上角角标样式（new / hot），`badgeText` 覆盖角标文案。 */
export type SiteLink = { label: string; href: string; badge?: 'new' | 'hot'; badgeText?: string }

/** 页脚分组 */
export type SiteFooterGroup = { title: string; links: SiteLink[] }

/**
 * 顶栏公告条（扩展字段；后台可配、可定时上下线、可关闭）。
 * - `startAt` / `endAt` 为 ISO 时间串，缺省表示不限；前台仅在生效区间内展示；
 * - `dismissible = true` 时访客可关闭，关闭状态记忆在 localStorage（同一公告不重复打扰）。
 */
export type SiteAnnouncement = {
  enabled: boolean
  text: string
  href?: string
  startAt?: string
  endAt?: string
  dismissible?: boolean
}

/** 顶栏右侧行动按钮（购买 / 预约体验等） */
export type SiteCta = { label: string; href: string }

/** 表单与账号安全开关（图形验证码；第三方登录仅留开关位，暂不开放外部入口） */
export type SiteAuthConfig = {
  /** 咨询 / 合作 / 订阅等表单是否要求图形验证码 */
  captcha: boolean
  /** 第三方登录入口开关（预留；当前不渲染外部入口） */
  thirdParty: boolean
}

/** 保修参数（前台保修说明与个人中心到期提醒共用） */
export type SiteWarrantyConfig = {
  /** 质保年限（默认 3 年，含烧屏保护） */
  years: number
  /** 到期前提醒天数（默认 30 天） */
  remindDays: number
  /** 是否启用 SN 解析出厂日期（暂不开启，留位） */
  snParse: boolean
}

/**
 * 页脚社交（§1.9）：**每个平台一条**——二维码 / 账号 / 链接三项选填。
 * - 有二维码 → 浮层展示「二维码 + 名称」；
 * - 无二维码但有账号 → 浮层展示「账号 + 一句提示」；
 * - 只有链接 → 直接跳转，不弹层。
 */
export type SiteSocialItem = {
  /** 平台名称（如 微信 / 微博 / B 站 / 抖音） */
  label: string
  /** 二维码图片地址（可选） */
  qr?: string
  /** 平台账号（可选，如 guanghun-official） */
  account?: string
  /** 外链地址（可选） */
  href?: string
}

/**
 * 页脚社交配置。新形态为 `items`（每平台一条）；
 * 兼容历史「图标+链接」`links` 与「二维码」`qr` 两条列表的旧数据（读取时归一化，不出错）。
 */
export type SiteSocialConfig = {
  items?: SiteSocialItem[]
  /** 旧形态（兼容）：图标 + 链接列表 */
  links?: SiteLink[]
  /** 旧形态（兼容）：二维码列表 */
  qr?: { label: string; image: string }[]
}

/** 站点配置（契约 §6.1） */
export type SiteConfig = {
  nav: SiteLink[]
  footer: SiteFooterGroup[]
  /**
   * 已启用的区块类型（扩展字段；缺省 / 未提供 = 全部启用）。
   * 停用的类型不会出现在装修器「新增区块」选择器中。
   */
  enabledBlocks?: string[]
  /**
   * 站点级设计令牌覆盖（扩展字段；键 = CSS 变量名，值 = 字符串）。
   * 前台加载站点配置后通过 `document.documentElement.style.setProperty` 注入覆盖，
   * 仅覆盖白名单内的变量（见 `siteTokens.ts`）。
   */
  theme?: Record<string, string>
  /** 顶栏公告条（扩展字段；缺省不展示） */
  announcement?: SiteAnnouncement
  /** 顶栏右侧行动按钮（扩展字段；缺省不展示） */
  topCta?: { primary?: SiteCta; secondary?: SiteCta }
  /** 表单与账号安全开关（扩展字段；缺省视为「开启验证码 / 关闭第三方」） */
  auth?: SiteAuthConfig
  /** 保修参数（扩展字段；缺省 years=3 / remindDays=30 / snParse=false） */
  warranty?: SiteWarrantyConfig
  /** 页脚社交与二维码（扩展字段；缺省用前台本地真源） */
  social?: SiteSocialConfig
  /** 下拉面板推荐卡开关（扩展字段；缺省 false = 前台不渲染推荐卡） */
  navFeatureEnabled?: boolean
  /**
   * 留言轻量分流开关（§1.6 扩展字段；缺省 = 开启）。
   * 开启时表单顶部先选「售前咨询 / 售后报修 / 商务合作」，咨询主题随后联动，提交按类型分派。
   */
  inquiryRouting?: boolean
  /**
   * 站点默认主题（扩展字段；缺省 'auto'）。
   * - 'auto'：跟随访客系统；'light' / 'dark'：新访客（无本地记录）按此渲染；
   * - 访客在顶栏的手动选择（localStorage）始终优先于站点默认。
   */
  defaultTheme?: 'auto' | 'light' | 'dark'
  /**
   * 英文变体覆盖（扩展字段；缺省 = 无英文）。
   * - nav / footer：未配英文时**回退中文**（沿用既有行为，保证导航永远可用）；
   * - announcement / topCta：未配英文时**不展示**——按「不以中文冒充英文」的公测约定，
   *   英文语境下宁可少一条公告 / 少一个 CTA，也不显示中文文案。
   */
  en?: {
    nav: SiteLink[]
    footer: SiteFooterGroup[]
    announcement?: SiteAnnouncement
    topCta?: { primary?: SiteCta; secondary?: SiteCta }
  }
}

/**
 * 页脚社交归一化（§1.9 数据兼容）：
 * - 新形态 `{ items }` 原样收敛为合法 `SiteSocialItem[]`；
 * - 旧形态 `{ links, qr }` 两条列表按平台名称合并为「每平台一条」
 *   （同名二维码并入对应链接条目；缺失图片 / 链接则不写入该可选字段）；
 * - 非法 / 空值一律丢弃，**绝不抛错**，保证已有站点配置不因结构演进而报错。
 */
export function normalizeSocialConfig(raw: unknown): SiteSocialConfig {
  if (!raw || typeof raw !== 'object') return { items: [] }
  const record = raw as Record<string, unknown>
  const readText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
  // —— 新形态：逐条清洗 ——
  if (Array.isArray(record.items)) {
    const items: SiteSocialItem[] = []
    for (const entry of record.items) {
      if (!entry || typeof entry !== 'object') continue
      const e = entry as Record<string, unknown>
      const label = readText(e.label)
      if (!label) continue
      const qr = readText(e.qr)
      const account = readText(e.account)
      const href = readText(e.href)
      items.push({
        label,
        ...(qr ? { qr } : {}),
        ...(account ? { account } : {}),
        ...(href && href !== '#' ? { href } : {}),
      })
    }
    return { items }
  }
  // —— 旧形态：图标+链接 与 二维码 两条列表 → 按名称合并 ——
  const links = Array.isArray(record.links) ? record.links : []
  const qr = Array.isArray(record.qr) ? record.qr : []
  const items: SiteSocialItem[] = []
  const byLabel = new Map<string, SiteSocialItem>()
  const push = (item: SiteSocialItem) => {
    byLabel.set(item.label, item)
    items.push(item)
  }
  for (const link of links) {
    if (!link || typeof link !== 'object') continue
    const l = link as Record<string, unknown>
    const label = readText(l.label)
    if (!label) continue
    const href = readText(l.href)
    push({ label, ...(href && href !== '#' ? { href } : {}) })
  }
  for (const entry of qr) {
    if (!entry || typeof entry !== 'object') continue
    const q = entry as Record<string, unknown>
    const label = readText(q.label)
    const image = readText(q.image)
    if (!label) continue
    const existing = byLabel.get(label)
    if (existing) {
      if (image) existing.qr = image
    } else {
      push({ label, ...(image ? { qr: image } : {}) })
    }
  }
  return { items }
}