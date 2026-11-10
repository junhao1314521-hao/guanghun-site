import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteAdminResource, fetchAdminResource, saveAdminResource } from '../../api/admin'
import { uploadFile } from '../../api/adminUploads'
import type { AdminRow } from '../../data/admin'
import { WALLPAPER_THEME_OPTIONS } from '../../data/wallpapers'
import { useApi } from '../../hooks/useApi'
import { AdminPageHead } from '../../components/admin/AdminPageHead'
import { Select } from '../../components/admin/Select'
import { useConfirm, useToast } from '../../components/admin/feedback'
import { EmptyState, ErrorState, SkeletonTable } from '../../components/admin/states'
import '../../styles/admin-wallpapers.css'

const MAX_FILE = 10 * 1024 * 1024
const THEME_VALUES = WALLPAPER_THEME_OPTIONS.map((theme) => theme.value)

/** 字节数 → 展示文本 */
function formatSize(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** 文件名 → 壁纸标题（去扩展名、连字符转空格） */
function titleFromFile(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || '未命名壁纸'
}

/** 读取图片像素尺寸（仅本地解码，不上传） */
function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取图片尺寸，请确认文件未损坏'))
    }
    img.src = url
  })
}

/** 只接受图片且 ≤ 10MB */
function validateFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return `${file.name} 不是图片文件`
  if (file.size > MAX_FILE) return `${file.name} 超过 10MB`
  return null
}

type BatchEntry = {
  id: string
  file: File
  preview: string
  title: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  message?: string
}

/** 单行「替换图片」：上传后保持标题 / 主题 / 精选等字段不变，仅替换文件与尺寸 */
function ReplaceButton({ row, onDone }: { row: AdminRow; onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const problem = validateFile(file)
    if (problem) {
      toast.error(problem)
      return
    }
    setBusy(true)
    try {
      const dims = await readImageSize(file)
      const item = await uploadFile(file)
      await saveAdminResource('wallpapers', String(row.id), {
        ...row,
        fileUrl: item.url,
        width: dims.width,
        height: dims.height,
        size: formatSize(item.size),
      })
      toast.success('图片已替换，其它字段保持不变')
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '替换失败，请稍后重试')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
      <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? '替换中…' : '替换图片'}
      </button>
    </>
  )
}

/** 批量上传弹层：多选 / 拖拽图片 → 选主题 → 逐张上传并生成壁纸记录 */
function BatchUploadDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const [theme, setTheme] = useState<string>(THEME_VALUES[0])
  const [entries, setEntries] = useState<BatchEntry[]>([])
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const previewsRef = useRef<string[]>([])
  const [dragging, setDragging] = useState(false)

  // 关闭时释放全部预览图 URL，避免内存泄漏
  useEffect(() => {
    const previews = previewsRef.current
    return () => previews.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return
    const accepted: BatchEntry[] = []
    for (const file of Array.from(list)) {
      const problem = validateFile(file)
      if (problem) {
        toast.error(problem)
        continue
      }
      const preview = URL.createObjectURL(file)
      previewsRef.current.push(preview)
      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        preview,
        title: titleFromFile(file.name),
        status: 'pending',
        progress: 0,
      })
    }
    if (accepted.length === 0) return
    setEntries((prev) => {
      const seen = new Set(prev.map((entry) => entry.id))
      return [...prev, ...accepted.filter((entry) => !seen.has(entry.id))]
    })
  }

  const patch = (id: string, next: Partial<BatchEntry>) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...next } : entry)))
  }

  const remove = (id: string) => {
    setEntries((prev) => {
      const target = prev.find((entry) => entry.id === id)
      if (target) {
        URL.revokeObjectURL(target.preview)
        previewsRef.current = previewsRef.current.filter((url) => url !== target.preview)
      }
      return prev.filter((entry) => entry.id !== id)
    })
  }

  const uploadAll = async () => {
    const queue = entries.filter((entry) => entry.status === 'pending' || entry.status === 'error')
    if (queue.length === 0) {
      toast.info('请先选择要上传的图片')
      return
    }
    setBusy(true)
    let ok = 0
    let fail = 0
    for (const entry of queue) {
      patch(entry.id, { status: 'uploading', progress: 0, message: undefined })
      try {
        const dims = await readImageSize(entry.file)
        const item = await uploadFile(entry.file, null, (percent) => patch(entry.id, { progress: percent }))
        await saveAdminResource('wallpapers', undefined, {
          title: entry.title,
          desc: '',
          theme,
          fileUrl: item.url,
          width: dims.width,
          height: dims.height,
          size: formatSize(item.size),
          featured: false,
          date: new Date().toISOString().slice(0, 10),
        })
        patch(entry.id, { status: 'done', progress: 100 })
        ok += 1
      } catch (error) {
        patch(entry.id, { status: 'error', message: error instanceof Error ? error.message : '上传失败' })
        fail += 1
      }
    }
    setBusy(false)
    if (ok > 0) toast.success(`已上传 ${ok} 张壁纸${fail > 0 ? `，${fail} 张失败` : ''}`)
    onDone()
    if (fail === 0) onClose()
  }

  const pending = entries.filter((entry) => entry.status === 'pending' || entry.status === 'error').length

  return (
    <div className="admin-dialog-overlay" role="presentation" onClick={() => (busy ? null : onClose())}>
      <div
        className="admin-dialog admin-dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wp-batch-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="admin-dialog__title" id="wp-batch-title">
          批量上传壁纸
        </h2>
        <div className="admin-dialog__body">
          <div
            className={`wp-admin-drop${dragging ? ' is-dragging' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              addFiles(event.dataTransfer.files)
            }}
          >
            <p>把图片拖到这里，或</p>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => inputRef.current?.click()}>
              选择图片
            </button>
            <span>支持 JPG / PNG / WebP，单张 ≤ 10MB，建议 16:9</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                addFiles(event.target.files)
                event.target.value = ''
              }}
            />
          </div>

          <div className="wp-admin-themes" role="radiogroup" aria-label="壁纸主题">
            {WALLPAPER_THEME_OPTIONS.map((item) => (
              <label key={item.value} className={`wp-admin-theme${theme === item.value ? ' is-active' : ''}`}>
                <input
                  type="radio"
                  name="wp-batch-theme"
                  value={item.value}
                  checked={theme === item.value}
                  disabled={busy}
                  onChange={() => setTheme(item.value)}
                />
                <strong>{item.value}</strong>
                <span>{item.desc}</span>
              </label>
            ))}
          </div>

          {entries.length > 0 && (
            <ul className="wp-admin-files">
              {entries.map((entry) => (
                <li key={entry.id} className={`wp-admin-file is-${entry.status}`}>
                  <img src={entry.preview} alt="" />
                  <div className="wp-admin-file__body">
                    <strong>{entry.title}</strong>
                    <span>
                      {formatSize(entry.file.size)}
                      {entry.status === 'uploading' ? ` · 上传中 ${entry.progress}%` : ''}
                      {entry.status === 'done' ? ' · 已完成' : ''}
                      {entry.status === 'error' ? ` · ${entry.message ?? '失败'}` : ''}
                    </span>
                    {entry.status === 'uploading' && (
                      <span className="wp-admin-file__bar">
                        <i style={{ width: `${entry.progress}%` }} />
                      </span>
                    )}
                  </div>
                  <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => remove(entry.id)}>
                    移除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="admin-dialog__foot">
          <span className="wp-admin-batch-count">{pending > 0 ? `待上传 ${pending} 张` : '选择图片后可上传'}</span>
          <button type="button" className="btn btn--secondary" disabled={busy} onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn btn--primary" disabled={busy || pending === 0} onClick={() => void uploadAll()}>
            {busy ? '上传中…' : '开始上传'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 品牌壁纸后台列表（自定义页，覆盖通用列表）：
 * - 批量上传：多选 / 拖拽图片，统一选择主题，自动读取尺寸与体积；
 * - 替换图片：保留标题、主题、精选等字段，只更新文件与尺寸；
 * - 主题快捷编辑：表格内直接切换主题，即时保存；
 * - 编辑仍进入通用表单 `/admin/wallpapers/:id`。
 */
export function AdminWallpapersPage() {
  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error } = useApi((signal) => fetchAdminResource('wallpapers', signal), [reloadKey])
  const [rows, setRows] = useState<AdminRow[]>([])
  const [keyword, setKeyword] = useState('')
  const [themeFilter, setThemeFilter] = useState('all')
  const [batchOpen, setBatchOpen] = useState(false)
  const confirm = useConfirm()
  const toast = useToast()

  useEffect(() => {
    if (data) setRows(data.items)
  }, [data])

  const reload = () => setReloadKey((key) => key + 1)

  const filtered = rows.filter((row) => {
    const title = String(row.title ?? '').toLowerCase()
    const matchKeyword = !keyword.trim() || title.includes(keyword.trim().toLowerCase())
    const matchTheme = themeFilter === 'all' || row.theme === themeFilter
    return matchKeyword && matchTheme
  })

  const changeTheme = async (row: AdminRow, theme: string) => {
    const previous = row.theme
    setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, theme } : item)))
    try {
      await saveAdminResource('wallpapers', String(row.id), { ...row, theme })
      toast.success('主题已更新')
    } catch (exception) {
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, theme: previous } : item)))
      toast.error(exception instanceof Error ? exception.message : '主题更新失败')
    }
  }

  const remove = async (row: AdminRow) => {
    const ok = await confirm({
      title: '删除壁纸',
      message: `确定删除《${String(row.title ?? '')}》？删除后前台立即不可见。`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteAdminResource('wallpapers', String(row.id))
      toast.success('壁纸已删除')
      reload()
    } catch (exception) {
      toast.error(exception instanceof Error ? exception.message : '删除失败')
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHead
        title="品牌壁纸"
        desc="批量上传、替换图片与主题快捷编辑；点击标题进入通用表单修改文案与精选。"
        actions={
          <>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setBatchOpen(true)}>
              批量上传
            </button>
            <Link className="btn btn--primary btn--sm" to="/admin/wallpapers/new">
              新建
            </Link>
          </>
        }
      />

      <div className="admin-toolbar">
        <div className="admin-toolbar__search search">
          <input
            className="input"
            type="search"
            placeholder="搜索标题"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
        <div className="wp-admin-filter">
          <span>主题</span>
          <Select
            value={themeFilter}
            onChange={setThemeFilter}
            options={[{ value: 'all', label: '全部主题' }, ...THEME_VALUES.map((value) => ({ value, label: value }))]}
            aria-label="按主题筛选"
          />
        </div>
        <span className="admin-toolbar__spacer" />
        <span className="admin-table__count">共 {filtered.length} 条</span>
      </div>

      <div className="admin-table-wrap">
        {loading && rows.length === 0 ? (
          <SkeletonTable columns={7} />
        ) : error && rows.length === 0 ? (
          <div className="admin-table__empty">
            <ErrorState message={error.message} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-table__empty">
            <EmptyState title="暂无壁纸" desc="调整搜索或筛选条件，或批量上传新的壁纸。" />
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="table admin-table wp-admin-table">
              <thead>
                <tr>
                  <th scope="col">预览</th>
                  <th scope="col">标题</th>
                  <th scope="col">主题</th>
                  <th scope="col">尺寸</th>
                  <th scope="col">体积</th>
                  <th scope="col">精选</th>
                  <th scope="col">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={String(row.id)}>
                    <td>
                      <img className="wp-admin-thumb" src={String(row.fileUrl ?? '')} alt="" loading="lazy" />
                    </td>
                    <td>
                      <Link className="wp-admin-title" to={`/admin/wallpapers/${String(row.id)}`}>
                        {String(row.title ?? '未命名')}
                      </Link>
                      <span className="wp-admin-date">{String(row.date ?? '')}</span>
                    </td>
                    <td>
                      <select
                        className="wp-admin-theme-select"
                        value={String(row.theme ?? THEME_VALUES[0])}
                        aria-label={`修改《${String(row.title ?? '')}》的主题`}
                        onChange={(event) => void changeTheme(row, event.target.value)}
                      >
                        {THEME_VALUES.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="mono">
                      {String(row.width ?? '—')} × {String(row.height ?? '—')}
                    </td>
                    <td className="mono">{String(row.size ?? '—')}</td>
                    <td>
                      <span className={`tag${row.featured ? ' tag--accent' : ''}`}>{row.featured ? '精选' : '—'}</span>
                    </td>
                    <td>
                      <div className="wp-admin-actions">
                        <Link className="btn btn--ghost btn--sm" to={`/admin/wallpapers/${String(row.id)}`}>
                          编辑
                        </Link>
                        <ReplaceButton row={row} onDone={reload} />
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void remove(row)}>
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
      </div>

      {batchOpen && (
        <BatchUploadDialog
          onClose={() => setBatchOpen(false)}
          onDone={() => {
            reload()
            setKeyword('')
            setThemeFilter('all')
          }}
        />
      )}
    </div>
  )
}
