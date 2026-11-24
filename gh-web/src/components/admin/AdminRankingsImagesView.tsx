/**
 * 后台 · 天梯榜型号产品图。
 * 榜单里每个型号一张缩略图：可上传新图、粘贴站内地址，或清除后回落到关联产品封面。
 * 保存即写回 `rankings` 集合，前台天梯榜（领奖台 / 列表 / 首页榜单区块）立即生效。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchRankingMetrics, saveRankingRowImage } from '../../api/adminRankings'
import { uploadImage } from '../../lib/uploadImage'
import type { LadderMetric } from '../../data/ladder'

type Draft = { imageUrl: string; saving: boolean; error?: string; done?: boolean }

export function AdminRankingsImagesView() {
  const [metrics, setMetrics] = useState<LadderMetric[]>([])
  const [metricId, setMetricId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [uploading, setUploading] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    fetchRankingMetrics()
      .then((items) => {
        if (!alive) return
        setMetrics(items)
        setMetricId((current) => current || items[0]?.id || '')
      })
      .catch((error: Error) => {
        if (alive) setLoadError(error.message || '读取榜单失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const metric = useMemo(() => metrics.find((item) => item.id === metricId), [metrics, metricId])

  /** 未编辑时展示已存的图片地址 */
  const valueOf = (model: string) => drafts[model]?.imageUrl ?? metric?.rows.find((row) => row.model === model)?.imageUrl ?? ''

  const patch = (model: string, next: Partial<Draft>) =>
    setDrafts((prev) => {
      const base: Draft = prev[model] ?? { imageUrl: valueOf(model), saving: false }
      return { ...prev, [model]: { ...base, ...next } }
    })

  const save = async (model: string) => {
    if (!metric) return
    const imageUrl = valueOf(model).trim()
    patch(model, { imageUrl, saving: true, error: undefined, done: false })
    try {
      await saveRankingRowImage({ metric: metric.id, model, imageUrl })
      setMetrics((prev) =>
        prev.map((item) =>
          item.id !== metric.id
            ? item
            : {
                ...item,
                rows: item.rows.map((row) => (row.model === model ? { ...row, imageUrl: imageUrl || undefined } : row)),
              },
        ),
      )
      patch(model, { imageUrl, saving: false, done: true })
      window.setTimeout(() => patch(model, { done: false }), 1800)
    } catch (error) {
      patch(model, { imageUrl, saving: false, error: (error as Error).message || '保存失败' })
    }
  }

  const pickFile = (model: string) => {
    setUploading(model)
    if (fileRef.current) {
      fileRef.current.value = ''
      fileRef.current.click()
    }
  }

  const onFile = async (file: File) => {
    const model = uploading
    if (!model || !metric) return
    try {
      const item = await uploadImage(file)
      patch(model, { imageUrl: item.url, saving: false, error: undefined })
      await saveRankingRowImage({ metric: metric.id, model, imageUrl: item.url })
      setMetrics((prev) =>
        prev.map((entry) =>
          entry.id !== metric.id
            ? entry
            : { ...entry, rows: entry.rows.map((row) => (row.model === model ? { ...row, imageUrl: item.url } : row)) },
        ),
      )
      patch(model, { imageUrl: item.url, done: true })
      window.setTimeout(() => patch(model, { done: false }), 1800)
    } catch (error) {
      patch(model, { error: (error as Error).message || '上传失败' })
    } finally {
      setUploading('')
    }
  }

  return (
    <div className="ladder-images">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void onFile(file)
        }}
      />

      <div className="ladder-images__head">
        <label>
          <span>榜单</span>
          <select value={metricId} onChange={(event) => setMetricId(event.target.value)}>
            {metrics.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}（{item.rows.length} 个型号）
              </option>
            ))}
          </select>
        </label>
        <p>缩略图仅影响天梯榜展示，不影响实测数据。未设置时自动使用关联产品封面。</p>
      </div>

      {loading && <p className="ladder-images__state">正在读取榜单…</p>}
      {!loading && loadError && <p className="ladder-images__state is-error">{loadError}</p>}
      {!loading && !loadError && metric && (
        <ul className="ladder-images__list">
          {metric.rows.map((row) => {
            const draft = drafts[row.model]
            const value = valueOf(row.model)
            return (
              <li key={row.model} className="ladder-images__row">
                <span className="ladder-images__thumb">
                  {value ? <img src={value} alt="" /> : <em>无图</em>}
                </span>
                <span className="ladder-images__meta">
                  <strong>{row.model}</strong>
                  <small>
                    {row.name}
                    {row.hidden ? ' · 前台隐藏' : ''}
                  </small>
                </span>
                <input
                  className="ladder-images__input"
                  type="text"
                  placeholder="/uploads/… 或 https://…"
                  value={value}
                  onChange={(event) => patch(row.model, { imageUrl: event.target.value })}
                />
                <span className="ladder-images__actions">
                  <button type="button" onClick={() => pickFile(row.model)} disabled={uploading === row.model}>
                    {uploading === row.model ? '上传中…' : '上传'}
                  </button>
                  <button type="button" onClick={() => void save(row.model)} disabled={draft?.saving}>
                    {draft?.saving ? '保存中…' : '保存'}
                  </button>
                  {value && (
                    <button
                      type="button"
                      className="is-ghost"
                      onClick={() => {
                        patch(row.model, { imageUrl: '' })
                        void saveRankingRowImage({ metric: metric.id, model: row.model, imageUrl: '' })
                          .then(() => {
                            setMetrics((prev) =>
                              prev.map((entry) =>
                                entry.id !== metric.id
                                  ? entry
                                  : {
                                      ...entry,
                                      rows: entry.rows.map((item) =>
                                        item.model === row.model ? { ...item, imageUrl: undefined } : item,
                                      ),
                                    },
                              ),
                            )
                          })
                          .catch((error: Error) => patch(row.model, { error: error.message }))
                      }}
                    >
                      清除
                    </button>
                  )}
                </span>
                {draft?.error && <span className="ladder-images__error">{draft.error}</span>}
                {draft?.done && <span className="ladder-images__ok">已保存</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
