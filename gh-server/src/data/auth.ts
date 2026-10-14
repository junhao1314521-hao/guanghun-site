/**
 * 工单（咨询）数据与详情装配。
 *
 * 说明：真实会员账号 / 会话 / 重置令牌已由 `userStore.ts` 落库提供；
 * 本模块仅保留 `inquiries` 集合的种子（由 `account.ts` 的展示数据派生）与
 * `getInquiryDetail` 的装配逻辑（含会员补充回复的合并）。
 */

import { ACCOUNT_TICKETS } from './account'

/** 工单状态色调：前端直接映射到 `.status--*` */
export type InquiryStatus = 'info' | 'warning' | 'success' | 'muted'

/**
 * 工单摘要：沿用 `ACCOUNT_TICKETS` 的展示形态（date / tag / title），
 * 补充稳定 id、状态色调，以及契约 §11.2 要求的 `contact / model / message`
 * （联系方式与型号、问题描述随表单一并落库，前台「我的咨询」与后台「咨询工单」共用）。
 */
export type InquirySummary = {
  id: string
  date: string
  tag: string
  accent?: boolean
  title: string
  /** 提交人称呼（表单「称呼」独立落库，不再并入 title） */
  name?: string
  /** 咨询主题（表单「主题」独立落库，便于按主题统计） */
  topic?: string
  /** 联系方式（邮箱 / 手机号等） */
  contact: string
  /** 关联产品型号 */
  model: string
  /** 问题描述正文 */
  message: string
  status: InquiryStatus
  /** 归属会员 id（登录用户提交时写入；访客提交无此字段） */
  userId?: string
  /** 会员补充回复（客户侧可见，追加在演示时间线之后） */
  replies?: InquiryTimelineEntry[]
}

/** 与 ACCOUNT_TICKETS 顺序一一对应的 id 与状态色调 */
const INQUIRY_META: Array<{ id: string; status: InquiryStatus }> = [
  { id: 'inq-2026-0008', status: 'info' },
  { id: 'inq-2026-0007', status: 'warning' },
  { id: 'inq-2026-0006', status: 'success' },
  { id: 'inq-2026-0005', status: 'muted' },
]

/** 与 ACCOUNT_TICKETS 顺序一一对应的联系方式（占位） */
const INQUIRY_CONTACTS: string[] = [
  'hao@example.com',
  '138****0000',
  'hao@example.com',
  'hao@example.com',
]

/** 与 ACCOUNT_TICKETS 顺序一一对应的型号（占位） */
const INQUIRY_MODELS_LIST: string[] = ['GH-M900 PRO', 'GH-M900 PRO', 'GH-K870', 'GH-H500']

/** 与 ACCOUNT_TICKETS 顺序一一对应的问题描述（占位） */
const INQUIRY_MESSAGES: string[] = [
  '无线连接偶发断连，重新配对后短时间恢复，希望协助定位。',
  '保修凭证待补充，请协助确认所需材料。',
  '驱动更新后侧键宏失效，回退到上一版本可恢复。',
  '咨询是否支持 Linux 系统与免驱使用。',
]

export const INQUIRIES: InquirySummary[] = ACCOUNT_TICKETS.map((ticket, index) => ({
  id: INQUIRY_META[index]?.id ?? `inq-${index}`,
  date: ticket.date,
  tag: ticket.tag,
  accent: ticket.accent,
  title: ticket.title,
  contact: INQUIRY_CONTACTS[index] ?? '',
  model: INQUIRY_MODELS_LIST[index] ?? '',
  message: INQUIRY_MESSAGES[index] ?? ticket.title,
  status: INQUIRY_META[index]?.status ?? 'muted',
}))

/** 时间线条目类型：客户回复 / 公开回复（客服）/ 内部备注 */
export type InquiryTimelineKind = 'customer' | 'agent' | 'internal'

export type InquiryTimelineEntry = {
  kind: InquiryTimelineKind
  author: string
  time: string
  text: string
}

export type InquiryDetail = {
  id: string
  title: string
  model: string
  status: string
  createdAt: string
  updatedAt: string
  /**
   * 完整时间线（含内部备注）。
   * 面向客户的接口层会剔除 `internal` 条目——内部备注对客户不可见。
   */
  timeline: InquiryTimelineEntry[]
}

/** 各工单对应的产品型号 */
const INQUIRY_MODELS: Record<string, string> = {
  'inq-2026-0008': 'GH-M900 PRO',
  'inq-2026-0007': 'GH-M900 PRO',
  'inq-2026-0006': 'GH-K870',
  'inq-2026-0005': 'GH-H500',
}

/** 按摘要生成占位时间线：三类条目齐备，用于演示客户侧的可见性过滤 */
function buildTimeline(summary: InquirySummary): InquiryTimelineEntry[] {
  return [
    { kind: 'customer', author: '我', time: `${summary.date} 10:12`, text: `提交咨询：${summary.title}。` },
    { kind: 'internal', author: '客服组', time: `${summary.date} 11:03`, text: '内部备注：初判为固件版本兼容问题，已转技术支持跟进。（对客户不可见）' },
    { kind: 'agent', author: '技术支持', time: `${summary.date} 14:26`, text: '已收到反馈，请补充固件版本与连接日志，便于进一步定位。' },
    { kind: 'customer', author: '我', time: `${summary.date} 16:40`, text: '已按指引导出日志并上传，当前固件版本为 v2.4.0。' },
  ]
}

/** 按 id 取工单详情（摘要来自集合存储）；未命中返回 undefined（路由层据此返回 404） */
export function getInquiryDetail(inquiries: InquirySummary[], id: string): InquiryDetail | undefined {
  const summary = inquiries.find((item) => item.id === id)
  if (!summary) return undefined
  return {
    id: summary.id,
    title: summary.title,
    // 型号优先取记录自身字段（契约 §11.2），旧记录缺字段时回退到占位映射
    model: summary.model || INQUIRY_MODELS[id] || '未标注型号',
    status: summary.tag,
    createdAt: `${summary.date} 10:12`,
    updatedAt: `${summary.date} 16:40`,
    // 会员补充回复追加在（演示）时间线之后，供客户侧查看
    timeline: [...buildTimeline(summary), ...(summary.replies ?? [])],
  }
}