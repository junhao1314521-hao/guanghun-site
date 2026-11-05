/** 光魂 Center 介绍页内容（全部对齐真实软件 v1.3.3，不使用虚构功能） */

export type TabId = 'basic' | 'gaming' | 'pro' | 'image' | 'input' | 'system'

export type Tab = {
  id: TabId
  label: string
  en: string
  desc: string
}

export const TABS: Tab[] = [
  { id: 'basic', label: '基本功能', en: 'DISPLAY', desc: '亮度、对比度、预设模式' },
  { id: 'gaming', label: '电竞设置', en: 'ESPORTS', desc: '暗部增强、辅助准心、刷新率' },
  { id: 'pro', label: '专业设置', en: 'COLOR', desc: '色域、色温、伽马、六轴' },
  { id: 'image', label: '图像调节', en: 'IMAGE', desc: 'HDR、DSC、RGB 增益' },
  { id: 'input', label: '输入源', en: 'INPUT', desc: 'DP / HDMI / USB-C' },
  { id: 'system', label: '系统设置', en: 'SYSTEM', desc: '灯效、音量、恢复出厂' },
]

/** 首屏与总览共用：6 个真实功能模块 */
export const CAPABILITIES: { tab: TabId; no: string; title: string; desc: string }[] = [
  { tab: 'basic', no: '01', title: '基础显示', desc: '亮度、对比度、方向与 8 档预设模式，一屏调完。' },
  { tab: 'gaming', no: '02', title: '电竞增强', desc: '暗部增强、辅助准心、刷新率显示，按游戏切换。' },
  { tab: 'pro', no: '03', title: '专业色彩', desc: '色域、色温、伽马、RGB 增益与六轴饱和度 / 色调。' },
  { tab: 'image', no: '04', title: '图像调节', desc: 'HDR、DSC、清晰度与动态亮度，按面板能力开放。' },
  { tab: 'input', no: '05', title: '输入与双模', desc: 'DP / HDMI / USB-C 切换，双模高刷一键换挡。' },
  { tab: 'system', no: '06', title: '设备与升级', desc: '灯效、语言、音量与固件 OTA，都在同一个窗口。' },
]

/** 场景预设：参数全部是软件里真实存在的项 */
export type Scene = {
  id: 'fps' | 'create' | 'office'
  title: string
  en: string
  desc: string
  preset: string
  brightness: number
  contrast: number
  blackBoost: number
  crosshair: number
  hdr: boolean
  gamut: string
  temp: string
  sat: number
}

export const SCENES: Scene[] = [
  {
    id: 'fps',
    title: '对战',
    en: 'FPS',
    desc: '高亮 + 暗部增强，准心常驻',
    preset: 'FPS',
    brightness: 88,
    contrast: 62,
    blackBoost: 68,
    crosshair: 2,
    hdr: true,
    gamut: 'sRGB',
    temp: '冷色温 2',
    sat: 54,
  },
  {
    id: 'create',
    title: '创作',
    en: 'CREATE',
    desc: 'DCI-P3 + 中性色温',
    preset: '标准',
    brightness: 62,
    contrast: 50,
    blackBoost: 46,
    crosshair: 0,
    hdr: false,
    gamut: 'DCI-P3',
    temp: '暖色温 1',
    sat: 60,
  },
  {
    id: 'office',
    title: '办公',
    en: 'OFFICE',
    desc: '低蓝光 + 柔和亮度',
    preset: '低蓝光',
    brightness: 52,
    contrast: 44,
    blackBoost: 38,
    crosshair: 0,
    hdr: false,
    gamut: 'sRGB',
    temp: '暖色温 2',
    sat: 46,
  },
]

export const PRESETS = ['标准', 'E-SPORTS', 'FPS', 'RTS', 'MAC', '低蓝光', '玩家1', '玩家2']
export const GAMUTS = ['sRGB', 'DCI-P3', 'Adobe RGB']
export const TEMPS = ['暖色温 2', '暖色温 1', '冷色温 1', '冷色温 2', '自定义']
export const LIGHTING = ['白色', '呼吸', '流水']
export const CROSSHAIRS = ['关闭', '准心 1', '准心 2', '准心 3', '准心 4']
export const SOURCES = ['DP', 'HDMI', 'USB-C', '自动']

/** 真实支持型号（来自官方 control-sw 接口） */
export const DEVICE_MODELS = ['27X1QE-500', '27X1QE-Q32', '32X1UE-Q24', '27X1QE-W54']

/** 真实版本信息兜底（接口失败时使用；正常情况下取下载中心实时数据） */
export type CenterDownload = {
  version: string
  size: string
  date: string
  os: string
  url: string
  sha256: string
}

export const CENTER_FALLBACK: CenterDownload = {
  version: 'v1.3.3',
  size: '4.5 MB',
  date: '2026-11-04',
  os: 'Windows 10 / 11（64 位）',
  url: '/uploads/Center-1.3.3-win64-setup.exe',
  sha256: 'C9AE23AE8F61C1AE1769A33071C480D4C0367506EB08511FA838C7A71C3D7EAF',
}

export const FAQS = [
  {
    q: '显示器接上后 Center 没有识别到，怎么办？',
    a: '请用 DP 或 USB-C 直连（不要经转接坞），确认显示器处于对应输入源，并在显示器 OSD 菜单里开启 DDC/CI；开启后回到 Center 点一次刷新。',
  },
  {
    q: '支持哪些操作系统？',
    a: 'Windows 10 / 11 64 位。当前暂不提供 macOS 版本，更早的 Windows 版本不保证可用。',
  },
  {
    q: '应用联动是怎么工作的？',
    a: '选择一个 Windows 进程和对应预设模式后，该程序进入前台时 Center 自动切换模式，离开或退出后恢复原模式；也可以选择「运行模式」，只按进程是否运行来切换。',
  },
  {
    q: '固件升级中途失败，显示器还能用吗？',
    a: '可以。升级中断不会清空原固件，显示器仍可正常使用；重新连接后 Center 会提示重试，升级过程中请保持连接与供电。',
  },
]

/** 功能深读：只讲软件真实具备的三件事 */
export const FEATURES = [
  {
    id: 'link',
    eyebrow: 'FEATURE / 01',
    title: '一个进程，一套预设',
    desc: '把游戏进程和预设模式绑定：进入前台自动切到 FPS 或 RTS，退出后恢复原来的模式。',
    points: ['前台模式 / 运行模式两种触发方式', '多个程序同时满足时按列表顺序优先', '联动结束自动恢复，不需要手动改回'],
  },
  {
    id: 'firmware',
    eyebrow: 'FEATURE / 02',
    title: '固件升级，交给它',
    desc: '检查版本、下载、校验、安装都在 Center 里完成。中断不会损坏设备，重新连接就能继续。',
    points: ['升级前显示版本与变更说明', '安装包校验通过后才执行', '失败可重试，原有固件保留'],
  },
  {
    id: 'startup',
    eyebrow: 'FEATURE / 03',
    title: '开机就在，不用重设',
    desc: '登录 Windows 后自动启动，并恢复上一次的显示设置。换一台电脑，重新连上就好。',
    points: ['开机自启动可单独开关', '记忆并恢复亮度、色彩与预设', '关闭记忆时只读取，不写回显示器'],
  },
]
