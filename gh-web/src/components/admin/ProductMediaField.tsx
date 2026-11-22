/**
 * 商品媒体总控（产品上架 / 编辑产品专用）。
 * ============================================================
 * 把「相册图片 / 主图视频 / 3D 预览」收敛为一块淘宝式编辑区，替代此前
 * 每个字段各占一行「地址输入 + 上传 + 素材库 + 预览 + 两行说明」的堆叠：
 *
 * - 相册：缩略图宫格，第一张标「主图」，拖拽排序，单击编辑（弹层里可替换 / 设主图 / 删除），
 *   支持批量上传与素材库多选；地址手填收进弹层的「高级」折叠。
 * - 视频：16:9 播放器 / 上传块 + 封面选择；地址手填折叠。
 * - 3D：开关 + .glb 上传 + 预览 + 上传要求折叠。
 *
 * 值仍写回产品记录原有字段（gallery / videoUrl / videoPoster / model3dEnabled /
 * model3d / model3dPoster），不改变数据模型与服务端契约。
 */
import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react'
import { uploadImage } from '../../lib/uploadImage'
import { MediaImg } from '../ui/MediaImg'
import { IconClose, IconGrip, IconPlus } from '../ui/Icon'
import { ProductModel3D, supports3D } from '../product/ProductModel3D'
import { MediaPickerDialog } from './FileField'
import { ImageCropPreview, type CropPreviewSpec } from './ImageCropPreview'
import { Select } from './Select'
import { useToast } from './feedback'
import { hasMediaHint, mediaHintText, resolveMediaCrops, resolveMediaHint } from './mediaHints'

const MB = 1024 * 1024
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime'
const MODEL_ACCEPT = '.glb,model/gltf-binary'
const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i
const VIDEO_EXT = /\.(mp4|webm|mov)$/i

/** 上传目标：画廊追加 / 替换某张 / 视频 / 视频封面 / 3D 模型 / 3D 封面 */
type UploadTarget =
  | { kind: 'gallery' }
  | { kind: 'replace'; index: number }
  | { kind: 'video' }
  | { kind: 'poster' }
  | { kind: 'model' }
  | { kind: 'modelPoster' }

/** 素材库选择目标（与上传目标一一对应） */
type PickerTarget = 'gallery' | 'replace' | 'video' | 'poster' | 'model' | 'modelPoster'

export type ProductMediaFieldProps = {
  /** 表单当前值（读取兄弟字段） */
  values: Record<string, unknown>
  /** 写回某个字段 */
  onChange: (key: string, value: unknown) => void
}

/** 字符串值归一 */
function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** 地址数组归一（保序、去空） */
function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : []
}

/** 字节 → 可读大小 */
function sizeText(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / MB).toFixed(1)} MB`
}

/**
 * 组件：商品媒体总控（相册 / 视频 / 3D）。
 * 上传与素材库选择复用了后台既有链路（uploadImage / MediaPickerDialog），失败均可见提示。
 */
export function ProductMediaField({ values, onChange }: ProductMediaFieldProps) {
  const toast = useToast()
  const gallery = list(values.gallery)
  const videoUrl = text(values.videoUrl)
  const videoPoster = text(values.videoPoster)
  const model3d = text(values.model3d)
  const model3dPoster = text(values.model3dPoster)
  const model3dEnabled = Boolean(values.model3dEnabled)

  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ name: string; percent: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [picker, setPicker] = useState<PickerTarget | null>(null)
  /** 正在编辑的相册下标（null = 未打开编辑弹层） */
  const [editing, setEditing] = useState<number | null>(null)
  /** 拖拽排序状态 */
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  /** 3D 预览加载失败标记（换模型后重置） */
  const [modelFailed, setModelFailed] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const pending = useRef<UploadTarget | null>(null)

  useEffect(() => setModelFailed(false), [model3d])

  const galleryHint = hasMediaHint({ resourceKey: 'products', fieldKey: 'gallery' })
    ? resolveMediaHint({ resourceKey: 'products', fieldKey: 'gallery' })
    : undefined
  /** 说明只保留一行规格；`extra` 里的「第一张即主图」与左侧标题重复，故不再拼接 */
  const galleryNote = galleryHint ? mediaHintText({ ...galleryHint, extra: undefined }) : ''
  const galleryCrops = galleryHint ? resolveMediaCrops('products', 'gallery', galleryHint) : undefined

  const fail = (message: string) => {
    setError(message)
    toast.error(message)
  }

  /** 打开系统文件选择：accept / multiple 由目标决定 */
  const pickFile = (target: UploadTarget) => {
    const input = fileRef.current
    if (!input) return
    pending.current = target
    input.accept =
      target.kind === 'video'
        ? VIDEO_ACCEPT
        : target.kind === 'model'
          ? MODEL_ACCEPT
          : target.kind === 'modelPoster' || target.kind === 'poster'
            ? IMAGE_ACCEPT
            : IMAGE_ACCEPT
    input.multiple = target.kind === 'gallery'
    input.value = ''
    input.click()
  }

  /** 上传前按服务端口径预检，避免传完才被拒 */
  const precheck = (file: File, target: UploadTarget): string | null => {
    if (target.kind === 'video') {
      if (!file.type.startsWith('video/') && !VIDEO_EXT.test(file.name)) return '请选择 mp4 / webm / mov 视频'
      if (file.size > 200 * MB) return `视频最大 200MB，当前 ${sizeText(file.size)}`
      return null
    }
    if (target.kind === 'model') {
      if (!/\.glb$/i.test(file.name)) return '3D 模型仅支持单文件 .glb（贴图需内嵌）'
      if (file.size > 30 * MB) return `3D 模型最大 30MB，当前 ${sizeText(file.size)}`
      return null
    }
    if (!file.type.startsWith('image/') && !IMAGE_EXT.test(file.name)) {
      return '请选择 png / jpg / webp / gif 图片'
    }
    if (file.size > 10 * MB) return `图片最大 10MB，当前 ${sizeText(file.size)}`
    return null
  }

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    const target = pending.current
    event.target.value = ''
    pending.current = null
    if (!target || files.length === 0) return

    for (const file of files) {
      const problem = precheck(file, target)
      if (problem) {
        fail(problem)
        return
      }
    }

    setError(null)
    setBusy(true)
    const added: string[] = []
    let reused = 0
    let duplicated = 0
    try {
      for (const file of files) {
        setProgress({ name: file.name, percent: 0 })
        const item = await uploadImage(file, null, (percent) => setProgress({ name: file.name, percent }))
        added.push(item.url)
        if (item.reused) reused += 1
        else if (item.duplicates && item.duplicates.length > 0) duplicated += 1
      }
      if (reused > 0) toast.toast(`检测到相同文件，已复用 ${reused} 个已有素材`, 'info')
      else if (duplicated > 0) toast.toast(`素材库已有相同文件，本次仍新增 ${duplicated} 个`, 'info')
      if (target.kind === 'gallery') {
        onChange('gallery', [...gallery, ...added.filter((url) => !gallery.includes(url))])
      } else if (target.kind === 'replace') {
        const url = added[0]
        if (url) onChange('gallery', gallery.map((item, index) => (index === target.index ? url : item)))
        setEditing(null)
      } else if (target.kind === 'video') {
        onChange('videoUrl', added[0] ?? '')
      } else if (target.kind === 'poster') {
        onChange('videoPoster', added[0] ?? '')
      } else if (target.kind === 'model') {
        onChange('model3d', added[0] ?? '')
      } else {
        onChange('model3dPoster', added[0] ?? '')
      }
    } catch (ex) {
      fail(ex instanceof Error ? ex.message : '上传失败，请稍后重试')
    } finally {
      setProgress(null)
      setBusy(false)
    }
  }

  /* ---------- 相册操作 ---------- */
  const removeAt = (index: number) => onChange('gallery', gallery.filter((_, i) => i !== index))
  const reorder = (from: number, to: number) => {
    if (from === to) return
    const next = gallery.slice()
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange('gallery', next)
  }
  /** 调换位置：主图就是数组第一张，因此「设主图」等价于前移到首位 */
  const moveBy = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= gallery.length) return
    reorder(index, target)
  }

  const onTileDragStart = (event: DragEvent, index: number) => {
    if ((event.target as HTMLElement).closest('button')) {
      event.preventDefault()
      return
    }
    setDragIndex(index)
    event.dataTransfer.effectAllowed = 'move'
    // Firefox 需要写入数据才会开始拖拽
    event.dataTransfer.setData('text/plain', String(index))
  }
  const onTileDrop = (event: DragEvent, index: number) => {
    event.preventDefault()
    if (dragIndex !== null) reorder(dragIndex, index)
    setDragIndex(null)
    setOverIndex(null)
  }

  /* ---------- 素材库选择 ---------- */
  const pickFromLibrary = (target: PickerTarget) => setPicker(target)

  const applyPicked = (urls: string[]) => {
    const target = picker
    setPicker(null)
    if (!target || urls.length === 0) return
    if (target === 'gallery') {
      onChange('gallery', [...gallery, ...urls.filter((url) => !gallery.includes(url))])
    } else if (target === 'replace') {
      const index = editing
      if (index !== null) {
        onChange('gallery', gallery.map((item, i) => (i === index ? urls[0] : item)))
        setEditing(null)
      }
    } else if (target === 'video') {
      onChange('videoUrl', urls[0])
    } else if (target === 'poster') {
      onChange('videoPoster', urls[0])
    } else if (target === 'model') {
      onChange('model3d', urls[0])
    } else {
      onChange('model3dPoster', urls[0])
    }
  }

  /* ---------- 封面选择 ---------- */
  const posterOptions = [
    { value: '', label: '使用相册第一张' },
    ...gallery.map((_, index) => ({ value: `gallery:${index}`, label: `相册第 ${index + 1} 张` })),
    ...(videoPoster && !gallery.includes(videoPoster) ? [{ value: 'custom', label: '自定义上传' }] : []),
  ]
  const posterValue = videoPoster ? (gallery.includes(videoPoster) ? `gallery:${gallery.indexOf(videoPoster)}` : 'custom') : ''
  const posterSrc = videoPoster || gallery[0] || ''
  const onPosterChange = (value: string) => {
    if (value === 'custom') {
      pickFile({ kind: 'poster' })
      return
    }
    if (value.startsWith('gallery:')) {
      onChange('videoPoster', gallery[Number(value.slice('gallery:'.length))] ?? '')
      return
    }
    onChange('videoPoster', '')
  }

  const editingUrl = editing !== null ? gallery[editing] ?? '' : ''
  const canPreview3D = /\.glb(?:$|[?#])/i.test(model3d) && supports3D()
  const model3dFallback = model3dPoster || gallery[0] || ''

  /* 3D 首帧封面：与视频封面共用相册选项 */
  const modelPosterOptions = [
    { value: '', label: '使用相册第一张' },
    ...gallery.map((_, index) => ({ value: `gallery:${index}`, label: `相册第 ${index + 1} 张` })),
    ...(model3dPoster && !gallery.includes(model3dPoster) ? [{ value: 'custom', label: '自定义上传' }] : []),
  ]
  const modelPosterValue = model3dPoster
    ? gallery.includes(model3dPoster)
      ? `gallery:${gallery.indexOf(model3dPoster)}`
      : 'custom'
    : ''
  const onModelPosterChange = (value: string) => {
    if (value === 'custom') {
      pickFile({ kind: 'modelPoster' })
      return
    }
    if (value.startsWith('gallery:')) {
      onChange('model3dPoster', gallery[Number(value.slice('gallery:'.length))] ?? '')
      return
    }
    onChange('model3dPoster', '')
  }

  return (
    <div className="media-manager">
      <input ref={fileRef} type="file" className="image-field__file" onChange={onFileChange} aria-label="上传商品媒体" />

      {error && (
        <p className="image-field__error" role="alert">
          {error}
        </p>
      )}
      {progress && (
        <p className="media-manager__status" role="status">
          <span className="spinner" aria-hidden="true" /> 正在上传 {progress.name} · {progress.percent}%
        </p>
      )}

      {/* ---------- 相册 ---------- */}
      <section className="media-block" aria-label="相册图片">
        <div className="media-block__head">
          <div>
            <h3 className="media-block__title">
              相册图片 <span className="media-block__count">{gallery.length}/20</span>
            </h3>
            <p className="media-block__note">
              第一张自动作为主图，拖拽或 ←/→ 调整顺序{galleryNote ? ` · ${galleryNote}` : ''}
            </p>
          </div>
          <div className="media-block__actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => pickFile({ kind: 'gallery' })} disabled={busy}>
              <IconPlus size={14} aria-hidden="true" /> 上传图片
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => pickFromLibrary('gallery')} disabled={busy}>
              从素材库选择
            </button>
          </div>
        </div>

        <div className="media-gallery">
          {gallery.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className={`media-tile${index === 0 ? ' is-main' : ''}${dragIndex === index ? ' is-dragging' : ''}${overIndex === index ? ' is-over' : ''}`}
              role="button"
              tabIndex={0}
              title={index === 0 ? '主图' : '单击编辑，拖拽排序'}
              draggable
              onDragStart={(event) => onTileDragStart(event, index)}
              onDragOver={(event) => {
                if (dragIndex === null) return
                event.preventDefault()
                setOverIndex(index)
              }}
              onDragLeave={() => setOverIndex((current) => (current === index ? null : current))}
              onDrop={(event) => onTileDrop(event, index)}
              onDragEnd={() => {
                setDragIndex(null)
                setOverIndex(null)
              }}
              onClick={() => setEditing(index)}
              onKeyDown={(event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setEditing(index)
                }
              }}
            >
              <MediaImg src={src} alt={`相册图 ${index + 1}`} className="media-tile__img" loading="lazy" />
              {index === 0 && <span className="media-tile__badge">主图</span>}
              <span className="media-tile__grip" aria-hidden="true">
                <IconGrip size={14} />
              </span>
              <span className="media-tile__actions">
                <button
                  type="button"
                  className="media-tile__action"
                  title="前移"
                  aria-label="前移"
                  disabled={index === 0}
                  onClick={(event) => {
                    event.stopPropagation()
                    moveBy(index, -1)
                  }}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="media-tile__action"
                  title="后移"
                  aria-label="后移"
                  disabled={index === gallery.length - 1}
                  onClick={(event) => {
                    event.stopPropagation()
                    moveBy(index, 1)
                  }}
                >
                  →
                </button>
                <button type="button" className="media-tile__action" onClick={(event) => { event.stopPropagation(); setEditing(index) }}>
                  编辑
                </button>
                <button
                  type="button"
                  className="media-tile__action media-tile__action--danger"
                  onClick={(event) => {
                    event.stopPropagation()
                    removeAt(index)
                  }}
                >
                  删除
                </button>
              </span>
            </div>
          ))}
          <button
            type="button"
            className="media-tile media-tile--add"
            onClick={() => pickFile({ kind: 'gallery' })}
            disabled={busy}
          >
            <IconPlus size={22} aria-hidden="true" />
            <span>上传图片</span>
            <small>支持批量</small>
          </button>
        </div>
      </section>

      <div className="media-grid">
        {/* ---------- 主图视频 ---------- */}
        <section className="media-block" aria-label="主图视频">
          <div className="media-block__head">
            <div>
              <h3 className="media-block__title">主图视频</h3>
              <p className="media-block__note">mp4 / webm / mov · 建议 16:9 横版 · ≤200MB</p>
            </div>
            {videoUrl && (
              <div className="media-block__actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => pickFile({ kind: 'video' })} disabled={busy}>
                  更换
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange('videoUrl', '')}>
                  删除
                </button>
              </div>
            )}
          </div>

          {videoUrl ? (
            <>
              <video className="media-video__frame" src={videoUrl} controls muted playsInline preload="metadata" />
              <div className="media-cover">
                <span className="media-cover__thumb">
                  {posterSrc ? <MediaImg src={posterSrc} alt="视频封面" /> : <span className="media-cover__empty">无封面</span>}
                </span>
                <div className="media-cover__body">
                  <span className="media-cover__label">封面</span>
                  <Select
                    value={posterValue}
                    onChange={onPosterChange}
                    options={posterOptions}
                    aria-label="视频封面"
                  />
                </div>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="media-dropzone media-dropzone--video"
              onClick={() => pickFile({ kind: 'video' })}
              disabled={busy}
            >
              <IconPlus size={24} aria-hidden="true" />
              <span>上传主图视频</span>
              <small>详情页主图区会出现「视频」切换</small>
            </button>
          )}

          <details className="media-advanced">
            <summary>高级：手动填写视频地址</summary>
            <input
              className="input"
              type="text"
              value={videoUrl}
              placeholder="/uploads/xxxx.mp4"
              onChange={(event) => onChange('videoUrl', event.target.value)}
            />
          </details>
        </section>

        {/* ---------- 3D 预览 ---------- */}
        <section className="media-block" aria-label="3D 预览">
          <div className="media-block__head">
            <div>
              <h3 className="media-block__title">3D 预览</h3>
              <p className="media-block__note">仅 .glb · ≤30MB · 开启后详情页出现 3D 入口</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={model3dEnabled}
                onChange={(event) => onChange('model3dEnabled', event.target.checked)}
              />
              <span className="switch__track" />
              <span>启用</span>
            </label>
          </div>

          <div className={`media-model3d${model3dEnabled ? '' : ' is-off'}`}>
            {model3d ? (
              <>
                <div className="media-model3d__bar">
                  <span className="media-model3d__name" title={model3d}>
                    {model3d.split('/').pop()}
                  </span>
                  <span className="media-block__actions">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => pickFile({ kind: 'model' })} disabled={busy}>
                      更换
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange('model3d', '')}>
                      删除
                    </button>
                  </span>
                </div>
                <div className="media-model3d__stage">
                  {canPreview3D && !modelFailed ? (
                    <ProductModel3D key={model3d} src={model3d} label="3D 预览" onError={() => setModelFailed(true)} />
                  ) : model3dFallback ? (
                    <img src={model3dFallback} alt="3D 预览封面" />
                  ) : (
                    <span className="media-model3d__placeholder">
                      {canPreview3D ? '模型预览加载失败，请检查 .glb 是否完整' : '当前浏览器不支持 3D 预览，模型地址已保留'}
                    </span>
                  )}
                </div>
                <div className="media-cover">
                  <span className="media-cover__thumb">
                    {model3dFallback ? (
                      <MediaImg src={model3dFallback} alt="3D 首帧封面" />
                    ) : (
                      <span className="media-cover__empty">无封面</span>
                    )}
                  </span>
                  <div className="media-cover__body">
                    <span className="media-cover__label">首帧封面</span>
                    <Select
                      value={modelPosterValue}
                      onChange={onModelPosterChange}
                      options={modelPosterOptions}
                      aria-label="3D 首帧封面"
                    />
                  </div>
                </div>
                {!model3dEnabled && <p className="media-model3d__off">已关闭：保存后前台不显示 3D 入口</p>}
              </>
            ) : (
              <button
                type="button"
                className="media-dropzone"
                onClick={() => pickFile({ kind: 'model' })}
                disabled={busy}
              >
                <IconPlus size={22} aria-hidden="true" />
                <span>上传 .glb 模型</span>
                <small>上传后在此直接预览</small>
              </button>
            )}
          </div>

          <details className="media-advanced">
            <summary>上传要求与模型地址</summary>
            <ul className="media-advanced__list">
              <li>贴图必须内嵌，不要 .gltf + 外部贴图</li>
              <li>建议几何 ≤ 15 万面、贴图 ≤ 2048；Y 轴向上、正面朝 +Z、原点在底座中心</li>
              <li>上传后需打开「启用」并保存，前台才出现入口</li>
            </ul>
            <input
              className="input"
              type="text"
              value={model3d}
              placeholder="/uploads/xxxx.glb"
              onChange={(event) => onChange('model3d', event.target.value)}
            />
          </details>
        </section>
      </div>

      {/* ---------- 素材库选择 ---------- */}
      {picker && (
        <MediaPickerDialog
          filter={picker === 'video' ? 'media' : picker === 'model' ? 'all' : 'image'}
          multiple={picker === 'gallery'}
          onClose={() => setPicker(null)}
          onSelect={(item) => applyPicked([item.url])}
          onSelectMany={(items) => applyPicked(items.map((item) => item.url))}
        />
      )}

      {/* ---------- 单图编辑弹层 ---------- */}
      {editing !== null && editingUrl && (
        <GalleryEditDialog
          url={editingUrl}
          index={editing}
          total={gallery.length}
          crops={editing === 0 ? galleryCrops : undefined}
          busy={busy}
          onClose={() => setEditing(null)}
          onUrlChange={(url) => onChange('gallery', gallery.map((item, i) => (i === editing ? url : item)))}
          onReplace={() => pickFile({ kind: 'replace', index: editing })}
          onPick={() => pickFromLibrary('replace')}
          onMoveBack={() => {
            moveBy(editing, -1)
            setEditing(editing - 1)
          }}
          onMoveForward={() => {
            moveBy(editing, 1)
            setEditing(editing + 1)
          }}
          onDelete={() => {
            removeAt(editing)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

/** 相册单图编辑弹层：预览 + 调序 / 替换 / 删除，地址手填收在折叠里 */
function GalleryEditDialog({
  url,
  index,
  total,
  crops,
  busy,
  onClose,
  onUrlChange,
  onReplace,
  onPick,
  onMoveBack,
  onMoveForward,
  onDelete,
}: {
  url: string
  index: number
  /** 相册总数：控制前移 / 后移按钮是否可用 */
  total: number
  crops?: CropPreviewSpec[]
  busy: boolean
  onClose: () => void
  onUrlChange: (url: string) => void
  onReplace: () => void
  onPick: () => void
  onMoveBack: () => void
  onMoveForward: () => void
  onDelete: () => void
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="image-picker" role="presentation" onClick={onClose}>
      <div
        className="image-picker__dialog media-edit"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="image-picker__head">
          <h2 className="image-picker__title" id={titleId}>
            编辑相册图 {index === 0 ? '· 主图' : `· 第 ${index + 1} 张`}
          </h2>
          <button ref={closeRef} type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            <IconClose size={16} aria-hidden="true" /> 关闭
          </button>
        </div>
        <div className="image-picker__body">
          <div className="media-edit__preview">
            <MediaImg src={url} alt={`相册图 ${index + 1}`} />
          </div>

          <div className="media-edit__actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={onMoveBack} disabled={index === 0}>
              ← 前移
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={onMoveForward}
              disabled={index >= total - 1}
            >
              后移 →
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={onReplace} disabled={busy}>
              上传替换
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onPick} disabled={busy}>
              从素材库选择
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onDelete}>
              删除这张
            </button>
          </div>

          {crops && crops.length > 0 && (
            <div className="image-field__crops">
              <span className="image-field__crops-title">在这几处会这样显示：</span>
              <ImageCropPreview src={url} crops={crops} />
            </div>
          )}

          <details className="media-advanced">
            <summary>高级：手动填写图片地址</summary>
            <input className="input" type="text" value={url} onChange={(event) => onUrlChange(event.target.value)} />
          </details>
        </div>
      </div>
    </div>
  )
}
