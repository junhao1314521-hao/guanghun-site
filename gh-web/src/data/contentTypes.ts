/**
 * 内容库类型定义（前端镜像）。
 *
 * 本文件逐字镜像后端真源 `gh-server/src/data/contentTypes.ts`（对齐
 * 《光魂官网 · 内容库与装修契约 v1》§3 / §6.1 / §6.3）：字段名即契约，
 * 不得自创或改名。前后端共用同一套类型，避免契约漂移。
 *
 * 说明：后端 `BlockTypeMeta` 仅含 type/name/group/fields/listFields；前端
 * 在 `blocks/types.ts` 中追加了可选的展示元信息（label/description/icon），
 * 属附加扩展，不改变既有字段名。
 */

/**
 * 区块类型（共 27 类：契约 §3 的 16 类基础 + 自定义模块 3 类 + `showcase` +
 * 产品详情主体 3 类 + 商业合作 2 类 + 测评方法 1 类 + B2B 采购价值 1 类）。
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
  // 通栏产品展示（首页「重点产品」分段式；扩展 §4 新增类型）
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
}

/** 区块字段元信息（契约 §6.3） */
export type BlockFieldMeta = {
  name: string
  label: string
  /** `code`＝等宽代码编辑（html/embed）；`rich`＝轻量富文本编辑（richText）；`ref`＝从集合挑选条目（source 指定集合） */
  kind: 'text' | 'textarea' | 'number' | 'switch' | 'select' | 'list' | 'image' | 'media' | 'link' | 'code' | 'rich' | 'ref'
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
   * 启用状态（扩展字段，随站点配置 `enabledBlocks` 派生）：
   * 缺省 / true = 启用；false = 已停用（装修器「新增区块」选择器不列出，已存在区块不受影响）。
   */
  enabled?: boolean
}

/** 站点链接（导航 / 页脚复用；契约 §6.1 的 { nav, footer }）
 *  扩展字段：`badge` 为入口右上角角标样式（new / hot），`badgeText` 覆盖角标文案，`badgeShake` 控制是否摇动。 */
export type SiteLink = { label: string; href: string; badge?: 'new' | 'hot'; badgeText?: string; badgeShake?: boolean }

/** 页脚分组 */
export type SiteFooterGroup = { title: string; links: SiteLink[] }

/**
 * 顶栏公告条（扩展字段；后台可配、可定时上下线、可关闭）。
 * - `startAt` / `endAt` 为 ISO 时间串，缺省不限；前台仅在生效区间内展示；
 * - `dismissible = true` 时访客可关闭，关闭状态记忆在 localStorage。
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
export type SiteAuthConfig = { captcha: boolean; thirdParty: boolean }

/** 保修参数（前台保修说明与个人中心到期提醒共用） */
export type SiteWarrantyConfig = { years: number; remindDays: number; snParse: boolean }

/** 页脚社交关注 + 二维码（真实化：链接与二维码图由后台维护） */
export type SiteSocialConfig = { links: SiteLink[]; qr: { label: string; image: string }[] }

/** 站点配置（契约 §6.1） */
export type SiteConfig = {
  nav: SiteLink[]
  footer: SiteFooterGroup[]
  /** 已启用的区块类型（扩展字段；缺省 = 全部启用） */
  enabledBlocks?: string[]
  /** 站点级设计令牌覆盖（扩展字段；键 = CSS 变量名，仅白名单内变量生效） */
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
}