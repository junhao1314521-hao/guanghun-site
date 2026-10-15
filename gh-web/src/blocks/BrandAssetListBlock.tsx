/**
 * 29. brandAssetList 品牌资料（B 端数据源区块）。
 *
 * props：标题组（title / subtitle / ctaLabel / ctaHref）+ category（'all' 或 规范 / Logo / 图片 / 送测）+ limit。
 * 不存内容：渲染时调用 `/api/business/brand-assets` 取数（独立集合 brand-assets，与 C 端下载中心数据分开）。
 * 控件沿用下载中心同款观感（卡片 + 分类标签 + 元信息 + 按钮）。
 *
 * requireLead（需留资 / 申请授权）处理：**采用「明确提示 + 跳 /inquiry」方案**——
 * 不新造一套表单，点击直接给出留资提示并引导到既有「提交咨询」页（channel='business' 共用工单系统）。
 */
import { useState } from 'react'
import { SafeLink } from '../components/ui/SafeLink'
import { fetchBrandAssets } from '../api/business-extra'
import { useApi } from '../hooks/useApi'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { asNumber, asString } from './blockUtils'

export function BrandAssetListBlock({ props }: { props: Record<string, unknown> }) {
  const category = asString(props.category, 'all')
  const limit = Math.max(0, asNumber(props.limit, 0))
  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error } = useApi((signal) => fetchBrandAssets(signal), [reloadKey])

  const all = data?.items ?? []
  const filtered = category && category !== 'all' ? all.filter((item) => item.category === category) : all
  const shown = limit > 0 ? filtered.slice(0, limit) : filtered

  return (
    <div>
      <SectionHeadFromProps props={props} />
      {error ? (
        <div className="empty">
          <div className="empty__title">品牌资料加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            重新加载
          </button>
        </div>
      ) : loading ? (
        <div className="grid-3" aria-busy="true" aria-label="品牌资料加载中">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="card" key={index}>
              <span className="skeleton" style={{ display: 'block', height: 18, width: '40%' }} />
              <div className="skeleton" style={{ height: 18, width: '80%', marginTop: 'var(--gh-space-4)' }} />
              <div className="skeleton" style={{ height: 14, width: '60%', marginTop: 'var(--gh-space-3)' }} />
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="section__desc" style={{ padding: 'var(--gh-space-6) 0' }}>
          暂无可展示的品牌资料。
        </p>
      ) : (
        <div className="grid-3">
          {shown.map((item) => (
            <div className="card reveal" key={item.id}>
              <span className="tag">{item.category}</span>
              <h3 className="card__title" style={{ marginTop: 'var(--gh-space-3)' }}>
                {item.name}
              </h3>
              <p className="card__desc">{item.desc}</p>
              <div className="card--link__foot">
                <span className="muted mono" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                  {item.format} · {item.size} · {item.date}
                </span>
              </div>
              <div className="row" style={{ marginTop: 'var(--gh-space-4)' }}>
                {item.requireLead ? (
                  // 需留资 / 申请授权：给出明确提示 + 跳既有「提交咨询」页（不新造表单）
                  <SafeLink className="btn btn--sm btn--secondary" to="/inquiry" title="该资料需留资 / 授权后提供">
                    申请下载
                  </SafeLink>
                ) : item.fileUrl ? (
                  <a className="btn btn--sm btn--primary" href={item.fileUrl} download rel="noreferrer">
                    下载
                  </a>
                ) : (
                  <span className="btn btn--sm btn--ghost" role="note" title="该资料尚未上传文件" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                    暂不可下载
                  </span>
                )}
              </div>
              {item.requireLead && (
                <p className="field__hint" style={{ marginTop: 'var(--gh-space-2)' }}>
                  该资料需留资 / 授权后提供，点击「申请下载」提交咨询即可。
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
