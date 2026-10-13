/**
 * 14. faqList 问答（数据源区块，契约 §4 / §8）
 * props: title / source:'support'|'center' / limit:number
 *        / showFilter?:boolean（可选交互开关）
 *
 * 不存内容：渲染时调用既有接口取数——source=support 走常见问题接口（带详情链接），
 * source=center 走 Center 软件接口的常见问题。复用既有 .qa-list 折叠问答形态。
 *
 * 当 `showFilter` 开启（列表页由 PageView 注入）时，在区块内保留原常见问题页的
 * 类别筛选（含 URL `?category=` 深链）与空态，避免装修化后交互能力回退。
 */
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchCenter, type CenterPayload } from '../api/center'
import { fetchFaqs, type FaqPayload } from '../api/support-extra'
import { useApi } from '../hooks/useApi'
import { IconChevronDown } from '../components/ui/Icon'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { useI18n } from '../i18n'
import { asBool, asNumber, asString, asStringArray, pickByIds } from './blockUtils'

type QaRow = { id?: string; q: string; a: string; category?: string }

/** 受控的单选筛选 chip 组：驱动问答类别的过滤 */
function FilterChips({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (option: string) => void
}) {
  return (
    <div className="row">
      <span className="muted" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
        类别
      </span>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`chip${option === value ? ' is-active' : ''}`}
          aria-pressed={option === value}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

export function FaqListBlock({ props }: { props: Record<string, unknown> }) {
  const { t } = useI18n()
  const source = asString(props.source, 'support')
  const scope = asString(props.scope, 'all') // all | manual（手动挑选具体几条）
  const manualIds = asStringArray(props.ids)
  const limit = Math.max(0, asNumber(props.limit, 10))
  const showFilter = asBool(props.showFilter)
  const [reloadKey, setReloadKey] = useState(0)
  const [params, setParams] = useSearchParams()

  const isCenter = source === 'center'
  // 联合返回类型需显式标注，避免 useApi 泛型推断到单一分支
  const { data, loading, error } = useApi<CenterPayload | FaqPayload>(
    (signal) => (isCenter ? fetchCenter(signal) : fetchFaqs(signal)),
    [source, reloadKey],
  )

  const rows: QaRow[] = isCenter
    ? ((data as CenterPayload | null)?.CENTER_FAQS ?? []).map((item) => ({ q: item.q, a: item.a }))
    : ((data as FaqPayload | null)?.items ?? []).map((item) => ({ id: item.id, q: item.q, a: item.a, category: item.category }))

  // Center 问答无类别字段，故类别筛选仅在 support 来源的列表页开启
  const canFilter = showFilter && !isCenter
  const active = canFilter ? (params.get('category') ?? '全部') : '全部'
  const selectCategory = (option: string) => {
    if (!canFilter) return
    const next = new URLSearchParams(params)
    if (option === '全部') next.delete('category')
    else next.set('category', option)
    setParams(next, { replace: true })
  }

  // 手动挑选：scope=manual 时按 ids 顺序挑选（support 来源有条目 id；Center 无 id 则原样返回）
  const pickedRows = pickByIds(rows, scope, manualIds)
  const filtered = canFilter && active !== '全部' ? pickedRows.filter((item) => item.category === active) : pickedRows
  const shown = limit > 0 ? filtered.slice(0, limit) : filtered

  return (
    <div>
      <SectionHeadFromProps
        props={props}
        action={
          <Link className="btn btn--ghost btn--sm" to="/faq">
            {t('blocks.allFaq')} →
          </Link>
        }
      />
      {error ? (
        <div className="empty">
          <div className="empty__title">常见问题加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            重新加载
          </button>
        </div>
      ) : loading ? (
        <div className="qa-list" aria-busy="true" aria-label="常见问题加载中">
          {Array.from({ length: Math.min(limit || 5, 6) }).map((_, index) => (
            <div key={index} style={{ padding: 'var(--gh-space-4) var(--gh-space-5)' }}>
              <span className="skeleton" style={{ display: 'block', height: 16, width: '60%' }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* 类别筛选（仅列表页开启）：与原常见问题页一致，筛选值写入 URL 便于分享 */}
          {canFilter && (
            <div className="row" style={{ gap: 'var(--gh-space-5)', marginBottom: 'var(--gh-space-5)' }}>
              <FilterChips options={(data as FaqPayload | null)?.categories ?? []} value={active} onChange={selectCategory} />
              <span className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                共 {filtered.length} 条
              </span>
            </div>
          )}

          {shown.length === 0 ? (
            canFilter ? (
              <div className="empty">
                <div className="empty__title">该类别下暂无问答</div>
                <p className="empty__desc">试试切换其他类别，或提交咨询由咨询师跟进。</p>
                <div className="row" style={{ justifyContent: 'center' }}>
                  <button className="btn btn--secondary btn--sm" type="button" onClick={() => selectCategory('全部')}>
                    查看全部问答
                  </button>
                  <Link className="btn btn--secondary btn--sm" to="/inquiry">
                    提交咨询
                  </Link>
                </div>
              </div>
            ) : (
              <p className="section__desc" style={{ padding: 'var(--gh-space-6) 0' }}>
                暂无可展示的问答。
              </p>
            )
          ) : (
            <div className="qa-list reveal">
              {shown.map((item, index) => (
                <details key={item.id ?? `${item.q}-${index}`}>
                  <summary>
                    {item.q}
                    <IconChevronDown size={16} />
                  </summary>
                  <div className="qa-list__answer">
                    {item.a}
                    {item.id && (
                      <div className="row" style={{ marginTop: 'var(--gh-space-3)' }}>
                        <Link className="btn btn--ghost btn--sm" to={`/faq/${item.id}`}>
                          查看详情 →
                        </Link>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}