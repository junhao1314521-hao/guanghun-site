import { Navigate, useParams } from 'react-router-dom'

/**
 * 天梯榜 · 旧单项榜入口（`/ladder/:metric`，T5.1）。
 *
 * 方案 A：综合榜一页 + 顶部指标 Tab 原地切换；`/ladder/latency` 等旧链接 301 / 重定向到
 * 综合榜页的对应 Tab（以 URL 查询参数承载，如 `/ladder?metric=latency`）。
 * 独立单项页不再渲染，指标切换统一由 `RankingBlock` 的 Tab（`?metric=` 深链）承接。
 */
export function LadderMetricPage() {
  const { metric = '' } = useParams()
  return <Navigate to={metric ? `/ladder?metric=${encodeURIComponent(metric)}` : '/ladder'} replace />
}
