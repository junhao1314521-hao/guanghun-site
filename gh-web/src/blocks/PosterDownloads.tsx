/**
 * 海报底部悬浮下载条（§1.2 首屏海报 / §1.3 全宽海报）
 * ============================================================
 * 后台在「海报编辑器」里从下载中心勾选条目（字段 `downloadIds`），
 * 前台即在海报底部居中悬浮一排下载入口，数据（版本 / 大小 / 系统要求 / 文件地址）
 * 全部取下载中心真实记录，避免与「下载与安装」重复维护。
 *
 * 版式对标 Razer Synapse / MSI Center 的软件下载位：
 * 每个系统一个 CTA（动词开头）→ 系统要求作副行 → 版本 + 大小收成右侧等宽小字；
 * 不加「下载与安装」这类标签头（会压画面）。
 * 目标地址：条目有 `fileUrl` 时直接下载，否则回退到下载详情页；详情页已下线则降级为静态展示。
 */
import { Link } from 'react-router-dom'
import { fetchDownloads } from '../api/support-extra'
import type { DownloadItem } from '../data/support-extra'
import { IconDownload } from '../components/ui/Icon'
import { useApi } from '../hooks/useApi'
import { useSitePages } from '../hooks/useSitePages'
import type { PosterData } from './PosterSlide'

/** 下载条目归属的操作系统档位（决定按钮字形与主文案） */
type OsKind = 'windows' | 'mac' | 'file'

/** 从一段文案里识别操作系统；识别不到返回 null */
function matchOs(haystack: string): OsKind | null {
  if (!haystack) return null
  if (/mac\s?os|macintosh|os\s?x|darwin|\bmac\b/i.test(haystack)) return 'mac'
  if (/windows|win\s?(7|8|10|11|32|64)?\b/i.test(haystack)) return 'windows'
  return null
}

/**
 * 系统识别口径（与后台「下载资源 → 适用平台」字段约定一致，见 adminResources.ts 的字段 hint）：
 * ① 优先读 `platform`（约定填 Windows / macOS）——运营可控、不靠猜；
 * ② 未填时回退按资源名称 / 说明识别，兼容历史数据与下载中心内置资料。
 */
function osKindOf(item: DownloadItem): OsKind {
  return matchOs(item.platform ?? '') ?? matchOs(`${item.id} ${item.name} ${item.note}`) ?? 'file'
}

/** 主文案（CTA）：动词开头，与 Razer「Download for Windows」同一口径 */
function ctaLabel(item: DownloadItem, os: OsKind): string {
  if (os === 'windows') return '下载 Windows 版'
  if (os === 'mac') return '下载 macOS 版'
  return `下载 ${item.name}`
}

/** 副行：系统要求（取下载中心的说明 / 适用平台），无则回退版本号 */
function requirementOf(item: DownloadItem): string {
  return item.note.trim() || item.platform?.trim() || ''
}

/** 系统徽标字形（Windows 四格 / Apple 轮廓 / 通用文件），随按钮配色 */
function OsGlyph({ os }: { os: OsKind }) {
  if (os === 'windows') {
    return (
      <svg className="hero__dl-glyph" width="23" height="23" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
        <rect x="1" y="1" width="7.2" height="7.2" rx="1" />
        <rect x="9.8" y="1" width="7.2" height="7.2" rx="1" />
        <rect x="1" y="9.8" width="7.2" height="7.2" rx="1" />
        <rect x="9.8" y="9.8" width="7.2" height="7.2" rx="1" />
      </svg>
    )
  }
  if (os === 'mac') {
    return (
      <svg className="hero__dl-glyph" width="23" height="23" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M13.6 10.6c0-1.9 1.5-2.8 1.6-2.9-.9-1.3-2.2-1.4-2.7-1.5-1.1-.1-2.2.7-2.8.7-.6 0-1.5-.7-2.4-.7-1.2 0-2.4.7-3 1.8-1.3 2.2-.3 5.5.9 7.3.6.9 1.4 1.9 2.3 1.9.9 0 1.2-.6 2.3-.6 1.1 0 1.4.6 2.3.6.9 0 1.6-.9 2.2-1.9.7-1 1-2 1-2.1-.1 0-2.7-1-2.8-3.6z" />
        <path d="M12.2 5.2c.5-.6.8-1.4.7-2.2-.7 0-1.6.5-2.1 1.1-.5.5-.9 1.4-.7 2.2.8.1 1.6-.4 2.1-1.1z" />
      </svg>
    )
  }
  return (
    <svg className="hero__dl-glyph" width="23" height="23" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5.2 2.6h6.2l3.4 3.4v11.4H5.2z" />
      <path d="M11.4 2.6v3.4h3.4" />
    </svg>
  )
}

export function PosterDownloads({ data }: { data: PosterData }) {
  const { isHrefLive } = useSitePages()
  const ids = data.downloadIds
  // 依赖用字符串化键：downloadIds 每次渲染都是新数组，避免无谓重取
  const idsKey = ids.join(',')
  const { data: payload } = useApi(
    (signal) => (ids.length > 0 ? fetchDownloads(signal) : Promise.resolve(null)),
    [idsKey],
  )
  if (ids.length === 0) return null

  const byId = new Map((payload?.items ?? []).map((item) => [item.id, item]))
  const items = ids.map((id) => byId.get(id)).filter((item): item is DownloadItem => Boolean(item))
  if (items.length === 0) return null

  return (
    <div className="hero__downloads" role="group" aria-label="下载">
      {items.map((item) => {
        const os = osKindOf(item)
        const requirement = requirementOf(item)
        const body = (
          <>
            <span className="hero__dl-mark">
              <OsGlyph os={os} />
            </span>
            <span className="hero__dl-text">
              <span className="hero__dl-cta">{ctaLabel(item, os)}</span>
              {requirement && <span className="hero__dl-sub">{requirement}</span>}
            </span>
            <span className="hero__dl-meta">
              <b>{item.version}</b>
              <i aria-hidden="true">·</i>
              {item.size}
            </span>
            <span className="hero__dl-go" aria-hidden="true">
              <IconDownload size={18} />
            </span>
          </>
        )
        // 原生提示补充完整信息（窄屏隐藏右侧元数据时也能看到版本 / 大小）
        const hint = [item.version, item.size, item.note].filter(Boolean).join(' · ')
        if (item.fileUrl) {
          return (
            <a className="hero__dl" key={item.id} href={item.fileUrl} download rel="noreferrer" title={hint}>
              {body}
            </a>
          )
        }
        const detailHref = `/downloads/${item.id}`
        if (isHrefLive(detailHref)) {
          return (
            <Link className="hero__dl" key={item.id} to={detailHref} title={hint}>
              {body}
            </Link>
          )
        }
        // 既无文件地址、详情页又已下线 → 静态展示，不做死链
        return (
          <span className="hero__dl is-static" key={item.id}>
            {body}
          </span>
        )
      })}
    </div>
  )
}
