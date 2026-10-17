/**
 * productDetailLayout 产品详情 · 四套布局。
 *
 * 同一份产品数据（ProductDetail）与同一套字段逻辑，只切换 UI / 交互：
 * 目录式 / 标签式 / 折叠式 / 长页式。后台可选择默认布局；
 * 前台 `?layout=` 可临时覆盖，便于设计与运营对比。
 */
import { useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchTestRecords } from '../api/products'
import { useApi } from '../hooks/useApi'
import { useI18n } from '../i18n'
import { useProductDetail } from './ProductDetailContext'
import { asBool, asString } from './blockUtils'
import { buildDetailSections } from './productDetail/DetailSections'
import {
  AccordionLayout,
  LongLayout,
  TabsLayout,
  TocLayout,
} from './productDetail/DetailLayouts'
import '../styles/product-detail-layouts.css'

type Layout = 'toc' | 'tabs' | 'accordion' | 'long'

const LAYOUTS: Array<{ value: Layout; labelKey: string }> = [
  { value: 'toc', labelKey: 'blocks.pd.layoutToc' },
  { value: 'tabs', labelKey: 'blocks.pd.layoutTabs' },
  { value: 'accordion', labelKey: 'blocks.pd.layoutAccordion' },
  { value: 'long', labelKey: 'blocks.pd.layoutLong' },
]

function isLayout(value: unknown): value is Layout {
  return value === 'toc' || value === 'tabs' || value === 'accordion' || value === 'long'
}

export function ProductDetailLayoutBlock({ props }: { props: Record<string, unknown> }) {
  const { t } = useI18n()
  const detail = useProductDetail()
  const rootRef = useRef<HTMLDivElement>(null)
  const [params, setParams] = useSearchParams()

  const model = detail?.model ?? ''
  const { data: recordsData } = useApi((signal) => fetchTestRecords(model, signal), [model])
  const testRecords = (recordsData?.items ?? []).filter((record) => record.status === '已发布')

  const propLayout = asString(props.layout, 'toc')
  const urlLayout = params.get('layout')
  const layout: Layout = isLayout(urlLayout) ? urlLayout : isLayout(propLayout) ? propLayout : 'toc'
  const showSwitcher = props.showSwitcher === undefined ? true : asBool(props.showSwitcher)

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

  const setLayout = (next: Layout) => {
    const search = new URLSearchParams(params)
    search.set('layout', next)
    setParams(search, { replace: true })
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div ref={rootRef} className={`pdl pdl--${layout}`}>
      {showSwitcher && (
        <div className="pdl-switcher">
          <span className="pdl-switcher__label">{t('blocks.pd.layoutPreview')}</span>
          <div className="segmented" role="group" aria-label={t('blocks.pd.layoutPreview')}>
            {LAYOUTS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={layout === option.value ? 'is-active' : undefined}
                aria-pressed={layout === option.value}
                onClick={() => setLayout(option.value)}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </div>
      )}

      {layout === 'toc' && <TocLayout sections={sections} heroProps={heroProps} t={t} />}
      {layout === 'tabs' && <TabsLayout sections={sections} heroProps={heroProps} t={t} />}
      {layout === 'accordion' && <AccordionLayout sections={sections} heroProps={heroProps} t={t} />}
      {layout === 'long' && <LongLayout sections={sections} heroProps={heroProps} t={t} />}
    </div>
  )
}
