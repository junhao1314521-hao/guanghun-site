/**
 * 6. imageGrid 图片组（契约 §4）
 * props: title / columns:2|3|4 / items:{image,caption}[]
 */
import { MediaImg } from '../components/ui/MediaImg'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { asArray, asRecord, asString, gridClass } from './blockUtils'

export function ImageGridBlock({ props }: { props: Record<string, unknown> }) {
  const columns = gridClass(props.columns, 3)
  const items = asArray(props.items).map((value) => {
    const record = asRecord(value)
    return { image: asString(record.image), caption: asString(record.caption) }
  })

  return (
    <div>
      <SectionHeadFromProps props={props} />
      <div className={columns}>
        {items.map((item, index) => (
          <figure className="blk-figure" key={`${item.caption}-${index}`}>
            <div className="blk-figure__media">
              <MediaImg src={item.image} alt={item.caption} />
            </div>
            {item.caption && <figcaption className="blk-figure__caption">{item.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </div>
  )
}