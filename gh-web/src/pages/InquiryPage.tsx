import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { submitInquiry, type InquiryBody, type InquiryResult } from '../api/support-extra'
import { HoneypotField, CaptchaField } from '../components/ui/CaptchaField'
import { INQUIRY_TOPICS } from '../data/support-extra'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'
import { useSiteAuth } from '../hooks/useSiteConfig'

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

const EMPTY_FORM: InquiryBody = { name: '', contact: '', model: '', topic: INQUIRY_TOPICS[0], message: '' }

/** 提交咨询（深度线 · 表单）：真实 POST 提交；提交中 / 成功 / 失败均保留已填内容 */
export function InquiryPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState<InquiryBody>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [result, setResult] = useState<InquiryResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  // 反垃圾：图形验证码 + 蜜罐字段（真人不可见的隐藏输入）
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaNonce, setCaptchaNonce] = useState(0)
  const auth = useSiteAuth()

  // 状态变化（如成功态出现）后重跑页面级动效
  const readyKey = status
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  const update = (key: keyof InquiryBody, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // 蜜罐字段为不受控隐藏输入（真人不可见）：提交时从表单读取，机器人自动填表会带出非空值
    const honeypot = String(new FormData(event.currentTarget).get('website') ?? '')
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = '请填写称呼'
    if (!form.contact.trim()) next.contact = '请填写联系方式'
    if (!form.model.trim()) next.model = '请填写产品型号'
    if (!form.message.trim()) next.message = '请描述你遇到的问题'
    if (auth.captcha && !captchaCode.trim()) next.captcha = '请输入图形验证码'
    setErrors(next)
    if (Object.keys(next).length > 0) {
      setStatus('idle')
      return
    }
    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await submitInquiry({ ...form, captchaToken, captchaCode, website: honeypot })
      setResult(res)
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '提交失败，请稍后重试')
      setStatus('error')
      // 服务端每次校验都消费令牌，失败后强制刷新验证码
      setCaptchaCode('')
      setCaptchaNonce((n) => n + 1)
    }
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setResult(null)
    setErrorMsg('')
    setCaptchaCode('')
    setCaptchaNonce((n) => n + 1)
    setStatus('idle')
  }

  const submitting = status === 'submitting'

  return (
    <div ref={rootRef}>
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/support">服务支持</Link>
          <span>/</span>
          <span>提交咨询</span>
        </nav>

        <div className="section__head" style={{ marginTop: 'var(--gh-space-4)', marginBottom: 'var(--gh-space-5)' }}>
          <div>
            <h1 className="section__title">提交咨询</h1>
            <p className="section__desc">填写型号与现象，提交后可在客户中心跟踪处理进度。</p>
          </div>
          <Link className="btn btn--secondary" to="/contact">
            查看联系方式
          </Link>
        </div>

        <form className="card reveal" style={{ maxWidth: 760 }} onSubmit={handleSubmit} noValidate>
          <div className="form-grid-2">
            <div className="field">
              <label className="field__label" htmlFor="inq-name">
                称呼 <span className="req">*</span>
              </label>
              <input
                className={`input${errors.name ? ' input--error' : ''}`}
                id="inq-name"
                name="name"
                placeholder="怎么称呼你"
                value={form.name}
                aria-invalid={Boolean(errors.name)}
                onChange={(event) => update('name', event.target.value)}
              />
              {errors.name && <span className="field__error">{errors.name}</span>}
            </div>
            <div className="field">
              <label className="field__label" htmlFor="inq-contact">
                联系方式 <span className="req">*</span>
              </label>
              <input
                className={`input${errors.contact ? ' input--error' : ''}`}
                id="inq-contact"
                name="contact"
                placeholder="手机号或邮箱"
                value={form.contact}
                aria-invalid={Boolean(errors.contact)}
                onChange={(event) => update('contact', event.target.value)}
              />
              {errors.contact && <span className="field__error">{errors.contact}</span>}
            </div>
            <div className="field">
              <label className="field__label" htmlFor="inq-model">
                产品型号 <span className="req">*</span>
              </label>
              <input
                className={`input${errors.model ? ' input--error' : ''}`}
                id="inq-model"
                name="model"
                placeholder="例如 54027X1QE-W54"
                value={form.model}
                aria-invalid={Boolean(errors.model)}
                onChange={(event) => update('model', event.target.value)}
              />
              {errors.model && <span className="field__error">{errors.model}</span>}
            </div>
            <div className="field">
              <label className="field__label" htmlFor="inq-topic">
                咨询主题
              </label>
              <select
                className="select"
                id="inq-topic"
                name="topic"
                value={form.topic}
                onChange={(event) => update('topic', event.target.value)}
              >
                {INQUIRY_TOPICS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field" style={{ marginTop: 'var(--gh-space-4)' }}>
            <label className="field__label" htmlFor="inq-message">
              问题描述 <span className="req">*</span>
            </label>
            <textarea
              className={`textarea${errors.message ? ' input--error' : ''}`}
              id="inq-message"
              name="message"
              placeholder="请描述遇到的现象、发生条件与已尝试的操作"
              value={form.message}
              aria-invalid={Boolean(errors.message)}
              onChange={(event) => update('message', event.target.value)}
            />
            {errors.message ? (
              <span className="field__error">{errors.message}</span>
            ) : (
              <span className="field__hint">请勿填写与本次咨询无关的个人信息。</span>
            )}
          </div>

          {/* 反垃圾：蜜罐（隐藏）+ 图形验证码（后台可关闭，关闭后不渲染） */}
          <HoneypotField />
          <CaptchaField
            key={captchaNonce}
            inputId="inqCaptcha"
            code={captchaCode}
            onCodeChange={setCaptchaCode}
            onTokenChange={setCaptchaToken}
            error={errors.captcha}
            disabled={submitting}
          />

          <div className="row" style={{ marginTop: 'var(--gh-space-5)' }}>
            <button className={`btn btn--primary${submitting ? ' btn--loading' : ''}`} type="submit" disabled={submitting}>
              {submitting ? '提交中…' : '提交咨询'}
            </button>
            <button className="btn btn--ghost" type="button" onClick={resetForm} disabled={submitting}>
              重置
            </button>
          </div>

          {status === 'success' && result && (
            <div className="alert alert--success" role="status" style={{ marginTop: 'var(--gh-space-4)' }}>
              <p style={{ margin: 0 }}>
                咨询已提交，工单号 <strong className="mono">{result.ticketId}</strong>。
              </p>
              <p style={{ margin: 'var(--gh-space-2) 0 0' }}>
                接收时间：<span className="mono">{result.receivedAt}</span>。
              </p>
              <div className="row" style={{ marginTop: 'var(--gh-space-3)' }}>
                <Link className="btn btn--primary btn--sm" to="/me/inquiries">
                  去客户中心查看
                </Link>
                <button className="btn btn--ghost btn--sm" type="button" onClick={resetForm}>
                  再提交一单
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="alert alert--danger" role="alert" style={{ marginTop: 'var(--gh-space-4)' }}>
              <p style={{ margin: 0 }}>提交失败：{errorMsg}。已填内容仍保留，可稍后重试。</p>
            </div>
          )}
        </form>

        <div className="row" style={{ marginTop: 'var(--gh-space-5)' }}>
          <span className="field__hint">
            提交即表示同意我们按
            <Link to="/legal/privacy" style={{ color: 'var(--color-accent-text)' }}>
              隐私政策
            </Link>
            处理你的联系方式，仅用于回复本次咨询。
          </span>
        </div>
      </div>
    </div>
  )
}