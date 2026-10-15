/**
 * 后台「回收站」栏目（真实视图）。
 * ============================================================
 * 数据源为 GET /api/admin/resources/trash（后端 trash 表），覆盖四类软删除条目：
 *   - 集合（结构化集合记录）、后台资源（admin_resources 栏目）、页面（内容库非内置页面）、素材（上传文件）。
 * 提供：
 *   - 恢复：POST /api/admin/resources/trash/:id/restore（还原回原集合 / 资源栏目 / 内容库页面 / 素材元数据；原标识被占用 → 409）；
 *   - 彻底删除：DELETE /api/admin/resources/trash/:id（ConfirmDialog 二次确认，不可撤销；素材会真正删除磁盘文件）。
 * 各写操作成功后通过 reloadKey 重新拉取列表。
 */
import { useCallback, useState } from 'react'
import {
  fetchAdminTrash,
  purgeAdminTrash,
  restoreAdminTrash,
  type AdminTrashItem,
  type AdminTrashList,
  type AdminTrashType,
} from '../../api/admin'
import { useApi } from '../../hooks/useApi'
import { AdminPageHead } from './AdminPageHead'
import { EmptyState, ErrorState, SkeletonTable } from './states'
import { useConfirm, useToast } from './feedback'

/** 条目类型 → 中文标签 */
const TYPE_LABELS: Record<AdminTrashType, string> = {
  collection: '集合',
  resource: '后台资源',
  page: '页面',
  upload: '素材',
}

/** ISO 时间 → 紧凑展示 */
function formatTime(iso: string): string {
  return iso ? iso.replace('T', ' ').slice(0, 19) : '—'
}

export function AdminTrashList() {
  const [reloadKey, setReloadKey] = useState(0)
  const state = useApi<AdminTrashList>((signal) => fetchAdminTrash(signal), [reloadKey])
  const confirm = useConfirm()
  const toast = useToast()

  const items = state.data?.items ?? []
  const loading = state.loading && items.length === 0

  const onRestore = useCallback(
    async (item: AdminTrashItem) => {
      try {
        await restoreAdminTrash(item.id)
        toast.success(`已恢复「${item.name}」`)
        setReloadKey((key) => key + 1)
      } catch (ex) {
        toast.error(ex instanceof Error ? ex.message : '恢复失败')
      }
    },
    [toast],
  )

  const onPurge = useCallback(
    async (item: AdminTrashItem) => {
      const ok = await confirm({
        title: '彻底删除',
        message: (
          <>
            确认<strong>彻底删除</strong>「{item.name}」？该记录将从回收站永久移除，<strong>不可恢复</strong>。
          </>
        ),
        confirmText: '彻底删除',
        danger: true,
      })
      if (!ok) return
      try {
        await purgeAdminTrash(item.id)
        toast.success(`已彻底删除「${item.name}」`)
        setReloadKey((key) => key + 1)
      } catch (ex) {
        toast.error(ex instanceof Error ? ex.message : '彻底删除失败')
      }
    },
    [confirm, toast],
  )

  return (
    <div className="admin-page">
      <AdminPageHead
        title="回收站"
        desc="查看已删除的集合记录、后台资源、内容库页面与素材，可恢复或彻底删除；恢复时若原标识已被占用将被拒绝。"
      />

      <div className="admin-toolbar">
        <span className="admin-table__count">共 {items.length} 条</span>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <SkeletonTable columns={6} rows={5} />
        ) : state.error && items.length === 0 ? (
          <div className="admin-table__empty">
            <ErrorState message={state.error.message} onRetry={() => setReloadKey((key) => key + 1)} />
          </div>
        ) : items.length === 0 ? (
          <div className="admin-table__empty">
            <EmptyState
              icon="refresh"
              title="回收站为空"
              desc="删除集合记录、后台资源、页面或素材后，会先进入这里。"
            />
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="table admin-table">
              <thead>
                <tr>
                  <th scope="col">名称</th>
                  <th scope="col">类型</th>
                  <th scope="col">原栏目</th>
                  <th scope="col">记录标识</th>
                  <th scope="col">删除人</th>
                  <th scope="col">删除时间</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="admin-cell--clip admin-cell--title" data-label="名称" title={item.name}>
                      <strong>{item.name}</strong>
                    </td>
                    <td data-label="类型">
                      <span className="tag">{TYPE_LABELS[item.type]}</span>
                    </td>
                    <td data-label="原栏目">
                      <span className="tag">{item.key}</span>
                    </td>
                    <td className="mono admin-cell--clip" data-label="记录标识" title={item.recordId}>
                      {item.recordId}
                    </td>
                    <td data-label="删除人">{item.deletedBy || '—'}</td>
                    <td data-label="删除时间">{formatTime(item.deletedAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="admin-table__actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void onRestore(item)}>
                          恢复
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger-ghost btn--sm"
                          onClick={() => void onPurge(item)}
                        >
                          彻底删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
