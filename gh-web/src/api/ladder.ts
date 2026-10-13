/** 接口层 · 天梯榜资源 */
import { transport } from './client'
import { LADDER_METRICS, LADDER_META, type LadderMetric } from '../data/ladder'

export type LadderResult = {
  metrics: LadderMetric[]
  meta: typeof LADDER_META
}

/** 榜单数据：一次返回全部指标，指标切换在前端完成（配合榜单条重放动画） */
export function fetchLadder(signal?: AbortSignal): Promise<LadderResult> {
  return transport({ path: '/api/ladder', signal }, () => ({ metrics: LADDER_METRICS, meta: LADDER_META }))
}
