/**
 * 9. timeline 时间轴（契约 §4）
 * props: title / items:{time,title,desc?}[]
 *
 * 沿用「发展历程 / 更新日志」的既有 news-list 行形态：左时间、中标签、右标题。
 */
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { asArray, asRecord, asString } from './blockUtils'

export function TimelineBlock({ props }: { props: Record<string, unknown> }) {
  const items = asArray(props.items).map((value) => {
    const record = asRecord(value)
    return { time: asString(record.time), title: asString(record.title), desc: asString(record.desc) }
  })

  return (
    <div>
      <SectionHeadFromProps props={props} />
      <div className="news-list reveal">
        {items.map((item, index) => (
          <div className="news-row" key={`${item.time}-${index}`}>
            <span className="news-row__date">{item.time}</span>
            {item.desc && <span className="tag">{item.desc}</span>}
            <span className="news-row__title">{item.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}