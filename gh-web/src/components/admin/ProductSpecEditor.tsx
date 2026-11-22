/**
 * 产品「结构化参数」编辑器（后台产品表单专用）。
 *
 * 淘宝式录入：
 * - 参数名从常用参数目录里选（如「显示 · 刷新率」），不用手打；
 * - 取值优先给下拉选项（如 240 Hz / 280 Hz / 540 Hz），没有的选「其他」手动填写；
 * - 「尺寸 / 分辨率」这类组合参数用两个下拉拼接，避免写成十几种格式；
 * - 既有数据（含历史自由文本）原样保留：匹配不上选项时自动进入「其他」并可继续编辑。
 *
 * 存储格式不变：`attributes: [{ group, label, value }]`。
 */
import { useState } from 'react'
import { Select } from './Select'
import { PARAM_GROUPS, paramCatalogOf, type ParamDef } from '../../data/productParamCatalog'

const CUSTOM = '__custom__'

type AttributeRow = { group: string; label: string; value: string }

/** 统一成 { group, label, value } 三字段，过滤非对象项 */
function asRows(value: unknown): AttributeRow[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({
      group: String(item.group ?? '其他').trim() || '其他',
      label: String(item.label ?? '').trim(),
      value: String(item.value ?? '').trim(),
    }))
}

/** 行标识：优先用参数名（产品内不重复），自定义空名行退回索引 */
function keyOf(row: AttributeRow, index: number): string {
  return row.label ? `label:${row.label}` : `index:${index}`
}

/** 把当前值并入选项，保证历史数据不会显示成空白下拉 */
function withCurrent(options: string[], current: string): string[] {
  return current && !options.includes(current) ? [current, ...options] : options
}

/** 组合参数按「 · 」拆成两段；不是两段时不强行拆分 */
function splitPair(value: string): [string, string] | null {
  const parts = value.split(/\s*·\s*/)
  return parts.length === 2 && value.trim() ? [parts[0], parts[1]] : null
}

export function ProductSpecEditor({
  value,
  variant,
  onChange,
}: {
  value: unknown
  variant: unknown
  onChange: (next: Array<Record<string, unknown>>) => void
}) {
  const rows = asRows(value)
  const catalog = paramCatalogOf(variant)
  const defs = new Map(catalog.params.map((param) => [param.label, param]))
  // 「其他（手动填写）」的行：按参数名记录；删除 / 排序不影响其它行
  const [customRows, setCustomRows] = useState<Set<string>>(() => new Set())

  const emit = (next: AttributeRow[]) => onChange(next)
  const setRow = (index: number, patch: Partial<AttributeRow>) =>
    emit(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  const removeRow = (index: number) => {
    setCustomRows((prev) => {
      const next = new Set(prev)
      next.delete(keyOf(rows[index], index))
      return next
    })
    emit(rows.filter((_, i) => i !== index))
  }
  const markCustom = (key: string, on: boolean) =>
    setCustomRows((prev) => {
      const next = new Set(prev)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })

  const used = new Set(rows.map((row) => row.label).filter(Boolean))
  const available = catalog.params.filter((param) => !used.has(param.label))

  const addParam = (label: string) => {
    const def = defs.get(label)
    if (!def || used.has(label)) return
    emit([...rows, { group: def.group, label: def.label, value: '' }])
  }
  const addCustomRow = () => emit([...rows, { group: '其他', label: '', value: '' }])

  /** 渲染取值控件（下拉 / 组合 / 文本） */
  const renderValue = (row: AttributeRow, index: number, def: ParamDef) => {
    const key = keyOf(row, index)
    const manual = customRows.has(key)

    if (def.parts) {
      const pair = splitPair(row.value)
      const showCustom = manual || (row.value !== '' && !pair)
      if (showCustom) {
        return (
          <div className="spec-value">
            <input
              className="input"
              aria-label={`${row.label}取值`}
              value={row.value}
              placeholder={def.placeholder ?? '手动填写取值'}
              onChange={(event) => setRow(index, { value: event.target.value })}
            />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => markCustom(key, false)}>
              改用下拉选择
            </button>
          </div>
        )
      }
      const first = pair?.[0] ?? ''
      const second = pair?.[1] ?? ''
      const combine = (a: string, b: string) => setRow(index, { value: [a, b].filter(Boolean).join(' · ') })
      return (
        <div className="spec-value">
          <Select
            aria-label={`${def.parts[0].label}`}
            value={first}
            onChange={(next) => combine(next, second)}
            options={[{ value: '', label: '请选择' }, ...withCurrent(def.parts[0].options, first).map((item) => ({ value: item, label: item }))]}
          />
          <Select
            aria-label={`${def.parts[1].label}`}
            value={second}
            onChange={(next) => combine(first, next)}
            options={[{ value: '', label: '请选择' }, ...withCurrent(def.parts[1].options, second).map((item) => ({ value: item, label: item }))]}
          />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => markCustom(key, true)}>
            手动填写整项
          </button>
        </div>
      )
    }

    if (def.options) {
      const options = withCurrent(def.options, row.value)
      const showCustom = manual || (row.value !== '' && !def.options.includes(row.value))
      return (
        <div className="spec-value">
          <Select
            aria-label={`${row.label}取值`}
            value={showCustom ? CUSTOM : row.value}
            onChange={(next) => {
              if (next === CUSTOM) {
                markCustom(key, true)
                return
              }
              markCustom(key, false)
              setRow(index, { value: next })
            }}
            options={[
              { value: '', label: '请选择' },
              ...options.map((item) => ({ value: item, label: item })),
              { value: CUSTOM, label: '其他（手动填写）' },
            ]}
          />
          {showCustom && (
            <input
              className="input"
              aria-label={`${row.label}自定义取值`}
              value={row.value}
              placeholder={def.placeholder ?? '手动填写取值'}
              onChange={(event) => setRow(index, { value: event.target.value })}
            />
          )}
        </div>
      )
    }

    return (
      <div className="spec-value">
        <input
          className="input"
          aria-label={`${row.label}取值`}
          value={row.value}
          placeholder={def.placeholder ?? '填写取值'}
          onChange={(event) => setRow(index, { value: event.target.value })}
        />
      </div>
    )
  }

  /** 按分组归拢（沿用目录分组顺序；未知分组追加在末尾） */
  const grouped = new Map<string, Array<{ row: AttributeRow; index: number }>>()
  rows.forEach((row, index) => {
    const group = row.group || '其他'
    const list = grouped.get(group) ?? []
    list.push({ row, index })
    grouped.set(group, list)
  })
  const groupKeys = [
    ...PARAM_GROUPS.filter((group) => grouped.has(group)),
    ...[...grouped.keys()].filter((group) => !PARAM_GROUPS.includes(group)),
  ]

  return (
    <div className="spec-editor">
      <div className="spec-editor__add">
        <Select
          aria-label="添加常用参数"
          value=""
          onChange={(next) => addParam(next)}
          disabled={available.length === 0}
          options={[
            { value: '', label: available.length > 0 ? '＋ 添加常用参数（选择后自动加入）' : '常用参数已全部添加' },
            ...available.map((param) => ({ value: param.label, label: `${param.group} · ${param.label}` })),
          ]}
        />
        <button type="button" className="btn btn--secondary btn--sm" onClick={addCustomRow}>
          ＋ 自定义参数
        </button>
        <span className="spec-editor__count">共 {rows.length} 项</span>
      </div>

      {rows.length === 0 ? (
        <p className="admin-records__empty">还没有参数。可先点上方「添加常用参数」，或使用上方「常用参数模板」一键带入。</p>
      ) : (
        <div className="spec-editor__groups">
          {groupKeys.map((group) => {
            const items = grouped.get(group) ?? []
            return (
              <section className="spec-group" key={group} aria-label={`${group}参数`}>
                <div className="spec-group__head">
                  <span className="spec-group__title">{group}</span>
                  <span className="spec-group__count">{items.length} 项</span>
                </div>
                <div className="spec-group__grid">
                  {items.map(({ row, index }) => {
                    const def = defs.get(row.label)
                    const key = keyOf(row, index)
                    // 组合参数（两个下拉）与自定义参数占满一行，其余参数两列并排
                    const wide = !def || Boolean(def.parts)
                    return (
                      <div
                        className={`spec-cell${wide ? ' is-wide' : ''}${def ? '' : ' spec-cell--custom'}`}
                        key={`${key}-${index}`}
                      >
                        {def ? (
                          <span className="spec-cell__name" title={row.label}>
                            {row.label}
                          </span>
                        ) : (
                          <div className="spec-cell__name">
                            <Select
                              aria-label="参数分组"
                              value={row.group}
                              onChange={(next) => setRow(index, { group: next })}
                              options={PARAM_GROUPS.map((item) => ({ value: item, label: item }))}
                            />
                            <input
                              className="input"
                              aria-label="参数名"
                              value={row.label}
                              placeholder="如：响应时间"
                              onChange={(event) => setRow(index, { label: event.target.value })}
                            />
                          </div>
                        )}
                        <div className="spec-cell__value">
                          {def ? (
                            renderValue(row, index, def)
                          ) : (
                            <div className="spec-value">
                              <input
                                className="input"
                                aria-label="参数取值"
                                value={row.value}
                                placeholder="填写取值"
                                onChange={(event) => setRow(index, { value: event.target.value })}
                              />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="spec-cell__del"
                          title={`删除${row.label || '参数'}`}
                          aria-label={`删除${row.label || '参数'}`}
                          onClick={() => removeRow(index)}
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
