/**
 * 素材库选择弹窗（后台统一使用）。
 * ============================================================
 * 替代原「单宫格 + 最多 200 条」的简易弹窗：
 * - 左侧文件夹（全部 / 未分类 / 自建），带文件数；
 * - 顶部搜索、类型筛选、直接上传；
 * - 网格分页，多选跨页保留，底部一次回传；
 * - 支持把本地文件拖进弹窗上传（保存到当前文件夹）；
 * - 图片右下角放大图标 + 点击看大图。
 *
 * 所有数据走既有接口：listFolders / queryMedia / uploadImage；不新增后端契约。
 */
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  listFolders,
  queryMedia,
  type FolderItem,
  type UploadItem,
} from '../../api/adminUploads'
import { uploadImage } from '../../lib/uploadImage'
import { useApi } from '../../hooks/useApi'
import { Select } from './Select'
import { AdminIcon } from './AdminIcon'
import { MediaThumb } from './MediaThumb'
import { IconClose, IconExpand, IconPlus, IconSearch } from '../ui/Icon'
import { useToast } from './feedback'
import { isImageMedia, isVideoMedia } from '../../lib/mediaType'

const ALL = 'all'
const UNCATEGORIZED = 'uncategorized'
const PAGE_SIZE = 24
const ACCEPT =
  'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/quicktime,application/pdf,application/zip'

type PickerFilter = 'image' | 'media' | 'all'

export type MediaLibraryDialogProps = {
  /** 只选图片 / 图片+视频 / 全部 */
  filter?: PickerFilter
  /** 多选模式 */
  multiple?: boolean
  title?: string
  onClose: () => void
  onSelect: (item: UploadItem) => void
  onSelectMany?: (items: UploadItem[]) => void
}

/** 文件夹扁平化（带层级缩进；孤儿节点按顶层处理） */
function flattenFolders(folders: FolderItem[]): Array<{ folder: FolderItem; depth: number }> {
  const byParent = new Map<string | null, FolderItem[]>()
  for (const folder of folders) {
    const list = byParent.get(folder.parentId) ?? []
    list.push(folder)
    byParent.set(folder.parentId, list)
  }
  const out: Array<{ folder: FolderItem; depth: number }> = []
  const seen = new Set<string>()
  const walk = (parent: string | null, depth: number) => {
    for (const folder of byParent.get(parent) ?? []) {
      if (seen.has(folder.id)) continue
      seen.add(folder.id)
      out.push({ folder, depth })
      walk(folder.id, depth + 1)
    }
  }
  walk(null, 0)
  for (const folder of folders) {
    if (!seen.has(folder.id)) {
      seen.add(folder.id)
      out.push({ folder, depth: 0 })
      walk(folder.id, 1)
    }
  }
  return out
}

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** 按弹窗能力给出类型选项（value 为空 = 用默认组合） */
function typeOptionsOf(filter: PickerFilter): Array<{ value: string; label: string }> {
  if (filter === 'image') {
    return [
      { value: '', label: '全部图片' },
      { value: 'image/png,image/jpeg', label: 'PNG / JPG' },
      { value: 'image/svg+xml', label: 'SVG' },
      { value: 'image/gif', label: 'GIF' },
      { value: 'image/webp', label: 'WebP' },
    ]
  }
  if (filter === 'media') {
    return [
      { value: '', label: '图片 + 视频' },
      { value: 'image', label: '仅图片' },
      { value: 'video', label: '仅视频' },
    ]
  }
  return [
    { value: '', label: '全部类型' },
    { value: 'image', label: '图片' },
    { value: 'video', label: '视频' },
    { value: 'application/pdf', label: 'PDF' },
    { value: 'application/zip,application/x-7z-compressed,application/vnd.rar', label: '压缩包' },
    { value: 'text', label: '文本' },
  ]
}

export function MediaLibraryDialog({
  filter = 'all',
  multiple = false,
  title,
  onClose,
  onSelect,
  onSelectMany,
}: MediaLibraryDialogProps) {
  const toast = useToast()
  const closeRef = useRef<HTMLButtonElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [folder, setFolder] = useState<string>(ALL)
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [foldersKey, setFoldersKey] = useState(0)
  const [selected, setSelected] = useState<Map<string, UploadItem>>(() => new Map())
  const [preview, setPreview] = useState<UploadItem | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<{ name: string; percent: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)

  useEffect(() => {
    const timer = setTimeout(() => setQ(qInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [qInput])

  useEffect(() => {
    setPage(1)
  }, [folder, q, typeFilter])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (preview) setPreview(null)
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, preview])

  const foldersState = useApi((signal) => listFolders(signal), [foldersKey])
  const folders = foldersState.data?.items ?? []
  const uncategorized = foldersState.data?.uncategorized ?? 0
  const folderNodes = flattenFolders(folders)

  const baseType = filter === 'image' ? 'image' : filter === 'media' ? 'image,video' : ''
  const typeParam = typeFilter || baseType

  const mediaState = useApi(
    (signal) =>
      queryMedia(
        {
          folderId: folder === ALL ? undefined : folder,
          q: q || undefined,
          type: typeParam || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
        signal,
      ),
    [folder, q, typeParam, page, reloadKey],
  )

  const items = mediaState.data?.items ?? []
  const total = mediaState.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const typeOptions = typeOptionsOf(filter)

  const refresh = () => {
    setReloadKey((key) => key + 1)
    setFoldersKey((key) => key + 1)
  }

  const toggle = (item: UploadItem) => {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(item.id)) next.delete(item.id)
      else next.set(item.id, item)
      return next
    })
  }

  const pick = (item: UploadItem) => {
    if (multiple) {
      toggle(item)
      return
    }
    onSelect(item)
  }

  const uploadTarget = folder === ALL || folder === UNCATEGORIZED ? null : folder
  const uploadFiles = async (files: File[]) => {
    if (files.length === 0 || uploading) return
    setUploading(true)
    const uploaded: UploadItem[] = []
    let failed = 0
    for (const file of files) {
      try {
        setProgress({ name: file.name, percent: 0 })
        const item = await uploadImage(file, uploadTarget, (percent) => setProgress({ name: file.name, percent }))
        uploaded.push(item)
      } catch {
        failed += 1
      } finally {
        setProgress(null)
      }
    }
    setUploading(false)
    refresh()
    if (uploaded.length > 0) {
      if (multiple) {
        setSelected((prev) => {
          const next = new Map(prev)
          for (const item of uploaded) next.set(item.id, item)
          return next
        })
      } else {
        onSelect(uploaded[0])
        return
      }
    }
    if (failed > 0) toast.error(`${failed} 个文件上传失败`)
    else if (uploaded.length > 0) toast.success(`已上传 ${uploaded.length} 个文件`)
  }

  const onPickFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    void uploadFiles(files)
  }

  const isFileDrag = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')
  const onDrop = (event: DragEvent) => {
    if (!isFileDrag(event)) return
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    void uploadFiles(Array.from(event.dataTransfer.files ?? []))
  }

  const selectedItems = [...selected.values()]

  return (
    <div className="image-picker" role="presentation" onClick={onClose}>
      <div
        className={`image-picker__dialog media-picker__dialog${dragging ? ' is-dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? '从素材库选择'}
        onClick={(event) => event.stopPropagation()}
        onDragEnter={(event) => {
          if (!isFileDrag(event)) return
          event.preventDefault()
          dragDepth.current += 1
          setDragging(true)
        }}
        onDragOver={(event) => {
          if (!isFileDrag(event)) return
          event.preventDefault()
        }}
        onDragLeave={(event) => {
          if (!isFileDrag(event)) return
          dragDepth.current = Math.max(0, dragDepth.current - 1)
          if (dragDepth.current === 0) setDragging(false)
        }}
        onDrop={onDrop}
      >
        <div className="image-picker__head">
          <h2 className="image-picker__title">
            {title ?? '从素材库选择'}
            {multiple ? '（可多选）' : ''}
          </h2>
          <button ref={closeRef} type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            <IconClose size={16} aria-hidden="true" /> 关闭
          </button>
        </div>

        <div className="media-picker__body">
          <aside className="media-picker__side" aria-label="素材文件夹">
            <button
              type="button"
              className={`media-picker__folder${folder === ALL ? ' is-active' : ''}`}
              onClick={() => setFolder(ALL)}
            >
              全部素材
            </button>
            <button
              type="button"
              className={`media-picker__folder${folder === UNCATEGORIZED ? ' is-active' : ''}`}
              onClick={() => setFolder(UNCATEGORIZED)}
            >
              未分类 <span>{uncategorized}</span>
            </button>
            {folderNodes.map(({ folder: node, depth }) => (
              <button
                type="button"
                key={node.id}
                className={`media-picker__folder${folder === node.id ? ' is-active' : ''}`}
                style={{ paddingLeft: 12 + depth * 14 }}
                onClick={() => setFolder(node.id)}
                title={node.name}
              >
                <span className="media-picker__folder-name">{node.name}</span>
                <span>{node.fileCount}</span>
              </button>
            ))}
            {foldersState.loading && folders.length === 0 && <span className="field__hint">正在加载文件夹…</span>}
          </aside>

          <section className="media-picker__main">
            <div className="media-picker__toolbar">
              <span className="media-picker__search">
                <IconSearch size={16} aria-hidden="true" />
                <input
                  className="input"
                  value={qInput}
                  placeholder="搜索素材名称"
                  aria-label="搜索素材名称"
                  onChange={(event) => setQInput(event.target.value)}
                />
              </span>
              <Select
                className="media-picker__type"
                value={typeFilter}
                onChange={setTypeFilter}
                options={typeOptions}
                aria-label="类型筛选"
              />
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <IconPlus size={14} aria-hidden="true" />
                {uploading ? `上传中${progress ? ` ${progress.percent}%` : ''}` : '上传文件'}
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="image-field__file"
              aria-label="上传素材"
              onChange={onPickFiles}
            />

            <div className="media-picker__grid-wrap">
              {mediaState.loading && items.length === 0 && <p className="admin-page__desc">正在加载素材…</p>}
              {mediaState.error && (
                <div className="alert alert--danger" role="alert">
                  {mediaState.error.message}
                </div>
              )}
              {!mediaState.loading && items.length === 0 && !mediaState.error && (
                <div className="media-picker__empty">
                  <p>当前条件下没有素材</p>
                  <p className="field__hint">可切换文件夹、清空搜索，或直接把文件拖进来上传。</p>
                </div>
              )}
              {items.length > 0 && (
                <div className="media-picker__grid">
                  {items.map((item) => {
                    const image = isImageMedia(item)
                    const video = isVideoMedia(item)
                    const checked = selected.has(item.id)
                    return (
                      <div
                        className={`media-picker__tile${checked ? ' is-picked' : ''}`}
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        title={item.name}
                        onClick={() => pick(item)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            pick(item)
                          }
                        }}
                      >
                        <span className="media-picker__thumb">
                          {image ? (
                            <MediaThumb src={item.url} alt={item.name} />
                          ) : (
                            <span className="media-picker__file">
                              <AdminIcon name={video ? 'video' : 'doc'} size={26} />
                              {video ? '视频' : item.name.split('.').pop()?.toUpperCase() || '文件'}
                            </span>
                          )}
                        </span>
                        {multiple && (
                          <span className="media-picker__check" aria-hidden="true">
                            {checked ? '✓' : ''}
                          </span>
                        )}
                        {image && (
                          <button
                            type="button"
                            className="media-picker__zoom"
                            title="放大预览"
                            aria-label={`放大预览「${item.name}」`}
                            onClick={(event) => {
                              event.stopPropagation()
                              setPreview(item)
                            }}
                          >
                            <IconExpand size={13} />
                          </button>
                        )}
                        <span className="media-picker__name">{item.name}</span>
                        <span className="media-picker__meta">{formatSize(item.size)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="media-picker__pager">
              <span className="field__hint">共 {total} 个</span>
              <div className="media-picker__pager-actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  上一页
                </button>
                <span className="media-picker__page">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                >
                  下一页
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="image-picker__foot">
          <span className="image-picker__count">
            {multiple ? `已选 ${selectedItems.length} 个` : '单击素材即可选择'}
          </span>
          <div className="image-picker__foot-actions">
            {multiple && selectedItems.length > 0 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelected(new Map())}>
                清空
              </button>
            )}
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
              取消
            </button>
            {multiple && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={selectedItems.length === 0}
                onClick={() => {
                  if (selectedItems.length > 0) onSelectMany?.(selectedItems)
                }}
              >
                添加所选
              </button>
            )}
          </div>
        </div>

        {dragging && (
          <div className="media-picker__drop" aria-hidden="true">
            <IconPlus size={26} />
            <strong>松开即可上传</strong>
            <span>保存到「{folder === ALL ? '未分类' : folder === UNCATEGORIZED ? '未分类' : folderNodes.find((node) => node.folder.id === folder)?.folder.name || '当前文件夹'}」</span>
          </div>
        )}

        {preview && (
          <div className="media-picker__preview" role="presentation" onClick={() => setPreview(null)}>
            <div className="media-picker__preview-body" onClick={(event) => event.stopPropagation()}>
              <MediaThumb src={preview.url} alt={preview.name} loading="eager" />
              <div className="media-picker__preview-bar">
                <span>{preview.name}</span>
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => setPreview(null)}>
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
