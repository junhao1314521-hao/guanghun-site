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

/** 轮播 / 首屏幻灯片条目（hero 与 carousel 共用字段集，字段名一致） */
export type PosterPosition = { x: number; y: number }

export type Slide = {
  eyebrow: string
  /** 眉题开关（缺省 = 有内容即显示，兼容历史数据） */
  eyebrowEnabled?: boolean
  title: string[]
  /** 一句话（历史字段 `desc` 仍兼容） */
  subtitle?: string
  desc?: string
  mediaTag?: string
  /** 媒体（图片 / 视频 / GIF）；缺省回退 `image` */
  media?: string
  mediaType?: 'image' | 'video' | 'gif' | 'code'
  image?: string
  imageMobile?: string
  poster?: string
  primary: BlockLink
  secondary?: BlockLink
  stats: StatItem[]
  /** 卖点 / 数据点开关（缺省 = 有内容即显示） */
  statsEnabled?: boolean
  /** 文案位置（九宫格 9 档或拖拽，同一字段，百分比坐标 0–100） */
  contentPosition?: PosterPosition
  /** 高度档位：满屏 / 21:9 宽幅 / 矮一档 / 自定义（首屏轮播固定满屏） */
  height?: 'full' | 'short' | 'custom' | 'r219'
  heightValue?: number
  /** 背景主题：暗色 / 浅色 */
  theme?: 'dark' | 'light'
  /** 文案颜色（后台可配，CSS 颜色字符串）；留空沿用既有皮肤 */
  textColor?: string
  /** 主按钮实底 + 次按钮描边色（后台可配）；留空沿用既有品牌色 */
  accentColor?: string
  /** 「立即购买」按钮样式：plain 常规（默认，无光效）｜sweep 扫光｜pulse 呼吸光 */
  ctaStyle?: 'plain' | 'sweep' | 'pulse'
}

/** 1. hero 全宽海报（与 carousel 单张 slide 共用同一套字段） */
export type HeroProps = {
  eyebrow: string
  eyebrowEnabled?: boolean
  title: string[]
  subtitle?: string
  desc?: string
  mediaTag?: string
  media?: string
  mediaType?: 'image' | 'video' | 'gif' | 'code'
  image?: string
  imageMobile?: string
  poster?: string
  primary: BlockLink
  secondary?: BlockLink
  stats: StatItem[]
  statsEnabled?: boolean
  contentPosition?: PosterPosition
  height?: 'full' | 'short' | 'custom' | 'r219'
  heightValue?: number
  theme?: 'dark' | 'light'
  textColor?: string
  accentColor?: string
  /** 「立即购买」按钮样式：plain 常规（默认，无光效）｜sweep 扫光｜pulse 呼吸光 */
  ctaStyle?: 'plain' | 'sweep' | 'pulse'
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
  /** 自动带最新版本（§1.5 固件驱动）：开启后按 item.downloadType 取下载中心最新一条的版本与日期 */
  autoVersions?: boolean
  /** 条目列表布局的搜索栏：占位文字（留空用「搜索型号」） */
  searchPlaceholder?: string
  /** 条目列表布局的搜索栏：跳转地址（留空用 /search，关键词以 ?q= 追加） */
  searchHref?: string
  items: {
    image?: string
    /** 媒体地址（图片 / 视频 / GIF）；优先于 image */
    media?: string
    mediaType?: 'image' | 'video' | 'gif'
    /** 图标名（条目列表布局；见 BlockIcon 可用名称，如 chip / sliders / refresh） */
    icon?: string
    tag?: string
    title: string
    desc: string
    href?: string
    /** 下载类型（开启 autoVersions 后按此取最新版本）：firmware / driver / software / manual / calibration */
    downloadType?: string
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
  /** 分组方式：none 平铺（默认）｜province 按省份分组（仅 biz） */
  groupBy?: 'none' | 'province'
  /** 是否在卡片上渲染「可体验型号」芯片行（仅 biz） */
  showModels?: boolean
  /** 点击卡片打开统一详情弹窗（仅 biz；默认 false 时跳转详情页） */
  dialog?: boolean
}

/** 26. methodList 测评方法（数据源，集合 methods） */
export type MethodListProps = DataBlockInteraction & {
  title: string
  limit?: number
}

/** 27. b2bValue B2B 采购价值 + 商务联系（可后台编辑 / 可关闭） */
export type B2bValueProps = {
  title?: string
  subtitle?: string
  /** 价值卡片（图标 + 标题 + 两行说明） */
  items?: { icon?: string; title?: string; desc?: string }[]
  /** 商务微信 / 邮箱 / 热线（点击复制；热线可拨号） */
  wechat?: string
  email?: string
  hotline?: string
  /** 是否显示商务联系区（缺省显示） */
  showContact?: boolean
}

/**
 * 27. productMatrix 产品矩阵（§1.4 新建）。
 * 卡面：图片铺满整张卡；型号（大字）+ 一句话（小字）+ 按钮置于图片顶部、水平居中。
 * 数据源：`product` 关联产品（自动带入主图 / 型号 / 详情链接，文案可覆盖）/ `manual` 手填。
 */
export type ProductMatrixProps = {
  title?: string
  source?: 'product' | 'manual'
  columns?: 2 | 3 | 4
  ratio?: '16:9' | '1:1' | '3:4'
  fullscreen?: boolean
  cropFocus?: 'center' | 'top' | 'bottom' | 'left' | 'right'
  mobileLayout?: 'rail' | 'grid'
  /** 文案颜色（后台可配，CSS 颜色字符串）；留空沿用默认 */
  textColor?: string
  /** 主按钮实底 + 次按钮描边色（后台可配）；留空沿用既有品牌色 */
  accentColor?: string
  items?: {
    productId?: string
    image?: string
    imageMobile?: string
    model?: string
    desc?: string
    href?: string
    /** 按钮（可增减；首个实底、其余描边） */
    buttons?: BlockLink[]
  }[]
}

/**
 * 28. productDetailRich 产品详情 · 详情图文。
 * 渲染**当前产品**的 `detailHtml`（长图 / 图文混排，经白名单净化）；无内容时不渲染、不占位。
 * props 为空：内容来自产品集合的 detailHtml，模板级区块仅决定「是否出现」（增删 / 排序 / 停用）。
 */
export type ProductDetailRichProps = Record<string, never>

/**
 * 产品详情 · 四套布局（productDetailLayout）。
 * 同一份产品数据与字段逻辑，仅切换 UI / 交互组织方式：
 * - toc：吸顶目录 + 长内容（推荐）
 * - tabs：横向标签分面板
 * - accordion：折叠分组
 * - long：单页长滚动叙事
 */
export type ProductDetailLayoutProps = {
  /** 默认布局；URL `?layout=` 可临时覆盖，便于对比 */
  layout?: 'toc' | 'tabs' | 'accordion' | 'long'
  /** 是否显示页面顶部的「布局预览」切换器 */
  showSwitcher?: boolean
  /* —— 首屏展示台（与 productHero 字段一致，复用同一组件）—— */
  primaryLabel?: string
  primaryHref?: string
  primaryFromProduct?: boolean
  secondaryLabel?: string
  secondaryHref?: string
  showBadges?: boolean
  showPrice?: boolean
  showSummary?: boolean
  /* —— 底部购买 / 咨询 —— */
  buyTitle?: string
  buySubtitle?: string
  buyPrimaryLabel?: string
  buyPrimaryHref?: string
  buySecondaryLabel?: string
  buySecondaryHref?: string
}

/**
 * 29. brandAssetList 品牌资料（B 端数据源区块）。
 * 读取独立集合 brand-assets（后台「品牌资料」维护），与 C 端下载中心数据分开。
 */
export type BrandAssetListProps = DataBlockInteraction & {
  title: string
  /** 分类筛选：'all' 全部，或 规范 / Logo / 图片 / 送测 … */
  category?: string
  limit?: number
}

/**
 * 30. trustBar 信任条（§1.7 新建）。
 * 分隔线横排：四项均分、项间竖分割线、上下细线收边、无卡片底。
 * 每项配 22px 线性图标（中性色、不发光）：flask 烧瓶 / shield 盾牌 / check 勾选 / box 包裹。
 */
export type TrustBarProps = {
  title?: string
  /** 列数（默认 4） */
  columns?: 2 | 3 | 4
  items?: {
    /** 图标名：flask / shield / check / box */
    icon?: string
    /** 文案 */
    text?: string
    /** 可选链接 */
    href?: string
  }[]
}

/** 31. fullscreenVisual 全屏视觉模块（R3 新建）：纯媒体铺满，无文案层 */
export type FullscreenVisualProps = {
  /** 媒体地址（图片 / GIF / 视频） */
  media?: string
  mediaType?: 'image' | 'gif' | 'video'
  /** 手机竖版图（可选） */
  imageMobile?: string
  /** 高度档位：满屏 / 21:9 / 矮一档 / 自定义 */
  height?: 'full' | 'r219' | 'short' | 'custom'
  /** 自定义高度（px） */
  heightValue?: number
  /** 替代文本（无障碍） */
  alt?: string
}

/** 32. longImage 长图拼接（R6 新建）：切片按顺序垂直无缝拼接 */
export type LongImageProps = {
  items?: {
    /** 桌面切片 */
    image?: string
    /** 移动切片（可选，缺省回退桌面图） */
    imageMobile?: string
    alt?: string
  }[]
  /** 整块点击跳转（可选） */
  href?: string
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
  b2bValue: B2bValueProps
  productMatrix: ProductMatrixProps
  productDetailRich: ProductDetailRichProps
  productDetailLayout: ProductDetailLayoutProps
  brandAssetList: BrandAssetListProps
  trustBar: TrustBarProps
  fullscreenVisual: FullscreenVisualProps
  longImage: LongImageProps
}