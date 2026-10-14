/**
 * 26. methodList 测评方法（数据源区块，集合 methods）
 *
 * props: title / limit（0 = 全部）
 *
 * 不存内容：渲染时调用 `/api/methods` 取数，仅展示「已发布」的方法。
 * 数据由后台「测评方法」栏目维护，改动即时反映到前台。
 */
import { useState } from 'react'
import { fetchMethods } from '../api/ladder'
import { useApi } from '../hooks/useApi'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { asNumber } from './blockUtils'

export function MethodListBlock({ props }: { props: Record<string, unknown> }) {
  const limit = Math.max(0, asNumber(props.limit, 0))
  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error } = useApi((signal) => fetchMethods(signal), [reloadKey])

  const items = (data?.items ?? []).filter((method) => method.status === '已发布')
  const shown = limit > 0 ? items.slice(0, limit) : items

  return (
    <div>
      <SectionHeadFromProps props={props} />
      {error ? (
        <div className="empty">
          <div className="empty__title">测评方法加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            重新加载
          </button>
        </div>
      ) : loading ? (
        <div className="grid-3" aria-busy="true" aria-label="测评方法加载中">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="card" key={index}>
              <div className="skeleton" style={{ height: 14, width: '32%' }} />
              <div className="skeleton" style={{ height: 18, width: '70%', marginTop: 'var(--gh-space-3)' }} />
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="section__desc" style={{ padding: 'var(--gh-space-6) 0' }}>
          暂无公开的测评方法。
        </p>
      ) : (
        <div className="grid-3">
          {shown.map((method) => (
            <div className="card" key={method.id}>
              <span className="tag">{method.category}</span>
              <h3 className="card__title">{method.name}</h3>
              <p className="card__desc">{method.detail}</p>
              <div className="card--link__foot">
                <span className="muted mono" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                  {method.version}
                </span>
                <span className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                  {method.owner}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
