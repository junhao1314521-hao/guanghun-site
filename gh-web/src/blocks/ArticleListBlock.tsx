/**
 * 11. articleList 文章（数据源区块，契约 §4 / §8）
 * props: title / source:'all'|'review'|'tech'|'method'|'news' / limit:number
 *        / showFilter?:boolean（可选交互开关）
 *
 * 不存内容：渲染时调用既有结构化接口取数（文章 / 新闻）。source=news 走新闻接口并
 * 以既有 news-list 行形态渲染；其余走文章接口并复用文章卡片网格。
 *
 * 当 `showFilter` 开启（列表页由 PageView 注入）时，在区块内保留原文章列表页的
 * 分类筛选（含 URL `?category=` 深链），避免装修化后交互能力回退。
 */
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchArticles, fetchNews, fetchTaxonomy } from '../api/articles'
import {
  CATEGORY_FILTERS,
  CATEGORY_LABEL_BY_CODE,
  articleCoverSrc,
  type ArticleSummary,
  type NewsItem,
} from '../data/articles'
import { useApi } from '../hooks/useApi'
import { MediaImg } from '../components/ui/MediaImg'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { BlockPager, useBlockPager } from './BlockPager'
import { asBool, asNumber, asString, asStringArray, pickByIds } from './blockUtils'

/** source → 文章分类标签（“全部”返回空串，不参与过滤） */
const SOURCE_LABEL: Record<string, string> = {
  all: '',
  review: '评测',
  tech: '教程',
  method: '行业观察',
}

/** URL `?category=` → 中文分类名：既接受语义码（review/guide/…）也接受中文名 */
function categoryFromParam(param: string): string {
  const label = (CATEGORY_LABEL_BY_CODE as Record<string, string>)[param]
  return label ?? (CATEGORY_FILTERS.includes(param) ? param : '全部')
}

/** 中文分类名 → 语义码（写回 URL 用） */
function codeFromLabel(label: string): string | undefined {
  return Object.entries(CATEGORY_LABEL_BY_CODE).find(([, value]) => value === label)?.[0]
}

/** 文章卡片网格 / 横滑（对齐文章列表页既有卡片形态；rail 时横向滚动） */
function ArticleCards({ items, rail }: { items: ArticleSummary[]; rail?: boolean }) {
  return (
    <div className={rail ? 'blk-scroll-x' : 'grid-3'}>
      {items.map((item) => (
        <Link className="card card--link reveal" to={`/articles/${item.id}`} key={item.id}>
          <div className="ph-box ph-box--media" style={{ aspectRatio: '16 / 9' }}>
            <MediaImg src={articleCoverSrc(item.cover, item.coverImage)} alt={item.title} />
          </div>
          <div className="row" style={{ gap: 'var(--gh-space-2)', flexWrap: 'wrap' }}>
            {(item.tags?.length ? item.tags : [item.tag]).map((label, index) => (
              <span className={`tag${item.accent && index === 0 ? ' tag--accent' : ''}`} key={label}>
                {label}
              </span>
            ))}
          </div>
          <h3 className="card__title">{item.title}</h3>
          <p className="card__desc">{item.desc}</p>
          <div className="card--link__foot">
            <span className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
              {item.author}
            </span>
            <span className="muted mono" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
              {item.date} · {item.readingMin} 分钟阅读
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}

/** 新闻行列表（对齐新闻中心的既有 news-list 行形态） */
function NewsRows({ items }: { items: NewsItem[] }) {
  return (
    <div className="news-list reveal">
      {items.map((item) => (
        <Link className="news-row" to={item.href ?? '/articles'} key={`${item.date}-${item.title}`}>
          <span className="news-row__date">{item.date}</span>
          <span className="tag">{item.tag}</span>
          <span className="news-row__title">{item.title}</span>
          <span className="news-row__go" aria-hidden="true">
            →
          </span>
        </Link>
      ))}
    </div>
  )
}

export function ArticleListBlock({ props }: { props: Record<string, unknown> }) {
  const source = asString(props.source, 'all')
  const scope = asString(props.scope, 'all') // all | manual（手动挑选具体几篇）
  const manualIds = asStringArray(props.ids)
  const limit = Math.max(0, asNumber(props.limit, 6))
  const showFilter = asBool(props.showFilter)
  // 呈现方式：网格 / 横向滑动（仅文章卡片模式生效；新闻行列表不受影响）
  const rail = asString(props.layout, 'grid') === 'rail'
  const [reloadKey, setReloadKey] = useState(0)
  const [params, setParams] = useSearchParams()
  const [localCategory, setLocalCategory] = useState('全部')

  const isNews = source === 'news'
  // 联合返回类型需显式标注，避免 useApi 泛型推断到单一分支
  const { data, loading, error } = useApi<{ items: ArticleSummary[] | NewsItem[] }>(
    (signal) => (isNews ? fetchNews(signal) : fetchArticles(signal)),
    [source, reloadKey],
  )
  // 分类筛选 chip 由后台「分类与标签」维护（离线回退本地枚举）
  const { data: taxonomy } = useApi((signal) => fetchTaxonomy(signal), [])
  const categoryOptions = [
    '全部',
    ...(taxonomy
      ? taxonomy.items.filter((item) => item.type === '分类' && item.status === '启用').map((item) => item.name)
      : CATEGORY_FILTERS.filter((name) => name !== '全部')),
  ]

  // 文章模式仅展示「已发布」的内容（新闻条目无 status，原样保留）
  const rawItems = data?.items ?? []
  const items = isNews ? rawItems : (rawItems as ArticleSummary[]).filter((item) => !item.status || item.status === '已发布')
  const label = SOURCE_LABEL[source] ?? ''
  const bySource = !isNews && label ? (items as ArticleSummary[]).filter((item) => item.categoryLabel === label) : items
  // 手动挑选：仅在文章模式生效（新闻条目无 id），按 ids 顺序挑选
  const picked = !isNews ? pickByIds(bySource as ArticleSummary[], scope, manualIds) : bySource

  // 列表页（showFilter）：分类筛选由 URL `?category=` 驱动，便于从导航深链直达；否则区块不参与筛选
  const canFilter = showFilter && !isNews
  const active = canFilter ? categoryFromParam(params.get('category') ?? '') : localCategory
  const selectCategory = (option: string) => {
    if (!canFilter) {
      setLocalCategory(option)
      return
    }
    const next = new URLSearchParams(params)
    if (option === '全部') next.delete('category')
    else next.set('category', codeFromLabel(option) ?? option)
    setParams(next, { replace: true })
  }

  const filtered =
    canFilter && active !== '全部'
      ? (picked as ArticleSummary[]).filter((item) => item.categoryLabel === active)
      : picked
  const capped = limit > 0 ? filtered.slice(0, limit) : filtered
  // pageSize > 0 时启用分页（列表页），否则沿用 limit 截断（首页等策展区块）
  const pageSize = Math.max(0, asNumber(props.pageSize, 0))
  const { page, setPage, totalPages } = useBlockPager(capped.length, pageSize || 1, `${source}|${active}`)
  const paged = pageSize > 0 ? capped.slice((page - 1) * pageSize, page * pageSize) : capped

  return (
    <div>
      <SectionHeadFromProps props={props} />
      {error ? (
        <div className="empty">
          <div className="empty__title">文章加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            重新加载
          </button>
        </div>
      ) : loading ? (
        <div className="grid-3" aria-busy="true" aria-label="文章加载中">
          {Array.from({ length: Math.min(limit || 3, 6) }).map((_, index) => (
            <div className="card" key={index}>
              <span className="skeleton" style={{ display: 'block', aspectRatio: '16 / 9', borderRadius: 'var(--gh-radius-md)' }} />
              <div className="skeleton" style={{ height: 14, width: '32%', marginTop: 'var(--gh-space-4)' }} />
              <div className="skeleton" style={{ height: 18, width: '85%', marginTop: 'var(--gh-space-2)' }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* 分类筛选（仅列表页开启）：与原文章列表页一致，筛选值写入 URL 便于分享 */}
          {canFilter && (
            <div className="row" style={{ gap: 'var(--gh-space-2)', marginBottom: 'var(--gh-space-5)' }}>
              <span className="muted" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                分类
              </span>
              {categoryOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`chip${active === option ? ' is-active' : ''}`}
                  aria-pressed={active === option}
                  onClick={() => selectCategory(option)}
                >
                  {option}
                </button>
              ))}
              <span className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                共 {filtered.length} 篇
              </span>
            </div>
          )}

          {paged.length === 0 ? (
            canFilter ? (
              <div className="empty">
                <div className="empty__title">没有符合条件的文章</div>
                <p className="empty__desc">试试切换到其他分类，或查看全部文章。</p>
                <button className="btn btn--secondary btn--sm" type="button" onClick={() => selectCategory('全部')}>
                  查看全部
                </button>
              </div>
            ) : (
              <p className="section__desc" style={{ padding: 'var(--gh-space-6) 0' }}>
                暂无可展示的文章。
              </p>
            )
          ) : isNews ? (
            <NewsRows items={paged as NewsItem[]} />
          ) : (
            <ArticleCards items={paged as ArticleSummary[]} rail={rail} />
          )}
          {pageSize > 0 && <BlockPager page={page} totalPages={totalPages} onChange={setPage} />}
        </>
      )}
    </div>
  )
}