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
import { Link } from 'react-router-dom'
import { useProductDetail } from './ProductDetailContext'
import { useI18n } from '../i18n'
import { asBool, asString } from './blockUtils'

export function ProductSpecsBlock({ props }: { props: Record<string, unknown> }) {
  const { t } = useI18n()
  const detail = useProductDetail()
  const [tab, setTab] = useState(0)

  if (!detail) return null

  const title = asString(props.title, t('blocks.pd.specTitle'))
  const showTabs = props.showTabs === undefined ? true : asBool(props.showTabs)
  const showGuides = props.showGuides === undefined ? true : asBool(props.showGuides)
  const downloadLabel = asString(props.guideDownloadLabel, t('blocks.pd.goDownload'))
  const contactLabel = asString(props.guideContactLabel, t('blocks.pd.submitTicket'))

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
            {title && (
              <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h4)', marginBottom: 'var(--gh-space-4)' }}>
                {title}
              </h2>
            )}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>{t('blocks.pd.colParam')}</th>
                    <th>{t('blocks.pd.colNominal')}</th>
                    <th>{t('blocks.pd.colMeasured')}</th>
                    <th>{t('blocks.pd.colNote')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.specTable.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td className="mono">{row.nominal}</td>
                      <td className={row.missing ? 'missing' : 'mono'}>{row.measured}</td>
                      <td className="muted">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="empty">
            <h2 className="empty__title">{t('blocks.pd.tabEmptyTitle', { tab: detail.tabs[tab] ?? '' })}</h2>
            <p className="empty__desc">{t('blocks.pd.tabEmptyDesc', { tab: detail.tabs[tab] ?? '' })}</p>
            <Link className="btn btn--secondary btn--sm" to="/support#contact">
              {t('blocks.pd.submitTicket')}
            </Link>
          </div>
        )}

        {showGuides && (
          <div className="row" style={{ marginTop: 'var(--gh-space-5)', gap: 'var(--gh-space-4)', alignItems: 'stretch' }}>
            <div className="card" style={{ flex: 1, minWidth: 260 }}>
              <h3 className="card__title">{t('blocks.pd.guideDownloads')}</h3>
              <p className="card__desc">{t('blocks.pd.guideDownloadsDesc')}</p>
              <Link className="btn btn--secondary btn--sm" to="/support#downloads" style={{ marginTop: 'var(--gh-space-4)' }}>
                {downloadLabel}
              </Link>
            </div>
            <div className="card" style={{ flex: 1, minWidth: 260 }}>
              <h3 className="card__title">{t('blocks.pd.guideHelp')}</h3>
              <p className="card__desc">{t('blocks.pd.guideHelpDesc')}</p>
              <Link className="btn btn--primary btn--sm" to="/support#contact" style={{ marginTop: 'var(--gh-space-4)' }}>
                {contactLabel}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
