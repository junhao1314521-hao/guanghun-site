/**
 * 后台会话令牌存储（与前台账号体系分离，互不影响）。
 * 阶段 5b 起后台会话改由服务端 httpOnly Cookie（`gh_admin`）承载，登录状态以
 * `/api/admin/auth/me` 为准，**不再依赖 localStorage 持久化令牌**。
 * 本模块保留最小读写能力，仅用于：清理升级前的遗留令牌，以及「若存在旧令牌则继续以
 * Bearer 发送」的兼容分支。
 */

const TOKEN_KEY = 'gh-admin-token'

export function getAdminToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAdminToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // 隐私模式下写入失败不影响本次会话（内存态仍可用）
  }
}

export function clearAdminToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    // 忽略
  }
}