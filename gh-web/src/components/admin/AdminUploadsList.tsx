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
import { Link } from 'react-router-dom'
import {
  CATEGORY_LABELS,
  createFolder,
  deleteFolder,
  deleteUpload,
  fetchUploadReferences,
  listFolders,
  replaceUpload,
  MEDIA_CATEGORIES,
  moveUploads,
  queryMedia,
  updateFolder,
  updateUpload,
  type FolderItem,
  type MediaCategory,
  type UploadItem,
  type UploadReference,
} from '../../api/adminUploads'
import { uploadImage } from '../../lib/uploadImage'
import { useApi } from '../../hooks/useApi'
import { AdminIcon } from './AdminIcon'
import { AdminPageHead } from './AdminPageHead'
import { Select } from './Select'
import { EmptyState, ErrorState, SkeletonGallery } from './states'
import { MediaImg } from '../ui/MediaImg'
import { registerSrcSet } from '../ui/mediaSrcSet'
import { OverflowMenu } from './OverflowMenu'
import { IconClose, IconPlus, IconSearch } from '../ui/Icon'
import { useConfirm, useToast } from './feedback'

/** 允许上传的类型（与后端白名单一致：图片 / 视频 / PDF / 文本 / Office / 压缩包） */
const UPLOAD_ACCEPT = [
  'image/png,image/jpeg,image/webp,image/gif,image/svg+xml',
  'video/mp4,video/webm,video/quicktime',
  'application/pdf',
  'text/plain,text/markdown,text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip,application/vnd.rar,application/x-7z-compressed',
].join(',')

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

/** 组件：渲染素材库，支持文件夹管理、上传、筛选、移动与删除素材。 */
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
  // 大文件上传进度：{ 当前文件名, 百分比 }；非上传中为 null
  const [uploadProgress, setUploadProgress] = useState<{ name: string; percent: number } | null>(null)
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const [moveTarget, setMoveTarget] = useState<string>('')

  // 文件夹新建 / 重命名
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)
  // 替换文件：目标素材 + 上传进度（保持 URL 不变）
  const replaceTargetRef = useRef<UploadItem | null>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const [replacing, setReplacing] = useState<{ id: string; percent: number } | null>(null)
  /** 大图 / PDF 预览 */
  const [preview, setPreview] = useState<UploadItem | null>(null)
  /** 引用位置弹窗 */
  const [refsDialog, setRefsDialog] = useState<{
    name: string
    count: number
    refs: UploadReference[]
    loading: boolean
  } | null>(null)

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
        setUploadProgress({ name: file.name, percent: 0 })
        // 图片会附带多尺寸变体（位图），其余文件等同普通上传
        await uploadImage(file, uploadTargetId || null, (percent) =>
          setUploadProgress({ name: file.name, percent }),
        )
        ok += 1
      } catch (ex) {
        failed += 1
        lastError = ex instanceof Error ? ex.message : '上传失败'
      } finally {
        setUploadProgress(null)
      }
    }
    setUploading(false)
    refresh()
    if (failed === 0) toast.success(`已上传 ${ok} 个文件`)
    else if (ok === 0) toast.error(`上传失败：${lastError}`)
    else toast.toast(`成功 ${ok} 个，失败 ${failed} 个（${lastError}）`, 'info')
  }

  /* ---------- 素材操作 ---------- */
  /** 打开引用位置弹窗：列出页面 / 站点配置 / 集合记录，并可跳到对应编辑页 */
  const openReferences = async (item: UploadItem) => {
    setRefsDialog({ name: item.name, count: 0, refs: [], loading: true })
    try {
      const report = await fetchUploadReferences(item.id)
      setRefsDialog({ name: item.name, count: report.count, refs: report.refs, loading: false })
    } catch {
      setRefsDialog({ name: item.name, count: 0, refs: [], loading: false })
    }
  }

  // 预览 / 引用弹窗：Esc 关闭
  useEffect(() => {
    if (!preview && !refsDialog) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setPreview(null)
      setRefsDialog(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [preview, refsDialog])

  /** 打开替换文件选择框（accept 限定为原扩展名，避免换类型导致 URL 语义不一致） */
  const onPickReplace = (item: UploadItem) => {
    const ext = item.name.includes('.') ? item.name.slice(item.name.lastIndexOf('.') + 1) : ''
    replaceTargetRef.current = item
    if (!replaceRef.current) return
    replaceRef.current.accept = ext ? `.${ext}` : ''
    replaceRef.current.value = ''
    replaceRef.current.click()
  }

  const onReplaceFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    const target = replaceTargetRef.current
    if (!file || !target) return
    const extOf = (name: string) => (name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '')
    const targetExt = extOf(target.name)
    if (targetExt && extOf(file.name) && targetExt !== extOf(file.name)) {
      toast.error(`新文件需保持 .${targetExt} 扩展名：链接地址不变，换类型会导致前台打开方式出错`)
      return
    }
    const ok = await confirm({
      title: '替换文件',
      message: (
        <div>
          <p style={{ margin: 0 }}>{`用「${file.name}」替换「${target.name}」？`}</p>
          <p style={{ margin: '10px 0 0', opacity: 0.75 }}>
            文件名与公开地址保持不变，引用它的页面 / 产品 / 下载记录都会自动指向新文件。
          </p>
        </div>
      ),
      confirmText: '替换',
    })
    if (!ok) return
    setReplacing({ id: target.id, percent: 0 })
    try {
      await replaceUpload(target.id, file, (percent) =>
        setReplacing((current) => (current && current.id === target.id ? { ...current, percent } : current)),
      )
      refresh()
      toast.success(`已替换「${target.name}」`)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '替换失败')
    } finally {
      setReplacing(null)
      replaceTargetRef.current = null
    }
  }

  const onDelete = async (item: UploadItem) => {
    // 删除前查询引用明细（页面 / 草稿 / 站点配置 / 集合记录）；查询失败则回退到通用文案，不阻断删除
    let refCount: number | null = null
    let refs: UploadReference[] = []
    try {
      const report = await fetchUploadReferences(item.id)
      refCount = report.count
      refs = report.refs
    } catch {
      refCount = null
    }
    const refNote =
      refCount === null
        ? '删除后引用该素材的位置将无法显示。'
        : refCount > 0
          ? `该素材当前被 ${refCount} 处引用，删除后这些位置将无法显示。`
          : '该素材当前未被引用。'
    const ok = await confirm({
      title: '删除素材',
      message: (
        <div>
          <p style={{ margin: 0 }}>{`确认删除「${item.name}」？${refNote}`}</p>
          {refs.length > 0 && (
            <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
              {refs.slice(0, 6).map((ref) => (
                <li key={ref.location}>{ref.location}</li>
              ))}
              {refCount !== null && refCount > 6 && <li>…等共 {refCount} 处</li>}
            </ul>
          )}
          <p style={{ margin: '10px 0 0', opacity: 0.75 }}>删除后可在「回收站」恢复。</p>
        </div>
      ),
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      // 仍被引用时带 force，避免后端 409 二次拦截
      await deleteUpload(item.id, refs.length > 0)
      refresh()
      toast.success(`已删除「${item.name}」`)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '删除失败')
    }
  }

  const onBulkDelete = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    // 先批量查引用，确认框里直接列出「哪些素材还被用、用在哪」
    const reports = await Promise.all(
      ids.map(async (id) => {
        try {
          return await fetchUploadReferences(id)
        } catch {
          return null
        }
      }),
    )
    const referenced = reports.filter((report): report is NonNullable<typeof report> => Boolean(report && report.count > 0))
    const refTotal = referenced.reduce((sum, report) => sum + report.count, 0)
    const samples = referenced.slice(0, 4).flatMap((report) => report.refs.slice(0, 2).map((ref) => ref.location))
    const ok = await confirm({
      title: '批量删除素材',
      message: (
        <div>
          <p style={{ margin: 0 }}>
            {`确认删除选中的 ${ids.length} 个素材？`}
            {referenced.length > 0
              ? `其中 ${referenced.length} 个仍被引用（共 ${refTotal} 处），删除后对应位置将无法显示。`
              : '这些素材当前未被引用。'}
          </p>
          {samples.length > 0 && (
            <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
              {samples.map((location) => (
                <li key={location}>{location}</li>
              ))}
              {refTotal > samples.length && <li>…等共 {refTotal} 处</li>}
            </ul>
          )}
          <p style={{ margin: '10px 0 0', opacity: 0.75 }}>删除后可在「回收站」恢复。</p>
        </div>
      ),
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    let failed = 0
    let done = 0
    for (const [index, id] of ids.entries()) {
      try {
        const refCount = reports[index]?.count ?? 0
        await deleteUpload(id, refCount > 0)
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
                上传中{uploadProgress ? ` ${uploadProgress.percent}%` : '…'}
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

      {/* 替换文件：单文件，accept 由点击时按原扩展名设置 */}
      <input
        ref={replaceRef}
        type="file"
        className="image-field__file"
        aria-label="替换素材文件"
        onChange={onReplaceFile}
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
            <Select
              className="admin-media__type"
              value={typeFilter}
              aria-label="按类型筛选"
              onChange={setTypeFilter}
              options={TYPE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            />
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
              <Select
                value={uploadTargetId}
                aria-label="上传目标文件夹"
                onChange={setUploadTargetId}
                options={[{ value: '', label: '未分类' }, ...folders.map((folder) => ({ value: folder.id, label: folder.name }))]}
              />
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
                <Select
                  value={moveTarget}
                  aria-label="移动到文件夹"
                  onChange={setMoveTarget}
                  options={[{ value: '', label: '未分类' }, ...folders.map((folder) => ({ value: folder.id, label: folder.name }))]}
                />
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
            <SkeletonGallery />
          ) : mediaState.error ? (
            <div className="admin-table-wrap">
              <div className="admin-table__empty">
                <ErrorState message={mediaState.error.message} onRetry={refresh} />
              </div>
            </div>
          ) : isEmpty ? (
            <div className="admin-table-wrap">
              <div className="admin-table__empty">
                <EmptyState
                  icon="cloud"
                  title="暂无素材"
                  desc={
                    folderId === ALL && !category && !typeFilter && !q
                      ? '点击右上角「上传素材」添加第一个文件。'
                      : '当前筛选条件下没有素材，试试切换文件夹或清空筛选。'
                  }
                />
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
                      {item.refCount ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          title="查看被哪些页面 / 记录引用"
                          onClick={() => void openReferences(item)}
                        >
                          引用 {item.refCount}
                        </button>
                      ) : null}
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPreview(item)}>
                        预览
                      </button>
                      <Select
                        className="admin-upload-tile__cat"
                        value={item.category}
                        aria-label={`「${item.name}」分类`}
                        title="手工覆盖分类"
                        onChange={(next) => void onCategory(item, next as MediaCategory)}
                        options={MEDIA_CATEGORIES.map((key) => ({ value: key, label: CATEGORY_LABELS[key] }))}
                      />
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        title="保持链接不变，用新文件替换"
                        disabled={replacing !== null}
                        onClick={() => onPickReplace(item)}
                      >
                        {replacing?.id === item.id ? `替换中 ${replacing.percent}%` : '替换'}
                      </button>
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

      {/* 预览弹窗：图片 / PDF / 视频内嵌，其它类型给公开地址 */}
      {preview && (
        <div className="admin-dialog-overlay" role="presentation" onClick={() => setPreview(null)}>
          <div
            className="admin-dialog admin-dialog--preview"
            role="dialog"
            aria-modal="true"
            aria-label={`预览 ${preview.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="admin-dialog__title">{preview.name}</h2>
            <div className="admin-dialog__body admin-preview__body">
              {preview.type.startsWith('image/') ? (
                <img className="admin-preview__img" src={preview.url} alt={preview.name} />
              ) : preview.type === 'application/pdf' || /\.pdf$/i.test(preview.name) ? (
                <iframe className="admin-preview__frame" src={preview.url} title={preview.name} />
              ) : preview.type.startsWith('video/') ? (
                <video className="admin-preview__video" src={preview.url} controls />
              ) : (
                <p style={{ margin: 0 }}>
                  该类型不支持内嵌预览，可
                  <a href={preview.url} target="_blank" rel="noreferrer">
                    在新窗口打开
                  </a>
                  （{formatSize(preview.size)}）。
                </p>
              )}
            </div>
            <div className="admin-dialog__foot">
              <a className="btn btn--ghost btn--sm" href={preview.url} target="_blank" rel="noreferrer">
                新窗口打开
              </a>
              <button className="btn btn--secondary btn--sm" type="button" onClick={() => setPreview(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 引用位置弹窗：点位置可跳到对应编辑页 */}
      {refsDialog && (
        <div className="admin-dialog-overlay" role="presentation" onClick={() => setRefsDialog(null)}>
          <div
            className="admin-dialog admin-dialog--wide"
            role="dialog"
            aria-modal="true"
            aria-label="素材引用位置"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="admin-dialog__title">「{refsDialog.name}」的引用位置</h2>
            <div className="admin-dialog__body">
              {refsDialog.loading ? (
                <p style={{ margin: 0 }}>正在统计…</p>
              ) : refsDialog.count === 0 ? (
                <p style={{ margin: 0 }}>当前没有页面或记录引用该素材。</p>
              ) : (
                <>
                  <p style={{ margin: '0 0 8px' }}>
                    共 {refsDialog.count} 处
                    {refsDialog.count > refsDialog.refs.length ? `（列出前 ${refsDialog.refs.length} 处）` : ''}：
                  </p>
                  <ul className="admin-refs">
                    {refsDialog.refs.map((ref) => (
                      <li key={ref.location}>
                        {ref.to ? (
                          <Link to={ref.to} onClick={() => setRefsDialog(null)}>
                            {ref.location}
                          </Link>
                        ) : (
                          ref.location
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="admin-dialog__foot">
              <button className="btn btn--secondary btn--sm" type="button" onClick={() => setRefsDialog(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
