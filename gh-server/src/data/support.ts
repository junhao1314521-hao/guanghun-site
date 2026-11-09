/** 服务支持页数据：文案、版本号与状态均为占位示例，上线前由运营替换 */

export type QuickEntry = {
  id: 'download' | 'model' | 'warranty' | 'faq' | 'venues' | 'contact'
  title: string
  desc: string
  /** 目标地址（只用站点已上线的页面，避免「点了没反应」） */
  href: string
  /** 卡片图标（与 BlockIcon 名称一致） */
  icon: 'download' | 'monitor' | 'shield' | 'help' | 'grid' | 'chat'
}

export const QUICK_ENTRIES: QuickEntry[] = [
  { id: 'download', title: '下载中心', desc: '说明书、固件、驱动与调校配置，公开资料无需登录即可下载。', href: '/downloads', icon: 'download' },
  { id: 'model', title: '型号与兼容', desc: '按型号查看 Center 适配、固件版本、说明书与常见问题。', href: '/support/models', icon: 'monitor' },
  { id: 'warranty', title: '保修政策', desc: '三年质保含 OLED 烧屏保护，范围、期限与寄修流程公开可查。', href: '/support#warranty', icon: 'shield' },
  { id: 'faq', title: '常见问题', desc: '安装、接口、HDR 调校与售后相关的高频问答，按主题分类。', href: '/faq', icon: 'help' },
  { id: 'venues', title: '产品体验点', desc: '查询身边可到店试机、现场调校与售后咨询的合作门店。', href: '/business/venues', icon: 'grid' },
  { id: 'contact', title: '提交咨询', desc: '附上型号与现象提交工单，进度与补充材料可在线跟进。', href: '/inquiry', icon: 'chat' },
]

/*
 * 已废弃并删除（R4 数据层收口）：
 *   DOWNLOAD_CATEGORIES / DOWNLOAD_TYPES / DownloadRow / DOWNLOADS
 * 原因：下载数据统一由 `downloads` 集合承载（/api/support 的 downloads 已由
 *       buildSupportDownloads(listCollection('downloads')) 派生），本文件不再保留第二份旧口径。
 */

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
    a: '在显示器底部标签或包装盒上找到序列号，登录后进入「我的设备」绑定设备即可看到保修剩余时间；若查不到，请提交咨询并附上购买凭证。',
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
