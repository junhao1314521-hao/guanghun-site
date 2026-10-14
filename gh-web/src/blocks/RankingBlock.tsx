/**
 * 12. ranking 榜单（数据源区块，契约 §4 / §8）
 * props: title / metric:'overall'|'sensor'|'battery'|'latency' / limit:number
 *        / showFilter?:boolean（可选交互开关）/ teaser?:boolean（首页只展示局部榜单）
 *
 * 不存内容：渲染时调用既有天梯榜接口取数（与榜单页共用同一份 rankings 集合），
 * 复用既有 .ladder 榜单行形态。历史数据里的 weight / dpi 无对应指标，回退综合榜（overall）。
 *
 * 当 `showFilter` 开启（列表页由 PageView 注入）时，在区块内保留原天梯榜页的
 * 指标切换 + 产品线筛选（含 URL `?metric=` / `?type=` 深链，且范围内名次重算）。
 */
import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchLadder } from '../api/ladder'
import { fillWidth, type LadderMetric, type LadderRow } from '../data/ladder'
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
  sensor: 'sensor',
  latency: 'latency',
  battery: 'battery',
  // 历史数据兼容：weight / dpi 无对应指标，回退综合榜（不再作为可选项暴露）
  weight: 'overall',
  dpi: 'overall',
}

/** 导航菜单参数 → 榜单系列关键词（?type=oled 等，按型号名称匹配） */
const TYPE_KEYWORDS: Record<string, string> = {
  oled: 'OLED',
  dual: '双模',
  ips: 'IPS',
}

function matchesType(row: LadderRow, keyword?: string): boolean {
  if (!keyword) return true
  return row.name.includes(keyword)
}

/** 按当前范围重算名次：仅对已测试行编号，同分并列共用名次，未测试行保持「—」 */
function rankWithinScope(rows: LadderRow[]): { row: LadderRow; rank: string; tied: boolean }[] {
  let counted = 0
  let current = 0
  let prev: number | null = null
  return rows.map((row) => {
    if (row.score === null) return { row, rank: '—', tied: false }
    counted += 1
    const tied = prev !== null && row.score === prev
    if (!tied) current = counted
    prev = row.score
    return { row, rank: String(current).padStart(2, '0'), tied }
  })
}

function LadderRows({
  metric,
  rows,
  scoped,
  teaser,
  baseRanks,
  highlight,
}: {
  metric: LadderMetric
  rows: LadderRow[]
  scoped: boolean
  teaser?: boolean
  /** 综合榜名次（型号 → 名次）：用于计算「名次变化 ↑↓」 */
  baseRanks: Record<string, number>
  /** 用户输入的关键词（型号片段）：命中行高亮 */
  highlight: string
}) {
  const { t } = useI18n()
  const ranked = scoped ? rankWithinScope(rows) : rows.map((row) => ({ row, rank: row.rank, tied: row.tied }))
  const topScore = ranked.reduce<number | null>(
    (acc, { row }) => (row.score !== null && (acc === null || row.score > acc) ? row.score : acc),
    null,
  )
  const deltaText = (score: number) => {
    if (topScore === null) return ''
    return score === topScore ? t('blocks.rk.leader') : `−${(topScore - score).toFixed(1)}`
  }
  const keyword = highlight.trim().toLowerCase()
  return (
    <div className={`ladder${teaser ? ' ladder--teaser' : ''}`}>
      <div className="ladder__head">
        <span className={`ladder__rank${scoped ? '' : ''}`}>{scoped ? t('blocks.rk.scope') : t('blocks.rk.rank')}</span>
        <span className="ladder__thumb-head" aria-hidden="true" />
        <span className="ladder__model">{t('blocks.rk.model')}</span>
        <span className="ladder__name">{t('blocks.rk.group')}</span>
        <span style={{ flex: 1 }}>{t('blocks.rk.score', { label: metric.label })}</span>
        <span className="ladder__value">{t('blocks.rk.value')}</span>
      </div>
      {ranked.map(({ row, rank, tied }) => {
        const top = /^0[123]$/.test(rank)
        const hit = keyword !== '' && row.model.toLowerCase().includes(keyword)
        // 名次变化：当前榜名次 vs 综合榜名次的差值（正 = 进步）
        const currentRank = Number(rank)
        const baseRank = baseRanks[row.model]
        const move = Number.isFinite(currentRank) && baseRank ? baseRank - currentRank : 0
        return (
          <div className={`ladder__row${top ? ' ladder__row--top' : ''}${hit ? ' is-hit' : ''}`} key={row.model}>
            <span className={`ladder__rank${top ? ' ladder__rank--top' : ''}`}>{rank}</span>
            <span className="ladder__thumb" aria-hidden="true">
              <MediaImg src={row.productId ? MEDIA.product[row.productId] ?? '' : ''} alt="" />
            </span>
            {row.productId ? (
              <Link className="ladder__model ladder__model--link" to={`/products/${row.productId}`} title={`查看 ${row.model} 产品详情`}>
                {row.model}
              </Link>
            ) : (
              <span className="ladder__model">{row.model}</span>
            )}
            <span className="ladder__name">{row.name}</span>
            {row.score === null ? (
              <span className="ladder__track" style={{ background: 'transparent', border: '1px dashed var(--color-border-default)' }}>
                <i className="ladder__fill" style={{ ['--fill-target' as string]: '0%' }} />
              </span>
            ) : (
              <span className="ladder__track">
                <i className="ladder__fill" style={{ ['--fill-target' as string]: `${fillWidth(metric, row.score)}%` }} />
              </span>
            )}
            <span className="ladder__value">
              {row.score === null ? (
                <span className="status status--muted">{t('blocks.rk.untested')}</span>
              ) : (
                <>
                  <span className="ladder__score">
                    {row.score.toFixed(metric.unit === '分' || row.score < 10 ? 1 : 0)}
                    {move !== 0 && (
                      <em className={`ladder__arrow${move > 0 ? ' is-up' : ''}`}>
                        {move > 0 ? '↑' : '↓'}
                        {Math.abs(move)}
                      </em>
                    )}
                    {tied && (
                      <span className="tag" style={{ marginLeft: 'var(--gh-space-1)' }}>
                        {t('blocks.rk.tie')}
                      </span>
                    )}
                  </span>
                  <span className="ladder__delta">{deltaText(row.score)}</span>
                  {/* hover 展开：实测小卡（样本 / 来源） */}
                  <span className="ladder__pop" role="tooltip">
                    实测 {metric.label} {row.score.toFixed(metric.unit === '分' || row.score < 10 ? 1 : 0)} {metric.unit} · 样本 n=3 · 来源：小雪人评测实验室
                  </span>
                </>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}

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

  // 列表页（showFilter）：指标 / 产品线筛选由 URL 驱动，供导航深链直达；区块本身不参与筛选
  const canFilter = showFilter
  const metric = metrics.find((item) => item.id === (canFilter ? (params.get('metric') ?? metricId) : metricId)) ?? metrics[0]
  // 范围（产品线）：列表页 URL `?type=` 优先，未选时以区块配置（props.type）作为默认；非列表页直接用区块配置
  const urlType = params.get('type') ?? ''
  const typeScope = asString(props.type)
  const typeKey = canFilter ? urlType || typeScope : typeScope
  const typeKeyword = TYPE_KEYWORDS[typeKey]
  const scoped = canFilter && metric ? metric.id !== 'overall' || Boolean(typeKeyword) : false
  const rows = metric ? metric.rows.filter((row) => matchesType(row, typeKeyword)) : []
  const tested = rows.filter((row) => row.score !== null)
  const shown = limit > 0 ? rows.slice(0, limit) : rows
  const shownTested = limit > 0 ? tested.slice(0, limit) : tested
  // 综合榜名次（型号 → 名次数字）：用于「名次变化 ↑↓」基准
  const baseRanks: Record<string, number> = {}
  const overallMetric = metrics.find((item) => item.id === 'overall')
  overallMetric?.rows.forEach((row) => {
    const n = Number(row.rank)
    if (Number.isFinite(n)) baseRanks[row.model] = n
  })

  // 分值条生长：以「取数就绪 + 当前指标 / 条数」为刷新键，确保真实榜单渲染后再绑定观察器
  const fillKey = `${metric?.id ?? 'none'}:${limit}:${rows.length}:${loading ? 'loading' : 'ready'}`
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
          <Link className="btn btn--ghost btn--sm" to="/ladder">
            {t('blocks.fullRankings')} →
          </Link>
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
          {/* 指标切换 + 产品线筛选（仅列表页开启）：与原天梯榜页一致，状态写入 URL */}
          {canFilter && (
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--gh-space-4)', flexWrap: 'wrap', gap: 'var(--gh-space-3)' }}>
              <div className="row" style={{ gap: 'var(--gh-space-4)', flexWrap: 'wrap' }}>
                <div className="segmented" role="tablist" aria-label="指标切换">
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
                <div className="segmented" role="group" aria-label="产品线筛选">
                  <button type="button" className={!typeKeyword ? 'is-active' : undefined} onClick={() => setParam('type', '')}>
                    全部
                  </button>
                  {Object.entries(TYPE_KEYWORDS).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={typeKey === key ? 'is-active' : undefined}
                      onClick={() => setParam('type', key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <span className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                测试日期 {meta.testedAt} ｜ 样本 {meta.sample} ｜ 更新于 {meta.updatedAt}
              </span>
            </div>
          )}

          {scoped && (
            <p className="field__hint" style={{ marginBottom: 'var(--gh-space-2)' }}>
              <span className="tag tag--accent" style={{ marginRight: 'var(--gh-space-2)' }}>
                范围内排名
              </span>
              名次仅在当前指标与产品线范围内重新计算，与综合榜名次可能不同。
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
                    placeholder="输入型号，如 54027 / 27Q1F"
                    aria-label="查找我的型号"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <Link className="ladder__method" to="/articles">
                    测试方法说明 →
                  </Link>
                </div>
              )}
              <LadderRows metric={metric} rows={shown} scoped={scoped} teaser={teaser} baseRanks={baseRanks} highlight={query} />
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
              当前范围：{typeKeyword ? `全部${typeKeyword}` : '全部产品线'} · 数值单位：{metric.unit}。延迟与续航按该指标内的相对占比展示进度条，不同量纲不混用同一刻度。
            </p>
          )}
        </>
      )}
    </div>
  )
}