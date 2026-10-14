/** 客户中心页数据：账号、设备、咨询等均为占位示例，接入账号体系后由接口层替换 */

export const PROFILE = {
  initial: 'H',
  name: 'HAO',
  meta: '已登录 · 手机尾号 0000',
}

/** 左侧导航：id 对应右侧分区锚点 */
export type AccountNavItem = { id: string; label: string }

export const ACCOUNT_NAV: AccountNavItem[] = [
  { id: 'c-overview', label: '概览' },
  { id: 'c-devices', label: '我的设备' },
  { id: 'c-tickets', label: '我的咨询' },
  { id: 'c-favorites', label: '收藏与订阅' },
  { id: 'c-security', label: '账号与安全' },
]

/** 概览统计 */
export type AccountStat = { value: string; label: string }

export const OVERVIEW_STATS: AccountStat[] = [
  { value: '1', label: '处理中的咨询' },
  { value: '3', label: '已登记的设备' },
  { value: '2', label: '收藏的型号' },
]

// 显式放宽为 string：契约 §5.1 #7 采纳「值可变」口径
export const OVERVIEW_ALERT: string = '咨询「GH-M900 PRO 无线连接偶发断连」状态更新为「等待补充」，请在 7 天内回复。'

/** 我的设备 */
export type AccountDevice = {
  model: string
  sn: string
  status: 'success' | 'muted'
  statusText: string
  warranty: string
  /** to 为真跳转目标；缺省表示该操作尚未接入后端，由页面给出演示提示 */
  action: { label: string; variant: 'secondary' | 'ghost'; to?: string }
}

export const ACCOUNT_DEVICES: AccountDevice[] = [
  { model: 'GH-M900 PRO', sn: 'GH-M900-2026-000128', status: 'success', statusText: '在保', warranty: '640 天', action: { label: '申请售后', variant: 'secondary', to: '/inquiry' } },
  { model: 'GH-K870', sn: 'GH-K870-2025-004512', status: 'success', statusText: '在保', warranty: '210 天', action: { label: '申请售后', variant: 'secondary', to: '/inquiry' } },
  { model: 'GH-H500', sn: '未验证', status: 'muted', statusText: '未验证', warranty: '暂无', action: { label: '去验证', variant: 'ghost' } },
]

/** 我的咨询 */
export type AccountTicket = { date: string; tag: string; accent?: boolean; title: string }

export const ACCOUNT_TICKETS: AccountTicket[] = [
  { date: '2026-10-08', tag: '处理中', accent: true, title: 'GH-M900 PRO 无线连接偶发断连' },
  { date: '2026-09-30', tag: '等待补充', title: '提交保修凭证以继续处理' },
  { date: '2026-09-21', tag: '已解决', title: '驱动更新后侧键宏失效' },
  { date: '2026-09-12', tag: '已关闭', title: '咨询是否支持 Linux 系统' },
]

/** 收藏与订阅 */
export type FavoriteItem = { name: string; spec: string; subscribed: boolean }

export const FAVORITES: FavoriteItem[] = [
  { name: '54027X1QE-W54 电竞OLED显示器', spec: '26.5 英寸 2K 540Hz', subscribed: true },
  { name: '32X1UE-W16 双模 4K 电竞显示器', spec: '4K@165 / FHD@330', subscribed: false },
  { name: '28027X1QE-W28 电竞OLED显示器', spec: '26.5 英寸 2K 280Hz', subscribed: true },
]

/** 账号与安全 */
export type SecurityItem = { k: string; v: string; hint: string }

export const SECURITY: SecurityItem[] = [
  { k: '手机号', v: '138****0000', hint: '已绑定' },
  { k: '邮箱', v: 'hao@example.com', hint: '已绑定' },
  { k: '登录密码', v: '已设置', hint: '最近更新 2026-09-01' },
]
