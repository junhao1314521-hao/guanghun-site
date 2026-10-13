import { PageView } from '../blocks/PageView'

/**
 * 天梯榜（一级页面）：由内容库页面 key `ladder` 驱动渲染其区块序列
 * （text 区块 + ranking 数据源区块 + text 区块）。
 *
 * 通过 `blockDefaults` 为 ranking 区块注入 `showFilter`，在区块内保留原天梯榜页的
 * 指标切换、产品线筛选与范围内名次重算（含 URL `?metric=` / `?type=` 深链）。
 */
export function LadderPage() {
  return <PageView pageKey="ladder" blockDefaults={{ ranking: { showFilter: true } }} />
}