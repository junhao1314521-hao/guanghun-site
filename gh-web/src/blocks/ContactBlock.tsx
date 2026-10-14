/**
 * 15. contact 联系留言（契约 §4）
 * props: title / desc / channel:'inquiry'|'business' / showForm:boolean
 *
 * showForm=false：渲染既有「引导卡片」（标题 + 描述 + 行动按钮）；
 * showForm=true：渲染咨询提交表单（原提交咨询页表单，真实 POST）。
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { submitInquiry, type InquiryBody, type InquiryResult } from '../api/support-extra'
import { INQUIRY_TOPICS } from '../data/support-extra'
import { asBool, asString, asStringArray } from './blockUtils'

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

const EMPTY_FORM: InquiryBody = { name: '', contact: '', model: '', topic: INQUIRY_TOPICS[0], message: '' }

/** 咨询提交表单（提交中 / 成功 / 失败均保留已填内容）：左栏文案 + 右栏表单的两栏布局 */
function ContactForm({ title, desc, points }: { title: string; desc: string; points: string[] }) {
  const [form, setForm] = useState<InquiryBody>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [result, setResult] = useState<InquiryResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const update = (key: keyof InquiryBody, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = '请填写称呼'
    if (!form.contact.trim()) next.contact = '请填写联系方式'
    if (!form.model.trim()) next.model = '请填写产品型号'
    if (!form.message.trim()) next.message = '请描述你遇到的问题'
    setErrors(next)
    if (Object.keys(next).length > 0) {
      setStatus('idle')
      return
    }
    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await submitInquiry({ ...form })
      setResult(res)
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '提交失败，请稍后重试')
      setStatus('error')
    }
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setResult(null)
    setErrorMsg('')
    setStatus('idle')
  }

  const submitting = status === 'submitting'

  return (
    <div className="contact-split">
      <div className="contact-split__aside">
        {title && <h2 className="contact-split__title">{title}</h2>}
        {desc && <p className="contact-split__desc">{desc}</p>}
        {points.length > 0 && (
          <ul className="contact-points">
            {points.map((point, index) => (
              <li key={`${point.slice(0, 10)}-${index}`}>
                <span className="contact-points__dot" aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form className="card contact-form reveal" onSubmit={handleSubmit} noValidate>
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
              placeholder="例如 GH-M900 PRO"
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
  )
}

/** 渠道相关默认要点（未配置 points 时使用），与标题/描述互补、不重复 */
const DEFAULT_POINTS: Record<string, string[]> = {
  inquiry: ['填写型号与现象，定位更快', '可在工单中补充截图与日志', '留下手机号或邮箱，方便我们联系'],
  business: ['渠道 / 送测 / 赛事合作皆可', '工作日 1–2 个工作日回复', '提交后进入统一工单系统'],
}

export function ContactBlock({ props }: { props: Record<string, unknown> }) {
  const title = asString(props.title)
  const desc = asString(props.desc)
  const channel = asString(props.channel, 'inquiry')
  const showForm = asBool(props.showForm)
  // 模块样式：soft=浅底浮卡（默认）；bold=品牌色深色收口（文字反白）
  const variant = asString(props.variant, 'soft') === 'bold' ? 'bold' : 'soft'
  // 左栏要点：可用 props.points 覆盖，缺省按渠道给出
  const configuredPoints = asStringArray(props.points)
  const points = configuredPoints.length > 0 ? configuredPoints : DEFAULT_POINTS[channel] ?? DEFAULT_POINTS.inquiry
  const blockClass = `contact-block contact-block--${variant}`

  if (showForm)
    return (
      <div className={blockClass}>
        <ContactForm title={title} desc={desc} points={points} />
      </div>
    )

  const primary =
    channel === 'business'
      ? { label: '提交合作申请', href: '/business' }
      : { label: '提交咨询', href: '/inquiry' }

  return (
    <div className={blockClass}>
      <div
        className="card reveal contact-cta"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--gh-space-5)', flexWrap: 'wrap' }}
      >
        <div>
          {title && (
            <h2 className="card__title" style={{ marginBottom: 'var(--gh-space-1)' }}>
              {title}
            </h2>
          )}
          {desc && <p className="card__desc">{desc}</p>}
        </div>
        <div className="row">
          <Link className="btn btn--primary is-magnetic" to={primary.href}>
            {primary.label}
          </Link>
          <Link className="btn btn--secondary" to="/faq">
            常见问题
          </Link>
        </div>
      </div>
    </div>
  )
}