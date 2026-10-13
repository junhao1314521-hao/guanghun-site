/**
 * 服务支持深度线数据（前端占位层）：下载中心、常见问题、型号支持与联系方式。
 * 名称、版本、大小、日期与校验值均为占位内容，上线前由运营 / 研发替换为真实值。
 */

/* —— 下载中心 —— */

export type DownloadType = 'driver' | 'firmware' | 'manual' | 'tool'

export type DownloadItem = {
  id: string
  name: string
  category: string
  type: DownloadType
  models: string[]
  version: string
  size: string
  date: string
  note: string
}

/** 类别与类型筛选项（首项「全部」表示不筛选）；均作为下载中心 chip 的选项来源 */
export const DOWNLOAD_CATEGORIES = ['全部', '软件', '鼠标', '键盘', '耳机', '配件']
export const DOWNLOAD_TYPES = ['全部', '驱动', '固件', '说明书', '工具']

/** 类型枚举 → 中文标签（表格展示与 chip 过滤共用） */
export const DOWNLOAD_TYPE_LABELS: Record<DownloadType, string> = {
  driver: '驱动',
  firmware: '固件',
  manual: '说明书',
  tool: '工具',
}

export const DOWNLOAD_ITEMS: DownloadItem[] = [
  {
    id: 'center-win',
    name: 'Center 软件 · Windows 安装包',
    category: '软件',
    type: 'tool',
    models: ['全部支持型号'],
    version: 'v2.4.1',
    size: '86.4 MB',
    date: '2026-09-20',
    note: '支持 Windows 10 / 11（64 位）',
  },
  {
    id: 'center-mac',
    name: 'Center 软件 · macOS 安装包',
    category: '软件',
    type: 'tool',
    models: ['全部支持型号'],
    version: 'v2.4.1',
    size: '92.1 MB',
    date: '2026-09-20',
    note: '支持 macOS 12 及以上',
  },
  {
    id: 'm900-driver',
    name: 'GH-M900 PRO 驱动',
    category: '鼠标',
    type: 'driver',
    models: ['GH-M900 PRO'],
    version: 'v3.1.0',
    size: '12.6 MB',
    date: '2026-09-18',
    note: '含 DPI、回报率与宏调节',
  },
  {
    id: 'm900-firmware',
    name: 'GH-M900 PRO 固件升级包',
    category: '鼠标',
    type: 'firmware',
    models: ['GH-M900 PRO'],
    version: 'v1.6.3',
    size: '3.8 MB',
    date: '2026-09-15',
    note: '优化无线连接稳定性',
  },
  {
    id: 'm700-driver',
    name: 'GH-M700 驱动',
    category: '鼠标',
    type: 'driver',
    models: ['GH-M700', 'GH-M500'],
    version: 'v2.0.4',
    size: '11.8 MB',
    date: '2026-06-12',
    note: '兼容 GH-M500 参数调节',
  },
  {
    id: 'k870-driver',
    name: 'GH-K870 驱动',
    category: '键盘',
    type: 'driver',
    models: ['GH-K870'],
    version: 'v2.2.0',
    size: '14.2 MB',
    date: '2026-08-30',
    note: '支持按键重映射与宏',
  },
  {
    id: 'k870-firmware',
    name: 'GH-K870 固件升级包',
    category: '键盘',
    type: 'firmware',
    models: ['GH-K870', 'GH-K650'],
    version: 'v1.8.2',
    size: '4.2 MB',
    date: '2026-08-30',
    note: '修复休眠唤醒后偶发断连',
  },
  {
    id: 'k870-manual',
    name: 'GH-K870 使用说明书',
    category: '键盘',
    type: 'manual',
    models: ['GH-K870'],
    version: 'v1.3',
    size: '5.6 MB',
    date: '2026-07-20',
    note: '含三模连接与配对说明',
  },
  {
    id: 'h500-manual',
    name: 'GH-H500 使用说明书',
    category: '耳机',
    type: 'manual',
    models: ['GH-H500'],
    version: 'v1.2',
    size: '2.1 MB',
    date: '2026-07-18',
    note: '含 2.4G 配对与麦克风说明',
  },
  {
    id: 'p400-manual',
    name: 'GH-P400 使用说明书',
    category: '配件',
    type: 'manual',
    models: ['GH-P400'],
    version: 'v1.1',
    size: '1.4 MB',
    date: '2026-05-06',
    note: '含清洗与保养建议',
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
    { version: 'v3.1.0', date: '2026-09-18', notes: ['新增按场景保存参数预设', '修复个别系统下宏编辑偶发卡顿'] },
    { version: 'v3.0.4', date: '2026-07-02', notes: ['兼容新版 Center 界面', '优化设备识别速度'] },
  ],
  firmware: [
    { version: 'v1.8.2', date: '2026-08-30', notes: ['修复休眠唤醒后偶发断连', '优化低电量提示逻辑'] },
    { version: 'v1.7.0', date: '2026-05-11', notes: ['提升无线回报率稳定性'] },
  ],
  manual: [
    { version: 'v1.3', date: '2026-07-20', notes: ['补充连接与配对说明', '更新默认布局示意'] },
    { version: 'v1.2', date: '2026-04-10', notes: ['修正保养章节表述'] },
  ],
  tool: [
    { version: 'v2.4.1', date: '2026-09-20', notes: ['修复无线设备休眠唤醒后偶发断连', '优化配置云同步冲突提示'] },
    { version: 'v2.4.0', date: '2026-08-28', notes: ['新增配置云同步，多台设备共用一套配置'] },
  ],
}

const DOWNLOAD_INSTALL_STEPS: Record<DownloadType, string[]> = {
  driver: [
    '关闭 Center 与其它外设软件',
    '以管理员身份运行安装包',
    '按向导完成安装后重启电脑',
    '打开 Center 确认设备已被识别',
  ],
  firmware: [
    '用 USB 线连接设备并保持供电',
    '打开 Center 进入「固件更新」',
    '选择本升级包并等待校验完成',
    '升级过程中请勿断电或拔线，完成后设备会自动重启',
  ],
  manual: ['下载并打开说明书文件', '按目录定位到对应章节', '遇到问题可对照「常见问题」排查'],
  tool: ['下载对应系统的安装包', '双击安装并按提示完成', '首次启动后用 USB 连接设备', '登录账号即可同步已有配置'],
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

export type FaqItem = { id: string; q: string; a: string; category: string }

export type FaqDetail = FaqItem & { steps?: string[]; related: FaqItem[] }

/** 问答类别（首项「全部」表示不筛选） */
export const FAQ_CATEGORIES = ['全部', '下载与安装', '连接与配对', '固件与更新', '保修与售后']

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-download-login',
    q: '下载资料需要注册账号吗？',
    a: '不需要。公开的驱动、固件与说明书访客可直接下载；仅与账号相关的配置同步与工单进度需要登录。',
    category: '下载与安装',
  },
  {
    id: 'faq-download-old',
    q: '上传了新版本后，旧版本还能下载吗？',
    a: '可以。发布新版本不会删除旧版本，历史版本后台仍有记录；只有运营主动撤回后，前台才不再提供下载。',
    category: '下载与安装',
  },
  {
    id: 'faq-download-slow',
    q: '下载速度慢或中途中断怎么办？',
    a: '建议更换网络环境后重试；较大的安装包请避免在下载过程中切换网络。若多次中断，可提交咨询并附上资料名称。',
    category: '下载与安装',
  },
  {
    id: 'faq-driver-install',
    q: '安装驱动前需要先卸载旧版本吗？',
    a: '通常不需要。新版驱动会覆盖安装并保留已有配置；如遇识别异常，可先在「控制面板」卸载旧版后重新安装。',
    category: '下载与安装',
  },
  {
    id: 'faq-pair-24g',
    q: '无线设备无法进入 2.4G 模式怎么办？',
    a: '先确认接收器已插入并处于有线模式；再按设备上的模式切换键进入配对状态。若指示灯不闪，请先充电后再试。',
    category: '连接与配对',
  },
  {
    id: 'faq-pair-multi',
    q: '三模键盘如何在多台设备间切换？',
    a: '键盘可保存多条蓝牙配对记录，通过组合键在已配对设备间切换；切换后 Center 会显示当前连接通道。',
    category: '连接与配对',
  },
  {
    id: 'faq-pair-notfound',
    q: 'Center 识别不到设备怎么办？',
    a: '请用 USB 线直连（不要经 USB Hub），确认设备处于有线模式；无线设备需先完成配对，再回到 Center 刷新设备列表。',
    category: '连接与配对',
  },
  {
    id: 'faq-fw-fail',
    q: '固件更新失败后设备还能用吗？',
    a: '可以。更新中断不会清空原固件，设备仍可正常使用；重新连接后 Center 会提示重试。更新过程中请保持连接与供电。',
    category: '固件与更新',
  },
  {
    id: 'faq-fw-check',
    q: '怎么知道有没有新固件？',
    a: '打开 Center 进入「固件更新」即可查看当前版本与可用更新；有新版本时会集中提示，并附带变更说明。',
    category: '固件与更新',
  },
  {
    id: 'faq-warranty-period',
    q: '怎么确认产品是否在保修期内？',
    a: '在产品底部标签或包装盒上找到序列号，使用「保修状态查询」输入即可看到剩余时间；若查不到，请提交咨询并附上购买凭证。',
    category: '保修与售后',
  },
  {
    id: 'faq-warranty-serial',
    q: '序列号在哪里查看？',
    a: '序列号通常位于产品底部标签或包装盒条码处；部分无线设备可在 Center 的设备信息页直接查看。',
    category: '保修与售后',
  },
  {
    id: 'faq-warranty-repair',
    q: '寄修前需要准备什么？',
    a: '建议先提交咨询说明型号与现象，附上故障照片或视频；收到回复后再按指引寄出，并保留物流单号以便查询进度。',
    category: '保修与售后',
  },
]

/** 部分问答附带分步说明；未配置的问答详情不展示步骤区 */
const FAQ_STEPS: Record<string, string[]> = {
  'faq-pair-24g': ['长按模式切换键，直至指示灯快闪', '把 2.4G 接收器插入设备 USB 口', '等待约 3 秒，指示灯常亮即配对成功'],
  'faq-pair-multi': ['按住 Fn 加对应通道组合键', '在目标设备的蓝牙列表中完成配对', '再次按下该组合键即可切回该通道'],
  'faq-fw-check': ['用 USB 连接设备并打开 Center', '进入「固件更新」查看当前版本', '若有可用更新，阅读变更说明后再执行升级'],
  'faq-driver-install': ['卸载旧版本（如遇识别异常时）', '下载最新驱动并以管理员身份运行', '安装完成后重启电脑并打开 Center'],
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
  downloads: DownloadItem[]
  faqs: FaqItem[]
  guides: ModelGuide[]
}

/** 通用资料（适用「全部支持型号」）与型号专属资料一并返回 */
function downloadsFor(model: string): DownloadItem[] {
  return DOWNLOAD_ITEMS.filter(
    (item) => item.models.includes(model) || item.models.includes('全部支持型号'),
  )
}

function faqsByIds(...ids: string[]): FaqItem[] {
  return FAQ_ITEMS.filter((item) => ids.includes(item.id))
}

export const MODEL_SUPPORTS: ModelSupport[] = [
  {
    id: 'gh-m900-pro',
    model: 'GH-M900 PRO',
    line: '鼠标',
    summary: '旗舰无线电竞鼠标，支持 Center 调参与固件在线更新。',
    downloads: downloadsFor('GH-M900 PRO'),
    faqs: faqsByIds('faq-driver-install', 'faq-pair-24g', 'faq-fw-check'),
    guides: [
      { title: '快速上手', desc: '开箱、充电与 2.4G 配对的完整流程。' },
      { title: 'Center 调参', desc: 'DPI、回报率与宏的调节方法，含预设保存。' },
      { title: '连接排障', desc: '识别不到设备、断连与延迟偏高的排查步骤。' },
    ],
  },
  {
    id: 'gh-k870',
    model: 'GH-K870',
    line: '键盘',
    summary: '三模机械键盘，支持按键重映射、宏与多设备切换。',
    downloads: downloadsFor('GH-K870'),
    faqs: faqsByIds('faq-pair-multi', 'faq-pair-notfound', 'faq-fw-fail'),
    guides: [
      { title: '连接与配对', desc: '有线、蓝牙与 2.4G 三种连接方式的切换。' },
      { title: '按键与宏', desc: '逐键重映射与宏录制的基础用法。' },
      { title: '固件升级', desc: '通过 Center 完成固件升级与失败重试。' },
    ],
  },
  {
    id: 'gh-h500',
    model: 'GH-H500',
    line: '耳机',
    summary: '无线游戏耳机，支持 2.4G 低延迟连接与麦克风调节。',
    downloads: downloadsFor('GH-H500'),
    faqs: faqsByIds('faq-pair-24g', 'faq-pair-notfound', 'faq-warranty-serial'),
    guides: [
      { title: '快速上手', desc: '充电、开关机与 2.4G 配对的基础操作。' },
      { title: '麦克风调节', desc: '音量、监听与降噪相关设置说明。' },
      { title: '连接排障', desc: '无声、断续与识别不到的排查路径。' },
    ],
  },
  {
    id: 'gh-p400',
    model: 'GH-P400',
    line: '配件',
    summary: '超大鼠标垫，含清洗与保养建议。',
    downloads: downloadsFor('GH-P400'),
    faqs: faqsByIds('faq-warranty-serial', 'faq-download-old'),
    guides: [
      { title: '清洗与保养', desc: '日常清洁方式与避免的保养误区。' },
      { title: '尺寸与适配', desc: '桌面尺寸参考与常见搭配建议。' },
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
    { kind: 'chat', label: '在线咨询', value: '提交咨询工单', note: '提交后可在客户中心跟踪进度' },
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
export const INQUIRY_TOPICS = ['驱动与安装', '设备连接', '固件升级', '保修与售后', '其他']