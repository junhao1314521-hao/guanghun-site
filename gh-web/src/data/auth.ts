/**
 * 前台账号体系类型（唯一真源）。
 *
 * 阶段 5 起账号/会话由后端 `gh-server` 真实提供（`users` 表 + `gh_user` Cookie），
 * 前端不再内嵌占位用户 / 工单 / 通知常量，仅保留与接口对齐的类型定义。
 */

/** 当前登录用户（对齐后端 `UserProfile`） */
export type AuthUser = {
  id: string
  username: string
  name: string
  email: string
  phone: string
}

/** 工单状态色调：直接映射到 `.status--*` */
export type InquiryStatus = 'info' | 'warning' | 'success' | 'muted'

/** 工单摘要（形状对齐契约 §11.2 的 inquiries 规范记录） */
export type InquirySummary = {
  id: string
  date: string
  tag: string
  accent?: boolean
  title: string
  /** 联系方式 */
  contact: string
  /** 关联产品型号 */
  model: string
  /** 问题描述正文 */
  message: string
  status: InquiryStatus
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
  /** 完整时间线（含内部备注）；前端仅渲染面向客户的条目 */
  timeline: InquiryTimelineEntry[]
}

/** 订阅与通知设置项 */
export type NotificationSetting = {
  id: string
  label: string
  desc: string
  enabled: boolean
}

/** 登录设备（账号设置页展示） */
export type LoginDevice = {
  name: string
  meta: string
  place: string
  current?: boolean
  /** 会话令牌（用于「退出该设备」吊销；仅本人可见） */
  token?: string
}

/** 账号设置页 · 安全项 */
export type SecurityItem = { k: string; v: string; hint: string }
