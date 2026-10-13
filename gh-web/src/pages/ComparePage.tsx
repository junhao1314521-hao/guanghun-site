import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TemplateBlocks } from '../blocks/TemplateBlocks'
import { fetchCompare } from '../api/product-extra'
import { COMPARE_MAX } from '../data/product-extra'
import { getProductDetail, type ProductDetail } from '../data/products'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

type CompareRow = { name: string; values: string[] }

/** 缺失值的统一呈现：标称 / 实测均以「—」表示，与零值区分 */
const MISSING = '—'

function display(value: string | undefined): string {
  if (!value || value === '—' || value === '未测量') return MISSING
  return value
}

/** 某字段（标称 / 实测）在各产品间派生出的参数行 */
function buildRows(names: string[], details: ProductDetail[], field: 'nominal' | 'measured'): CompareRow[] {
  return names.map((name) => ({
    name,
    values: details.map((detail) => {
      const row = detail.specTable.find((item) => item.name === name)
      return display(row ? row[field] : undefined)
    }),
  }))
}

/** 对比页（一级页面 · 骨架层）：标称 / 实测分区、只看差异、按列移除 */
export function ComparePage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [params, setParams] = useSearchParams()
  const [diffOnly, setDiffOnly] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const ids = (params.get('ids') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
  const limitedIds = ids.slice(0, COMPARE_MAX)
  const overflow = ids.length > COMPARE_MAX
  const idsKey = limitedIds.join(',')

  const { data, loading, error } = useApi((signal) => fetchCompare(limitedIds, signal), [idsKey, reloadKey])
  const items = useMemo(() => data?.items ?? [], [data])

  const details = useMemo(
    () => items.map((item) => getProductDetail(item.id)).filter((detail): detail is ProductDetail => Boolean(detail)),
    [items],
  )

  const paramNames = useMemo(() => {
    const names: string[] = []
    details.forEach((detail) => detail.specTable.forEach((row) => {
      if (!names.includes(row.name)) names.push(row.name)
    }))
    return names
  }, [details])

  const sections = useMemo(() => {
    if (items.length === 0) return []
    const basic: CompareRow[] = [
      { name: '品类', values: items.map((item) => item.category) },
      { name: '连接方式', values: items.map((item) => display(item.connection)) },
      { name: '参考价', values: items.map((item) => item.price) },
      { name: '库存状态', values: items.map((item) => item.status.text) },
    ]
    return [
      { title: '基本参数', rows: basic },
      { title: '标称参数（厂商公布）', rows: buildRows(paramNames, details, 'nominal') },
      { title: '实测参数（光魂实验室）', rows: buildRows(paramNames, details, 'measured') },
    ]
  }, [items, details, paramNames])

  const readyKey = `${idsKey}:${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  const removeColumn = (id: string) => {
    const next = limitedIds.filter((value) => value !== id)
    const nextParams = new URLSearchParams(params)
    if (next.length > 0) nextParams.set('ids', next.join(','))
    else nextParams.delete('ids')
    setParams(nextParams, { replace: true })
  }

  return (
    <div ref={rootRef}>
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/products">产品</Link>
          <span>/</span>
          <span>产品对比</span>
        </nav>

        <div className="section__head" style={{ marginTop: 'var(--gh-space-4)', marginBottom: 'var(--gh-space-5)', alignItems: 'flex-start' }}>
          <div>
            <h1 className="section__title">产品对比</h1>
            <p className="section__desc">
              同一页并排查看 2–4 款产品的标称与实测参数，缺失值以「—」呈现，与零值严格区分。
            </p>
          </div>
          {items.length >= 2 && (
            <label className="switch">
              <input
                type="checkbox"
                checked={diffOnly}
                onChange={(event) => setDiffOnly(event.target.checked)}
              />
              <span className="switch__track" />
              <span>只看差异</span>
            </label>
          )}
        </div>

        {overflow && (
          <p className="field__hint" style={{ marginBottom: 'var(--gh-space-4)', display: 'flex', alignItems: 'center', gap: 'var(--gh-space-2)' }}>
            <span className="status status--warning">已达上限</span>
            对比最多 {COMPARE_MAX} 款，当前仅保留前 {COMPARE_MAX} 款；如需替换请先移除已选产品。
          </p>
        )}

        {error ? (
          <div className="empty">
            <div className="empty__title">对比数据加载失败</div>
            <p className="empty__desc">{error.message}。请检查网络后重试。</p>
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
              重新加载
            </button>
          </div>
        ) : loading ? (
          <div className="table-wrap" aria-busy="true" aria-label="对比数据加载中">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>参数</th>
                  {limitedIds.map((id) => (
                    <th key={id}>
                      <span className="skeleton" style={{ display: 'inline-block', width: 88, height: 12 }} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td><span className="skeleton" style={{ display: 'inline-block', width: 72, height: 12 }} /></td>
                    {limitedIds.map((id) => (
                      <td key={id}><span className="skeleton" style={{ display: 'inline-block', width: 64, height: 12 }} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : items.length < 2 ? (
          <div className="empty">
            <div className="empty__title">请选择要对比的产品</div>
            <p className="empty__desc">请从产品列表中选择 2–4 款产品加入对比。</p>
            <Link className="btn btn--primary btn--sm" to="/products">
              前往产品列表
            </Link>
          </div>
        ) : (
          <>
            {sections.map((section) => {
              const rows = diffOnly
                ? section.rows.filter((row) => new Set(row.values).size > 1)
                : section.rows
              if (rows.length === 0) return null
              return (
                <div key={section.title} style={{ marginTop: 'var(--gh-space-6)' }}>
                  <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h4)', marginBottom: 'var(--gh-space-4)' }}>
                    {section.title}
                  </h2>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: '22%' }}>参数</th>
                          {items.map((item) => (
                            <th key={item.id}>
                              <div className="row" style={{ justifyContent: 'space-between', gap: 'var(--gh-space-2)' }}>
                                <Link to={`/products/${item.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                  {item.model}
                                </Link>
                                <button
                                  className="btn btn--ghost btn--sm"
                                  type="button"
                                  aria-label={`移除 ${item.model}`}
                                  onClick={() => removeColumn(item.id)}
                                >
                                  移除
                                </button>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.name}>
                            <td>{row.name}</td>
                            {row.values.map((value, index) => (
                              <td key={`${row.name}-${index}`} className={value === MISSING ? 'missing' : 'mono'}>
                                {value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}

            {diffOnly && sections.every((section) => section.rows.filter((row) => new Set(row.values).size > 1).length === 0) && (
              <p className="section__desc" style={{ textAlign: 'center', padding: 'var(--gh-space-7) 0' }}>
                所选产品的参数完全一致，无差异项。
              </p>
            )}
          </>
        )}
      </div>
      {!error && !loading && items.length >= 2 && <TemplateBlocks pageKey="template-compare" />}
    </div>
  )
}