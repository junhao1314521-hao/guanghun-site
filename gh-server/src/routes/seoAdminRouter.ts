/**
 * SEO 元信息：公开读取 + 后台编辑。
 *
 *   公开（挂载于 /api）
 *     GET /seo/meta                     → { items: SeoOverride[] }（仅已覆盖的静态路由，前端启动时一次拉取）
 *
 *   后台（挂载于 /api/admin，需 content 权限）
 *     GET    /seo                       → { items: SeoAdminItem[] }（全量静态路由 + 默认值 + 覆盖状态）
 *     PUT    /seo                       body { path,title,description,indexable } → { item }
 *     DELETE /seo?path=/business        → { item }（删除覆盖，恢复默认）
 */
import { Router } from 'express'
import {
  listSeoAdminItems,
  listSeoOverrides,
  resetSeoOverride,
  saveSeoOverride,
} from '../data/seoStore'
import { requireSession } from '../middleware/adminAuth'
import { requireScope } from '../middleware/rbac'
import { auditWrite } from '../middleware/audit'

/** 公开读取：前端 SEO 覆盖（体积小，禁用缓存以便后台改完刷新即生效） */
export const seoMetaRouter = Router()

seoMetaRouter.get('/seo/meta', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.json({ items: listSeoOverrides() })
})

/** 后台编辑 */
export const seoAdminRouter = Router()

seoAdminRouter.get('/seo', requireSession, requireScope('content'), (_req, res) => {
  res.json({ items: listSeoAdminItems() })
})

seoAdminRouter.put(
  '/seo',
  requireSession,
  requireScope('content'),
  auditWrite('update-seo', (req) => String((req.body ?? {}).path ?? '')),
  (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>
    const outcome = saveSeoOverride({
      path: typeof body.path === 'string' ? body.path : '',
      title: typeof body.title === 'string' ? body.title : '',
      description: typeof body.description === 'string' ? body.description : '',
      indexable: body.indexable !== false,
      image: typeof body.image === 'string' ? body.image : '',
    })
    if (!outcome.ok) {
      res.status(400).json({ error: outcome.error })
      return
    }
    res.json({ ok: true, item: outcome.item })
  },
)

seoAdminRouter.delete(
  '/seo',
  requireSession,
  requireScope('content'),
  auditWrite('reset-seo', (req) => String(req.query.path ?? '')),
  (req, res) => {
    const path = typeof req.query.path === 'string' ? req.query.path : ''
    const outcome = resetSeoOverride(path)
    if (!outcome.ok) {
      res.status(400).json({ error: outcome.error })
      return
    }
    res.json({ ok: true, item: outcome.item })
  },
)
