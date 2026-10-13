/**
 * 后台管理系统 · 类型契约（单一真源）
 * ============================================================
 * 本文件只定义**前后端共享的数据形状**，不存放业务数据。
 * - 由 `api/admin.ts` 引用，页面只依赖 api 层，不直接 import 本文件。
 * - 表格列 / 筛选 / 表单字段等**呈现配置**见 `data/adminResources.ts`。
 */

/** 后台登录用户（不含密码） */
export type AdminProfile = {
  id: string
  username: string
  name: string
  role: string
  /** 可见栏目（V1 全量放开，'*' 表示全部） */
  scopes: string[]
}

export type AdminLoginResult = { token: string; user: AdminProfile }

/** 表格单元格取值类型 */
export type AdminCellValue = string | number | boolean

/** 一行记录：字段名 → 值（值语义由呈现配置的列类型决定） */
export type AdminRow = Record<string, AdminCellValue>

/** 列表响应：条目 + 总数（分页在前端完成，接口返回数据集） */
export type AdminList = { items: AdminRow[]; total: number }

/** 单条详情响应 */
export type AdminDetail = { item: AdminRow }

/** 工作台概览指标 */
export type AdminStat = {
  key: string
  label: string
  value: number
  delta: string
  trend: 'up' | 'down'
}

export type AdminOverview = {
  stats: AdminStat[]
  todos: { id: string; label: string; count: number; to: string }[]
  recent: { id: string; at: string; who: string; action: string; target: string }[]
}

/** 数据分析：KPI + 序列（柱状）+ 明细表 */
export type AdminAnalytics = {
  title: string
  desc: string
  summary: AdminStat[]
  series: { label: string; value: number }[]
  tableTitle: string
  columns: string[]
  rows: (string | number)[][]
}