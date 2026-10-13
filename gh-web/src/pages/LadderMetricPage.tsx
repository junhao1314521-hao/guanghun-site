import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchLadderMetric } from '../api/product-extra'
import { ApiError } from '../api/client'
import { LADDER_METRIC_KEYS } from '../data/product-extra'
import { fillWidth, type LadderMetric } from '../data/ladder'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/** 指标说明：讲清该指标衡量什么、量纲与方向，缺省给通用说明 */
const METRIC_DESC: Record<string, string> = {
  score: '综合得分由传感器精度、延迟、续航与做工四项加权合成，仅在子项测试全部完成后给出，满分为 100 分。',
  latency: '端到端延迟为从输入动作到屏幕刷新的全链路时间，单位为毫秒（ms），数值越低越好。',
  battery: '续航为标称工作模式下的连续使用时间，单位为小时（h），数值越高越好。',
  weight: '整机重量取不含线材的实称值，单位为克（g），数值越低越轻便。',
}

/** 单项指标榜（一级页面 · 皮肤层）：指标说明 + 榜单条，参考天梯榜行样式 */
export function LadderMetricPage() {
  const { metric: metricParam = '' } = useParams()
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [reloadKey, setReloadKey] = useState(0)

  const { data, loading, error } = useApi((signal) => fetchLadderMetric(metricParam, signal), [metricParam, reloadKey])

  const metric: LadderMetric | null = data
    ? { id: data.metric, label: data.metricLabel, unit: data.meta.unit, pending: data.meta.pending, rows: data.rows }
    : null
  const rows = data?.rows ?? []
  const tested = rows.filter((row) => row.score !== null)

  const readyKey = `${metricParam}:${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  const known = LADDER_METRIC_KEYS.find((item) => item.id === metricParam)
  const notFound = error instanceof ApiError && error.status === 404
  const label = metric?.label ?? known?.label ?? '指标'

  return (
    <div ref={rootRef}>
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/ladder">天梯榜</Link>
          <span>/</span>
          <span>{label}</span>
        </nav>

        {notFound ? (
          <div className="empty" style={{ marginTop: 'var(--gh-space-6)' }}>
            <div className="empty__title">未找到该天梯指标</div>
            <p className="empty__desc">{error?.message ?? '该指标可能已调整或链接有误'}，返回天梯榜重新选择。</p>
            <Link className="btn btn--secondary btn--sm" to="/ladder">
              返回天梯榜
            </Link>
          </div>
        ) : error ? (
          <div className="empty" style={{ marginTop: 'var(--gh-space-6)' }}>
            <div className="empty__title">榜单加载失败</div>
            <p className="empty__desc">{error.message}。请检查网络后重试。</p>
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
              重新加载
            </button>
          </div>
        ) : (
          <>
            <div className="section__head" style={{ marginTop: 'var(--gh-space-4)', alignItems: 'flex-start' }}>
              <div>
                <h1 className="section__title">{label}榜</h1>
                <p className="section__desc">{METRIC_DESC[metricParam] ?? '该指标按光魂实验室同一套可复现方法测量，数值仅供选购参考。'}</p>
              </div>
              <div className="row">
                <Link className="btn btn--secondary btn--sm" to="/ladder">
                  全部天梯榜
                </Link>
              </div>
            </div>

            {/* 指标切换：segmented，切换即跳转到对应指标页 */}
            <div className="segmented" role="tablist" aria-label="指标切换" style={{ marginBottom: 'var(--gh-space-4)' }}>
              {LADDER_METRIC_KEYS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={item.id === metricParam}
                  className={item.id === metricParam ? 'is-active' : undefined}
                  onClick={() => navigate(`/ladder/${item.id}`)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {loading || !data || !metric ? (
              <div className="ladder" aria-busy="true" aria-label="榜单加载中">
                <div className="ladder__head">
                  <span className="ladder__rank">#</span>
                  <span className="ladder__model">型号</span>
                  <span className="ladder__name">归类</span>
                  <span style={{ flex: 1 }}>数值</span>
                  <span className="ladder__value">数值</span>
                </div>
                {Array.from({ length: 4 }).map((_, index) => (
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
            ) : tested.length > 0 ? (
              <>
                <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 'var(--gh-space-2)' }}>
                  <span className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                    测试日期 {data.meta.testedAt} ｜ 样本 {data.meta.sample} ｜ 更新于 {data.meta.updatedAt}
                  </span>
                </div>
                <div className="ladder">
                  <div className="ladder__head">
                    <span className="ladder__rank">#</span>
                    <span className="ladder__model">型号</span>
                    <span className="ladder__name">归类</span>
                    <span style={{ flex: 1 }}>{metric.label}</span>
                    <span className="ladder__value">数值</span>
                  </div>
                  {rows.map((row) => (
                    <div className="ladder__row" key={row.model}>
                      <span className={`ladder__rank${/^0[123]$/.test(row.rank) ? ' ladder__rank--top' : ''}`}>{row.rank}</span>
                      <span className="ladder__model">{row.model}</span>
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
                          <span className="status status--muted">未测试</span>
                        ) : (
                          <>
                            {row.score.toFixed(metric.unit === '分' || row.score < 10 ? 1 : 0)}
                            {row.tied && (
                              <span className="tag" style={{ marginLeft: 'var(--gh-space-1)' }}>
                                并列
                              </span>
                            )}
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="field__hint" style={{ marginTop: 'var(--gh-space-4)', fontSize: 'var(--gh-font-size-caption)', color: 'var(--color-text-tertiary)' }}>
                  数值单位：{metric.unit}。进度条按该指标内的相对占比展示，不同量纲不混用同一刻度；「未测试」与零值含义不同。
                </p>
              </>
            ) : (
              <div className="empty">
                <div className="empty__title">该指标下暂无已测试型号</div>
                <p className="empty__desc">共有 {metric.pending} 款产品尚未完成此项测试。可切换其他指标，或返回天梯榜查看综合表现。</p>
                <Link className="btn btn--secondary btn--sm" to="/ladder">
                  返回天梯榜
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}