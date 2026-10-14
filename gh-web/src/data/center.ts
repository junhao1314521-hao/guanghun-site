/** Center 软件页数据：版本号、大小、日期等均为占位示例，正式发布前须由研发提供真实值 */

// 显式放宽为 string：契约 §5.1 #7 采纳「值可变」口径，避免 typeof 收窄为字面量 "v2.4.1"
export const CENTER_VERSION: string = 'v2.4.1'

/** 核心能力：id 用作锚点（与主导航 Center 下拉菜单一致） */
export type Capability = { id: string; icon: 'grid' | 'keyboard' | 'sliders' | 'light' | 'refresh' | 'cloud'; title: string; desc: string }

export const CAPABILITIES: Capability[] = [
  { id: 'manage', icon: 'grid', title: '显示器统一管理', desc: '所有已连接的光魂显示器集中在一个列表里，输入源、刷新率与固件版本一眼可见。' },
  { id: 'macro', icon: 'keyboard', title: '预设与场景', desc: '亮度、色域与 HDR 等参数可保存为预设，按场景一键切换。' },
  { id: 'tuning', icon: 'sliders', title: 'OSD 与色彩管理', desc: '亮度、色域、色调与响应档位集中调节，口径与本站天梯榜一致。' },
  { id: 'lighting', icon: 'light', title: '护眼与氛围', desc: '低蓝光、无频闪与背光氛围可按场景联动，与游戏、办公场景的切换保持一致。' },
  { id: 'firmware', icon: 'refresh', title: '固件与驱动更新', desc: '检测到新版本时集中提示，更新前后都有版本与变更说明。' },
  { id: 'sync', icon: 'cloud', title: '配置云同步', desc: '登录后显示配置跟随账号同步，换设备或重装系统无需重新调一遍。' },
]

/** 功能深读 */
export type Feature = { eyebrow: string; title: string; desc: string; points: string[] }

export const FEATURES: Feature[] = [
  {
    eyebrow: 'FEATURE 01',
    title: '把调校做成预设',
    desc: '亮度、色域、色调与响应档位集中在同一处调节，可保存为预设并绑定到具体场景，切换一次即生效。',
    points: ['参数改动实时预览，可一键还原到出厂默认', '预设随场景切换，例如「对战 / 办公」两套', '所有参数口径与本站天梯榜测试方法一致'],
  },
  {
    eyebrow: 'FEATURE 02',
    title: '配置跟着账号走',
    desc: '登录光魂账号后，预设、色彩配置与护眼设置自动同步；换电脑、重装系统或到体验点试机，登录即可恢复。',
    points: ['本地与云端各留一份，离线也能用', '可查看配置的修改记录与同步时间', '多台设备共用同一套账号配置'],
  },
]

/** 支持的设备 */
export type DeviceSupport = { title: string; models: string; status: 'success' | 'muted'; statusText: string }

export const DEVICE_SUPPORT: DeviceSupport[] = [
  { title: 'OLED 旗舰显示器', models: '54027X1QE-W54 / 28027X1QE-W28', status: 'success', statusText: '全面支持' },
  { title: '双模高刷显示器', models: '32X1UE-W16 / 27X1U', status: 'success', statusText: '全面支持' },
  { title: '电竞 IPS 显示器', models: '27Q1F / 24H1 / 25S1FP', status: 'muted', statusText: '基础支持' },
]

/** 下载与安装 */
export type DownloadItem = { os: string; version: string; size: string; date: string }

export const DOWNLOADS: DownloadItem[] = [
  { os: 'Windows 10 / 11（64 位）', version: CENTER_VERSION, size: '86.4 MB', date: '2026-09-20' },
  { os: 'macOS 12 及以上', version: CENTER_VERSION, size: '92.1 MB', date: '2026-09-20' },
]

export const INSTALL_STEPS = ['下载对应系统的安装包并完成安装', '用 DP / USB-C 线连接显示器', 'Center 自动识别显示器，进入对应调校页']

export const REQUIREMENTS = [
  { k: '最低配置', v: '4 GB 内存 · 1 GB 可用空间' },
  { k: '推荐配置', v: '8 GB 内存 · 2 GB 可用空间' },
]

/** 更新日志 */
export type ChangelogItem = { version: string; date: string; title: string }

export const CHANGELOG: ChangelogItem[] = [
  { version: 'v2.4.1', date: '2026-09-20', title: '修复显示器在休眠唤醒后偶发无信号的问题' },
  { version: 'v2.4.0', date: '2026-08-28', title: '新增显示配置云同步，支持多台设备共用同一套账号配置' },
  { version: 'v2.3.2', date: '2026-07-15', title: 'HDR 与色域预设支持按场景条件切换与微调' },
  { version: 'v2.3.0', date: '2026-06-02', title: '界面改版，显示器列表与调校页合并为单页布局' },
]

/** 常见问题 */
export type Faq = { q: string; a: string }

export const CENTER_FAQS: Faq[] = [
  {
    q: '显示器接上后 Center 没有识别到，怎么办？',
    a: '请用 DP 或 USB-C 直连（不要经转接坞），确认显示器处于对应输入源；若仍无反应，可在「服务支持 → 下载中心」获取最新调校软件。',
  },
  { q: '云同步会覆盖我本地的配置吗？', a: '不会静默覆盖。当本地与云端不一致时会明确提示，由你选择保留哪一份，并保留修改记录。' },
  { q: '支持哪些操作系统版本？', a: 'Windows 10 及以上（64 位）与 macOS 12 及以上。更早的系统版本不保证可用，具体见「支持的设备」与系统要求。' },
  { q: '固件更新失败后显示器还能用吗？', a: '可以。更新中断不会清空原固件，显示器仍可正常使用；重新连接后 Center 会提示重试。更新过程中请保持连接与供电。' },
]
