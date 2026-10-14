/**
 * 20. subscribe 邮件订阅（契约 §4 扩展）—— 首页「订阅新品与固件」。
 * props: title / desc / source:'home'|'footer' / points:string[]
 *
 * 行为：单邮箱输入 + 图形验证码 + 蜜罐字段 → POST /api/subscribe（写入 subscribers 集合）；
 * 成功后记一次 `subscribe` 埋点。复用既有 `.contact-split` 两栏版式，避免第二套视觉语言。
 */
import { useState, type FormEvent } from 'react'
import { submitSubscribe } from '../api/subscribe'
import { CaptchaField, HoneypotField } from '../components/ui/CaptchaField'
import { useSiteAuth } from '../hooks/useSiteConfig'
import { trackEvent } from '../lib/track'
import { asString, asStringArray } from './blockUtils'

type Status = 'idle' | 'submitting' | 'success' | 'error'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SubscribeBlock({ props }: { props: Record<string, unknown> }) {
  const title = asString(props.title) || '订阅新品与固件更新'
  const desc = asString(props.desc) || '留下邮箱，第一时间收到新品发布、固件更新与活动通知。'
  const source = asString(props.source, 'home')
  const points = asStringArray(props.points)
  const auth = useSiteAuth()

  const [email, setEmail] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [nonce, setNonce] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // 蜜罐字段为不受控隐藏输入：提交时从表单读取
    const honeypot = String(new FormData(event.currentTarget).get('website') ?? '')
    if (!EMAIL_RE.test(email.trim())) {
      setError('请填写有效的邮箱地址')
      setStatus('idle')
      return
    }
    if (auth.captcha && !captchaCode.trim()) {
      setError('请输入图形验证码')
      setStatus('idle')
      return
    }
    setError('')
    setStatus('submitting')
    try {
      await submitSubscribe({ email: email.trim(), source, captchaToken, captchaCode, website: honeypot })
      trackEvent('subscribe', source)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请稍后重试')
      setStatus('error')
      // 令牌一次性消费：失败后强制刷新验证码
      setCaptchaCode('')
      setNonce((n) => n + 1)
    }
  }

  const submitting = status === 'submitting'

  return (
    <div className="contact-block contact-block--soft">
      <div className="contact-split">
        <div className="contact-split__aside">
          <span className="contact-split__mark" aria-hidden="true" />
          <h2 className="contact-split__title">{title}</h2>
          {desc && <p className="contact-split__desc">{desc}</p>}
          {points.length > 0 && (
            <ul className="contact-points">
              {points.map((point, index) => (
                <li key={`${point.slice(0, 10)}-${index}`}>
                  <span className="contact-points__dot" aria-hidden="true">
                    <svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.6 7.4 5.7 10.5 11.4 3.9" />
                    </svg>
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="contact-split__main">
          <form className="card contact-form reveal" onSubmit={onSubmit} noValidate>
            <div className="field">
              <label className="field__label" htmlFor="sub-email">
                邮箱 <span className="req">*</span>
              </label>
              <input
                className={`input${error && !EMAIL_RE.test(email.trim()) ? ' input--error' : ''}`}
                id="sub-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                disabled={submitting}
                aria-invalid={Boolean(error) && !EMAIL_RE.test(email.trim())}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError('')
                }}
              />
              <span className="field__hint">仅用于订阅通知，可随时取消；我们不会向第三方提供你的邮箱。</span>
            </div>

            <HoneypotField />
            <CaptchaField
              key={nonce}
              inputId="subCaptcha"
              code={captchaCode}
              onCodeChange={setCaptchaCode}
              onTokenChange={setCaptchaToken}
              error={error && auth.captcha && !captchaCode.trim() ? error : undefined}
              disabled={submitting}
            />

            <div className="row" style={{ marginTop: 'var(--gh-space-5)' }}>
              <button className={`btn btn--primary${submitting ? ' btn--loading' : ''}`} type="submit" disabled={submitting}>
                {submitting ? '提交中…' : '订阅'}
              </button>
            </div>

            {status === 'success' && (
              <div className="alert alert--success" role="status" style={{ marginTop: 'var(--gh-space-4)' }}>
                订阅成功，感谢关注。新品与固件更新会发送到 <strong className="mono">{email.trim()}</strong>。
              </div>
            )}
            {status === 'error' && error && (
              <div className="alert alert--danger" role="alert" style={{ marginTop: 'var(--gh-space-4)' }}>
                提交失败：{error}。已填内容仍保留，可稍后重试。
              </div>
            )}
            {status === 'idle' && error && (
              <span className="field__error" style={{ marginTop: 'var(--gh-space-3)', display: 'inline-block' }}>
                {error}
              </span>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
