/**
 * 到店预约（独立实体，不再挤进咨询工单正文）。
 *
 * 自 v? 起纳入结构化集合 `reservations`：前台「体验点 → 预约到店」提交后写入，
 * 后台「预约管理」可查看与改状态；可由登录用户归属（供个人中心按用户隔离）。
 */

export type ReservationSummary = {
  id: string
  /** 关联体验点（biz-venues）id 与名称快照 */
  venueId: string
  venueName: string
  /** 预约人称呼与联系方式 */
  name: string
  contact: string
  /** 期望到店时间（自由文本，如「本周六下午」） */
  visitTime: string
  /** 到店人数 */
  people: number
  note: string
  /** 状态：待确认 / 已确认 / 已完成 / 已取消 */
  status: string
  /** 提交日期（ISO 日期串） */
  createdAt: string
  /** 归属用户（登录用户提交时写入；访客省略） */
  userId?: string
}

/** 预约记录全部来自前台真实提交，不预置演示数据（避免以假乱真的占位客户） */
export const RESERVATIONS: ReservationSummary[] = []
