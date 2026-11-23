/**
 * 后台 · 成员与权限（挂载于 /api/admin，需登录 + `system` 权限）。
 *
 * 数据真源为后台账号表 `admin_users`（不是资源集合里的「工作人员」演示数据）：
 *   GET    /admin/admin-users                    → { items }（含角色 / 权限集 / 会话数）
 *   POST   /admin/admin-users                    body { username, name, role, password }
 *   PUT    /admin/admin-users/:id                body { name?, role? }
 *   POST   /admin/admin-users/:id/reset-password → { tempPassword }（一次显示，并强制下线）
 *   POST   /admin/admin-users/:id/logout         → 作废该账号全部会话
 *   DELETE /admin/admin-users/:id                → 删除（禁止删自己 / 内置 admin / 最后一位超管）
 */
import { Router } from 'express'
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  resetAdminUserPassword,
  revokeAdminUserSessions,
  updateAdminUser,
  type AdminUser,
} from '../data/admin'
import { readParam, requireSession } from '../middleware/adminAuth'
import { requireScope } from '../middleware/rbac'
import { auditWrite } from '../middleware/audit'

export const adminUsersRouter = Router()

/** 当前登录成员 id */
function actorId(res: import('express').Response): string {
  const user = res.locals.adminUser as AdminUser | undefined
  return user?.id ?? ''
}

adminUsersRouter.get('/admin-users', requireSession, requireScope('system'), (_req, res) => {
  res.json({ items: listAdminUsers() })
})

adminUsersRouter.post(
  '/admin-users',
  requireSession,
  requireScope('system'),
  auditWrite('create-admin-user', (req) => `后台成员 ${String((req.body ?? {}).username ?? '')}`),
  (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>
    const outcome = createAdminUser({
      username: typeof body.username === 'string' ? body.username : '',
      name: typeof body.name === 'string' ? body.name : '',
      role: typeof body.role === 'string' ? body.role : '',
      password: typeof body.password === 'string' ? body.password : '',
    })
    if (!outcome.ok) {
      res.status(400).json({ error: outcome.error })
      return
    }
    res.status(201).json({ ok: true, item: outcome.member })
  },
)

adminUsersRouter.put(
  '/admin-users/:id',
  requireSession,
  requireScope('system'),
  auditWrite('update-admin-user', (req) => `后台成员 ${readParam(req, 'id')}`),
  (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>
    const outcome = updateAdminUser(readParam(req, 'id'), {
      name: typeof body.name === 'string' ? body.name : undefined,
      role: typeof body.role === 'string' ? body.role : undefined,
    })
    if (!outcome.ok) {
      res.status(400).json({ error: outcome.error })
      return
    }
    res.json({ ok: true, item: outcome.member })
  },
)

adminUsersRouter.post(
  '/admin-users/:id/reset-password',
  requireSession,
  requireScope('system'),
  auditWrite('reset-admin-user-password', (req) => `后台成员 ${readParam(req, 'id')}`),
  (req, res) => {
    const outcome = resetAdminUserPassword(readParam(req, 'id'))
    if (!outcome.ok) {
      res.status(404).json({ error: outcome.error })
      return
    }
    res.json({ ok: true, tempPassword: outcome.tempPassword })
  },
)

adminUsersRouter.post(
  '/admin-users/:id/logout',
  requireSession,
  requireScope('system'),
  auditWrite('force-logout-admin-user', (req) => `后台成员 ${readParam(req, 'id')}`),
  (req, res) => {
    const removed = revokeAdminUserSessions(readParam(req, 'id'))
    res.json({ ok: true, removed })
  },
)

adminUsersRouter.delete(
  '/admin-users/:id',
  requireSession,
  requireScope('system'),
  auditWrite('delete-admin-user', (req) => `后台成员 ${readParam(req, 'id')}`),
  (req, res) => {
    const outcome = deleteAdminUser(readParam(req, 'id'), actorId(res))
    if (!outcome.ok) {
      res.status(400).json({ error: outcome.error })
      return
    }
    res.json({ ok: true })
  },
)
