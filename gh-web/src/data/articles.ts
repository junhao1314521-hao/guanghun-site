/** 文章 / 新闻数据：标题、摘要与正文均为技术评测/教程风格的占位文案，上线前由编辑替换 */
import { MEDIA } from './media'

export type ArticleCategory = 'review' | 'guide' | 'insight' | 'brand'

export const CATEGORY_LABEL_BY_CODE: Record<ArticleCategory, string> = {
  review: '评测',
  guide: '教程',
  insight: '行业观察',
  brand: '品牌动态',
}

/** 分类筛选 chip 组（首项为「全部」，不参与数据过滤） */
export const CATEGORY_FILTERS = ['全部', '评测', '教程', '行业观察', '品牌动态']

export type ArticleSummary = {
  id: string
  title: string
  category: ArticleCategory
  categoryLabel: string
  /** 主标签（卡片 chip 展示） */
  tag: string
  /** 全部标签（多标签；首项通常与 tag 一致） */
  tags: string[]
  accent: boolean
  desc: string
  date: string
  /** 作者 / 发布方 */
  author: string
  /** 发布状态：已发布 / 审核中 / 草稿（前台仅展示「已发布」） */
  status: string
  /** 封面素材语义键，渲染时经 articleCoverSrc 映射到 MEDIA，不直接外链图片 */
  cover: string
  /** 真实封面图片地址（上传 / 素材库）；填写后优先于 cover 语义键 */
  coverImage?: string
  meta: string
  readingMin: number
}

export type ArticleSection = { heading: string; paragraphs: string[] }

export type ArticleDetail = ArticleSummary & {
  author: string
  sections: ArticleSection[]
  /** 富文本正文（HTML 原文，来自后台 articles.body；渲染时经 sanitizeRichText 净化）。
   *  后端就绪前可能为空 → 前台回退到 sections 小节展示。 */
  body?: string
  related: ArticleSummary[]
}

export type NewsItem = { date: string; tag: string; title: string; href?: string }

/** 封面语义键 → 本地视觉素材（未覆盖的键回退到就近的实验室图位） */
const COVER_MEDIA: Record<string, string> = {
  lab: MEDIA.about.lab,
  brand: MEDIA.about.brand,
  software: MEDIA.center.hero,
  'software-alt': MEDIA.center.feature1,
  scene: MEDIA.scene['scene-02'],
  case: MEDIA.businessCase[0],
}

/** 把封面解析为可渲染的素材地址：优先真实封面图（coverImage），否则按语义键映射 */
export function articleCoverSrc(cover: string, coverImage?: string): string {
  return coverImage?.trim() || COVER_MEDIA[cover] || MEDIA.about.lab
}

export const ARTICLES: ArticleSummary[] = [
  {
    id: 'latency-end-to-end',
    title: '无线鼠标端到端延迟实测：三款旗舰横评',
    category: 'review',
    categoryLabel: '评测',
    tag: '延迟实测',
    tags: ['延迟实测', '无线', '鼠标'],
    accent: true,
    desc: '在同一套测试条件与设备下，对三款无线鼠标逐段测量端到端延迟，结果同时给出中位数与 95 分位。',
    date: '2026-09-18',
    author: '光魂测试实验室',
    status: '已发布',
    cover: 'lab',
    meta: '实测 · 方法 v2',
    readingMin: 8,
  },
  {
    id: 'tri-mode-keyboard-latency',
    title: '三模机械键盘连接实测：2.4G / 蓝牙 / 有线延迟对比',
    category: 'review',
    categoryLabel: '评测',
    tag: '连接实测',
    tags: ['连接实测', '三模', '键盘'],
    accent: false,
    desc: '把同一把三模键盘分别在三种连接方式下连续击键，对比打字延迟、抖动与续航表现。',
    date: '2026-09-06',
    author: '光魂测试实验室',
    status: '已发布',
    cover: 'software-alt',
    meta: '实测 · 方法 v2',
    readingMin: 7,
  },
  {
    id: 'driver-firmware-guide',
    title: '驱动与固件升级指南：从检测到回滚的完整流程',
    category: 'guide',
    categoryLabel: '教程',
    tag: '固件指南',
    tags: ['固件指南', '教程', '固件'],
    accent: false,
    desc: '手把手说明如何识别设备、核对固件版本、执行升级，并在异常时安全回滚到上一版本。',
    date: '2026-08-30',
    author: '光魂产品团队',
    status: '已发布',
    cover: 'software',
    meta: '教程 · 图文',
    readingMin: 6,
  },
  {
    id: 'test-methodology',
    title: '为什么我们要公开测试方法论：可复现性的价值',
    category: 'insight',
    categoryLabel: '行业观察',
    tag: '方法论',
    tags: ['方法论', '可复现'],
    accent: false,
    desc: '公开设备、环境、样本数与判定口径，让任何一个实验室都能复现我们的数值，而不是只看结论。',
    date: '2026-08-22',
    author: '光魂编辑部',
    status: '已发布',
    cover: 'brand',
    meta: '方法 · 说明',
    readingMin: 7,
  },
  {
    id: 'report-rate-explained',
    title: '回报率与采样率：参数背后的真实体验差异',
    category: 'insight',
    categoryLabel: '行业观察',
    tag: '参数解读',
    tags: ['参数解读', '回报率'],
    accent: false,
    desc: '回报率与采样率常被混为一谈；本篇拆开两者的定义、测量方式以及对实际操作的实际影响。',
    date: '2026-08-12',
    author: '光魂编辑部',
    status: '已发布',
    cover: 'scene',
    meta: '解析 · 数据',
    readingMin: 5,
  },
  {
    id: 'brand-2026-roadmap',
    title: '光魂 2026 产品线规划：从延迟到生态',
    category: 'brand',
    categoryLabel: '品牌动态',
    tag: '产品规划',
    tags: ['产品规划', '品牌'],
    accent: true,
    desc: '围绕低延迟、多设备连接与软件生态三条主线，说明下一代产品在研发与测试上的取舍。',
    date: '2026-09-28',
    author: '光魂团队',
    status: '已发布',
    cover: 'case',
    meta: '品牌 · 规划',
    readingMin: 4,
  },
]

/** 演示列表总量（前端分页口径），真实值由接口层提供 */
export const ARTICLE_TOTAL = ARTICLES.length

/** 结构化小节正文（作者已并入文章摘要，可后台维护）；与摘要分离，详情按 id 合并 */
const ARTICLE_SECTIONS: Record<string, ArticleSection[]> = {
  'latency-end-to-end': [
      {
        heading: '测试目的与环境',
        paragraphs: [
          '本测试的目标是在统一条件下量化无线鼠标从物理点击到系统响应之间的端到端延迟，并将总延迟拆成可解释的若干段。参与对比的三款鼠标均为当期无线旗舰，回报率统一设置为最高档位。',
          '测试在受控环境内进行，室温稳定在 22–24 ℃；主机、线材与接收器全程保持不变，接收器与鼠标之间的距离固定在 30 厘米，避免环境变量干扰结论。',
        ],
      },
      {
        heading: '端到端延迟的构成',
        paragraphs: [
          '端到端延迟通常由传感器采样、主控处理、无线传输、接收器解算与系统调度五段构成。只给出一个总数，无法判断瓶颈到底在哪一段。',
          '我们按段分别采集信号，定位每一环对总延迟的贡献，再回到整机层面复核。这样得到的结论可以定位问题，也便于下一代产品明确优化方向。',
        ],
      },
      {
        heading: '实测数据与对比',
        paragraphs: [
          '每款鼠标在同一档回报率下各采集 500 次点击，去除首尾预热样本后统计。结果同时给出中位数与 95 分位，单次最低值仅作参考，不进入结论。',
          '三款产品的中位数差异不大，但在 95 分位上拉开了差距：稳定的高分位表现意味着连续操作时更少出现可感知的迟滞。',
        ],
      },
      {
        heading: '结论与适用场景',
        paragraphs: [
          '在竞技场景中，稳定的高分位延迟比偶发的单次最低值更有意义。追求更低延迟的玩家，应优先关注整条链路的稳定性，而非某一个参数的最大值。',
          '完整的原始数据、设备清单与判定口径可在天梯榜页面查看；我们会在方法更新时同步标注版本号。',
        ],
      },
    ],
  'tri-mode-keyboard-latency': [
      {
        heading: '连接方式的差异',
        paragraphs: [
          '三模键盘支持有线、2.4G 无线与蓝牙三种连接。三者在延迟、稳定性和续航上各有取舍，但厂商往往只强调其中一项。',
          '本次测试用同一把键盘切换三种模式，尽量排除键位与轴体差异，只比较连接方式带来的变化。',
        ],
      },
      {
        heading: '打字延迟实测',
        paragraphs: [
          '我们以连续击键的方式采集按键到字符上屏的时间差，每种模式各记录 1,000 次有效样本，统计中位数与抖动区间。',
          '结果显示，有线与 2.4G 的差距在小样本下不易察觉，但在长连打与快速组合键时，2.4G 的抖动更值得关注；蓝牙则更适合以输入舒适度为优先的场景。',
        ],
      },
      {
        heading: '续航与稳定性',
        paragraphs: [
          '在关闭灯效的前提下，逐日记录三种模式的耗电曲线。2.4G 的功耗介于有线与蓝牙之间，长时间高强度使用仍建议随用随插。',
          '稳定性方面，我们模拟了多设备密集干扰的环境，观察是否出现丢键或重连，并记录恢复所需时间。',
        ],
      },
      {
        heading: '如何选择',
        paragraphs: [
          '日常办公与创作可优先蓝牙，追求极致响应的对战场景建议 2.4G，长时间固定工位则可以有线为主。',
          '无论选择哪种方式，建议在驱动中确认回报率设置，避免因档位不一致而误判设备性能。',
        ],
      },
    ],
  'driver-firmware-guide': [
      {
        heading: '升级前的准备',
        paragraphs: [
          '升级前请先在驱动中确认当前设备型号与固件版本，并保持设备电量充足或直接使用有线连接，避免升级中断电。',
          '建议关闭占用同一无线接收器的其他设备，升级期间不要拔插接收器，也不要在升级过程中关闭主机。',
        ],
      },
      {
        heading: '检测与识别设备',
        paragraphs: [
          '打开驱动后，软件会自动扫描已连接的设备。若设备未出现在列表中，请依次检查接收器是否插紧、是否为同一型号的接收器，并尝试更换 USB 接口。',
          '识别成功后，设备卡片会显示型号与当前固件版本，与下载中心公布的最新版本逐位核对即可。',
        ],
      },
      {
        heading: '执行升级',
        paragraphs: [
          '点击设备卡片上的升级入口，选择目标固件包后按提示确认。升级过程中进度条会显示当前写入阶段，请耐心等待，不要进行其他操作。',
          '升级完成后设备会自动重启，驱动中的版本号应更新为最新版本；如未变化，请断开设备后重新连接再查看。',
        ],
      },
      {
        heading: '异常与回滚',
        paragraphs: [
          '若升级过程中出现中断，请保持设备连接，重新打开升级入口并按提示重试；如反复失败，可先用有线模式完成升级。',
          '需要回退旧版本时，可在下载中心获取对应历史固件，按同样的流程写入。历史版本不会在发布新版本时被删除。',
        ],
      },
      {
        heading: '常见问题',
        paragraphs: [
          '升级后若手感或响应发生变化，通常来自回报率与加速度等设置的复位，请在驱动中核对并重新设定。',
          '仍无法解决时，请提交咨询并附上型号、当前版本与现象描述，处理进度可在客户中心跟进。',
        ],
      },
    ],
  'test-methodology': [
      {
        heading: '为什么要公开方法',
        paragraphs: [
          '一个孤立的数字很难被验证。公开测试方法，是为了让结论可以被检查、被复现，而不只是被相信。',
          '我们把设备、环境、样本数与判定口径一并公开，任何人都可以按同一套流程得到可对照的结果。',
        ],
      },
      {
        heading: '测量的可复现性',
        paragraphs: [
          '可复现意味着换一个实验室、换一名操作者，在相同条件下应得到统计上一致的结论。这要求我们明确每一次测量中哪些是变量、哪些是常量。',
          '为此，我们在测试记录中固定样本量与统计口径，并标注方法与版本号，避免不同批次的数据被直接混用。',
        ],
      },
      {
        heading: '判定口径',
        paragraphs: [
          '我们优先使用中位数与 95 分位，而不是均值。均值容易被极端样本拉偏，分位数更能反映连续操作时的真实体验。',
          '对于存在明显个体差异的项目，我们会注明样本来源与批次，并给出波动区间，而不是只给一个代表值。',
        ],
      },
      {
        heading: '数据的存放与更新',
        paragraphs: [
          '原始数据与测试记录统一留存，方法升级时会同步更新版本号，旧版本结论保留可追溯的说明。',
          '当方法发生变化时，我们会重新测试而非沿用旧数据，确保同一张榜单上的数值来自同一套口径。',
        ],
      },
    ],
  'report-rate-explained': [
      {
        heading: '参数的含义',
        paragraphs: [
          '回报率指设备每秒向主机上报位置的次数，采样率则指传感器每秒采集画面的次数。两者相关，但并不等同，也不能互相替代。',
          '提高回报率会让位置更新更密，但是否能带来实际提升，还取决于传感器采样与主机处理的配合。',
        ],
      },
      {
        heading: '回报率对体验的影响',
        paragraphs: [
          '更高的回报率在快速移动时能提供更密的位置轨迹，理论上让指针更贴合手部动作；但边际收益会随数值升高而递减。',
          '实际体验中，回报率的稳定性比它的标称上限更重要。频繁抖动的高回报率，反而可能比稳定的中档回报率更难适应。',
        ],
      },
      {
        heading: '采样率的边界',
        paragraphs: [
          '采样率决定传感器对运动的还原能力。当采样率低于回报率时，上报之间可能缺少有效数据，出现重复或外推的位置。',
          '因此，判断一颗传感器是否够用，应看采样率与回报率是否匹配，而不是单看某一个更高的数字。',
        ],
      },
      {
        heading: '实践建议',
        paragraphs: [
          '对多数人而言，先用厂商推荐的默认档位，再根据手感逐步调整，比直接拉满更稳妥。',
          '调整后建议连续使用一段时间再评估，避免因短期不适应而反复切换设置。',
        ],
      },
    ],
  'brand-2026-roadmap': [
      {
        heading: '产品线概览',
        paragraphs: [
          '2026 年的产品规划围绕三条主线展开：更低的端到端延迟、更可靠的多设备连接，以及更完整的软件生态。',
          '我们将继续以可复现的实测数据作为发布依据，参数、方法与来源随产品同步公开。',
        ],
      },
      {
        heading: '延迟与连接',
        paragraphs: [
          '在延迟方向上，重点从追求单一最低值转向提升高分位稳定性，让连续操作中的响应更可预期。',
          '连接方面会加强多设备切换的可靠性，减少在干扰环境下的重连与丢包。',
        ],
      },
      {
        heading: '软件与生态',
        paragraphs: [
          '驱动软件将承担更多配置与固件管理的职责，配置可随账号同步，换机后可快速恢复既有设定。',
          '我们会逐步开放更多实测数据的查看入口，让用户在选购前就能对照方法理解差异。',
        ],
      },
      {
        heading: '下一步',
        paragraphs: [
          '相关产品的具体发布时间与规格以官方最终公布为准，进展会通过新闻与文章页面持续更新。',
          '如果你希望了解某个方向的细节，欢迎提交咨询，我们会把高频问题整理成新的文章。',
        ],
      },
    ],
}

/** 新闻与动态：与文章复用同一批内容，取品牌动态 / 产品发布类 */
export const NEWS: NewsItem[] = [
  { date: '2026-09-28', tag: '品牌动态', title: '光魂 2026 产品线规划：从延迟到生态', href: '/articles/brand-2026-roadmap' },
  { date: '2026-09-18', tag: '评测', title: '无线鼠标端到端延迟实测：三款旗舰横评', href: '/articles/latency-end-to-end' },
  { date: '2026-08-30', tag: '教程', title: '驱动与固件升级指南：从检测到回滚的完整流程', href: '/articles/driver-firmware-guide' },
  { date: '2026-08-22', tag: '行业观察', title: '为什么我们要公开测试方法论：可复现性的价值', href: '/articles/test-methodology' },
]

/** 详情合并：摘要 + 小节正文，并按同分类优先挑选 3 篇相关阅读 */
export function getArticleDetail(id: string): ArticleDetail | null {
  const summary = ARTICLES.find((item) => item.id === id)
  const sections = ARTICLE_SECTIONS[id]
  if (!summary || !sections) return null
  const related = [...ARTICLES]
    .filter((item) => item.id !== id)
    .sort((a, b) => Number(b.category === summary.category) - Number(a.category === summary.category))
    .slice(0, 3)
  return { ...summary, sections, related }
}