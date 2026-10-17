/**
 * 咨询表单（共用实现）· §1.6 / §4.7 留言轻量分流。
 * ============================================================
 * 一套实现、一套联动逻辑，供「首页留言（contact 区块）」与 /inquiry、/contact 引导
 * 三处共用（只是入口不同）：
 * - 顶部先选「售前咨询 / 售后报修 / 商务合作」，下方「咨询主题」随类型联动；
 * - 字段仍为原有 5 项（称呼 / 联系方式 / 产品型号 / 咨询主题 / 问题描述），不增减；
 * - 版式保持左右两栏（左文案 + 右表单）；
 * - 提交时把咨询类型（`inquiryType`）随表单一并落库，供后台按类型自动分派 / 筛选。
 * - 分流能力由站点配置 `inquiryRouting`（默认开）控制，关掉后回退为原来的单一主题下拉。
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { submitInquiry, type InquiryBody, type InquiryResult } from '../api/support-extra'
import { CaptchaField, HoneypotField } from '../components/ui/CaptchaField'
import { useSiteAuth } from '../hooks/useSiteConfig'
import { INQUIRY_TOPICS } from '../data/support-extra'

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

/** 咨询类型（轻量分流）：值即落库字段 `inquiryType`，topics 为随类型联动的「咨询主题」选项 */
export type InquiryRoutingType = 'pre' | 'after' | 'business'

export const INQUIRY_ROUTING: { value: InquiryRoutingType; label: string; topics: string[] }[] = [
  { value: 'pre', label: '售前咨询', topics: ['产品选型', '参数与规格', '购买与渠道', '到店体验', '其他'] },
  { value: 'after', label: '售后报修', topics: ['固件与调校', '接口与连接', '色彩与 HDR', '保修与售后', '其他'] },
  { value: 'business', label: '商务合作', topics: ['渠道分销', '品牌联名', '赛事合作', '内容共创', '其他'] },
]

/** 默认类型（售后报修，其主题即原单一主题下拉 INQUIRY_TOPICS，保证无分流时口径一致） */
export const DEFAULT_INQUIRY_TYPE: InquiryRoutingType = 'after'

/** 按咨询类型取「咨询主题」选项；类型非法时回退默认 */
export function topicsForType(type: string): string[] {
  return INQUIRY_ROUTING.find((entry) => entry.value === type)?.topics ?? INQUIRY_ROUTING[1].topics
}

function emptyForm(routingEnabled: boolean): InquiryBody {
  return {
    name: '',
    contact: '',
    model: '',
    topic: routingEnabled ? topicsForType(DEFAULT_INQUIRY_TYPE)[0] : INQUIRY_TOPICS[0],
    message: '',
    ...(routingEnabled ? { inquiryType: DEFAULT_INQUIRY_TYPE } : {}),
  }
}

export type InquiryFormProps = {
  title: string
  desc: string
  points: string[]
  /** 是否启用轻量分流（站点配置 inquiryRouting，默认开） */
  routingEnabled: boolean
}

/** 咨询提交表单：提交中 / 成功 / 失败均保留已填内容；左栏文案 + 右栏表单两栏布局 */
export function InquiryForm({ title, desc, points, routingEnabled }: InquiryFormProps) {
  const [form, setForm] = useState<InquiryBody>(() => emptyForm(routingEnabled))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [result, setResult] = useState<InquiryResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  // 反垃圾：图形验证码 + 蜜罐字段（真人不可见的隐藏输入）
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaNonce, setCaptchaNonce] = useState(0)
  const auth = useSiteAuth()

  const update = (key: keyof InquiryBody, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev))
  }

  /** 切换咨询类型：把「咨询主题」重置为该类型下的首项，实现主题随类型联动 */
  const selectType = (type: InquiryRoutingType) => {
    setForm((prev) => ({ ...prev, inquiryType: type, topic: topicsForType(type)[0] }))
    setErrors((prev) => (prev.topic ? { ...prev, topic: '' } : prev))
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
    setForm(emptyForm(routingEnabled))
    setErrors({})
    setResult(null)
    setErrorMsg('')
    setCaptchaCode('')
    setCaptchaNonce((n) => n + 1)
    setStatus('idle')
  }

  const submitting = status === 'submitting'
  const topicOptions = routingEnabled ? topicsForType(String(form.inquiryType ?? DEFAULT_INQUIRY_TYPE)) : INQUIRY_TOPICS

  return (
    <div className="contact-split">
      <div className="contact-split__aside">
        <span className="contact-split__mark" aria-hidden="true" />
        {title && <h2 className="contact-split__title">{title}</h2>}
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
      <form className="card contact-form reveal" onSubmit={handleSubmit} noValidate>
        {/* 轻量分流：顶部先选咨询类型，下方「咨询主题」随类型联动 */}
        {routingEnabled && (
          <div className="field contact-type-field" style={{ marginBottom: 'var(--gh-space-3)' }}>
            <span className="field__label" id="inq-type-label">
              咨询类型
            </span>
            <div className="row" role="radiogroup" aria-labelledby="inq-type-label" style={{ flexWrap: 'wrap' }}>
              {INQUIRY_ROUTING.map((entry) => {
                const active = (form.inquiryType ?? DEFAULT_INQUIRY_TYPE) === entry.value
                return (
                  <button
                    key={entry.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`chip${active ? ' is-active' : ''}`}
                    onClick={() => selectType(entry.value)}
                  >
                    {entry.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
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
              {topicOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field" style={{ marginTop: 'var(--gh-space-3)' }}>
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
          inputId="contactCaptcha"
          code={captchaCode}
          onCodeChange={setCaptchaCode}
          onTokenChange={setCaptchaToken}
          error={errors.captcha}
          disabled={submitting}
        />

        <div className="row" style={{ marginTop: 'var(--gh-space-4)' }}>
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
                去个人中心查看
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

      <p className="contact-privacy">
        提交即表示同意我们按
        <Link to="/legal/privacy">隐私政策</Link>
        处理你的联系方式，仅用于回复本次咨询。
      </p>
      </div>
    </div>
  )
}
