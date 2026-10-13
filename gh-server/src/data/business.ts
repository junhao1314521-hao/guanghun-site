/** 商业合作页数据：文案与素材清单均为占位示例，上线前由运营替换 */

export type CoopDirection = {
  id: 'channel' | 'media' | 'esports' | 'campus' | 'content' | 'cobrand'
  title: string
  desc: string
}

export const COOP_DIRECTIONS: CoopDirection[] = [
  { id: 'channel', title: '渠道与经销', desc: '线上线下渠道分销、区域代理与门店陈列支持。' },
  { id: 'media', title: '媒体与评测送测', desc: '面向媒体与评测机构的样机送测，流程与规范公开。' },
  { id: 'esports', title: '赛事与战队', desc: '赛事用机、战队赞助与线下赛场体验合作。' },
  { id: 'campus', title: '校园大使', desc: '高校社团与校园大使计划，支持校园活动与试用。' },
  { id: 'content', title: '内容共创', desc: '联合选题、联合评测与内容共创，数据与结论共同署名。' },
  { id: 'cobrand', title: '品牌联名', desc: '联名产品、联名视觉与跨界活动合作。' },
]

/** 送测流程：第一步为当前节点 */
export const RELEASE_STEPS = ['提交申请', '资质确认', '寄送样机', '内容发布', '归还或续借']

export const RELEASE_RULES = [
  '评测结论与测试方法由送测方独立完成，品牌不干预结论',
  '涉及本站天梯榜口径的参数，请注明测试方法版本',
  '样机仅限约定用途，不得转售或转借第三方',
  '内容发布后请回传链接，便于我们登记归档',
]

export const RELEASE_PREPARE = [
  '机构名称、主页或往期评测链接',
  '拟评测的型号与选题方向',
  '预计发布时间与内容形式',
  '样机收件信息（通过申请表单提交）',
]

export type CoopCase = { tag: string; title: string; desc: string }

export const COOP_CASES: CoopCase[] = [
  { tag: '赛事合作', title: '高校电竞赛事合作', desc: '与高校电竞社团联合办赛，提供比赛用机与现场体验区。' },
  { tag: '内容共创', title: '联合延迟实测企划', desc: '与内容创作者共用同一测试脚本，数据与结论共同署名。' },
  { tag: '渠道合作', title: '区域门店体验升级', desc: '为授权门店提供统一陈列物料与试机台配置方案。' },
]

export type BrandAsset = { format: string; tag: string; title: string }

export const BRAND_ASSETS: BrandAsset[] = [
  { format: 'PDF', tag: '规范', title: '品牌视觉手册（含 Logo 使用规范与安全边距）' },
  { format: 'ZIP', tag: 'Logo', title: '品牌 Logo 矢量包（SVG / AI，含深浅两版）' },
  { format: 'ZIP', tag: '图片', title: '高清产品图包（透明底 PNG，需授权后使用）' },
  { format: 'PDF', tag: '送测', title: '媒体送测说明与测试方法对照表' },
]

/** 「合作类型」下拉：与「合作方向」保持一致（单一真源） */
export const COOP_TYPE_OPTIONS = COOP_DIRECTIONS.map((item) => item.title)

/** 联系方式：按合作类型分流 */
export const COOP_CONTACTS = [
  {
    icon: 'cube' as const,
    title: '商务合作',
    rows: [
      { k: '邮箱', v: 'business@guanghun.example' },
      { k: '响应时间', v: '工作日 1–2 个工作日' },
    ],
  },
  {
    icon: 'monitor' as const,
    title: '媒体送测',
    rows: [
      { k: '邮箱', v: 'press@guanghun.example' },
      { k: '说明', v: '请附往期评测链接' },
    ],
  },
  {
    icon: 'pin' as const,
    title: '办公地址',
    rows: [
      { k: '地址', v: '广东省深圳市 · 光魂' },
      { k: '到访', v: '需提前预约' },
    ],
  },
]
