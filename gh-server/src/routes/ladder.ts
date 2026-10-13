import { Router } from 'express'
import { LADDER_META } from '../data/ladder'
import { listCollection } from '../data/collectionStore'
import { readLocale } from '../data/locale'

/** 天梯榜：GET /api/ladder（榜单来自集合存储，meta 为既有静态元信息）。支持 ?locale=en。 */
export const ladderRouter = Router()

ladderRouter.get('/', (req, res) => {
  res.json({ metrics: listCollection('rankings', readLocale(req)), meta: LADDER_META })
})
