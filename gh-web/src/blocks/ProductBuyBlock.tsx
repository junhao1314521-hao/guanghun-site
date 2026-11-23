/**
 * 产品详情 · 购买 / 咨询区块（productBuy）。
 *
 * 详情页的转化收口：左侧标题、说明与保障要点，右侧主次按钮。
 * 不使用整块白卡，保持与详情页同一张纸；标题与说明同排，不单独占一行标题栏；文案全部来自后台区块配置。
 */
import { SafeLink } from '../components/ui/SafeLink'
import { useI18n } from '../i18n'
import { VENUE_MODEL_FAMILIES } from '../lib/venue'
import type { ProductDetail } from '../data/products'
import { asString, asStringArray } from './blockUtils'
import { useProductDetail } from './ProductDetailContext'

/**
 * 「预约体验」类链接自动补机型筛选：
 * 仅当目标是体验点页、且当前产品能匹配到机型族时追加 `?model=`，其余链接原样返回。
 */
function withVenueModel(href: string, detail: ProductDetail | null): string {
  if (!detail || !href.startsWith('/')) return href
  const pathname = href.split(/[?#]/)[0]
  if (pathname !== '/business/venues' && pathname !== '/business/venues/') return href
  if (/[?&]model=/.test(href)) return href
  const hay = `${detail.model} ${detail.name}`
  const family = VENUE_MODEL_FAMILIES.find(
    (item) => item !== '全部' && item !== '全系' && hay.includes(item),
  )
  if (!family) return href
  return `${href}${href.includes('?') ? '&' : '?'}model=${encodeURIComponent(family)}`
}

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
  const detail = useProductDetail()
  const points = asStringArray(props.points)
  const list = points.length
    ? points
    : [t('blocks.pd.point1'), t('blocks.pd.point2'), t('blocks.pd.point3')]
  const title = asString(props.title, t('blocks.pd.defaultBuyTitle'))
  const subtitle = asString(props.subtitle)

  return (
    <div className="pd-buy">
      <div className="pd-buy__copy">
        <h2 className="pd-buy__title">
          {title}
          {subtitle && <span className="pd-buy__sub">{subtitle}</span>}
        </h2>
        <ul className="pd-buy__points">
          {list.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
      <div className="pd-buy__actions">
        <CtaButton
          label={asString(props.primaryLabel, '加入对比')}
          href={withVenueModel(asString(props.primaryHref, '/compare'), detail)}
          primary
        />
        <CtaButton
          label={asString(props.secondaryLabel, '咨询咨询师')}
          href={withVenueModel(asString(props.secondaryHref, '/inquiry'), detail)}
          primary={false}
        />
      </div>
    </div>
  )
}
