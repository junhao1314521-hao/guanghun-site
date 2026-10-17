/**
 * 区块类型目录与工厂（对齐契约 §4 / §6.3）。
 *
 * - `BLOCK_TYPES` 覆盖契约 §4 全部 16 类型 + 自定义模块 3 类 + 新增 `showcase`（通栏产品展示），供后台表单渲染；
 * - `createBlock` 为后台新建区块生成随机稳定 id 的区块对象（seed 使用确定性 id，见 contentSeed.ts）。
 */
import { randomUUID } from 'node:crypto'
import type { Block, BlockFieldMeta, BlockStyle, BlockType, BlockTypeMeta } from './contentTypes'

/** 列数选项（imageGrid / cards / productGrid 共用） */
const COLUMNS: { label: string; value: string }[] = [
  { label: '2 列', value: '2' },
  { label: '3 列', value: '3' },
  { label: '4 列', value: '4' },
]

/** 媒体类型选项（cards / showcase 条目共用）：图片 / 视频 / GIF */
const MEDIA_TYPES: { label: string; value: string }[] = [
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: 'GIF', value: 'gif' },
]

/** 链接字段（primary / secondary / cta）的条目结构，供扩展类型复用 */
export const LINK_FIELDS: BlockFieldMeta[] = [
  { name: 'label', label: '文字', kind: 'text' },
  { name: 'href', label: '链接', kind: 'text' },
]

/** 数值 + 说明（stats 条目 / hero 数据）的条目结构 */
const STAT_FIELDS: BlockFieldMeta[] = [
  { name: 'value', label: '数值', kind: 'text', placeholder: '如：1,200' },
  { name: 'unit', label: '单位', kind: 'text', placeholder: '可选：如 + / % / kHz（跟随数值右上角）' },
  { name: 'label', label: '说明', kind: 'text', placeholder: '如：累计测试记录' },
  { name: 'note', label: '补充说明', kind: 'text', placeholder: '可选：一句话解释这个数字' },
]

/** 海报媒体类型：图片 / 视频 / GIF / 代码动画（§1.2 媒体支持） */
const POSTER_MEDIA_TYPES: { label: string; value: string }[] = [
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: 'GIF', value: 'gif' },
  { label: '代码动画', value: 'code' },
]

/**
 * 海报「立即购买」按钮样式（后台可切换）：
 * - `plain` 常规（默认，无光效，无光晕）；
 * - `sweep` 扫光（悬停时高光扫过一次，触屏 / reduced-motion 不扫）；
 * - `pulse` 呼吸光（光晕缓慢明暗循环）。
 * 字段缺省 / 老数据无此字段 / 值非法时，渲染层一律按 `plain` 兜底。
 */
const POSTER_CTA_STYLES: { label: string; value: string }[] = [
  { label: '常规（默认，无光效）', value: 'plain' },
  { label: '扫光（悬停时高光扫过）', value: 'sweep' },
  { label: '呼吸光（光晕缓慢明暗）', value: 'pulse' },
]

/** 海报高度档位（§1.3）：满屏 / 21:9 宽幅（高度随宽度）/ 比首屏矮一档 / 自定义（首屏轮播固定满屏） */
const POSTER_HEIGHTS: { label: string; value: string }[] = [
  { label: '满屏', value: 'full' },
  { label: '21:9 宽幅', value: 'r219' },
  { label: '矮一档', value: 'short' },
  { label: '自定义高度', value: 'custom' },
]

/** 信任条图标（§1.7）：实验室烧瓶 / 质保盾牌 / 正品勾选 / 物流包裹 */
const TRUST_ICONS: { label: string; value: string }[] = [
  { label: '实验室（烧瓶）', value: 'flask' },
  { label: '质保（盾牌）', value: 'shield' },
  { label: '正品（勾选）', value: 'check' },
  { label: '物流（包裹）', value: 'box' },
]

/** 下载资料类型（§1.5 固件驱动「自动带最新版本」按此取下载中心最新一条） */
const DOWNLOAD_TYPES: { label: string; value: string }[] = [
  { label: '固件', value: 'firmware' },
  { label: '驱动', value: 'driver' },
  { label: '软件', value: 'software' },
  { label: '说明书', value: 'manual' },
  { label: '调校配置', value: 'calibration' },
]

/**
 * 卡片图标（§1.5 固件驱动「icon + 文案」）：值须与前端 `BlockIcon` 的可用名称一致，
 * 否则渲染时回退为不显示图标（缺省不破坏排版）。
 */
const CARD_ICONS: { label: string; value: string }[] = [
  { label: '芯片 / 固件（chip）', value: 'chip' },
  { label: '调校滑杆（sliders）', value: 'sliders' },
  { label: '刷新 / 升级（refresh）', value: 'refresh' },
  { label: '下载（download）', value: 'download' },
  { label: '云（cloud）', value: 'cloud' },
  { label: '盾牌 / 质保（shield）', value: 'shield' },
  { label: '显示器（monitor）', value: 'monitor' },
  { label: '文档（book）', value: 'book' },
  { label: '帮助（help）', value: 'help' },
  { label: '网格（grid）', value: 'grid' },
  { label: '立方（cube）', value: 'cube' },
  { label: '时钟（clock）', value: 'clock' },
  { label: '键盘（keyboard）', value: 'keyboard' },
  { label: '亮度 / 护眼（light）', value: 'light' },
]

/**
 * 海报字段集（§1.2 首屏海报 / §1.3 五张全屏海报）：
 * **hero（全宽海报）与 carousel 的单张 slide 共用同一组字段**（字段名保持一致），
 * 后台因此只需一套「海报编辑器」（含九宫格 + 拖拽的 `contentPosition` 位置控件）。
 *
 * 兼容说明：`image` / `mediaTag` / `imageMobile` 为既有字段（保留不删）；
 * `subtitle` 为「一句话」，渲染层同时兼容历史字段 `desc`。
 */
const POSTER_FIELDS: BlockFieldMeta[] = [
  { name: 'media', label: '媒体（图片 / 视频 / GIF / 代码动画）', kind: 'media' },
  { name: 'mediaType', label: '媒体类型', kind: 'select', options: POSTER_MEDIA_TYPES },
  { name: 'image', label: '图片（旧字段；未填「媒体」时使用）', kind: 'image' },
  { name: 'imageMobile', label: '手机竖版图（可选）', kind: 'image' },
  { name: 'poster', label: '视频封面图（可选）', kind: 'image' },
  { name: 'mediaTag', label: '媒体标签（无障碍 / 备用）', kind: 'text' },
  { name: 'title', label: '大标题（每行一句，必填）', kind: 'list', placeholder: '每行一句' },
  { name: 'subtitle', label: '一句话（必填）', kind: 'textarea', placeholder: '一句话说清这张海报' },
  { name: 'eyebrow', label: '眉题', kind: 'text' },
  { name: 'eyebrowEnabled', label: '显示眉题', kind: 'switch' },
  { name: 'stats', label: '卖点 / 数据点（一行小字）', kind: 'list' },
  { name: 'statsEnabled', label: '显示卖点 / 数据点', kind: 'switch' },
  { name: 'primary', label: '按钮①（文字 + 链接，必填）', kind: 'link' },
  { name: 'secondary', label: '按钮②（留空则只显示 1 个）', kind: 'link' },
  // 海报底部悬浮下载条：从下载中心勾选条目（保存 ID 列表，顺序即展示顺序）；
  // 前台按 ID 取真实版本 / 大小与文件地址，渲染成底部的下载按钮（留空则不显示）
  { name: 'downloadIds', label: '底部下载按钮（从下载中心勾选，留空则不显示）', kind: 'ref', source: 'downloads' },
  { name: 'contentPosition', label: '文案位置（九宫格 + 拖拽）', kind: 'position' },
  { name: 'height', label: '高度档位', kind: 'select', options: POSTER_HEIGHTS },
  { name: 'heightValue', label: '自定义高度(px)', kind: 'number', placeholder: '高度档位 = 自定义时生效' },
  { name: 'theme', label: '背景主题', kind: 'select', options: [
    { label: '暗色', value: 'dark' },
    { label: '浅色', value: 'light' },
  ] },
  // 文案 / 按钮配色（后台可改）：kind 用 text，值为 CSS 颜色字符串（如 #FAFAFB / rgba(255,255,255,.8)）；留空沿用既有皮肤
  { name: 'textColor', label: '文案颜色（留空用默认；如 #FAFAFB / rgba(255,255,255,.8)）', kind: 'text' },
  { name: 'accentColor', label: '按钮配色（留空用默认；主按钮实底 / 次按钮描边；如 #2040ED）', kind: 'text' },
  // 按钮样式（后台可切换，hero 与 carousel 每张 slide 各自配置）；缺省 / 老数据 / 非法值一律按 plain 渲染
  { name: 'ctaStyle', label: '按钮样式（立即购买）', kind: 'select', options: POSTER_CTA_STYLES },
]

/**
 * 区块类型目录（共 36 类）：
 * - 16 类基础区块（契约 §4）+ 3 类自定义模块（richText / html / embed）+ showcase（通栏产品展示）= 20；
 * - 扩展：产品详情主体 3 类（productHero / productSpecs / productBuy）+ 商业合作 2 类（caseList / venueList）
 *   + 测评方法 1 类（methodList）+ 邮件订阅 1 类（subscribe）+ B2B 采购价值 1 类（b2bValue）
 *   + 产品详情图文 1 类（productDetailRich）+ 产品详情四套布局 1 类（productDetailLayout）
 *   + 产品长图 1 类（productLongImage）+ 品牌资料 1 类（brandAssetList）+ 信任条 1 类（trustBar）
 *   + 产品矩阵 1 类（productMatrix）。
 * 字段严格对齐契约 §4。
 */
export const BLOCK_TYPES: BlockTypeMeta[] = [
  {
    type: 'hero',
    name: '全宽海报',
    group: '内容',
    // 与 carousel 单张 slide 共用同一套字段（后台只有一套「海报编辑器」）
    fields: POSTER_FIELDS,
    listFields: STAT_FIELDS,
  },
  {
    type: 'carousel',
    name: '轮播',
    group: '内容',
    fields: [
      { name: 'motion', label: '代码动画（作为第 1 张）', kind: 'switch' },
      { name: 'slides', label: '幻灯片（后续第 2、3… 张）', kind: 'list' },
      { name: 'autoplay', label: '自动播放', kind: 'switch' },
    ],
    listFields: POSTER_FIELDS,
  },
  {
    type: 'video',
    name: '视频',
    group: '内容',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'desc', label: '描述', kind: 'textarea' },
      { name: 'url', label: '视频（可上传 mp4 / webm / mov，或填外链地址）', kind: 'media' },
      { name: 'poster', label: '封面图', kind: 'image' },
    ],
  },
  {
    type: 'text',
    name: '标题正文',
    group: '内容',
    fields: [
      { name: 'eyebrow', label: '眉题', kind: 'text' },
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'body', label: '正文', kind: 'textarea' },
      {
        name: 'align',
        label: '对齐',
        kind: 'select',
        options: [
          { label: '左对齐', value: 'left' },
          { label: '居中', value: 'center' },
        ],
      },
    ],
  },
  {
    type: 'imageText',
    name: '图文',
    group: '内容',
    fields: [
      { name: 'image', label: '图片', kind: 'image' },
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'body', label: '正文', kind: 'textarea' },
      {
        name: 'side',
        label: '图片位置',
        kind: 'select',
        options: [
          { label: '居左', value: 'left' },
          { label: '居右', value: 'right' },
        ],
      },
      { name: 'cta', label: '按钮', kind: 'link' },
    ],
  },
  {
    type: 'imageGrid',
    name: '图片组',
    group: '内容',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'columns', label: '列数', kind: 'select', options: COLUMNS },
      { name: 'items', label: '图片', kind: 'list' },
    ],
    listFields: [
      { name: 'image', label: '图片', kind: 'image' },
      { name: 'caption', label: '说明', kind: 'text' },
    ],
  },
  {
    type: 'stats',
    name: '数字展示',
    group: '内容',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'items', label: '数据项', kind: 'list' },
      { name: 'footnote', label: '底部说明（统计口径）', kind: 'text', placeholder: '可选：如「数据截至 2026 年，按同一公开口径统计」' },
    ],
    listFields: STAT_FIELDS,
  },
  {
    type: 'cards',
    name: '卡片组',
    group: '内容',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'desc', label: '描述', kind: 'textarea' },
      { name: 'columns', label: '列数', kind: 'select', options: COLUMNS },
      {
        name: 'layout',
        label: '排布',
        kind: 'select',
        options: [
          { label: '网格', value: 'grid' },
          { label: '横向滑动', value: 'rail' },
          { label: '主次聚焦（1 主 + 若干次）', value: 'spotlight' },
          { label: '信任条（紧凑横排）', value: 'trust' },
          { label: '编号步骤', value: 'steps' },
          { label: '条目列表', value: 'entries' },
          { label: '能力网格（编号 + 图标 + 说明）', value: 'capability' },
        ],
      },
      { name: 'overlay', label: '文字浮于媒体', kind: 'switch' },
      { name: 'ratio', label: '媒体宽高比', kind: 'text', placeholder: '如 4 / 5、16 / 9；留空用 16 / 9' },
      { name: 'autoVersions', label: '自动带最新版本（取下载中心）', kind: 'switch' },
      // 条目列表（固件与驱动）标题行左侧搜索栏：占位文字与跳转地址后台可改（留空用默认）
      { name: 'searchPlaceholder', label: '搜索栏占位文字（条目列表布局）', kind: 'text', placeholder: '默认「搜索型号」' },
      { name: 'searchHref', label: '搜索跳转地址（条目列表布局）', kind: 'text', placeholder: '默认 /search，关键词以 ?q= 追加' },
      { name: 'items', label: '卡片', kind: 'list' },
    ],
    listFields: [
      { name: 'id', label: '锚点 ID（可选，供 /页面#id 深链；能力网格布局据此落 DOM id）', kind: 'text', placeholder: '如：manage' },
      { name: 'icon', label: '图标（条目列表 / 能力网格布局；留空则不显示）', kind: 'select', options: CARD_ICONS },
      { name: 'media', label: '媒体（图/视频/GIF）', kind: 'media' },
      { name: 'mediaType', label: '媒体类型', kind: 'select', options: MEDIA_TYPES },
      { name: 'image', label: '图片（旧字段）', kind: 'image' },
      { name: 'tag', label: '标签', kind: 'text' },
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'desc', label: '描述', kind: 'textarea' },
      { name: 'href', label: '链接', kind: 'text' },
      { name: 'downloadType', label: '下载类型（开启「自动带最新版本」后按此取最新）', kind: 'select', options: DOWNLOAD_TYPES },
      { name: 'downloadId', label: '下载资料 ID（精确指定，优先于下载类型）', kind: 'text', placeholder: '如：center-win' },
    ],
  },
  {
    type: 'timeline',
    name: '时间轴 / 流程',
    group: '内容',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      {
        name: 'layout',
        label: '布局',
        kind: 'select',
        options: [
          { label: '列表（时间轴）', value: 'list' },
          { label: '横向流程（步骤 + 连接线）', value: 'flow' },
        ],
      },
      { name: 'items', label: '节点', kind: 'list' },
    ],
    listFields: [
      { name: 'time', label: '时间', kind: 'text' },
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'desc', label: '描述', kind: 'textarea' },
    ],
  },
  {
    type: 'productGrid',
    name: '产品',
    group: '数据',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      {
        name: 'scope',
        label: '范围',
        kind: 'select',
        options: [
          { label: '全部产品', value: 'all' },
          { label: '精选（带角标）', value: 'featured' },
          { label: '按分类', value: 'category' },
          { label: '按系列', value: 'series' },
          { label: '手动挑选', value: 'manual' },
        ],
      },
      {
        name: 'category',
        label: '分类（范围 = 按分类）',
        kind: 'select',
        options: [
          { label: 'OLED旗舰', value: 'OLED旗舰' },
          { label: '双模高刷', value: '双模高刷' },
          { label: '电竞IPS', value: '电竞IPS' },
          { label: '周边', value: '周边' },
        ],
      },
      {
        name: 'ids',
        label: '手动挑选的产品',
        kind: 'ref',
        source: 'products',
        placeholder: '勾选产品即可；已选顺序即展示顺序',
      },
      { name: 'seriesId', label: '系列 ID（范围 = 按系列）', kind: 'text' },
      {
        name: 'layout',
        label: '呈现方式',
        kind: 'select',
        options: [
          { label: '网格', value: 'grid' },
          { label: '横向滑动', value: 'rail' },
        ],
      },
      { name: 'limit', label: '数量', kind: 'number' },
      { name: 'columns', label: '列数', kind: 'select', options: COLUMNS },
      { name: 'showPrice', label: '显示价格', kind: 'switch' },
      { name: 'showSpecs', label: '显示参数', kind: 'switch' },
      { name: 'showStatus', label: '显示状态', kind: 'switch' },
      { name: 'showFlag', label: '显示角标', kind: 'switch' },
      { name: 'showFilter', label: '显示筛选 / 排序', kind: 'switch' },
    ],
  },
  {
    type: 'articleList',
    name: '文章',
    group: '数据',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      {
        name: 'scope',
        label: '挑选方式',
        kind: 'select',
        options: [
          { label: '按来源筛选', value: 'all' },
          { label: '手动挑选（按下方 ID 顺序）', value: 'manual' },
        ],
      },
      {
        name: 'ids',
        label: '手动挑选的文章',
        kind: 'ref',
        source: 'articles',
        placeholder: '勾选文章即可；已选顺序即展示顺序',
      },
      {
        name: 'source',
        label: '来源',
        kind: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '评测', value: 'review' },
          { label: '技术', value: 'tech' },
          { label: '方法', value: 'method' },
          { label: '新闻', value: 'news' },
        ],
      },
      {
        name: 'layout',
        label: '呈现方式',
        kind: 'select',
        options: [
          { label: '网格', value: 'grid' },
          { label: '横向滑动', value: 'rail' },
        ],
      },
      { name: 'limit', label: '数量', kind: 'number' },
      { name: 'pageSize', label: '每页条数（0=不分页）', kind: 'number' },
    ],
  },
  {
    type: 'ranking',
    name: '榜单',
    group: '数据',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      {
        name: 'metric',
        label: '指标',
        kind: 'select',
        options: [
          { label: '综合', value: 'overall' },
          { label: '色准', value: 'sensor' },
          { label: '峰值亮度', value: 'battery' },
          { label: '响应时间', value: 'latency' },
        ],
      },
      { name: 'limit', label: '数量', kind: 'number' },
      {
        name: 'type',
        label: '范围（产品系列）',
        kind: 'select',
        options: [
          { label: '全部系列', value: '' },
          { label: 'OLED 旗舰', value: 'oled' },
          { label: '双模高刷', value: 'dual' },
          { label: '电竞 IPS', value: 'ips' },
        ],
      },
    ],
  },
  {
    type: 'downloadList',
    name: '下载',
    group: '数据',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      {
        name: 'scope',
        label: '挑选方式',
        kind: 'select',
        options: [
          { label: '按类别筛选', value: 'all' },
          { label: '手动挑选（按下方 ID 顺序）', value: 'manual' },
        ],
      },
      {
        name: 'ids',
        label: '手动挑选的下载',
        kind: 'ref',
        source: 'downloads',
        placeholder: '勾选资源即可；已选顺序即展示顺序',
      },
      {
        name: 'category',
        label: '类别',
        kind: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '软件', value: 'software' },
          { label: 'OLED 旗舰', value: 'oled' },
          { label: '双模高刷', value: 'dual' },
          { label: '电竞 IPS', value: 'ips' },
          { label: '周边', value: 'accessory' },
        ],
      },
      {
        name: 'layout',
        label: '呈现方式',
        kind: 'select',
        options: [
          { label: '表格', value: 'table' },
          { label: '横向滑动卡片', value: 'rail' },
        ],
      },
      { name: 'limit', label: '数量', kind: 'number' },
      { name: 'pageSize', label: '每页条数（0=不分页）', kind: 'number' },
    ],
  },
  {
    type: 'faqList',
    name: '问答',
    group: '数据',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      {
        name: 'scope',
        label: '挑选方式',
        kind: 'select',
        options: [
          { label: '按来源筛选', value: 'all' },
          { label: '手动挑选（按下方 ID 顺序）', value: 'manual' },
        ],
      },
      {
        name: 'ids',
        label: '手动挑选的问答',
        kind: 'ref',
        source: 'faqs',
        placeholder: '勾选问答即可（仅「服务支持」来源有条目）；已选顺序即展示顺序',
      },
      {
        name: 'source',
        label: '来源',
        kind: 'select',
        options: [
          { label: '服务支持', value: 'support' },
          { label: 'Center', value: 'center' },
        ],
      },
      { name: 'limit', label: '数量', kind: 'number' },
      { name: 'pageSize', label: '每页条数（0=不分页）', kind: 'number' },
    ],
  },
  {
    type: 'contact',
    name: '联系留言',
    group: '结构',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'desc', label: '描述', kind: 'textarea' },
      {
        name: 'channel',
        label: '渠道',
        kind: 'select',
        options: [
          { label: '产品咨询', value: 'inquiry' },
          { label: '商业合作', value: 'business' },
        ],
      },
      {
        name: 'variant',
        label: '模块样式',
        kind: 'select',
        options: [
          { label: '浅底浮卡（推荐）', value: 'soft' },
          { label: '深色收口', value: 'bold' },
        ],
      },
      { name: 'showForm', label: '显示表单', kind: 'switch' },
      { name: 'points', label: '左栏要点（每行一条）', kind: 'list', placeholder: '留空则按渠道给出默认要点' },
    ],
  },
  {
    type: 'subscribe',
    name: '邮件订阅',
    group: '结构',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'desc', label: '描述', kind: 'textarea' },
      {
        name: 'source',
        label: '来源标记',
        kind: 'select',
        options: [
          { label: '首页', value: 'home' },
          { label: '页脚', value: 'footer' },
        ],
      },
      { name: 'points', label: '左栏要点（每行一条）', kind: 'list' },
    ],
  },
  {
    type: 'layout',
    name: '布局容器',
    group: '结构',
    fields: [
      {
        name: 'columns',
        label: '列数',
        kind: 'select',
        options: [
          { label: '1 列', value: '1' },
          { label: '2 列', value: '2' },
          { label: '3 列', value: '3' },
        ],
      },
      {
        name: 'gap',
        label: '间距',
        kind: 'select',
        options: [
          { label: '小', value: 'sm' },
          { label: '中', value: 'md' },
          { label: '大', value: 'lg' },
        ],
      },
      { name: 'children', label: '子区块', kind: 'list' },
    ],
  },
  /* ---- 自定义模块（自由内容区块）三类 ---- */
  {
    type: 'richText',
    name: '富文本模块',
    group: '内容',
    fields: [
      {
        name: 'html',
        label: '富文本内容',
        kind: 'rich',
        placeholder: '标题 / 段落 / 列表 / 链接 / 图片；渲染时经白名单净化',
      },
    ],
  },
  {
    type: 'html',
    name: 'HTML 模块',
    group: '内容',
    fields: [
      {
        name: 'html',
        label: 'HTML 代码',
        kind: 'code',
        placeholder: '允许静态 HTML（表格 / 内联样式等）；不允许脚本 / iframe / 事件属性',
      },
      { name: 'note', label: '备注（仅后台可见）', kind: 'text', placeholder: '可选，用于标注用途' },
    ],
  },
  {
    type: 'embed',
    name: '代码嵌入模块',
    group: '内容',
    fields: [
      {
        name: 'code',
        label: '嵌入代码',
        kind: 'code',
        placeholder: 'HTML / 脚本（在沙箱 iframe 内运行，与主站隔离）',
      },
      { name: 'height', label: '高度(px)', kind: 'number', placeholder: '默认 360' },
      { name: 'allowScripts', label: '允许脚本', kind: 'switch' },
      { name: 'videoUrl', label: '视频地址（可选）', kind: 'text', placeholder: '填写后直接以原生播放器渲染' },
      { name: 'poster', label: '视频封面（可选）', kind: 'image' },
    ],
  },
  /* ---- 通栏产品展示（首页「重点产品」分段式；扩展 §4 新增类型）---- */
  {
    type: 'showcase',
    name: '通栏产品展示',
    group: '数据',
    fields: [
      { name: 'items', label: '产品条目', kind: 'list' },
      { name: 'alternate', label: '图文左右交替', kind: 'switch' },
    ],
    listFields: [
      { name: 'productId', label: '关联产品 ID', kind: 'text', placeholder: '可选，如 gh-54027x1qe' },
      { name: 'media', label: '媒体（图/视频/GIF）', kind: 'media' },
      { name: 'mediaType', label: '媒体类型', kind: 'select', options: MEDIA_TYPES },
      { name: 'eyebrow', label: '眉题', kind: 'text' },
      { name: 'model', label: '型号', kind: 'text', placeholder: '如 54027X1QE-W54' },
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'desc', label: '描述', kind: 'textarea' },
      { name: 'price', label: '参考价', kind: 'text', placeholder: '如 ¥4,999' },
      { name: 'specs', label: '关键参数', kind: 'list', placeholder: '每行一项' },
      { name: 'features', label: '卖点', kind: 'list', placeholder: '每行一项（最多展示 3 条）' },
      { name: 'cta', label: '按钮', kind: 'link' },
    ],
  },
  // —— 产品详情主体区块（详情页「主体区块化」）：读取当前产品数据，模板级配置统一作用于所有产品 ——
  {
    type: 'productHero',
    name: '产品展示台',
    group: '数据',
    fields: [
      { name: 'primaryLabel', label: '主按钮文案', kind: 'text', placeholder: '如：预约体验（留空则不显示）' },
      { name: 'primaryHref', label: '主按钮链接', kind: 'text', placeholder: '如：/business/venues' },
      { name: 'primaryFromProduct', label: '主按钮取产品购买链接（buyUrl）', kind: 'switch' },
      { name: 'secondaryLabel', label: '次按钮文案', kind: 'text', placeholder: '如：加入对比' },
      { name: 'secondaryHref', label: '次按钮链接', kind: 'text', placeholder: '如：/compare' },
      { name: 'showBadges', label: '显示角标 / 状态', kind: 'switch' },
      { name: 'showPrice', label: '显示参考价', kind: 'switch' },
      { name: 'showSummary', label: '显示参数摘要（标称 / 实测）', kind: 'switch' },
    ],
  },
  {
    type: 'productSpecs',
    name: '产品参数规格',
    group: '数据',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'showTabs', label: '显示详情分区标签', kind: 'switch' },
      { name: 'showGuides', label: '显示下载 / 咨询引导卡', kind: 'switch' },
      { name: 'guideDownloadLabel', label: '下载按钮文案', kind: 'text' },
      { name: 'guideContactLabel', label: '咨询按钮文案', kind: 'text' },
    ],
  },
  {
    type: 'productBuy',
    name: '产品购买咨询',
    group: '数据',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'primaryLabel', label: '主按钮文案', kind: 'text' },
      { name: 'primaryHref', label: '主按钮链接', kind: 'text' },
      { name: 'secondaryLabel', label: '次按钮文案', kind: 'text' },
      { name: 'secondaryHref', label: '次按钮链接', kind: 'text' },
      { name: 'points', label: '保障要点（每行一条）', kind: 'list' },
    ],
  },
  // —— 产品详情 · 详情图文：渲染**当前产品**的 detailHtml（长图 / 图文混排）；无内容时不渲染、不占位 ——
  {
    type: 'productDetailRich',
    name: '产品详情图文',
    group: '数据',
    fields: [],
  },
  // —— 产品详情 · 四套布局：同一产品数据 / 字段，只切换 UI 与交互组织方式 ——
  {
    type: 'productDetailLayout',
    name: '产品详情（四套布局）',
    group: '数据',
    fields: [
      { name: 'layout', label: '默认布局', kind: 'select', options: [
        { label: '目录式（吸顶目录，推荐）', value: 'toc' },
        { label: '标签式（横向 Tab）', value: 'tabs' },
        { label: '折叠式（分组折叠）', value: 'accordion' },
        { label: '长页式（单页滚动）', value: 'long' },
      ] },
      { name: 'showBuy', label: '显示底部购买 / 咨询区', kind: 'switch' },
      { name: 'primaryLabel', label: '主按钮文案', kind: 'text', placeholder: '如：立即购买（留空则不显示）' },
      { name: 'primaryHref', label: '主按钮链接', kind: 'text', placeholder: '如：/inquiry' },
      { name: 'primaryFromProduct', label: '主按钮取产品购买链接（buyUrl）', kind: 'switch' },
      { name: 'secondaryLabel', label: '次按钮文案', kind: 'text', placeholder: '如：预约体验' },
      { name: 'secondaryHref', label: '次按钮链接', kind: 'text', placeholder: '如：/business/venues' },
      { name: 'showBadges', label: '显示角标 / 状态', kind: 'switch' },
      { name: 'showPrice', label: '显示参考价', kind: 'switch' },
      { name: 'showSummary', label: '首屏显示关键指标', kind: 'switch' },
      { name: 'buyTitle', label: '底部咨询标题', kind: 'text', placeholder: '如：准备入手？' },
      { name: 'buySubtitle', label: '底部咨询副标题', kind: 'text' },
      { name: 'buyPrimaryLabel', label: '底部主按钮文案', kind: 'text' },
      { name: 'buyPrimaryHref', label: '底部主按钮链接', kind: 'text' },
      { name: 'buySecondaryLabel', label: '底部次按钮文案', kind: 'text' },
      { name: 'buySecondaryHref', label: '底部次按钮链接', kind: 'text' },
    ],
  },
  // —— 产品详情 · H5 长图：读取当前产品的长图切片，按顺序垂直无缝拼接 ——
  {
    type: 'productLongImage',
    name: '产品长图（H5）',
    group: '数据',
    fields: [
      { name: 'href', label: '整块跳转链接（可选）', kind: 'text', placeholder: '如：/inquiry' },
    ],
  },
  // —— 商业合作数据源区块：从集合挑选，支持「全部 / 手动挑选」——
  {
    type: 'caseList',
    name: '合作案例',
    group: '数据',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      {
        name: 'scope',
        label: '挑选方式',
        kind: 'select',
        options: [
          { label: '全部案例', value: 'all' },
          { label: '手动挑选（按下方顺序）', value: 'manual' },
        ],
      },
      { name: 'ids', label: '手动挑选的案例', kind: 'ref', source: 'bizCases', placeholder: '勾选案例即可；已选顺序即展示顺序' },
      {
        name: 'layout',
        label: '呈现方式',
        kind: 'select',
        options: [
          { label: '网格', value: 'grid' },
          { label: '横向滑动', value: 'rail' },
        ],
      },
      { name: 'columns', label: '列数', kind: 'select', options: COLUMNS },
      { name: 'limit', label: '数量', kind: 'number' },
      { name: 'pageSize', label: '每页条数（0=不分页）', kind: 'number' },
      { name: 'showMeta', label: '显示合作方 / 年份', kind: 'switch' },
    ],
  },
  {
    type: 'venueList',
    name: '体验点',
    group: '数据',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      {
        name: 'source',
        label: '数据来源',
        kind: 'select',
        options: [
          { label: '商业合作体验点（biz-venues）', value: 'biz' },
          { label: '服务网点与体验点（service-info）', value: 'service' },
        ],
      },
      {
        name: 'scope',
        label: '挑选方式',
        kind: 'select',
        options: [
          { label: '全部体验点', value: 'all' },
          { label: '手动挑选（按下方顺序）', value: 'manual' },
        ],
      },
      { name: 'ids', label: '手动挑选的体验点', kind: 'ref', source: 'bizVenues', placeholder: '勾选体验点即可；已选顺序即展示顺序' },
      {
        name: 'layout',
        label: '呈现方式',
        kind: 'select',
        options: [
          { label: '网格', value: 'grid' },
          { label: '横向滑动', value: 'rail' },
        ],
      },
      { name: 'columns', label: '列数', kind: 'select', options: COLUMNS },
      { name: 'limit', label: '数量', kind: 'number' },
      { name: 'pageSize', label: '每页条数（0=不分页）', kind: 'number' },
      { name: 'showStatus', label: '显示营业状态', kind: 'switch' },
      {
        name: 'groupBy',
        label: '分组方式',
        kind: 'select',
        options: [
          { label: '不分组', value: 'none' },
          { label: '按省份分组', value: 'province' },
        ],
      },
      { name: 'showModels', label: '显示可体验型号', kind: 'switch' },
      { name: 'dialog', label: '点击打开详情弹窗', kind: 'switch' },
    ],
  },
  // —— 测评方法数据源区块：从集合 methods 取数（后台「测评方法」维护）——
  {
    type: 'methodList',
    name: '测评方法',
    group: '数据',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'limit', label: '数量', kind: 'number' },
    ],
  },
  // —— B2B 采购价值 + 商务联系区块：4 张价值卡 + 可复制联系胶囊（可后台编辑 / 可关闭）——
  {
    type: 'b2bValue',
    name: 'B2B 采购价值',
    group: '数据',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'subtitle', label: '子标题', kind: 'text' },
      { name: 'items', label: '价值卡片', kind: 'list' },
      { name: 'wechat', label: '商务微信', kind: 'text', placeholder: '如：xxrsm001' },
      { name: 'email', label: '商务邮箱', kind: 'text', placeholder: '如：1009742523@qq.com' },
      { name: 'hotline', label: '商务热线', kind: 'text', placeholder: '如：15913908438' },
      { name: 'showContact', label: '显示商务联系', kind: 'switch' },
    ],
    listFields: [
      { name: 'icon', label: '图标', kind: 'text', placeholder: '如：cube / shield / cloud' },
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'desc', label: '说明', kind: 'textarea', placeholder: '建议不超过两行' },
    ],
  },
  // —— 品牌资料（B 端）：读取独立集合 brand-assets（后台「品牌资料」维护），与下载中心数据分开 ——
  {
    type: 'brandAssetList',
    name: '品牌资料',
    group: '数据',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      {
        name: 'category',
        label: '分类',
        kind: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '规范', value: '规范' },
          { label: 'Logo', value: 'Logo' },
          { label: '图片', value: '图片' },
          { label: '送测', value: '送测' },
        ],
      },
      { name: 'limit', label: '数量', kind: 'number' },
    ],
  },
  // —— 信任条（§1.7 新建）：分隔线横排，四项均分、项间竖线、上下细线收边、无卡片底 ——
  {
    type: 'trustBar',
    name: '信任条',
    group: '结构',
    fields: [
      { name: 'title', label: '标题（可选）', kind: 'text' },
      { name: 'columns', label: '列数', kind: 'select', options: COLUMNS },
      { name: 'items', label: '条目', kind: 'list' },
    ],
    listFields: [
      { name: 'icon', label: '图标', kind: 'select', options: TRUST_ICONS },
      { name: 'text', label: '文案', kind: 'text' },
      { name: 'href', label: '链接（可选）', kind: 'text' },
    ],
  },
  // —— 全屏视觉模块（R3 新建）：纯媒体铺满，无文案层；高度档位与海报同口径 ——
  {
    type: 'fullscreenVisual',
    name: '全屏视觉模块',
    group: '内容',
    fields: [
      { name: 'media', label: '媒体（图片 / GIF / 视频）', kind: 'media' },
      {
        name: 'mediaType',
        label: '媒体类型',
        kind: 'select',
        options: [
          { label: '图片', value: 'image' },
          { label: 'GIF', value: 'gif' },
          { label: '视频', value: 'video' },
        ],
      },
      { name: 'imageMobile', label: '手机竖版图（可选）', kind: 'image' },
      { name: 'height', label: '高度档位', kind: 'select', options: POSTER_HEIGHTS },
      { name: 'heightValue', label: '自定义高度(px)', kind: 'number', placeholder: '高度档位 = 自定义时生效' },
      { name: 'alt', label: '替代文本（无障碍）', kind: 'text' },
    ],
  },
  // —— 长图无缝拼接（R6 新建）：切片按顺序垂直拼接；桌面 / 移动可分别指定 ——
  {
    type: 'longImage',
    name: '长图拼接',
    group: '内容',
    fields: [
      { name: 'items', label: '切片（按顺序垂直拼接）', kind: 'list' },
      { name: 'href', label: '整块点击跳转（可选）', kind: 'link' },
    ],
    listFields: [
      { name: 'image', label: '桌面图', kind: 'image' },
      { name: 'imageMobile', label: '移动图（可选）', kind: 'image' },
      { name: 'alt', label: '替代文本', kind: 'text' },
    ],
  },
  // —— 产品矩阵（§1.4 新建）：图片铺满卡面 + 型号 / 一句话 / 按钮置于顶部居中；两种数据源 ——
  {
    type: 'productMatrix',
    name: '产品矩阵',
    group: '数据',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
      {
        name: 'source',
        label: '数据源',
        kind: 'select',
        options: [
          { label: '关联产品（自动带入主图 / 型号 / 详情链接）', value: 'product' },
          { label: '手动填写', value: 'manual' },
        ],
      },
      { name: 'columns', label: '列数', kind: 'select', options: COLUMNS },
      {
        name: 'ratio',
        label: '图片比例',
        kind: 'select',
        options: [
          { label: '16:9', value: '16:9' },
          { label: '1:1', value: '1:1' },
          { label: '3:4', value: '3:4' },
        ],
      },
      { name: 'fullscreen', label: '一屏正好放下', kind: 'switch' },
      {
        name: 'cropFocus',
        label: '裁切焦点（同图裁切不变形）',
        kind: 'select',
        options: [
          { label: '居中', value: 'center' },
          { label: '上', value: 'top' },
          { label: '下', value: 'bottom' },
          { label: '左', value: 'left' },
          { label: '右', value: 'right' },
        ],
      },
      {
        name: 'mobileLayout',
        label: '手机端排列',
        kind: 'select',
        options: [
          { label: '横向滑动', value: 'rail' },
          { label: '保持 2×2', value: 'grid' },
        ],
      },
      // 文案 / 按钮配色（后台可改）：kind 用 text，值为 CSS 颜色字符串（如 #FAFAFB / #17171A）；留空沿用默认
      { name: 'textColor', label: '文案颜色（留空用默认；如 #FAFAFB / #17171A）', kind: 'text' },
      { name: 'accentColor', label: '按钮配色（留空用默认；主按钮实底 / 次按钮描边；如 #2040ED）', kind: 'text' },
      { name: 'items', label: '产品条目', kind: 'list' },
    ],
    listFields: [
      { name: 'productId', label: '关联产品 ID（数据源 = 关联产品）', kind: 'text', placeholder: '如 gh-54027x1qe' },
      { name: 'image', label: '主图（手填 / 覆盖产品主图）', kind: 'media' },
      { name: 'imageMobile', label: '手机端图（可选，留空沿用主图）', kind: 'image' },
      { name: 'model', label: '型号（可覆盖产品型号）', kind: 'text', placeholder: '如 54027X1QE-W54' },
      { name: 'desc', label: '一句话', kind: 'textarea' },
      { name: 'href', label: '详情链接（留空则用产品详情页）', kind: 'text', placeholder: '如 /products/gh-54027x1qe' },
      // 逐卡文案颜色：同一区块里深浅底混排时，按卡设定（留空沿用区块级 textColor / 默认色）
      { name: 'textColor', label: '该卡文案颜色（留空用区块默认；如 #17171A / #FAFAFB）', kind: 'text' },
      { name: 'buttons', label: '按钮（文字 + 链接，可增减）', kind: 'list' },
    ],
  },
]

/**
 * 统一「标题组」字段：主标题 + 子标题 + 右侧 CTA（文案 / 链接）。
 *
 * 追加到「板块标题」类型的区块上，让后台装修器可为每个板块单独配置：
 * - 子标题：标题下的一句话说明；
 * - 右侧按钮：文案与链接按板块自定义（不一定是「查看全部」）。
 *
 * 不追加的类型：
 * - hero / carousel（整屏海报）、layout（容器）、自定义模块三类（自带结构）；
 * - text（标题正文导语）、imageText（左右图文，自带内联按钮）、contact（联系卡片 / 表单）——
 *   这三类结构不同，「右侧按钮」与其版式冲突，改用各自既有字段表达。
 *
 * 已有 `desc` 的类型（video / cards）不再补 `subtitle`，避免同一语义出现两个字段。
 */
const TITLE_GROUP_TYPES: BlockType[] = [
  'imageGrid', 'stats', 'cards', 'timeline', 'video',
  'productGrid', 'articleList', 'ranking', 'downloadList', 'faqList', 'showcase',
  // 详情页收口区块 / 商业合作数据源区块 同样支持「主标题 / 子标题 / 右侧按钮」
  'productBuy', 'caseList', 'venueList', 'methodList', 'productMatrix',
  // 品牌资料（B 端数据源区块）同样支持「主标题 / 子标题 / 右侧按钮」
  'brandAssetList',
]

const COPY_FIELDS: BlockFieldMeta[] = [
  { name: 'subtitle', label: '子标题', kind: 'text', placeholder: '可选：标题下的一句话说明' },
  { name: 'ctaLabel', label: '右侧按钮文案', kind: 'text', placeholder: '如：查看全部产品' },
  { name: 'ctaHref', label: '右侧按钮链接', kind: 'text', placeholder: '如：/products' },
]
for (const meta of BLOCK_TYPES) {
  if (!TITLE_GROUP_TYPES.includes(meta.type)) continue
  const has = (name: string) => meta.fields.some((field) => field.name === name)
  const extra = has('desc') ? COPY_FIELDS.slice(1) : COPY_FIELDS
  meta.fields.push(...extra)
}

/** 按类型取目录项（未命中返回 undefined） */
export function getBlockTypeMeta(type: BlockType): BlockTypeMeta | undefined {
  return BLOCK_TYPES.find((meta) => meta.type === type)
}

/** 全部区块类型（34 类）的 type 值清单；用于站点配置 enabledBlocks 校验与缺省「全部启用」 */
export const BLOCK_TYPE_VALUES: BlockType[] = BLOCK_TYPES.map((meta) => meta.type)

/** 新建区块：生成随机稳定 id 的区块对象（后台新增用） */
export function createBlock(type: BlockType, props: Record<string, unknown> = {}, style?: BlockStyle): Block {
  const block: Block = { id: randomUUID(), type, enabled: true, props: { ...defaultProps(type), ...props } }
  // R3 / R6：媒体型区块默认通栏铺满（运营仍可在后台改为版心宽度）
  if (type === 'fullscreenVisual' || type === 'longImage') {
    block.style = { container: 'full', ...style }
  } else if (style) {
    block.style = style
  }
  return block
}

/**
 * 各类型默认 props（对齐契约 §4；仅作新建区块的起点）。
 * 自定义模块三类给出可用初值（含默认高度 360），避免新建后渲染成空壳。
 */
export function defaultProps(type: BlockType): Record<string, unknown> {
  switch (type) {
    case 'richText':
      return { html: '' }
    case 'html':
      return { html: '', note: '' }
    case 'embed':
      return { code: '', height: 360, allowScripts: false, videoUrl: '', poster: '' }
    case 'showcase':
      return { items: [], alternate: true }
    // 海报（全宽海报）：新建即为满屏海报，文案默认居中偏上，两个按钮「进一步了解 / 购买」
    case 'hero':
      return {
        media: '',
        mediaType: 'image',
        title: [],
        subtitle: '',
        eyebrow: '',
        eyebrowEnabled: false,
        stats: [],
        statsEnabled: false,
        primary: { label: '进一步了解', href: '' },
        secondary: { label: '购买', href: '' },
        contentPosition: { x: 50, y: 32 },
        height: 'full',
        theme: 'dark',
        textColor: '',
        accentColor: '',
      }
    case 'carousel':
      return { slides: [], autoplay: true, motion: true }
    case 'productMatrix':
      return {
        source: 'product',
        columns: 2,
        // 矩阵卡片按客户要求为正方形（1:1）
        ratio: '1:1',
        fullscreen: false,
        cropFocus: 'center',
        mobileLayout: 'rail',
        items: [],
      }
    case 'trustBar':
      return { columns: 4, items: [] }
    case 'fullscreenVisual':
      // R3：默认满屏、图片类型；新建后运营只需上传媒体
      return { media: '', mediaType: 'image', imageMobile: '', height: 'full', heightValue: 720, alt: '' }
    case 'longImage':
      // R6：空切片列表；上传后按顺序垂直拼接
      return { items: [], href: '' }
    default:
      return {}
  }
}