/**
 * 后台「素材库」栏目（真实数据）——图片空间 / 云盘式布局。
 * ============================================================
 * 数据源（后端真实上传文件 + SQLite 元数据）：
 *   - 文件夹：GET/POST/PATCH/DELETE /api/admin/media/folders；
 *   - 素材：GET /api/admin/uploads?folderId&category&q&type&page、POST（上传）、
 *     POST /uploads/move（批量移动）、PATCH /uploads/:id（分类覆盖）、DELETE /uploads/:id。
 * 布局：左侧文件夹列表（全部 / 未分类 / 自建文件夹，含文件数，可新建 / 重命名 / 删除）；
 *       顶部筛选（分类 / 类型 / 关键词）；右侧素材网格（多选 + 批量移动 / 批量删除）。
 * 取数复用 useApi；新上传 / 增删后刷新列表与文件夹计数（保证与服务端筛选一致）。
 * 缩略图复用 MediaImg（加载失败不出现破图）；沿用 admin.css 的令牌与宫格样式。
 */
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  CATEGORY_LABELS,
  createFolder,
  deleteFolder,
  deleteUpload,
  listFolders,
  MEDIA_CATEGORIES,
  moveUploads,
  queryMedia,
  updateFolder,
  updateUpload,
  type FolderItem,
  type MediaCategory,
  type UploadItem,
} from '../../api/adminUploads'
import { uploadImage } from '../../lib/uploadImage'
import { useApi } from '../../hooks/useApi'
import { AdminIcon } from './AdminIcon'
import { AdminPageHead } from './AdminPageHead'
import { MediaImg } from '../ui/MediaImg'
import { registerSrcSet } from '../ui/mediaSrcSet'
import { OverflowMenu } from './OverflowMenu'
import { IconClose, IconPlus, IconSearch } from '../ui/Icon'
import { useConfirm, useToast } from './feedback'

/** 允许上传的类型（与后端白名单一致） */
const UPLOAD_ACCEPT =
  'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/quicktime,application/pdf,application/zip,text/plain,text/markdown'

/** 「全部」文件夹的哨兵值（区别于真实文件 id 与「未分类」） */
const ALL = 'all'
/** 「未分类」文件夹的哨兵值（后端约定值，亦可直接作为 query 值） */
const UNCATEGORIZED = 'uncategorized'

/** 类型筛选下拉选项（value 为 MIME 或主类型，'' = 全部） */
const TYPE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '全部类型', value: '' },
  { label: '图片', value: 'image' },
  { label: 'SVG / 图标', value: 'image/svg+xml' },
  { label: 'PDF', value: 'application/pdf' },
  { label: '压缩包', value: 'application/zip' },
  { label: '文本', value: 'text' },
]

/** 字节数 → 可读大小 */
function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** ISO 时间 → 紧凑展示 */
function formatTime(iso: string): string {
  return iso ? iso.replace('T', ' ').slice(0, 16) : '—'
}

/** 复制文本：优先 Clipboard API，不可用（如非安全上下文）时回退到临时 textarea */
async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(area)
  if (!ok) throw new Error('copy failed')
}

/** 扁平化文件夹（按 parentId 组织为带深度的列表，孤儿节点按顶层处理） */
function flattenFolders(folders: FolderItem[]): Array<{ folder: FolderItem; depth: number }> {
  const byParent = new Map<string | null, FolderItem[]>()
  for (const folder of folders) {
    const list = byParent.get(folder.parentId) ?? []
    list.push(folder)
    byParent.set(folder.parentId, list)
  }
  const out: Array<{ folder: FolderItem; depth: number }> = []
  const visited = new Set<string>()
  const walk = (parent: string | null, depth: number) => {
    for (const folder of byParent.get(parent) ?? []) {
      if (visited.has(folder.id)) continue
      visited.add(folder.id)
      out.push({ folder, depth })
      walk(folder.id, depth + 1)
    }
  }
  walk(null, 0)
  for (const folder of folders) {
    if (!visited.has(folder.id)) {
      visited.add(folder.id)
      out.push({ folder, depth: 0 })
      walk(folder.id, 1)
    }
  }
  return out
}

export function AdminUploadsList() {
  const [reloadKey, setReloadKey] = useState(0)
  const [foldersKey, setFoldersKey] = useState(0)
  const confirm = useConfirm()
  const toast = useToast()

  // 筛选状态
  const [folderId, setFolderId] = useState<string>(ALL)
  const [category, setCategory] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')

  // 上传目标文件夹（'' = 未分类）
  const [uploadTargetId, setUploadTargetId] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const [moveTarget, setMoveTarget] = useState<string>('')

  // 文件夹新建 / 重命名
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  // 关键词输入防抖（300ms）后再触发请求
  useEffect(() => {
    const timer = setTimeout(() => setQ(qInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [qInput])

  const foldersState = useApi((signal) => listFolders(signal), [foldersKey])
  const mediaState = useApi(
    (signal) =>
      queryMedia(
        {
          folderId: folderId === ALL ? undefined : folderId,
          category: category || undefined,
          type: typeFilter || undefined,
          q: q || undefined,
        },
        signal,
      ),
    [folderId, category, typeFilter, q, reloadKey],
  )

  const folders = foldersState.data?.items ?? []
  const uncategorizedCount = foldersState.data?.uncategorized ?? 0
  const allCount = folders.reduce((sum, folder) => sum + folder.fileCount, 0) + uncategorizedCount
  const items = mediaState.data?.items ?? []
  const total = mediaState.data?.total ?? 0
  const totalSize = items.reduce((sum, item) => sum + item.size, 0)
  const nodes = flattenFolders(folders)

  // 筛选变化时清空多选（避免对不可见项做批量操作）
  useEffect(() => {
    setSelected(new Set())
  }, [folderId, category, typeFilter, q])

  // 拿到素材数据即预登记变体（url → srcset），避免缩略图再各发一次变体查询
  useEffect(() => {
    for (const item of items) registerSrcSet(item.url, item.variants)
  }, [items])

  const refresh = () => {
    setReloadKey((key) => key + 1)
    setFoldersKey((key) => key + 1)
  }

  const selectFolder = (id: string) => {
    setFolderId(id)
    setUploadTargetId(id === ALL || id === UNCATEGORIZED ? '' : id)
  }

  /* ---------- 上传 ---------- */
  const onPickFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return
    setUploading(true)
    let ok = 0
    let failed = 0
    let lastError = ''
    for (const file of files) {
      try {
        // 图片会附带多尺寸变体（位图），其余文件等同普通上传
        await uploadImage(file, uploadTargetId || null)
        ok += 1
      } catch (ex) {
        failed += 1
        lastError = ex instanceof Error ? ex.message : '上传失败'
      }
    }
    setUploading(false)
    refresh()
    if (failed === 0) toast.success(`已上传 ${ok} 个文件`)
    else if (ok === 0) toast.error(`上传失败：${lastError}`)
    else toast.toast(`成功 ${ok} 个，失败 ${failed} 个（${lastError}）`, 'info')
  }

  /* ---------- 素材操作 ---------- */
  const onDelete = async (item: UploadItem) => {
    const ok = await confirm({
      title: '删除素材',
      message: `确认删除「${item.name}」？删除后引用该素材的页面将无法显示。此操作不可撤销。`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteUpload(item.id)
      refresh()
      toast.success(`已删除「${item.name}」`)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '删除失败')
    }
  }

  const onBulkDelete = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    const ok = await confirm({
      title: '批量删除素材',
      message: `确认删除选中的 ${ids.length} 个素材？此操作不可撤销。`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    let failed = 0
    let done = 0
    for (const id of ids) {
      try {
        await deleteUpload(id)
        done += 1
      } catch {
        failed += 1
      }
    }
    setSelected(new Set())
    refresh()
    if (failed === 0) toast.success(`已删除 ${done} 个素材`)
    else toast.error(`成功 ${done} 个，失败 ${failed} 个`)
  }

  const onBulkMove = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    try {
      await moveUploads(ids, moveTarget || null)
      setSelected(new Set())
      refresh()
      toast.success(`已移动 ${ids.length} 个素材`)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '移动失败')
    }
  }

  const onCategory = async (item: UploadItem, next: MediaCategory) => {
    if (next === item.category) return
    try {
      await updateUpload(item.id, { category: next })
      refresh()
      toast.success(`「${item.name}」已归为「${CATEGORY_LABELS[next]}」`)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '更新分类失败')
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onCopy = async (item: UploadItem) => {
    try {
      await copyText(item.url)
      toast.success(`已复制链接：${item.url}`)
    } catch {
      toast.error(`复制失败，请手动复制：${item.url}`)
    }
  }

  /* ---------- 文件夹操作 ---------- */
  const onCreateFolder = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      // 新建到当前选中的父文件夹（若当前处于具体文件夹）；否则顶层
      const parentId = folderId !== ALL && folderId !== UNCATEGORIZED ? folderId : null
      await createFolder(name, parentId)
      setNewName('')
      setCreating(false)
      setFoldersKey((key) => key + 1)
      toast.success(`已新建文件夹「${name}」`)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '新建文件夹失败')
    }
  }

  const startRename = (folder: FolderItem) => {
    setRenamingId(folder.id)
    setRenameValue(folder.name)
  }

  const onRenameFolder = async (folder: FolderItem) => {
    const name = renameValue.trim()
    if (!name || name === folder.name) {
      setRenamingId(null)
      return
    }
    try {
      await updateFolder(folder.id, { name })
      setRenamingId(null)
      setFoldersKey((key) => key + 1)
      toast.success(`已重命名为「${name}」`)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '重命名失败')
    }
  }

  const onDeleteFolder = async (folder: FolderItem) => {
    const ok = await confirm({
      title: '删除文件夹',
      message: `确认删除文件夹「${folder.name}」？其中的 ${folder.fileCount} 个素材将移入「未分类」，子文件夹会提升一层。`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteFolder(folder.id)
      if (folderId === folder.id) setFolderId(ALL)
      refresh()
      toast.success(`已删除文件夹「${folder.name}」`)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '删除文件夹失败')
    }
  }

  /** 文件夹名输入框：Enter 提交、Esc 取消 */
  const onNameKey = (event: ReactKeyboardEvent<HTMLInputElement>, submit: () => void, cancel: () => void) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }

  const loading = mediaState.loading && items.length === 0
  const isEmpty = !loading && !mediaState.error && items.length === 0

  return (
    <div className="admin-page admin-media">
      <AdminPageHead
        title="素材库"
        desc="按文件夹与分类集中管理素材；点击卡片复制公开地址，可多选批量移动 / 删除。"
        actions={
          <button
            type="button"
            className={`btn btn--primary btn--sm${uploading ? ' btn--loading' : ''}`}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                上传中…
              </>
            ) : (
              '上传素材'
            )}
          </button>
        }
      />

      <input
        ref={fileRef}
        type="file"
        multiple
        accept={UPLOAD_ACCEPT}
        className="image-field__file"
        aria-label="上传素材"
        onChange={onPickFiles}
      />

      <div className="admin-media__layout">
        {/* 左：文件夹列表 */}
        <aside className="admin-media__side" aria-label="素材文件夹">
          <div className="admin-media__side-head">
            <span className="admin-media__side-title">文件夹</span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              aria-label="新建文件夹"
              title="新建文件夹"
              onClick={() => {
                setCreating(true)
                setNewName('')
              }}
            >
              <IconPlus size={16} />
            </button>
          </div>

          {creating && (
            <div className="admin-media__new">
              <input
                className="input"
                autoFocus
                value={newName}
                placeholder="文件夹名称"
                aria-label="新建文件夹名称"
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => onNameKey(event, () => void onCreateFolder(), () => setCreating(false))}
              />
              <button type="button" className="btn btn--primary btn--sm" onClick={() => void onCreateFolder()} disabled={!newName.trim()}>
                新建
              </button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setCreating(false)}>
                取消
              </button>
            </div>
          )}

          <div className="admin-folder-list">
            <button
              type="button"
              className={`admin-folder__main admin-folder__main--system${folderId === ALL ? ' is-active' : ''}`}
              onClick={() => selectFolder(ALL)}
            >
              <AdminIcon name="grid" size={16} />
              <span className="admin-folder__name">全部</span>
              <span className="admin-folder__count">{allCount}</span>
            </button>
            <button
              type="button"
              className={`admin-folder__main admin-folder__main--system${folderId === UNCATEGORIZED ? ' is-active' : ''}`}
              onClick={() => selectFolder(UNCATEGORIZED)}
            >
              <AdminIcon name="doc" size={16} />
              <span className="admin-folder__name">未分类</span>
              <span className="admin-folder__count">{uncategorizedCount}</span>
            </button>

            {nodes.map(({ folder, depth }) => (
              <div
                key={folder.id}
                className={`admin-folder${folderId === folder.id ? ' is-active' : ''}`}
                style={{ paddingLeft: `calc(${depth} * var(--gh-space-4))` }}
              >
                {renamingId === folder.id ? (
                  <div className="admin-media__new">
                    <input
                      className="input"
                      autoFocus
                      value={renameValue}
                      aria-label={`重命名「${folder.name}」`}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onKeyDown={(event) => onNameKey(event, () => void onRenameFolder(folder), () => setRenamingId(null))}
                    />
                    <button type="button" className="btn btn--primary btn--sm" onClick={() => void onRenameFolder(folder)}>
                      保存
                    </button>
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => setRenamingId(null)}>
                      取消
                    </button>
                  </div>
                ) : (
                  <>
                    <button type="button" className="admin-folder__main" title={folder.name} onClick={() => selectFolder(folder.id)}>
                      <AdminIcon name="cloud" size={16} />
                      <span className="admin-folder__name">{folder.name}</span>
                      <span className="admin-folder__count">{folder.fileCount}</span>
                    </button>
                    <OverflowMenu
                      label={`「${folder.name}」操作`}
                      items={[
                        { key: 'rename', label: '重命名', onClick: () => startRename(folder) },
                        { key: 'delete', label: '删除文件夹', danger: true, onClick: () => void onDeleteFolder(folder) },
                      ]}
                    />
                  </>
                )}
              </div>
            ))}

            {nodes.length === 0 && !creating && <p className="admin-folder__empty">暂无文件夹，点右上角「＋」新建。</p>}
          </div>
        </aside>

        {/* 右：筛选 + 素材网格 */}
        <div className="admin-media__main">
          <div className="admin-toolbar">
            <div className="admin-filters">
              <span className="admin-filters__label">分类</span>
              <div className="admin-chipbar" role="group" aria-label="按分类筛选">
                <button
                  type="button"
                  className={`admin-chip${category === '' ? ' is-active' : ''}`}
                  aria-pressed={category === ''}
                  onClick={() => setCategory('')}
                >
                  全部
                </button>
                {MEDIA_CATEGORIES.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`admin-chip${category === key ? ' is-active' : ''}`}
                    aria-pressed={category === key}
                    onClick={() => setCategory(key)}
                  >
                    {CATEGORY_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>
            <select
              className="select admin-media__type"
              value={typeFilter}
              aria-label="按类型筛选"
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="admin-toolbar__search search">
              <span className="search__icon" aria-hidden="true">
                <IconSearch size={16} />
              </span>
              <input
                className="input"
                type="search"
                value={qInput}
                placeholder="搜索文件名…"
                aria-label="搜索文件名"
                onChange={(event) => setQInput(event.target.value)}
              />
              {qInput && (
                <button type="button" className="admin-search__clear" aria-label="清空搜索" onClick={() => setQInput('')}>
                  <IconClose size={14} />
                </button>
              )}
            </div>
            <span className="admin-toolbar__spacer" />
            <label className="admin-media__uploadtarget">
              <span className="admin-filters__label">上传到</span>
              <select
                className="select"
                value={uploadTargetId}
                aria-label="上传目标文件夹"
                onChange={(event) => setUploadTargetId(event.target.value)}
              >
                <option value="">未分类</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="admin-toolbar">
            <span className="admin-table__count">
              共 {total} 个素材{total > 0 ? ` · 合计 ${formatSize(totalSize)}` : ''}
            </span>
            <span className="admin-toolbar__spacer" />
            {selected.size > 0 && (
              <div className="admin-toolbar__selected" role="status">
                <span className="admin-table__count">已选 {selected.size} 项</span>
                <select
                  className="select"
                  value={moveTarget}
                  aria-label="移动到文件夹"
                  onChange={(event) => setMoveTarget(event.target.value)}
                >
                  <option value="">未分类</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => void onBulkMove()}>
                  批量移动
                </button>
                <button type="button" className="btn btn--danger btn--sm" onClick={() => void onBulkDelete()}>
                  批量删除
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="admin-gallery">
              {Array.from({ length: 8 }).map((_, i) => (
                <div className="admin-tile admin-tile--skeleton" key={i}>
                  <div className="admin-tile__media skeleton" />
                  <div className="admin-tile__body">
                    <span className="skeleton admin-skeleton-bar" />
                    <span className="skeleton admin-skeleton-bar" style={{ width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : mediaState.error ? (
            <div className="admin-table-wrap">
              <div className="admin-table__empty">
                <div className="alert alert--danger" role="alert">
                  {mediaState.error.message}
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    style={{ marginLeft: 'var(--gh-space-3)' }}
                    onClick={refresh}
                  >
                    重试
                  </button>
                </div>
              </div>
            </div>
          ) : isEmpty ? (
            <div className="admin-table-wrap">
              <div className="admin-table__empty">
                <div className="empty">
                  <div className="empty__title">暂无素材</div>
                  <p className="empty__desc">
                    {folderId === ALL && !category && !typeFilter && !q
                      ? '点击右上角「上传素材」添加第一个文件。'
                      : '当前筛选条件下没有素材，试试切换文件夹或清空筛选。'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="admin-gallery">
              {items.map((item) => {
                const image = item.type.startsWith('image/')
                const isSelected = selected.has(item.id)
                return (
                  <div
                    className={`admin-tile admin-upload-tile admin-tile--selectable${isSelected ? ' is-selected' : ''}`}
                    key={item.id}
                  >
                    <label className="admin-tile__pick" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        aria-label={`选择「${item.name}」`}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </label>
                    <button
                      type="button"
                      className="admin-upload-tile__pick"
                      onClick={() => onCopy(item)}
                      title="点击复制公开地址"
                      aria-label={`复制「${item.name}」的公开地址`}
                    >
                      <span className="admin-tile__media">
                        {image ? <MediaImg src={item.url} alt={item.name} /> : <AdminIcon name="doc" size={28} />}
                      </span>
                      <span className="admin-tile__body">
                        <span className="admin-tile__name">{item.name}</span>
                        <span className="admin-tile__meta">
                          {formatSize(item.size)} · {formatTime(item.uploadedAt)}
                        </span>
                      </span>
                    </button>
                    <div className="admin-upload-tile__actions">
                      <select
                        className="select admin-upload-tile__cat"
                        value={item.category}
                        aria-label={`「${item.name}」分类`}
                        title="手工覆盖分类"
                        onChange={(event) => void onCategory(item, event.target.value as MediaCategory)}
                      >
                        {MEDIA_CATEGORIES.map((key) => (
                          <option key={key} value={key}>
                            {CATEGORY_LABELS[key]}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => void onDelete(item)}>
                        删除
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
