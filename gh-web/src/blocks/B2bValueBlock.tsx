/**
 * 27. b2bValue B2B 采购价值 + 商务联系区块（可后台编辑 / 可关闭）
 *
 * props: title / subtitle（标题组）+ items[]（图标 + 标题 + 两行说明）
 *        + wechat / email / hotline（可复制胶囊；热线额外提供 tel: 拨号）+ showContact
 *
 * 不存内容以外的数据；联系信息点击复制并给出内联反馈（前端无全局 Toast，故用轻量内联反馈）。
 */
import { useEffect, useState, type ReactNode } from 'react'
import { BlockIcon } from '../components/home/BlockIcon'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { IconChat, IconCopy, IconMail, IconPhone } from '../components/ui/Icon'
import { asArray, asBool, asString } from './blockUtils'

type ValueItem = { icon: string; title: string; desc: string }

export function B2bValueBlock({ props }: { props: Record<string, unknown> }) {
  const items: ValueItem[] = asArray<Record<string, unknown>>(props.items)
    .map((item) => ({
      icon: asString(item.icon),
      title: asString(item.title),
      desc: asString(item.desc),
    }))
    .filter((item) => item.title || item.desc)

  const wechat = asString(props.wechat)
  const email = asString(props.email)
  const hotline = asString(props.hotline)
  const showContact = props.showContact === undefined ? true : asBool(props.showContact)
  const hasContact = showContact && Boolean(wechat || email || hotline)

  return (
    <div>
      <SectionHeadFromProps props={props} />
      {items.length > 0 && (
        <div className="b2b-grid">
          {items.map((item, index) => (
            <article className="card b2b-card reveal" key={`${item.title}-${index}`}>
              {item.icon && (
                <span className="b2b-card__icon">
                  <BlockIcon name={item.icon} size={20} />
                </span>
              )}
              <h3 className="card__title">{item.title}</h3>
              <p className="card__desc">{item.desc}</p>
            </article>
          ))}
        </div>
      )}
      {hasContact && (
        <div className="b2b-contact">
          {wechat && <ContactPill icon={<IconChat size={18} />} label="微信" value={wechat} />}
          {email && <ContactPill icon={<IconMail size={18} />} label="邮箱" value={email} />}
          {hotline && (
            <ContactPill
              icon={<IconPhone size={18} />}
              label="热线"
              value={hotline}
              telHref={`tel:${hotline.replace(/[^0-9+]/g, '')}`}
            />
          )}
        </div>
      )}
    </div>
  )
}

/** 可复制胶囊：点击复制值并给出内联反馈；hotline 额外提供 tel: 拨号 */
function ContactPill({
  icon,
  label,
  value,
  telHref,
}: {
  icon: ReactNode
  label: string
  value: string
  telHref?: string
}) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="b2b-contact__item">
      <button type="button" className="b2b-pill" onClick={copy} aria-label={`复制${label}：${value}`}>
        <span className="b2b-pill__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="b2b-pill__meta">
          <span className="b2b-pill__label">{label}</span>
          <span className="b2b-pill__value">{value}</span>
        </span>
        <span className="b2b-pill__copy" aria-hidden="true">
          <IconCopy size={14} />
        </span>
      </button>
      {telHref && (
        <a className="b2b-pill__tel" href={telHref} aria-label={`拨打 ${value}`}>
          拨打
        </a>
      )}
      <span className="b2b-contact__feedback" role="status" aria-live="polite">
        {copied ? '已复制' : ''}
      </span>
    </div>
  )
}
