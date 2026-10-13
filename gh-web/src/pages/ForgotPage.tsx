import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgot, resetPassword } from '../api/auth'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

type Step = 'email' | 'reset' | 'done'

/**
 * 找回密码页（一级页面）：两步流程。
 * 1) 输入注册邮箱 → POST /api/auth/forgot（**无邮件服务**：开发环境直接返回重置令牌 devToken）；
 * 2) 输入令牌 + 新密码 → POST /api/auth/reset。
 * 生产环境不返回令牌，仅回执「已发送」，需接入邮件服务后由邮件链接携带令牌。
 */
export function ForgotPage() {
  const rootRef = useRef<HTMLDivElement>(null)

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const readyKey = step
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  /** 第一步：申请重置令牌 */
  const requestToken = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('请输入注册邮箱')
      return
    }
    setSubmitting(true)
    try {
      const result = await forgot({ email: email.trim() })
      setSentTo(result.sentTo ?? email.trim())
      if (result.devToken) {
        // 开发环境：直出令牌，进入重置步骤
        setToken(result.devToken)
        setStep('reset')
      } else {
        // 生产环境：无邮件服务，仅提示已发送
        setStep('done')
      }
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : '发送失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  /** 第二步：用令牌重置密码 */
  const submitReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!token.trim()) {
      setError('请输入重置令牌')
      return
    }
    if (password.length < 6) {
      setError('新密码至少 6 位')
      return
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('新密码需同时包含字母与数字')
      return
    }
    if (password !== confirm) {
      setError('两次输入的新密码不一致')
      return
    }
    setSubmitting(true)
    try {
      await resetPassword({ token: token.trim(), password })
      setStep('done')
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : '重置失败，请稍后重试')
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
          <span>找回密码</span>
        </nav>

        <div style={{ maxWidth: 440, margin: 'var(--gh-space-7) auto 0' }}>
          <div className="card reveal">
            <h1 className="card__title">找回密码</h1>

            {step === 'email' && (
              <>
                <p className="card__desc">输入注册邮箱，我们将发送重置密码的指引。</p>
                <form style={{ marginTop: 'var(--gh-space-5)' }} onSubmit={requestToken} noValidate>
                  <div className="field">
                    <label className="field__label" htmlFor="forgotEmail">
                      注册邮箱
                    </label>
                    <input
                      id="forgotEmail"
                      className={`input${error ? ' input--error' : ''}`}
                      type="email"
                      value={email}
                      autoComplete="email"
                      placeholder="请输入注册时使用的邮箱"
                      onChange={(event) => setEmail(event.target.value)}
                    />
                    <span className="field__hint">当前未接入邮件服务：开发环境将直接展示重置令牌。</span>
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
                        发送中…
                      </>
                    ) : (
                      '获取重置令牌'
                    )}
                  </button>
                </form>
              </>
            )}

            {step === 'reset' && (
              <>
                <p className="card__desc">已为 {sentTo} 生成重置令牌（开发环境直出，有效期 30 分钟）。</p>
                <div className="alert alert--info" style={{ marginTop: 'var(--gh-space-4)' }} role="status">
                  重置令牌：<span className="mono">{token}</span>
                </div>
                <form style={{ marginTop: 'var(--gh-space-5)' }} onSubmit={submitReset} noValidate>
                  <div className="field">
                    <label className="field__label" htmlFor="resetToken">
                      重置令牌
                    </label>
                    <input
                      id="resetToken"
                      className="input mono"
                      value={token}
                      onChange={(event) => setToken(event.target.value)}
                    />
                  </div>
                  <div className="form-grid-2" style={{ marginTop: 'var(--gh-space-4)' }}>
                    <div className="field">
                      <label className="field__label" htmlFor="resetPassword">
                        新密码
                      </label>
                      <input
                        id="resetPassword"
                        className="input"
                        type="password"
                        value={password}
                        autoComplete="new-password"
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label className="field__label" htmlFor="resetConfirm">
                        确认新密码
                      </label>
                      <input
                        id="resetConfirm"
                        className="input"
                        type="password"
                        value={confirm}
                        autoComplete="new-password"
                        onChange={(event) => setConfirm(event.target.value)}
                      />
                    </div>
                  </div>
                  <span className="field__hint">至少 6 位，需包含字母与数字。</span>

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
                        重置中…
                      </>
                    ) : (
                      '重置密码'
                    )}
                  </button>
                </form>
              </>
            )}

            {step === 'done' && (
              <div className="alert alert--success" style={{ marginTop: 'var(--gh-space-5)' }} role="status">
                {sentTo ? `已向 ${sentTo} 发送重置指引；` : ''}密码已重置，请使用新密码登录。
              </div>
            )}

            <p className="field__hint" style={{ marginTop: 'var(--gh-space-5)', textAlign: 'center' }}>
              <Link to="/login">返回登录</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
