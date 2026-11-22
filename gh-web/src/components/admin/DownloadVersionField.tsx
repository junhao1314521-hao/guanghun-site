/**
 * 固件版本管理（下载中心 · 固件专用）。
 * ============================================================
 * 设计目标（R-下载 P1）：
 * - 固件当前文件不允许原地覆盖，只能在弹层里「发布新版本」；
 * - 发布后当前版本与文件自动归档到 `history` 首位，前台「历史版本」可直接回看下载；
 * - 文件大小与 SHA-256 由服务端从素材库元数据回填，不手填，避免与实际文件不一致；
 * - 历史版本在本字段内直接列出，运营无需滚动到「变更记录」里猜。
 *
 * 发布接口：POST /api/admin/resources/downloads/:id/versions（见 gh-server adminRouter）。
 * 成功后把服务端返回的版本相关字段写回表单，其余未保存修改保持不变。
 */
import { useEffect, useId, useState } from 'react'
import { publishDownloadVersion } from '../../api/admin'
import { FileField } from './FileField'
import { useToast } from './feedback'

/** 服务端返回后需要回写到表单的字段（与版本发布直接相关） */
const APPLY_KEYS = [
  'version',
  'date',
  'releasedAt',
  'fileUrl',
  'assetId',
  'size',
  'sizeBytes',
  'sha256',
  'checksumType',
  'isLatest',
  'changelog',
  'history',
] as const

/** 历史版本条目（宽松读取，兼容历史数据缺字段） */
type HistoryEntry = {
  version?: unknown
  date?: unknown
  size?: unknown
  sizeBytes?: unknown
  fileUrl?: unknown
  sha256?: unknown
  notes?: unknown
}

/** 文件名（取 URL 最后一段） */
function fileName(url: string): string {
  return url ? decodeURIComponent(url.split('/').pop() || url) : ''
}

export type DownloadVersionFieldProps = {
  /** 表单当前值 */
  values: Record<string, unknown>
  /** 写回某个字段 */
  onChange: (key: string, value: unknown) => void
}

/** 组件：当前版本摘要 + 发布新版本 + 历史版本列表 */
export function DownloadVersionField({ values, onChange }: DownloadVersionFieldProps) {
  const toast = useToast()
  const [open, setOpen] = useState(false)

  const id = String(values.id ?? '').trim()
  const version = String(values.version ?? '').trim()
  const fileUrl = String(values.fileUrl ?? '').trim()
  const size = String(values.size ?? '').trim()
  const history = Array.isArray(values.history) ? (values.history as HistoryEntry[]) : []

  if (!id) {
    return <p className="field__hint">保存后可发布新版本；首次上传直接在「文件」选择素材即可</p>
  }

  const knownVersions = [version, ...history.map((entry) => String(entry.version ?? '').trim())].filter(Boolean)

  return (
    <div className="version-field">
      <div className="version-field__row">
        <div className="version-field__summary">
          <span className="version-field__label">当前版本</span>
          <span className="version-field__version">{version || '未填写'}</span>
          <span className="version-field__meta">
            {fileName(fileUrl) || '暂无文件'}
            {size ? ` · ${size}` : ''}
          </span>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setOpen(true)}>
          发布新版本
        </button>
      </div>
      <p className="field__hint">发布后当前文件自动归档到历史版本；固件文件不允许原地覆盖</p>

      {history.length > 0 && (
        <div className="version-field__history">
          <span className="version-field__label">历史版本（{history.length}）</span>
          <ul className="version-list">
            {history.map((entry, index) => {
              const href = String(entry.fileUrl ?? '').trim()
              return (
                <li className="version-list__item" key={`${String(entry.version ?? '')}-${String(entry.date ?? '')}-${index}`}>
                  <span className="version-list__version">{String(entry.version ?? '') || '未命名'}</span>
                  <span className="version-list__meta">
                    {String(entry.date ?? '') || '—'} · {String(entry.size ?? '') || '—'}
                  </span>
                  {href ? (
                    <a className="version-list__link" href={href} target="_blank" rel="noreferrer">
                      下载
                    </a>
                  ) : (
                    <span className="version-list__link is-muted">待更新</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {open && (
        <PublishVersionDialog
          id={id}
          currentVersion={version}
          knownVersions={knownVersions}
          onClose={() => setOpen(false)}
          onPublished={(item, previousVersion) => {
            for (const key of APPLY_KEYS) {
              if (key in item) onChange(key, item[key])
            }
            setOpen(false)
            const next = String(item.version ?? '')
            toast.success(previousVersion ? `已发布 ${next}，${previousVersion} 已归档` : `已发布 ${next}`)
          }}
        />
      )}
    </div>
  )
}

/** 发布新版本弹层：版本号 / 日期 / 素材库文件 / 变更说明 */
function PublishVersionDialog({
  id,
  currentVersion,
  knownVersions,
  onClose,
  onPublished,
}: {
  id: string
  currentVersion: string
  knownVersions: string[]
  onClose: () => void
  onPublished: (item: Record<string, unknown>, previousVersion?: string) => void
}) {
  const titleId = useId()
  const [nextVersion, setNextVersion] = useState('')
  const [date, setDate] = useState(() => new Date().toLocaleDateString('sv-SE'))
  const [fileUrl, setFileUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Esc 关闭（提交中不打断）
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, submitting])

  const submit = async () => {
    const version = nextVersion.trim()
    if (!version) {
      setError('请填写新版本号')
      return
    }
    if (version.toLowerCase() === currentVersion.toLowerCase()) {
      setError('新版本号不能与当前版本相同')
      return
    }
    if (knownVersions.some((item) => item.toLowerCase() === version.toLowerCase())) {
      setError('该版本号已存在于历史版本，请使用新的版本号')
      return
    }
    if (!fileUrl.trim()) {
      setError('请从素材库选择新版本文件')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const result = await publishDownloadVersion(id, {
        version,
        date,
        fileUrl: fileUrl.trim(),
        notes: notes.split('\n').map((line) => line.trim()).filter(Boolean),
      })
      onPublished(result.item, result.previousVersion)
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : '发布失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="image-picker" role="presentation" onClick={() => !submitting && onClose()}>
      <div
        className="image-picker__dialog version-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="image-picker__head">
          <h2 className="image-picker__title" id={titleId}>
            发布新版本 · 当前 {currentVersion || '未填写'}
          </h2>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={submitting}>
            关闭
          </button>
        </div>
        <div className="image-picker__body">
          <div className="version-dialog__grid">
            <label className="field">
              <span className="field__label">新版本号</span>
              <input
                className="input"
                type="text"
                value={nextVersion}
                placeholder="如 v2.5.0"
                onChange={(event) => setNextVersion(event.target.value)}
                autoFocus
              />
            </label>
            <label className="field">
              <span className="field__label">发布日期</span>
              <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <div className="field version-dialog__full">
              <span className="field__label">新版本文件</span>
              <FileField
                pickerFirst
                label="新版本文件"
                value={fileUrl}
                onChange={setFileUrl}
                hideDefaultHint
              />
            </div>
            <label className="field version-dialog__full">
              <span className="field__label">变更说明（可选，每行一条）</span>
              <textarea
                className="input"
                rows={3}
                value={notes}
                placeholder="如：修复 HDR 切换闪烁"
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </div>

          <p className="field__hint">发布后立即生效：当前文件与版本号归档到历史版本；大小与 SHA-256 由素材库文件自动读取。</p>
          {error && (
            <p className="image-field__error" role="alert">
              {error}
            </p>
          )}
          <div className="version-dialog__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={submitting}>
              取消
            </button>
            <button type="button" className="btn btn--primary btn--sm" onClick={submit} disabled={submitting}>
              {submitting ? '发布中…' : '确认发布'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
