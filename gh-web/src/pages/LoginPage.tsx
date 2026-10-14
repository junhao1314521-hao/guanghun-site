import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { AuthShell } from '../components/site/AuthShell'
import { invalidateSession } from '../hooks/useSession'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/**
 * 登录页（一级页面）：居中卡片表单，提交调用真实 POST /api/auth/login。
 * 提交中 / 成功 / 失败三态；成功后回 `from`（受保护页跳转来源）或个人中心。
 */
export function LoginPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 登录成功后跳转目标：来自受保护页的 `?from=`（缺省回个人中心）
  const from = new URLSearchParams(location.search).get('from') || '/me'
  const readyKey = `${done ? 'done' : 'form'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  // 成功后短暂展示成功态，再跳转来源页 / 个人中心
  useEffect(() => {
    if (!done) return
    const timer = window.setTimeout(() => navigate(from, { replace: true }), 600)
    return () => window.clearTimeout(timer)
  }, [done, from, navigate])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!username.trim() || !password) {
      setError('请输入账号与密码')
      return
    }
    setSubmitting(true)
    try {
      await login({ username: username.trim(), password, remember })
      invalidateSession()
      setDone(true)
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : '登录失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div ref={rootRef}>
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-6)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <span>登录</span>
        </nav>

        <div style={{ marginTop: 'var(--gh-space-5)' }}>
        <AuthShell
          variant="card"
          badge="客户中心"
          eyebrow="ACCOUNT / SIGN IN"
          headline="登录光魂账号"
          subtitle="登录后可跟踪咨询进度、管理已登记设备与订阅通知。"
          points={['跟踪咨询与预约进度', '登记与管理我的设备', '收藏型号与下载资料']}
        >
          <div className="card reveal">
            <h1 className="card__title">登录</h1>

            {done ? (
              <div className="alert alert--success" style={{ marginTop: 'var(--gh-space-5)' }} role="status">
                登录成功，正在进入个人中心…
              </div>
            ) : (
              <form style={{ marginTop: 'var(--gh-space-5)' }} onSubmit={submit} noValidate>
                <div className="field">
                  <label className="field__label" htmlFor="loginAccount">
                    账号
                  </label>
                  <input
                    id="loginAccount"
                    className="input"
                    value={username}
                    autoComplete="username"
                    placeholder="用户名 / 邮箱"
                    onChange={(event) => setUsername(event.target.value)}
                  />
                  <span className="field__hint">支持用户名或注册邮箱登录。</span>
                </div>

                <div className="field" style={{ marginTop: 'var(--gh-space-4)' }}>
                  <label className="field__label" htmlFor="loginPassword">
                    密码
                  </label>
                  <input
                    id="loginPassword"
                    className="input"
                    type="password"
                    value={password}
                    autoComplete="current-password"
                    placeholder="请输入密码"
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <div className="row" style={{ marginTop: 'var(--gh-space-4)', justifyContent: 'space-between' }}>
                  <label className="switch">
                    <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                    <span className="switch__track" />
                    <span>记住我</span>
                  </label>
                  <Link className="btn btn--ghost btn--sm" to="/forgot">
                    忘记密码？
                  </Link>
                </div>

                {error && (
                  <div className="alert alert--danger" style={{ marginTop: 'var(--gh-space-4)' }} role="alert">
                    {error}
                  </div>
                )}

                <button
                  className={`btn btn--primary is-magnetic${submitting ? ' btn--loading' : ''}`}
                  type="submit"
                  style={{ width: '100%', marginTop: 'var(--gh-space-5)' }}
                  disabled={submitting}
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
            )}

            <div className="row" style={{ marginTop: 'var(--gh-space-5)', justifyContent: 'center', gap: 'var(--gh-space-4)' }}>
              <Link className="btn btn--ghost btn--sm" to="/register">
                注册新账号
              </Link>
              <Link className="btn btn--ghost btn--sm" to="/forgot">
                找回密码
              </Link>
            </div>
          </div>
        </AuthShell>
        </div>
      </div>
    </div>
  )
}
