/** 文章 / 新闻数据：标题、摘要与正文均为显示器评测/教程风格的占位文案，上线前由编辑替换 */

export type ArticleCategory = 'review' | 'guide' | 'tech' | 'news'

export const CATEGORY_LABEL_BY_CODE: Record<ArticleCategory, string> = {
  review: '评测',
  guide: '教程',
  tech: '技术',
  news: '资讯',
}

/** 分类筛选 chip 组（首项为「全部」，不参与数据过滤）—— 方案 C：评测 / 教程 / 技术 / 资讯 */
export const CATEGORY_FILTERS = ['全部', '评测', '教程', '技术', '资讯']

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
  /** 封面素材语义键，由前端映射到本地视觉素材，不直接外链图片 */
  cover: string
  /** 真实封面图片地址（上传 / 素材库）；填写后优先于 cover 语义键 */
  coverImage?: string
  meta: string
  readingMin: number
  /**
   * 富文本 HTML 正文（后台可编辑；`GET /api/articles/:id` 返回）。
   * 与下方 `sections`（结构化小节）并存：`body` 为任意富文本，`sections` 为兼容旧详情的分段正文。
   */
  body: string
}

export type ArticleSection = { heading: string; paragraphs: string[] }

export type ArticleDetail = ArticleSummary & {
  author: string
  sections: ArticleSection[]
  related: ArticleSummary[]
}

export type NewsItem = { date: string; tag: string; title: string; href?: string; cover?: string; coverImage?: string }

export const ARTICLES: ArticleSummary[] = [
  {
    id: 'latency-end-to-end',
    title: 'OLED 电竞显示器响应实测：三款旗舰横评',
    category: 'review',
    categoryLabel: '评测',
    tag: '响应实测',
    tags: ['响应实测', 'OLED', '电竞显示器'],
    accent: true,
    desc: '在同一套测试条件与仪器下，对三款 OLED 电竞显示器逐档测量 GTG 灰阶响应与运动清晰度，结果同时给出中位数与 95 分位。',
    date: '2026-09-25',
    author: '小雪人评测实验室',
    status: '已发布',
    cover: 'lab',
    meta: '实测 · 方法 v2',
    readingMin: 8,
    body:
      '<h2>测试目的与环境</h2>' +
      '<p>本测试在同一套条件与仪器下，对三款 OLED 电竞显示器逐档测量<strong>GTG 灰阶响应</strong>，并给出中位数与 95 分位。</p>' +
      '<ul><li>室温稳定在 22–24 ℃；</li><li>显示器先预热 30 分钟再测量；</li><li>过驱档位统一设置为「标准」。</li></ul>' +
      '<h2>响应时间的构成</h2>' +
      '<p>响应时间由面板灰阶切换、驱动过驱与像素控光共同决定，只给一个标称值无法反映运动拖影的真实差异。</p>' +
      '<h2>结论</h2>' +
      '<p>竞技场景中，<em>稳定的高分位响应</em>比偶发的单次最低值更有意义；完整原始数据见天梯榜页面。</p>',
  },
  {
    id: 'color-accuracy-delta-e',
    title: '色准实测：三块 OLED 面板的 ΔE 与观感差异',
    category: 'review',
    categoryLabel: '评测',
    tag: '色准实测',
    tags: ['色准实测', 'ΔE', '色彩校准'],
    accent: false,
    desc: '在同一条校准链路上测量三块 OLED 面板的平均 ΔE 与最大偏差，对比出厂校准数值与肉眼观感之间的差距。',
    date: '2026-09-18',
    author: '小雪人评测实验室',
    status: '已发布',
    cover: 'scene',
    meta: '实测 · 方法 v2',
    readingMin: 6,
    body:
      '<h2>测试目的与环境</h2>' +
      '<p>色准不能只看一个 ΔE 数字。本测试在同一色度计与同一套校准流程下，测量三块 OLED 面板的<strong>平均 ΔE</strong> 与最大偏差。</p>' +
      '<ul><li>显示器先预热 30 分钟再测量；</li><li>色温统一设为 6500K；</li><li>测量覆盖 sRGB 与 DCI-P3 色域。</li></ul>' +
      '<h2>平均 ΔE 与最大偏差</h2>' +
      '<p>平均 ΔE 反映整体偏移，最大偏差则决定最坏情况下是否肉眼可辨；两者都低，色彩才称得上稳定。</p>' +
      '<h2>结论</h2>' +
      '<p>出厂校准可以压低平均 ΔE，但真正决定观感一致性的是<em>色域映射与灰阶过渡</em>；完整数据见天梯榜色准榜。</p>',
  },
  {
    id: 'tri-mode-keyboard-latency',
    title: '双模切换实测：4K 高分辨率与 FHD 高刷怎么选',
    category: 'review',
    categoryLabel: '评测',
    tag: '双模实测',
    tags: ['双模实测', '4K', '高刷'],
    accent: false,
    desc: '把同一台双模显示器分别在 4K@165 与 FHD@330 模式下连续实测，对比清晰度、刷新率与操作手感。',
    date: '2026-09-06',
    author: '小雪人评测实验室',
    status: '已发布',
    cover: 'software-alt',
    meta: '实测 · 方法 v2',
    readingMin: 7,
    body:
      '<h2>两种模式的差异</h2>' +
      '<p>同一台双模显示器可在 <strong>4K@165 与 FHD@330</strong> 之间切换，两者在清晰度、刷新率与输入延迟上各有取舍。</p>' +
      '<h2>双模切换实测</h2>' +
      '<p>每种模式各记录 1,000 帧有效样本，取中位数与抖动区间；快速移动画面与高速镜头下差距更明显。</p>' +
      '<h2>如何选择</h2>' +
      '<p>影视与创作优先 4K 高分辨率；对战建议 FHD 高刷；固定场景可按内容一键切换。</p>',
  },
  {
    id: 'driver-firmware-guide',
    title: '显示器色彩校准指南：从 OSD 到 ICC 配置',
    category: 'guide',
    categoryLabel: '教程',
    tag: '调校指南',
    tags: ['调校指南', '教程', '色彩校准'],
    accent: false,
    desc: '手把手说明如何在 OSD 与系统中完成亮度、色温与色域校准，并导出可复用的 ICC 色彩配置。',
    date: '2026-08-30',
    author: '光魂产品团队',
    status: '已发布',
    cover: 'software',
    meta: '教程 · 图文',
    readingMin: 6,
    body:
      '<h2>校准前的准备</h2>' +
      '<p>先在 OSD 中确认显示器当前色域与色温设置，保持显示器预热 30 分钟，并关闭系统的自适应亮度。</p>' +
      '<ol><li>关闭占用色彩管理的其它软件；</li><li>校准期间不要切换输入源；</li><li>不要中途关闭显示器电源。</li></ol>' +
      '<h2>校准与配置导出</h2>' +
      '<p>完成亮度、色温与色域校准后，可导出 ICC 色彩配置在系统中加载；需要回退出厂设置时，可在下载中心获取对应色彩配置文件并按同样流程应用。</p>' +
      '<blockquote><p>出厂色彩配置文件不会在发布新固件时被删除，便于随时回退。</p></blockquote>',
  },
  {
    id: 'test-methodology',
    title: '为什么我们要公开显示器测试方法：可复现性的价值',
    category: 'tech',
    categoryLabel: '技术',
    tag: '方法论',
    tags: ['方法论', '可复现'],
    accent: false,
    desc: '公开仪器、环境、样本数与判定口径，让任何一个实验室都能复现我们的数值，而不是只看结论。',
    date: '2026-08-22',
    author: '光魂编辑部',
    status: '已发布',
    cover: 'brand',
    meta: '方法 · 说明',
    readingMin: 7,
    body:
      '<h2>为什么要公开方法</h2>' +
      '<p>一个孤立的数字很难被验证。公开测试方法，是为了让结论可以被检查、被复现，而不只是被相信。</p>' +
      '<h2>可复现性</h2>' +
      '<p>换一个实验室、换一名操作者，在相同条件下应得到统计上一致的结论——这要求我们明确哪些是变量、哪些是常量。</p>' +
      '<h2>判定口径</h2>' +
      '<p>我们优先使用<strong>中位数</strong>与 <strong>95 分位</strong>，而不是均值；均值容易受极端样本影响。</p>',
  },
  {
    id: 'report-rate-explained',
    title: 'HDR 与峰值亮度解读：参数背后的真实观感',
    category: 'tech',
    categoryLabel: '技术',
    tag: '参数解读',
    tags: ['参数解读', 'HDR', '峰值亮度'],
    accent: false,
    desc: '峰值亮度与 HDR 常被简化为一个数字；本篇拆开窗口大小、持续亮度与调光方式对实际观感的影响。',
    date: '2026-08-12',
    author: '光魂编辑部',
    status: '已发布',
    cover: 'scene',
    meta: '解析 · 数据',
    readingMin: 5,
    body:
      '<h2>参数的含义</h2>' +
      '<p>峰值亮度通常按一定比例的窗口测量，窗口越小读数越高；持续亮度则更贴近长时间观看的实际表现。</p>' +
      '<h2>对观感的影响</h2>' +
      '<p>更高的峰值亮度让高光更有冲击力，但 HDR 的层次还取决于调光方式与色彩映射；<em>稳定性</em>往往比标称上限更重要。</p>' +
      '<h2>实践建议</h2>' +
      '<p>先用厂商推荐的 HDR 模式，再按内容类型逐步微调，调整后连续观看一段时间再评估。</p>',
  },
  {
    id: 'brand-2026-roadmap',
    title: '光魂 2026 显示器产品线规划：从面板到生态',
    category: 'news',
    categoryLabel: '资讯',
    tag: '产品规划',
    tags: ['产品规划', '品牌'],
    accent: true,
    desc: '围绕 OLED 面板、满速接口与色彩生态三条主线，说明下一代显示器在研发与测试上的取舍。',
    date: '2026-09-28',
    author: '光魂团队',
    status: '已发布',
    cover: 'case',
    meta: '品牌 · 规划',
    readingMin: 4,
    body:
      '<h2>产品线概览</h2>' +
      '<p>2026 年围绕三条主线：更先进的 OLED 面板、更完整的满速接口、更开放的色彩与调校生态。</p>' +
      '<h2>面板与接口</h2>' +
      '<p>面板方向从追求单一指标转向提升<strong>高分位稳定性</strong>；接口方向推进 DP 2.1 满速与多设备切换的可靠性。</p>' +
      '<h2>下一步</h2>' +
      '<p>具体要求与发布时间以官方最终公布为准，进展通过新闻与文章页面持续更新。</p>',
  },
]

/** 列表总量，供前端分页口径使用 */
export const ARTICLE_TOTAL = ARTICLES.length

/** 结构化小节正文（作者已并入文章摘要，可后台维护）；与摘要分离，详情按 id 合并 */
const ARTICLE_SECTIONS: Record<string, ArticleSection[]> = {
  'latency-end-to-end': [
      {
        heading: '测试目的与环境',
        paragraphs: [
          '本测试的目标是在统一条件下量化 OLED 电竞显示器从灰阶切换到画面稳定的响应时间，并将总响应拆成可解释的若干段。参与对比的三款显示器均为当期 OLED 旗舰，过驱档位统一设置为「标准」。',
          '测试在受控环境内进行，室温稳定在 22–24 ℃；显示器预热 30 分钟后再测量，信号源与线材全程保持不变，避免环境变量干扰结论。',
        ],
      },
      {
        heading: '响应时间的构成',
        paragraphs: [
          '响应时间通常由面板灰阶切换、驱动过驱与像素控光共同决定。只给出一个标称值，无法判断瓶颈到底在哪一段。',
          '我们按灰阶区间分别采集信号，定位每一环对总响应的贡献，再回到整机层面复核。这样得到的结论可以定位问题，也便于下一代产品明确优化方向。',
        ],
      },
      {
        heading: '实测数据与对比',
        paragraphs: [
          '每款显示器在同一档过驱下各采集 500 帧灰阶切换，去除首尾预热样本后统计。结果同时给出中位数与 95 分位，单次最低值仅作参考，不进入结论。',
          '三款产品的中位数差异不大，但在 95 分位上拉开了差距：稳定的高分位表现意味着连续移动画面时更少出现可感知的拖影。',
        ],
      },
      {
        heading: '结论与适用场景',
        paragraphs: [
          '在竞技场景中，稳定的高分位响应比偶发的单次最低值更有意义。追求更低拖影的玩家，应优先关注整条链路的稳定性，而非某一个参数的最大值。',
          '完整的原始数据、仪器清单与判定口径可在天梯榜页面查看；我们会在方法更新时同步标注版本号。',
        ],
      },
    ],
  'color-accuracy-delta-e': [
      {
        heading: '测试目的与环境',
        paragraphs: [
          '色准的差异往往被简化成一个 ΔE 数字。本测试在同一台色度计与同一套校准流程下，测量三块 OLED 面板的平均 ΔE 与最大偏差，尽量排除仪器与环境带来的干扰。',
          '测试在受控环境内进行，显示器预热 30 分钟后再测量，色温统一设为 6500K，测量范围覆盖 sRGB 与 DCI-P3 色域。',
        ],
      },
      {
        heading: '平均 ΔE 与最大偏差',
        paragraphs: [
          '平均 ΔE 反映整体色彩偏移，最大偏差则决定最坏情况下是否肉眼可辨。只看平均值容易掩盖个别色块的明显偏差。',
          '三块面板的平均 ΔE 都控制在校准目标以内，但最大偏差拉开了差距：偏差更集中的面板，在渐变与肤色区域的表现更稳定。',
        ],
      },
      {
        heading: '色域映射的影响',
        paragraphs: [
          '同一块面板在 sRGB 与 DCI-P3 下的表现并不一致。若色域映射不准确，高饱和画面会出现过饱和或色相偏移。',
          '因此判断色准是否够用，应同时看平均 ΔE、最大偏差与色域映射，而不是单看一个较小的平均值。',
        ],
      },
      {
        heading: '结论与选购建议',
        paragraphs: [
          '对修图与设计用户，优先选择平均 ΔE 低且偏差集中的型号，并在系统内加载出厂色彩配置以减少差异。',
          '对日常与影音用户，稳定的灰阶过渡比极端的高饱和表现更影响观感；完整数据可在天梯榜色准榜逐条对照。',
        ],
      },
    ],
  'tri-mode-keyboard-latency': [
      {
        heading: '两种模式的差异',
        paragraphs: [
          '双模显示器支持 4K@165 与 FHD@330 两种模式。两者在清晰度、刷新率与输入延迟上各有取舍，但厂商往往只强调其中一项。',
          '本次测试用同一台显示器切换两种模式，尽量排除线材与设置差异，只比较模式切换带来的变化。',
        ],
      },
      {
        heading: '双模切换实测',
        paragraphs: [
          '我们以高速相机采集画面从指令到显示的时间差，每种模式各记录 1,000 帧有效样本，统计中位数与抖动区间。',
          '结果显示，4K 与 FHD 的清晰度差距在日常使用中即可察觉；而在快速移动与高速镜头下，FHD@330 的运动清晰度更值得关注。',
        ],
      },
      {
        heading: '清晰度与刷新率',
        paragraphs: [
          '4K 模式在文字、图像与影视内容上细节更足，适合创作与观影；FHD@330 则以更高刷新率换取运动画面的顺滑与低延迟。',
          '切换模式后系统会重新识别分辨率与刷新率，建议同时确认线材与接口带宽是否满足。',
        ],
      },
      {
        heading: '如何选择',
        paragraphs: [
          '影视、修图与办公可优先 4K 高分辨率，追求极致响应的对战场景建议 FHD 高刷，固定工位可按内容一键切换。',
          '无论选择哪种模式，建议在 OSD 中确认刷新率与同步设置，避免因档位不一致而误判显示器性能。',
        ],
      },
    ],
  'driver-firmware-guide': [
      {
        heading: '校准前的准备',
        paragraphs: [
          '校准前请先在 OSD 中确认当前色域与色温设置，并让显示器预热 30 分钟，同时关闭系统的自适应亮度与夜间模式。',
          '建议关闭占用色彩管理的其它软件，校准期间不要切换输入源，也不要在过程中关闭显示器电源。',
        ],
      },
      {
        heading: '识别显示器与设置',
        paragraphs: [
          '打开系统显示设置或调校软件后，会读取已连接的显示器信息。若未识别到型号，请依次检查线材是否插紧、输入源是否正确，并尝试更换接口。',
          '识别成功后，显示器卡片会显示型号与当前色彩配置，与下载中心公布的出厂配置逐项核对即可。',
        ],
      },
      {
        heading: '执行校准与导出',
        paragraphs: [
          '按向导完成亮度、色温与色域校准后，导出 ICC 色彩配置并在系统中加载，即可获得与出厂校准接近的色彩表现。',
          '需要恢复出厂设置时，可在显示器的 OSD 中执行复位，再重新加载出厂色彩配置文件。',
        ],
      },
      {
        heading: '异常与回退',
        paragraphs: [
          '若校准过程中出现异常，请保持显示器连接，重新打开校准入口并按提示重试；如反复失败，可先在 OSD 中复位后再校准。',
          '需要回退出厂色彩时，可在下载中心获取对应色彩配置文件，按同样的流程加载。历史配置不会在发布新版本时被删除。',
        ],
      },
      {
        heading: '常见问题',
        paragraphs: [
          '校准后若观感发生变化，通常来自色温与亮度等设置的复位，请在 OSD 中核对并重新设定。',
          '仍无法解决时，请提交咨询并附上型号、当前配置与现象描述，处理进度可在个人中心跟进。',
        ],
      },
    ],
  'test-methodology': [
      {
        heading: '为什么要公开方法',
        paragraphs: [
          '一个孤立的数字很难被验证。公开测试方法，是为了让结论可以被检查、被复现，而不只是被相信。',
          '我们把仪器、环境、样本数与判定口径一并公开，任何人都可以按同一套流程得到可对照的结果。',
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
          '我们优先使用中位数与 95 分位，而不是均值。均值容易被极端样本拉偏，分位数更能反映连续使用时的真实表现。',
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
          '峰值亮度通常按 10% 或更小比例的窗口测量，窗口越小读数越高；持续亮度则更贴近长时间观看的实际表现。',
          '因此，单看一个峰值亮度的数字，无法判断显示器在电影、游戏等长画面下的真实亮度水平。',
        ],
      },
      {
        heading: '峰值亮度对观感的影响',
        paragraphs: [
          '更高的峰值亮度让高光更有冲击力，在 HDR 内容中能拉开明暗层次；但边际收益会随数值升高而递减。',
          '实际观感中，亮度的稳定性比它的标称上限更重要。长时间高亮后亮度骤降的画面，反而比稳定的中档亮度更影响体验。',
        ],
      },
      {
        heading: '调光方式的边界',
        paragraphs: [
          '调光方式决定暗场细节与频闪表现。当调光频率较低时，暗场可能缺少细节或出现可见频闪。',
          '因此，判断一块面板是否够用，应看亮度、调光与色彩映射是否匹配，而不是单看某一个更高的数字。',
        ],
      },
      {
        heading: '实践建议',
        paragraphs: [
          '对多数人而言，先用厂商推荐的 HDR 模式与亮度档位，再根据内容类型逐步微调，比直接拉满更稳妥。',
          '调整后建议连续使用一段时间再评估，避免因短期不适应而反复切换设置。',
        ],
      },
    ],
  'brand-2026-roadmap': [
      {
        heading: '产品线概览',
        paragraphs: [
          '2026 年的产品规划围绕三条主线展开：更先进的 OLED 面板、更完整的满速接口，以及更开放的色彩与调校生态。',
          '我们将继续以可复现的实测数据作为发布依据，参数、方法与来源随产品同步公开。',
        ],
      },
      {
        heading: '面板与接口',
        paragraphs: [
          '在面板方向上，重点从追求单一指标转向提升高分位稳定性，让连续画面中的响应与亮度更可预期。',
          '接口方面会推进 DP 2.1 满速与多设备切换的可靠性，减少在高刷下的带宽瓶颈。',
        ],
      },
      {
        heading: '色彩与生态',
        paragraphs: [
          '调校软件将承担更多 OSD 与色彩管理的职责，配置可随账号同步，换机后可快速恢复既有设定。',
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

/** 新闻与动态：与文章复用同一批内容，取品牌动态 / 产品发布类（首发四篇，供 /api/news 派生） */
const NEWS_ARTICLE_IDS = [
  'brand-2026-roadmap',
  'latency-end-to-end',
  'driver-firmware-guide',
  'test-methodology',
]

/**
 * 由文章集合派生新闻列表：字段与既有 NEWS 完全一致（date / tag / title / href），
 * 数据仍来自同一份文章集合（后台改文章 → 新闻同步反映）。
 */
export function buildNews(articles: ArticleSummary[]): NewsItem[] {
  return NEWS_ARTICLE_IDS.map((id) => articles.find((item) => item.id === id))
    .filter((item): item is ArticleSummary => item !== undefined && (item.status ?? '已发布') === '已发布')
    .map((item) => ({
      date: item.date,
      tag: item.categoryLabel,
      title: item.title,
      href: `/articles/${item.id}`,
      cover: item.cover,
      ...(item.coverImage ? { coverImage: item.coverImage } : {}),
    }))
}

/** 详情合并：摘要 + 小节正文，并按同分类优先挑选 3 篇相关阅读（摘要来自集合存储） */
export function getArticleDetail(articles: ArticleSummary[], id: string): ArticleDetail | null {
  const summary = articles.find((item) => item.id === id)
  const sections = ARTICLE_SECTIONS[id]
  if (!summary || !sections) return null
  const related = [...articles]
    .filter((item) => item.id !== id)
    .sort((a, b) => Number(b.category === summary.category) - Number(a.category === summary.category))
    .slice(0, 3)
  return { ...summary, sections, related }
}
