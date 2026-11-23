import { Router } from 'express'
import { LADDER_META, publicLadderMetrics } from '../data/ladder'
import { listCollection } from '../data/collectionStore'
import { readLocale } from '../data/locale'

/** 天梯榜：GET /api/ladder（榜单来自集合存储，meta 为既有静态元信息）。支持 ?locale=en。 */
export const ladderRouter = Router()

ladderRouter.get('/', (req, res) => {
  // 后台可维护「隐藏 / 排序」：前台只返回可见指标与可见行
  res.json({ metrics: publicLadderMetrics(listCollection('rankings', readLocale(req))), meta: LADDER_META })
})
