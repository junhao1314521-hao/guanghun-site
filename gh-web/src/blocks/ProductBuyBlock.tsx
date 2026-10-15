/**
 * 产品详情 · 购买 / 咨询区块（productBuy）。
 *
 * 详情页的转化收口：主次按钮（文案与链接可配）+ 保障要点（每行一条）。
 * 复用区块标题组（主标题 / 子标题 / 右侧按钮），与全站调性一致。
 */
import { SafeLink } from '../components/ui/SafeLink'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { useI18n } from '../i18n'
import { asString, asStringArray } from './blockUtils'

function CtaButton({ label, href, primary }: { label: string; href: string; primary: boolean }) {
  if (!label) return null
  const className = `btn ${primary ? 'btn--primary' : 'btn--secondary'} btn--lg`
  return href.startsWith('/') ? (
    <SafeLink className={className} to={href}>
      {label}
    </SafeLink>
  ) : (
    <a className={className} href={href}>
      {label}
    </a>
  )
}

export function ProductBuyBlock({ props }: { props: Record<string, unknown> }) {
  const { t } = useI18n()
  const points = asStringArray(props.points)
  const list = points.length
    ? points
    : [t('blocks.pd.point1'), t('blocks.pd.point2'), t('blocks.pd.point3')]

  return (
    <div>
      <SectionHeadFromProps props={props} />
      <div className="card" style={{ padding: 'var(--gh-space-6)' }}>
        <div className="row" style={{ gap: 'var(--gh-space-3)', flexWrap: 'wrap' }}>
          <CtaButton label={asString(props.primaryLabel, '加入对比')} href={asString(props.primaryHref, '/compare')} primary />
          <CtaButton
            label={asString(props.secondaryLabel, '咨询咨询师')}
            href={asString(props.secondaryHref, '/inquiry')}
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
