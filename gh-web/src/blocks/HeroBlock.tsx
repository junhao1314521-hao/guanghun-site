/**
 * 1. hero 全宽海报（契约 §4）
 * props: eyebrow / title:string[] / desc / mediaTag / image /
 *        primary:{label,href} / secondary?:{label,href} / stats:{value,label}[]
 *
 * 结构与 Center 页首屏一致（.stage 深色皮肤 + 左文右图分栏），复用既有类名与令牌。
 */
import { Link } from 'react-router-dom'
import { MediaImg } from '../components/ui/MediaImg'
import { asLink, asStatItems, asString, asStringArray } from './blockUtils'

export function HeroBlock({ props }: { props: Record<string, unknown> }) {
  const eyebrow = asString(props.eyebrow)
  const title = asStringArray(props.title)
  const desc = asString(props.desc)
  const mediaTag = asString(props.mediaTag)
  const image = asString(props.image)
  const primary = asLink(props.primary)
  const secondary = asLink(props.secondary)
  const stats = asStatItems(props.stats)

  return (
    <div className="stage">
      <div className="stage__glow" />
      <div className="stage__content">
        <div className="grid-2" style={{ alignItems: 'center' }}>
          <div>
            {eyebrow && <div className="stage__eyebrow">{eyebrow}</div>}
            {title.length > 0 && (
              <h2 className="section__title" style={{ color: 'var(--gh-neutral-50)', marginTop: 'var(--gh-space-2)' }}>
                {title.map((line, index) => (
                  <span key={`${line}-${index}`}>
                    {line}
                    {index < title.length - 1 && <br />}
                  </span>
                ))}
              </h2>
            )}
            {desc && (
              <p className="stage__desc" style={{ marginTop: 'var(--gh-space-3)' }}>
                {desc}
              </p>
            )}
            {(primary || secondary) && (
              <div className="row" style={{ marginTop: 'var(--gh-space-6)' }}>
                {primary && (
                  <Link className="btn btn--primary is-magnetic" to={primary.href}>
                    {primary.label}
                  </Link>
                )}
                {secondary && (
                  <Link
                    className="btn btn--secondary"
                    to={secondary.href}
                    style={{ color: 'var(--gh-neutral-50)', borderColor: 'rgba(255,255,255,.28)' }}
                  >
                    {secondary.label}
                  </Link>
                )}
              </div>
            )}
            {stats.length > 0 && (
              <div className="row" style={{ gap: 'var(--gh-space-7)', marginTop: 'var(--gh-space-7)' }}>
                {stats.map((stat, index) => (
                  <div key={`${stat.label}-${index}`}>
                    <div className="stat__value">{stat.value}</div>
                    <div className="stat__label" style={{ color: 'var(--gh-neutral-400)' }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="ui-frame">
            {image ? (
              <MediaImg src={image} alt={mediaTag || title.join(' ')} className="ui-frame__img" loading="eager" />
            ) : (
              <div className="blk-imagetext__media" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}