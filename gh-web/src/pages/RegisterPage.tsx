import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { invalidateSession } from '../hooks/useSession'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

type FieldErrors = {
  username?: string
  email?: string
  password?: string
  confirm?: string
  agreed?: string
}

/**
 * 注册页（一级页面）：用户名 / 邮箱 / 密码 / 确认密码，
 * 前端校验必填、邮箱格式、密码强度与两次密码一致；提交真实 POST /api/auth/register，成功后自动登录并跳个人中心。
 */
export function RegisterPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const readyKey = done ? 'done' : 'form'
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  useEffect(() => {
    if (!done) return
    const timer = window.setTimeout(() => navigate('/me', { replace: true }), 600)
    return () => window.clearTimeout(timer)
  }, [done, navigate])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const next: FieldErrors = {}
    const name = username.trim()
    if (!name) next.username = '请输入用户名'
    else if (name.length < 3) next.username = '用户名至少 3 个字符'
    if (!email.trim()) next.email = '请输入邮箱'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = '请输入有效的邮箱地址'
    if (!password) next.password = '请设置密码'
    else if (password.length < 6) next.password = '密码至少 6 位'
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) next.password = '密码需同时包含字母与数字'
    if (confirm !== password) next.confirm = '两次输入的密码不一致'
    if (!agreed) next.agreed = '请先阅读并同意服务条款与隐私政策'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      await register({ username: name, email: email.trim(), password })
      invalidateSession()
      setDone(true)
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : '注册失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div ref={rootRef}>
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <span>注册</span>
        </nav>

        <div style={{ maxWidth: 460, margin: 'var(--gh-space-7) auto 0' }}>
          <div className="card reveal">
            <h1 className="card__title">注册光魂账号</h1>
            <p className="card__desc">注册后可登记设备、跟踪工单并管理订阅通知。</p>

            {done ? (
              <div className="alert alert--success" style={{ marginTop: 'var(--gh-space-5)' }} role="status">
                注册成功，正在进入个人中心…
              </div>
            ) : (
              <form style={{ marginTop: 'var(--gh-space-5)' }} onSubmit={submit} noValidate>
                <div className="field">
                  <label className="field__label" htmlFor="regAccount">
                    用户名<span className="req">*</span>
                  </label>
                  <input
                    id="regAccount"
                    className={`input${errors.username ? ' input--error' : ''}`}
                    value={username}
                    autoComplete="username"
                    onChange={(event) => setUsername(event.target.value)}
                  />
                  {errors.username ? (
                    <span className="field__error">{errors.username}</span>
                  ) : (
                    <span className="field__hint">3–24 个字符，注册后用于登录。</span>
                  )}
                </div>

                <div className="field" style={{ marginTop: 'var(--gh-space-4)' }}>
                  <label className="field__label" htmlFor="regEmail">
                    邮箱<span className="req">*</span>
                  </label>
                  <input
                    id="regEmail"
                    className={`input${errors.email ? ' input--error' : ''}`}
                    type="email"
                    value={email}
                    autoComplete="email"
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  {errors.email && <span className="field__error">{errors.email}</span>}
                </div>

                <div className="form-grid-2" style={{ marginTop: 'var(--gh-space-4)' }}>
                  <div className="field">
                    <label className="field__label" htmlFor="regPassword">
                      密码<span className="req">*</span>
                    </label>
                    <input
                      id="regPassword"
                      className={`input${errors.password ? ' input--error' : ''}`}
                      type="password"
                      value={password}
                      autoComplete="new-password"
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    {errors.password ? (
                      <span className="field__error">{errors.password}</span>
                    ) : (
                      <span className="field__hint">至少 6 位，需包含字母与数字。</span>
                    )}
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="regConfirm">
                      确认密码<span className="req">*</span>
                    </label>
                    <input
                      id="regConfirm"
                      className={`input${errors.confirm ? ' input--error' : ''}`}
                      type="password"
                      value={confirm}
                      autoComplete="new-password"
                      onChange={(event) => setConfirm(event.target.value)}
                    />
                    {errors.confirm && <span className="field__error">{errors.confirm}</span>}
                  </div>
                </div>

                <label className="check" style={{ marginTop: 'var(--gh-space-5)' }}>
                  <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
                  我已阅读并同意《服务条款》与《隐私政策》
                </label>
                {errors.agreed && (
                  <span className="field__error" style={{ display: 'block', marginTop: 'var(--gh-space-1)' }}>
                    {errors.agreed}
                  </span>
                )}

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
                      提交中…
                    </>
                  ) : (
                    '注册'
                  )}
                </button>
              </form>
            )}

            <p className="field__hint" style={{ marginTop: 'var(--gh-space-5)', textAlign: 'center' }}>
              已有账号？<Link to="/login">返回登录</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
