/**
 * 产品详情 · 购买 / 咨询区块（productBuy）。
 *
 * 详情页的转化收口：左侧标题、说明与保障要点，右侧主次按钮。
 * 不使用整块白卡，保持与详情页同一张纸；文案全部来自后台区块配置。
 */
import { SafeLink } from '../components/ui/SafeLink'
import { useI18n } from '../i18n'
import { asString, asStringArray } from './blockUtils'

/** 购买区按钮：按 href 是否为站内路径选择 SafeLink 或原生 a，label 为空时不渲染 */
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

/** 产品购买 / 咨询区块：左侧文案与保障要点，右侧转化按钮 */
export function ProductBuyBlock({ props }: { props: Record<string, unknown> }) {
  const { t } = useI18n()
  const points = asStringArray(props.points)
  const list = points.length
    ? points
    : [t('blocks.pd.point1'), t('blocks.pd.point2'), t('blocks.pd.point3')]
  const title = asString(props.title, t('blocks.pd.defaultBuyTitle'))
  const subtitle = asString(props.subtitle)

  return (
    <div className="pd-buy">
      <div className="pd-buy__copy">
        <h2 className="pd-buy__title">{title}</h2>
        {subtitle && <p className="pd-buy__sub">{subtitle}</p>}
        <ul className="pd-buy__points">
          {list.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
      <div className="pd-buy__actions">
        <CtaButton
          label={asString(props.primaryLabel, '加入对比')}
          href={asString(props.primaryHref, '/compare')}
          primary
        />
        <CtaButton
          label={asString(props.secondaryLabel, '咨询咨询师')}
          href={asString(props.secondaryHref, '/inquiry')}
          primary={false}
        />
      </div>
    </div>
  )
}
