/**
 * 9. timeline 时间轴 / 流程（契约 §4）
 * props: title / layout:'list'|'flow' / items:{time,title,desc?}[]
 *
 * - list（默认）：沿用「发展历程 / 更新日志」的 news-list 行形态：左时间、中标签、右标题；
 * - flow：横向流程（序号 + 连接线 + hover 抬升），移动端自动转为纵向。
 */
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { asArray, asRecord, asString } from './blockUtils'

export function TimelineBlock({ props }: { props: Record<string, unknown> }) {
  const items = asArray(props.items).map((value) => {
    const record = asRecord(value)
    return { time: asString(record.time), title: asString(record.title), desc: asString(record.desc) }
  })
  const flow = asString(props.layout, 'list') === 'flow'

  return (
    <div>
      <SectionHeadFromProps props={props} />
      {flow ? (
        <ol className="tl-flow reveal">
          {items.map((item, index) => (
            <li className="tl-flow__item" key={`${item.time}-${index}`}>
              <span className="tl-flow__num mono">{item.time || String(index + 1).padStart(2, '0')}</span>
              <h3 className="tl-flow__title">{item.title}</h3>
              {item.desc && <p className="tl-flow__desc">{item.desc}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <div className="news-list reveal">
          {items.map((item, index) => (
            <div className="news-row" key={`${item.time}-${index}`}>
              <span className="news-row__date">{item.time}</span>
              {item.desc && <span className="tag">{item.desc}</span>}
              <span className="news-row__title">{item.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
