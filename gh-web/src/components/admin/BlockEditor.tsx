/**
 * 装修器 · 区块字段表单（按契约 §6.3 字段元数据自动渲染）。
 * ============================================================
 * 单个区块的 props 编辑器：依据目录项的 `fields` 渲染控件，
 * 数组型字段（list）支持「字符串行列表」与「对象条目列表」两种形态（可递归嵌套），
 * 图片字段复用 ImageField（地址输入 + 上传 + 从素材库选择 + 预览）。
 *
 * 纯受控组件：所有改动经 `onChange` 回传父级（累积在页面本地状态）。
 * layout.children 由父级装修器的布局编排区负责，这里仅给出提示。
 * 契约对齐：《光魂官网 · 内容库与装修契约 v1》§4 / §6.3。
 */
import { useState } from 'react'
import type { Block, BlockFieldMeta, BlockTypeMeta } from '../../data/contentTypes'
import { fetchProducts } from '../../api/products'
import { fetchArticles } from '../../api/articles'
import { fetchDownloads, fetchFaqs } from '../../api/support-extra'
import { fetchBizCases, fetchBizVenues } from '../../api/business-extra'
import { useApi } from '../../hooks/useApi'
import { emptyItem, isStringList, resolveItemFields } from './blockBuilderUtils'
import { ImageField, MediaField } from './ImageField'
import { RichTextField } from './RichTextField'

/** 挑选器条目：统一呈现（主文案 / 次文案 / 分类） */
type RefItem = { id: string; primary: string; secondary?: string; meta?: string }

/** 按 ref 字段的 source 从对应集合取数（值仍以 ID 列表保存） */
async function loadRefItems(source: string | undefined, signal?: AbortSignal): Promise<RefItem[]> {
  switch (source) {
    case 'products': {
      const { items } = await fetchProducts(signal)
      return items.map((item) => ({ id: item.id, primary: item.model, secondary: item.name, meta: item.category }))
    }
    case 'articles': {
      const { items } = await fetchArticles(signal)
      return items.map((item) => ({ id: item.id, primary: item.title, secondary: item.tag, meta: item.categoryLabel }))
    }
    case 'downloads': {
      const { items } = await fetchDownloads(signal)
      return items.map((item) => ({ id: item.id, primary: item.name, secondary: item.version, meta: item.category }))
    }
    case 'faqs': {
      const { items } = await fetchFaqs(signal)
      return items.map((item) => ({ id: item.id, primary: item.q, secondary: item.category }))
    }
    case 'bizCases': {
      const { items } = await fetchBizCases(signal)
      return items.map((item) => ({ id: item.id, primary: item.title, secondary: item.partner, meta: item.category }))
    }
    case 'bizVenues': {
      const { items } = await fetchBizVenues(signal)
      return items.map((item) => ({
        id: item.id,
        primary: item.name,
        secondary: `${item.city} · ${item.area}`,
        meta: item.status,
      }))
    }
    default:
      return []
  }
}

/**
 * 集合挑选器（kind: 'ref'）：直接从集合里勾选条目，值以「ID 列表」保存。
 * 来源由字段 `source` 指定（products / articles / downloads / faqs）；
 * 已选项可上移/下移/移除——顺序即前台展示顺序。
 */
function RefPicker({
  field,
  value,
  onChange,
}: {
  field: BlockFieldMeta
  value: unknown
  onChange: (value: unknown) => void
}) {
  const ids = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  const [query, setQuery] = useState('')
  const { data, loading, error } = useApi<RefItem[]>((signal) => loadRefItems(field.source, signal), [field.source])
  const items = data ?? []
  const keyword = query.trim().toLowerCase()
  const list = keyword
    ? items.filter((item) => `${item.primary}${item.secondary ?? ''}`.toLowerCase().includes(keyword))
    : items
  const labelOf = (id: string) => items.find((item) => item.id === id)?.primary ?? id
  const toggle = (id: string) => onChange(ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id])
  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    const next = ids.slice()
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="ref-picker">
      <input
        className="input"
        type="text"
        placeholder={field.placeholder ?? '搜索条目'}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {loading ? (
        <p className="field__hint">正在加载条目…</p>
      ) : error ? (
        <p className="field__hint">加载失败：{error.message}</p>
      ) : (
        <div className="ref-picker__list">
          {list.length === 0 ? (
            <p className="field__hint">没有匹配的条目。</p>
          ) : (
            list.map((item) => (
              <label className="ref-picker__item" key={item.id}>
                <input type="checkbox" checked={ids.includes(item.id)} onChange={() => toggle(item.id)} />
                <span className="ref-picker__name">{item.primary}</span>
                <span className="ref-picker__model">{item.secondary}</span>
                <span className="ref-picker__cat">{item.meta}</span>
              </label>
            ))
          )}
        </div>
      )}
      {ids.length > 0 && (
        <div className="ref-picker__chosen">
          <p className="field__hint">已选 {ids.length} 个（顺序即前台展示顺序）</p>
          <div className="ref-picker__chosen-list">
            {ids.map((id, index) => (
              <span className="chip chip--removable" key={id}>
                {labelOf(id)}
                <button type="button" aria-label="上移" onClick={() => move(index, -1)}>
                  ↑
                </button>
                <button type="button" aria-label="下移" onClick={() => move(index, 1)}>
                  ↓
                </button>
                <button type="button" aria-label={`移除 ${labelOf(id)}`} onClick={() => toggle(id)}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** 字符串行列表（hero.title「每行一句」等）：每行一个输入框 */
/** 通用：把数组第 from 项移到 to（越界原样返回），返回新数组（不可变） */
function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const next = list.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** 条目排序按钮组（上移 / 下移）：行列表与对象条目列表共用 */
function MoveButtons({
  index,
  total,
  onMove,
}: {
  index: number
  total: number
  onMove: (from: number, to: number) => void
}) {
  return (
    <span className="builder-ops">
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        aria-label="上移"
        title="上移"
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
      >
        ↑
      </button>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        aria-label="下移"
        title="下移"
        disabled={index === total - 1}
        onClick={() => onMove(index, index + 1)}
      >
        ↓
      </button>
    </span>
  )
}

function LineListEditor({ lines, onChange }: { lines: string[]; onChange: (lines: string[]) => void }) {
  return (
    <div className="builder-lines">
      {lines.map((line, index) => (
        <div className="builder-lines__row" key={index}>
          <input
            className="input"
            type="text"
            value={line}
            onChange={(event) => {
              const next = lines.slice()
              next[index] = event.target.value
              onChange(next)
            }}
          />
          <MoveButtons index={index} total={lines.length} onMove={(from, to) => onChange(moveItem(lines, from, to))} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange(lines.filter((_, i) => i !== index))}>
            删除
          </button>
        </div>
      ))}
      <button type="button" className="btn btn--secondary btn--sm" onClick={() => onChange([...lines, ''])}>
        + 新增一行
      </button>
    </div>
  )
}

/** 单字段输入控件（text / textarea / number / select / switch / image / link） */
function FieldControl({
  field,
  value,
  onChange,
}: {
  field: BlockFieldMeta
  value: unknown
  onChange: (value: unknown) => void
}) {
  const fieldId = `f-${field.name}`

  if (field.kind === 'switch') {
    return (
      <label className="switch" htmlFor={fieldId}>
        <input id={fieldId} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        <span className="switch__track" />
        <span>{field.label}</span>
      </label>
    )
  }

  if (field.kind === 'image') {
    return (
      <ImageField
        inputId={fieldId}
        label={field.label}
        placeholder={field.placeholder ?? '图片资源地址（URL 或 /uploads/...）'}
        value={typeof value === 'string' ? value : ''}
        onChange={(url) => onChange(url)}
      />
    )
  }

  if (field.kind === 'media') {
    return (
      <MediaField
        inputId={fieldId}
        label={field.label}
        placeholder={field.placeholder ?? '图片 / GIF / 视频地址（URL 或 /uploads/...）'}
        value={typeof value === 'string' ? value : ''}
        onChange={(url) => onChange(url)}
      />
    )
  }

  if (field.kind === 'link') {
    const record = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
    const setPart = (part: 'label' | 'href', next: string) => onChange({ ...record, [part]: next })
    return (
      <div className="builder-link-fields">
        <input
          className="input"
          type="text"
          placeholder="按钮文字"
          value={typeof record.label === 'string' ? record.label : ''}
          onChange={(event) => setPart('label', event.target.value)}
        />
        <input
          className="input"
          type="text"
          placeholder="链接地址（如 /products）"
          value={typeof record.href === 'string' ? record.href : ''}
          onChange={(event) => setPart('href', event.target.value)}
        />
      </div>
    )
  }

  if (field.kind === 'ref') {
    return <RefPicker field={field} value={value} onChange={onChange} />
  }

  if (field.kind === 'select') {
    return (
      <select id={fieldId} className="select" value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">请选择</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }

  if (field.kind === 'rich') {
    return (
      <RichTextField
        fieldId={fieldId}
        value={typeof value === 'string' ? value : ''}
        placeholder={field.placeholder}
        onChange={(html) => onChange(html)}
      />
    )
  }

  if (field.kind === 'code') {
    return (
      <textarea
        id={fieldId}
        className="textarea builder-code"
        rows={10}
        spellCheck={false}
        placeholder={field.placeholder}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  if (field.kind === 'textarea') {
    return (
      <textarea
        id={fieldId}
        className="textarea"
        rows={4}
        placeholder={field.placeholder}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  return (
    <input
      id={fieldId}
      className="input"
      type={field.kind === 'number' ? 'number' : 'text'}
      placeholder={field.placeholder}
      value={value === undefined || value === null ? '' : String(value)}
      onChange={(event) =>
        onChange(field.kind === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value)
      }
    />
  )
}

/** 不可变更新列表里某一项的字段 */
function updateItemField(
  items: Record<string, unknown>[],
  index: number,
  name: string,
  value: unknown,
): Record<string, unknown>[] {
  const next = items.slice()
  next[index] = { ...next[index], [name]: value }
  return next
}

/** 对象条目列表（items / slides 等）：条目的增删与逐条编辑（字段可递归，含嵌套 list） */
function ItemListEditor({
  field,
  items,
  itemFields,
  meta,
  onChange,
}: {
  field: BlockFieldMeta
  items: Record<string, unknown>[]
  itemFields: BlockFieldMeta[]
  meta: BlockTypeMeta | undefined
  onChange: (items: Record<string, unknown>[]) => void
}) {
  const [open, setOpen] = useState<number | null>(items.length > 0 ? 0 : null)

  /**
   * 移动条目：数组换位的同时，把「展开态」索引跟着平移，
   * 否则换位后原本展开的那一条会串到别的条目上。
   */
  const move = (from: number, to: number) => {
    const next = moveItem(items, from, to)
    if (next === items) return
    onChange(next)
    setOpen((current) => {
      if (current === null) return current
      if (current === from) return to
      if (from < to && current > from && current <= to) return current - 1
      if (from > to && current >= to && current < from) return current + 1
      return current
    })
  }

  return (
    <div className="builder-list">
      {items.map((item, index) => (
        <div className="builder-list__item" key={index}>
          <div className="builder-list__head">
            <button type="button" className="builder-list__toggle" aria-label="展开/收起" onClick={() => setOpen(open === index ? null : index)}>
              {open === index ? '▾' : '▸'}
            </button>
            <span className="builder-list__title">
              {field.label} {index + 1}
            </span>
            <MoveButtons index={index} total={items.length} onMove={move} />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange(items.filter((_, i) => i !== index))}>
              删除
            </button>
          </div>
          {open === index && (
            <div className="builder-list__body">
              {itemFields.map((itemField) => (
                <div className="field" key={itemField.name}>
                  <span className="field__label">{itemField.label}</span>
                  {itemField.kind === 'list' ? (
                    <ListFieldEditor
                      field={itemField}
                      value={item[itemField.name]}
                      meta={meta}
                      onChange={(value) => onChange(updateItemField(items, index, itemField.name, value))}
                    />
                  ) : (
                    <FieldControl
                      field={itemField}
                      value={item[itemField.name]}
                      onChange={(value) => onChange(updateItemField(items, index, itemField.name, value))}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <button type="button" className="btn btn--secondary btn--sm" onClick={() => onChange([...items, emptyItem(itemFields)])}>
        + 新增{field.label}
      </button>
    </div>
  )
}

/** 数组型字段控件：字符串行列表 / 对象条目列表 二分（供顶层与嵌套复用） */
function ListFieldEditor({
  field,
  value,
  meta,
  onChange,
}: {
  field: BlockFieldMeta
  value: unknown
  meta: BlockTypeMeta | undefined
  onChange: (value: unknown) => void
}) {
  if (isStringList(field, value)) {
    const lines = Array.isArray(value) ? (value as unknown[]).filter((line): line is string => typeof line === 'string') : []
    return <LineListEditor lines={lines} onChange={onChange} />
  }

  const itemFields = resolveItemFields(meta, field)
  if (itemFields.length === 0) {
    return <span className="field__hint">该数组字段暂无条目字段定义（后端目录缺 listFields）。</span>
  }
  const items = Array.isArray(value)
    ? (value as unknown[]).map((item) =>
        item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : {},
      )
    : []
  return <ItemListEditor field={field} items={items} itemFields={itemFields} meta={meta} onChange={onChange} />
}

/**
 * 区块字段编辑器：按元数据渲染本区块全部 props 字段。
 * layout.children 交由父级「布局编排区」负责，这里跳过并给出提示。
 */
export function BlockEditor({
  block,
  meta,
  onChange,
}: {
  block: Block
  meta: BlockTypeMeta | undefined
  /** 回传新区块；editKey 为字段名，供上层把同一字段的连续编辑合并为一步历史 */
  onChange: (block: Block, editKey?: string) => void
}) {
  const setProp = (name: string, value: unknown) =>
    onChange({ ...block, props: { ...block.props, [name]: value } }, name)

  return (
    <div className="builder-fields">
      {meta?.fields.map((field) => {
        if (block.type === 'layout' && field.name === 'children') {
          return (
            <div className="field" key={field.name}>
              <span className="field__label">{field.label}</span>
              <span className="field__hint">子区块请在下方「布局编排」区增删排序。</span>
            </div>
          )
        }
        const value = block.props[field.name]
        return (
          <div className="field" key={field.name}>
            <span className="field__label">{field.label}</span>
            {field.kind === 'list' ? (
              <ListFieldEditor field={field} value={value} meta={meta} onChange={(value) => setProp(field.name, value)} />
            ) : (
              <FieldControl field={field} value={value} onChange={(value) => setProp(field.name, value)} />
            )}
          </div>
        )
      })}

      {!meta && (
        <div className="alert alert--warning" role="status">
          未找到「{block.type}」的字段元数据，无法自动渲染表单；请确认后端已提供 /api/content/blocks/types。
        </div>
      )}
    </div>
  )
}