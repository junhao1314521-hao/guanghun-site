/**
 * 邮件订阅者（公开表单写入）。
 * ============================================================
 * 来源：首页 / 页脚的「邮件订阅」区块（公开 POST /api/subscribe）。
 * 与 `inquiries`（咨询工单）分离：订阅只留邮箱与来源，用于新品 / 固件 / 活动通知。
 * 后台「订阅者」栏目可查看与删除（collection key = subscribers）。
 */

export type Subscriber = {
  id: string
  /** 订阅邮箱 */
  email: string
  /** 来源标记（如 home / footer） */
  source: string
  /** 提交日期（YYYY-MM-DD） */
  createdAt: string
}

/** 订阅者初始为空：只保留真实表单提交，不预置演示邮箱 */
export const SUBSCRIBERS: Subscriber[] = []
