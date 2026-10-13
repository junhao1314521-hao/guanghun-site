/**
 * 后台「组件库」栏目（区块类型目录 + 启用/停用）。
 * ============================================================
 * 不再是假数据表，而是真实数据源 `GET /api/content/blocks/types`（共 19 类区块类型）。
 * 列表展示每个类型的：名称 / 分组 / 字段数 / 说明 / 启用状态，并可启用/停用；
 * 停用后装修器「新增区块」选择器不再列出该类型（已存在区块不受影响）。
 *
 * 启用状态存于站点配置 `enabledBlocks`，保存走 `PUT /api/admin/blocks/enabled`。
 * 取数与保存复用 useApi / useToast，交互沿用 admin 设计令牌。
 */
import { useMemo, useState } from 'react'
import { fetchBlockTypeCatalog, saveBlockEnabled, type BlockTypeMeta } from '../../api/adminPages'
import { useApi } from '../../hooks/useApi'
import { AdminIcon } from './AdminIcon'
import { AdminPageHead } from './AdminPageHead'
import { blockIcon } from './blockBuilderUtils'
import { useToast } from './feedback'

/** 分组顺序（契约 §6.3 group） */
const GROUP_ORDER: Array<BlockTypeMeta['group']> = ['内容', '数据', '结构']

/** 目录项说明：以「字段标签 + 字段数」概括该类型可编辑的内容 */
function describeType(meta: BlockTypeMeta): string {
  const labels = meta.fields.map((field) => field.label).filter(Boolean)
  return labels.length > 0 ? labels.join('、') : '（无字段）'
}

export function AdminComponentsList() {
  const state = useApi<BlockTypeMeta[]>((signal) => fetchBlockTypeCatalog(signal), [])
  const toast = useToast()
  // 本次会话的启用态覆盖（type → enabled），提交成功保留、失败回滚
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const types = useMemo(() => state.data ?? [], [state.data])
  const isEnabled = (meta: BlockTypeMeta) => overrides[meta.type] ?? meta.enabled !== false

  const grouped = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({
        group,
        items: types.filter((meta) => meta.group === group),
      })).filter((entry) => entry.items.length > 0),
    [types],
  )

  const enabledCount = types.filter((meta) => isEnabled(meta)).length

  const toggle = async (meta: BlockTypeMeta) => {
    if (saving) return
    const next = { ...overrides, [meta.type]: !isEnabled(meta) }
    setOverrides(next)
    const enabledList = types.filter((item) => next[item.type] ?? item.enabled !== false).map((item) => item.type)
    setSaving(meta.type)
    try {
      await saveBlockEnabled(enabledList)
      toast.success(`已${next[meta.type] ? '启用' : '停用'}「${meta.name}」`)
    } catch (ex) {
      // 失败回滚该项
      setOverrides((prev) => ({ ...prev, [meta.type]: !next[meta.type] }))
      toast.error(ex instanceof Error ? ex.message : '保存失败，请稍后重试')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHead
        title="组件库"
        desc="区块类型目录（共 19 类）。停用的类型不会出现在装修器「新增区块」选择器中，已放置的区块不受影响。"
      />

      <div className="admin-toolbar">
        <span className="admin-table__count">
          共 {types.length} 类 · 已启用 {enabledCount} 类
        </span>
      </div>

      {state.loading && types.length === 0 ? (
        <div className="admin-skeleton-table" role="status" aria-label="正在加载">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="admin-skeleton-row" key={i} style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
              {Array.from({ length: 5 }).map((__, c) => (
                <span className="skeleton admin-skeleton-bar" key={c} />
              ))}
            </div>
          ))}
        </div>
      ) : state.error && types.length === 0 ? (
        <div className="admin-table__empty">
          <div className="alert alert--danger" role="alert">
            {state.error.message}
          </div>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <div className="admin-table-scroll">
            <table className="table admin-table">
              <thead>
                <tr>
                  <th scope="col">组件名称</th>
                  <th scope="col">分组</th>
                  <th scope="col" style={{ textAlign: 'right' }}>字段数</th>
                  <th scope="col">说明</th>
                  <th scope="col" style={{ textAlign: 'right' }}>启用状态</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((entry) => (
                  entry.items.map((meta) => {
                    const enabled = isEnabled(meta)
                    return (
                      <tr key={meta.type}>
                        <td>
                          <span className="admin-table__actions" style={{ justifyContent: 'flex-start' }}>
                            <span className="admin-tile__media" style={{ width: 32, height: 32 }}>
                              <AdminIcon name={blockIcon(meta.type)} size={16} />
                            </span>
                            <strong>{meta.name}</strong>
                          </span>
                          <span className="mono" style={{ display: 'block', color: 'var(--color-text-tertiary)' }}>
                            {meta.type}
                          </span>
                        </td>
                        <td>
                          <span className="tag">{meta.group}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="mono">{meta.fields.length}</span>
                        </td>
                        <td className="admin-cell--clip" title={describeType(meta)}>
                          {describeType(meta)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <label className="switch" style={{ justifyContent: 'flex-end' }}>
                            <input
                              type="checkbox"
                              checked={enabled}
                              disabled={saving === meta.type}
                              aria-label={`${enabled ? '停用' : '启用'}「${meta.name}」`}
                              onChange={() => void toggle(meta)}
                            />
                            <span className="switch__track" />
                            <span>{enabled ? '已启用' : '已停用'}</span>
                          </label>
                        </td>
                      </tr>
                    )
                  })
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
