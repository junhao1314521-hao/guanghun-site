import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { AuthShell } from '../components/site/AuthShell'
import { CaptchaField } from '../components/ui/CaptchaField'
import { useSiteAuth } from '../hooks/useSiteConfig'
import { invalidateSession } from '../hooks/useSession'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/** 字段级错误（提交时就近提示，不再用整块 alert 兜底） */
type FieldErrors = { account?: string; password?: string; captcha?: string }

/**
 * 登录页（一级页面）：左侧品牌视觉 + 右侧单列表单。
 *
 * 信息层级：页面只有一个 h1（表单标题）；注册为标题下的行内链接；
 * 找回密码只保留一处；协议提示放在主按钮下方。视觉文案全部来自
 * 站点配置 `site.auth.login`，留空回退内置文案。
 *
 * 验证码策略由后台配置（off / always / after3）：after3 时默认不渲染，
 * 连续失败 3 次或服务端返回 captchaRequired 后才出现，避免打断首次登录。
 */
export function LoginPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [failed, setFailed] = useState(0)
  const [captchaForced, setCaptchaForced] = useState(false)
  const [altHint, setAltHint] = useState('')
  // 反垃圾：图形验证码（code 为用户输入，token 为取图令牌）与非重试计数（失败后强制换图）
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaNonce, setCaptchaNonce] = useState(0)
  const auth = useSiteAuth()

  // 验证码档位：after3 默认隐藏，失败 3 次或服务端要求时才出现
  const captchaMode = auth.captchaMode ?? (auth.captcha ? 'always' : 'off')
  const captchaVisible =
    captchaMode === 'always' || captchaForced || (captchaMode === 'after3' && failed >= 3)

  const config = auth.login ?? {}
  const title = config.title || '登录光魂账号'
  const subtitle = config.subtitle || '登录后可跟踪咨询进度、管理已登记设备与订阅通知。'
  const points = config.points && config.points.length > 0
    ? config.points
    : ['跟踪咨询与预约进度', '登记与管理我的设备', '收藏型号与下载资料']
  const agreement = config.agreement || '登录即表示同意《服务条款》与《隐私政策》'
  const registerEnabled = auth.registerEnabled !== false
  const thirdPartyVisible = Boolean(auth.wechat?.enabled || auth.phone?.enabled)

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

    // 字段级校验：一次性标出所有问题，并聚焦第一个错误项
    const nextErrors: FieldErrors = {}
    if (!username.trim()) nextErrors.account = '请输入用户名或注册邮箱'
    if (!password) nextErrors.password = '请输入密码'
    if (captchaVisible && !captchaCode.trim()) nextErrors.captcha = '请输入图形验证码'
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const firstId = nextErrors.account ? 'loginAccount' : nextErrors.password ? 'loginPassword' : 'loginCaptcha'
      document.getElementById(firstId)?.focus()
      return
    }

    setSubmitting(true)
    try {
      await login({ username: username.trim(), password, remember, captchaToken, captchaCode })
      invalidateSession()
      setDone(true)
    } catch (ex) {
      const message = ex instanceof Error ? ex.message : '登录失败，请稍后重试'
      setError(message)
      setFailed((count) => count + 1)
      if ((ex as { data?: { captchaRequired?: boolean } }).data?.captchaRequired) setCaptchaForced(true)
      // 服务端每次校验都会消费令牌，失败后强制刷新验证码
      setCaptchaCode('')
      setCaptchaNonce((n) => n + 1)
    } finally {
      setSubmitting(false)
    }
  }

  const notOpen = () => setAltHint('该登录方式尚未开通，请使用账号密码登录')

  return (
    <div ref={rootRef}>
      <div className="auth-page">
        <AuthShell
          variant="page"
          badge="个人中心"
          eyebrow="ACCOUNT / SIGN IN"
          headline={config.headline || '把每一块屏的参数，测给你看'}
          subtitle={config.description || '不写形容词，只给可复现的测试记录与版本号。'}
          points={points}
          poster={config.poster || ''}
        >
          <div className="card reveal">
            {/* 登录 / 注册同页切换（路由级 tab，保留各自表单状态） */}
            <div className="auth-tabs" role="tablist" aria-label="账号">
              <span className="auth-tabs__item is-active" role="tab" aria-selected="true">
                登录
              </span>
              {registerEnabled && (
                <Link className="auth-tabs__item" role="tab" aria-selected="false" to={`/register${from !== '/me' ? `?from=${encodeURIComponent(from)}` : ''}`}>
                  注册
                </Link>
              )}
            </div>

            <h1 className="card__title" style={{ marginTop: 'var(--gh-space-4)' }}>
              {title}
            </h1>
            <p className="auth-form__subtitle">
              {subtitle}
              {registerEnabled && (
                <>
                  {' '}
                  <Link className="auth-form__inline-link" to={`/register${from !== '/me' ? `?from=${encodeURIComponent(from)}` : ''}`}>
                    没有账号？立即注册
                  </Link>
                </>
              )}
            </p>

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
                    className={`input${fieldErrors.account ? ' input--error' : ''}`}
                    value={username}
                    autoComplete="username"
                    placeholder="用户名 / 邮箱"
                    aria-invalid={Boolean(fieldErrors.account)}
                    aria-describedby={fieldErrors.account ? 'loginAccountError' : undefined}
                    onChange={(event) => {
                      setUsername(event.target.value)
                      if (fieldErrors.account) setFieldErrors((prev) => ({ ...prev, account: undefined }))
                    }}
                  />
                  {fieldErrors.account ? (
                    <span className="field__error" id="loginAccountError">
                      {fieldErrors.account}
                    </span>
                  ) : (
                    <span className="field__hint">支持用户名或注册邮箱登录。</span>
                  )}
                </div>

                <div className="field" style={{ marginTop: 'var(--gh-space-4)' }}>
                  <div className="field__label-row">
                    <label className="field__label" htmlFor="loginPassword">
                      密码
                    </label>
                    <Link className="auth-form__inline-link" to="/forgot">
                      忘记密码？
                    </Link>
                  </div>
                  <div className="pw-field">
                    <input
                      id="loginPassword"
                      className={`input${fieldErrors.password ? ' input--error' : ''}`}
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      autoComplete="current-password"
                      placeholder="请输入密码"
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={fieldErrors.password ? 'loginPasswordError' : undefined}
                      onChange={(event) => {
                        setPassword(event.target.value)
                        if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }))
                      }}
                    />
                    {/* 密码可见切换 */}
                    <button
                      className="pw-field__toggle"
                      type="button"
                      aria-label={showPw ? '隐藏密码' : '显示密码'}
                      onClick={() => setShowPw((v) => !v)}
                    >
                      {showPw ? '隐藏' : '显示'}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <span className="field__error" id="loginPasswordError">
                      {fieldErrors.password}
                    </span>
                  )}
                </div>

                {/* 反垃圾：图形验证码（always 常驻；after3 失败 3 次后出现；off 不渲染） */}
                {captchaVisible && (
                  <CaptchaField
                    key={captchaNonce}
                    inputId="loginCaptcha"
                    code={captchaCode}
                    onCodeChange={setCaptchaCode}
                    onTokenChange={setCaptchaToken}
                    disabled={submitting}
                  />
                )}
                {captchaVisible && fieldErrors.captcha && (
                  <span className="field__error" style={{ marginTop: 'var(--gh-space-2)', display: 'block' }}>
                    {fieldErrors.captcha}
                  </span>
                )}

                <div className="row" style={{ marginTop: 'var(--gh-space-4)', justifyContent: 'space-between' }}>
                  <label className="switch">
                    <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                    <span className="switch__track" />
                    <span>记住我</span>
                  </label>
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

                {thirdPartyVisible && (
                  <div className="auth-alt">
                    <span className="auth-alt__divider">或</span>
                    <div className="auth-alt__actions">
                      {auth.wechat?.enabled && (
                        <button className="btn btn--ghost btn--sm" type="button" onClick={notOpen}>
                          微信扫码登录
                        </button>
                      )}
                      {auth.phone?.enabled && (
                        <button className="btn btn--ghost btn--sm" type="button" onClick={notOpen}>
                          手机号登录
                        </button>
                      )}
                    </div>
                    {altHint && <p className="auth-alt__hint">{altHint}</p>}
                  </div>
                )}

                <p className="auth-form__agreement">{agreement}</p>
              </form>
            )}
          </div>
        </AuthShell>
      </div>
    </div>
  )
}
