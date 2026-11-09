/**
 * 首页咨询分流（inquiryDock）：
 * 左侧说明服务时间与响应时效；右侧先选类型，再用一条紧凑输入栏直接提交问题
 * （只收「问题描述 + 联系方式」，服务端按 quick 模式落库，称呼 / 型号用占位值）。
 * 复杂问题仍可进入 /inquiry?type=… 的完整表单；辅助链接直达工单 / 设备 / FAQ。
 */
import { useState, type FormEvent } from 'react'
import { SafeLink } from '../components/ui/SafeLink'
import { CaptchaField, HoneypotField } from '../components/ui/CaptchaField'
import { submitInquiry } from '../api/support-extra'
import { asArray, asBool, asRecord, asString, asStringArray } from './blockUtils'

type Channel = { label: string; desc: string; type: 'pre' | 'after' | 'business'; action: string }

const DEFAULT_CHANNELS: Channel[] = [
  { label: '售前咨询', desc: '选型、参数、兼容', type: 'pre', action: '立即咨询' },
  { label: '售后报修', desc: '故障、保修、换新', type: 'after', action: '提交工单' },
  { label: '商务合作', desc: '渠道、送测、赛事', type: 'business', action: '合作申请' },
]

function toChannels(value: unknown): Channel[] {
  const list = asArray(value)
    .map((entry) => {
      const record = asRecord(entry)
      const label = asString(record.label)
      if (!label) return null
      const rawType = asString(record.type, 'after')
      const type: Channel['type'] = rawType === 'pre' || rawType === 'business' ? rawType : 'after'
      return {
        label,
        desc: asString(record.desc),
        type,
        action: asString(record.action, '立即咨询'),
      }
    })
    .filter((entry): entry is Channel => Boolean(entry))
  return list.length > 0 ? list : DEFAULT_CHANNELS
}

/** 「文案|链接」行列表 → 链接数组（无链接的行忽略） */
function toLinks(value: unknown): { label: string; href: string }[] {
  return asStringArray(value)
    .map((line) => {
      const [label, href] = line.split('|').map((part) => part.trim())
      return label && href ? { label, href } : null
    })
    .filter((entry): entry is { label: string; href: string } => Boolean(entry))
}

/** 把选中类型写进主按钮地址：保留已有 query，再补 type */
function hrefWithType(href: string, type: string): string {
  if (!href) return _hrefWithTypeDefault(type)
  const [path, query] = href.split('?')
  const params = new URLSearchParams(query ?? '')
  params.set('type', type)
  return `${path}?${params.toString()}`
}

function _hrefWithTypeDefault(type: string): string {
  return `/inquiry?type=${type}`
}

export function InquiryDockBlock({ props }: { props: Record<string, unknown> }) {
  const title = asString(props.title, '还有问题？')
  const desc = asString(props.desc)
  const points = asStringArray(props.points)
  const channels = toChannels(props.channels)
  const primaryLabel = asString(props.primaryLabel, '提交咨询')
  const primaryHref = asString(props.primaryHref, '/inquiry')
  const secondaryLabel = asString(props.secondaryLabel, '常见问题')
  const secondaryHref = asString(props.secondaryHref, '/faq')
  const links = toLinks(props.links)
  const [selected, setSelected] = useState<Channel['type']>(channels[0].type)
  const active = channels.find((channel) => channel.type === selected) ?? channels[0]

  // —— 快速提问：只填「问题 + 联系方式」，其余走服务端 quick 模式 ——
  const quickEnabled = props.quickEnabled === undefined ? true : asBool(props.quickEnabled)
  const quickPlaceholder = asString(props.quickPlaceholder, '用一句话描述你的问题，例如：54027X1QE 更新固件后 HDR 偏暗')
  const quickCta = asString(props.quickCta, '快速提问')
  const quickTip = asString(props.quickTip, '提交后可在「我的工单」查看进度；需要填型号与截图时再用完整表单。')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState('')
  const [ticketId, setTicketId] = useState('')

  const submitQuick = async (event: FormEvent) => {
    event.preventDefault()
    if (status === 'sending' || status === 'done') return
    if (!message.trim() || !contact.trim()) {
      setError('请填写问题描述与联系方式')
      return
    }
    setError('')
    setStatus('sending')
    try {
      const result = await submitInquiry({
        name: '',
        contact: contact.trim(),
        model: '',
        topic: '',
        message: message.trim(),
        inquiryType: active.type,
        quick: true,
        captchaToken,
        captchaCode,
      })
      setTicketId(result.ticketId)
      setStatus('done')
    } catch (err) {
      setStatus('idle')
      setError(err instanceof Error ? err.message : '提交失败，请稍后重试')
    }
  }

  return (
    <section className="inq-dock" aria-label={title || '咨询'}>
      <div className="inq-dock__left">
        {title && <h2 className="inq-dock__title">{title}</h2>}
        {desc && <p className="inq-dock__desc">{desc}</p>}
        {points.length > 0 && (
          <ul className="inq-dock__points">
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="inq-dock__right">
        <div className="inq-dock__channels" role="radiogroup" aria-label="选择咨询类型">
          {channels.map((channel) => (
            <button
              key={`${channel.type}-${channel.label}`}
              type="button"
              role="radio"
              aria-checked={channel.type === selected}
              className={`inq-dock__channel${channel.type === selected ? ' is-on' : ''}`}
              onClick={() => setSelected(channel.type)}
            >
              <b>{channel.label}</b>
              {channel.desc && <span>{channel.desc}</span>}
              <em aria-hidden="true">→ {channel.action}</em>
            </button>
          ))}
        </div>

        {quickEnabled && (
          <form className="inq-dock__quick" onSubmit={submitQuick}>
            <HoneypotField />
            <label className="sr-only" htmlFor="inq-quick-message">
              问题描述
            </label>
            <textarea
              id="inq-quick-message"
              className="inq-dock__quick-input"
              rows={2}
              value={message}
              placeholder={quickPlaceholder}
              disabled={status !== 'idle'}
              onChange={(event) => setMessage(event.target.value)}
            />
            <div className="inq-dock__quick-row">
              <input
                className="input inq-dock__quick-contact"
                value={contact}
                placeholder="手机号或邮箱"
                aria-label="手机号或邮箱"
                autoComplete="email"
                disabled={status !== 'idle'}
                onChange={(event) => setContact(event.target.value)}
              />
              <CaptchaField
                compact
                inputId="inq-quick-captcha"
                code={captchaCode}
                onCodeChange={setCaptchaCode}
                onTokenChange={setCaptchaToken}
                disabled={status !== 'idle'}
              />
              <button className="btn btn--primary inq-dock__quick-submit" type="submit" disabled={status !== 'idle'}>
                {status === 'sending' ? '提交中…' : status === 'done' ? '已提交' : quickCta}
              </button>
            </div>
            {status === 'done' ? (
              <p className="inq-dock__quick-ok" role="status">
                已收到，工单号 {ticketId}。
                <SafeLink to="/me/inquiries">去「我的工单」查看进度 →</SafeLink>
              </p>
            ) : (
              <p className={`inq-dock__quick-tip${error ? ' is-error' : ''}`} role={error ? 'alert' : undefined}>
                {error || quickTip}
              </p>
            )}
          </form>
        )}

        <div className="inq-dock__cta">
          <SafeLink className="inq-dock__more-link" to={hrefWithType(primaryHref, active.type)}>
            需要填写型号？{primaryLabel}完整表单 →
          </SafeLink>
          {secondaryLabel && secondaryHref && (
            <SafeLink className="inq-dock__more-link" to={secondaryHref}>
              {secondaryLabel} →
            </SafeLink>
          )}
        </div>

        {links.length > 0 && (
          <div className="inq-dock__links">
            {links.map((link) => (
              <SafeLink key={`${link.href}-${link.label}`} to={link.href}>
                {link.label} <span aria-hidden="true">→</span>
              </SafeLink>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
