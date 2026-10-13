/**
 * 后台 RBAC 鉴权中间件（PRD 阶段 4C）。
 *
 * 语义（与既有约定一致）：
 * - 未登录 / 会话失效 → **401**（由 `requireSession` 负责，本中间件仅在其后兜底判定）；
 * - 已登录但无所需 scope → **403 `{ error }`**。
 *
 * 用法：`requireSession, requireScope('content'), ...`；资源类端点用 `requireResourceScope`（按 `:key` 归属）。
 */
import type { NextFunction, Request, Response } from 'express'
import { isCollectionKey } from '../data/collectionStore'
import { hasScope, resourceScope, type Scope } from '../data/roles'
import type { AdminUser } from '../data/admin'
import { readParam } from './adminAuth'

/** 取当前会话用户（由 requireSession 写入 res.locals） */
function currentUser(res: Response): AdminUser | undefined {
  return res.locals.adminUser as AdminUser | undefined
}

/** 统一的无权限响应（403） */
function deny(res: Response, scope: Scope): void {
  res.status(403).json({ error: `没有权限执行该操作（需要 ${scope} 权限）` })
}

/** 要求指定 scope；未登录 → 401，无权限 → 403 */
export function requireScope(scope: Scope) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const user = currentUser(res)
    if (!user) {
      res.status(401).json({ error: '登录已失效，请重新登录' })
      return
    }
    if (hasScope(user.scopes, scope)) {
      next()
      return
    }
    deny(res, scope)
  }
}

/** 按资源 `:key` 归属判定所需 scope（集合 / 内容类栏目 → content；其余 → system） */
export function requireResourceScope(req: Request, res: Response, next: NextFunction): void {
  const user = currentUser(res)
  if (!user) {
    res.status(401).json({ error: '登录已失效，请重新登录' })
    return
  }
  const key = readParam(req, 'key')
  const scope = resourceScope(key, isCollectionKey(key))
  if (hasScope(user.scopes, scope)) {
    next()
    return
  }
  deny(res, scope)
}
