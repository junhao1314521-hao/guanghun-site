/**
 * 后台登录页（本地鉴权）。提交调用真实 POST /api/admin/auth/login，
 * 成功后写入会话令牌并跳回来源页；已登录访问本页将直接回跳。
 *
 * 免登录（演示便利）：默认**自动填充演示账号并自动登录**，直接进入工作台。
 *   - 上线前关闭：构建时加 `VITE_ADMIN_AUTO_LOGIN=off`（例如 `VITE_ADMIN_AUTO_LOGIN=off npm run build`），
 *     即恢复为正常登录页；也可在项目根 `.env` 写入 `VITE_ADMIN_AUTO_LOGIN=off` 长期关闭。
 *   - 需要临时手动登录（验证错误密码 / 测试退出登录）：访问 `/admin/login?manual=1`。
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../components/admin/AdminAuth'
import { AuthShell } from '../../components/site/AuthShell'

type LoginState = { from?: string } | null

/** 演示用后台账号（与后端种子账号一致）；如需改演示凭据，构建期注入 VITE_ADMIN_DEMO_USER / VITE_ADMIN_DEMO_PASS */
const DEMO_USER = import.meta.env.VITE_ADMIN_DEMO_USER ?? 'admin'
const DEMO_PASS = import.meta.env.VITE_ADMIN_DEMO_PASS ?? 'admin123'

/**
 * 是否开启「免登录」。默认开启（方便演示与验收）；
 * 上线前用 `VITE_ADMIN_AUTO_LOGIN=off` 构建即可关闭。显式 `?manual=1` 时始终走手动登录。
 */
const AUTO_LOGIN_ENABLED = import.meta.env.VITE_ADMIN_AUTO_LOGIN !== 'off'

export function AdminLoginPage() {
  const { profile, loading, error: sessionError, login } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LoginState)?.from ?? '/admin'

  // ?manual=1 时不自动填充、不自动登录，便于验证错误密码 / 退出登录流程
  const manual = new URLSearchParams(location.search).get('manual') === '1'
  const autoLogin = AUTO_LOGIN_ENABLED && !manual

  const [username, setUsername] = useState(autoLogin ? DEMO_USER : '')
  const [password, setPassword] = useState(autoLogin ? DEMO_PASS : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoTried = useRef(false)

  useEffect(() => {
    document.title = '光魂后台 · 登录'
  }, [])

  // 已登录（含刷新后令牌仍有效）直接回跳，避免重复登录
  useEffect(() => {
    if (!loading && profile) navigate(from, { replace: true })
  }, [loading, profile, from, navigate])

  // 自动登录：仅在演示开发环境、未登录、且未带 ?manual=1 时执行一次
  useEffect(() => {
    if (!autoLogin || loading || profile || autoTried.current) return
    autoTried.current = true
    login({ username: DEMO_USER, password: DEMO_PASS }).catch((ex) =>
      setError(ex instanceof Error ? ex.message : '自动登录失败，请手动登录'),
    )
  }, [autoLogin, loading, profile, login])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!username.trim() || !password) {
      setError('请输入账号与密码')
      return
    }
    setSubmitting(true)
    try {
      await login({ username: username.trim(), password })
      navigate(from, { replace: true })
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : '登录失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-root">
      <AuthShell
        variant="full"
        badge="管理端"
        eyebrow="ADMIN / SIGN IN"
        headline="光魂内容管理系统"
        subtitle="统一管理产品、内容、装修与服务数据，改动即时反映到前台。"
        points={['页面装修器 · 可视化拖拽编辑', '集合数据 · 前后台单一数据源', '角色权限 · 发布与版本备份']}
      >
        <div className="card">
          <h1 className="card__title">登录后台</h1>
          <p className="card__desc">
            {autoLogin
              ? '演示环境：已自动填充演示账号并自动登录，稍候即进入工作台。'
              : '请使用后台账号登录。此为本地上线的占位鉴权，账号存于服务端内存。'}
          </p>

          <form style={{ marginTop: 'var(--gh-space-5)' }} onSubmit={submit} noValidate>
            <div className="field">
              <label className="field__label" htmlFor="adminUsername">
                账号
              </label>
              <input
                id="adminUsername"
                className="input"
                value={username}
                autoComplete="username"
                placeholder="请输入后台账号"
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>

            <div className="field" style={{ marginTop: 'var(--gh-space-4)' }}>
              <label className="field__label" htmlFor="adminPassword">
                密码
              </label>
              <input
                id="adminPassword"
                className="input"
                type="password"
                value={password}
                autoComplete="current-password"
                placeholder="请输入密码"
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {(error || sessionError) && (
              <div className="alert alert--danger" style={{ marginTop: 'var(--gh-space-4)' }} role="alert">
                {error ?? sessionError?.message}
              </div>
            )}

            <button
              className={`btn btn--primary btn--lg${submitting ? ' btn--loading' : ''}`}
              type="submit"
              style={{ width: '100%', marginTop: 'var(--gh-space-5)' }}
              disabled={submitting || loading}
            >
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  登录中…
                </>
              ) : (
                '登录'
              )}
            </button>
          </form>

          <div className="admin-login__hint">
            演示账号：<code>admin / admin123</code>（超级管理员）、<code>operator / oper123</code>（内容运营）
          </div>

          {AUTO_LOGIN_ENABLED && (
            <div className="admin-login__hint">
              {autoLogin ? (
                <>
                  想手动登录（验证错误密码 / 退出登录）？<Link to="/admin/login?manual=1">切换到手动登录</Link>
                </>
              ) : (
                <>
                  当前为手动登录。<Link to="/admin/login">返回自动登录</Link>
                </>
              )}
            </div>
          )}
        </div>
      </AuthShell>
    </div>
  )
}
