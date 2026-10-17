/**
 * 13. downloadList 下载（数据源区块，契约 §4 / §8）
 * props: title / category:'all'|'mouse'|'keyboard'|'headset' / limit:number
 *        / showFilter?:boolean（可选交互开关）
 *
 * 不存内容：渲染时调用既有下载中心接口取数，复用既有 .table 表格形态。
 *
 * 当 `showFilter` 开启（列表页由 PageView 注入）时，在区块内保留原下载中心的
 * 类别 / 类型筛选、下载操作与空态，避免装修化后交互能力回退。
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SafeLink } from '../components/ui/SafeLink'
import { fetchDownloads } from '../api/support-extra'
import { ALL_MODELS, DOWNLOAD_TYPE_LABELS } from '../data/support-extra'
import { trackDownload } from '../lib/track'
import { useApi } from '../hooks/useApi'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { BlockPager, useBlockPager } from './BlockPager'
import { useI18n } from '../i18n'
import { asBool, asNumber, asString, asStringArray, pickByIds } from './blockUtils'

/** 契约类别 → 下载资料分类（all 不筛选） */
const CATEGORY_LABEL: Record<string, string> = {
  all: '',
  software: '软件',
  oled: 'OLED 旗舰',
  dual: '双模高刷',
  ips: '电竞 IPS',
  accessory: '周边',
}

/** 受控的单选筛选 chip 组：驱动类别 / 类型的过滤 */
function FilterChips({
  label,
  options,
  value,
  onChange,
  labelFor,
}: {
  label: string
  options: string[]
  value: string
  onChange: (option: string) => void
  /** 选项显示名（值仍传原始 option，如下载中心的型号 id） */
  labelFor?: (option: string) => string
}) {
  return (
    <div className="row">
      <span className="muted" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
        {label}
      </span>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`chip${option === value ? ' is-active' : ''}`}
          aria-pressed={option === value}
          onClick={() => onChange(option)}
        >
          {labelFor ? labelFor(option) : option}
        </button>
      ))}
    </div>
  )
}

/** 下载条目（从接口推导，避免手工维护类型） */
type DownloadItem = Awaited<ReturnType<typeof fetchDownloads>>['items'][number]

/** 下载中心三入口：按型号 / 按资料类型 / 按产品线 */
const ENTRY_TABS = [
  { key: 'model' as const, label: '按型号' },
  { key: 'type' as const, label: '按资料类型' },
  { key: 'category' as const, label: '按产品线' },
]

/** 卡片视图：用途 / 适用型号 / 版本 / 大小 / 校验算法（下载中心默认视图） */
function DownloadGrid({ items }: { items: DownloadItem[] }) {
  return (
    <div className="dl-cards">
      {items.map((item) => (
        <article className="dl-card reveal" key={item.id}>
          <div className="dl-card__top">
            <span className="tag">{DOWNLOAD_TYPE_LABELS[item.type]}</span>
            {item.isLatest && <span className="tag tag--accent">最新</span>}
            <span className="dl-card__ver mono">{item.version}</span>
          </div>
          <h3 className="dl-card__title">{item.name}</h3>
          <p className="dl-card__note">{item.note}</p>
          <dl className="dl-card__meta">
            <div>
              <dt>适用型号</dt>
              <dd className="mono">{item.modelNames?.join(' / ') ?? item.models.join(' / ')}</dd>
            </div>
            <div>
              <dt>适用系统</dt>
              <dd>{item.os ?? item.platform ?? '全平台'}</dd>
            </div>
            <div>
              <dt>大小</dt>
              <dd className="mono">{item.size}</dd>
            </div>
            <div>
              <dt>更新</dt>
              <dd className="mono">{item.releasedAt ?? item.date}</dd>
            </div>
          </dl>
          <div className="dl-card__foot">
            <span className="dl-card__sum">{item.checksumType ?? 'SHA-256'} 校验</span>
            <div className="row" style={{ gap: 'var(--gh-space-2)' }}>
              <SafeLink className="btn btn--sm btn--secondary" to={`/downloads/${item.id}`}>
                详情
              </SafeLink>
              {item.fileUrl ? (
                <a
                  className="btn btn--sm btn--primary"
                  href={item.fileUrl}
                  download
                  rel="noreferrer"
                  onClick={() => trackDownload(item.id)}
                >
                  下载
                </a>
              ) : (
                <span
                  className="btn btn--sm btn--ghost"
                  role="note"
                  title="该资料尚未上传文件，上线后可用"
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                >
                  待上传
                </span>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

/** 横滑卡片形态（layout='rail'）：把资料渲染为可横向滚动的卡片，作为表格之外的另种呈现 */
function DownloadCards({ items, showFilter }: { items: DownloadItem[]; showFilter: boolean }) {
  return (
    <div className="blk-scroll-x">
      {items.map((item) => (
        <div className="card reveal" key={item.id}>
          <span className="tag">{DOWNLOAD_TYPE_LABELS[item.type]}</span>
          <h3 className="card__title" style={{ marginTop: 'var(--gh-space-3)' }}>
            {item.name}
          </h3>
          <p className="card__desc mono">{item.modelNames?.join(' / ') ?? item.models.join(' / ')}</p>
          <div className="card--link__foot">
            <span className="muted mono" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
              {item.version} · {item.size} · {item.date}
            </span>
          </div>
          <div className="row" style={{ marginTop: 'var(--gh-space-4)' }}>
            <SafeLink className="btn btn--sm btn--secondary" to={`/downloads/${item.id}`}>
              查看详情
            </SafeLink>
            {showFilter &&
              (item.fileUrl ? (
                <a
                  className="btn btn--sm btn--ghost"
                  href={item.fileUrl}
                  download
                  rel="noreferrer"
                  onClick={() => trackDownload(item.id)}
                >
                  下载
                </a>
              ) : (
                <span
                  className="btn btn--sm btn--ghost"
                  role="note"
                  title="该资料尚未上传文件，上线后可用"
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                >
                  下载
                </span>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function DownloadListBlock({ props }: { props: Record<string, unknown> }) {
  const { t } = useI18n()
  const propCategory = CATEGORY_LABEL[asString(props.category, 'all')] ?? ''
  const scope = asString(props.scope, 'all') // all | manual（手动挑选具体几条）
  const manualIds = asStringArray(props.ids)
  const limit = Math.max(0, asNumber(props.limit, 20))
  const showFilter = asBool(props.showFilter)
  // 呈现方式：表格（默认）/ 横向滑动卡片
  const railCards = asString(props.layout, 'table') === 'rail'
  const [reloadKey, setReloadKey] = useState(0)
  // 搜索词：按资料名称 / 型号 / 版本命中（对应清单第 5 条能力：搜 54027X1QE 或 v1.6.3 能命中）
  const [query, setQuery] = useState('')
  // 三入口 / 视图：仅列表页（showFilter）使用
  const [entry, setEntry] = useState<'model' | 'type' | 'category'>('model')
  const [view, setView] = useState<'cards' | 'table'>('cards')
  // —— 交互态：仅 showFilter 时使用；筛选「全量进 URL」（?category=&type=&model=），
  //    便于分享 / 深链直达（如型号支持页 → /downloads?model=xxx）——
  const [params, setParams] = useSearchParams()
  const readParam = (key: string) => (showFilter ? params.get(key) ?? '全部' : '全部')
  const category = readParam('category')
  const type = readParam('type')
  const rawModel = readParam('model')
  const setParam = (key: string, option: string) => {
    const next = new URLSearchParams(params)
    if (!option || option === '全部') next.delete(key)
    else next.set(key, option)
    setParams(next, { replace: true })
  }
  const setCategory = (option: string) => setParam('category', option)
  const setType = (option: string) => setParam('type', option)
  const setModel = (option: string) => setParam('model', option)

  const { data, loading, error } = useApi((signal) => fetchDownloads(signal), [reloadKey])
  const all = data?.items ?? []
  // 手动挑选：scope=manual 时按 ids 顺序挑选（优先于类别过滤）
  const base = pickByIds(all, scope, manualIds)
  // 型号：集合里存型号 id，显示名由接口派生（modelNames）；旧深链若传显示名则解析回 id
  const modelLabel = new Map<string, string>()
  base.forEach((item) =>
    item.models.forEach((id, index) => {
      const label = item.modelNames?.[index]
      if (label && !modelLabel.has(id)) modelLabel.set(id, label)
    }),
  )
  const modelLabelOf = (id: string) => modelLabel.get(id) ?? (id === ALL_MODELS ? '全部支持型号' : id)
  const modelOptions = ['全部', ...Array.from(new Set(base.flatMap((item) => item.models))).sort()]
  const model =
    rawModel === '全部' || modelOptions.includes(rawModel)
      ? rawModel
      : Array.from(modelLabel.entries()).find(([, label]) => label === rawModel)?.[0] ?? rawModel
  // 可选型号识别：搜索词正好等于型号 id 或显示名时，给出「只看该型号」入口
  const recognizedModel = (() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return ''
    return (
      modelOptions.find(
        (id) => id !== '全部' && id !== ALL_MODELS && (id.toLowerCase() === keyword || modelLabelOf(id).toLowerCase() === keyword),
      ) ?? ''
    )
  })()
  // 搜索命中：资料名称 / 版本 / 任一适用型号（id 或显示名，大小写不敏感）
  const keyword = query.trim().toLowerCase()
  const matchesQuery = (item: DownloadItem) =>
    !keyword ||
    item.name.toLowerCase().includes(keyword) ||
    item.version.toLowerCase().includes(keyword) ||
    item.models.some((id) => id.toLowerCase().includes(keyword) || modelLabelOf(id).toLowerCase().includes(keyword))
  const filtered = base.filter(
    (item) =>
      (!propCategory || item.category === propCategory) &&
      (model === '全部' || item.models.includes(model) || item.models.includes(ALL_MODELS)) &&
      (!showFilter || category === '全部' || item.category === category) &&
      (!showFilter || type === '全部' || DOWNLOAD_TYPE_LABELS[item.type] === type) &&
      (!showFilter || matchesQuery(item)),
  )
  const capped = limit > 0 ? filtered.slice(0, limit) : filtered
  // pageSize > 0 时启用分页（列表页），否则沿用 limit 截断（首页等策展区块）
  const pageSize = Math.max(0, asNumber(props.pageSize, 0))
  const { page, setPage, totalPages } = useBlockPager(capped.length, pageSize || 1, `${propCategory}|${scope}|${category}|${type}|${model}`)
  const shown = pageSize > 0 ? capped.slice((page - 1) * pageSize, page * pageSize) : capped

  const resetFilters = () => {
    // 三个筛选一次清空（逐个 setParam 会因闭包拿到同一份旧 params 而互相覆盖）
    const next = new URLSearchParams(params)
    next.delete('category')
    next.delete('type')
    next.delete('model')
    setParams(next, { replace: true })
    setQuery('')
  }

  return (
    <div>
      <SectionHeadFromProps
        props={props}
        action={
          <SafeLink className="btn btn--ghost btn--sm" to="/downloads">
            {t('blocks.downloadCenter')} →
          </SafeLink>
        }
      />
      {error ? (
        <div className="empty">
          <div className="empty__title">下载资料加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            重新加载
          </button>
        </div>
      ) : loading ? (
        <div className="table-wrap" aria-busy="true" aria-label="下载资料加载中">
          <table className="table">
            <thead>
              <tr>
                <th>资料名称</th>
                <th>适用型号</th>
                <th>类型</th>
                <th>版本</th>
                <th>大小</th>
                <th>更新日期</th>
                <th>
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.min(limit || 6, 8) }).map((_, index) => (
                <tr key={index}>
                  <td>
                    <span className="skeleton" style={{ display: 'block', height: 14, width: '70%' }} />
                  </td>
                  <td>
                    <span className="skeleton" style={{ display: 'block', height: 14, width: '60%' }} />
                  </td>
                  <td>
                    <span className="skeleton" style={{ display: 'block', height: 14, width: 40 }} />
                  </td>
                  <td>
                    <span className="skeleton" style={{ display: 'block', height: 14, width: 44 }} />
                  </td>
                  <td>
                    <span className="skeleton" style={{ display: 'block', height: 14, width: 52 }} />
                  </td>
                  <td>
                    <span className="skeleton" style={{ display: 'block', height: 14, width: 76 }} />
                  </td>
                  <td>
                    <span className="skeleton" style={{ display: 'block', height: 14, width: 64 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* R4：三入口分流（按型号 / 资料类型 / 产品线）+ 搜索 + 型号识别；卡片为默认视图 */}
          {showFilter && (
            <>
              <div className="dl-toolbar">
                <input
                  className="input"
                  type="search"
                  value={query}
                  placeholder="搜资料名称 / 型号 / 版本"
                  aria-label="搜索下载资料"
                  style={{ maxWidth: 340, flex: '1 1 240px' }}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {recognizedModel && (
                  <button
                    type="button"
                    className="dl-recognized"
                    onClick={() => {
                      // 型号识别是「决定性入口」：清掉类型 / 产品线，直接切到该型号
                      const next = new URLSearchParams(params)
                      next.delete('type')
                      next.delete('category')
                      next.set('model', recognizedModel)
                      setParams(next, { replace: true })
                      setEntry('model')
                      setQuery('')
                    }}
                  >
                    识别到型号 <b>{modelLabelOf(recognizedModel)}</b> · 只看该型号
                  </button>
                )}
                <span className="muted" style={{ fontSize: 'var(--gh-font-size-caption)', marginLeft: 'auto' }}>
                  共 {filtered.length} 份
                </span>
                <div className="dl-view" role="group" aria-label="视图切换">
                  <button
                    type="button"
                    className={`chip${view === 'cards' ? ' is-active' : ''}`}
                    aria-pressed={view === 'cards'}
                    onClick={() => setView('cards')}
                  >
                    卡片
                  </button>
                  <button
                    type="button"
                    className={`chip${view === 'table' ? ' is-active' : ''}`}
                    aria-pressed={view === 'table'}
                    onClick={() => setView('table')}
                  >
                    表格
                  </button>
                </div>
              </div>

              <div className="dl-filters">
                <div className="dl-tabs" role="tablist" aria-label="筛选入口">
                  {ENTRY_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={entry === tab.key}
                      className={`dl-tab${entry === tab.key ? ' is-active' : ''}`}
                      onClick={() => setEntry(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                {entry === 'model' ? (
                  <FilterChips label="型号" options={modelOptions} value={model} onChange={setModel} labelFor={modelLabelOf} />
                ) : entry === 'type' ? (
                  <FilterChips label="类型" options={data?.types ?? []} value={type} onChange={setType} />
                ) : (
                  <FilterChips label="产品线" options={data?.categories ?? []} value={category} onChange={setCategory} />
                )}
                {(model !== '全部' || type !== '全部' || category !== '全部' || query.trim()) && (
                  <button type="button" className="chip" onClick={resetFilters}>
                    清空筛选
                  </button>
                )}
              </div>
            </>
          )}

          {shown.length === 0 ? (
            showFilter ? (
              <div className="empty">
                <div className="empty__title">没有符合条件的资料</div>
                <p className="empty__desc">试试调整类别或类型筛选，或查看全部资料。</p>
                <button className="btn btn--secondary btn--sm" type="button" onClick={resetFilters}>
                  查看全部资料
                </button>
              </div>
            ) : (
              <p className="section__desc" style={{ padding: 'var(--gh-space-6) 0' }}>
                暂无可展示的下载资料。
              </p>
            )
          ) : railCards ? (
            <DownloadCards items={shown} showFilter={showFilter} />
          ) : showFilter && view === 'cards' ? (
            <DownloadGrid items={shown} />
          ) : (
            <div className="table-wrap reveal">
              <table className="table">
                <thead>
                  <tr>
                    <th>资料名称</th>
                    <th>适用型号</th>
                    <th>类型</th>
                    <th>版本</th>
                    <th>大小</th>
                    <th>更新日期</th>
                    <th>
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td className="mono">{item.modelNames?.join(' / ') ?? item.models.join(' / ')}</td>
                      <td>{DOWNLOAD_TYPE_LABELS[item.type]}</td>
                      <td className="mono">{item.version}</td>
                      <td className="mono">{item.size}</td>
                      <td className="mono">{item.date}</td>
                      <td>
                        {showFilter ? (
                          <div className="row" style={{ gap: 'var(--gh-space-2)' }}>
                            <SafeLink className="btn btn--sm btn--secondary" to={`/downloads/${item.id}`}>
                              查看详情
                            </SafeLink>
                            {item.fileUrl ? (
                              <a
                                className="btn btn--sm btn--ghost"
                                href={item.fileUrl}
                                download
                                rel="noreferrer"
                                onClick={() => trackDownload(item.id)}
                              >
                                下载
                              </a>
                            ) : (
                              <span
                                className="btn btn--sm btn--ghost"
                                role="note"
                                title="该资料尚未上传文件，上线后可用"
                                style={{ opacity: 0.6, cursor: 'not-allowed' }}
                              >
                                下载
                              </span>
                            )}
                          </div>
                        ) : (
                          <SafeLink className="btn btn--sm btn--secondary" to={`/downloads/${item.id}`}>
                            查看详情
                          </SafeLink>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showFilter && (
            <p className="field__hint" style={{ marginTop: 'var(--gh-space-3)' }}>
              名称、版本与日期以官方最终公布为准；上传新版后旧版仍可下载。
            </p>
          )}
          {pageSize > 0 && <BlockPager page={page} totalPages={totalPages} onChange={setPage} />}
        </>
      )}
    </div>
  )
}