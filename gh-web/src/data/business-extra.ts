/** 商业合作深度线数据：场景与方案 / 合作案例 / 线下体验点（文案为占位内容，上线前由运营替换） */
import { MEDIA } from './media'

/** 关联产品：id 对齐产品库，用于跳转产品详情 */
export type SceneProduct = { id: string; name: string }

export type SceneItem = {
  id: string
  slug: string
  eyebrow: string
  title: string
  desc: string
  points: string[]
  products: SceneProduct[]
  cover: string
}

export const BIZ_SCENES: SceneItem[] = [
  {
    id: 'esports-room',
    slug: 'esports-room',
    eyebrow: '电竞对战',
    title: '电竞对战房整体方案',
    desc: '面向战队训练室与电竞馆对战区，按台位数量与预算组合显示器，兼顾高刷与响应。',
    points: [
      '按对战台位数量配置电竞显示器，统一固件版本与显示档',
      '显示器集中管理与线材整理，减少桌面干扰',
      '预留试机位与备用机位，便于赛前快速替换',
    ],
    products: [
      { id: 'gh-54027x1qe', name: '闪电 540Hz 电竞OLED显示器' },
      { id: 'gh-32x1ue', name: 'Meta 双模 4K 电竞显示器' },
      { id: 'gh-27q1f', name: '27 英寸 2K 电竞显示器' },
    ],
    cover: MEDIA.scene['scene-01'],
  },
  {
    id: 'creator-desk',
    slug: 'creator-desk',
    eyebrow: '内容创作',
    title: '内容创作工位方案',
    desc: '面向剪辑与调色工位，色准与广色域优先，桌面按创作流程分区布置。',
    points: [
      '主显示与监看分区，减少切换成本',
      '原生 10bit 与 99% DCI-P3 覆盖调色需求',
      '大尺寸显示器配合支架统一桌面视觉，便于设备归位',
    ],
    products: [
      { id: 'gh-32x1ue', name: 'Meta 双模 4K 电竞显示器' },
      { id: 'gh-54027x1qe', name: '闪电 540Hz 电竞OLED显示器' },
      { id: 'gh-arm01', name: '显示器悬臂支架' },
    ],
    cover: MEDIA.scene['scene-02'],
  },
  {
    id: 'office-desk',
    slug: 'office-desk',
    eyebrow: '商用办公',
    title: '商用办公桌面方案',
    desc: '面向企业批量采购，统一型号与接口，便于 IT 集中管理与资产登记。',
    points: [
      '统一型号与接口，降低备件与培训成本',
      'HDMI 2.1 / DP 2.1 适配会议室与工位切换',
      '提供批量固件下发与设备清单模板',
    ],
    products: [
      { id: 'gh-27q1f', name: '27 英寸 2K 电竞显示器' },
      { id: 'gh-24h1', name: '24 英寸 200Hz 电竞显示器' },
      { id: 'gh-arm01', name: '显示器悬臂支架' },
    ],
    cover: MEDIA.scene['scene-03'],
  },
]

export type CaseSummary = {
  id: string
  title: string
  partner: string
  category: string
  year: string
  summary: string
  cover: string
}

export type CaseDetail = CaseSummary & {
  background: string
  solution: string[]
  results: { label: string; value: string }[]
  gallery: string[]
}

/** 案例摘要（列表用）：封面由页面按顺序取 MEDIA.businessCase 轮转 */
export const BIZ_CASES: CaseSummary[] = [
  {
    id: 'campus-esports-2026',
    title: '高校电竞赛事合作',
    partner: '华南高校电竞联盟',
    category: '赛事合作',
    year: '2026',
    summary: '为校级和区域联赛提供比赛用显示器与现场体验区，统一显示规格以降低主客队环境差异。',
    cover: MEDIA.businessCase[0],
  },
  {
    id: 'venue-experience-2025',
    title: '电竞馆体验区共建',
    partner: '深圳競界电竞馆',
    category: '渠道合作',
    year: '2025',
    summary: '与电竞馆共建试机体验区，配套统一陈列物料与试机台显示配置，支持门店导流与试用登记。',
    cover: MEDIA.businessCase[1],
  },
  {
    id: 'cobrand-series-2026',
    title: '联名显示器企划',
    partner: 'NOVA 设计工作室',
    category: '品牌联名',
    year: '2026',
    summary: '联合开发联名配色与包装视觉，同步落地线下陈列与线上内容，覆盖首发与长尾两阶段。',
    cover: MEDIA.businessCase[2],
  },
]

/** 案例详情：背景 / 方案 / 成果 / 图集 */
export const BIZ_CASE_DETAILS: Record<string, CaseDetail> = {
  'campus-esports-2026': {
    ...BIZ_CASES[0],
    background:
      '联赛覆盖多所高校，参赛队伍自带显示器差异较大，赛前调试占用大量时间，主客队对场地显示效果反馈不一致。',
    solution: [
      '统一为对战区配置同型号电竞显示器，并预置显示档',
      '设置赛前快速校准位，选手到场合规后即可开赛',
      '在观众区旁设置试机体验区，供场外观众试用',
      '赛后回收设备并统一清洁、固件校验与显示配置复位',
    ],
    results: [
      { label: '覆盖高校', value: '12 所' },
      { label: '对战台位', value: '64 个' },
      { label: '赛前调试耗时', value: '下降约 40%' },
    ],
    gallery: MEDIA.businessCase,
  },
  'venue-experience-2025': {
    ...BIZ_CASES[1],
    background:
      '电竞馆原有试机台位分散、陈列不统一，顾客试用后缺少登记入口，难以追踪体验转化。',
    solution: [
      '按门店动线规划试机台位，统一陈列物料与灯箱',
      '各台位预装常用显示档与调校配置，支持一键切换',
      '试机后引导扫码登记，接入线上咨询与到店预约',
    ],
    results: [
      { label: '试机台位', value: '18 个' },
      { label: '试用登记率', value: '提升约 2.3 倍' },
      { label: '平均停留时长', value: '+9 分钟' },
    ],
    gallery: MEDIA.businessCase,
  },
  'cobrand-series-2026': {
    ...BIZ_CASES[2],
    background:
      '品牌希望以联名方式触达偏好个性外观的用户，同时保持既有产品线的性能口碑不受影响。',
    solution: [
      '在旗舰型号基础上开发联名配色与限定包装',
      '同步产出线下陈列与线上内容素材，统一视觉口径',
      '首发采用限量发售，配套联名周边与收藏卡',
    ],
    results: [
      { label: '联名型号', value: '3 款' },
      { label: '首发售罄', value: '48 小时内' },
      { label: '内容曝光', value: '覆盖 6 个平台' },
    ],
    gallery: MEDIA.businessCase,
  },
}

export type VenueType = 'flagship' | 'experience' | 'service'

export type VenueSummary = {
  id: string
  name: string
  city: string
  area: string
  type: VenueType
  status: string
  ok: boolean
  address: string
  cover: string
}

export type VenueDetail = VenueSummary & {
  hours: string
  phone: string
  products: string[]
  services: string[]
  transport: string
  note: string
}

export const BIZ_VENUES: VenueSummary[] = [
  {
    id: 'sz-flagship',
    name: '光魂 · 深圳旗舰体验中心',
    city: '深圳',
    area: '南山区',
    type: 'flagship',
    status: '营业中',
    ok: true,
    address: '深圳市南山区科苑大道 · 光魂旗舰体验中心',
    cover: MEDIA.scene['scene-01'],
  },
  {
    id: 'sh-experience',
    name: '光魂 · 上海南京路体验点',
    city: '上海',
    area: '黄浦区',
    type: 'experience',
    status: '营业中',
    ok: true,
    address: '上海市黄浦区南京东路 · 数码体验街区内',
    cover: MEDIA.scene['scene-02'],
  },
  {
    id: 'bj-service',
    name: '光魂 · 北京授权服务点',
    city: '北京',
    area: '海淀区',
    type: 'service',
    status: '调整中',
    ok: false,
    address: '北京市海淀区中关村大街 · 授权服务点',
    cover: MEDIA.scene['scene-03'],
  },
  {
    id: 'cd-experience',
    name: '光魂 · 成都春熙路体验点',
    city: '成都',
    area: '锦江区',
    type: 'experience',
    status: '营业中',
    ok: true,
    address: '成都市锦江区春熙路商圈 · 电竞主题店内',
    cover: MEDIA.scene['scene-01'],
  },
  {
    id: 'gz-service',
    name: '光魂 · 广州授权服务点',
    city: '广州',
    area: '天河区',
    type: 'service',
    status: '筹备中',
    ok: false,
    address: '广州市天河区天河路商圈 · 授权服务点',
    cover: MEDIA.scene['scene-02'],
  },
]

export const BIZ_VENUE_DETAILS: Record<string, VenueDetail> = {
  'sz-flagship': {
    ...BIZ_VENUES[0],
    hours: '周一至周日 10:00–22:00',
    phone: '400-000-0000',
    products: ['闪电 540Hz 电竞OLED显示器', 'Meta 双模 4K 电竞显示器', '27 英寸 2K 电竞显示器', '显示器悬臂支架'],
    services: ['全系显示器试机体验', '显示档现场咨询与色彩校准', '保修检测与寄修受理', '联名限定款限量发售'],
    transport: '地铁 1 号线高新园站步行约 5 分钟；商场地下停车场可停车',
    note: '体验高峰期试机位有限，建议提前通过预约到店登记，到店后由店员安排。',
  },
  'sh-experience': {
    ...BIZ_VENUES[1],
    hours: '周一至周日 10:00–21:30',
    phone: '400-000-0000',
    products: ['27 英寸 2K 电竞显示器', '24 英寸 200Hz 电竞显示器', '显示器悬臂支架'],
    services: ['重点型号试机体验', '选购建议与搭配咨询', '线上咨询到店联动'],
    transport: '地铁 2 / 10 号线南京东路站步行约 3 分钟',
    note: '周末人流较大，试机请配合现场取号；具体活动以门店公告为准。',
  },
  'bj-service': {
    ...BIZ_VENUES[2],
    hours: '周一至周六 09:30–18:30',
    phone: '400-000-0000',
    products: ['闪电 540Hz 电竞OLED显示器', 'Meta 双模 4K 电竞显示器'],
    services: ['保修检测与故障判定', '维修寄送与进度查询', '配件更换'],
    transport: '地铁 4 号线中关村站步行约 8 分钟',
    note: '服务点当前处于调整期，受理时间可能变动，建议先电话确认再前往。',
  },
  'cd-experience': {
    ...BIZ_VENUES[3],
    hours: '周一至周日 11:00–22:00',
    phone: '400-000-0000',
    products: ['闪电 540Hz 电竞OLED显示器', '27 英寸 2K 电竞显示器', 'Meta 双模 4K 电竞显示器'],
    services: ['电竞主题店内试机体验', '赛事与活动报名咨询', '联名周边展示'],
    transport: '地铁 2 / 3 号线春熙路站步行约 2 分钟',
    note: '体验点位于合作主题店内，试机位与营业安排以门店现场为准。',
  },
  'gz-service': {
    ...BIZ_VENUES[4],
    hours: '周一至周五 10:00–18:00',
    phone: '400-000-0000',
    products: ['24 英寸 200Hz 电竞显示器', '显示器悬臂支架'],
    services: ['保修受理与寄修登记', '配件供应咨询'],
    transport: '地铁 1 / 3 号线体育西路站步行约 6 分钟',
    note: '服务点仍在筹备，暂未对外受理；开放时间以官方公布为准。',
  },
}

/** 城市列表：用于体验点页的筛选 chip（去重，保持数据出现顺序） */
export const BIZ_VENUE_CITIES: string[] = Array.from(new Set(BIZ_VENUES.map((venue) => venue.city)))

/** 按 id 取案例详情；未命中返回 null，供接口层区分「不存在」 */
export function getBizCaseDetail(id: string): CaseDetail | null {
  const detail = BIZ_CASE_DETAILS[id]
  return detail ? detail : null
}

/** 按 id 取体验点详情；未命中返回 null，供接口层区分「不存在」 */
export function getBizVenueDetail(id: string): VenueDetail | null {
  const detail = BIZ_VENUE_DETAILS[id]
  return detail ? detail : null
}
