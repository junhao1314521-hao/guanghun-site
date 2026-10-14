/** 接口层 · 天梯榜资源 */
import { transport } from './client'
import { LADDER_METRICS, LADDER_META, type LadderMetric } from '../data/ladder'

export type LadderResult = {
  metrics: LadderMetric[]
  meta: typeof LADDER_META
}

/** 测评方法（后台「测评方法」维护，前台天梯榜「测试方法」展示） */
export type TestMethod = {
  id: string
  name: string
  category: string
  version: string
  owner: string
  status: string
  updatedAt: string
  detail?: string
}

/** 离线回退：与集合 seed 一致的公开方法条目 */
const METHODS_FALLBACK: TestMethod[] = [
  { id: 'm-001', name: '端到端延迟测试方法', category: '延迟', version: 'v2.1', owner: '林知远', status: '已发布', updatedAt: '2026-09-01', detail: '以示波器同步触发，记录输入到屏幕响应的端到端时延。' },
  { id: 'm-002', name: '无线续航测试方法', category: '续航', version: 'v1.4', owner: '周予安', status: '已发布', updatedAt: '2026-08-22', detail: '统一亮度与回报率条件下，循环任务直至电量耗尽。' },
  { id: 'm-003', name: '重量与手感评估方法', category: '手感', version: 'v1.2', owner: '沈牧', status: '已发布', updatedAt: '2026-08-10', detail: '电子秤称重 + 盲测手感评分。' },
]

/** 榜单数据：一次返回全部指标，指标切换在前端完成（配合榜单条重放动画） */
export function fetchLadder(signal?: AbortSignal): Promise<LadderResult> {
  return transport({ path: '/api/ladder', signal }, () => ({ metrics: LADDER_METRICS, meta: LADDER_META }))
}

/** 测评方法：后台「测评方法」维护，前台天梯榜展示（仅「已发布」对外公开） */
export function fetchMethods(signal?: AbortSignal): Promise<{ items: TestMethod[] }> {
  return transport({ path: '/api/methods', signal }, () => ({ items: METHODS_FALLBACK }))
}
