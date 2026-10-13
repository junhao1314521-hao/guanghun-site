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
import { asBool, asString } from './blockUtils'

export function ProductSpecsBlock({ props }: { props: Record<string, unknown> }) {
  const detail = useProductDetail()
  const [tab, setTab] = useState(0)

  if (!detail) return null

  const title = asString(props.title, '参数规格')
  const showTabs = props.showTabs === undefined ? true : asBool(props.showTabs)
  const showGuides = props.showGuides === undefined ? true : asBool(props.showGuides)
  const downloadLabel = asString(props.guideDownloadLabel, '前往下载中心')
  const contactLabel = asString(props.guideContactLabel, '提交咨询')

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
                    <th style={{ width: '30%' }}>参数</th>
                    <th>标称值</th>
                    <th>实测值</th>
                    <th>备注</th>
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
            <h2 className="empty__title">{detail.tabs[tab]} 暂无内容</h2>
            <p className="empty__desc">
              {detail.tabs[tab]}将在上线后随测试与内容排期补充；如需相关数据，可提交咨询由咨询师提供。
            </p>
            <Link className="btn btn--secondary btn--sm" to="/support#contact">
              提交咨询
            </Link>
          </div>
        )}

        {showGuides && (
          <div className="row" style={{ marginTop: 'var(--gh-space-5)', gap: 'var(--gh-space-4)', alignItems: 'stretch' }}>
            <div className="card" style={{ flex: 1, minWidth: 260 }}>
              <h3 className="card__title">下载资料</h3>
              <p className="card__desc">驱动、说明书与固件均在此获取，标注适用型号与版本。</p>
              <Link className="btn btn--secondary btn--sm" to="/support#downloads" style={{ marginTop: 'var(--gh-space-4)' }}>
                {downloadLabel}
              </Link>
            </div>
            <div className="card" style={{ flex: 1, minWidth: 260 }}>
              <h3 className="card__title">需要帮助？</h3>
              <p className="card__desc">对参数或适配有疑问，可提交咨询，由咨询师跟进。</p>
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
