/**
 * 首页资料坞（downloadDock）：
 * 取下载中心「固件 / 驱动 / 软件」各类型最新一条，行内展示版本、日期、大小，
 * 有文件直接下载，无文件显示「整理中」；不再用三张营销卡。
 */
import { SafeLink } from '../components/ui/SafeLink'
import { fetchDownloads } from '../api/support-extra'
import { DOWNLOAD_TYPE_LABELS, isDownloadable, type DownloadItem, type DownloadType } from '../data/support-extra'
import { useApi } from '../hooks/useApi'
import { asBool, asString } from './blockUtils'

/** 默认展示三类；后台可用开关单独关闭 */
const DEFAULT_TYPES: DownloadType[] = ['firmware', 'driver', 'software']

/** 类型 → 左侧色块样式（与下载中心保持同一套语义色） */
const KIND_CLASS: Record<string, string> = {
  firmware: 'fw',
  driver: 'dr',
  software: 'sw',
  manual: 'mn',
  calibration: 'cl',
}

function pdfFile(url: string | undefined): boolean {
  return Boolean(url && /\.pdf(\?|#|$)/i.test(url))
}

/** 取某类型最新一条：先比日期，再让「最新」标记优先 */
function latestOf(items: DownloadItem[], type: DownloadType): DownloadItem | undefined {
  return items
    .filter((item) => item.type === type)
    .sort((a, b) => {
      const date = (b.releasedAt || b.date || '').localeCompare(a.releasedAt || a.date || '')
      if (date !== 0) return date
      return Number(Boolean(b.isLatest)) - Number(Boolean(a.isLatest))
    })[0]
}

export function DownloadDockBlock({ props }: { props: Record<string, unknown> }) {
  const title = asString(props.title, '固件与驱动')
  const desc = asString(props.desc)
  const moreLabel = asString(props.moreLabel, '全部资料')
  const moreHref = asString(props.moreHref, '/downloads')
  const types = DEFAULT_TYPES.filter((type) => {
    if (type === 'firmware') return props.showFirmware === undefined ? true : asBool(props.showFirmware)
    if (type === 'driver') return props.showDriver === undefined ? true : asBool(props.showDriver)
    return props.showSoftware === undefined ? true : asBool(props.showSoftware)
  })

  const { data, loading } = useApi((signal) => fetchDownloads(signal), [])
  const all = data?.items ?? []
  const rows = types.map((type) => latestOf(all, type)).filter((item): item is DownloadItem => Boolean(item))

  if (!loading && rows.length === 0) return null

  return (
    <section className="dl-dock" aria-label={title || '固件与驱动'}>
      <header className="dl-dock__head">
        <div className="dl-dock__intro">
          {title && <h2 className="dl-dock__title">{title}</h2>}
          {desc && <p className="dl-dock__desc">{desc}</p>}
        </div>
        {moreLabel && moreHref && (
          <SafeLink className="dl-dock__more" to={moreHref}>
            {moreLabel} <span aria-hidden="true">→</span>
          </SafeLink>
        )}
      </header>

      <div className="dl-dock__rows">
        {rows.map((item) => {
          const file = isDownloadable(item)
          const pdf = pdfFile(item.fileUrl)
          const modelsLine =
            item.modelNames?.join(' / ') ?? item.models.filter((id) => id !== 'all').join(' / ')
          return (
            <article className="dl-dock__row" key={item.id}>
              <span className={`dl-dock__kind dl-dock__kind--${KIND_CLASS[item.type] ?? 'mn'}`}>
                {DOWNLOAD_TYPE_LABELS[item.type]}
              </span>
              <div className="dl-dock__main">
                <b>
                  {item.name}
                  {item.isLatest && <span className="dl-dock__badge">最新</span>}
                </b>
                <span>{modelsLine ? `适用 ${modelsLine}` : item.note}</span>
              </div>
              <div className="dl-dock__meta">
                <b>{item.version}</b>
                <span>
                  {item.releasedAt || item.date} · {item.size}
                </span>
              </div>
              <div className="dl-dock__act">
                <SafeLink className="btn btn--sm btn--secondary" to={`/downloads/${item.id}`}>
                  详情
                </SafeLink>
                {file ? (
                  <a
                    className="btn btn--sm btn--primary"
                    href={item.fileUrl}
                    download={pdf ? undefined : true}
                    target={pdf ? '_blank' : undefined}
                    rel="noreferrer"
                  >
                    {pdf ? '在线阅读' : '下载'}
                  </a>
                ) : (
                  <span className="btn btn--sm btn--ghost dl-dock__pending" title="该资料正在整理中，可联系客服获取">
                    整理中
                  </span>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
