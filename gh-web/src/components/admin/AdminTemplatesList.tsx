/**
 * 后台「模板」栏目（页面区块快照）。
 * ============================================================
 * 数据源为 `GET /api/admin/templates`（集合 `templates`）。能力：
 *   - 「从页面新建模板」：选择页面 → 快照其 blocks 存为模板（POST /api/admin/templates）；
 *   - 删除模板（二次确认，复用 useConfirm）；
 *   - 列表预览区块类型序列（用区块类型目录把 type 映射为名称）。
 * 模板形状：`{ id, name, scope, blockCount, blocks, createdAt }`。
 */
import { useMemo, useState, type FormEvent } from 'react'
import { createTemplate, deleteTemplate, fetchTemplates, type TemplateList } from '../../api/adminTemplates'
import { fetchAdminPages, fetchBlockTypeCatalog, type Block, type BlockTypeMeta, type PageMeta } from '../../api/adminPages'
import { useApi } from '../../hooks/useApi'
import { AdminPageHead } from './AdminPageHead'
import { typeName } from './blockBuilderUtils'
import { useConfirm, useToast } from './feedback'

/** ISO 时间 → 紧凑展示 */
function formatTime(iso: string): string {
  return iso ? iso.replace('T', ' ').slice(0, 16) : '—'
}

/** 适用范围候选 */
const SCOPES = ['营销页', '详情页', '列表页', '通用']

/** 「从页面新建模板」内联表单 */
function NewTemplateForm({ pages, onCreated }: { pages: PageMeta[]; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [scope, setScope] = useState(SCOPES[0])
  const [pageKey, setPageKey] = useState(pages[0]?.key ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('模板名称必填')
      return
    }
    if (!pageKey) {
      setError('请选择要快照的页面')
      return
    }
    setSubmitting(true)
    try {
      await createTemplate({ name: name.trim(), scope, pageKey })
      toast.success(`已从页面「${pageKey}」创建模板「${name.trim()}」`)
      setName('')
      onCreated()
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : '新建失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="admin-form" onSubmit={submit} noValidate style={{ maxWidth: 'none', marginBottom: 'var(--gh-space-4)' }}>
      <div className="admin-form__section">
        <h2 className="admin-form__section-title">从页面新建模板</h2>
        <div className="admin-form__grid">
          <div className="field">
            <label className="field__label" htmlFor="nt-name">模板名称</label>
            <input id="nt-name" className="input" type="text" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="nt-scope">适用范围</label>
            <select id="nt-scope" className="select" value={scope} onChange={(event) => setScope(event.target.value)}>
              {SCOPES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="nt-page">来源页面</label>
            <select id="nt-page" className="select" value={pageKey} onChange={(event) => setPageKey(event.target.value)}>
              {pages.map((page) => (
                <option key={page.key} value={page.key}>
                  {page.title}（{page.key}）
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <div className="alert alert--danger" role="alert" style={{ marginTop: 'var(--gh-space-4)' }}>
            {error}
          </div>
        )}
        <div className="admin-form__foot" style={{ position: 'static' }}>
          <button className={`btn btn--primary${submitting ? ' btn--loading' : ''}`} type="submit" disabled={submitting}>
            {submitting ? '创建中…' : '创建模板'}
          </button>
        </div>
      </div>
    </form>
  )
}

export function AdminTemplatesList() {
  const [reloadKey, setReloadKey] = useState(0)
  const state = useApi<TemplateList>((signal) => fetchTemplates(signal), [reloadKey])
  const pagesState = useApi((signal) => fetchAdminPages(signal), [])
  const catalog = useApi<BlockTypeMeta[]>((signal) => fetchBlockTypeCatalog(signal), [])
  const confirm = useConfirm()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set())

  // 区块 type → 名称（目录缺失时回退 type 本身）
  const typeMap = useMemo(() => {
    const map: Record<string, BlockTypeMeta> = {}
    for (const meta of catalog.data ?? []) map[meta.type] = meta
    return map
  }, [catalog.data])

  const rows = (state.data?.items ?? []).filter((item) => !removed.has(item.id))

  const onDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: '删除模板',
      message: `确认删除模板「${name}」？此操作不可撤销（已从该模板初始化的页面不受影响）。`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteTemplate(id)
      setRemoved((prev) => new Set(prev).add(id))
      toast.success(`已删除「${name}」`)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '删除失败')
    }
  }

  const sequenceOf = (blocks: Block[]): string => {
    if (blocks.length === 0) return '（空）'
    return blocks.map((block) => typeName(block.type, typeMap[block.type])).join(' → ')
  }

  return (
    <div className="admin-page">
      <AdminPageHead
        title="模板"
        desc="可复用的页面区块快照；新建页面时可从模板起步，一键初始化区块。"
        actions={
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setCreating((value) => !value)}>
            {creating ? '收起新建' : '从页面新建模板'}
          </button>
        }
      />

      {creating && (pagesState.data?.items?.length ?? 0) > 0 && (
        <NewTemplateForm pages={pagesState.data?.items ?? []} onCreated={() => setReloadKey((key) => key + 1)} />
      )}
      {creating && (pagesState.data?.items?.length ?? 0) === 0 && (
        <div className="alert alert--warning" role="status" style={{ marginBottom: 'var(--gh-space-4)' }}>
          暂无可作为来源的页面，请先到「页面列表」创建页面。
        </div>
      )}

      <div className="admin-table-wrap">
        {state.loading && rows.length === 0 ? (
          <div className="admin-skeleton-table" role="status" aria-label="正在加载">
            {Array.from({ length: 4 }).map((_, i) => (
              <div className="admin-skeleton-row" key={i} style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
                {Array.from({ length: 5 }).map((__, c) => (
                  <span className="skeleton admin-skeleton-bar" key={c} />
                ))}
              </div>
            ))}
          </div>
        ) : state.error && rows.length === 0 ? (
          <div className="admin-table__empty">
            <div className="alert alert--danger" role="alert">
              {state.error.message}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="admin-table__empty">
            <div className="empty">
              <div className="empty__title">暂无模板</div>
              <p className="empty__desc">点击右上角「从页面新建模板」，把某个页面的区块存为可复用模板。</p>
            </div>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="table admin-table">
              <thead>
                <tr>
                  <th scope="col">模板名称</th>
                  <th scope="col">适用范围</th>
                  <th scope="col" style={{ textAlign: 'right' }}>区块数</th>
                  <th scope="col">区块序列</th>
                  <th scope="col">创建时间</th>
                  <th scope="col" style={{ textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td className="admin-cell--title" data-label="模板名称">
                      <strong>{item.name}</strong>
                    </td>
                    <td data-label="适用范围">
                      <span className="tag">{item.scope}</span>
                    </td>
                    <td style={{ textAlign: 'right' }} data-label="区块数">
                      <span className="mono">{item.blockCount}</span>
                    </td>
                    <td className="admin-cell--clip" data-label="区块序列" title={sequenceOf(item.blocks)}>
                      {sequenceOf(item.blocks)}
                    </td>
                    <td data-label="创建时间">{formatTime(item.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn--danger-ghost btn--sm"
                        onClick={() => void onDelete(item.id, item.name)}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
