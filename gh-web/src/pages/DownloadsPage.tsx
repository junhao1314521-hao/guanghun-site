import { PageView } from '../blocks/PageView'

/**
 * 下载中心（深度线 · 列表）：由内容库页面 key `downloads` 驱动渲染其区块序列
 * （text 区块 + downloadList 数据源区块）。
 *
 * 通过 `blockDefaults` 为 downloadList 区块注入 `showFilter`，在区块内保留原下载中心的
 * 类别 / 类型筛选、下载操作与空态。
 */
export function DownloadsPage() {
  return <PageView pageKey="downloads" blockDefaults={{ downloadList: { showFilter: true } }} />
}