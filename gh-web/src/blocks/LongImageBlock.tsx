/**
 * 长图拼接（R6 新建）：多张 PS 切片按顺序垂直无缝拼接。
 *
 * - 桌面用 `image`，窄屏优先 `imageMobile`（缺省回退桌面图）；
 * - 无 gap、无圆角、无 1px 缝：图片 `display: block`，容器行高归零；
 * - `href` 可选：整块可点击跳转；
 * - 默认 `container: full` 通栏（由后台创建区块时写入 style）。
 */
import { asArray, asRecord, asString } from './blockUtils'

type LongImageItem = { image: string; imageMobile: string; alt: string }

export function LongImageBlock({ props }: { props: Record<string, unknown> }) {
  const href = asString(props.href)
  const items: LongImageItem[] = asArray(props.items)
    .map((value) => {
      const record = asRecord(value)
      return {
        image: asString(record.image),
        imageMobile: asString(record.imageMobile),
        alt: asString(record.alt),
      }
    })
    .filter((item) => item.image || item.imageMobile)

  if (items.length === 0) return null

  const content = (
    <div className="long-image">
      {items.map((item, index) => (
        <picture key={`${item.image || item.imageMobile}-${index}`}>
          {item.imageMobile && <source media="(max-width: 767px)" srcSet={item.imageMobile} />}
          <img
            className="long-image__slice"
            src={item.image || item.imageMobile}
            alt={item.alt}
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        </picture>
      ))}
    </div>
  )

  return href ? (
    <a className="long-image__link" href={href}>
      {content}
    </a>
  ) : (
    content
  )
}
