/**
 * 后台会话上下文与路由守卫。
 * - 会话由服务端下发的 httpOnly Cookie（`gh_admin`）承载；登录状态一律以
 *   `GET /api/admin/auth/me` 的响应为准（不再持久化 localStorage 令牌）。
 * - 兼容分支：若本地仍存有旧令牌（升级前遗留），请求会继续以 Bearer 发送（见 api 层）。
 * - 应用启动即向后端校验一次；失效 → 清除旧令牌并跳登录页。
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { adminLogin, adminLogout, fetchAdminMe, type AdminLoginBody, type AdminProfile } from '../../api/admin'
import { clearAdminToken, getAdminToken } from '../../lib/adminAuth'

type AdminAuthValue = {
  profile: AdminProfile | null
  /** 会话校验中（决定是否可判定「未登录」） */
  loading: boolean
  /** 校验失败原因（令牌失效等） */
  error: Error | null
  login: (body: AdminLoginBody) => Promise<void>
  logout: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  // 启动即校验：Cookie 可能已存在，故始终进入 loading 直至 /auth/me 返回
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    // 仅当存在遗留令牌时才展示「会话失效」错误，避免未登录访客看到噪音提示
    const hadLegacyToken = Boolean(getAdminToken())
    fetchAdminMe()
      .then((user) => {
        if (alive) setProfile(user)
      })
      .catch((ex: unknown) => {
        if (!alive) return
        clearAdminToken()
        if (hadLegacyToken) setError(ex instanceof Error ? ex : new Error('登录状态校验失败'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async (body: AdminLoginBody) => {
    const result = await adminLogin(body)
    // 登录状态由服务端 Cookie 承载；清除旧令牌，避免遗留 Bearer 干扰
    clearAdminToken()
    setProfile(result.user)
    setError(null)
  }, [])

  const logout = useCallback(async () => {
    try {
      await adminLogout()
    } catch {
      // 注销请求失败也应清掉本地会话，避免「退出后仍显示已登录」
    }
    clearAdminToken()
    setProfile(null)
  }, [])

  return (
    <AdminAuthContext.Provider value={{ profile, loading, error, login, logout }}>{children}</AdminAuthContext.Provider>
  )
}

export function useAdminAuth(): AdminAuthValue {
  const value = useContext(AdminAuthContext)
  if (!value) throw new Error('useAdminAuth 必须在 AdminAuthProvider 内使用')
  return value
}

/** 会话守卫：校验中展示加载态；未登录跳转登录页并记录来源路径，登录后回跳 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { profile, loading } = useAdminAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="admin-root admin-boot" role="status" aria-live="polite">
        正在校验登录状态…
      </div>
    )
  }

  if (!profile) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <>{children}</>
}
