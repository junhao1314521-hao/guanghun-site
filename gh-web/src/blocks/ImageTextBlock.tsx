/**
 * 5. imageText 图文（契约 §4）
 * props: image / title / body / side:'left'|'right' / cta?:{label,href}
 *
 * body 以 `\n` 分隔：首行作导语，其余作要点列表（对齐 seed 的 `desc\npoints` 形态）。
 * side 表示图片所处一侧：'left' → 图在左（grid-2--flip），'right' → 图在右。
 */
import { SafeLink } from '../components/ui/SafeLink'
import { MediaImg } from '../components/ui/MediaImg'
import { asLink, asString, splitBody } from './blockUtils'

export function ImageTextBlock({ props }: { props: Record<string, unknown> }) {
  const image = asString(props.image)
  const title = asString(props.title)
  const body = asString(props.body)
  const side = asString(props.side, 'right')
  const cta = asLink(props.cta)

  const lines = splitBody(body)
  const lead = lines[0] ?? ''
  const points = lines.slice(1)
  const flip = side === 'left'

  return (
    <div className={`grid-2${flip ? ' grid-2--flip' : ''}`} style={{ alignItems: 'center' }}>
      <div className="reveal">
        {title && <h2 className="section__title">{title}</h2>}
        {lead && (
          <p className="section__desc" style={{ marginTop: 'var(--gh-space-3)' }}>
            {lead}
          </p>
        )}
        {points.length > 0 && (
          <ul className="feature-list" style={{ marginTop: 'var(--gh-space-4)' }}>
            {points.map((point, index) => (
              <li key={`${point.slice(0, 12)}-${index}`}>{point}</li>
            ))}
          </ul>
        )}
        {cta && (
          <div className="row" style={{ marginTop: 'var(--gh-space-5)' }}>
            <SafeLink className="btn btn--secondary" to={cta.href}>
              {cta.label}
            </SafeLink>
          </div>
        )}
      </div>
      <div className="blk-imagetext__media reveal">
        <MediaImg src={image} alt={title} />
      </div>
    </div>
  )
}