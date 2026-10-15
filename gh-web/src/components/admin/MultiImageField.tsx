/**
 * 多图相册字段控件（后台资源表单 · 产品「相册图片」共用）。
 * ============================================================
 * 逐张复用 `ImageField`（地址输入 + 上传 + 从素材库选择 + 预览），并支持增 / 删 / 上移 / 下移排序；
 * 版式沿用 `admin-records` 既有列表排序控件（不新造样式）。
 * 值为图片地址数组，保存时由表单组装（去除空项）。
 */
import { ImageField } from './ImageField'

export type MultiImageFieldProps = {
  /** 图片地址数组（受控） */
  value: string[]
  /** 变化回调（回传新数组） */
  onChange: (next: string[]) => void
  /** 字段名（用于预览 alt / 无障碍标签） */
  label?: string
}

export function MultiImageField({ value, onChange, label }: MultiImageFieldProps) {
  const items = Array.isArray(value) ? value : []

  const setItem = (index: number, url: string) => onChange(items.map((item, i) => (i === index ? url : item)))
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index))
  const moveItem = (index: number, offset: number) => {
    const target = index + offset
    if (target < 0 || target >= items.length) return
    const next = items.slice()
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }
  const addItem = () => onChange([...items, ''])

  return (
    <div className="admin-records">
      {items.length === 0 && <p className="admin-records__empty">暂无图片，点击下方「添加一张」开始编辑。</p>}
      {items.map((src, index) => (
        <div className="admin-records__item" key={index}>
          <div className="admin-records__head">
            <span className="admin-records__index">#{index + 1}</span>
            <div className="admin-records__actions">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => moveItem(index, -1)} disabled={index === 0}>
                上移
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => moveItem(index, 1)}
                disabled={index === items.length - 1}
              >
                下移
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeItem(index)}>
                删除
              </button>
            </div>
          </div>
          <ImageField value={src} label={`${label ?? '相册图片'} ${index + 1}`} onChange={(url) => setItem(index, url)} />
        </div>
      ))}
      <div>
        <button type="button" className="btn btn--secondary btn--sm" onClick={addItem}>
          ＋ 添加一张
        </button>
      </div>
    </div>
  )
}
