/**
 * 7. stats 数字展示（契约 §4）
 * props: title / subtitle / footnote / items:{value,unit?,label,note?}[]
 *
 * 「精致数据卡」形态：序号 + 大数字（含单位）+ 说明 + 补充说明 + 底部装饰指标条。
 * 用于首页「数据一览」与关于页「关键事实」。
 */
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { asStatItems, asString } from './blockUtils'

export function StatsBlock({ props }: { props: Record<string, unknown> }) {
  const items = asStatItems(props.items)
  const footnote = asString(props.footnote)
  if (items.length === 0 && !asString(props.title)) return null

  return (
    <div className="blk-stats">
      <SectionHeadFromProps props={props} />
      <div className="blk-stats__grid">
        {items.map((item, index) => (
          <div className="blk-stats__item reveal" key={`${item.label}-${index}`} data-delay={String(Math.min(index + 1, 6))}>
            <span className="blk-stats__index">{String(index + 1).padStart(2, '0')}</span>
            <div className="blk-stats__value">
              {item.value}
              {item.unit && <i className="blk-stats__unit">{item.unit}</i>}
            </div>
            <div className="blk-stats__label">{item.label}</div>
            {item.note && <p className="blk-stats__note">{item.note}</p>}
            <span className="blk-stats__bar" aria-hidden="true" />
          </div>
        ))}
      </div>
      {footnote && <p className="blk-stats__footnote">{footnote}</p>}
    </div>
  )
}
