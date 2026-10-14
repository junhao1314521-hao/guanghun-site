/** 品牌档案数据：品牌、理念、里程碑与关联产品均为占位示例，正式内容由运营替换 */

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
  /** 品牌主视觉素材地址（占位路径，正式素材由 CDN / 静态资源替换） */
  cover: string
}

/** 品牌档案集合（里程碑按时间倒序） */
export const BRAND_PROFILES: BrandProfile[] = [
  {
    slug: 'guanghun',
    name: '光魂',
    tagline: '以实测数据定义电竞显示性能',
    intro:
      '光魂成立于 2019 年，专注 OLED 电竞显示器的研发与制造。我们相信数据比形容词可信：每一款产品的关键指标都由自有实验室按公开方法测得，并给出可追溯的数值。',
    points: [
      '自建测试实验室，测试方法与条件公开、可复现',
      '榜单数据可追溯到具体的测试记录与规则版本',
      '产品覆盖 OLED 旗舰、双模高刷、电竞 IPS 与桌面周边全场景',
    ],
    milestones: [
      { year: '2026', text: '闪电 540Hz OLED 电竞显示器发布，天梯榜测试方法升级至 v2' },
      { year: '2024', text: 'Center 调校软件上线，统一管理全部显示器' },
      { year: '2022', text: '自有测试实验室投入使用，开始公开测试方法' },
      { year: '2019', text: '光魂品牌成立，首款电竞显示器上市' },
    ],
    products: [
      { id: 'gh-54027x1qe', name: '闪电 540Hz 电竞OLED显示器' },
      { id: 'gh-32x1ue', name: 'Meta 双模 4K 电竞显示器' },
      { id: 'gh-27q1f', name: '27 英寸 2K 电竞显示器' },
    ],
    cover: '/media/brand/guanghun.svg',
  },
  {
    slug: 'lab',
    name: '光魂实验室',
    tagline: '让每一个数字都有据可查',
    intro:
      '光魂实验室是品牌自有的测试与验证机构，负责响应时间、峰值亮度、色准与亮度均匀度等指标的测量。同一测试脚本在所有型号上重复执行，条件保持一致。',
    points: [
      '响应时间、峰值亮度、色准与亮度均匀度等可量化指标',
      '同一测试脚本在所有型号上重复执行，条件一致',
      '每条记录保留设备、固件版本与执行时间',
      '方法升级后，历史文章引用旧版数值保持不变',
    ],
    milestones: [
      { year: '2026', text: '测试方法升级至 v2，覆盖更多显示指标' },
      { year: '2024', text: '测试记录系统上线，实现数值可追溯' },
      { year: '2022', text: '实验室正式投入使用并公开测试方法 v1' },
      { year: '2020', text: '测试实验室立项，确定首批测试项目' },
    ],
    products: [
      { id: 'gh-54027x1qe', name: '闪电 540Hz 电竞OLED显示器' },
      { id: 'gh-28027x1qe', name: '闪电 280Hz 电竞OLED显示器' },
      { id: 'gh-32x1ue', name: 'Meta 双模 4K 电竞显示器' },
    ],
    cover: '/media/brand/lab.svg',
  },
  {
    slug: 'esports',
    name: '光魂电竞',
    tagline: '与选手一起打磨每一帧画面',
    intro:
      '光魂电竞面向职业赛场，与战队和选手共同定义并验证显示产品。赛场上的真实反馈会回到研发与测试流程，形成持续迭代的闭环。',
    points: [
      '与职业战队和选手联合定义显示指标',
      '赛场真实反馈回流研发与测试流程',
      '为赛事与高校电竞馆提供显示器与技术支持',
    ],
    milestones: [
      { year: '2026', text: '赛场反馈机制并入产品迭代流程' },
      { year: '2025', text: '与高校电竞馆合作，提供显示器与测试支持' },
      { year: '2023', text: '发布首款选手联名定制版显示器' },
      { year: '2021', text: '签约首支职业战队，开启赛场合作' },
    ],
    products: [
      { id: 'gh-54027x1qe', name: '闪电 540Hz 电竞OLED显示器' },
      { id: 'gh-32x1ue', name: 'Meta 双模 4K 电竞显示器' },
      { id: 'gh-arm01', name: '显示器悬臂支架' },
    ],
    cover: '/media/brand/esports.svg',
  },
]

/** 品牌档案：命中返回档案，未命中返回 undefined（由路由层映射 404） */
export function getBrandProfile(slug: string): BrandProfile | undefined {
  return BRAND_PROFILES.find((profile) => profile.slug === slug)
}
