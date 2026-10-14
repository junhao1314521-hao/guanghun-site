/** 服务支持页数据：文案、版本号与状态均为占位示例，上线前由运营替换 */

export type QuickEntry = {
  id: 'download' | 'firmware' | 'warranty' | 'faq' | 'warranty-status' | 'verify'
  title: string
  desc: string
}

export const QUICK_ENTRIES: QuickEntry[] = [
  { id: 'download', title: '下载中心', desc: '固件、说明书、色彩配置与调校软件，公开资料无需登录即可下载。' },
  { id: 'firmware', title: '固件与调校', desc: '按型号获取最新固件与色彩配置，附版本变更说明。' },
  { id: 'warranty', title: '保修政策', desc: '整机三年质保含 OLED 烧屏保护，范围与期限条款公开可查。' },
  { id: 'faq', title: '常见问题', desc: '安装、接口、HDR 调校与售后相关的高频问答与图文教程。' },
  { id: 'warranty-status', title: '保修状态查询', desc: '输入序列号即可查看保修剩余时间与保修类型。' },
  { id: 'verify', title: '真伪查询', desc: '核对防伪码，确认渠道与产品是否为正品。' },
]

export const DOWNLOAD_CATEGORIES = ['全部', '显示器', '调校软件', '周边']
export const DOWNLOAD_TYPES = ['固件', '说明书', '色彩配置']

export type DownloadRow = {
  name: string
  models: string
  version: string
  size: string
  date: string
}

export const DOWNLOADS: DownloadRow[] = [
  { name: 'Center 显示器调校软件 · Windows 安装包', models: '54027X1QE-W54 / 32X1UE-W16', version: 'v2.4.1', size: '86.4 MB', date: '2026-09-20' },
  { name: 'Center 显示器调校软件 · macOS 安装包', models: '全部支持型号', version: 'v2.4.1', size: '92.1 MB', date: '2026-09-20' },
  { name: '54027X1QE-W54 固件升级包', models: '54027X1QE-W54', version: 'v1.6.3', size: '3.8 MB', date: '2026-09-15' },
  { name: '32X1UE-W16 使用说明书', models: '32X1UE-W16', version: 'v1.3', size: '5.6 MB', date: '2026-09-05' },
]

export const WARRANTY_POINTS = [
  '整机三年质保，含 OLED 烧屏保护；支架等周边按易损件单独约定',
  '保修期自购买凭证日期起算；无凭证时按出厂日期计算',
  '非人为损坏免费维修；人为损坏提供付费维修报价',
  '寄修前请先提交咨询并保留物流单号，维修进度可随时查询',
]

export const SPOT_REGIONS = ['全部', '华北', '华东', '华南', '西南']

export type SupportSpot = { name: string; area: string; region: string; status: string; ok: boolean }

export const SUPPORT_SPOTS: SupportSpot[] = [
  { name: '光魂上海旗舰体验店', area: '上海 · 静安', region: '华东', status: '营业中', ok: true },
  { name: '光魂深圳体验点', area: '广东 · 深圳', region: '华南', status: '营业中', ok: true },
  { name: '光魂北京授权服务点', area: '北京 · 朝阳', region: '华北', status: '营业中', ok: true },
  { name: '光魂成都体验点', area: '四川 · 成都', region: '西南', status: '筹备中', ok: false },
]

export type Faq = { q: string; a: string }

export const FAQS: Faq[] = [
  {
    q: '下载显示器资料需要注册账号吗？',
    a: '不需要。公开的固件、说明书、色彩配置与调校软件访客可直接下载；仅与账号相关的配置同步与工单进度需要登录。',
  },
  {
    q: '怎么确认我的显示器是否在保修期内？',
    a: '在显示器底部标签或包装盒上找到序列号，使用本页「保修状态查询」输入即可看到剩余时间；若查不到，请提交咨询并附上购买凭证。',
  },
  {
    q: '上传了新固件后，旧固件还能下载吗？',
    a: '可以。发布新版本不会删除旧版本，历史版本在后台仍有记录；只有运营主动撤回后，前台才不再提供下载。',
  },
  {
    q: '寄修前需要准备什么？',
    a: '建议先提交咨询说明型号与现象，附上故障照片或视频；收到回复后再按指引寄出，并保留物流单号以便查询进度。',
  },
  {
    q: '体验点的营业时间在哪里看？',
    a: '每个体验点的详情页会显示营业时间与营业状态；「筹备中」的网点暂不接待，请先电话确认后再前往。',
  },
]
