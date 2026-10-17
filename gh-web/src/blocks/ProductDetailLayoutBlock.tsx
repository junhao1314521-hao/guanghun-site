/**
 * productDetailLayout 产品详情 · 四套布局。
 *
 * 同一份产品数据（ProductDetail）与同一套字段逻辑，只切换 UI / 交互：
 * 目录式 / 标签式 / 折叠式 / 长页式。
 * 使用哪一套由后台区块「默认布局」决定，前台不提供切换入口。
 */
import { fetchTestRecords } from '../api/products'
import { useApi } from '../hooks/useApi'
import { useI18n } from '../i18n'
import { useProductDetail } from './ProductDetailContext'
import { asString } from './blockUtils'
import { buildDetailSections } from './productDetail/DetailSections'
import {
  AccordionLayout,
  LongLayout,
  TabsLayout,
  TocLayout,
} from './productDetail/DetailLayouts'
import '../styles/product-detail-layouts.css'

type Layout = 'toc' | 'tabs' | 'accordion' | 'long'

function isLayout(value: unknown): value is Layout {
  return value === 'toc' || value === 'tabs' || value === 'accordion' || value === 'long'
}

export function ProductDetailLayoutBlock({ props }: { props: Record<string, unknown> }) {
  const { t } = useI18n()
  const detail = useProductDetail()

  const model = detail?.model ?? ''
  const { data: recordsData } = useApi((signal) => fetchTestRecords(model, signal), [model])
  const testRecords = (recordsData?.items ?? []).filter((record) => record.status === '已发布')

  const propLayout = asString(props.layout, 'toc')
  const layout: Layout = isLayout(propLayout) ? propLayout : 'toc'

  if (!detail) return null

  const sections = buildDetailSections(detail, testRecords, props, t)
  const heroProps: Record<string, unknown> = {
    primaryLabel: props.primaryLabel,
    primaryHref: props.primaryHref,
    primaryFromProduct: props.primaryFromProduct,
    secondaryLabel: props.secondaryLabel,
    secondaryHref: props.secondaryHref,
    showBadges: props.showBadges,
    showPrice: props.showPrice,
    showSummary: props.showSummary,
  }

  return (
    <div className={`pdl pdl--${layout}`}>
      {layout === 'toc' && <TocLayout sections={sections} heroProps={heroProps} t={t} />}
      {layout === 'tabs' && <TabsLayout sections={sections} heroProps={heroProps} t={t} />}
      {layout === 'accordion' && <AccordionLayout sections={sections} heroProps={heroProps} t={t} />}
      {layout === 'long' && <LongLayout sections={sections} heroProps={heroProps} t={t} />}
    </div>
  )
}
