/**
 * 后台鉴权中间件（自 adminRouter 抽离，供后台各路由共享）。
 *
 * 阶段 5b 加固后：
 * - 会话令牌优先取 httpOnly Cookie（`gh_admin`），其次兼容 `Authorization: Bearer <token>`；
 * - 未登录 / 令牌失效 → 401（行为与之前一致）；
 * - 写操作（POST/PUT/PATCH/DELETE）校验 `Origin` / `Referer` 与允许来源一致（与 CORS 白名单共用），
 *   不一致 → 403（CSRF 防护，配套 SameSite=Lax）。
 */
import type { NextFunction, Request, Response } from 'express'
import { getSessionUser, SESSION_COOKIE } from '../data/admin'

/** 读取路由参数为字符串（Express 5 的 ParamsDictionary 值类型含 string[]） */
export function readParam(req: Request, name: string): string {
  const value = req.params[name]
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

/** 从 Authorization 头解析 Bearer token */
export function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return undefined
  return header.slice('Bearer '.length).trim() || undefined
}

/** 从 Cookie 头解析指定 cookie（未使用 cookie-parser，手写最小解析） */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie
  if (!header) return undefined
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    if (part.slice(0, eq).trim() !== name) continue
    const raw = part.slice(eq + 1).trim()
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }
  return undefined
}

/** 会话令牌：优先 Cookie，其次 Bearer（兼容期） */
export function sessionToken(req: Request): string | undefined {
  return readCookie(req, SESSION_COOKIE) ?? bearerToken(req)
}

/** 会话守卫：未登录 / 令牌无效一律 401（前端据此跳登录页） */
export function requireSession(req: Request, res: Response, next: NextFunction): void {
  const user = getSessionUser(sessionToken(req))
  if (!user) {
    res.status(401).json({ error: '登录已失效，请重新登录' })
    return
  }
  res.locals.adminUser = user
  next()
}

/** 允许来源白名单（CORS_ORIGINS，逗号分隔）；未配置时仅同源放行 */
function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** 取来源的 host（含端口的 origin 主机）；非法 URL 返回空串 */
function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

/** 判断请求来源是否被允许：白名单命中，或与请求自身 Host 同源（scheme 可不同，兼容反代 / 隧道） */
function isAllowedOrigin(origin: string, req: Request): boolean {
  if (allowedOrigins().includes(origin)) return true
  const reqHost = req.get('host') ?? ''
  return Boolean(reqHost) && hostOf(origin) === reqHost
}

/** 从 Referer 推导来源 origin（用于缺少 Origin 时的兜底校验） */
function originFromReferer(referer: string | undefined): string {
  if (!referer) return ''
  try {
    return new URL(referer).origin
  } catch {
    return ''
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * CSRF 守卫：仅约束写方法。来源取 `Origin`，缺失时回退 `Referer`；
 * 两者皆无（curl / 服务端调用等非浏览器客户端）则放行；存在但不允许 → 403。
 */
export function csrfGuard(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next()
    return
  }
  const origin = req.headers.origin ?? originFromReferer(req.headers.referer)
  if (!origin) {
    next()
    return
  }
  if (isAllowedOrigin(origin, req)) {
    next()
    return
  }
  res.status(403).json({ error: '请求来源不被允许（CSRF 校验失败）' })
}
