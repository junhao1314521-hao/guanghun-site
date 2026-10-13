import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchSearchResults } from '../api/search'
import { DemoToast, useDemoToast } from '../components/ui/DemoToast'
import { IconSearch } from '../components/ui/Icon'
import { HOT_QUERIES, SEARCH_KINDS, SEARCH_SORTS, highlight, type SearchKind } from '../data/search'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

function renderHighlight(text: string, query: string) {
  return highlight(text, query).map((part, index) =>
    part.hit ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>,
  )
}

/** 搜索结果加载骨架：保持与真实结果一致的行结构，避免数据到位时布局跳动 */
function ResultSkeleton() {
  return (
    <div className="card" aria-busy="true" aria-label="搜索结果加载中" style={{ padding: 'var(--gh-space-3) var(--gh-space-5)' }}>
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="sresult" key={index}>
          <span className="sresult__kind">
            <span className="skeleton" style={{ display: 'inline-block', width: 48, height: 20 }} />
          </span>
          <div>
            <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 'var(--gh-space-2)' }} />
            <div className="skeleton" style={{ height: 12, width: '90%', marginBottom: 'var(--gh-space-2)' }} />
            <div className="skeleton" style={{ height: 12, width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** 全站搜索（一级页面 · 骨架层）：一次检索产品、文章、天梯榜与支持资料 */
export function SearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const query = params.get('q') ?? ''

  const rootRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState(query)
  const [kind, setKind] = useState<'全部' | SearchKind>('全部')
  const [sort, setSort] = useState(SEARCH_SORTS[0])
  const [reloadKey, setReloadKey] = useState(0)
  const { action, notify, dismiss } = useDemoToast()

  const { data, loading, error } = useApi((signal) => fetchSearchResults(query, signal), [query, reloadKey])
  const counts = data?.counts

  // refreshKey：关键词或结果集变化后重跑页面级动效（数据到位后 DOM 才出现）
  const readyKey = `${query}:${reloadKey}:${loading ? 'loading' : 'ready'}:${kind}:${sort}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  const q = query.trim().toLowerCase()
  const matched = (data?.items ?? []).filter((result) => {
    if (kind !== '全部' && result.kind !== kind) return false
    if (!q) return true
    const haystack = `${result.title.join('')} ${result.desc} ${result.source}`.toLowerCase()
    return haystack.includes(q)
  })
  const sorted = sort === '最新' ? [...matched].sort((a, b) => b.date.localeCompare(a.date)) : matched
  const totalLabel = q || kind !== '全部' ? sorted.length : (counts?.['全部'] ?? sorted.length)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next = draft.trim()
    navigate(next ? `/search?q=${encodeURIComponent(next)}` : '/search')
  }

  const pickHot = (word: string) => {
    setDraft(word)
    navigate(`/search?q=${encodeURIComponent(word)}`)
  }

  return (
    <div ref={rootRef}>
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <span>全站搜索</span>
        </nav>

        <div className="section__head" style={{ marginTop: 'var(--gh-space-4)', marginBottom: 'var(--gh-space-4)' }}>
          <div>
            <h1 className="section__title">全站搜索</h1>
            <p className="section__desc">一次检索产品、文章、天梯榜与支持资料，结果按相关度排序；关键词高亮显示。</p>
          </div>
        </div>

        <form className="row" role="search" style={{ gap: 'var(--gh-space-3)', maxWidth: 680 }} onSubmit={submit}>
          <div className="search" style={{ flex: '1 1 260px' }}>
            <span className="search__icon" aria-hidden="true">
              <IconSearch size={16} />
            </span>
            <label className="sr-only" htmlFor="pageSearch">
              全站搜索
            </label>
            <input
              className="input"
              id="pageSearch"
              type="search"
              placeholder="输入型号或关键词，如 GH-M900 PRO、延迟、保修"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
          <button className="btn btn--primary" type="submit">
            搜索
          </button>
        </form>

        {/* 结果摘要 + 类型筛选 */}
        <div className="row" style={{ justifyContent: 'space-between', gap: 'var(--gh-space-4)', marginTop: 'var(--gh-space-5)', flexWrap: 'wrap' }}>
          <p className="section__desc" style={{ margin: 0, fontSize: 'var(--gh-font-size-body-sm)' }}>
            搜索 <b>{query || '全部内容'}</b> ·{' '}
            {loading && !data ? '正在检索…' : (
              <>
                共 {totalLabel} 条结果
              </>
            )}
          </p>
          <div className="segmented" role="group" aria-label="排序方式">
            {SEARCH_SORTS.map((option) => (
              <button
                key={option}
                type="button"
                className={option === sort ? 'is-active' : undefined}
                aria-pressed={option === sort}
                onClick={() => setSort(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="row" style={{ gap: 'var(--gh-space-2)', marginTop: 'var(--gh-space-4)', flexWrap: 'wrap' }}>
          {SEARCH_KINDS.map((option) => (
            <button
              key={option}
              className={`chip${option === kind ? ' is-active' : ''}`}
              type="button"
              aria-pressed={option === kind}
              onClick={() => setKind(option)}
            >
              {option} {counts?.[option] !== undefined && <span style={{ color: 'var(--color-text-tertiary)' }}>{counts[option]}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* 结果列表 */}
      <div className="container" style={{ paddingBottom: 'var(--gh-space-8)' }}>
        {error ? (
          <div className="empty">
            <span className="empty__icon" aria-hidden="true">
              <IconSearch size={32} />
            </span>
            <span className="empty__title">检索失败</span>
            <p className="empty__desc">{error.message}。请检查网络后重试。</p>
            <button className="btn btn--secondary" type="button" onClick={() => setReloadKey((key) => key + 1)}>
              重新检索
            </button>
          </div>
        ) : loading && !data ? (
          <ResultSkeleton />
        ) : sorted.length > 0 ? (
          <>
            <div className="card" style={{ padding: 'var(--gh-space-3) var(--gh-space-5)' }}>
              {sorted.map((result) => (
                <Link className="sresult" key={result.id} to={result.to}>
                  <span className="sresult__kind">
                    <span className={`tag${result.kind === '产品' ? ' tag--accent' : ''}`}>{result.kind}</span>
                  </span>
                  <div>
                    <h3 className="sresult__title">
                      {result.title.map((fragment, index) => (
                        <span key={index}>{renderHighlight(fragment, query)}</span>
                      ))}
                    </h3>
                    <p className="sresult__desc">{result.desc}</p>
                    <div className="sresult__meta">
                      <span>{result.source}</span>
                      <span>{result.date}</span>
                    </div>
                  </div>
                  <span className="sresult__go" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>

            {/* 分页 */}
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 'var(--gh-space-6)' }}>
              <span className="section__desc" style={{ margin: 0, fontSize: 'var(--gh-font-size-body-sm)' }}>
                第 1 / 12 页
              </span>
              <div className="pagination" role="navigation" aria-label="分页">
                <button type="button" aria-label="上一页" disabled>
                  ‹
                </button>
                <button type="button" className="is-active" onClick={() => notify('分页')}>
                  1
                </button>
                <button type="button" onClick={() => notify('分页')}>
                  2
                </button>
                <button type="button" onClick={() => notify('分页')}>
                  3
                </button>
                <button type="button" aria-label="下一页" onClick={() => notify('分页')}>
                  ›
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty">
            <span className="empty__icon" aria-hidden="true">
              <IconSearch size={32} />
            </span>
            <span className="empty__title">没有找到匹配的结果</span>
            <p className="empty__desc">试试更短的关键词、型号前缀，或从下方热门词条选择；也可以直接提交咨询由人工协助。</p>
            <Link className="btn btn--secondary" to="/support#contact">
              提交咨询
            </Link>
          </div>
        )}
      </div>

      {/* 热门搜索 */}
      <div className="container section--tight" style={{ paddingBottom: 'var(--gh-space-9)' }}>
        <div className="section__head">
          <div>
            <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h4)' }}>
              热门搜索
            </h2>
            <p className="section__desc">近期检索量最高的词条。</p>
          </div>
        </div>
        <div className="row" style={{ gap: 'var(--gh-space-2)', flexWrap: 'wrap' }}>
          {HOT_QUERIES.map((word) => (
            <button className="chip" key={word} type="button" onClick={() => pickHot(word)}>
              {word}
            </button>
          ))}
        </div>
      </div>

      <DemoToast action={action} onDismiss={dismiss} />
    </div>
  )
}
