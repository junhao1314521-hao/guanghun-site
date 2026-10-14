/** 关于光魂页数据：里程碑、数字、岗位等均为占位示例，正式内容由运营替换 */

/** 品牌理念要点 */
export const PHILOSOPHY_POINTS = [
  '测试方法与测试条件公开，可被复现',
  '榜单数据可追溯到具体的测试记录与规则版本',
  '不夸大、不修饰；无数据的项标注「暂无」而非填 0',
]

/** 关键事实（占位数值，未确认前不得作为真实事实上线） */
export type Fact = { value: string; label: string }

export const FACTS: Fact[] = [
  { value: '2019', label: '品牌成立' },
  { value: '1', label: '自有测试实验室' },
  { value: '4', label: '产品线：OLED 旗舰 / 双模高刷 / 电竞 IPS / 周边' },
]

/** 测试实验室：我们测什么 */
export const LAB_POINTS = [
  '响应时间、峰值亮度、色准与亮度均匀度等可量化指标',
  '同一测试脚本在所有型号上重复执行，条件一致',
  '每条记录保留设备、固件版本与执行时间',
  '方法升级后，历史文章引用旧版数值保持不变',
]

/** 发展历程（倒序） */
export type TimelineItem = { year: string; tag: string; title: string }

export const TIMELINE: TimelineItem[] = [
  { year: '2026', tag: '产品', title: '闪电 540Hz OLED 电竞显示器发布，天梯榜测试方法升级至 v2' },
  { year: '2024', tag: '软件', title: '光魂 Center 调校软件上线，统一管理全部显示器' },
  { year: '2022', tag: '实验室', title: '自有测试实验室投入使用，开始公开测试方法' },
  { year: '2019', tag: '品牌', title: '光魂品牌成立，首款电竞显示器上市' },
]

/** 新闻中心 */
export type NewsItem = { date: string; tag: string; title: string }

export const NEWS: NewsItem[] = [
  { date: '2026-09-28', tag: '产品发布', title: '闪电 540Hz OLED 电竞显示器正式发布' },
  { date: '2026-09-12', tag: '品牌动态', title: '天梯榜测试方法升级至 v2' },
  { date: '2026-08-30', tag: '活动', title: '线下体验点巡回活动预告' },
]

/** 企业文化标签 */
export const CULTURE_TAGS = ['数据说话', '公开透明', '长期主义']

/** 招聘岗位 */
export const JOBS = ['硬件测试工程师（深圳）', '固件开发工程师（深圳）', '品牌内容运营（深圳 / 远程）']

/** 合规与条款 */
export type LegalCard = { icon: 'shield' | 'doc' | 'clock'; title: string; desc: string; to: string }

export const LEGAL_CARDS: LegalCard[] = [
  { icon: 'shield', title: '隐私政策', desc: '我们收集哪些信息、如何使用，以及你如何管理自己的数据。', to: '/legal/privacy' },
  { icon: 'doc', title: '服务条款', desc: '网站与账号服务的使用规则、责任范围与争议处理。', to: '/legal/terms' },
  { icon: 'clock', title: 'Cookie 声明', desc: '我们使用哪些 Cookie、用途为何，以及如何调整偏好。', to: '/legal/cookies' },
]
