/**
 * 接口层 · 天梯榜型号产品图（后台）。
 *
 *   GET   /api/ladder                     公开榜单（含每行 imageUrl）
 *   PATCH /api/admin/rankings/rows/image  设置 / 清除某个型号的图片
 *
 * 图片与语言无关：服务端只写一条记录，英文覆盖层会按型号回填图片。
 */
import { transport } from './client'
import { getAdminToken } from '../lib/adminAuth'
import type { LadderMetric } from '../data/ladder'

/** 读取全部榜单（含行数据），供后台型号图片管理使用 */
export async function fetchRankingMetrics(): Promise<LadderMetric[]> {
  const data = await transport<{ metrics: LadderMetric[] }>(
    { path: '/api/ladder' },
    () => ({ metrics: [] }),
  )
  return data.metrics
}

/** 保存型号图片；imageUrl 传空字符串表示清除 */
export async function saveRankingRowImage(input: {
  metric: string
  model: string
  imageUrl: string
}): Promise<void> {
  await transport<{ ok: boolean }>(
    {
      path: '/api/admin/rankings/rows/image',
      method: 'PATCH',
      body: input,
      token: getAdminToken() ?? undefined,
    },
    () => ({ ok: true }),
  )
}
