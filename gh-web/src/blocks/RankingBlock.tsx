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
 * 列表页展示全量榜单（忽略区块 limit），首页 teaser 仍按 limit 截断。
 */
import { useRef, useState } from 'react'
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
            <span className="podium__thumb" aria-hidden="true">
              <MediaImg src={row.productId ? MEDIA.product[row.productId] ?? '' : ''} alt="" />
            </span>
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
            <span className="ladder__thumb" aria-hidden="true">
              <MediaImg src={row.productId ? MEDIA.product[row.productId] ?? '' : ''} alt="" />
            </span>
            {row.productId && isHrefLive(`/products/${row.productId}`) ? (
              <Link className="ladder__model ladder__model--link" to={`/products/${row.productId}`} title={`查看 ${row.model} 产品详情`}>
                {row.model}
              </Link>
            ) : (
              <span className="ladder__model">
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
  // 「我的型号」高亮：输入型号片段，命中行高亮（列表页使用，不改动数据）
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
  // 列表页展示全量，首页 teaser 按 limit 截断
  const effectiveLimit = canFilter ? 0 : limit
  const shown = effectiveLimit > 0 ? rows.slice(0, effectiveLimit) : rows
  const shownTested = effectiveLimit > 0 ? tested.slice(0, effectiveLimit) : tested
  const brands = Array.from(new Set((metric?.rows ?? []).map((row) => row.name))).sort((a, b) => a.localeCompare(b, 'zh-CN'))

  // 分值条生长：以「取数就绪 + 当前指标 / 条数」为刷新键，确保真实榜单渲染后再绑定观察器
  const fillKey = `${metric?.id ?? 'none'}:${effectiveLimit}:${rows.length}:${loading ? 'loading' : 'ready'}`
  useLadderFill(rootRef, fillKey)

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
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
      ) : loading || !metric || !meta ? (
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
              {/* 「我的型号」高亮 + 页内测试方法入口（列表页；首页 teaser 不显示）*/}
              {!teaser && (
                <div className="ladder__tools">
                  <input
                    className="input ladder__search"
                    type="search"
                    value={query}
                    placeholder="输入型号，如 25S1FP / OG27QK"
                    aria-label="查找我的型号"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <SafeLink className="ladder__method" to="/articles">
                    测试方法说明 →
                  </SafeLink>
                </div>
              )}
              {/* 领奖台（前三）：列表页展示，首页 teaser 省略 */}
              {!teaser && <Podium metric={metric} rows={shownTested} />}
              <LadderRows metric={metric} rows={shown} scoped={scoped} teaser={teaser} highlight={query} />
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