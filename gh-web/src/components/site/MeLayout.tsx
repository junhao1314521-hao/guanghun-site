import { useEffect, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { logout } from '../../api/auth'
import { invalidateSession, useSession } from '../../hooks/useSession'

type MeNavItem = { to: string; label: string; end?: boolean }

/** 左侧 6 项侧导航 */
const ME_NAV: MeNavItem[] = [
  { to: '/me', label: '概览', end: true },
  { to: '/me/inquiries', label: '我的咨询' },
  { to: '/me/devices', label: '我的设备' },
  { to: '/me/favorites', label: '收藏' },
  { to: '/me/notifications', label: '订阅与通知' },
  { to: '/me/settings', label: '账号设置' },
]

/**
 * 个人中心外壳：左侧侧导航 + 右侧内容（children 或 Outlet）。
 * 基于真实会话（`GET /api/auth/me`）：未登录跳登录页并携带 `?from=`；退出登录后回登录页。
 */
export function MeLayout({ children }: { children?: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading } = useSession()

  // 未登录 → 跳登录页（携带来源，登录后回跳）
  useEffect(() => {
    if (!loading && !user) {
      navigate(`/login?from=${encodeURIComponent(location.pathname)}`, { replace: true })
    }
  }, [loading, user, navigate, location.pathname])

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // 接口失败不阻断本地登出
    }
    invalidateSession()
    navigate('/login', { replace: true })
  }

  // 会话加载中 / 未登录：展示占位，避免内容闪烁
  if (loading || !user) {
    return (
      <div className="container" style={{ paddingTop: 'var(--gh-space-7)', paddingBottom: 'var(--gh-space-9)' }} aria-busy="true">
        <span className="skeleton" style={{ display: 'block', height: 28, width: 160 }} />
        <span className="skeleton" style={{ display: 'block', height: 200, marginTop: 'var(--gh-space-5)' }} />
      </div>
    )
  }

  return (
    <div>
      {/* 页头 */}
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <span>个人中心</span>
        </nav>
        <div className="section__head" style={{ marginTop: 'var(--gh-space-4)', marginBottom: 'var(--gh-space-5)' }}>
          <div>
            <h1 className="section__title">个人中心</h1>
            <p className="section__desc">管理咨询工单、已登记设备、收藏与订阅通知。</p>
          </div>
          <div className="row">
            <button className="btn btn--secondary" type="button" onClick={handleLogout}>
              退出登录
            </button>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
        <div className="center-layout">
          {/* 左侧：用户信息 + 侧导航 */}
          <aside className="card center-nav">
            <div className="row" style={{ gap: 'var(--gh-space-3)', marginBottom: 'var(--gh-space-4)' }}>
              <span className="avatar">{(user.name || user.username).slice(0, 1)}</span>
              <div>
                <div style={{ fontWeight: 'var(--gh-weight-medium)' }}>{user.name || user.username}</div>
                <div className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                  {user.username} · {user.email}
                </div>
              </div>
            </div>
            <nav aria-label="个人中心导航">
              {ME_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `spot-row${isActive ? ' is-active' : ''}`}
                >
                  <span className="spot-row__name">{item.label}</span>
                  <span className="news-row__go" aria-hidden="true">
                    ›
                  </span>
                </NavLink>
              ))}
            </nav>
            <p className="field__hint" style={{ marginTop: 'var(--gh-space-4)' }}>
              数据按你的账号隔离保存。
            </p>
          </aside>

          {/* 右侧：内容 */}
          <div>{children ?? <Outlet />}</div>
        </div>
      </div>
    </div>
  )
}
