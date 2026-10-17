/**
 * 后台外壳：侧边导航（分组可折叠 + 可搜索）+ 顶栏（面包屑 / 用户 / 注销）+ 内容区。
 * - 导航与栏目定义来自 `data/adminResources.ts`（单一真源），新增栏目无需改本文件。
 * - 桌面固定侧栏；≤1023px 收起为抽屉，由顶栏按钮开合（Esc 关闭 + 锁背景滚动）。
 * - 顶栏内层与内容同宽居中；装修器页面（.../builder）放宽到宽轨道。
 * - 内容区外套 ErrorBoundary，避免渲染异常导致整页白屏。
 */
import { useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ADMIN_NAV, ANALYTICS_SCOPES, adminResource, type AdminNavItem } from '../../data/adminResources'
// 「栏目 key → 所需 scope」的单一映射源（与后端 rbac.ts / roles.ts 对照，见该文件头注释）
import { hasScope, requiredScope } from '../../data/adminScopes'
import { AdminIcon } from '../../components/admin/AdminIcon'
import { BrandMark } from '../../components/site/BrandMark'
import { useAdminAuth } from '../../components/admin/AdminAuth'
import { AdminTourButton, AdminTourProvider } from '../../components/admin/AdminTour'
import { ErrorBoundary } from '../../components/site/ErrorBoundary'
import { IconChevronDown, IconChevronLeft, IconChevronRight, IconClose, IconMenu, IconMoon, IconSearch, IconSun } from '../../components/ui/Icon'
import { toggleTheme } from '../../lib/theme'
import { useTheme } from '../../lib/useTheme'

const SCOPE_LABEL: Record<string, string> = Object.fromEntries(ANALYTICS_SCOPES.map((s) => [s.scope, s.label]))

/** 侧栏分组折叠状态持久化键 */
const NAV_COLLAPSE_KEY = 'gh-admin-nav-collapsed'
/** 侧栏整体折叠（桌面图标模式）状态持久化键 */
const SIDEBAR_COLLAPSE_KEY = 'gh-admin-sidebar-collapsed'
/** 桌面侧栏宽度持久化键 */
const SIDEBAR_WIDTH_KEY = 'gh-admin-sidebar-width'
/** 侧栏宽度区间（拖拽边界） */
const SIDEBAR_MIN = 200
const SIDEBAR_MAX = 320

/** 读取持久化的侧栏宽度（夹取到 [200, 320]，异常回退默认 240） */
function readSideWidth(): number {
  try {
    const raw = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY))
    if (Number.isFinite(raw) && raw > 0) return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(raw)))
  } catch {
    // 忽略隐私模式等读取失败
  }
  return 240
}

/** 由路径推导面包屑；最后一项即页面标题 */
function adminTrail(pathname: string): { label: string; to?: string }[] {
  const rest = pathname.split('/').filter(Boolean).slice(1) // 去掉 'admin'
  if (rest.length === 0) return [{ label: '工作台' }]

  const [first, second] = rest
  if (first === 'analytics') {
    return [{ label: '工作台', to: '/admin' }, { label: SCOPE_LABEL[second ?? ''] ?? '数据分析' }]
  }

  const res = adminResource(first)
  const trail: { label: string; to?: string }[] = [{ label: '工作台', to: '/admin' }]
  if (!res) return [...trail, { label: '未知栏目' }]

  trail.push({ label: res.label, to: second ? `/admin/${first}` : undefined })
  if (second === 'new') trail.push({ label: '新建' })
  else if (second) trail.push({ label: '编辑' })
  return trail
}

/** 导航项展示标签（用于搜索过滤） */
function navItemLabel(item: AdminNavItem): string {
  if (item.kind === 'link') return item.label
  return adminResource(item.key)?.label ?? item.key
}

/**
 * 侧栏项可见性：
 * - 固定链接（工作台首页 / 数据分析）仅需登录，恒可见；
 * - 资源栏目按其「所需 scope」判定；未知 key 由 requiredScope 归为 system（最小权限）。
 * - `scopes` 为 null（会话未就绪，如加载中）时**乐观全显**，待 /auth/me 返回后再收敛；
 *   admin 持有 `'*'`，经 hasScope 恒通过，故裁剪不会误伤管理员。
 */
function canSeeNavItem(item: AdminNavItem, scopes: readonly string[] | null): boolean {
  if (item.kind === 'link') return true
  if (!scopes) return true
  return hasScope(scopes, requiredScope(item.key))
}

/** 单个导航项：link 为固定链接，resource 由配置解析为列表地址 */
function NavEntry({ item, onNavigate }: { item: AdminNavItem; onNavigate: () => void }) {
  if (item.kind === 'link') {
    return (
      <NavLink
        to={item.to}
        end={item.to === '/admin'}
        title={item.label}
        className={({ isActive }) => `admin-nav__link${isActive ? ' is-active' : ''}`}
        onClick={onNavigate}
      >
        <span className="admin-nav__icon">
          <AdminIcon name={item.icon} size={18} />
        </span>
        <span className="admin-nav__label">{item.label}</span>
      </NavLink>
    )
  }
  const res = adminResource(item.key)
  if (!res) return null
  return (
    <NavLink
      to={`/admin/${item.key}`}
      title={res.label}
      data-tour={item.key}
      className={({ isActive }) => `admin-nav__link${isActive ? ' is-active' : ''}`}
      onClick={onNavigate}
    >
      <span className="admin-nav__icon">
        <AdminIcon name={res.icon} size={18} />
      </span>
      <span className="admin-nav__label">{res.label}</span>
    </NavLink>
  )
}

function readCollapsed(): ReadonlySet<string> {
  try {
    const raw = window.localStorage.getItem(NAV_COLLAPSE_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

/** 读取侧栏整体折叠态（桌面图标模式）；默认展开 */
function readSideCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

export function AdminLayout() {
  const { profile, loading, logout } = useAdminAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const [navOpen, setNavOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => readCollapsed())
  // 桌面侧栏整体折叠（图标模式，宽 64px）；≤1023px 仍为抽屉，本状态不生效
  const [sideCollapsed, setSideCollapsed] = useState<boolean>(() => readSideCollapsed())
  // 桌面侧栏宽度（可拖拽调整，200–320px；折叠时使用折叠令牌宽度）
  const [sideWidth, setSideWidth] = useState<number>(() => readSideWidth())

  const trail = adminTrail(pathname)
  const title = trail[trail.length - 1]?.label ?? '工作台'
  // 装修器页面放宽内容轨道
  const isWide = pathname.endsWith('/builder')

  // 同步文档标题（对外部系统的副作用，非派生 state）
  useEffect(() => {
    document.title = `光魂后台 · ${title}`
  }, [title])

  // 标记后台路由：使窗口滚动条套用后台的细窄极简样式（离开后台即移除，不影响前台）
  useEffect(() => {
    document.documentElement.setAttribute('data-admin', '')
    return () => document.documentElement.removeAttribute('data-admin')
  }, [])

  // 记忆折叠状态
  useEffect(() => {
    try {
      window.localStorage.setItem(NAV_COLLAPSE_KEY, JSON.stringify(Array.from(collapsed)))
    } catch {
      // 忽略隐私模式等写入失败
    }
  }, [collapsed])

  // 记忆侧栏整体折叠态
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, sideCollapsed ? '1' : '0')
    } catch {
      // 忽略隐私模式等写入失败
    }
  }, [sideCollapsed])

  // 记忆侧栏宽度
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sideWidth))
    } catch {
      // 忽略隐私模式等写入失败
    }
  }, [sideWidth])

  // 移动端抽屉打开时：锁背景滚动 + Esc 关闭
  useEffect(() => {
    if (!navOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [navOpen])

  const onLogout = async () => {
    await logout()
    // 带 ?manual=1：退出后停在登录页，不被演示环境的自动登录立刻登回去
    navigate('/admin/login?manual=1', { replace: true })
  }

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  /** 夹取宽度到合法区间 */
  const clampWidth = (value: number) => Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(value)))

  /** 拖拽侧栏右边缘调整宽度（pointer 事件，随指针实时更新） */
  const onResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (sideCollapsed) return
    event.preventDefault()
    const startX = event.clientX
    const startWidth = sideWidth
    const onMove = (move: PointerEvent) => setSideWidth(clampWidth(startWidth + (move.clientX - startX)))
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  /** 键盘调整侧栏宽度（←/→ 微调，Shift 加速，Home/End 到边界） */
  const onResizeKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 32 : 8
    let next: number | null = null
    if (event.key === 'ArrowLeft') next = sideWidth - step
    else if (event.key === 'ArrowRight') next = sideWidth + step
    else if (event.key === 'Home') next = SIDEBAR_MIN
    else if (event.key === 'End') next = SIDEBAR_MAX
    if (next === null) return
    event.preventDefault()
    setSideWidth(clampWidth(next))
  }

  // 侧栏宽度经 CSS 变量下发（桌面网格与抽屉宽度共用该令牌；折叠态改用折叠令牌）
  const shellStyle = { '--gh-sidebar-width': `${sideWidth}px` } as CSSProperties

  // 搜索：按 label 实时过滤；过滤态下强制展开
  const q = query.trim().toLowerCase()
  // 会话未就绪（loading）→ 乐观全显（null），待 /auth/me 返回后再按 scopes 收敛，避免误隐藏
  const scopes = loading ? null : profile?.scopes ?? null
  // 先按权限裁剪（隐藏无权栏目；组内子项全隐藏 → 整组标题一并隐藏），再按搜索词过滤
  const groups = useMemo(() => {
    const allowed = ADMIN_NAV.map((group) => ({
      ...group,
      items: group.items.filter((item) => canSeeNavItem(item, scopes)),
    })).filter((group) => group.items.length > 0)
    if (!q) return allowed
    return allowed
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => navItemLabel(item).toLowerCase().includes(q)),
      }))
      .filter((group) => group.items.length > 0)
  }, [q, scopes])

  return (
    <AdminTourProvider>
      <div className="admin-root">
        <div className={`admin-shell${sideCollapsed ? ' is-collapsed' : ''}`} style={shellStyle}>
        <aside className={`admin-side${navOpen ? ' is-open' : ''}`} aria-label="后台导航">
          <div className="admin-side__brand">
            <Link className="logo admin-side__logo" to="/admin" aria-label="光魂后台首页">
              <BrandMark className="logo__mark admin-side__mark" />
              <span className="logo__word admin-side__word" role="img" aria-label="光魂" />
            </Link>
            <span className="tag admin-side__badge">管理端</span>
            <button
              type="button"
              className="btn btn--ghost btn--sm admin-side__close"
              aria-label="关闭导航"
              onClick={() => setNavOpen(false)}
            >
              <IconClose size={18} />
            </button>
            {/* 桌面「收束 / 展开侧栏」：置于侧栏 logo 区右端，与顶栏面包屑分离；收束后仍在窄条顶部可点 */}
            <button
              type="button"
              className="btn btn--ghost btn--sm admin-side__collapse"
              aria-label={sideCollapsed ? '展开侧栏' : '收起侧栏'}
              aria-expanded={!sideCollapsed}
              title={sideCollapsed ? '展开侧栏' : '收起侧栏'}
              onClick={() => setSideCollapsed((v) => !v)}
            >
              {sideCollapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
            </button>
          </div>

          <nav className="admin-nav" aria-label="后台栏目" data-tour="nav">
            <div className="admin-nav__search search">
              <span className="search__icon" aria-hidden="true">
                <IconSearch size={16} />
              </span>
              <input
                className="input"
                type="search"
                value={query}
                placeholder="搜索栏目…"
                aria-label="搜索栏目"
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button type="button" className="admin-search__clear" aria-label="清空搜索" onClick={() => setQuery('')}>
                  <IconClose size={14} />
                </button>
              )}
            </div>

            {/* 工作台是后台首页：直接作为独立入口，不再套一级分组 */}
            <NavLink
              to="/admin"
              end
              title="工作台"
              className={({ isActive }) => `admin-nav__link admin-nav__link--home${isActive ? ' is-active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              <span className="admin-nav__icon">
                <AdminIcon name="grid" size={18} />
              </span>
              <span className="admin-nav__label">工作台</span>
            </NavLink>

            {groups.map((group) => {
              const isCollapsed = !q && collapsed.has(group.key)
              return (
                <div className="admin-nav__group" key={group.key}>
                  <button
                    type="button"
                    className="admin-nav__group-title"
                    aria-expanded={!isCollapsed}
                    onClick={() => toggleGroup(group.key)}
                  >
                    <span>{group.label}</span>
                    <span className="admin-nav__chevron" aria-hidden="true">
                      <IconChevronDown size={14} />
                    </span>
                  </button>
                  {/* 二级列表常驻 DOM，用 grid-template-rows 0fr→1fr 做下拉展开动画；
                      收起时 visibility:hidden，避免里面的链接仍能被 Tab 聚焦到 */}
                  <div className={`admin-nav__sub${isCollapsed ? '' : ' is-open'}`} aria-hidden={isCollapsed}>
                    <div className="admin-nav__sub-inner">
                      <div className="admin-nav__list">
                        {group.items.map((item) => (
                          <NavEntry
                            key={item.kind === 'link' ? item.to : item.key}
                            item={item}
                            onNavigate={() => setNavOpen(false)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {groups.length === 0 && <p className="admin-nav__empty">未找到匹配栏目</p>}
          </nav>

          {/* 桌面侧栏宽度拖拽把手（键盘可调：←/→ 或 Home/End） */}
          <div
            className="admin-side__resizer"
            role="separator"
            aria-orientation="vertical"
            aria-label="调整侧栏宽度"
            aria-valuenow={sideWidth}
            aria-valuemin={SIDEBAR_MIN}
            aria-valuemax={SIDEBAR_MAX}
            tabIndex={0}
            onPointerDown={onResizeStart}
            onKeyDown={onResizeKey}
          />
        </aside>

        <div className="admin-body">
          <header className="admin-topbar">
            <div className={`admin-topbar__inner${isWide ? ' admin-topbar__inner--wide' : ''}`}>
              <button
                type="button"
                className="btn btn--ghost btn--sm admin-topbar__toggle"
                aria-label="展开导航"
                aria-expanded={navOpen}
                onClick={() => setNavOpen((v) => !v)}
              >
                <IconMenu size={18} />
              </button>

              <nav className="breadcrumb" aria-label="面包屑">
                {trail.map((node, index) =>
                  node.to ? (
                    <span
                      key={node.label}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--gh-space-2)' }}
                    >
                      {index > 0 && <span aria-hidden="true">/</span>}
                      <Link to={node.to}>{node.label}</Link>
                    </span>
                  ) : (
                    <span
                      key={node.label}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--gh-space-2)' }}
                    >
                      {index > 0 && <span aria-hidden="true">/</span>}
                      <span aria-current="page">{node.label}</span>
                    </span>
                  ),
                )}
              </nav>

              <span className="admin-topbar__spacer" />

              <Link className="btn btn--ghost btn--sm" to="/" target="_blank" rel="noreferrer">
                查看官网
              </Link>

              <AdminTourButton />

              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
                title={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
              </button>

              <div className="admin-topbar__user">
                <span className="avatar" aria-hidden="true">
                  {(profile?.name ?? '?').slice(0, 1)}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                  <span className="admin-topbar__name">{profile?.name ?? '未登录'}</span>
                  <span className="admin-topbar__role">{profile?.role ?? ''}</span>
                </span>
              </div>

              <button type="button" className="btn btn--secondary btn--sm" onClick={onLogout}>
                退出登录
              </button>
            </div>
          </header>

          <main className="admin-main">
            <ErrorBoundary
              key={pathname}
              renderFallback={(reset) => (
                <div className="admin-page">
                  <div className="empty">
                    <div className="empty__title">页面出错了</div>
                    <p className="empty__desc">后台页面渲染异常，可重试或切换到其它栏目。</p>
                    <div style={{ display: 'flex', gap: 'var(--gh-space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button type="button" className="btn btn--secondary btn--sm" onClick={reset}>
                        重试
                      </button>
                      <Link className="btn btn--secondary btn--sm" to="/admin">
                        返回工作台
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            >
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>

        <div className={`admin-overlay${navOpen ? ' is-open' : ''}`} onClick={() => setNavOpen(false)} aria-hidden="true" />
      </div>
    </AdminTourProvider>
  )
}
