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

/** 轮播 / 首屏幻灯片条目结构（hero 与 carousel 共用字段集） */
const SLIDE_FIELDS: BlockFieldMeta[] = [
  { name: 'eyebrow', label: '眉题', kind: 'text' },
  { name: 'title', label: '标题', kind: 'list', placeholder: '每行一句' },
  { name: 'desc', label: '描述', kind: 'textarea' },
  { name: 'mediaTag', label: '媒体标签', kind: 'text' },
  { name: 'image', label: '图片', kind: 'image' },
  { name: 'primary', label: '主按钮', kind: 'link' },
  { name: 'secondary', label: '次按钮', kind: 'link' },
  { name: 'stats', label: '数据', kind: 'list' },
]

/**
 * 区块类型目录（共 26 类）：
 * - 16 类基础区块（契约 §4）+ 3 类自定义模块（richText / html / embed）+ showcase（通栏产品展示）= 20；
 * - 扩展：产品详情主体 3 类（productHero / productSpecs / productBuy）+ 商业合作 2 类（caseList / venueList）
 *   + 测评方法 1 类（methodList）。
 * 字段严格对齐契约 §4。
 */
export const BLOCK_TYPES: BlockTypeMeta[] = [
  {
    type: 'hero',
    name: '全宽海报',
    group: '内容',
    fields: [
      { name: 'eyebrow', label: '眉题', kind: 'text' },
      { name: 'title', label: '标题', kind: 'list', placeholder: '每行一句' },
      { name: 'desc', label: '描述', kind: 'textarea' },
      { name: 'mediaTag', label: '媒体标签', kind: 'text' },
      { name: 'image', label: '图片', kind: 'image' },
      { name: 'primary', label: '主按钮', kind: 'link' },
      { name: 'secondary', label: '次按钮', kind: 'link' },
      { name: 'stats', label: '数据', kind: 'list' },
    ],
    listFields: STAT_FIELDS,
  },
  {
    type: 'carousel',
    name: '轮播',
    group: '内容',
    fields: [
      { name: 'slides', label: '幻灯片', kind: 'list' },
      { name: 'autoplay', label: '自动播放', kind: 'switch' },
    ],
    listFields: SLIDE_FIELDS,
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
        ],
      },
      { name: 'overlay', label: '文字浮于媒体', kind: 'switch' },
      { name: 'ratio', label: '媒体宽高比', kind: 'text', placeholder: '如 4 / 5、16 / 9；留空用 16 / 9' },
      { name: 'items', label: '卡片', kind: 'list' },
    ],
    listFields: [
      { name: 'media', label: '媒体（图/视频/GIF）', kind: 'media' },
      { name: 'mediaType', label: '媒体类型', kind: 'select', options: MEDIA_TYPES },
      { name: 'image', label: '图片（旧字段）', kind: 'image' },
      { name: 'tag', label: '标签', kind: 'text' },
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'desc', label: '描述', kind: 'textarea' },
      { name: 'href', label: '链接', kind: 'text' },
    ],
  },
  {
    type: 'timeline',
    name: '时间轴',
    group: '内容',
    fields: [
      { name: 'title', label: '标题', kind: 'text' },
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
  'productBuy', 'caseList', 'venueList', 'methodList',
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

/** 全部区块类型（26 类）的 type 值清单；用于站点配置 enabledBlocks 校验与缺省「全部启用」 */
export const BLOCK_TYPE_VALUES: BlockType[] = BLOCK_TYPES.map((meta) => meta.type)

/** 新建区块：生成随机稳定 id 的区块对象（后台新增用） */
export function createBlock(type: BlockType, props: Record<string, unknown> = {}, style?: BlockStyle): Block {
  const block: Block = { id: randomUUID(), type, enabled: true, props: { ...defaultProps(type), ...props } }
  if (style) block.style = style
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
    default:
      return {}
  }
}