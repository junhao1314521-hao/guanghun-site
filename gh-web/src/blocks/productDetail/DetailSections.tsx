/**
 * 产品详情 · 共享内容区段（四套布局共用）。
 *
 * 单一数据源：所有区段只消费 `ProductDetail`（+ 测试记录 + 区块 props），
 * 不在任何布局里重复取数或重复定义字段。布局只决定「怎么排列 / 怎么切换」。
 */
import type { ReactNode } from 'react'
import { SafeLink } from '../../components/ui/SafeLink'
import type { TestRecord } from '../../api/products'
import type { ProductDetail } from '../../data/products'
import { sanitizeRichText } from '../sanitize'

/** 完整规格分组展示顺序（未列出的分组排在最后） */
const GROUP_ORDER = ['显示', '接口', '电源', '机械', '物理尺寸', '包装', '认证']

export type DetailSectionKey =
  | 'overview'
  | 'summary'
  | 'specs'
  | 'test'
  | 'compatibility'
  | 'downloads'
  | 'rich'
  | 'buy'

export type DetailSection = {
  key: DetailSectionKey
  title: string
  node: ReactNode
  /** 可选计数（后台区块标题右侧 / 折叠组摘要） */
  count?: number
}

type T = (key: string, vars?: Record<string, string | number>) => string

/** 按 group 归组并排序；与旧 ProductSpecsBlock 保持同一口径 */
function groupAttributes(attributes: ProductDetail['attributes']) {
  const map = new Map<string, Array<{ label: string; value: string; group?: string }>>()
  for (const attr of attributes ?? []) {
    const key = attr.group?.trim() || '其他'
    const list = map.get(key) ?? []
    list.push(attr)
    map.set(key, list)
  }
  return Array.from(map.entries()).sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a[0])
    const ib = GROUP_ORDER.indexOf(b[0])
    return (ia < 0 ? GROUP_ORDER.length : ia) - (ib < 0 ? GROUP_ORDER.length : ib)
  })
}

export function hasCompatibility(detail: ProductDetail): boolean {
  return Boolean(
    detail.os?.length || detail.weight !== undefined || detail.warranty || detail.inBox?.length,
  )
}

/** ① 产品亮点 */
function OverviewContent({ detail }: { detail: ProductDetail }) {
  const features = detail.features ?? []
  if (!features.length) return null
  return (
    <ul className="pd-feature-grid">
      {features.map((item, index) => (
        <li key={item}>
          <span className="pd-feature-grid__idx">{String(index + 1).padStart(2, '0')}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

/** ② 性能摘要（标称 / 实测） */
function SummaryContent({ detail, t, sectionTitle }: { detail: ProductDetail; t: T; sectionTitle: string }) {
  return (
    <>
      {detail.summary.map((group) => (
        <div key={group.title} className="pd-summary">
          {group.title !== sectionTitle && <h3 className="pd-summary__title">{group.title}</h3>}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '26%' }}>{t('blocks.pd.colParam')}</th>
                  <th>{t('blocks.pd.colNominal')}</th>
                  <th>{t('blocks.pd.colMeasured')}</th>
                  <th>{t('blocks.pd.colNote')}</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td className="mono">{row.nominal ?? '—'}</td>
                    <td className={row.missing ? 'missing' : 'mono'}>
                      {row.measured ?? row.value ?? '—'}
                    </td>
                    <td className="muted">{row.note ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <p className="field__hint">{t('blocks.pd.missingNote')}</p>
    </>
  )
}

/** ③ 完整规格（分组折叠） */
function SpecsContent({ detail, t }: { detail: ProductDetail; t: T }) {
  const groups = groupAttributes(detail.attributes)
  if (!groups.length) return null
  return (
    <div className="pd-spec-groups">
      {groups.map(([group, rows], index) => (
        <details className="pd-spec-group" key={group} open={index === 0}>
          <summary>
            <span>{group}</span>
            <span className="pd-spec-group__count">{t('blocks.pd.specCount', { n: rows.length })}</span>
          </summary>
          <dl className="pd-spec-group__list">
            {rows.map((attr) => (
              <div key={attr.label}>
                <dt>{attr.label}</dt>
                <dd>{attr.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ))}
    </div>
  )
}

/** ④ 测试记录（后台已发布） */
function TestRecordsContent({ records }: { records: TestRecord[] }) {
  return (
    <>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>指标</th>
              <th>实测值</th>
              <th>测试方法</th>
              <th>测试日期</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>{record.metric}</td>
                <td className="mono">{record.value}</td>
                <td className="muted">{record.method}</td>
                <td className="muted mono">{record.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {records.some((record) => record.conclusion) && (
        <ul className="pdl-conclusions">
          {records
            .filter((record) => record.conclusion)
            .map((record) => (
              <li key={`${record.id}-conclusion`} className="muted">
                {record.title}：{record.conclusion}
              </li>
            ))}
        </ul>
      )}
    </>
  )
}

/** ⑤ 兼容与保修 */
function CompatibilityContent({ detail, t }: { detail: ProductDetail; t: T }) {
  return (
    <div className="card">
      <div className="dl-meta">
        {Boolean(detail.os?.length) && (
          <div>
            <div className="dl-meta__k">{t('blocks.pd.os')}</div>
            <div className="dl-meta__v">{detail.os?.join(' / ')}</div>
          </div>
        )}
        {detail.weight !== undefined && (
          <div>
            <div className="dl-meta__k">{t('blocks.pd.weight')}</div>
            <div className="dl-meta__v mono">{detail.weight} g</div>
          </div>
        )}
        {Boolean(detail.warranty) && (
          <div>
            <div className="dl-meta__k">{t('blocks.pd.warranty')}</div>
            <div className="dl-meta__v">{detail.warranty}</div>
          </div>
        )}
      </div>
      {Boolean(detail.inBox?.length) && (
        <div style={{ marginTop: 'var(--gh-space-4)' }}>
          <div className="dl-meta__k">{t('blocks.pd.inBox')}</div>
          <ul className="feature-list" style={{ marginTop: 'var(--gh-space-2)' }}>
            {detail.inBox?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** ⑥ 下载与支持 */
function DownloadsContent({ t }: { t: T }) {
  return (
    <div className="pdl-guides">
      <div className="card">
        <h3 className="card__title">{t('blocks.pd.guideDownloads')}</h3>
        <p className="card__desc">{t('blocks.pd.guideDownloadsDesc')}</p>
        <SafeLink className="btn btn--secondary btn--sm" to="/downloads" style={{ marginTop: 'var(--gh-space-4)' }}>
          {t('blocks.pd.goDownload')}
        </SafeLink>
      </div>
      <div className="card">
        <h3 className="card__title">{t('blocks.pd.guideHelp')}</h3>
        <p className="card__desc">{t('blocks.pd.guideHelpDesc')}</p>
        <SafeLink className="btn btn--primary btn--sm" to="/inquiry" style={{ marginTop: 'var(--gh-space-4)' }}>
          {t('blocks.pd.submitTicket')}
        </SafeLink>
      </div>
    </div>
  )
}

/** ⑦ 详情图文 */
function RichContent({ html }: { html: string }) {
  const clean = sanitizeRichText(html)
  if (!clean.trim()) return null
  return <div className="pd-detail-rich" dangerouslySetInnerHTML={{ __html: clean }} />
}

/** ⑧ 底部购买 / 咨询 */
function BuyContent({ props, t }: { props: Record<string, unknown>; t: T }) {
  const primaryLabel = typeof props.buyPrimaryLabel === 'string' && props.buyPrimaryLabel ? props.buyPrimaryLabel : '预约体验'
  const primaryHref = typeof props.buyPrimaryHref === 'string' && props.buyPrimaryHref ? props.buyPrimaryHref : '/business/venues'
  const secondaryLabel = typeof props.buySecondaryLabel === 'string' && props.buySecondaryLabel ? props.buySecondaryLabel : '在线顾问'
  const secondaryHref = typeof props.buySecondaryHref === 'string' && props.buySecondaryHref ? props.buySecondaryHref : '/inquiry'
  const title = typeof props.buyTitle === 'string' && props.buyTitle ? props.buyTitle : t('blocks.pd.defaultBuyTitle')
  const subtitle = typeof props.buySubtitle === 'string' ? props.buySubtitle : ''
  return (
    <div className="card pdl-buy">
      <div>
        <h3 className="card__title">{title}</h3>
        {subtitle && <p className="card__desc">{subtitle}</p>}
      </div>
      <div className="row">
        <SafeLink className="btn btn--primary" to={primaryHref}>
          {primaryLabel}
        </SafeLink>
        <SafeLink className="btn btn--secondary" to={secondaryHref}>
          {secondaryLabel}
        </SafeLink>
      </div>
    </div>
  )
}

/**
 * 把同一份产品数据整理成有序区段。
 * 布局层只决定这些区段如何分组 / 切换 / 折叠，不改变顺序与字段含义。
 */
export function buildDetailSections(
  detail: ProductDetail,
  testRecords: TestRecord[],
  props: Record<string, unknown>,
  t: T,
): DetailSection[] {
  const sections: DetailSection[] = []

  if (detail.features?.length) {
    sections.push({
      key: 'overview',
      title: t('blocks.pd.highlights'),
      count: detail.features.length,
      node: <OverviewContent detail={detail} />,
    })
  }

  if (detail.summary.length) {
    const summaryTitle = t('blocks.pd.summaryTitle')
    sections.push({
      key: 'summary',
      title: summaryTitle,
      node: <SummaryContent detail={detail} t={t} sectionTitle={summaryTitle} />,
    })
  }

  const groups = groupAttributes(detail.attributes)
  if (groups.length) {
    sections.push({
      key: 'specs',
      title: t('blocks.pd.specTitle'),
      count: groups.reduce((sum, [, rows]) => sum + rows.length, 0),
      node: <SpecsContent detail={detail} t={t} />,
    })
  }

  if (testRecords.length) {
    sections.push({
      key: 'test',
      title: t('blocks.pd.testRecords'),
      count: testRecords.length,
      node: <TestRecordsContent records={testRecords} />,
    })
  }

  if (hasCompatibility(detail)) {
    sections.push({
      key: 'compatibility',
      title: t('blocks.pd.compatTitle'),
      node: <CompatibilityContent detail={detail} t={t} />,
    })
  }

  sections.push({
    key: 'downloads',
    title: t('blocks.pd.supportTitle'),
    node: <DownloadsContent t={t} />,
  })

  if (detail.detailHtml?.trim()) {
    sections.push({
      key: 'rich',
      title: t('blocks.pd.richTitle'),
      node: <RichContent html={detail.detailHtml} />,
    })
  }

  sections.push({
    key: 'buy',
    title: t('blocks.pd.buyTitle'),
    node: <BuyContent props={props} t={t} />,
  })

  return sections
}
