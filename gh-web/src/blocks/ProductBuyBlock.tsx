/**
 * 产品详情 · 购买 / 咨询区块（productBuy）。
 *
 * 详情页的转化收口：主次按钮（文案与链接可配）+ 保障要点（每行一条）。
 * 复用区块标题组（主标题 / 子标题 / 右侧按钮），与全站调性一致。
 */
import { Link } from 'react-router-dom'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { asString, asStringArray } from './blockUtils'

/** 默认保障要点（留空时使用） */
const DEFAULT_POINTS = [
  '全国联保 · 以官方保修政策为准',
  '7 天无理由退换（不影响二次销售）',
  '参数公开、方法公开，结论可复现',
]

function CtaButton({ label, href, primary }: { label: string; href: string; primary: boolean }) {
  if (!label) return null
  const className = `btn ${primary ? 'btn--primary' : 'btn--secondary'} btn--lg`
  return href.startsWith('/') ? (
    <Link className={className} to={href}>
      {label}
    </Link>
  ) : (
    <a className={className} href={href}>
      {label}
    </a>
  )
}

export function ProductBuyBlock({ props }: { props: Record<string, unknown> }) {
  const points = asStringArray(props.points)
  const list = points.length ? points : DEFAULT_POINTS

  return (
    <div>
      <SectionHeadFromProps props={props} />
      <div className="card" style={{ padding: 'var(--gh-space-6)' }}>
        <div className="row" style={{ gap: 'var(--gh-space-3)', flexWrap: 'wrap' }}>
          <CtaButton label={asString(props.primaryLabel, '加入对比')} href={asString(props.primaryHref, '/compare')} primary />
          <CtaButton
            label={asString(props.secondaryLabel, '咨询咨询师')}
            href={asString(props.secondaryHref, '/support#contact')}
            primary={false}
          />
        </div>
        <ul className="buy-points">
          {list.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
