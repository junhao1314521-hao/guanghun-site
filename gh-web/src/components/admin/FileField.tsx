/**
 * 通用文件 / 图片字段控件（后台表单 / 区块编辑器共用）。
 * ============================================================
 * 由原 `ImageField` 泛化而来（同一套「地址输入 + 上传 + 素材库选择」交互），
 * 通过 `variant` 二选一：
 * - `variant="image"`：仅接受图片（png/jpg/jpeg/webp/gif/svg），素材库只列图片、展示缩略图；
 *   `ImageField` 即本组件在 image 模式下的薄封装，行为与既有实现一致。
 * - `variant="file"`：接受任意允许类型文件（与后端上传白名单一致：图片 / pdf / zip / txt / md），
 *   素材库列出全部素材，非图片以文件名 + 图标呈现（供「下载资源」的 fileUrl 使用）。
 *
 * - 上传：原始字节流上传（见 api/adminUploads），上传中展示 loading，失败可见报错（不静默）。
 * - 纯受控：值经 onChange 回传父级。
 */
import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { listUploads, type UploadItem } from '../../api/adminUploads'
import { uploadImage } from '../../lib/uploadImage'
import { useApi } from '../../hooks/useApi'
import { AdminIcon } from './AdminIcon'
import { MediaImg } from '../ui/MediaImg'
import { registerSrcSet } from '../ui/mediaSrcSet'

/** 允许上传的图片类型（与后端白名单的交集）；同时以扩展名兜底判断（部分浏览器 MIME 为空） */
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml'
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg)$/i
const VIDEO_EXT = /\.(mp4|webm|mov)$/i

/** 允许的「媒体」类型：图片 / GIF / 视频（用于卡片、通栏等标注「媒体（图/视频/GIF）」的字段） */
const MEDIA_ACCEPT = `${IMAGE_ACCEPT},video/mp4,video/webm,video/quicktime`

/** 允许上传的非图片文件类型（与后端白名单一致；图片另行允许） */
const FILE_ACCEPT =
  'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/quicktime,application/pdf,application/zip,text/plain,text/markdown'

/** 是否图片素材（按 MIME，回退扩展名） */
function isImage(item: { type: string; name?: string }): boolean {
  if (item.type?.startsWith('image/')) return true
  return item.name ? IMAGE_EXT.test(item.name) : false
}

/** 是否视频素材（按 MIME，回退扩展名） */
function isVideo(item: { type: string; name?: string }): boolean {
  if (item.type?.startsWith('video/')) return true
  return item.name ? VIDEO_EXT.test(item.name) : false
}

export type FileFieldProps = {
  /** 当前地址（受控） */
  value: string
  /** 地址变化回调（手动输入 / 上传成功 / 素材库选择） */
  onChange: (url: string) => void
  /** 地址输入框 id（用于与 label 关联） */
  inputId?: string
  /** 字段名（用于无障碍标签 / 预览 alt） */
  label?: string
  /** 输入框占位文案 */
  placeholder?: string
  /** 预览图额外 class（兼容原 ImageField 用法） */
  previewClassName?: string
  /** 形态：image（仅图片）/ media（图片 + 视频 + GIF）/ file（任意允许类型）；默认 file */
  variant?: 'image' | 'media' | 'file'
}

export function FileField({
  value,
  onChange,
  inputId,
  label,
  placeholder,
  previewClassName,
  variant = 'file',
}: FileFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const url = value.trim()
  const isImageMode = variant === 'image'
  const isMediaMode = variant === 'media'
  const accept = isImageMode ? IMAGE_ACCEPT : isMediaMode ? MEDIA_ACCEPT : FILE_ACCEPT

  const onPickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // 复位，允许重复选择同一文件
    if (!file) return
    setError(null)
    const meta = { type: file.type, name: file.name }
    if (isImageMode && !isImage(meta)) {
      setError('仅支持图片文件（png / jpg / jpeg / webp / gif / svg）')
      return
    }
    if (isMediaMode && !isImage(meta) && !isVideo(meta)) {
      setError('仅支持图片（含 GIF）或视频（mp4 / webm / mov）')
      return
    }
    setUploading(true)
    try {
      // 图片会附带多尺寸变体（位图），其余文件等同普通上传
      const item = await uploadImage(file)
      onChange(item.url)
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : '上传失败，请稍后重试')
    } finally {
      setUploading(false)
    }
  }

  const urlIsVideo = isVideo({ type: '', name: url })

  return (
    <div className="image-field">
      <div className="image-field__row">
        <input
          id={inputId}
          className="input"
          type="text"
          placeholder={
            placeholder ??
            (isImageMode ? '图片资源地址（URL 或 /uploads/...）' : isMediaMode ? '图片 / 视频地址（URL 或 /uploads/...）' : '文件地址（URL 或 /uploads/...）')
          }
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className={`btn btn--secondary btn--sm${uploading ? ' btn--loading' : ''}`}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              上传中…
            </>
          ) : (
            '上传'
          )}
        </button>
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => setPickerOpen(true)} disabled={uploading}>
          素材库
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="image-field__file"
          aria-label={label ? `上传${label}` : isImageMode ? '上传图片' : isMediaMode ? '上传图片或视频' : '上传文件'}
          onChange={onPickFile}
        />
      </div>

      {error && (
        <p className="image-field__error" role="alert">
          {error}
        </p>
      )}

      {url && urlIsVideo ? (
        <div className="image-field__preview">
          <video
            src={url}
            className={previewClassName ?? 'image-field__video'}
            controls
            muted
            playsInline
            preload="metadata"
          />
        </div>
      ) : url && (isImageMode || isMediaMode || isImage({ type: '', name: url })) ? (
        <div className="image-field__preview">
          <MediaImg src={url} alt={label ?? '图片预览'} className={previewClassName ?? 'image-field__img'} loading="lazy" />
        </div>
      ) : url ? (
        <div className="image-field__preview">
          <span className="file-field__chip">
            <AdminIcon name="doc" size={16} />
            <a href={url} target="_blank" rel="noreferrer">
              {url.split('/').pop() || url}
            </a>
          </span>
        </div>
      ) : (
        <span className="field__hint">
          {isImageMode
            ? '填写地址、上传或从素材库选择后，此处显示预览缩略图'
            : isMediaMode
              ? '支持图片 / GIF / 视频；上传或从素材库选择后此处显示预览'
              : '填写地址、上传或从素材库选择文件'}
        </span>
      )}

      {pickerOpen && (
        <MediaPickerDialog
          filter={isImageMode ? 'image' : isMediaMode ? 'media' : 'all'}
          onClose={() => setPickerOpen(false)}
          onSelect={(item) => {
            onChange(item.url)
            setError(null)
            setPickerOpen(false)
          }}
        />
      )}
    </div>
  )
}

/**
 * 素材库选择弹窗：列出 GET /api/admin/uploads 中的素材。
 * `filter`：`image` 只列图片；`media` 列图片 + 视频（含 GIF）；`all` 列全部素材。
 * 键盘可达：打开即聚焦关闭按钮，Esc 关闭，点遮罩关闭。
 */
export function MediaPickerDialog({
  filter = 'all',
  onClose,
  onSelect,
}: {
  filter?: 'image' | 'media' | 'all'
  onClose: () => void
  onSelect: (item: UploadItem) => void
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [reloadKey, setReloadKey] = useState(0)
  // 取数复用 useApi（统一 loading / error / 中止语义）
  const state = useApi<UploadItem[]>(
    (signal) =>
      listUploads(signal).then((list) => {
        if (filter === 'image') return list.filter((item) => isImage(item))
        if (filter === 'media') return list.filter((item) => isImage(item) || isVideo(item))
        return list
      }),
    [reloadKey, filter],
  )
  const items = state.data
  const emptyText = filter === 'image' ? '素材库暂无图片' : filter === 'media' ? '素材库暂无图片或视频' : '素材库暂无素材'

  // 拿到素材数据即预登记变体（url → srcset），避免缩略图再各发一次变体查询
  useEffect(() => {
    for (const item of items ?? []) registerSrcSet(item.url, item.variants)
  }, [items])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="image-picker" role="presentation" onClick={onClose}>
      <div
        className="image-picker__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="image-picker__head">
          <h2 className="image-picker__title" id={titleId}>
            从素材库选择
          </h2>
          <button ref={closeRef} type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="image-picker__body">
          {state.loading && !items && (
            <p className="admin-page__desc" role="status">
              正在加载素材…
            </p>
          )}

          {state.error && (
            <div className="alert alert--danger" role="alert">
              {state.error.message}
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ marginLeft: 'var(--gh-space-3)' }}
                onClick={() => setReloadKey((key) => key + 1)}
              >
                重试
              </button>
            </div>
          )}

          {items && items.length === 0 && !state.error && (
            <div className="empty">
              <div className="empty__title">{emptyText}</div>
              <p className="empty__desc">可先在「素材库」栏目上传，或直接使用「上传」按钮。</p>
            </div>
          )}

          {items && items.length > 0 && (
            <div className="image-picker__grid">
              {items.map((item) => (
                <button
                  type="button"
                  className="image-picker__tile"
                  key={item.id}
                  title={item.name}
                  onClick={() => onSelect(item)}
                >
                  <span className="image-picker__thumb">
                    {isImage(item) ? (
                      <MediaImg src={item.url} alt={item.name} />
                    ) : isVideo(item) ? (
                      <video src={item.url} muted playsInline preload="metadata" />
                    ) : (
                      <AdminIcon name="doc" size={28} />
                    )}
                  </span>
                  <span className="image-picker__name">{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
