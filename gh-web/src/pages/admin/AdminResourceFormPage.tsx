/**
 * 后台通用资源表单页（新建 / 编辑）。
 * 依据 `data/adminResources.ts` 的 `form` 配置渲染分组字段，覆盖全部可编辑栏目。
 * 新建走 POST、编辑走 PUT；后端为会话内可持久化占位，保存后返回列表。
 *
 * 结构：外层负责取详情并处理加载 / 错误 / 未命中；内层表单在数据就绪后挂载，
 * 用 props 初始化 state，避免「用 effect 反向同步」。
 */
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchAdminResource, fetchAdminResourceDetail, saveAdminResource, type AdminDetail, type AdminList } from '../../api/admin'
import {
  adminResource,
  PRODUCT_SPEC_TEMPLATES,
  type AdminColumn,
  type AdminField,
  type AdminFieldType,
  type AdminFormSection,
  type AdminResource,
} from '../../data/adminResources'
import type { AdminRow } from '../../data/admin'
import { useApi } from '../../hooks/useApi'
import { AdminNotFound } from '../../components/admin/AdminNotFound'
import { AdminPageHead } from '../../components/admin/AdminPageHead'
import { ImageField } from '../../components/admin/ImageField'
import { MultiImageField } from '../../components/admin/MultiImageField'
import { FileField } from '../../components/admin/FileField'
import { ProductSpecEditor } from '../../components/admin/ProductSpecEditor'
import { ProductMediaField } from '../../components/admin/ProductMediaField'
import { RichTextField } from '../../components/admin/RichTextField'
import { Select } from '../../components/admin/Select'
import { hasMediaHint, mediaHintText, resolveMediaHint, resolveMediaCrops } from '../../components/admin/mediaHints'
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard'
import { slugify } from '../../lib/slug'

/** 无 form 配置时，按列定义兜底生成字段 */
function fallbackSections(columns: AdminColumn[]): AdminFormSection[] {
  const typeOf = (column: AdminColumn): AdminFieldType => {
    if (column.type === 'number') return 'number'
    if (column.type === 'bool' || column.type === 'switch') return 'switch'
    if (column.type === 'date') return 'date'
    if (column.type === 'list') return 'list'
    if (column.type === 'select') return 'select'
    if (column.type === 'textarea') return 'textarea'
    if (column.type === 'records') return 'records'
    return 'text'
  }
  return [
    {
      title: '基本信息',
      fields: columns.map((column) => ({ key: column.key, label: column.label, type: typeOf(column) })),
    },
  ]
}

/** 状态级别选项（{ level, text } 的 level），与前台 .status--* 对应 */
const STATUS_LEVEL_OPTIONS = ['success', 'warning', 'info', 'muted']

/** 状态级别展示文案：级别是内部色板键，直接显示英文对运营不可读 */
const STATUS_LEVEL_LABELS: Record<string, string> = {
  success: '绿色 · 正常',
  warning: '橙色 · 提醒',
  info: '蓝色 · 信息',
  muted: '灰色 · 弱化',
}

/** 产品上架状态：单下拉同时写文案与级别（替代原「状态文案 + 级别」两处输入） */
const PRODUCT_STATUS_PRESETS = [
  { text: '在售', level: 'success' },
  { text: '预售', level: 'warning' },
  { text: '缺货', level: 'warning' },
  { text: '下架', level: 'warning' },
  { text: '草稿', level: 'warning' },
]

/** 字符串数组字段：读取时数组 → 多行文本；编辑时以原始文本暂存，提交前再拆分 */
function listText(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join('\n')
  return value === undefined || value === null ? '' : String(value)
}

/** 单字段渲染：按类型给出输入控件；`idPrefix` 用于 records 条目内避免重复 DOM id。
 *  `required` 显示必填星号；`invalid` 给控件加 error 态与 aria-invalid。 */
function FormField({
  field,
  value,
  onChange,
  required = false,
  invalid = false,
  idPrefix = '',
  resourceKey,
  allValues,
}: {
  field: AdminField
  value: unknown
  onChange: (key: string, value: unknown) => void
  required?: boolean
  invalid?: boolean
  idPrefix?: string
  /** 资源 key：用于解析图片字段的建议上传尺寸（见 components/admin/mediaHints） */
  resourceKey?: string
  /** 表单当前全部值：3D 预览回退封面 / 参数模板等跨字段逻辑使用 */
  allValues?: Record<string, unknown>
}) {
  const fieldId = `${idPrefix}f-${field.key}`
  const req = required ? <span className="req" aria-hidden="true">*</span> : null
  const inputClass = `input${invalid ? ' input--error' : ''}`
  const textareaClass = `textarea${invalid ? ' input--error' : ''}`
  // 图片字段的规格与下游裁切预览：仅在该字段明确配置了规格时才提示（未配置不再套用兜底尺寸）
  const mediaHint =
    resourceKey && hasMediaHint({ resourceKey, fieldKey: field.key })
      ? resolveMediaHint({ resourceKey, fieldKey: field.key })
      : undefined
  const mediaCrops = mediaHint ? resolveMediaCrops(resourceKey ?? '', field.key, mediaHint) : undefined

  if (field.type === 'switch') {
    // 开关字段：label 与控件同行，说明文字（用途 / 示例）仍按统一规范渲染在下方
    return (
      <>
        <label className="switch" htmlFor={fieldId}>
          <input id={fieldId} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(field.key, event.target.checked)} />
          <span className="switch__track" />
          <span>{field.label}</span>
        </label>
        {field.hint && <span className="field__hint">{field.hint}</span>}
      </>
    )
  }

  if (field.type === 'readonly') {
    return (
      <>
        <label className="field__label" htmlFor={fieldId}>
          {field.label}
        </label>
        <input
          id={fieldId}
          className="input"
          type="text"
          value={value === undefined ? '' : String(value)}
          placeholder={field.placeholder ?? '保存后自动生成'}
          readOnly
        />
        {field.hint && <span className="field__hint">{field.hint}</span>}
      </>
    )
  }

  if (field.type === 'statusSelect') {
    // 一个下拉同时写 { text, level }：在售 / 预售 / 缺货 / 下架 / 草稿
    const current = value && typeof value === 'object' ? String((value as { text?: unknown }).text ?? '') : String(value ?? '')
    const preset = PRODUCT_STATUS_PRESETS.find((item) => item.text === current)
    const options = PRODUCT_STATUS_PRESETS.map((item) => ({ value: item.text, label: item.text }))
    if (current && !preset) options.push({ value: current, label: `${current}（当前）` })
    return (
      <>
        <label className="field__label" htmlFor={fieldId}>
          {field.label}
          {req}
        </label>
        <Select
          id={fieldId}
          invalid={invalid}
          value={current}
          onChange={(next) => {
            const matched = PRODUCT_STATUS_PRESETS.find((item) => item.text === next)
            onChange(field.key, { text: next, level: matched?.level ?? 'warning' })
          }}
          options={[{ value: '', label: '请选择状态' }, ...options]}
        />
        {field.hint && <span className="field__hint">{field.hint}</span>}
      </>
    )
  }

  if (field.type === 'status') {
    // 对象 { level, text }：文案 + 级别两段编辑
    const current = (value && typeof value === 'object' ? value : {}) as { level?: unknown; text?: unknown }
    const level = typeof current.level === 'string' ? current.level : ''
    const text = typeof current.text === 'string' ? current.text : ''
    const setStatus = (patch: { level?: string; text?: string }) => onChange(field.key, { level, text, ...patch })
    return (
      <>
        <label className="field__label" htmlFor={fieldId}>
          {field.label}
          {req}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--gh-space-3)' }}>
          <input
            id={fieldId}
            className={inputClass}
            type="text"
            aria-invalid={invalid || undefined}
            placeholder="状态文案"
            value={text}
            onChange={(event) => setStatus({ text: event.target.value })}
          />
          <Select
            invalid={invalid}
            aria-label={`${field.label} · 级别`}
            value={level}
            onChange={(next) => setStatus({ level: next })}
            options={[
              { value: '', label: '请选择级别' },
              ...(field.options ?? STATUS_LEVEL_OPTIONS).map((option) => ({
                value: option,
                label: field.optionLabels?.[option] ?? STATUS_LEVEL_LABELS[option] ?? option,
              })),
            ]}
          />
        </div>
        {field.hint && <span className="field__hint">{field.hint}</span>}
      </>
    )
  }

  if (field.type === 'list') {
    return (
      <>
        <label className="field__label" htmlFor={fieldId}>
          {field.label}
          {req}
        </label>
        <textarea
          id={fieldId}
          className={textareaClass}
          rows={4}
          aria-invalid={invalid || undefined}
          placeholder={field.placeholder}
          value={listText(value)}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
        {field.hint && <span className="field__hint">{field.hint}</span>}
      </>
    )
  }

  if (field.type === 'modellist') {
    return (
      <>
        <span className="field__label">
          {field.label}
          {req}
        </span>
        <ModelListField value={value} onChange={(next) => onChange(field.key, next)} />
        {field.hint && <span className="field__hint">{field.hint}</span>}
      </>
    )
  }

  if (field.type === 'ref') {
    // 资源引用：从目标栏目选择记录，值存 id；避免让人背下并手填 ID
    return (
      <>
        <label className="field__label" htmlFor={fieldId}>
          {field.label}
          {req}
        </label>
        <ResourceRefField field={field} id={fieldId} invalid={invalid} value={value} onChange={(next) => onChange(field.key, next)} />
        {field.hint && <span className="field__hint">{field.hint}</span>}
      </>
    )
  }

  if (field.type === 'records') {
    // 对象数组（记录列表）：每条渲染为一张子卡片，支持增 / 删 / 上移 / 下移
    return (
      <>
        <span className="field__label">
          {field.label}
          {req}
        </span>
        <RecordsField field={field} value={value} onChange={onChange} allValues={allValues} />
        {field.hint && <span className="field__hint">{field.hint}</span>}
      </>
    )
  }

  if (field.type === 'image') {
    // 图片地址：地址输入 + 上传 + 从素材库选择 + 预览（复用 ImageField）
    return (
      <>
        <label className="field__label" htmlFor={fieldId}>
          {field.label}
          {req}
        </label>
        <ImageField
          inputId={fieldId}
          label={field.label}
          placeholder={field.placeholder}
          hint={mediaHint}
          crops={mediaCrops}
          hideDefaultHint={Boolean(mediaHint)}
          value={value === undefined || value === null ? '' : String(value)}
          onChange={(url) => onChange(field.key, url)}
        />
        {mediaHint && <span className="field__hint">{mediaHintText(mediaHint)}</span>}
        {field.hint && <span className="field__hint">{field.hint}</span>}
      </>
    )
  }

  if (field.type === 'rich') {
    // 富文本正文：复用装修器共享的 RichTextField（contentEditable 编辑器，存 HTML 原文）
    return (
      <>
        <label className="field__label" htmlFor={fieldId}>
          {field.label}
          {req}
        </label>
        <RichTextField
          fieldId={fieldId}
          value={value === undefined || value === null ? '' : String(value)}
          placeholder={field.placeholder}
          onChange={(html) => onChange(field.key, html)}
        />
        {field.hint && <span className="field__hint">{field.hint}</span>}
      </>
    )
  }

  if (field.type === 'images') {
    // 多图相册：逐张上传 / 从素材库选择 + 排序（复用 ImageField 与 admin-records 排序控件）
    const list = Array.isArray(value) ? value.map((item) => String(item)) : []
    return (
      <>
        <span className="field__label">
          {field.label}
          {req}
        </span>
        <MultiImageField
          value={list}
          label={field.label}
          hint={mediaHint}
          crops={mediaCrops}
          hideDefaultHint={Boolean(mediaHint)}
          onChange={(next) => onChange(field.key, next)}
        />
        {mediaHint && <span className="field__hint">{mediaHintText(mediaHint)}</span>}
        {field.hint && <span className="field__hint">{field.hint}</span>}
      </>
    )
  }

  if (field.type === 'file') {
    // 文件地址：上传任意允许类型文件 + 从素材库选择（复用 FileField，非图片模式）
    return (
      <>
        <label className="field__label" htmlFor={fieldId}>
          {field.label}
          {req}
        </label>
        <FileField
          variant="file"
          inputId={fieldId}
          label={field.label}
          placeholder={field.placeholder}
          hideDefaultHint={Boolean(field.hint)}
          value={value === undefined || value === null ? '' : String(value)}
          onChange={(url) => onChange(field.key, url)}
        />
        {field.hint && <span className="field__hint">{field.hint}</span>}
      </>
    )
  }

  if (field.type === 'productMedia') {
    // 商品媒体总控：相册 / 主图视频 / 3D 预览合并为一块淘宝式编辑区
    return <ProductMediaField values={allValues ?? {}} onChange={onChange} />
  }

  if (field.type === 'specEditor') {
    // 结构化参数：参数名 / 取值均从常用目录下拉选择，既有自由文本原样保留
    return (
      <>
        <span className="field__label">
          {field.label}
          {req}
        </span>
        <ProductSpecEditor
          value={value}
          variant={allValues?.variant}
          onChange={(next) => onChange(field.key, next)}
        />
        {field.hint && <span className="field__hint">{field.hint}</span>}
      </>
    )
  }

  if (field.type === 'specTemplate') {
    // 常用参数模板：按设备形态把参数骨架并入 attributes（只补缺失项，不覆盖已填内容）
    return (
      <>
        <span className="field__label">
          {field.label}
          {req}
        </span>
        <SpecTemplateField
          attributes={allValues?.attributes}
          variant={allValues?.variant}
          onChange={(next) => onChange('attributes', next)}
        />
        {field.hint && <span className="field__hint">{field.hint}</span>}
      </>
    )
  }

  return (
    <>
      <label className="field__label" htmlFor={fieldId}>
        {field.label}
        {req}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          id={fieldId}
          className={textareaClass}
          rows={4}
          aria-invalid={invalid || undefined}
          placeholder={field.placeholder}
          value={String(value ?? '')}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
      ) : field.type === 'select' ? (
        <Select
          id={fieldId}
          invalid={invalid}
          value={String(value ?? '')}
          onChange={(next) => onChange(field.key, next)}
          options={[
            { value: '', label: '请选择' },
            ...(field.options ?? []).map((option) => ({
              value: option,
              label: field.optionLabels?.[option] ?? option,
            })),
          ]}
        />
      ) : (
        <input
          id={fieldId}
          className={inputClass}
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          aria-invalid={invalid || undefined}
          placeholder={field.placeholder}
          value={value === undefined ? '' : String(value)}
          onChange={(event) =>
            onChange(field.key, field.type === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value)
          }
        />

      )}
      {field.type === 'date' && !field.hint && (
        <span className="field__hint">格式 YYYY-MM-DD；留空表示未设置。</span>
      )}
      {field.hint && <span className="field__hint">{field.hint}</span>}
    </>
  )
}

/** 适用型号多选：选项来自「产品型号」集合，避免手填 id 把资料挂到错误型号；历史未知 id 也列出便于修正 */
function ModelListField({ value, onChange }: { value: unknown; onChange: (next: string[]) => void }) {
  const state = useApi<AdminList>((signal) => fetchAdminResource('models', signal), [])
  const selected = Array.isArray(value) ? value.map(String) : []
  const rows = state.data?.items ?? []
  const known = rows.map((row) => ({ id: String(row.id), label: String(row.model ?? row.name ?? row.id) }))
  const unknown = selected
    .filter((id) => !known.some((option) => option.id === id))
    .map((id) => ({ id, label: `${id}（未知型号）` }))
  const options = [{ id: 'all', label: '全部支持型号' }, ...known, ...unknown]
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])

  if (state.loading && !state.data) return <span className="field__hint">正在加载产品型号…</span>
  if (state.error) {
    return (
      <div className="alert alert--danger" role="alert">
        型号列表加载失败：{state.error.message}
      </div>
    )
  }
  return (
    <div
      role="group"
      aria-label="适用型号"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--gh-space-2) var(--gh-space-4)' }}
    >
      {options.map((option) => (
        <label key={option.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={selected.includes(option.id)}
            onChange={() => toggle(option.id)}
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}

/** 常用参数模板：按设备形态一键把参数骨架并入结构化参数（只补缺失项，不覆盖已填内容） */
function SpecTemplateField({
  attributes,
  variant,
  onChange,
}: {
  attributes: unknown
  variant: unknown
  onChange: (next: Array<Record<string, unknown>>) => void
}) {
  const rows = Array.isArray(attributes) ? (attributes as Array<Record<string, unknown>>) : []
  const existing = new Set(rows.map((row) => String(row.label ?? '').trim()).filter(Boolean))
  const current = typeof variant === 'string' ? variant : ''
  const keys = Object.keys(PRODUCT_SPEC_TEMPLATES)
  // 当前设备形态排在最前，其余模板依次列出
  const ordered = current && keys.includes(current) ? [current, ...keys.filter((key) => key !== current)] : keys

  const apply = (key: string) => {
    const template = PRODUCT_SPEC_TEMPLATES[key]
    if (!template) return
    const next = [...rows]
    for (const row of template.rows) {
      if (!next.some((item) => String(item.label ?? '').trim() === row.label)) {
        next.push({ group: row.group, label: row.label, value: row.value })
      }
    }
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--gh-space-2)' }}>
      {ordered.map((key) => {
        const template = PRODUCT_SPEC_TEMPLATES[key]
        const missing = template.rows.filter((row) => !existing.has(row.label)).length
        return (
          <button
            key={key}
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => apply(key)}
            disabled={missing === 0}
          >
            带入{template.label}参数{current === key ? '（当前形态）' : ''} · {missing} 项
          </button>
        )
      })}
    </div>
  )
}

/** records 条目字段（AdminColumn）→ 表单字段（AdminField），复用 FormField 渲染原子输入 */
function recordColumnToField(column: AdminColumn): AdminField {
  const type: AdminFieldType = column.type === 'bool' ? 'switch' : ((column.type ?? 'text') as AdminFieldType)
  return {
    key: column.key,
    label: column.label,
    type,
    options: column.options,
    optionLabels: column.optionLabels,
    hint: column.hint,
    refResource: column.refResource,
    refLabelKey: column.refLabelKey,
  }
}

/**
 * 资源引用选择器：加载目标栏目列表，以下拉方式选择记录。
 * 选项文案为「名称（id）」，历史数据里找不到的 id 也会列出，避免静默丢失引用。
 */
function ResourceRefField({
  field,
  value,
  onChange,
  id,
  invalid = false,
}: {
  field: AdminField
  value: unknown
  onChange: (next: string, row?: AdminRow) => void
  id?: string
  invalid?: boolean
}) {
  const refResource = field.refResource ?? ''
  const state = useApi<AdminList>((signal) => fetchAdminResource(refResource, signal), [refResource])
  const rows = state.data?.items ?? []
  const current = String(value ?? '')
  const labelKey = field.refLabelKey
  const labelOf = (row: AdminRow) =>
    String(
      (labelKey ? row[labelKey] : undefined) ??
        row.name ??
        row.title ??
        row.label ??
        row.model ??
        row.id ??
        '',
    )
  const options = [
    { value: '', label: state.loading && !state.data ? '正在加载…' : '请选择' },
    ...rows.map((row) => ({ value: String(row.id), label: `${labelOf(row)}（${String(row.id)}）` })),
    ...(current && !rows.some((row) => String(row.id) === current)
      ? [{ value: current, label: `${current}（未找到对应记录）` }]
      : []),
  ]
  return (
    <Select
      id={id}
      invalid={invalid}
      value={current}
      onChange={(next) => onChange(next, rows.find((row) => String(row.id) === next))}
      options={options}
      placeholder="请选择"
    />
  )
}

/** 记录短 ID：以父记录 ID 为前缀并避开同组内已用值（如 sku：gh-54027x1qe-01） */
function nextRecordId(prefix: string, records: Array<Record<string, unknown>>): string {
  const base = prefix.replace(/[^A-Za-z0-9-]/g, '').toLowerCase() || 'item'
  const used = new Set(records.map((record) => String(record.id ?? '')))
  for (let i = 1; i <= 999; i += 1) {
    const candidate = `${base}-${String(i).padStart(2, '0')}`
    if (!used.has(candidate)) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

/** 对象数组编辑器：按 recordFields 渲染每条记录，提供增 / 删 / 上移 / 下移 */
function RecordsField({
  field,
  value,
  onChange,
  allValues,
}: {
  field: AdminField
  value: unknown
  onChange: (key: string, value: unknown) => void
  /** 父表单当前值：记录 ID 自动生成时用作前缀（如产品 ID） */
  allValues?: Record<string, unknown>
}) {
  const recordFields = field.recordFields ?? []
  const records = Array.isArray(value) ? (value as Array<Record<string, unknown>>) : []

  const emit = (next: Array<Record<string, unknown>>) => onChange(field.key, next)
  const setRecord = (index: number, patch: Record<string, unknown>) =>
    emit(records.map((record, i) => (i === index ? { ...record, ...patch } : record)))
  const removeRecord = (index: number) => emit(records.filter((_, i) => i !== index))
  const moveRecord = (index: number, offset: number) => {
    const target = index + offset
    if (target < 0 || target >= records.length) return
    const next = records.slice()
    ;[next[index], next[target]] = [next[target], next[index]]
    emit(next)
  }
  const addRecord = () => {
    const blank: Record<string, unknown> = {}
    for (const column of recordFields) blank[column.key] = column.type === 'switch' || column.type === 'bool' ? false : ''
    // 记录 ID 自动填：新建行就有值，不再要求运营自己编
    if (recordFields.some((column) => column.key === 'id')) {
      blank.id = nextRecordId(String(allValues?.id ?? ''), records)
    }
    emit([...records, blank])
  }

  return (
    <div className="admin-records">
      {records.length === 0 && <p className="admin-records__empty">暂无记录，点击下方「添加一条」开始编辑。</p>}
      {records.map((record, index) => (
        <div className="admin-records__item" key={index}>
          <div className="admin-records__head">
            <span className="admin-records__index">#{index + 1}</span>
            <div className="admin-records__actions">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => moveRecord(index, -1)} disabled={index === 0}>
                上移
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => moveRecord(index, 1)}
                disabled={index === records.length - 1}
              >
                下移
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeRecord(index)}>
                删除
              </button>
            </div>
          </div>
          <div className="admin-records__grid">
            {recordFields.map((column) => (
              <div className={`field${column.type === 'textarea' ? ' admin-form__field--full' : ''}`} key={column.key}>
                {column.type === 'ref' ? (
                  <>
                    <span className="field__label">{column.label}</span>
                    <ResourceRefField
                      field={recordColumnToField(column)}
                      id={`r${index}-f-${column.key}`}
                      value={record[column.key]}
                      onChange={(next, row) => {
                        const patch: Record<string, unknown> = { [column.key]: next }
                        // 选中后同步派生字段（如 关联产品 → 产品名称），避免两处手工对齐
                        for (const [target, source] of Object.entries(column.refFills ?? {})) {
                          patch[target] = row ? String(row[source] ?? '') : ''
                        }
                        setRecord(index, patch)
                      }}
                    />
                  </>
                ) : (
                  <FormField
                    field={recordColumnToField(column)}
                    value={record[column.key]}
                    idPrefix={`r${index}-`}
                    onChange={(_key, nextValue) => setRecord(index, { [column.key]: nextValue })}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div>
        <button type="button" className="btn btn--secondary btn--sm" onClick={addRecord}>
          ＋ 添加一条
        </button>
      </div>
    </div>
  )
}

// 通用资源表单：按资源配置渲染字段，校验后新建或更新，脏数据时拦截离开
function ResourceForm({ resource, id, initial }: { resource: AdminResource; id?: string; initial: AdminRow }) {
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const sections = resource.form ?? fallbackSections(resource.columns)

  const [values, setValues] = useState<Record<string, unknown>>(initial)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 未保存修改：刷新 / 关闭 / 站内路由离开均拦截
  useUnsavedGuard(dirty)

  const allFields = useMemo(() => sections.flatMap((section) => section.fields), [sections])
  // 必填字段：取显式 required；若整表未标注（历史配置），按旧行为兜底取首个文本类字段
  const requiredKeys = useMemo(() => {
    const explicit = allFields.filter((field) => field.required).map((field) => field.key)
    if (explicit.length > 0) return new Set(explicit)
    const first = allFields.find((field) => ['text', 'textarea', 'select', 'date'].includes(field.type))
    return new Set(first ? [first.key] : [])
  }, [allFields])

  /** 值是否为空（开关 / records 不参与必填判断） */
  const isEmptyValue = (field: AdminField, value: unknown): boolean => {
    if (field.type === 'switch' || field.type === 'records' || field.type === 'productMedia') return false
    if (field.type === 'list' || field.type === 'modellist') return toList(value).length === 0
    if (field.type === 'status' || field.type === 'statusSelect') {
      const text = value && typeof value === 'object' ? (value as { text?: unknown }).text : undefined
      return String(text ?? '').trim() === ''
    }
    return String(value ?? '').trim() === ''
  }

  const setValue = (key: string, value: unknown) => {
    setValues((prev) => {
      const next: Record<string, unknown> = { ...prev, [key]: value }
      // slug 自动生成：修改标题时，若 slug 仍为空则同步生成；已手工填写的绝不覆盖
      if (key === 'title' && typeof value === 'string' && allFields.some((field) => field.key === 'slug')) {
        if (!String(next.slug ?? '').trim()) {
          const generated = slugify(value)
          if (generated) next.slug = generated
        }
      }
      return next
    })
    setDirty(true)
    // 编辑即清除该字段的既有错误，避免「边填边报」
    setErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  /** 单字段校验（失焦时调用） */
  const validateField = (field: AdminField) => {
    if (!requiredKeys.has(field.key)) return
    const message = isEmptyValue(field, values[field.key]) ? `请填写「${field.label}」` : ''
    setErrors((prev) => {
      if (!message) {
        if (!(field.key in prev)) return prev
        const next = { ...prev }
        delete next[field.key]
        return next
      }
      if (prev[field.key] === message) return prev
      return { ...prev, [field.key]: message }
    })
  }

  /** 全量校验（提交时调用），返回错误表 */
  const validateAll = (): Record<string, string> => {
    const next: Record<string, string> = {}
    for (const field of allFields) {
      if (requiredKeys.has(field.key) && isEmptyValue(field, values[field.key])) {
        next[field.key] = `请填写「${field.label}」`
      }
    }
    return next
  }

  /** 文本 → 字符串数组（每行一项，trim + 去空） */
  const toList = (raw: unknown): string[] =>
    Array.isArray(raw)
      ? raw.map((item) => String(item).trim()).filter(Boolean)
      : typeof raw === 'string'
        ? raw.split('\n').map((line) => line.trim()).filter(Boolean)
        : []

  /** 单条记录是否为空（开关未勾选 / 文本空 / 数组空 皆视为空） */
  const isBlankRecord = (record: Record<string, unknown>, fields: AdminColumn[]) =>
    fields.every((column) => {
      const raw = record[column.key]
      if (column.type === 'switch' || column.type === 'bool') return !raw
      if (Array.isArray(raw)) return raw.length === 0
      if (typeof raw === 'string') return raw.trim() === ''
      return raw === undefined || raw === null || raw === ''
    })

  /**
   * 组装提交载荷：
   * - list 字段按行拆分（trim + 去空）为字符串数组；
   * - records 字段组装为对象数组，过滤空条目，条目内 list 同样按行拆分；
   * - 其余字段原样提交（未编辑的既有值保持不变，避免改动数据）。
   */
  const buildPayload = () => {
    const payload: Record<string, unknown> = { ...values }
    for (const section of sections) {
      for (const field of section.fields) {
        if (field.type === 'list' || field.type === 'modellist') {
          payload[field.key] = toList(payload[field.key])
        } else if (field.type === 'images') {
          // 多图相册：地址数组，trim + 去空（保留顺序）
          const raw = Array.isArray(payload[field.key]) ? (payload[field.key] as unknown[]) : []
          payload[field.key] = raw.map((item) => String(item).trim()).filter(Boolean)
        } else if (field.type === 'records') {
          const fields = field.recordFields ?? []
          const raw = Array.isArray(payload[field.key]) ? (payload[field.key] as Array<unknown>) : []
          payload[field.key] = raw
            .map((item) => (item && typeof item === 'object' ? (item as Record<string, unknown>) : {}))
            .filter((record) => !isBlankRecord(record, fields))
            .map((record) => {
              const out: Record<string, unknown> = {}
              for (const column of fields) {
                const cell = record[column.key]
                if (column.type === 'list') {
                  out[column.key] = toList(cell)
                } else if (column.type === 'switch' || column.type === 'bool') {
                  // 开关仅在开启时写入，保留规范形状（如 rankings.rows.tied）
                  if (cell) out[column.key] = true
                } else if (column.type === 'number') {
                  out[column.key] = cell === '' || cell === undefined || cell === null ? null : cell
                } else {
                  out[column.key] = cell === undefined || cell === null ? '' : cell
                }
              }
              return out
            })
        } else if (field.type === 'specEditor') {
          // 结构化参数：trim + 丢弃未命名的空行，保持 { group, label, value } 形状
          const raw = Array.isArray(payload[field.key]) ? (payload[field.key] as Array<unknown>) : []
          payload[field.key] = raw
            .map((item) => (item && typeof item === 'object' ? (item as Record<string, unknown>) : {}))
            .map((row) => ({
              group: String(row.group ?? '').trim() || '其他',
              label: String(row.label ?? '').trim(),
              value: String(row.value ?? '').trim(),
            }))
            .filter((row) => row.label !== '')
        } else if (field.type === 'productMedia') {
          // 商品媒体总控：相册数组 trim + 去空（主图顺序即数组顺序）
          const raw = Array.isArray(payload.gallery) ? (payload.gallery as unknown[]) : []
          payload.gallery = raw.map((item) => String(item).trim()).filter(Boolean)
        }
      }
    }
    return payload
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    // 全量逐字段校验；聚焦首个非法字段
    const fieldErrors = validateAll()
    setErrors(fieldErrors)
    const firstInvalid = allFields.find((field) => fieldErrors[field.key])
    if (firstInvalid) {
      const el = document.getElementById(`f-${firstInvalid.key}`)
      if (el) {
        el.focus()
        el.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
      }
      return
    }
    setSubmitting(true)
    try {
      await saveAdminResource(resource.key, isEdit ? id : undefined, buildPayload())
      setDone(true)
      setDirty(false)
      window.setTimeout(() => navigate(`/admin/${resource.key}`), 700)
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : '保存失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  // 产品 / 文章：主表单 + 右侧粘性「发布」栏（状态一眼可见，主操作不必滚到底）
  const isSplit = resource.key === 'products' || resource.key === 'articles'
  const statusValue = values.status
  const statusText =
    typeof statusValue === 'string'
      ? statusValue
      : statusValue && typeof statusValue === 'object' && typeof (statusValue as { text?: unknown }).text === 'string'
        ? String((statusValue as { text?: unknown }).text)
        : '未设置'

  const sectionsNode = sections.map((section) => (
    <div className="admin-form__section" key={section.title}>
      <h2 className="admin-form__section-title">{section.title}</h2>
      <div className="admin-form__grid">
        {section.fields.map((field) => (
          <div
            className={`field${field.span === 2 ? ' admin-form__field--full' : ''}${errors[field.key] ? ' has-error' : ''}`}
            key={field.key}
            onBlur={() => validateField(field)}
          >
            <FormField
              field={field}
              value={values[field.key]}
              onChange={setValue}
              required={requiredKeys.has(field.key)}
              invalid={Boolean(errors[field.key])}
              resourceKey={resource.key}
              allValues={values}
            />
            {errors[field.key] && (
              <span className="field__error" role="alert">
                {errors[field.key]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  ))

  return (
    <form className={`admin-form${isSplit ? ' admin-form--split' : ''}`} onSubmit={submit} noValidate>
      {isSplit ? (
        <>
          <div className="admin-form__main">{sectionsNode}</div>
          <aside className="admin-form__aside" aria-label="发布">
            <div className="admin-form__aside-card">
              <h2 className="admin-form__aside-title">发布</h2>
              <dl className="admin-form__summary">
                <div>
                  <dt>状态</dt>
                  <dd>{statusText}</dd>
                </div>
                <div>
                  <dt>操作</dt>
                  <dd>{isEdit ? '编辑已有记录' : '新建记录'}</dd>
                </div>
              </dl>
              <button className={`btn btn--primary${submitting ? ' btn--loading' : ''}`} type="submit" disabled={submitting || done}>
                {submitting ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    保存中…
                  </>
                ) : (
                  '保存'
                )}
              </button>
              <Link className="btn btn--secondary" to={`/admin/${resource.key}`}>
                取消
              </Link>
            </div>
          </aside>
        </>
      ) : (
        sectionsNode
      )}

      {error && (
        <div className="alert alert--danger" style={{ marginTop: 'var(--gh-space-4)' }} role="alert">
          {error}
        </div>
      )}
      {done && (
        <div className="alert alert--success" style={{ marginTop: 'var(--gh-space-4)' }} role="status">
          已保存，正在返回列表…
        </div>
      )}

      {!isSplit && (
        <div className="admin-form__foot">
          <Link className="btn btn--secondary" to={`/admin/${resource.key}`}>
            取消
          </Link>
          <button className={`btn btn--primary${submitting ? ' btn--loading' : ''}`} type="submit" disabled={submitting || done}>
            {submitting ? (
              <>
                <span className="spinner" aria-hidden="true" />
                保存中…
              </>
            ) : (
              '保存'
            )}
          </button>
        </div>
      )}
    </form>
  )
}

// 表单容器：编辑态按 id 拉取详情并处理加载 / 错误态，再交给 ResourceForm 渲染
function ResourceFormBody({ resource, id }: { resource: AdminResource; id?: string }) {
  const isEdit = Boolean(id)
  const detailState = useApi<AdminDetail>(
    (signal) => (isEdit ? fetchAdminResourceDetail(resource.key, id as string, signal) : Promise.resolve({ item: {} })),
    [resource.key, id],
  )

  return (
    <div className="admin-page">
      <AdminPageHead
        title={`${isEdit ? '编辑' : '新建'} · ${resource.label}`}
        desc={resource.desc}
        actions={
          <Link className="btn btn--secondary btn--sm" to={`/admin/${resource.key}`}>
            返回列表
          </Link>
        }
      />

      {isEdit && detailState.loading && !detailState.data && <p className="admin-page__desc" role="status">正在加载记录…</p>}
      {isEdit && detailState.error && (
        <div className="alert alert--danger" role="alert">
          {detailState.error.message}
        </div>
      )}

      {(!isEdit || detailState.data) && !detailState.error && (
        <ResourceForm key={id ?? 'new'} resource={resource} id={id} initial={detailState.data?.item ?? {}} />
      )}
    </div>
  )
}

// 资源表单页入口：按 URL 中的 key 解析资源配置，不存在时展示未找到
export function AdminResourceFormPage() {
  const { key = '', id } = useParams()
  const resource = adminResource(key)
  if (!resource) return <AdminNotFound />
  return <ResourceFormBody resource={resource} id={id} />
}