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

export const RESERVATIONS: ReservationSummary[] = [
  {
    id: 'rs-001',
    venueId: 'bv-001',
    venueName: '光魂旗舰体验点 · 深圳',
    name: '陈屿',
    contact: '138-0000-0001',
    visitTime: '2026-10-18 14:00',
    people: 2,
    note: '想体验 GH-M900 PRO 与 GH-K870。',
    status: '待确认',
    createdAt: '2026-10-14',
  },
]
