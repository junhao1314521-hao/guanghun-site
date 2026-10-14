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
  // 通栏产品展示（首页「重点产品」分段式；扩展 §4 新增类型）
  | 'showcase'
  // 产品详情主体区块（详情页「主体区块化」：读取当前产品数据，模板级配置统一生效）
  | 'productHero' | 'productSpecs' | 'productBuy'
  // 商业合作数据源区块（集合 biz-cases / biz-venues，支持全部 / 手动挑选）
  | 'caseList' | 'venueList'
  // 测评方法数据源区块（集合 methods）
  | 'methodList'

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
   * 启用状态（扩展字段，随站点配置 `enabledBlocks` 派生）：
   * 缺省 / true = 启用；false = 已停用（装修器「新增区块」选择器不列出，已存在区块不受影响）。
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
  /** 已启用的区块类型（扩展字段；缺省 = 全部启用） */
  enabledBlocks?: string[]
  /** 站点级设计令牌覆盖（扩展字段；键 = CSS 变量名，仅白名单内变量生效） */
  theme?: Record<string, string>
}