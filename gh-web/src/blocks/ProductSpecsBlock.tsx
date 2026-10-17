/**
 * 产品详情 · 参数规格区块（productSpecs）。
 *
 * 渲染当前产品的「详情分区标签 + 参数规格表」（标称 / 实测 / 备注），
 * 并在末尾给出「下载资料 / 需要帮助」两个引导卡。
 *
 * props.title：规格表标题（可改）；props.showTabs：是否显示分区标签；
 * props.showGuides：是否显示底部引导卡；props.guideDownloadLabel / guideContactLabel 可改按钮文案。
 */
import { useState } from 'react'
import { SafeLink } from '../components/ui/SafeLink'
import { fetchTestRecords } from '../api/products'
import { useProductDetail } from './ProductDetailContext'
import { useApi } from '../hooks/useApi'
import { useI18n } from '../i18n'
import { asBool, asString } from './blockUtils'

/** 完整规格分组展示顺序（未列出的分组排在最后） */
const GROUP_ORDER = ['显示', '接口', '电源', '机械', '物理尺寸', '包装', '认证']

export function ProductSpecsBlock({ props }: { props: Record<string, unknown> }) {
  const { t } = useI18n()
  const detail = useProductDetail()
  const [tab, setTab] = useState(0)
  // 「测试记录」分区：按当前产品型号取后台维护的测试记录（仅在对外可见状态展示）
  const model = detail?.model ?? ''
  const { data: recordsData } = useApi((signal) => fetchTestRecords(model, signal), [model])
  const testRecords = (recordsData?.items ?? []).filter((record) => record.status === '已发布')

  if (!detail) return null

  const title = asString(props.title, t('blocks.pd.specTitle'))
  const showTabs = props.showTabs === undefined ? true : asBool(props.showTabs)
  const showGuides = props.showGuides === undefined ? true : asBool(props.showGuides)
  const downloadLabel = asString(props.guideDownloadLabel, t('blocks.pd.goDownload'))
  const contactLabel = asString(props.guideContactLabel, t('blocks.pd.submitTicket'))

  // R8.3：attributes 按 group 分组（缺省归入「其他」），按固定顺序折叠展示
  const groupedAttributes = (() => {
    const map = new Map<string, Array<{ label: string; value: string; group?: string }>>()
    for (const attr of detail.attributes ?? []) {
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
  })()

  const features = detail.features ?? []
  const hasCompatibility =
    Boolean(detail.os?.length) || detail.weight !== undefined || Boolean(detail.warranty) || Boolean(detail.inBox?.length)

  return (
    <div>
      {showTabs && (
        <div className="tabs" role="tablist" aria-label="详情分区">
          {detail.tabs.map((name, index) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={index === tab}
              className={`tab${index === tab ? ' tab--active' : ''}`}
              onClick={() => setTab(index)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="section--tight">
        {!showTabs || tab === 0 ? (
          <>
            {/* ① 核心卖点：可感知的收益，先于参数 */}
            {features.length > 0 && (
              <section className="pd-spec-section">
                <h2 className="section__title pd-spec-section__title">{t('blocks.pd.highlights')}</h2>
                <ul className="pd-feature-grid">
                  {features.map((item, index) => (
                    <li key={item}>
                      <span className="pd-feature-grid__idx">{String(index + 1).padStart(2, '0')}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ② 性能摘要：标称 / 实测并列（原 specTable 已合并进 summary） */}
            <section className="pd-spec-section">
              <h2 className="section__title pd-spec-section__title">{t('blocks.pd.summaryTitle')}</h2>
              {detail.summary.map((group) => (
                <div key={group.title} className="pd-summary">
                  <h3 className="pd-summary__title">{group.title}</h3>
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
                            <td className={row.missing ? 'missing' : 'mono'}>{row.measured ?? row.value ?? '—'}</td>
                            <td className="muted">{row.note ?? ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              <p className="field__hint">{t('blocks.pd.missingNote')}</p>
            </section>

            {/* ③ 完整规格：attributes 唯一真源，按分组折叠 */}
            {groupedAttributes.length > 0 && (
              <section className="pd-spec-section">
                <h2 className="section__title pd-spec-section__title">{title}</h2>
                <div className="pd-spec-groups">
                  {groupedAttributes.map(([group, rows], index) => (
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
              </section>
            )}

            {/* ④ 兼容与保修 */}
            {hasCompatibility && (
              <section className="pd-spec-section">
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
              </section>
            )}
          </>
        ) : detail.tabs[tab] === '测试记录' && testRecords.length > 0 ? (
          <>
            <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h4)', marginBottom: 'var(--gh-space-4)' }}>
              测试记录
            </h2>
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
                  {testRecords.map((record) => (
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
            {testRecords.some((record) => record.conclusion) && (
              <ul style={{ marginTop: 'var(--gh-space-4)', paddingLeft: 'var(--gh-space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--gh-space-2)' }}>
                {testRecords
                  .filter((record) => record.conclusion)
                  .map((record) => (
                    <li key={`${record.id}-conclusion`} className="muted" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                      {record.title}：{record.conclusion}
                    </li>
                  ))}
              </ul>
            )}
          </>
        ) : (
          <div className="empty">
            <h2 className="empty__title">{t('blocks.pd.tabEmptyTitle', { tab: detail.tabs[tab] ?? '' })}</h2>
            <p className="empty__desc">{t('blocks.pd.tabEmptyDesc', { tab: detail.tabs[tab] ?? '' })}</p>
            <SafeLink className="btn btn--secondary btn--sm" to="/inquiry">
              {t('blocks.pd.submitTicket')}
            </SafeLink>
          </div>
        )}

        {showGuides && (
          <div className="row" style={{ marginTop: 'var(--gh-space-5)', gap: 'var(--gh-space-4)', alignItems: 'stretch' }}>
            <div className="card" style={{ flex: 1, minWidth: 260 }}>
              <h3 className="card__title">{t('blocks.pd.guideDownloads')}</h3>
              <p className="card__desc">{t('blocks.pd.guideDownloadsDesc')}</p>
              <SafeLink className="btn btn--secondary btn--sm" to="/downloads" style={{ marginTop: 'var(--gh-space-4)' }}>
                {downloadLabel}
              </SafeLink>
            </div>
            <div className="card" style={{ flex: 1, minWidth: 260 }}>
              <h3 className="card__title">{t('blocks.pd.guideHelp')}</h3>
              <p className="card__desc">{t('blocks.pd.guideHelpDesc')}</p>
              <SafeLink className="btn btn--primary btn--sm" to="/inquiry" style={{ marginTop: 'var(--gh-space-4)' }}>
                {contactLabel}
              </SafeLink>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
