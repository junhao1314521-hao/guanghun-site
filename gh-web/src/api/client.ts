/**
 * 接口层 · 传输适配器（单一真源）
 * ================================
 * 传输器接收两件事：
 *   1. `request`（请求描述）：据此发起 HTTP 请求的路径 / 方法 / 查询 / 载荷；
 *   2. `mockResolve`（占位数据工厂）：保留数据入口以对齐资源模块签名，真实 HTTP 传输器不调用。
 *
 * 生产构建必须注入后端地址 `VITE_API_BASE`，`transport` 即按该地址发起真实 HTTP 请求；
 * 未注入时在模块加载期抛出明确错误，避免出现「静默空白页」。
 * 本地开发默认地址见 `.env.development`（指向 http://localhost:8787，需先启动 `gh-server`）。
 */

import { localeQuery } from '../lib/locale'

/** 统一错误类型：页面据此区分「请求失败」与「空结果」两种数据状态 */
export class ApiError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** 请求描述：由传输器据此发起真实请求 */
export type ApiRequest = {
  /** 接口路径，如 `/api/products`、`/api/products/gh-m900-pro` */
  path: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** 查询参数；值为 undefined 的键会被忽略 */
  query?: Record<string, string | number | undefined>
  /** 请求体（GET 通常不传） */
  body?: unknown
  /** 取消信号：切页 / 依赖变化时中止在途请求 */
  signal?: AbortSignal
  /** 会话令牌：存在时以 `Authorization: Bearer` 发送（后台鉴权用；兼容分支） */
  token?: string
}

/**
 * 传输器契约：资源模块只依赖本类型。
 * @param request     请求描述
 * @param mockResolve 占位数据工厂（保留入口，真实 HTTP 传输器不调用）
 */
export type Transport = <T>(request: ApiRequest, mockResolve: () => T) => Promise<T>

/**
 * 真实 HTTP 传输器：按请求描述发起 fetch，并把 HTTP / 网络状态映射为 `ApiError`。
 * - `baseUrl` 非空：以之为基址构造**绝对 URL**（分离部署 / 本地联调）。
 * - `baseUrl` 为空字符串：使用**相对路径**请求（同源部署：前端与后端同域，走 `/api/...`）。
 * 非 2xx → `ApiError(msg, res.status)`（404 语义保持一致）；网络失败 → `ApiError(msg, 0)`。
 */
export function createHttpTransport(baseUrl: string): Transport {
  return async function httpTransport<T>(request: ApiRequest): Promise<T> {
    // 语言透传：当前语言为英文时统一附上 `?locale=en`（显式 query 可覆盖）。
    // 后端对未知 / 非 en 的 locale 一律按默认中文处理，故对管理端请求亦无副作用。
    const merged = { ...localeQuery(), ...(request.query ?? {}) }
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined) search.set(key, String(value))
    }
    const query = search.toString()
    let url: string
    if (baseUrl) {
      const u = new URL(request.path, baseUrl)
      if (query) u.search = query
      url = u.toString()
    } else {
      // 同源：相对路径，避免构造绝对 URL（兼容反向代理 / 隧道环境）
      url = request.path + (query ? `?${query}` : '')
    }
    const hasBody = request.body !== undefined
    const headers: Record<string, string> = {}
    if (hasBody) headers['Content-Type'] = 'application/json'
    if (request.token) headers['Authorization'] = `Bearer ${request.token}`
    let res: Response
    try {
      res = await fetch(url, {
        method: request.method ?? 'GET',
        headers: Object.keys(headers).length ? headers : undefined,
        body: hasBody ? JSON.stringify(request.body) : undefined,
        signal: request.signal,
        // 携带 httpOnly 会话 Cookie（后台鉴权主通道；同源部署必需）
        credentials: 'include',
      })
    } catch (error) {
      // 主动取消：原样抛出 AbortError，交由 useApi 忽略，不降级为「网络失败」
      if ((error as { name?: string } | null)?.name === 'AbortError') throw error
      throw new ApiError('网络连接失败，请稍后重试', 0)
    }
    if (!res.ok) {
      // 优先采用后端给出的可读错误（如「账号或密码不正确」），否则回退到状态码文案
      let message = `请求失败（${res.status}）`
      try {
        const payload = (await res.json()) as { error?: unknown }
        if (typeof payload?.error === 'string' && payload.error.trim()) message = payload.error
      } catch {
        // 响应非 JSON：保留状态码文案
      }
      throw new ApiError(message, res.status)
    }
    return (await res.json()) as T
  }
}

/**
 * 传输器实例。
 * - 未注入 `VITE_API_BASE`（undefined）→ 加载期抛出可操作错误，杜绝「静默空白页」。
 * - 显式设为空字符串 `VITE_API_BASE=""` → **同源部署**，请求走相对路径 `/api/...`。
 * - 设为完整地址 → **分离部署**，请求该基址。
 */
const API_BASE = import.meta.env.VITE_API_BASE as string | undefined
if (API_BASE === undefined) {
  throw new Error(
    '[api] 未配置 VITE_API_BASE：同源部署请显式设为空字符串（VITE_API_BASE=""），' +
      '分离部署请填入后端地址（如 VITE_API_BASE=https://api.example.com）。',
  )
}
export const transport: Transport = createHttpTransport(API_BASE)