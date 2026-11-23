/**
 * 后台「天梯与测评」合并页。
 * ============================================================
 * 将原「天梯榜 / 测试记录 / 测评方法 / 天梯榜导入」四个入口合并为一个模块，四个 Tab：
 *   - 天梯榜 / 测试记录 / 测评方法 → 复用通用资源列表主体（embedded，不再重复页头）；
 *   - 数据导入 → 原 CSV 导入页（embedded）。
 */
import { useState } from 'react'
import { adminResource } from '../../data/adminResources'
import { AdminPageHead } from '../../components/admin/AdminPageHead'
import { ResourceListBody } from '../../pages/admin/AdminResourceListPage'
import { AdminRankingsImportPage } from '../../pages/admin/AdminRankingsImportPage'

type RankingsTab = 'rankings' | 'test-records' | 'methods' | 'import'

const TABS: Array<{ key: RankingsTab; label: string }> = [
  { key: 'rankings', label: '天梯榜' },
  { key: 'test-records', label: '测试记录' },
  { key: 'methods', label: '测评方法' },
  { key: 'import', label: '数据导入' },
]

/** 组件：天梯与测评合并页 */
export function AdminRankingsHubView() {
  const [tab, setTab] = useState<RankingsTab>('rankings')
  const resource = tab === 'import' ? undefined : adminResource(tab)

  return (
    <div className="admin-page">
      <AdminPageHead
        title="天梯与测评"
        desc="测试记录是榜单的数据来源，测评方法保证结果可复现；四个环节在同一模块内完成。"
      />

      <div className="access-tabs" role="tablist" aria-label="天梯与测评分类">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={`access-tab${tab === item.key ? ' is-active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'import' ? (
        <AdminRankingsImportPage embedded />
      ) : resource ? (
        <ResourceListBody key={resource.key} resource={resource} embedded />
      ) : null}
    </div>
  )
}
