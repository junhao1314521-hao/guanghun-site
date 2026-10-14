/** 首页内容数据：文案与数值均为占位示例，上线前由运营替换 */
import type { DeviceVariant } from '../components/ui/DeviceArt'

/* ---------- 首屏轮播：三种媒体类型（图片 / 动画 / 代码动效）---------- */
export type SlideMedia =
  | { kind: 'image' }
  | { kind: 'motion' }
  | { kind: 'canvas' }

export type HeroSlide = {
  id: string
  media: SlideMedia
  mediaTag: string
  eyebrow: string
  title: string[]
  desc: string
  primary: string
  secondary: string
  /** CTA 跳转目标；缺省时前端回退到默认入口（/products、/compare），不做死按钮 */
  primaryTo?: string
  secondaryTo?: string
  stats: { value: string; label: string }[]
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 's0',
    media: { kind: 'image' },
    mediaTag: '品牌主视觉海报',
    eyebrow: 'GH SERIES / 2026',
    title: ['为极致操作', '而生的电竞装备'],
    desc: '以实测数据定义性能。每一款光魂产品都经过可复现的测试流程，参数公开、方法公开、来源可查。',
    primary: '浏览全部产品',
    secondary: '查看天梯榜',
    primaryTo: '/products',
    secondaryTo: '/ladder',
    stats: [
      { value: '0.6 ms', label: '端到端延迟' },
      { value: '26,000 DPI', label: '最高分辨率' },
      { value: '120 h', label: '续航（实测）' },
    ],
  },
  {
    id: 's1',
    media: { kind: 'motion' },
    mediaTag: '品牌动画海报',
    eyebrow: 'FLAGSHIP / GH-M900 PRO',
    title: ['58 克', '轻量化无线电竞鼠标'],
    desc: '从传感器到微动，逐项实测公开；延迟、重量、续航均为可复现数据。',
    primary: '查看产品详情',
    secondary: '加入对比',
    primaryTo: '/products/gh-m900-pro',
    stats: [
      { value: '58 g', label: '整机重量' },
      { value: '0.6 ms', label: '端到端延迟' },
      { value: '120 h', label: '续航（实测）' },
    ],
  },
  {
    id: 's2',
    media: { kind: 'canvas' },
    mediaTag: 'Canvas 实时动效海报',
    eyebrow: 'INTERACTIVE / CANVAS',
    title: ['数据驱动', '每一次点击'],
    desc: '由代码实时渲染的动效层，可随产品发布节奏自由替换，不依赖任何外部素材。',
    primary: '了解实测方法',
    secondary: '查看天梯榜',
    primaryTo: '/ladder#method',
    secondaryTo: '/ladder',
    stats: [
      { value: '32 kHz', label: '采样率' },
      { value: '8 kHz', label: '回报率' },
      { value: '100%', label: '可复现' },
    ],
  },
]

/* ---------- 按场景选择（一排 2 张，指针接近驱动滑动）---------- */
export type Scene = {
  id: string
  label: string
  title: string
  desc: string
  tag: string
  accentTag: boolean
  background: string
  art: DeviceVariant
}

export const SCENES: Scene[] = [
  {
    id: 'scene-01',
    label: 'SCENE 01',
    title: '低延迟 · 高精度',
    desc: '面向竞技选手与硬核玩家，响应速度与稳定性优先。',
    tag: '电竞对战',
    accentTag: true,
    background:
      'radial-gradient(120% 100% at 74% 12%, rgba(32,64,237,.62), transparent 56%), radial-gradient(80% 80% at 10% 90%, rgba(34,211,238,.30), transparent 58%), linear-gradient(165deg, #0E0E10, #17171A)',
    art: 'mouse',
  },
  {
    id: 'scene-02',
    label: 'SCENE 02',
    title: '手感 · 静谧',
    desc: '长时间输入与剪辑，强调手感一致性与噪音控制。',
    tag: '内容创作',
    accentTag: false,
    background:
      'radial-gradient(120% 100% at 78% 18%, rgba(91,117,245,.45), transparent 56%), radial-gradient(70% 70% at 12% 86%, rgba(6,182,212,.32), transparent 60%), linear-gradient(165deg, #14101E, #1A1626)',
    art: 'keyboard',
  },
  {
    id: 'scene-03',
    label: 'SCENE 03',
    title: '耐用 · 无线',
    desc: '多设备切换与长续航，适配混合办公日常需求。',
    tag: '商用办公',
    accentTag: false,
    background:
      'radial-gradient(120% 100% at 70% 14%, rgba(34,211,238,.38), transparent 56%), radial-gradient(80% 80% at 14% 88%, rgba(32,64,237,.34), transparent 58%), linear-gradient(165deg, #0C1220, #111A2E)',
    art: 'pad',
  },
]

/* ---------- 重点产品（3D 倾斜）---------- */
export type FeaturedProduct = {
  id: string
  model: string
  name: string
  specs: string[]
  price: string
  tag?: string
  background: string
  art: DeviceVariant
}

export const FEATURED_PRODUCTS: FeaturedProduct[] = [
  {
    id: 'gh-m900-pro',
    model: 'GH-M900 PRO',
    name: '无线电竞鼠标',
    specs: ['26,000 DPI', '0.6 ms', '58 g'],
    price: '¥899',
    tag: '旗舰',
    background:
      'radial-gradient(120% 100% at 72% 16%, rgba(32,64,237,.55), transparent 58%), linear-gradient(165deg, #0E0E10, #17171A)',
    art: 'mouse',
  },
  {
    id: 'gh-k870',
    model: 'GH-K870',
    name: '三模机械键盘',
    specs: ['87 键', '三模', '全键热插拔'],
    price: '¥649',
    background:
      'radial-gradient(120% 100% at 76% 18%, rgba(91,117,245,.5), transparent 58%), linear-gradient(165deg, #121018, #1A1620)',
    art: 'keyboard',
  },
  {
    id: 'gh-h500',
    model: 'GH-H500',
    name: '电竞头戴耳机',
    specs: ['50 mm', '7.1', '2.4 G'],
    price: '¥529',
    background:
      'radial-gradient(120% 100% at 70% 14%, rgba(34,211,238,.4), transparent 58%), linear-gradient(165deg, #0C121E, #131C2C)',
    art: 'headset',
  },
  {
    id: 'gh-p400',
    model: 'GH-P400',
    name: '超大鼠标垫',
    specs: ['900×400', '防泼水', '3 mm'],
    price: '¥129',
    background:
      'radial-gradient(120% 100% at 74% 16%, rgba(32,64,237,.5), transparent 58%), linear-gradient(165deg, #101018, #181820)',
    art: 'pad',
  },
]

/* ---------- 天梯榜 teaser（首页只展示局部，底部虚化）---------- */
export type LadderRow = { rank: string; model: string; category: string; fill: string; value: string }

export const LADDER_TEASER_ROWS: LadderRow[] = [
  { rank: '01', model: 'GH-M900 PRO', category: '无线电竞鼠标', fill: '96%', value: '96.4' },
  { rank: '02', model: 'GH-M700', category: '有线电竞鼠标', fill: '91%', value: '91.2' },
  { rank: '03', model: 'GH-M500', category: '轻量电竞鼠标', fill: '88%', value: '88.7' },
]

/* ---------- 技术评测 ---------- */
export type ArticleCard = { id: string; tag: string; accent: boolean; title: string; desc: string; date: string; meta: string }

export const TECH_ARTICLES: ArticleCard[] = [
  {
    id: 'a1',
    tag: '评测',
    accent: true,
    title: '无线鼠标端到端延迟实测',
    desc: '同一套测试条件与设备，对三款无线鼠标做延迟对比，结果标注测试日期与样本数。',
    date: '2026-09-18',
    meta: '方法 v2',
  },
  {
    id: 'a2',
    tag: '技术解析',
    accent: false,
    title: '从传感器到回报率：延迟链路拆解',
    desc: '逐段拆解信号从传感器到系统的链路，说明每一环对端到端延迟的贡献与测量方式。',
    date: '2026-09-05',
    meta: '技术解析',
  },
  {
    id: 'a3',
    tag: '测试方法',
    accent: false,
    title: '可复现测试流程与设备清单',
    desc: '公开测试所用的设备、环境、样本数与判定口径，任何人都可据此复现。',
    date: '2026-08-22',
    meta: '方法 v2',
  },
]

/* ---------- 品牌介绍 ---------- */
export const BRAND_STATS = [
  { value: '2019', label: '成立年份' },
  { value: '40+', label: '研发与测试团队' },
  { value: '1,200+', label: '累计测试记录' },
]

/* ---------- 服务入口 ---------- */
export const SERVICE_ENTRIES = [
  { id: 'model', title: '型号支持', desc: '按型号查看结构化参数、实测记录与常见问题。' },
  { id: 'download', title: '下载中心', desc: '驱动、固件与说明书，公开资料无需注册即可下载。' },
  { id: 'faq', title: '常见问题', desc: '安装、连接与售后相关的高频问答与教程。' },
  { id: 'contact', title: '联系与咨询', desc: '产品服务与商业合作咨询，统一进入同一套工单系统。' },
] as const

/* ---------- 商业合作 · 体验点 ---------- */
export type Spot = { name: string; area: string; status: string; ok: boolean }

export const SPOTS: Spot[] = [
  { name: '光魂上海旗舰体验店', area: '上海 · 静安', status: '营业中', ok: true },
  { name: '光魂深圳体验点', area: '广东 · 深圳', status: '营业中', ok: true },
  { name: '光魂成都体验点', area: '四川 · 成都', status: '筹备中', ok: false },
]

export const COOP_TAGS = ['赛事合作', '内容共创', '渠道分销', '品牌联名']

/* ---------- 新闻与动态 ---------- */
export type NewsItem = { date: string; tag: string; title: string }

export const NEWS: NewsItem[] = [
  { date: '2026-09-28', tag: '产品发布', title: 'GH-M900 PRO 正式发布' },
  { date: '2026-09-12', tag: '品牌动态', title: '天梯榜测试方法升级至 v2' },
  { date: '2026-08-30', tag: '活动', title: '线下体验点巡回活动预告' },
  { date: '2026-08-15', tag: '服务', title: '驱动与固件下载中心改版说明' },
]