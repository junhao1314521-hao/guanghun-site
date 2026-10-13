/**
 * 后台写操作审计中间件。
 *
 * 用法：置于 `requireSession` 之后、目标处理器之前；监听响应 `finish`，
 * 仅在响应成功（2xx）时追加一条审计记录——**不改变响应体形状与状态码**。
 */
import type { NextFunction, Request, Response } from 'express'
import { appendAudit } from '../data/auditStore'
import type { AdminUser } from '../data/admin'

/** 取客户端 IP：优先 Express 解析的 req.ip（TRUST_PROXY 生效时含代理链首） */
export function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? ''
}

/** 取审计操作者：来自会话守卫写入的 res.locals.adminUser，未登录记为 anonymous */
function actorOf(res: Response): string {
  const user = res.locals.adminUser as AdminUser | undefined
  return user?.username ?? 'anonymous'
}

/**
 * 构造写操作审计中间件：成功响应后记录 `{ actor, action, target, ip }`。
 * @param action   动作名（如 create / update / delete / save-page …）
 * @param targetOf 由请求推导操作对象（资源 key + 记录 id / 页面 key）
 */
export function auditWrite(action: string, targetOf: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return
      appendAudit({ actor: actorOf(res), action, target: targetOf(req), ip: clientIp(req) })
    })
    next()
  }
}
