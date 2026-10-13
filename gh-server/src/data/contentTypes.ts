/**
 * 内容库类型定义（对齐《光魂官网 · 内容库与装修契约 v1》§3 / §6.3）。
 * 字段名即契约，不得自创或改名。
 */

/**
 * 区块类型（契约 §3 的 16 类 + 自定义模块 3 类 + 扩展 `showcase`）。
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
  kind: 'text' | 'textarea' | 'number' | 'switch' | 'select' | 'list' | 'image' | 'link' | 'code' | 'rich' | 'ref'
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

/** 站点链接（导航 / 页脚复用；契约 §6.1 的 { nav, footer }） */
export type SiteLink = { label: string; href: string }

/** 页脚分组 */
export type SiteFooterGroup = { title: string; links: SiteLink[] }

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
  /**
   * 英文变体覆盖（扩展字段；缺省 = 无英文，前台切英文时回退到中文 nav/footer）。
   * 仅覆盖 nav / footer 的文案；enabledBlocks / theme 等仍取主配置。
   */
  en?: { nav: SiteLink[]; footer: SiteFooterGroup[] }
}