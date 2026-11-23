/**
 * 产品「SKU 与库存」编辑器（后台产品表单专用）。
 *
 * 淘宝式流程：
 * 1. 先定义规格组（最多 3 组，如 颜色 / 版本），规格值用逗号分隔；
 * 2. 点「生成组合」按笛卡尔积生成 SKU 明细，已有组合的价格 / 库存 / 编码原样保留；
 * 3. 明细行内直接改价、改库存、填编码，顶部给出 SKU 数、总库存与价格区间；
 * 4. 规格组变更后再次生成：只移除不再存在的组合（删除前二次确认），不重排未变组合。
 *
 * 存储格式不变：`skuOptions: [{ name, values }]`、`skus: [{ id, option1..3, price, stock, skuCode }]`，
 * 同时把 `options` 数组写入明细，前台 `ProductHeroBlock` 两种形状都能识别。
 */
import { useMemo, useState } from 'react'
import { IconClose, IconPlus, IconRefresh } from '../ui/Icon'
import { useConfirm, useToast } from './feedback'

type Group = { name: string; values: string }
type SkuRow = {
  id: string
  options: string[]
  option1?: string
  option2?: string
  option3?: string
  price?: string | number
  stock?: string | number
  skuCode?: string
}

type Props = {
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

const SEPARATOR = /\s*[,，、]\s*/

function text(value: unknown): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''
}

/** 规格值归一：数组或逗号分隔字符串 → 去空数组 */
function splitValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => text(item).trim()).filter(Boolean)
  return text(value).split(SEPARATOR).map((item) => item.trim()).filter(Boolean)
}

/** 规格组读取：保留原始输入文本（便于逗号编辑），过滤空名 */
function asGroups(value: unknown): Group[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      name: text(item.name).trim(),
      values: Array.isArray(item.values) ? splitValues(item.values).join('，') : text(item.values),
    }))
}

/** 明细读取：options 数组优先，历史数据回退 option1～3 */
function asSkus(value: unknown): SkuRow[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => {
      const options = Array.isArray(item.options)
        ? item.options.map((part) => text(part).trim()).filter(Boolean)
        : [item.option1, item.option2, item.option3].map((part) => text(part).trim()).filter(Boolean)
      return {
        id: text(item.id),
        options,
        option1: text(item.option1),
        option2: text(item.option2),
        option3: text(item.option3),
        price: item.price as string | number | undefined,
        stock: item.stock as string | number | undefined,
        skuCode: text(item.skuCode),
      }
    })
}

/** 组合键：用于按规格值匹配历史价格 / 库存 */
function comboKey(options: string[]): string {
  return options.join('\u0001')
}

/** 金额解析：允许「¥1,299」这类文本，取不到数字返回 null */
function amountOf(value: unknown): number | null {
  const raw = text(value).replace(/[^\d.-]/g, '')
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function skuId(productId: string, index: number): string {
  return `${productId || 'sku'}-${String(index + 1).padStart(2, '0')}`
}

/** 笛卡尔积；任一规格值为空时调用方已过滤，故这里只做组合计算 */
function cartesian(groups: Group[]): string[][] {
  return groups.reduce<string[][]>((acc, group) => {
    const values = splitValues(group.values)
    return acc.flatMap((prefix) => values.map((value) => [...prefix, value]))
  }, [[]])
}

export function ProductSkuEditor({ values, onChange }: Props) {
  const toast = useToast()
  const confirm = useConfirm()
  const groups = asGroups(values.skuOptions)
  const skus = asSkus(values.skus)
  const productId = text(values.id)

  const [batchPrice, setBatchPrice] = useState('')
  const [batchStock, setBatchStock] = useState('')

  const usableGroups = groups.filter((group) => group.name && splitValues(group.values).length > 0)
  /** 已生成组合与当前规格组是否一致（用于提示「规格组已变更」） */
  const comboSignature = useMemo(
    () => cartesian(usableGroups).map(comboKey).sort().join('\u0002'),
    [usableGroups],
  )
  const skuSignature = useMemo(() => skus.map((sku) => comboKey(sku.options)).sort().join('\u0002'), [skus])
  const outOfSync = usableGroups.length > 0 && comboSignature !== skuSignature

  const totalStock = skus.reduce((sum, sku) => sum + (amountOf(sku.stock) ?? 0), 0)
  const prices = skus.map((sku) => amountOf(sku.price)).filter((value): value is number => value != null)
  const priceRange = prices.length
    ? Math.min(...prices) === Math.max(...prices)
      ? `¥${prices[0]}`
      : `¥${Math.min(...prices)} – ¥${Math.max(...prices)}`
    : skus.length
      ? '沿用参考价'
      : '—'

  /** 更新规格组：直接写回 `skuOptions`，保持输入文本原样 */
  const writeGroups = (next: Group[]) => onChange('skuOptions', next)

  const addGroup = () => {
    if (groups.length >= 3) {
      toast.error('最多 3 组规格')
      return
    }
    writeGroups([...groups, { name: '', values: '' }])
  }

  const updateGroup = (index: number, patch: Partial<Group>) => {
    writeGroups(groups.map((group, i) => (i === index ? { ...group, ...patch } : group)))
  }

  const removeGroup = (index: number) => {
    writeGroups(groups.filter((_, i) => i !== index))
  }

  const writeSkus = (next: SkuRow[]) => onChange('skus', next)

  const generate = async () => {
    if (usableGroups.length === 0) {
      toast.error('请先填写至少一组规格名与规格值')
      return
    }
    const combos = cartesian(usableGroups)
    if (combos.length > 200) {
      toast.error(`组合数 ${combos.length} 超过 200，请缩减规格值`)
      return
    }
    const nextKeys = new Set(combos.map(comboKey))
    const removed = skus.filter((sku) => !nextKeys.has(comboKey(sku.options))).length
    if (removed > 0) {
      const ok = await confirm({
        title: '更新 SKU 组合',
        message: `有 ${removed} 个已有组合不在新规格中，更新后将移除它们的价格与库存。继续？`,
        confirmText: '继续更新',
        danger: true,
      })
      if (!ok) return
    }
    const previous = new Map(skus.map((sku) => [comboKey(sku.options), sku]))
    let kept = 0
    const next = combos.map((options, index) => {
      const old = previous.get(comboKey(options))
      if (old) kept += 1
      return {
        id: old?.id || skuId(productId, index),
        options,
        option1: options[0] ?? '',
        option2: options[1] ?? '',
        option3: options[2] ?? '',
        price: old?.price ?? '',
        stock: old?.stock ?? '',
        skuCode: old?.skuCode ?? '',
      }
    })
    writeSkus(next)
    toast.success(`已生成 ${next.length} 个组合${kept ? `，保留 ${kept} 个已有价格 / 库存` : ''}`)
  }

  const addManualSku = () => {
    writeSkus([...skus, { id: skuId(productId, skus.length), options: [], option1: '', option2: '', option3: '', price: '', stock: '', skuCode: '' }])
  }

  const updateSku = (index: number, patch: Partial<SkuRow>) => {
    writeSkus(skus.map((sku, i) => (i === index ? { ...sku, ...patch } : sku)))
  }

  const removeSku = (index: number) => {
    writeSkus(skus.filter((_, i) => i !== index))
  }

  const applyBatch = () => {
    if (!batchPrice.trim() && !batchStock.trim()) {
      toast.error('先填写要批量应用的价格或库存')
      return
    }
    writeSkus(
      skus.map((sku) => ({
        ...sku,
        price: batchPrice.trim() ? batchPrice.trim() : sku.price,
        stock: batchStock.trim() ? batchStock.trim() : sku.stock,
      })),
    )
    toast.success(`已应用到 ${skus.length} 个 SKU`)
    setBatchPrice('')
    setBatchStock('')
  }

  return (
    <div className="sku-editor">
      <section className="sku-editor__panel">
        <header className="sku-editor__panel-head">
          <div>
            <h3 className="sku-editor__panel-title">规格组</h3>
            <p className="sku-editor__panel-hint">最多 3 组，规格值用逗号分隔（如：曜石黑，冰川白）。</p>
          </div>
          <button type="button" className="btn btn--secondary btn--sm" onClick={addGroup} disabled={groups.length >= 3}>
            <IconPlus size={14} /> 添加规格组
          </button>
        </header>

        {groups.length === 0 ? (
          <p className="sku-editor__empty-hint">还没有规格组。单规格商品可跳过，直接在下方明细里手动添加一行。</p>
        ) : (
          <ul className="sku-editor__groups">
            {groups.map((group, index) => {
              const values = splitValues(group.values)
              return (
                <li className="sku-editor__group" key={index}>
                  <input
                    className="input sku-editor__group-name"
                    value={group.name}
                    placeholder="规格名，如 颜色"
                    aria-label={`第 ${index + 1} 组规格名`}
                    onChange={(event) => updateGroup(index, { name: event.target.value })}
                  />
                  <input
                    className="input sku-editor__group-values"
                    value={group.values}
                    placeholder="规格值，如 曜石黑，冰川白"
                    aria-label={`第 ${index + 1} 组规格值`}
                    onChange={(event) => updateGroup(index, { values: event.target.value })}
                  />
                  <span className="sku-editor__group-count">{values.length ? `${values.length} 个值` : '待填写'}</span>
                  <button
                    type="button"
                    className="sku-editor__icon-btn"
                    aria-label={`删除第 ${index + 1} 组规格`}
                    title="删除该规格组"
                    onClick={() => removeGroup(index)}
                  >
                    <IconClose size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="sku-editor__generate">
          <button type="button" className="btn btn--primary btn--sm" onClick={generate} disabled={usableGroups.length === 0}>
            <IconRefresh size={14} /> {skus.length ? '更新 SKU 组合' : '生成 SKU 组合'}
          </button>
          {outOfSync && (
            <span className="sku-editor__warn">
              {skus.length ? '规格组已变更，点按钮同步组合' : '点按钮生成组合'}
            </span>
          )}
          <span className="sku-editor__summary">
            SKU <strong>{skus.length}</strong> · 总库存 <strong>{totalStock}</strong> · 价格 <strong>{priceRange}</strong>
          </span>
        </div>
      </section>

      <section className="sku-editor__panel">
        <header className="sku-editor__panel-head">
          <div>
            <h3 className="sku-editor__panel-title">SKU 明细</h3>
            <p className="sku-editor__panel-hint">价格留空沿用产品参考价；库存填数字，合计自动计算。</p>
          </div>
          <button type="button" className="btn btn--secondary btn--sm" onClick={addManualSku}>
            <IconPlus size={14} /> 手动添加一行
          </button>
        </header>

        {skus.length === 0 ? (
          <p className="sku-editor__empty-hint">暂无 SKU。定义规格组后点「生成 SKU 组合」，或手动添加一行。</p>
        ) : (
          <>
            <div className="sku-editor__batch">
              <span className="sku-editor__batch-label">批量填充</span>
              <input
                className="input"
                value={batchPrice}
                inputMode="decimal"
                placeholder="价格（元）"
                aria-label="批量价格"
                onChange={(event) => setBatchPrice(event.target.value)}
              />
              <input
                className="input"
                value={batchStock}
                inputMode="numeric"
                placeholder="库存"
                aria-label="批量库存"
                onChange={(event) => setBatchStock(event.target.value)}
              />
              <button type="button" className="btn btn--secondary btn--sm" onClick={applyBatch}>
                应用到全部
              </button>
              <span className="sku-editor__batch-hint">留空的项保持原值</span>
            </div>

            <div className="sku-editor__table-wrap">
              <table className="admin-table sku-editor__table">
                <thead>
                  <tr>
                    <th>规格组合</th>
                    <th className="sku-editor__col-num">价格（元）</th>
                    <th className="sku-editor__col-num">库存</th>
                    <th>SKU 编码</th>
                    <th className="sku-editor__col-op">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {skus.map((sku, index) => (
                    <tr key={sku.id || index}>
                      <td>
                        <span className="sku-editor__combo">
                          {sku.options.length ? sku.options.join(' / ') : <em>未绑定规格</em>}
                        </span>
                        <span className="sku-editor__id">{sku.id}</span>
                      </td>
                      <td>
                        <input
                          className="input sku-editor__num"
                          value={text(sku.price)}
                          inputMode="decimal"
                          placeholder="参考价"
                          aria-label={`${sku.id} 价格`}
                          onChange={(event) => updateSku(index, { price: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="input sku-editor__num"
                          value={text(sku.stock)}
                          inputMode="numeric"
                          placeholder="0"
                          aria-label={`${sku.id} 库存`}
                          onChange={(event) => updateSku(index, { stock: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          value={sku.skuCode ?? ''}
                          placeholder="选填"
                          aria-label={`${sku.id} 编码`}
                          onChange={(event) => updateSku(index, { skuCode: event.target.value })}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="sku-editor__icon-btn"
                          aria-label={`删除 ${sku.id}`}
                          title="删除该 SKU"
                          onClick={() => removeSku(index)}
                        >
                          <IconClose size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
