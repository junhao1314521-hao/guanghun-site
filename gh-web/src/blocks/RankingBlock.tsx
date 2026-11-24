/**
 * 12. ranking 榜单（数据源区块，契约 §4 / §8）
 * props: title / metric:'overall'|'sensor'|'battery'|'latency' / limit:number
 *        / showFilter?:boolean（可选交互开关）/ teaser?:boolean（首页只展示局部榜单）
 *
 * 不存内容：渲染时调用既有天梯榜接口取数（与榜单页共用同一份 rankings 集合），
 * 复用既有 .ladder 榜单行形态。历史数据里的 weight / dpi 无对应指标，回退综合榜（overall）。
 *
 * 当 `showFilter` 开启（列表页由 PageView 注入）时，在区块内保留原天梯榜页的
 * 指标切换（含 URL `?metric=` 深链）、品牌筛选（`?brand=`）与范围内名次重算；
 * 列表页默认只渲染前 50 条，底部羽化并给出「展开全部」入口（展开状态不写 URL）；
 * 输入型号时改为过滤全量数据，避免被截断挡住；首页 teaser 仍按 limit 截断。
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SafeLink } from '../components/ui/SafeLink'
import { useSitePages } from '../hooks/useSitePages'
import { fetchLadder } from '../api/ladder'
import { fillWidth, formatScore, type LadderMetric, type LadderRow } from '../data/ladder'
import { MEDIA } from '../data/media'
import { useApi } from '../hooks/useApi'
import { useLadderFill } from '../hooks/useLadderFill'
import { MediaImg } from '../components/ui/MediaImg'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { useI18n } from '../i18n'
import { asBool, asNumber, asString } from './blockUtils'

/** 列表页默认展示条数：超出的部分由底部「展开全部」按需渲染 */
const LIST_PAGE_LIMIT = 50

/** 契约指标 → 测试数据的指标 id（与榜单页同一份 rankings 集合） */
const METRIC_ALIAS: Record<string, string> = {
  overall: 'overall',
  contrast: 'contrast',
  gamut: 'gamut',
  brightness: 'brightness',
  uniformity: 'uniformity',
  hdr: 'hdr',
  motion: 'motion',
  // 历史数据兼容：无对应指标时回退综合榜
  sensor: 'uniformity',
  latency: 'motion',
  battery: 'brightness',
  weight: 'overall',
  dpi: 'overall',
}

/** 按当前范围重算名次：范围筛选后按展示顺序重新编号（对比度 ∞ 参与排名） */
function rankWithinScope(rows: LadderRow[]): { row: LadderRow; rank: string; tied: boolean }[] {
  return rows.map((row, index) => ({ row, rank: String(index + 1).padStart(2, '0'), tied: false }))
}

/** 行缩略图：后台配的型号图优先，其次关联产品封面，最后交给 MediaImg 的占位兜底 */
function rowThumb(row: LadderRow): string {
  return row.imageUrl || (row.productId ? MEDIA.product[row.productId] ?? '' : '')
}

/**
 * 榜单缩略图：有真实图（后台配置或产品封面）就显示图片；
 * 没有素材时用「品牌首字 + 品牌名」的深色铭牌兜底，避免出现空白 / 动画占位块。
 * 真实图片由后台「天梯与测评 → 型号图片」逐型号上传或填地址。
 */
function RankThumb({ row, className }: { row: LadderRow; className: string }) {
  const src = rowThumb(row)
  return (
    <span className={className} aria-hidden="true">
      {src ? (
        <MediaImg src={src} alt="" />
      ) : (
        <span className="rank-ph">
          <b>{row.name.slice(0, 1).toUpperCase()}</b>
          <small>{row.name}</small>
        </span>
      )}
    </span>
  )
}

/** 领奖台：取前三名（仅已测试），以「2 - 1 - 3」视觉顺序排列，冠军居中抬高 */
function Podium({ metric, rows }: { metric: LadderMetric; rows: LadderRow[] }) {
  const { isHrefLive } = useSitePages()
  const top = rows.filter((row) => row.score !== null || row.inf).slice(0, 3)
  if (top.length < 3) return null
  const order: { row: LadderRow; place: '1' | '2' | '3' }[] = [
    { row: top[1], place: '2' },
    { row: top[0], place: '1' },
    { row: top[2], place: '3' },
  ]
  return (
    <div className="podium" aria-label={`${metric.label}榜前三名`}>
      {order.map(({ row, place }) => (
        <div className={`podium__col podium__col--${place}`} key={row.model}>
          <div className="podium__card">
            <RankThumb row={row} className="podium__thumb" />
            {row.productId && isHrefLive(`/products/${row.productId}`) ? (
              <Link className="podium__model" to={`/products/${row.productId}`} title={`查看 ${row.model} 产品详情`}>
                {row.model}
              </Link>
            ) : (
              <span className="podium__model">{row.model}</span>
            )}
            <span className="podium__name">{row.name}</span>
            <span className="podium__score">
              {formatScore(metric, row)}
              <em>{metric.unit}</em>
            </span>
          </div>
          <div className="podium__base" aria-hidden="true">
            <span>{place}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/** 榜单行列表：渲染名次、型号与分数，支持高亮命中项与试读态 */
function LadderRows({
  metric,
  rows,
  scoped,
  teaser,
  highlight,
}: {
  metric: LadderMetric
  rows: LadderRow[]
  scoped: boolean
  teaser?: boolean
  /** 用户输入的关键词（型号片段）：命中行高亮 */
  highlight: string
}) {
  const { t } = useI18n()
  const { isHrefLive } = useSitePages()
  const ranked = scoped ? rankWithinScope(rows) : rows.map((row) => ({ row, rank: row.rank, tied: false }))
  const keyword = highlight.trim().toLowerCase()
  return (
    <div className={`ladder${teaser ? ' ladder--teaser' : ''}`}>
      <div className="ladder__head">
        <span className="ladder__rank">{scoped ? t('blocks.rk.scope') : t('blocks.rk.rank')}</span>
        <span className="ladder__thumb-head" aria-hidden="true" />
        <span className="ladder__model">{t('blocks.rk.model')}</span>
        <span className="ladder__name">{t('blocks.rk.group')}</span>
        <span style={{ flex: 1 }}>{t('blocks.rk.score', { label: metric.label })}</span>
        <span className="ladder__value">{t('blocks.rk.value')}</span>
      </div>
      {ranked.map(({ row, rank }) => {
        const top = /^0[123]$/.test(rank)
        const hit = keyword !== '' && row.model.toLowerCase().includes(keyword)
        // 光魂自家型号：整行高亮，便于在本品牌榜中定位
        const soul = row.model.includes('光魂')
        return (
          <div
            className={`ladder__row${top ? ' ladder__row--top' : ''}${hit ? ' is-hit' : ''}${soul ? ' is-soul' : ''}`}
            key={row.model}
          >
            <span className={`ladder__rank${top ? ' ladder__rank--top' : ''}`}>{rank}</span>
            <RankThumb row={row} className="ladder__thumb" />
            {row.productId && isHrefLive(`/products/${row.productId}`) ? (
              <Link className="ladder__model ladder__model--link" to={`/products/${row.productId}`} title={`查看 ${row.model} 产品详情`}>
                {row.model}
              </Link>
            ) : (
              <span className="ladder__model" title={row.model}>
                {row.model}
                {soul && <span className="tag tag--soul">光魂</span>}
              </span>
            )}
            <span className="ladder__name">{row.name}</span>
            <span className="ladder__track">
              <i className="ladder__fill" style={{ ['--fill-target' as string]: `${fillWidth(metric, row)}%` }} />
            </span>
            <span className="ladder__value">
              <span className="ladder__score">{formatScore(metric, row)}</span>
              {/* hover 展开：实测小卡（来源） */}
              <span className="ladder__pop" role="tooltip">
                实测 {metric.label} {formatScore(metric, row)} {metric.unit} · 来源：小雪人评测实验室
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** 榜单区块：渲染领奖台与完整排行，支持指标切换、范围筛选与关键词搜索 */
export function RankingBlock({ props }: { props: Record<string, unknown> }) {
  const { t } = useI18n()
  const metricId = METRIC_ALIAS[asString(props.metric, 'overall')] ?? 'overall'
  const limit = Math.max(0, asNumber(props.limit, 10))
  const showFilter = asBool(props.showFilter)
  const teaser = asBool(props.teaser)
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)
  // 「我的型号」：输入型号片段时过滤全量数据并高亮命中行（列表页使用）
  const [query, setQuery] = useState('')
  const [params, setParams] = useSearchParams()

  const { data, loading, error } = useApi((signal) => fetchLadder(signal), [reloadKey])
  const metrics = data?.metrics ?? []
  const meta = data?.meta

  // 列表页（showFilter）：指标 / 品牌筛选由 URL 驱动，供导航深链直达；区块本身不参与筛选
  const canFilter = showFilter
  const metric = metrics.find((item) => item.id === (canFilter ? (params.get('metric') ?? metricId) : metricId)) ?? metrics[0]
  // 品牌：列表页 URL `?brand=` 优先；首页 teaser 不提供筛选
  const brandScope = canFilter ? (params.get('brand') ?? '') : ''
  const scoped = canFilter && brandScope !== ''
  const rows = metric ? metric.rows.filter((row) => !brandScope || row.name === brandScope) : []
  const tested = metric ? metric.rows.filter((row) => row.score !== null || row.inf) : []
  // 关键词过滤全量数据；否则列表页默认只渲染前 50 条，首页 teaser 仍按区块 limit 截断
  const keyword = query.trim().toLowerCase()
  const matched = keyword
    ? rows.filter((row) => `${row.model} ${row.name}`.toLowerCase().includes(keyword))
    : rows
  // 展开是临时 UI 状态，不写 URL：每次进入页面都只看前 50 条
  const [expanded, setExpanded] = useState(false)
  const capped = canFilter && !keyword && !expanded
  const shown = capped ? matched.slice(0, LIST_PAGE_LIMIT) : matched
  const remaining = matched.length - shown.length
  const shownTested = canFilter ? tested : tested.slice(0, limit)
  const brands = Array.from(new Set((metric?.rows ?? []).map((row) => row.name))).sort((a, b) => a.localeCompare(b, 'zh-CN'))

  // 切换指标 / 品牌时回到默认 50 条，避免展开状态带到另一份榜单
  useEffect(() => {
    setExpanded(false)
  }, [metric?.id, brandScope])

  // 分值条生长：以「取数就绪 + 当前指标 / 条数」为刷新键，确保真实榜单渲染后再绑定观察器
  const fillKey = `${metric?.id ?? 'none'}:${shown.length}:${keyword}:${loading ? 'loading' : 'ready'}`
  useLadderFill(rootRef, fillKey)

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  // 收起后回到榜单顶部，否则视线会停在长页面底部
  const collapse = () => {
    setExpanded(false)
    const top = rootRef.current?.getBoundingClientRect().top ?? 0
    window.scrollTo({ top: Math.max(0, window.scrollY + top - 96), behavior: 'smooth' })
  }

  return (
    <div ref={rootRef}>
      <SectionHeadFromProps
        props={props}
        action={
          <SafeLink className="btn btn--ghost btn--sm" to="/ladder">
            {t('blocks.fullRankings')} →
          </SafeLink>
        }
      />
      {error ? (
        <div className="empty">
          <div className="empty__title">榜单加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            重新加载
          </button>
        </div>
      ) : loading || !meta ? (
        <div className="ladder" aria-busy="true" aria-label="榜单加载中">
          <div className="ladder__head">
            <span className="ladder__rank">{t('blocks.rk.rank')}</span>
            <span className="ladder__thumb-head" aria-hidden="true" />
            <span className="ladder__model">{t('blocks.rk.model')}</span>
            <span className="ladder__name">{t('blocks.rk.group')}</span>
            <span style={{ flex: 1 }}>{t('blocks.rk.score', { label: '' })}</span>
            <span className="ladder__value">{t('blocks.rk.value')}</span>
          </div>
          {Array.from({ length: Math.min(limit || 5, 8) }).map((_, index) => (
            <div className="ladder__row" key={index}>
              <span className="ladder__rank">
                <span className="skeleton" style={{ display: 'inline-block', width: 24, height: 12 }} />
              </span>
              <span className="ladder__model">
                <span className="skeleton" style={{ display: 'inline-block', width: 96, height: 12 }} />
              </span>
              <span className="ladder__name">
                <span className="skeleton" style={{ display: 'inline-block', width: 72, height: 12 }} />
              </span>
              <span className="ladder__track">
                <i className="ladder__fill" style={{ ['--fill-target' as string]: '0%' }} />
              </span>
              <span className="ladder__value">
                <span className="skeleton" style={{ display: 'inline-block', width: 36, height: 12 }} />
              </span>
            </div>
          ))}
        </div>
      ) : !metric ? (
        <div className="empty">
          <div className="empty__title">暂无公开榜单</div>
          <p className="empty__desc">后台已将全部榜单设为隐藏，或尚未维护任何指标。</p>
        </div>
      ) : (
        <>
          {/* 指标切换 + 品牌筛选（仅列表页开启）：状态写入 URL */}
          {canFilter && (
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--gh-space-4)', flexWrap: 'wrap', gap: 'var(--gh-space-3)' }}>
              <div className="row" style={{ gap: 'var(--gh-space-4)', flexWrap: 'wrap' }}>
                <div className="segmented" role="tablist" aria-label="指标切换" style={{ flexWrap: 'wrap' }}>
                  {metrics.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={item.id === metric.id}
                      className={item.id === metric.id ? 'is-active' : undefined}
                      onClick={() => setParam('metric', item.id === 'overall' ? '' : item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <label className="row" style={{ gap: 'var(--gh-space-2)', alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                    品牌
                  </span>
                  <select
                    className="input"
                    value={brandScope}
                    onChange={(event) => setParam('brand', event.target.value)}
                    aria-label="按品牌筛选"
                  >
                    <option value="">全部品牌</option>
                    {brands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <span className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                来源 {meta.source} ｜ 抓取于 {meta.scrapedAt} ｜ 更新于 {meta.updatedAt}
              </span>
            </div>
          )}

          {scoped && (
            <p className="field__hint" style={{ marginBottom: 'var(--gh-space-2)' }}>
              <span className="tag tag--accent" style={{ marginRight: 'var(--gh-space-2)' }}>
                范围内排名
              </span>
              名次仅在当前指标与「{brandScope}」范围内重新计算，与综合榜名次可能不同。
            </p>
          )}

          {shownTested.length > 0 ? (
            <>
              {/* 榜单摘要：已测试 / 未测试 / 口径（首页局部预览也显示，信息量更足） */}
              <div className="ladder__summary">
                <span>
                  {t('blocks.rk.tested')} <b>{tested.length}</b> {t('blocks.rk.items')}
                </span>
                <span>
                  {t('blocks.rk.pending')} <b>{metric.pending}</b> {t('blocks.rk.items')}
                </span>
                <span>{t('blocks.rk.testedAt', { date: meta.testedAt })}</span>
                <span>{t('blocks.rk.sample', { n: meta.sample })}</span>
                <span>{t('blocks.rk.updatedAt', { date: meta.updatedAt })}</span>
              </div>
              {/* 型号筛选 + 页内测试方法入口（列表页；首页 teaser 不显示）*/}
              {!teaser && (
                <div className="ladder__tools">
                  <input
                    className="input ladder__search"
                    type="search"
                    value={query}
                    placeholder="输入型号筛选，如 25S1FP / OG27QK"
                    aria-label="按型号筛选榜单"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <SafeLink className="ladder__method" to="/articles">
                    测试方法说明 →
                  </SafeLink>
                </div>
              )}
              {/* 领奖台（前三）：列表页展示，首页 teaser 省略 */}
              {!teaser && <Podium metric={metric} rows={shownTested} />}
              <div className={`ladder__list${capped ? ' is-capped' : ''}`}>
                <LadderRows metric={metric} rows={shown} scoped={scoped} teaser={teaser} highlight={query} />
              </div>
              {canFilter && (
                <>
                  {keyword && (
                    <p className="ladder__match" role="status">
                      匹配「{query.trim()}」共 {matched.length} 条
                      {matched.length === 0 ? '，换个型号片段试试' : ''}
                    </p>
                  )}
                  {/* 收起态：列表底部羽化，入口压在渐变上，读作「后面还有」而不是「列表到此结束」 */}
                  {remaining > 0 && (
                    <div className="ladder__more">
                      <button className="ladder__expand" type="button" onClick={() => setExpanded(true)}>
                        展开全部 {matched.length} 条
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {expanded && !keyword && (
                    <div className="ladder__more is-end">
                      <button className="ladder__expand" type="button" onClick={collapse}>
                        收起榜单
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <path d="m6 15 6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="empty">
              <div className="empty__title">该指标下暂无已测试型号</div>
              <p className="empty__desc">共有 {metric.pending} 款产品尚未完成此项测试。可切换其他指标查看。</p>
              <button className="btn btn--secondary btn--sm" type="button" onClick={() => setParam('metric', '')}>
                返回综合榜
              </button>
            </div>
          )}

          {canFilter && (
            <p className="field__hint" style={{ marginTop: 'var(--gh-space-4)', fontSize: 'var(--gh-font-size-caption)', color: 'var(--color-text-tertiary)' }}>
              当前范围：{brandScope || '全部品牌'} · 数值单位：{metric.unit}。进度条按「{metric.better === 'high' ? '越大越好' : '越小越好'}」在全榜内归一化，榜首为 100%；不同量纲不混用同一刻度。
            </p>
          )}
        </>
      )}
    </div>
  )
}