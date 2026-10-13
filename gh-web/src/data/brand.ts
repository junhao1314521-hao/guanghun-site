/** 品牌页数据：品牌档案、理念要点、里程碑与关联产品均为占位示例，正式内容由运营替换 */
import { MEDIA } from './media'

export type BrandMilestone = { year: string; text: string }
export type BrandProduct = { id: string; name: string }

/** 品牌档案：slug 与前端路由 /brand/:slug 一一对应 */
export type BrandProfile = {
  slug: string
  name: string
  tagline: string
  intro: string
  points: string[]
  milestones: BrandMilestone[]
  products: BrandProduct[]
  /** 品牌主视觉素材（本地占位，经 MEDIA 提供；不直接外链图片） */
  cover: string
}

/** 品牌档案集合（里程碑按时间倒序） */
export const BRAND_PROFILES: BrandProfile[] = [
  {
    slug: 'guanghun',
    name: '光魂',
    tagline: '以实测数据定义电竞装备性能',
    intro:
      '光魂成立于 2019 年，专注电竞外设的研发与制造。我们相信数据比形容词可信：每一款产品的关键指标都由自有实验室按公开方法测得，并给出可追溯的数值。',
    points: [
      '自建测试实验室，测试方法与条件公开、可复现',
      '榜单数据可追溯到具体的测试记录与规则版本',
      '产品覆盖鼠标、键盘、耳机与桌面配件全场景',
    ],
    milestones: [
      { year: '2026', text: 'GH-M900 PRO 发布，天梯榜测试方法升级至 v2' },
      { year: '2024', text: 'Center 配套软件上线，统一管理全部设备' },
      { year: '2022', text: '自有测试实验室投入使用，开始公开测试方法' },
      { year: '2019', text: '光魂品牌成立，首款电竞鼠标上市' },
    ],
    products: [
      { id: 'gh-m900-pro', name: 'GH-M900 PRO' },
      { id: 'gh-k870', name: 'GH-K870' },
      { id: 'gh-h500', name: 'GH-H500' },
    ],
    cover: MEDIA.about.brand,
  },
  {
    slug: 'lab',
    name: '光魂实验室',
    tagline: '让每一个数字都有据可查',
    intro:
      '光魂实验室是品牌自有的测试与验证机构，负责端到端延迟、续航、重量与手感等指标的测量。同一测试脚本在所有型号上重复执行，条件保持一致。',
    points: [
      '端到端延迟、续航、重量与手感等可量化指标',
      '同一测试脚本在所有型号上重复执行，条件一致',
      '每条记录保留设备、固件版本与执行时间',
      '方法升级后，历史文章引用旧版数值保持不变',
    ],
    milestones: [
      { year: '2026', text: '测试方法升级至 v2，覆盖更多无线指标' },
      { year: '2024', text: '测试记录系统上线，实现数值可追溯' },
      { year: '2022', text: '实验室正式投入使用并公开测试方法 v1' },
      { year: '2020', text: '测试实验室立项，确定首批测试项目' },
    ],
    products: [
      { id: 'gh-m900-pro', name: 'GH-M900 PRO' },
      { id: 'gh-m700', name: 'GH-M700' },
      { id: 'gh-k870', name: 'GH-K870' },
    ],
    cover: MEDIA.about.lab,
  },
  {
    slug: 'esports',
    name: '光魂电竞',
    tagline: '与选手一起打磨每一处手感',
    intro:
      '光魂电竞面向职业赛场，与战队和选手共同定义并验证产品。赛场上的真实反馈会回到研发与测试流程，形成持续迭代的闭环。',
    points: [
      '与职业战队和选手联合定义产品指标',
      '赛场真实反馈回流研发与测试流程',
      '为赛事与高校电竞馆提供设备与技术支持',
    ],
    milestones: [
      { year: '2026', text: '赛场反馈机制并入产品迭代流程' },
      { year: '2025', text: '与高校电竞馆合作，提供设备与测试支持' },
      { year: '2023', text: '发布首款选手联名定制版鼠标' },
      { year: '2021', text: '签约首支职业战队，开启赛场合作' },
    ],
    products: [
      { id: 'gh-m900-pro', name: 'GH-M900 PRO' },
      { id: 'gh-h500', name: 'GH-H500' },
      { id: 'gh-p400', name: 'GH-P400' },
    ],
    cover: MEDIA.businessCase[0],
  },
]

/** 品牌档案：命中返回档案，未命中返回 undefined（由接口层映射 404） */
export function getBrandProfile(slug: string): BrandProfile | undefined {
  return BRAND_PROFILES.find((profile) => profile.slug === slug)
}