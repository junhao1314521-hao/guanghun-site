/**
 * 工单（咨询）数据与详情装配。
 *
 * 说明：真实会员账号 / 会话 / 重置令牌已由 `userStore.ts` 落库提供；
 * 工单记录全部来自前台真实提交（`collections.inquiries`，见 collectionStore），
 * 本模块只保留类型定义与 `getInquiryDetail` 的装配逻辑（含会员补充回复的合并）。
 */

/** 工单状态色调：前端直接映射到 `.status--*` */
export type InquiryStatus = 'info' | 'warning' | 'success' | 'muted'

/**
 * 工单摘要：前台「我的咨询」与后台「咨询工单」共用的落库形态，
 * 含联系方式、型号、问题描述与状态色调。
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
  /** 咨询类型（轻量分流：售前咨询 / 售后报修 / 商务合作，供后台按类型分派 / 筛选） */
  inquiryType?: string
  /** 联系方式（邮箱 / 手机号等） */
  contact: string
  /** 关联产品型号 */
  model: string
  /** 问题描述正文 */
  message: string
  status: InquiryStatus
  /** 归属会员 id（登录用户提交时写入；访客提交无此字段） */
  userId?: string
  /** 会员补充回复（客户侧可见，按真实记录追加在提交条目之后） */
  replies?: InquiryTimelineEntry[]
  /** 提交时刻（ISO 字符串；旧记录可能缺失，回落到 date） */
  createdAt?: string
}

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
  'inq-2026-0008': '27X1QE-W54',
  'inq-2026-0007': '27X1QE-W54',
  'inq-2026-0006': '32X1UE-W16',
  'inq-2026-0005': '27Q1F',
}

/** 时间线只由真实记录装配：会员提交条目 + 会员补充回复，不虚构客服或内部条目 */
function buildTimeline(summary: InquirySummary): InquiryTimelineEntry[] {
  const submittedAt = summary.createdAt
    ? summary.createdAt.slice(0, 16).replace('T', ' ')
    : summary.date
  return [
    {
      kind: 'customer',
      author: summary.name || '我',
      time: submittedAt,
      text: `提交咨询：${summary.message || summary.title}`,
    },
    ...(summary.replies ?? []),
  ]
}

/** 按 id 取工单详情（摘要来自集合存储）；未命中返回 undefined（路由层据此返回 404） */
export function getInquiryDetail(inquiries: InquirySummary[], id: string): InquiryDetail | undefined {
  const summary = inquiries.find((item) => item.id === id)
  if (!summary) return undefined
  const timeline = buildTimeline(summary)
  return {
    id: summary.id,
    title: summary.title,
    // 型号优先取记录自身字段（契约 §11.2），旧记录缺字段时回退到占位映射
    model: summary.model || INQUIRY_MODELS[id] || '未标注型号',
    status: summary.tag,
    // 时间全部取自真实记录；旧记录无 createdAt 时只精确到日期
    createdAt: summary.createdAt
      ? summary.createdAt.slice(0, 16).replace('T', ' ')
      : summary.date,
    updatedAt: timeline[timeline.length - 1]?.time ?? summary.date,
    timeline,
  }
}