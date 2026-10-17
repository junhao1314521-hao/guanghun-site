/**
 * 服务支持深度线数据（前端占位层）：下载中心、常见问题、型号支持与联系方式。
 * 名称、版本、大小、日期与校验值均为占位内容，上线前由运营 / 研发替换为真实值。
 */

/* —— 下载中心 —— */

/**
 * 下载资料类型（契约口径：说明书 / 固件 / 驱动 / 软件 / 调校配置 五类）。
 * 值即存储契约，需与后端 `gh-server/src/data/support-extra.ts` 保持一致。
 */
export type DownloadType = 'manual' | 'firmware' | 'driver' | 'software' | 'calibration'

export type DownloadItem = {
  id: string
  name: string
  category: string
  type: DownloadType
  /** 适用型号 id 列表（如 gh-54027x1qe）；通用资料用 ALL_MODELS 标记 */
  models: string[]
  /** 适用型号显示名（接口派生；前台展示优先使用） */
  modelNames?: string[]
  version: string
  size: string
  date: string
  note: string
  /** 适用平台（运营维护，缺省不展示） */
  platform?: string
  /** 适用操作系统（比 platform 更细）；缺省回退 platform */
  os?: string
  /** 发布时间（缺省回退 date） */
  releasedAt?: string
  /** 文件字节数（数值），用于排序 / 筛选 */
  sizeBytes?: number
  /** 同型号同类型的最新版标记 */
  isLatest?: boolean
  /** 校验算法标识（如 SHA-256） */
  checksumType?: string
  /** 被本版本替代的旧版本 id（预留） */
  supersedes?: string
  /** 可下载文件地址（来自后台 downloads.fileUrl；缺省则前台回退到下载详情页） */
  fileUrl?: string
}

/** 类别与类型筛选项（首项「全部」表示不筛选）；均作为下载中心 chip 的选项来源 */
export const ALL_MODELS = 'all'
export const DOWNLOAD_CATEGORIES = ['全部', '软件', 'OLED 旗舰', '双模高刷', '电竞 IPS', '周边']
export const DOWNLOAD_TYPES = ['全部', '说明书', '固件', '驱动', '软件', '调校配置']

/** 类型枚举 → 中文标签（表格展示与 chip 过滤共用） */
export const DOWNLOAD_TYPE_LABELS: Record<DownloadType, string> = {
  manual: '说明书',
  firmware: '固件',
  driver: '驱动',
  software: '软件',
  calibration: '调校配置',
}

export const DOWNLOAD_ITEMS: DownloadItem[] = [
  {
    id: 'center-win',
    name: 'Center 显示器调校软件 · Windows 安装包',
    category: '软件',
    type: 'software',
    models: [ALL_MODELS],
    version: 'v2.4.1',
    size: '86.4 MB',
    date: '2026-09-20',
    note: '支持 Windows 10 / 11（64 位）',
    os: 'Windows 10 / 11（64 位）',
    releasedAt: '2026-09-20',
    sizeBytes: 90596966,
    isLatest: true,
    checksumType: 'SHA-256',
  },
  {
    id: 'center-mac',
    name: 'Center 显示器调校软件 · macOS 安装包',
    category: '软件',
    type: 'software',
    models: [ALL_MODELS],
    version: 'v2.4.1',
    size: '92.1 MB',
    date: '2026-09-20',
    note: '支持 macOS 12 及以上',
    os: 'macOS 12 及以上',
    releasedAt: '2026-09-20',
    sizeBytes: 96573850,
    isLatest: true,
    checksumType: 'SHA-256',
  },
  {
    id: 'gh-54027x1qe-firmware',
    name: '54027X1QE-W54 固件升级包',
    category: 'OLED 旗舰',
    type: 'firmware',
    models: ['gh-54027x1qe'],
    version: 'v1.6.3',
    size: '3.8 MB',
    date: '2026-09-15',
    note: '优化 DP 2.1 满速握手与 HDR 调校',
    releasedAt: '2026-09-15',
    sizeBytes: 3984589,
    isLatest: true,
    checksumType: 'SHA-256',
  },
  {
    id: 'gh-54027x1qe-icc',
    name: '54027X1QE-W54 色彩配置文件（ICC）',
    category: 'OLED 旗舰',
    type: 'calibration',
    models: ['gh-54027x1qe'],
    version: 'v2.1',
    size: '1.2 MB',
    date: '2026-09-12',
    note: '含 sRGB / DCI-P3 两套色彩配置',
    os: 'Windows / macOS',
    releasedAt: '2026-09-12',
    sizeBytes: 1258291,
    isLatest: true,
    checksumType: 'SHA-256',
  },
  {
    id: 'gh-32x1ue-driver',
    name: '32X1UE-W16 显示器驱动（INF）',
    category: '双模高刷',
    type: 'driver',
    models: ['gh-32x1ue'],
    version: 'v1.2.0',
    size: '2.6 MB',
    date: '2026-09-08',
    note: '含双模切换与色彩配置文件注册',
    os: 'Windows 10 / 11',
    releasedAt: '2026-09-08',
    sizeBytes: 2726298,
    isLatest: true,
    checksumType: 'SHA-256',
  },
  {
    id: 'gh-32x1ue-manual',
    name: '32X1UE-W16 使用说明书',
    category: '双模高刷',
    type: 'manual',
    models: ['gh-32x1ue'],
    version: 'v1.3',
    size: '5.6 MB',
    date: '2026-09-05',
    note: '含双模切换与 OSD 菜单说明',
    os: '全平台',
    releasedAt: '2026-09-05',
    sizeBytes: 5872026,
    isLatest: true,
    checksumType: 'SHA-256',
  },
  {
    id: 'gh-27q1f-driver',
    name: '27Q1F 显示器驱动（INF）',
    category: '电竞 IPS',
    type: 'driver',
    models: ['gh-27q1f'],
    version: 'v2.0.4',
    size: '11.8 MB',
    date: '2026-06-12',
    note: 'Windows 下识别型号与色域映射',
    os: 'Windows 10 / 11',
    releasedAt: '2026-06-12',
    sizeBytes: 12373197,
    isLatest: true,
    checksumType: 'SHA-256',
  },
  {
    id: 'gh-27q1f-manual',
    name: '27Q1F 使用说明书',
    category: '电竞 IPS',
    type: 'manual',
    models: ['gh-27q1f'],
    version: 'v1.1',
    size: '4.2 MB',
    date: '2026-04-10',
    note: '含 OSD 调校与 HDR 设置说明',
    os: '全平台',
    releasedAt: '2026-04-10',
    sizeBytes: 4404019,
    isLatest: true,
    checksumType: 'SHA-256',
  },
  {
    id: 'gh-24h1-icc',
    name: '24H1 色彩配置文件（ICC）',
    category: '电竞 IPS',
    type: 'calibration',
    models: ['gh-24h1'],
    version: 'v1.0',
    size: '0.9 MB',
    date: '2026-02-26',
    note: '含 sRGB 出厂校准配置',
    os: 'Windows / macOS',
    releasedAt: '2026-02-26',
    sizeBytes: 943718,
    isLatest: true,
    checksumType: 'SHA-256',
  },
  {
    id: 'gh-arm01-manual',
    name: 'GH-ARM01 安装说明书',
    category: '周边',
    type: 'manual',
    models: ['gh-arm01'],
    version: 'v1.2',
    size: '2.1 MB',
    date: '2026-05-20',
    note: '含 VESA 75/100 安装与承重说明',
    os: '全平台',
    releasedAt: '2026-05-20',
    sizeBytes: 2202010,
    isLatest: true,
    checksumType: 'SHA-256',
  },
]

export type DownloadChangelogEntry = { version: string; date: string; notes: string[] }

export type DownloadDetail = DownloadItem & {
  changelog: DownloadChangelogEntry[]
  installSteps: string[]
  sha256: string
  /** 可下载文件地址（来自后台 downloads.fileUrl；后端就绪前可能为空 → 前台保持占位提示，不裂链） */
  fileUrl?: string
}

/** 按类型给出变更日志与安装步骤模板，避免逐条重复 */
const DOWNLOAD_CHANGELOG: Record<DownloadType, DownloadChangelogEntry[]> = {
  driver: [
    { version: 'v3.1.0', date: '2026-09-18', notes: ['新增按分辨率保存显示预设', '修复个别接口下偶发无信号'] },
    { version: 'v3.0.4', date: '2026-07-02', notes: ['兼容新版 Center 界面', '优化显示器识别速度'] },
  ],
  firmware: [
    { version: 'v1.8.2', date: '2026-08-30', notes: ['修复 DP 2.1 满速握手偶发降速', '优化 OSD 固件响应速度'] },
    { version: 'v1.7.0', date: '2026-05-11', notes: ['提升高刷下的色彩稳定性'] },
  ],
  manual: [
    { version: 'v1.3', date: '2026-07-20', notes: ['补充双模切换与 OSD 说明', '更新接口与支架示意'] },
    { version: 'v1.2', date: '2026-04-10', notes: ['修正出厂色彩章节表述'] },
  ],
  software: [
    { version: 'v2.4.1', date: '2026-09-20', notes: ['修复显示器休眠唤醒后偶发无信号', '优化色彩配置同步冲突提示'] },
    { version: 'v2.4.0', date: '2026-08-28', notes: ['新增显示配置云同步，多台设备共用一套配置'] },
  ],
  calibration: [
    { version: 'v2.1', date: '2026-09-12', notes: ['更新 sRGB / DCI-P3 双色彩配置', '修正暗部灰阶偏移'] },
    { version: 'v2.0', date: '2026-06-18', notes: ['随新版固件同步出厂校准数据'] },
  ],
}

const DOWNLOAD_INSTALL_STEPS: Record<DownloadType, string[]> = {
  driver: [
    '关闭其它显示调校软件',
    '以管理员身份运行安装包',
    '按向导完成安装后重启电脑',
    '在「显示设置」中确认型号已被识别',
  ],
  firmware: [
    '用 DP / USB-C 线连接显示器并保持供电',
    '打开 Center 进入「固件更新」',
    '选择本升级包并等待校验完成',
    '升级过程中请勿断电或拔线，完成后显示器会自动重启',
  ],
  manual: ['下载并打开说明书文件', '按目录定位到对应章节', '遇到问题可对照「常见问题」排查'],
  software: ['下载对应系统的安装包', '双击安装并按提示完成', '首次启动后连接显示器', '登录账号即可同步已有显示配置'],
  calibration: ['下载对应型号的色彩配置文件（ICC）', '在系统「显示」设置中导入并指定该配置文件', '在 Center 中应用同一套显示预设后即可生效'],
}

/** 由 id 生成确定性的 64 位占位校验值，供界面展示校验字段结构（非真实摘要） */
function placeholderSha(id: string): string {
  let hex = ''
  for (let i = 0; i < 64; i += 1) {
    const code = id.charCodeAt(i % id.length) + i * 7
    hex += (code % 16).toString(16)
  }
  return hex
}

/** 下载详情：命中返回详情，未命中返回 undefined（由接口层映射 404） */
export function getDownloadDetail(id: string): DownloadDetail | undefined {
  const item = DOWNLOAD_ITEMS.find((entry) => entry.id === id)
  if (!item) return undefined
  return {
    ...item,
    changelog: DOWNLOAD_CHANGELOG[item.type],
    installSteps: DOWNLOAD_INSTALL_STEPS[item.type],
    sha256: placeholderSha(item.id),
  }
}

/* —— 常见问题 —— */

export type FaqItem = { id: string; q: string; a: string; category: string; /** 操作步骤（可后台维护） */ steps?: string[] }

export type FaqDetail = FaqItem & { steps?: string[]; related: FaqItem[] }

/** 问答类别（首项「全部」表示不筛选）；口径：安装 / 连接 / HDR / 售后 四类（MECE） */
export const FAQ_CATEGORIES = ['全部', '安装', '连接', 'HDR', '售后']

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-download-login',
    q: '下载显示器固件、说明书与色彩配置需要注册账号吗？',
    a: '不需要。公开的固件、说明书、ICC 色彩配置与调校软件访客可直接下载；仅与账号相关的配置同步与工单进度需要登录。',
    category: '安装',
  },
  {
    id: 'faq-download-old',
    q: '上传了新固件后，旧固件还能下载吗？',
    a: '可以。发布新版本不会删除旧版本，历史版本后台仍有记录；只有运营主动撤回后，前台才不再提供下载。',
    category: '安装',
  },
  {
    id: 'faq-download-slow',
    q: '下载速度慢或中途中断怎么办？',
    a: '建议更换网络环境后重试；较大的安装包（如调校软件）请避免在下载过程中切换网络。若多次中断，可提交咨询并附上资料名称。',
    category: '安装',
  },
  {
    id: 'faq-driver-install',
    q: '升级显示器固件前需要先卸载旧版本吗？',
    a: '通常不需要。新版固件会覆盖写入并保留已有设置；如遇识别异常，可先在 Center 中重新检测显示器后再升级。',
    category: '安装',
  },
  {
    id: 'faq-pair-24g',
    q: 'DP 2.1 连接后为什么跑不满 540Hz？',
    a: '请使用随附的满速 DP 2.1（80 Gbps）线材，并在 OSD 与显卡驱动中都开启对应刷新率；线材或转接器带宽不足会锁定到较低刷新率。仍无法跑满时请提交咨询。',
    category: '连接',
  },
  {
    id: 'faq-pair-multi',
    q: '双模显示器如何在 4K 与高刷模式间切换？',
    a: '通过 OSD 菜单或 Center 中的「双模切换」选择 4K@165 或 FHD@330；切换后系统会重新识别分辨率与刷新率，建议同时确认线材与接口带宽。',
    category: '连接',
  },
  {
    id: 'faq-pair-notfound',
    q: 'Center 识别不到显示器怎么办？',
    a: '请用 DP 或 USB-C 直连（不要经转接坞），确认显示器处于对应输入源；若仍无反应，可在「服务支持 → 下载中心」获取最新调校软件后重试。',
    category: '连接',
  },
  {
    id: 'faq-hdr-grey',
    q: '开启 HDR 后画面发灰、色彩变淡怎么办？',
    a: '先在 Windows「显示 → HDR」中确认显示器已切换到 HDR 模式，再按内容类型选择对应的 HDR 预设（如 HDR 电影 / HDR 游戏）；避免在 HDR 下继续套用 sRGB 预设，否则会出现色彩偏淡与灰阶压缩。',
    category: 'HDR',
  },
  {
    id: 'faq-hdr-brightness',
    q: 'HDR 下的峰值亮度为什么比 SDR 低？',
    a: 'HDR 调校以整体亮度与高光动态范围为目标：为保护高光细节，稳定窗口亮度会低于 SDR 全屏峰值。若用于长时间办公，建议切回 SDR 或降低 HDR 亮度档以减轻眼睛负担。',
    category: 'HDR',
  },
  {
    id: 'faq-fw-fail',
    q: '固件更新失败后显示器还能用吗？',
    a: '可以。更新中断不会清空原固件，显示器仍可正常使用；重新连接后 Center 会提示重试。更新过程中请保持连接与供电。',
    category: '售后',
  },
  {
    id: 'faq-fw-check',
    q: '怎么知道有没有新固件？',
    a: '打开 Center 进入「固件更新」即可查看当前版本与可用更新；有新版本时会集中提示，并附带变更说明。',
    category: '售后',
  },
  {
    id: 'faq-warranty-period',
    q: 'OLED 显示器保修多久，是否包含烧屏保护？',
    a: '整机三年质保，含 OLED 烧屏保护；在显示器底部标签或包装盒上找到序列号，使用「保修状态查询」输入即可看到剩余时间。',
    category: '售后',
  },
  {
    id: 'faq-warranty-serial',
    q: '序列号在哪里查看？',
    a: '序列号通常位于显示器底部标签或包装盒条码处；也可在 Center 的设备信息页直接查看。',
    category: '售后',
  },
  {
    id: 'faq-warranty-repair',
    q: '寄修前需要准备什么？',
    a: '建议先提交咨询说明型号与现象，附上故障照片或视频；收到回复后再按指引寄出，并保留物流单号以便查询进度。',
    category: '售后',
  },
]

/** 部分问答附带分步说明；未配置的问答详情不展示步骤区 */
const FAQ_STEPS: Record<string, string[]> = {
  'faq-pair-24g': ['确认使用满速 DP 2.1（80 Gbps）线材', '在 OSD 与显卡驱动中开启对应刷新率', '若仍锁定低刷，更换线材或接口后重试'],
  'faq-pair-multi': ['打开 OSD 菜单，进入「双模切换」', '选择 4K@165 或 FHD@330 目标模式', '等待系统重新识别分辨率与刷新率'],
  'faq-fw-check': ['用 DP / USB-C 连接显示器并打开 Center', '进入「固件更新」查看当前版本', '若有可用更新，阅读变更说明后再执行升级'],
  'faq-driver-install': ['在 Center 中重新检测显示器', '下载最新固件并以管理员身份运行', '升级完成后重启显示器与电脑'],
  'faq-hdr-grey': ['在系统「显示 → HDR」中确认已开启 HDR', '按内容类型选择对应的 HDR 预设', '确认未同时套用 sRGB 预设，必要时重置显示配置'],
  'faq-warranty-repair': ['提交咨询并说明型号与现象', '附上购买凭证与故障照片', '按回复指引寄出并保留物流单号'],
}

export function getFaqDetail(id: string): FaqDetail | undefined {
  const item = FAQ_ITEMS.find((entry) => entry.id === id)
  if (!item) return undefined
  const related = FAQ_ITEMS.filter((entry) => entry.category === item.category && entry.id !== id).slice(0, 3)
  return { ...item, steps: FAQ_STEPS[item.id], related }
}

/* —— 型号支持 —— */

export type ModelGuide = { title: string; desc: string }

export type ModelSupport = {
  id: string
  model: string
  line: string
  summary: string
  faqs: FaqItem[]
  guides: ModelGuide[]
}

/* ⚠️ 型号与下载的关联**不再内嵌快照**（原 `ModelSupport.downloads` + `downloadsFor()` 已删除）：
   型号页改为「按 `model` 过滤下载集合」——后台改一条下载，下载中心与型号页同时生效。
   过滤口径：`item.models` 含该型号 id，或含通用标记 `ALL_MODELS`（'all'）。 */

function faqsByIds(...ids: string[]): FaqItem[] {
  return FAQ_ITEMS.filter((item) => ids.includes(item.id))
}

export const MODEL_SUPPORTS: ModelSupport[] = [
  {
    id: 'gh-54027x1qe',
    model: '54027X1QE-W54',
    line: 'OLED旗舰',
    summary: '26.5 英寸 2K@540Hz 旗舰 OLED 电竞显示器，支持 DP 2.1 满速与 Center 调校。',
    faqs: faqsByIds('faq-driver-install', 'faq-pair-24g', 'faq-fw-check'),
    guides: [
      { title: '快速上手', desc: '开箱、支架安装与 DP 2.1 满速连接的完整流程。' },
      { title: 'OSD 与色彩调校', desc: '亮度、色域与 HDR 的调节方法，含预设保存。' },
      { title: '接口排障', desc: '无法跑满刷新率、无信号与识别不到的排查步骤。' },
    ],
  },
  {
    id: 'gh-32x1ue',
    model: '32X1UE-W16',
    line: '双模高刷',
    summary: '31.5 英寸 4K@165 / FHD@330 双模 OLED 电竞显示器，一机兼顾画质与竞技。',
    faqs: faqsByIds('faq-pair-multi', 'faq-pair-notfound', 'faq-fw-fail'),
    guides: [
      { title: '双模切换', desc: '4K@165 与 FHD@330 两种模式的切换与取舍。' },
      { title: 'OSD 与 HDR', desc: 'HDR 调校与峰值亮度设置的用法。' },
      { title: '固件升级', desc: '通过 Center 完成固件升级与失败重试。' },
    ],
  },
  {
    id: 'gh-27q1f',
    model: '27Q1F',
    line: '电竞IPS',
    summary: '27 英寸 2K 200Hz Fast IPS 电竞显示器，兼容 HDMI 2.1，兼顾日常与竞技。',
    faqs: faqsByIds('faq-pair-24g', 'faq-pair-notfound', 'faq-warranty-serial'),
    guides: [
      { title: '快速上手', desc: '开箱、支架安装与 HDMI 2.1 连接的基础操作。' },
      { title: '色彩与护眼', desc: '色域、亮度与低蓝光相关设置说明。' },
      { title: '接口排障', desc: '无信号、刷新率不达标与识别不到的排查路径。' },
    ],
  },
  {
    id: 'gh-24h1',
    model: '24H1',
    line: '电竞IPS',
    summary: '23.8 英寸 FHD 200Hz 电竞显示器，支持 HDR400，面向入门与日常办公。',
    faqs: faqsByIds('faq-pair-notfound', 'faq-warranty-serial'),
    guides: [
      { title: '快速上手', desc: '开箱、支架安装与 HDMI 连接的基础操作。' },
      { title: '色彩与护眼', desc: '色域、亮度与低蓝光相关设置说明。' },
    ],
  },
  {
    id: 'gh-arm01',
    model: 'GH-ARM01',
    line: '周边',
    summary: '显示器悬臂支架，支持 VESA 75/100 与 9 kg 承重，含安装与调节说明。',
    faqs: faqsByIds('faq-warranty-serial', 'faq-download-old'),
    guides: [
      { title: '安装与调节', desc: 'VESA 75/100 安装与气压调节说明。' },
      { title: '承重与适配', desc: '承重范围与常见尺寸搭配建议。' },
    ],
  },
]

export function getModelSupport(id: string): ModelSupport | undefined {
  return MODEL_SUPPORTS.find((entry) => entry.id === id)
}

/* —— 联系方式 —— */

export type ContactChannel = { kind: 'phone' | 'mail' | 'chat'; label: string; value: string; note: string }
export type ContactOffice = { city: string; address: string; phone: string; hours: string }
export type ContactHours = { days: string; time: string }

export type ContactPayload = {
  channels: ContactChannel[]
  offices: ContactOffice[]
  hours: ContactHours[]
}

export const CONTACT_PAYLOAD: ContactPayload = {
  channels: [
    { kind: 'phone', label: '客服热线', value: '400-000-0000', note: '周一至周日 09:00–21:00' },
    { kind: 'mail', label: '技术支持邮箱', value: 'support@guanghun.example', note: '1 个工作日内回复' },
    { kind: 'chat', label: '在线咨询', value: '提交咨询工单', note: '提交后可在个人中心跟踪进度' },
  ],
  offices: [
    { city: '上海', address: '静安区（详细地址以官方公布为准）', phone: '400-000-0000', hours: '10:00–21:00' },
    { city: '深圳', address: '南山区（详细地址以官方公布为准）', phone: '400-000-0000', hours: '10:00–21:00' },
    { city: '北京', address: '朝阳区（详细地址以官方公布为准）', phone: '400-000-0000', hours: '10:00–20:00' },
    { city: '成都', address: '高新区（详细地址以官方公布为准）', phone: '400-000-0000', hours: '筹备中，暂不接待' },
  ],
  hours: [
    { days: '周一至周五', time: '09:00–21:00' },
    { days: '周六、周日', time: '10:00–20:00' },
    { days: '法定节假日', time: '以公告为准' },
  ],
}

/** 咨询主题选项（提交咨询表单的下拉来源） */
export const INQUIRY_TOPICS = ['固件与调校', '接口与连接', '色彩与 HDR', '保修与售后', '其他']
