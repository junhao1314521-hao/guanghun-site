import type { Express } from 'express'
import { adminPagesRouter } from './adminPagesRouter'
import { adminRouter } from './adminRouter'
import { articlesRouter } from './articlesRouter'
import { authRouter } from './authRouter'
import { backupsRouter } from './backupsRouter'
import { brandRouter } from './brandRouter'
import { businessExtraRouter } from './businessExtraRouter'
import { catalogRouter } from './catalog'
import { contentRouter } from './content'
import { contentStoreRouter } from './contentStoreRouter'
import { ladderRouter } from './ladder'
import { legalRouter } from './legal'
import { mediaRouter } from './mediaRouter'
import { productExtraRouter } from './productExtraRouter'
import { publishRouter } from './publishRouter'
import { registerSeoRoutes } from './seo'
import { searchRouter } from './search'
import { supportExtraRouter } from './supportExtraRouter'
import { templatesRouter } from './templatesRouter'
import { trackRouter } from './trackRouter'
import { uploadsRouter } from './uploadsRouter'
import { csrfGuard } from '../middleware/adminAuth'

/**
 * 挂载全部业务路由。
 * 基础 12 条端点对齐《光魂官网 · 后端接口契约 v1》；
 * 其余为前台补全页面（文章 / 下载 / 问答 / 咨询 / 商业合作 / 对比 / 账号）所需的扩展端点。
 *
 * 挂载顺序：更具体的子路径路由（series / compare / ladder/:metric / account/inquiries 等）
 * 先于其泛化前缀（catalog / ladder / content）挂载，避免被先匹配。
 */
export function registerRoutes(app: Express): void {
  // SEO：站点根级动态 sitemap.xml / robots.txt（须早于 app.ts 的静态托管与 SPA 回退）
  registerSeoRoutes(app)
  app.use('/api', productExtraRouter) // /products/series/:slug、/compare、/ladder/:metric
  app.use('/api/products', catalogRouter)
  app.use('/api', articlesRouter) // /articles、/articles/:id、/news
  app.use('/api', supportExtraRouter) // /downloads、/faq、/support/model/:id、/inquiry、/contact
  app.use('/api', businessExtraRouter) // /business/scenes、/business/cases、/business/venues
  app.use('/api', brandRouter) // /brand/:slug
  app.use('/api', authRouter) // /auth/*、/account/inquiries
  // 公开埋点（无需登录）：/api/track/view、/api/track/download
  app.use('/api/track', trackRouter)
  // 后台写操作 CSRF 守卫（仅约束 POST/PUT/PATCH/DELETE；与 CORS 白名单共用来源校验）
  app.use('/api/admin', csrfGuard)
  app.use('/api/admin', adminPagesRouter) // 后台内容库（页面装修 / 站点配置），先于 adminRouter
  app.use('/api/admin', templatesRouter) // 后台「模板」集合（页面区块快照）
  app.use('/api/admin', backupsRouter) // 后台「备份 / 恢复 / 重置」
  app.use('/api/admin', publishRouter) // 后台「发布记录与回滚」
  app.use('/api/admin', adminRouter) // 后台管理系统（本地鉴权 / 资源 / 分析）
  app.use('/api/admin', uploadsRouter) // 后台文件上传 / 素材库
  app.use('/api/search', searchRouter)
  app.use('/api/media', mediaRouter) // 公开素材变体查询（/media/variants?url=...），先于泛化 /api
  app.use('/api/ladder', ladderRouter)
  app.use('/api/legal', legalRouter)
  app.use('/api/content', contentStoreRouter) // 内容库公开端点（更具体，先于下面的泛化 /api）
  app.use('/api', contentRouter) // home / support / business / about / center / account
}