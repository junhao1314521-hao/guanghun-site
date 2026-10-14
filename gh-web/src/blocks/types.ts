/**
 * 区块类型定义（对齐《光魂官网 · 内容库与装修契约 v1》§3 / §4 / §6.3）。
 *
 * 通用结构（BlockType / BlockStyle / Block / Page / PageMeta / BlockFieldMeta /
 * BlockTypeMeta / SiteConfig）来自前端镜像真源 `src/data/blockTypes.ts`，此处
 * 原样再导出，确保区块组件与接口层共用同一份类型定义；
 * 「§4 props」区补充 16 类区块各自的 props 类型，供区块组件消费（字段名即契约）。
 */
import type { Block } from '../data/blockTypes'

export type {
  Block,
  BlockFieldMeta,
  BlockStyle,
  BlockType,
  BlockTypeMeta,
  Page,
  PageMeta,
  SiteConfig,
  SiteFooterGroup,
  SiteLink,
} from '../data/blockTypes'

/* ============================================================
   §4 props —— 16 类区块字段（字段名即契约）
   ============================================================ */

/** 链接字段（primary / secondary / cta） */
export type BlockLink = { label: string; href: string }

/** 数值 + 说明（stats 条目 / hero 数据） */
export type StatItem = { value: string; label: string; unit?: string; note?: string }

/** 轮播 / 首屏幻灯片条目（hero 与 carousel 共用字段集） */
export type Slide = {
  eyebrow: string
  title: string[]
  desc: string
  mediaTag: string
  image: string
  primary: BlockLink
  secondary?: BlockLink
  stats: StatItem[]
}

/** 1. hero 全宽海报 */
export type HeroProps = {
  eyebrow: string
  title: string[]
  desc: string
  mediaTag: string
  image: string
  primary: BlockLink
  secondary?: BlockLink
  stats: StatItem[]
}

/** 2. carousel 轮播 */
export type CarouselProps = { slides: Slide[]; autoplay: boolean }

/** 3. video 视频 */
export type VideoProps = { title: string; desc: string; url: string; poster: string }

/** 4. text 标题正文 */
export type TextProps = { eyebrow: string; title: string; body: string; align: 'left' | 'center' }

/** 5. imageText 图文 */
export type ImageTextProps = { image: string; title: string; body: string; side: 'left' | 'right'; cta?: BlockLink }

/** 6. imageGrid 图片组 */
export type ImageGridProps = { title: string; columns: 2 | 3 | 4; items: { image: string; caption: string }[] }

/** 7. stats 数字展示 */
export type StatsProps = { title: string; items: StatItem[]; footnote?: string }

/** 8. cards 卡片组（扩展：rail 横向滑动 / overlay 文字浮于媒体 / ratio 媒体宽高比） */
export type CardsProps = {
  title: string
  desc: string
  columns: 2 | 3 | 4
  /** 排布：grid 网格（默认）｜rail 横向滑动 */
  layout?: 'grid' | 'rail'
  /** 文字是否浮在媒体图上（底部渐变遮罩保证可读性） */
  overlay?: boolean
  /** 媒体宽高比，如 '4 / 5'、'16 / 9'；缺省 16 / 9 */
  ratio?: string
  items: {
    image?: string
    /** 媒体地址（图片 / 视频 / GIF）；优先于 image */
    media?: string
    mediaType?: 'image' | 'video' | 'gif'
    tag?: string
    title: string
    desc: string
    href?: string
  }[]
}

/** 9. timeline 时间轴 */
export type TimelineProps = { title: string; items: { time: string; title: string; desc?: string }[] }

/**
 * 数据源区块的可选交互开关：开启后在区块内渲染与原列表页一致的
 * 筛选 / 排序 / 分页控件（不存内容，仅决定「控件是否展示」）。
 * 缺省关闭，故首页 / 模板页复用同一区块时保持精简形态。
 */
export type DataBlockInteraction = {
  /** 是否在区块内启用筛选 / 排序等交互控件 */
  showFilter?: boolean
}

/** 10. productGrid 产品（数据源） */
export type ProductGridProps = DataBlockInteraction & {
  title: string
  source: 'featured' | 'all' | 'series'
  seriesId?: string
  limit: number
  columns: 2 | 3 | 4
}

/** 11. articleList 文章（数据源） */
export type ArticleListProps = DataBlockInteraction & {
  title: string
  source: 'all' | 'review' | 'tech' | 'method' | 'news'
  limit: number
}

/** 12. ranking 榜单（数据源）；metric 与真实数据指标对齐（历史 weight/dpi 回退综合榜） */
export type RankingProps = DataBlockInteraction & {
  title: string
  metric: 'overall' | 'sensor' | 'battery' | 'latency'
  limit: number
  /** 只展示局部榜单（首页 teaser：底部渐变虚化） */
  teaser?: boolean
}

/** 13. downloadList 下载（数据源） */
export type DownloadListProps = DataBlockInteraction & {
  title: string
  category: 'all' | 'mouse' | 'keyboard' | 'headset'
  limit: number
}

/** 14. faqList 问答（数据源） */
export type FaqListProps = DataBlockInteraction & { title: string; source: 'support' | 'center'; limit: number }

/** 15. contact 联系留言 */
export type ContactProps = { title: string; desc: string; channel: 'inquiry' | 'business'; showForm: boolean }

/** 16. layout 布局容器（children 长度 = columns，每列一组区块；只允许一层嵌套） */
export type LayoutProps = { columns: 1 | 2 | 3; gap: 'sm' | 'md' | 'lg'; children: Block[][] }

/* ============================================================
   自定义模块（自由内容区块）3 类 props
   ============================================================ */

/** 17. richText 富文本模块（受控富文本；渲染时白名单净化） */
export type RichTextProps = { html: string }

/** 18. html 模块（更完整的静态 HTML；渲染时白名单净化，更宽标签集） */
export type HtmlProps = { html: string; note?: string }

/** 19. embed 代码嵌入模块（沙箱 iframe；可含脚本，与主站隔离） */
export type EmbedProps = {
  /** 嵌入的 HTML / 脚本（放入 iframe.srcdoc，sandbox 隔离） */
  code: string
  /** iframe 高度（px，默认 360） */
  height: number
  /** 是否放行脚本（sandbox 加 allow-scripts；始终不加 allow-same-origin） */
  allowScripts: boolean
  /** 可选：填写后以原生 <video controls> 渲染（同样在沙箱内） */
  videoUrl?: string
  /** 可选：视频封面 */
  poster?: string
}

/**
 * 20. showcase 通栏产品展示（首页「重点产品」分段式；扩展 §4）。
 * props: items[]（每项占满一屏的一行）+ alternate（图文左右交替）。
 */
export type ShowcaseProps = {
  /** 图文左右交替；true 时奇数项反向（图右文左） */
  alternate?: boolean
  items: {
    /** 关联产品 id（可选，用于回退占位素材） */
    productId?: string
    /** 媒体地址（图片 / 视频 / GIF） */
    media: string
    mediaType?: 'image' | 'video' | 'gif'
    eyebrow?: string
    title: string
    desc?: string
    /** 关键参数（逐项浮现） */
    specs?: string[]
    cta?: BlockLink
  }[]
}

/** 21. productHero 产品详情 · 展示台（读取当前产品；props 为模板级配置，作用于所有产品） */
export type ProductHeroProps = {
  /** 主按钮文案 / 链接（留空则不渲染） */
  primaryLabel?: string
  primaryHref?: string
  /** 次按钮文案 / 链接（留空则不渲染） */
  secondaryLabel?: string
  secondaryHref?: string
  showBadges?: boolean
  showPrice?: boolean
  /** 是否展示「标称 / 实测」参数摘要 */
  showSummary?: boolean
}

/** 22. productDetailSpecs 产品详情 · 参数规格表 */
export type ProductDetailSpecsProps = {
  title?: string
  /** 是否显示详情分区标签（参数 / 实测 / 视频…） */
  showTabs?: boolean
  /** 是否显示底部「下载资料 / 需要帮助」引导卡 */
  showGuides?: boolean
  guideDownloadLabel?: string
  guideContactLabel?: string
}

/** 23. productBuy 产品详情 · 购买 / 咨询收口 */
export type ProductBuyProps = {
  title?: string
  primaryLabel?: string
  primaryHref?: string
  secondaryLabel?: string
  secondaryHref?: string
  /** 保障要点（每行一条；留空使用默认） */
  points?: string[]
}

/** 24. caseList 合作案例（数据源，集合 biz-cases） */
export type CaseListProps = DataBlockInteraction & {
  title: string
  /** 挑选方式：all 全部｜manual 手动挑选（ids 顺序即展示顺序） */
  scope?: 'all' | 'manual'
  ids?: string[]
  layout?: 'grid' | 'rail'
  columns?: 2 | 3 | 4
  limit?: number
  /** 是否显示合作方 / 年份等元信息 */
  showMeta?: boolean
}

/** 25. venueList 体验点 / 网点（数据源：source='biz' 取 biz-venues，source='service' 取 service-info） */
export type VenueListProps = DataBlockInteraction & {
  title: string
  /** 数据来源：商业合作体验点 / 服务网点与体验点 */
  source?: 'biz' | 'service'
  scope?: 'all' | 'manual'
  ids?: string[]
  layout?: 'grid' | 'rail'
  columns?: 2 | 3 | 4
  limit?: number
  /** 是否显示营业状态标签 */
  showStatus?: boolean
}

/** 26. methodList 测评方法（数据源，集合 methods） */
export type MethodListProps = DataBlockInteraction & {
  title: string
  limit?: number
}

/** 类型名 → props 类型映射（区块组件用） */
export type BlockPropsMap = {
  hero: HeroProps
  carousel: CarouselProps
  video: VideoProps
  text: TextProps
  imageText: ImageTextProps
  imageGrid: ImageGridProps
  stats: StatsProps
  cards: CardsProps
  timeline: TimelineProps
  productGrid: ProductGridProps
  articleList: ArticleListProps
  ranking: RankingProps
  downloadList: DownloadListProps
  faqList: FaqListProps
  contact: ContactProps
  layout: LayoutProps
  richText: RichTextProps
  html: HtmlProps
  embed: EmbedProps
  showcase: ShowcaseProps
  productHero: ProductHeroProps
  productSpecs: ProductDetailSpecsProps
  productBuy: ProductBuyProps
  caseList: CaseListProps
  venueList: VenueListProps
  methodList: MethodListProps
}