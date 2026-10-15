/**
 * 24. caseList 合作案例（数据源区块，集合 biz-cases）
 *
 * props: title / subtitle / ctaLabel / ctaHref（标题组）
 *        + scope:'all'|'manual'（手动挑选按 ids 顺序）+ ids[]
 *        + layout:'grid'|'rail' + columns + limit + showMeta
 *
 * 不存内容：渲染时调用 `/api/business/cases` 取数，三态与既有约定一致。
 * 复用 .card / .ph-box 既有形态，与商业合作栏目保持一致。
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBizCases } from '../api/business-extra'
import { useApi } from '../hooks/useApi'
import { useSitePages } from '../hooks/useSitePages'
import { MediaImg } from '../components/ui/MediaImg'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { BlockPager, useBlockPager } from './BlockPager'
import { asBool, asNumber, asString, asStringArray, gridClass, pickByIds } from './blockUtils'

export function CaseListBlock({ props }: { props: Record<string, unknown> }) {
  const scope = asString(props.scope, 'all')
  const ids = asStringArray(props.ids)
  const limit = Math.max(0, asNumber(props.limit, 6))
  const columns = asNumber(props.columns, 3)
  const rail = asString(props.layout, 'grid') === 'rail'
  const showMeta = props.showMeta === undefined ? true : asBool(props.showMeta)
  const { isHrefLive } = useSitePages()
  const [reloadKey, setReloadKey] = useState(0)

  const { data, loading, error } = useApi((signal) => fetchBizCases(signal), [reloadKey])
  const picked = pickByIds(data?.items ?? [], scope, ids)
  const capped = limit > 0 ? picked.slice(0, limit) : picked
  // pageSize > 0 时启用分页（列表页），否则沿用 limit 截断（首页等策展区块）
  const pageSize = Math.max(0, asNumber(props.pageSize, 0))
  const { page, setPage, totalPages } = useBlockPager(capped.length, pageSize || 1, `${scope}|${ids.join(',')}`)
  const shown = pageSize > 0 ? capped.slice((page - 1) * pageSize, page * pageSize) : capped

  return (
    <div>
      <SectionHeadFromProps props={props} />
      {error ? (
        <div className="empty">
          <div className="empty__title">合作案例加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            重新加载
          </button>
        </div>
      ) : loading ? (
        <div className="grid-3" aria-busy="true" aria-label="合作案例加载中">
          {Array.from({ length: Math.min(limit || 3, 6) }).map((_, index) => (
            <div className="card" key={index}>
              <span className="skeleton" style={{ display: 'block', aspectRatio: '16 / 9', borderRadius: 'var(--gh-radius-md)' }} />
              <div className="skeleton" style={{ height: 18, width: '70%', marginTop: 'var(--gh-space-4)' }} />
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="section__desc" style={{ padding: 'var(--gh-space-6) 0' }}>
          暂无可展示的合作案例。
        </p>
      ) : (
        <div className={rail ? 'blk-scroll-x' : gridClass(columns)}>
          {shown.map((item) => {
            const to = `/business/cases/${item.id}`
            // 下线级联：详情页已停用时卡片退化为不可点内容（保留内容）
            const live = isHrefLive(to)
            const body = (
              <>
                <div className="ph-box ph-box--media" style={{ aspectRatio: '16 / 9' }}>
                  <MediaImg src={item.cover} alt={item.title} />
                </div>
                <span className="tag">{item.category}</span>
                <h3 className="card__title">{item.title}</h3>
                <p className="card__desc">{item.summary}</p>
                {showMeta && (
                  <div className="card--link__foot">
                    <span className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                      {item.partner}
                    </span>
                    <span className="muted mono" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                      {item.year}
                    </span>
                  </div>
                )}
              </>
            )
            return live ? (
              <Link className="card card--link reveal" to={to} key={item.id}>
                {body}
              </Link>
            ) : (
              <div className="card reveal" key={item.id}>
                {body}
              </div>
            )
          })}
        </div>
      )}
      {pageSize > 0 && <BlockPager page={page} totalPages={totalPages} onChange={setPage} />}
    </div>
  )
}
