/** 商业合作深度线数据：场景与方案 / 合作案例 / 线下体验点（文案为占位内容，上线前由运营替换） */
import { MEDIA } from './media'
import { XXRSM_VENUES } from './xxrsmVenues'

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
  /** 省份（用于分组 / 筛选；列表接口按此聚合 provinces） */
  province: string
  city: string
  area: string
  type: VenueType
  status: string
  ok: boolean
  address: string
  cover: string
  /** 门店图片（后台可上传；第一张同时作为封面） */
  gallery?: string[]
  /** 地图坐标（后台「体验点管理」维护；缺省时不在地图上打点） */
  lat?: number
  lng?: number
  /** 坐标精度：门址/兴趣点为 exact；仅到区县为 district（地图可按城市级展示） */
  precision?: 'exact' | 'district'
  /** 数据来源：xxrsm=抓取的合作体验点；manual=后台新增（自营/合作门店） */
  source?: 'xxrsm' | 'manual'
  /** 以下为详情扩展字段（运营可在后台维护；缺省回退内置示例） */
  hours?: string
  phone?: string
  products?: string[]
  services?: string[]
  transport?: string
  note?: string
}

export type VenueDetail = VenueSummary & {
  hours: string
  phone: string
  products: string[]
  services: string[]
  transport: string
  note: string
  gallery: string[]
}

export const BIZ_VENUES: VenueSummary[] = XXRSM_VENUES

/** 城市列表：用于体验点页的筛选 chip（去重，保持数据出现顺序） */
export const BIZ_VENUE_CITIES: string[] = Array.from(new Set(BIZ_VENUES.map((venue) => venue.city).filter(Boolean)))

/** 省份列表：用于体验点页的筛选 / 分组（去重，保持数据出现顺序） */
export const BIZ_VENUE_PROVINCES: string[] = Array.from(new Set(BIZ_VENUES.map((venue) => venue.province)))

/** 按 id 取案例详情；未命中返回 null，供接口层区分「不存在」 */
export function getBizCaseDetail(id: string): CaseDetail | null {
  const detail = BIZ_CASE_DETAILS[id]
  return detail ? detail : null
}

/** 按 id 取体验点详情；未命中返回 null，供接口层区分「不存在」 */
export function getBizVenueDetail(id: string): VenueDetail | null {
  const summary = BIZ_VENUES.find((venue) => venue.id === id)
  if (!summary) return null
  return {
    ...summary,
    hours: summary.hours ?? '',
    phone: summary.phone ?? '',
    products: summary.products ?? [],
    services: summary.services ?? ['到店实机体验'],
    transport: summary.transport ?? '',
    note: summary.note ?? '到店体验请以门店现场安排为准。',
    gallery: summary.gallery ?? (summary.cover ? [summary.cover] : []),
  }
}
