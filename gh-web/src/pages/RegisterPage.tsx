import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { AuthShell } from '../components/site/AuthShell'
import { CaptchaField } from '../components/ui/CaptchaField'
import { useSiteAuth } from '../hooks/useSiteConfig'
import { invalidateSession } from '../hooks/useSession'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

type FieldErrors = {
  username?: string
  email?: string
  password?: string
  confirm?: string
  agreed?: string
  captcha?: string
}

/**
 * 密码强度评估（0–3）：长度 ≥8 记 1 分，含字母与数字各记 1 分，含符号再加 1 分；
 * 用于注册页即时强度提示（弱 / 中 / 强），与后端「6–64 位且含字母与数字」的硬校验互补。
 */
function passwordStrength(password: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (!password) return { level: 0, label: '' }
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  // 长度不足 6 或缺少字母/数字时至少标记为弱
  const level = Math.min(3, Math.max(1, score)) as 0 | 1 | 2 | 3
  return { level, label: ['', '弱', '中', '强'][level] }
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
  // 反垃圾：图形验证码（同登录页）
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaNonce, setCaptchaNonce] = useState(0)
  const auth = useSiteAuth()
  const strength = passwordStrength(password)
  // 验证码档位与登录页一致：after3 默认不打扰，失败 3 次后出现
  const captchaMode = auth.captchaMode ?? (auth.captcha ? 'always' : 'off')
  const [failed, setFailed] = useState(0)
  const [captchaForced, setCaptchaForced] = useState(false)
  const captchaVisible =
    captchaMode === 'always' || captchaForced || (captchaMode === 'after3' && failed >= 3)
  const config = auth.login ?? {}
  const registerEnabled = auth.registerEnabled !== false

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
    if (auth.captcha && captchaVisible && !captchaCode.trim()) next.captcha = '请输入图形验证码'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      await register({ username: name, email: email.trim(), password, captchaToken, captchaCode })
      invalidateSession()
      setDone(true)
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : '注册失败，请稍后重试')
      setFailed((count) => count + 1)
      if ((ex as { data?: { captchaRequired?: boolean } }).data?.captchaRequired) setCaptchaForced(true)
      // 服务端每次校验都消费令牌，失败后强制刷新验证码
      setCaptchaCode('')
      setCaptchaNonce((n) => n + 1)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div ref={rootRef}>
      <div className="auth-page">
        <AuthShell
          variant="page"
          badge="个人中心"
          eyebrow="ACCOUNT / REGISTER"
          headline={config.headline || '把每一块屏的参数，测给你看'}
          subtitle={config.description || '不写形容词，只给可复现的测试记录与版本号。'}
          points={config.points && config.points.length > 0 ? config.points : ['登记与管理我的设备', '跟踪工单与预约进度', '接收固件与资料更新']}
          poster={config.poster || ''}
        >
          <div className="card reveal">
            {/* 登录 / 注册同页切换（路由级 tab） */}
            <div className="auth-tabs" role="tablist" aria-label="账号">
              <Link className="auth-tabs__item" role="tab" aria-selected="false" to="/login">
                登录
              </Link>
              <span className="auth-tabs__item is-active" role="tab" aria-selected="true">
                注册
              </span>
            </div>

            <h1 className="card__title" style={{ marginTop: 'var(--gh-space-4)' }}>
              注册光魂账号
            </h1>
            <p className="auth-form__subtitle">
              注册后可登记设备、跟踪工单并管理订阅通知。
              {registerEnabled && (
                <>
                  {' '}
                  <Link className="auth-form__inline-link" to="/login">
                    已有账号？直接登录
                  </Link>
                </>
              )}
            </p>

            {!registerEnabled && (
              <div className="alert alert--warning" style={{ marginTop: 'var(--gh-space-4)' }} role="status">
                注册暂未开放，请直接登录或联系客服开通。
              </div>
            )}

            {done ? (
              <div className="alert alert--success" style={{ marginTop: 'var(--gh-space-5)' }} role="status">
                注册成功，正在进入个人中心…
              </div>
            ) : !registerEnabled ? null : (
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
                    {/* 密码强度即时提示：三段色条 + 文案（弱 / 中 / 强） */}
                    {password && (
                      <div className="pw-strength" aria-live="polite">
                        <span className={`pw-strength__bar pw-strength__bar--${strength.level}`} />
                        <span className={`pw-strength__label pw-strength__label--${strength.level}`}>
                          强度：{strength.label}
                        </span>
                      </div>
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

                {/* 反垃圾：图形验证码（always 常驻；after3 失败 3 次后出现；off 不渲染） */}
                {captchaVisible && (
                  <CaptchaField
                    key={captchaNonce}
                    inputId="regCaptcha"
                    code={captchaCode}
                    onCodeChange={setCaptchaCode}
                    onTokenChange={setCaptchaToken}
                    error={errors.captcha}
                    disabled={submitting}
                  />
                )}

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

          </div>
        </AuthShell>
      </div>
    </div>
  )
}
