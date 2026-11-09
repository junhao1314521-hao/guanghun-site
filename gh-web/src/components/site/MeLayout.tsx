import { useEffect, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { fetchAccountOverview } from '../../api/account'
import { logout } from '../../api/auth'
import { invalidateSession, useSession } from '../../hooks/useSession'
import { useApi } from '../../hooks/useApi'

type MeIconName = 'overview' | 'chat' | 'monitor' | 'heart' | 'bell' | 'shield'

type MeNavItem = { to: string; label: string; end?: boolean; icon: MeIconName; count?: 'inquiries' | 'devices' | 'favorites' }

type MeNavGroup = { label?: string; items: MeNavItem[] }

/** 侧栏分组：服务与资产在前，账号与安全在后，低频设置不与日常入口同权 */
const ME_GROUPS: MeNavGroup[] = [
  {
    label: '服务与资产',
    items: [
      { to: '/me', label: '概览', end: true, icon: 'overview' },
      { to: '/me/inquiries', label: '我的咨询', icon: 'chat', count: 'inquiries' },
      { to: '/me/devices', label: '我的设备', icon: 'monitor', count: 'devices' },
      { to: '/me/favorites', label: '收藏', icon: 'heart', count: 'favorites' },
    ],
  },
  {
    label: '账号',
    items: [
      { to: '/me/notifications', label: '订阅与通知', icon: 'bell' },
      { to: '/me/settings', label: '账号设置', icon: 'shield' },
    ],
  },
]

/** 路径 → 当前页名（面包屑与导航高亮共用） */
function pageLabel(pathname: string): string {
  if (pathname.startsWith('/me/inquiries/')) return '工单详情'
  const hit = ME_GROUPS.flatMap((group) => group.items).find((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to),
  )
  return hit?.label ?? '个人中心'
}

/** 侧栏线性图标（16px 描边，颜色跟随 currentColor） */
function MeIcon({ name }: { name: MeIconName }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (name === 'overview') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    )
  }
  if (name === 'chat') {
    return (
      <svg {...common}>
        <path d="M21 12a8 8 0 0 1-8 8H4l2.2-3.3A8 8 0 1 1 21 12Z" />
      </svg>
    )
  }
  if (name === 'monitor') {
    return (
      <svg {...common}>
        <rect x="2.5" y="4" width="19" height="12.5" rx="2" />
        <path d="M9 20.5h6M12 16.5v4" />
      </svg>
    )
  }
  if (name === 'heart') {
    return (
      <svg {...common}>
        <path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 3C19.5 15.4 12 20 12 20Z" />
      </svg>
    )
  }
  if (name === 'bell') {
    return (
      <svg {...common}>
        <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
        <path d="M10.3 19a2 2 0 0 0 3.4 0" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

/**
 * 个人中心外壳：面包屑 + 账号卡 + 分组侧栏 + 内容区。
 * 基于真实会话（`GET /api/auth/me`）：未登录跳登录页并携带 `?from=`；退出登录后回登录页。
 * 移动端（≤900px）侧栏变为可横向滚动的标签条，账号卡压缩为一行。
 */
export function MeLayout({ children }: { children?: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading } = useSession()

  // 侧栏数量角标：与概览同一个接口，一次请求即可
  const overview = useApi(
    (signal) => (user ? fetchAccountOverview(signal) : Promise.resolve(null)),
    [user?.id],
  )

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

  const current = pageLabel(location.pathname)
  const isOverview = location.pathname === '/me'
  const stats = overview.data?.stats

  return (
    <div className="container me-container">
      <nav className="breadcrumb" aria-label="面包屑">
        <Link to="/">首页</Link>
        <span>/</span>
        {isOverview ? <span>个人中心</span> : <Link to="/me">个人中心</Link>}
        {isOverview ? null : (
          <>
            <span>/</span>
            <span>{current}</span>
          </>
        )}
      </nav>

      <div className="me-layout">
        <aside className="me-aside">
          {/* 账号卡：身份 + 绑定状态，是「我」的唯一入口 */}
          <div className="card me-account">
            <span className="me-avatar" aria-hidden="true">
              {(user.name || user.username).slice(0, 1).toUpperCase()}
            </span>
            <div className="me-account__body">
              <div className="me-account__name">{user.name || user.username}</div>
              <div className="me-account__mail">{user.email}</div>
              <span className={`me-chip ${user.phone ? 'is-ok' : 'is-warn'}`}>
                {user.phone ? '手机已绑定' : '未绑定手机'}
              </span>
            </div>
            {/* 移动端紧凑卡内的退出入口；桌面端用侧栏底部按钮 */}
            <button className="me-account__logout" type="button" onClick={handleLogout}>
              退出登录
            </button>
          </div>

          <nav className="card me-nav" aria-label="个人中心导航">
            {ME_GROUPS.map((group) => (
              <div className="me-nav__group" key={group.label ?? 'main'}>
                {group.label ? <div className="me-nav__label">{group.label}</div> : null}
                {group.items.map((item) => {
                  const count = item.count && stats ? stats[item.count] : 0
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => `me-nav__item${isActive ? ' is-active' : ''}`}
                    >
                      <span className="me-nav__icon">
                        <MeIcon name={item.icon} />
                      </span>
                      <span className="me-nav__text">{item.label}</span>
                      {count > 0 ? <span className="me-nav__count">{count}</span> : null}
                    </NavLink>
                  )
                })}
              </div>
            ))}
          </nav>

          <button className="btn btn--ghost btn--sm me-logout" type="button" onClick={handleLogout}>
            退出登录
          </button>
        </aside>

        <div className="me-main">{children ?? <Outlet />}</div>
      </div>
    </div>
  )
}
