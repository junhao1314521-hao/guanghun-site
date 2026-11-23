/**
 * 后台「品牌壁纸 · 主题管理」面板。
 * 主题已是实体（wallpaper_themes）：可新建 / 改名 / 说明 / 排序 / 启停 / 删除；
 * 仍被壁纸引用的主题禁止删除，避免前台出现无分类壁纸。
 */
import { useState } from 'react'
import {
  createWallpaperTheme,
  deleteWallpaperTheme,
  updateWallpaperTheme,
  type WallpaperThemeItem,
} from '../../api/wallpaperThemes'
import { useConfirm, useToast } from './feedback'
import { EmptyState, ErrorState, SkeletonTable } from './states'

type EditorState =
  | { open: false }
  | { open: true; mode: 'create'; key: string; label: string; description: string; sort: string }
  | { open: true; mode: 'edit'; key: string; label: string; description: string; sort: string; active: boolean }

const CLOSED: EditorState = { open: false }

export function WallpaperThemesPanel({
  themes,
  loading,
  error,
  onChanged,
}: {
  themes: WallpaperThemeItem[]
  loading: boolean
  error: Error | null
  onChanged: () => void
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const [editor, setEditor] = useState<EditorState>(CLOSED)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)

  const openCreate = () =>
    setEditor({ open: true, mode: 'create', key: '', label: '', description: '', sort: String(themes.length + 1) })

  const openEdit = (theme: WallpaperThemeItem) =>
    setEditor({
      open: true,
      mode: 'edit',
      key: theme.key,
      label: theme.label,
      description: theme.description,
      sort: String(theme.sort),
      active: theme.active,
    })

  const save = async () => {
    if (!editor.open) return
    setFormErr(null)
    const sort = Number(editor.sort)
    setSaving(true)
    try {
      if (editor.mode === 'create') {
        await createWallpaperTheme({
          key: editor.key.trim(),
          label: editor.label.trim() || editor.key.trim(),
          description: editor.description.trim(),
          sort: Number.isFinite(sort) ? sort : undefined,
        })
        toast.success('主题已创建')
      } else {
        await updateWallpaperTheme(editor.key, {
          label: editor.label.trim(),
          description: editor.description.trim(),
          sort: Number.isFinite(sort) ? sort : undefined,
          active: editor.active,
        })
        toast.success('主题已保存')
      }
      setEditor(CLOSED)
      onChanged()
    } catch (ex) {
      setFormErr(ex instanceof Error ? ex.message : '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (theme: WallpaperThemeItem) => {
    try {
      await updateWallpaperTheme(theme.key, { active: !theme.active })
      toast.success(theme.active ? '主题已停用（前台不再显示该分类）' : '主题已启用')
      onChanged()
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '操作失败，请稍后重试')
    }
  }

  const remove = async (theme: WallpaperThemeItem) => {
    const ok = await confirm({
      title: '删除主题',
      message: `确定删除主题「${theme.label}」？仅当没有壁纸使用它时才可删除。`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteWallpaperTheme(theme.key)
      toast.success('主题已删除')
      onChanged()
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '删除失败，请稍后重试')
    }
  }

  if (error) return <ErrorState message={error.message} />

  return (
    <div className="wp-themes-pane">
      <section className="admin-panel">
        <div className="admin-panel__head">
          <h2 className="admin-panel__title">壁纸主题</h2>
          <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
            新建主题
          </button>
        </div>
        <p className="admin-page__desc" style={{ marginBottom: 'var(--gh-space-3)' }}>
          主题是独立实体：排序决定前台 chips 顺序，停用后前台不再显示该分类；删除前需先移走该主题下的壁纸。
        </p>

        {loading && themes.length === 0 ? (
          <SkeletonTable columns={5} rows={3} />
        ) : themes.length === 0 ? (
          <EmptyState title="还没有主题" desc="新建第一个主题后即可在批量上传时选择。" />
        ) : (
          <div className="admin-table-scroll">
            <table className="table admin-table">
              <thead>
                <tr>
                  <th scope="col">主题</th>
                  <th scope="col">说明</th>
                  <th scope="col">壁纸数</th>
                  <th scope="col">排序</th>
                  <th scope="col">状态</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {themes.map((theme) => (
                  <tr key={theme.key}>
                    <td className="admin-cell--title" data-label="主题">
                      <strong>{theme.label}</strong>
                      {theme.label !== theme.key && <span className="admin-cell--muted mono">（{theme.key}）</span>}
                    </td>
                    <td className="admin-cell--muted" data-label="说明">
                      {theme.description || '—'}
                    </td>
                    <td data-label="壁纸数">{theme.count}</td>
                    <td data-label="排序">{theme.sort}</td>
                    <td data-label="状态">
                      <span className={`tag${theme.active ? ' tag--accent' : ''}`}>{theme.active ? '启用' : '停用'}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="admin-table__actions" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(theme)}>
                          编辑
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void toggleActive(theme)}>
                          {theme.active ? '停用' : '启用'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          disabled={theme.count > 0}
                          title={theme.count > 0 ? `仍有 ${theme.count} 张壁纸使用该主题` : undefined}
                          onClick={() => void remove(theme)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editor.open && (
          <div className="card" style={{ marginTop: 'var(--gh-space-5)' }}>
            <h3 className="card__title">{editor.mode === 'create' ? '新建主题' : `编辑主题：${editor.key}`}</h3>
            <div className="form-grid-2" style={{ marginTop: 'var(--gh-space-4)' }}>
              <div className="field">
                <label className="field__label" htmlFor="wp-theme-key">
                  主题键
                </label>
                <input
                  className="input"
                  id="wp-theme-key"
                  value={editor.key}
                  disabled={editor.mode === 'edit'}
                  placeholder="如 星海（壁纸引用此值，创建后不可改）"
                  onChange={(event) => {
                    if (editor.mode === 'create') setEditor({ ...editor, key: event.target.value })
                  }}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="wp-theme-label">
                  显示名称
                </label>
                <input
                  className="input"
                  id="wp-theme-label"
                  value={editor.label}
                  placeholder="留空则与主题键一致"
                  onChange={(event) =>
                    setEditor((prev) => (prev.open ? { ...prev, label: event.target.value } : prev))
                  }
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="wp-theme-sort">
                  排序
                </label>
                <input
                  className="input"
                  id="wp-theme-sort"
                  type="number"
                  value={editor.sort}
                  onChange={(event) =>
                    setEditor((prev) => (prev.open ? { ...prev, sort: event.target.value } : prev))
                  }
                />
              </div>
              {editor.mode === 'edit' && (
                <div className="field">
                  <span className="field__label">前台可见</span>
                  <label className="switch" style={{ gap: 'var(--gh-space-2)' }}>
                    <input
                      type="checkbox"
                      checked={editor.active}
                      onChange={(event) => {
                        if (editor.mode === 'edit') setEditor({ ...editor, active: event.target.checked })
                      }}
                    />
                    <span className="switch__track" />
                    <span>{editor.active ? '启用' : '停用'}</span>
                  </label>
                </div>
              )}
            </div>
            <div className="field" style={{ marginTop: 'var(--gh-space-4)' }}>
              <label className="field__label" htmlFor="wp-theme-desc">
                说明
              </label>
              <input
                className="input"
                id="wp-theme-desc"
                value={editor.description}
                placeholder="如：银河、星云与深空地平线。"
                onChange={(event) =>
                  setEditor((prev) => (prev.open ? { ...prev, description: event.target.value } : prev))
                }
              />
            </div>
            {formErr && (
              <span className="field__error" style={{ display: 'block', marginTop: 'var(--gh-space-3)' }}>
                {formErr}
              </span>
            )}
            <div className="row" style={{ marginTop: 'var(--gh-space-5)' }}>
              <button
                className={`btn btn--primary${saving ? ' btn--loading' : ''}`}
                type="button"
                disabled={saving}
                onClick={() => void save()}
              >
                保存
              </button>
              <button className="btn btn--ghost" type="button" onClick={() => setEditor(CLOSED)}>
                取消
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
