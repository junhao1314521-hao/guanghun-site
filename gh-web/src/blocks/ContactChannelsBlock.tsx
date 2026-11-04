/**
 * 联系渠道区块（contactChannels）。
 * 苹果风：左侧大标题，右侧细分割线渠道列表；支持复制（微信 / QQ群）与跳转（官网 / 社交平台）。
 */
import { useState } from 'react'
import type { ContactChannelsProps } from './types'
import { copyText } from '../lib/venue'
import { IconCheck, IconCopy } from '../components/ui/Icon'

export function ContactChannelsBlock({ props }: { props: Record<string, unknown> }) {
  const eyebrow = (props.eyebrow as string) || 'CONTACT · 联系我们'
  const title = (props.title as string) || '与你，直接对话。'
  const subtitle = (props.subtitle as string) || ''
  const items = (Array.isArray(props.items) ? props.items : []) as NonNullable<ContactChannelsProps['items']>
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = async (value: string) => {
    const ok = await copyText(value)
    if (!ok) return
    setCopied(value)
    window.setTimeout(() => setCopied((current) => (current === value ? null : current)), 1800)
  }

  return (
    <section className="cc">
      <div className="cc__inner">
        <div className="cc__head">
          <div className="cc__eyebrow">{eyebrow}</div>
          <h2 className="cc__title">{title}</h2>
          {subtitle && <p className="cc__sub">{subtitle}</p>}
        </div>

        <div className="cc__list">
          {items.map((item, index) => {
            const label = item?.label ?? ''
            const value = item?.value ?? ''
            const href = item?.href ?? ''
            const copyable = Boolean(item?.copy) && Boolean(value)
            const content = (
              <>
                <span className="cc__label">{label}</span>
                <span className="cc__value">{value}</span>
                <span className="cc__action">
                  {copyable ? (
                    copied === value ? <IconCheck size={15} /> : <IconCopy size={15} />
                  ) : href ? '↗' : ''}
                </span>
              </>
            )
            if (copyable) {
              return (
                <button className="cc__row" type="button" key={`${label}-${index}`} onClick={() => handleCopy(value)}>
                  {content}
                </button>
              )
            }
            if (href) {
              return (
                <a className="cc__row" key={`${label}-${index}`} href={href} target="_blank" rel="noopener noreferrer">
                  {content}
                </a>
              )
            }
            return (
              <div className="cc__row cc__row--static" key={`${label}-${index}`}>
                {content}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
