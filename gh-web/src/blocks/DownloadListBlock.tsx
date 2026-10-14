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
import { Link } from 'react-router-dom'
import { fetchDownloads } from '../api/support-extra'
import { DOWNLOAD_TYPE_LABELS } from '../data/support-extra'
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
}: {
  label: string
  options: string[]
  value: string
  onChange: (option: string) => void
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
          {option}
        </button>
      ))}
    </div>
  )
}

/** 下载条目（从接口推导，避免手工维护类型） */
type DownloadItem = Awaited<ReturnType<typeof fetchDownloads>>['items'][number]

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
          <p className="card__desc mono">{item.models.join(' / ')}</p>
          <div className="card--link__foot">
            <span className="muted mono" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
              {item.version} · {item.size} · {item.date}
            </span>
          </div>
          <div className="row" style={{ marginTop: 'var(--gh-space-4)' }}>
            <Link className="btn btn--sm btn--secondary" to={`/downloads/${item.id}`}>
              查看详情
            </Link>
            {showFilter &&
              ((item as { fileUrl?: string }).fileUrl ? (
                <a
                  className="btn btn--sm btn--ghost"
                  href={(item as { fileUrl?: string }).fileUrl}
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
  // —— 交互态：仅 showFilter 时使用，无条件声明以遵守 hooks 规则 ——
  const [category, setCategory] = useState('全部')
  const [type, setType] = useState('全部')

  const { data, loading, error } = useApi((signal) => fetchDownloads(signal), [reloadKey])
  const all = data?.items ?? []
  // 手动挑选：scope=manual 时按 ids 顺序挑选（优先于类别过滤）
  const base = pickByIds(all, scope, manualIds)
  const filtered = base.filter(
    (item) =>
      (!propCategory || item.category === propCategory) &&
      (!showFilter || category === '全部' || item.category === category) &&
      (!showFilter || type === '全部' || DOWNLOAD_TYPE_LABELS[item.type] === type),
  )
  const capped = limit > 0 ? filtered.slice(0, limit) : filtered
  // pageSize > 0 时启用分页（列表页），否则沿用 limit 截断（首页等策展区块）
  const pageSize = Math.max(0, asNumber(props.pageSize, 0))
  const { page, setPage, totalPages } = useBlockPager(capped.length, pageSize || 1, `${propCategory}|${scope}|${category}|${type}`)
  const shown = pageSize > 0 ? capped.slice((page - 1) * pageSize, page * pageSize) : capped

  const resetFilters = () => {
    setCategory('全部')
    setType('全部')
  }

  return (
    <div>
      <SectionHeadFromProps
        props={props}
        action={
          <Link className="btn btn--ghost btn--sm" to="/downloads">
            {t('blocks.downloadCenter')} →
          </Link>
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
          {/* 类别 / 类型筛选（仅列表页开启）：与原下载中心一致 */}
          {showFilter && (
            <div className="row" style={{ gap: 'var(--gh-space-5)', marginBottom: 'var(--gh-space-5)' }}>
              <FilterChips label="类别" options={data?.categories ?? []} value={category} onChange={setCategory} />
              <FilterChips label="类型" options={data?.types ?? []} value={type} onChange={setType} />
              <span className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                共 {filtered.length} 份
              </span>
            </div>
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
                      <td className="mono">{item.models.join(' / ')}</td>
                      <td>{DOWNLOAD_TYPE_LABELS[item.type]}</td>
                      <td className="mono">{item.version}</td>
                      <td className="mono">{item.size}</td>
                      <td className="mono">{item.date}</td>
                      <td>
                        {showFilter ? (
                          <div className="row" style={{ gap: 'var(--gh-space-2)' }}>
                            <Link className="btn btn--sm btn--secondary" to={`/downloads/${item.id}`}>
                              查看详情
                            </Link>
                            {(item as { fileUrl?: string }).fileUrl ? (
                              <a
                                className="btn btn--sm btn--ghost"
                                href={(item as { fileUrl?: string }).fileUrl}
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
                          <Link className="btn btn--sm btn--secondary" to={`/downloads/${item.id}`}>
                            查看详情
                          </Link>
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