/**
 * 4. text 标题正文（契约 §4）
 * props: eyebrow / title / body / align:'left'|'center'
 *
 * body 以 `\n` 分隔多段；标题统一用 h2（页面 h1 由页面外壳提供）。
 */
import { asString, splitBody } from './blockUtils'

export function TextBlock({ props }: { props: Record<string, unknown> }) {
  const eyebrow = asString(props.eyebrow)
  const title = asString(props.title)
  const body = asString(props.body)
  const align = asString(props.align, 'left')
  const paragraphs = splitBody(body)

  return (
    <div style={align === 'center' ? { textAlign: 'center' } : undefined}>
      {eyebrow && (
        <div className="stage__eyebrow" style={{ color: 'var(--color-accent-text)' }}>
          {eyebrow}
        </div>
      )}
      {title && (
        <h2 className="section__title" style={eyebrow ? { marginTop: 'var(--gh-space-2)' } : undefined}>
          {title}
        </h2>
      )}
      {paragraphs.length > 0 && (
        <div style={align === 'center' ? { maxWidth: '68ch', margin: '0 auto' } : undefined}>
          {paragraphs.map((line, index) => (
            <p className="blk-body" key={`${line.slice(0, 12)}-${index}`} style={{ marginTop: index === 0 ? 'var(--gh-space-2)' : undefined }}>
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}