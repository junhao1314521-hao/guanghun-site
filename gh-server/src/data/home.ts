/** 首页内容数据：光魂（小雪人数码）OLED 电竞显示器品牌，文案由运营维护 */
import type { DeviceVariant } from './device-variant'

/* ---------- 首屏轮播：三种媒体类型（图片 / 动画 / 代码动效）---------- */
export type SlideMedia =
  | { kind: 'image' }
  | { kind: 'motion' }
  | { kind: 'canvas' }

export type HeroSlide = {
  id: string
  media: SlideMedia
  mediaTag: string
  /** 海报图地址（横版，宽屏使用；运营/生成的主视觉） */
  poster?: string
  /** 手机竖版海报地址（窄屏 <900px 使用；缺省则回退到横版） */
  posterMobile?: string
  eyebrow: string
  title: string[]
  desc: string
  primary: string
  secondary: string
  /** CTA 的真实跳转目标；缺省时按「演示占位」处理（走 DemoToast），不做死按钮 */
  primaryTo?: string
  secondaryTo?: string
  stats: { value: string; label: string }[]
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 's0',
    media: { kind: 'image' },
    mediaTag: '品牌主视觉',
    // 首页海报暂不采用图片素材（图片由后台按需补充）；保留文案即可
    eyebrow: 'SUPER DISPLAY / 2026',
    title: ['为极致而生'],
    desc: 'OLED 电竞显示器，以实测数据定义性能。',
    primary: '浏览全部产品',
    secondary: '查看天梯榜',
    primaryTo: '/products',
    secondaryTo: '/ladder',
    stats: [
      { value: '540 Hz', label: '最高刷新率' },
      { value: '0.03 ms', label: 'GTG 响应' },
      { value: '80 Gbps', label: 'DP 2.1 带宽' },
    ],
  },
  {
    id: 's1',
    media: { kind: 'motion' },
    mediaTag: '主视觉动效',
    // 图片素材暂不采用（保留文案，后台可随时补图 / 视频 / GIF）
    eyebrow: 'FLAGSHIP / 54027X1QE-W54',
    title: ['2K@540Hz 闪电旗舰'],
    desc: '第四代 W-OLED，0.03 ms 响应，DP 2.1 一线跑满 540Hz。',
    primary: '查看产品详情',
    secondary: '加入对比',
    primaryTo: '/products/gh-54027x1qe',
    secondaryTo: '/compare',
    stats: [
      { value: '2K 540Hz', label: '分辨率 / 刷新率' },
      { value: '0.03 ms', label: 'GTG 响应' },
      { value: '1500 nit', label: 'HDR 峰值亮度' },
    ],
  },
  {
    id: 's2',
    media: { kind: 'canvas' },
    mediaTag: 'Canvas 实时动效',
    // 图片素材暂不采用（保留文案，后台可随时补图 / 视频 / GIF）
    eyebrow: 'INTERACTIVE / CANVAS',
    title: ['数据驱动每一帧'],
    desc: '代码实时渲染的动效层，配合可复现的实测方法。',
    primary: '了解实测方法',
    secondary: '查看天梯榜',
    primaryTo: '/ladder',
    secondaryTo: '/ladder',
    stats: [
      { value: '540 Hz', label: '刷新率上限' },
      { value: '0.03 ms', label: '响应时间' },
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
    title: '高刷 · 决胜毫秒',
    desc: '面向 FPS / MOBA 竞技，540Hz 刷新与 0.03 ms 响应压缩每一帧延迟。',
    tag: '电竞对战',
    accentTag: true,
    background:
      'radial-gradient(120% 100% at 74% 12%, rgba(32,64,237,.62), transparent 56%), radial-gradient(80% 80% at 10% 90%, rgba(34,211,238,.30), transparent 58%), linear-gradient(165deg, #0E0E10, #17171A)',
    art: 'monitor',
  },
  {
    id: 'scene-02',
    label: 'SCENE 02',
    title: '色准 · 创作',
    desc: '99% DCI-P3、原生 10bit 与出厂校色，兼顾设计与影像调色。',
    tag: '内容创作',
    accentTag: false,
    background:
      'radial-gradient(120% 100% at 78% 18%, rgba(91,117,245,.45), transparent 56%), radial-gradient(70% 70% at 12% 86%, rgba(6,182,212,.32), transparent 60%), linear-gradient(165deg, #14101E, #1A1626)',
    art: 'monitor',
  },
  {
    id: 'scene-03',
    label: 'SCENE 03',
    title: '护眼 · 高效',
    desc: '硬件低蓝光与无频闪调光，长时间办公与代码依然舒适。',
    tag: '商用办公',
    accentTag: false,
    background:
      'radial-gradient(120% 100% at 70% 14%, rgba(34,211,238,.38), transparent 56%), radial-gradient(80% 80% at 14% 88%, rgba(32,64,237,.34), transparent 58%), linear-gradient(165deg, #0C1220, #111A2E)',
    art: 'monitor',
  },
  {
    id: 'scene-04',
    label: 'SCENE 04',
    title: '沉浸 · 影音',
    desc: 'OLED 纯黑与 HDR 高亮，主机与影音场景同样从容。',
    tag: '影音娱乐',
    accentTag: false,
    background:
      'radial-gradient(120% 100% at 76% 16%, rgba(129,140,248,.46), transparent 56%), radial-gradient(80% 80% at 12% 88%, rgba(34,211,238,.30), transparent 58%), linear-gradient(165deg, #101022, #17132A)',
    art: 'monitor',
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
  /** 卖点（重点产品信息区右侧展示，最多取 3 条）；缺省则不展示 */
  features?: string[]
  background: string
  art: DeviceVariant
}

export const FEATURED_PRODUCTS: FeaturedProduct[] = [
  {
    id: 'gh-54027x1qe',
    model: '54027X1QE-W54',
    name: '闪电 540Hz 电竞OLED显示器',
    specs: ['26.5 英寸 2K', '540 Hz', '0.03 ms'],
    price: '¥4,999',
    tag: '旗舰',
    features: ['第四代 W-OLED，368 万像素级控光', '满速 DP 2.1（80Gbps）· 原厂石墨烯散热', '三年质保，含 OLED 烧屏保护'],
    background:
      'radial-gradient(120% 100% at 72% 16%, rgba(32,64,237,.55), transparent 58%), linear-gradient(165deg, #0E0E10, #17171A)',
    art: 'monitor',
  },
  {
    id: 'gh-32x1ue',
    model: '32X1UE-W16',
    name: 'Meta 双模 4K 电竞显示器',
    specs: ['4K@165 / FHD@330', 'META OLED', 'DP 2.1'],
    price: '¥5,499',
    tag: '双模',
    features: ['一机两用：4K 高分辨率与 FHD 高刷一键切换', '进口 LG META OLED 面板', '支持 HDR 与广色域'],
    background:
      'radial-gradient(120% 100% at 76% 18%, rgba(91,117,245,.5), transparent 58%), linear-gradient(165deg, #121018, #1A1620)',
    art: 'monitor',
  },
  {
    id: 'gh-28027x1qe',
    model: '28027X1QE-W28',
    name: '闪电 280Hz 电竞OLED显示器',
    specs: ['26.5 英寸 2K', '280 Hz', '1500 nit'],
    price: '¥2,699',
    tag: '热销',
    features: ['第四代 W-OLED，1500 nit 峰值亮度', '26.5 英寸 2K@280Hz，平民超跑', 'CNC 阳极氧化铝背板 · 石墨烯散热'],
    background:
      'radial-gradient(120% 100% at 70% 14%, rgba(34,211,238,.4), transparent 58%), linear-gradient(165deg, #0C121E, #131C2C)',
    art: 'monitor',
  },
  {
    id: 'gh-27q1f',
    model: '27Q1F',
    name: '27 英寸 2K 电竞显示器',
    specs: ['27 英寸 2K', '200 Hz', 'Fast IPS'],
    price: '¥1,299',
    features: ['27 英寸 2K 200Hz Fast IPS', 'HDR 与广色域兼得', '高性价比电竞之选'],
    background:
      'radial-gradient(120% 100% at 74% 16%, rgba(32,64,237,.5), transparent 58%), linear-gradient(165deg, #101018, #181820)',
    art: 'monitor',
  },
]

/* ---------- 天梯榜 teaser（首页只展示局部，底部虚化）---------- */
export type LadderRow = { rank: string; model: string; category: string; fill: string; value: string }

export const LADDER_TEASER_ROWS: LadderRow[] = [
  { rank: '01', model: '54027X1QE-W54', category: '闪电 540Hz 电竞OLED', fill: '97%', value: '96.8' },
  { rank: '02', model: '32X1UE-W16', category: 'Meta 双模 4K 电竞OLED', fill: '94%', value: '94.2' },
  { rank: '03', model: '28027X1QE-W28', category: '闪电 280Hz 电竞OLED', fill: '93%', value: '92.5' },
]

/* ---------- 技术评测 ---------- */
export type ArticleCard = { id: string; tag: string; accent: boolean; title: string; desc: string; date: string; meta: string }

export const TECH_ARTICLES: ArticleCard[] = [
  {
    id: 'a1',
    tag: '评测',
    accent: true,
    title: '540Hz OLED 电竞显示器响应实测',
    desc: '在同一套测试条件与仪器下对比三款 OLED 的 GTG 响应与运动清晰度，标注测试日期与样本数。',
    date: '2026-09-25',
    meta: '方法 v2',
  },
  {
    id: 'a2',
    tag: '技术解析',
    accent: false,
    title: '从面板到像素：OLED 控光链路拆解',
    desc: '逐段拆解像素级控光、驱动与散热如何影响响应、亮度与寿命，说明每一环的取舍。',
    date: '2026-09-12',
    meta: '技术解析',
  },
  {
    id: 'a3',
    tag: '测试方法',
    accent: false,
    title: '可复现的显示器实测流程与设备清单',
    desc: '公开测试所用的仪器、环境、样本数与判定口径，任何人都可据此复现。',
    date: '2026-08-22',
    meta: '方法 v2',
  },
]

/* ---------- 品牌介绍 ---------- */
export const BRAND_STATS = [
  { value: '2016', label: '成立年份', note: '从评测起步，坚持自有实验室与仪器实测。' },
  { value: '40', unit: '+', label: '研发与测试团队', note: '覆盖面板、驱动、结构与色彩验证全链路。' },
  { value: '1,200', unit: '+', label: '累计测试记录', note: '每一条都可追溯到原始测试条件与样机编号。' },
]

/* ---------- 服务入口 ---------- */
export const SERVICE_ENTRIES = [
  { id: 'model', title: '型号支持', desc: '按型号查看结构化参数、实测记录与常见问题。' },
  { id: 'download', title: '下载中心', desc: '说明书、调色配置与固件，公开资料无需注册即可下载。' },
  { id: 'faq', title: '常见问题', desc: '安装、连接、HDR 调校与售后相关的高频问答。' },
  { id: 'contact', title: '联系与咨询', desc: '产品服务与商业合作咨询，统一进入同一套工单系统。' },
] as const

/* ---------- 商业合作 · 体验点 ---------- */
export type Spot = { name: string; area: string; status: string; ok: boolean; /** 到店体验说明（首页卡片第二行用） */ note: string }

export const SPOTS: Spot[] = [
  { name: '光魂上海旗舰体验店', area: '上海 · 静安', status: '营业中', ok: true, note: '全系 OLED 可试玩，支持现场调参与参数讲解' },
  { name: '光魂深圳体验点', area: '广东 · 深圳', status: '营业中', ok: true, note: '主打高刷电竞机型，支持预约到店' },
  { name: '光魂成都体验点', area: '四川 · 成都', status: '筹备中', ok: false, note: '筹备中，开放后支持预约到店' },
]

export const COOP_TAGS = ['赛事合作', '内容共创', '渠道分销', '品牌联名']

/* ---------- 新闻与动态 ---------- */
export type NewsItem = { date: string; tag: string; title: string }

export const NEWS: NewsItem[] = [
  { date: '2026-09-20', tag: '产品发布', title: '光魂 54027X1QE-W54 540Hz OLED 正式发布' },
  { date: '2026-09-12', tag: '品牌动态', title: '天梯榜测试方法升级至 v2（新增色准 / 均匀度）' },
  { date: '2026-08-30', tag: '活动', title: '线下体验点巡回活动预告' },
  { date: '2026-08-15', tag: '服务', title: '显示器说明书与调色配置下载中心改版说明' },
]
