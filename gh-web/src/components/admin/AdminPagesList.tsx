/**
 * 后台「页面」栏目列表（内容库驱动）。
 * ============================================================
 * 手动实现的页面列表（非通用列表）：数据源为内容库 `GET /api/admin/pages`（契约 §6.2），
 * 每行提供「装修」入口（进入区块装修器）与「删除」，并提供「新建页面」（key/path/title）。
 *
 * 说明：通用列表（AdminResourceListPage）的数据源是旧版 `/api/admin/resources/:key`，
 * 其页面 id 与内容库 page key 不对应，无法直接进入装修器；故此处为「页面」栏目
 * 配置了自定义视图类型 `pages`，并在后台路由中以本组件承载。
 */
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createAdminPage, deleteAdminPage, fetchAdminPages, type AdminPageList } from '../../api/adminPages'
import type { PageMeta } from '../../api/adminPages'
import { fetchTemplates, type TemplateItem } from '../../api/adminTemplates'
import { useApi } from '../../hooks/useApi'
import { AdminPageHead } from './AdminPageHead'
import { useConfirm, useToast } from './feedback'

/** ISO 时间 → 紧凑展示 */
function formatTime(iso: string): string {
  return iso ? iso.replace('T', ' ').slice(0, 16) : '—'
}

/** 新建页面内联表单（可选「从模板起步」） */
function NewPageForm({ templates, onCreated }: { templates: TemplateItem[]; onCreated: (page: PageMeta) => void }) {
  const [key, setKey] = useState('')
  const [path, setPath] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!key.trim() || !path.trim() || !title.trim()) {
      setError('key、path、title 均为必填')
      return
    }
    setSubmitting(true)
    try {
      // 从模板起步：用模板区块快照初始化新页面（浅拷贝即可，后端会持久化为该页自身区块）
      const template = templates.find((item) => item.id === templateId)
      const page = await createAdminPage({
        key: key.trim(),
        path: path.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        ...(template ? { blocks: template.blocks } : {}),
      })
      onCreated({
        key: page.key,
        path: page.path,
        title: page.title,
        description: page.description,
        blockCount: page.blocks.length,
        updatedAt: page.updatedAt,
      })
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : '新建失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="admin-form" onSubmit={submit} noValidate style={{ maxWidth: 'none', marginBottom: 'var(--gh-space-4)' }}>
      <div className="admin-form__section">
        <h2 className="admin-form__section-title">新建页面</h2>
        <div className="admin-form__grid">
          <div className="field">
            <label className="field__label" htmlFor="np-key">
              页面 key
            </label>
            <input id="np-key" className="input" type="text" placeholder="如 campaign-autumn" value={key} onChange={(e) => setKey(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="np-path">
              前台路径
            </label>
            <input id="np-path" className="input" type="text" placeholder="如 /campaign/autumn" value={path} onChange={(e) => setPath(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="np-title">
              页面标题
            </label>
            <input id="np-title" className="input" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="np-desc">
              描述（选填）
            </label>
            <input id="np-desc" className="input" type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="np-template">
              从模板起步（选填）
            </label>
            <select id="np-template" className="select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">空白页面</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}（{template.blockCount} 区块 · {template.scope}）
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
            {submitting ? '新建中…' : '创建并进入装修'}
          </button>
        </div>
      </div>
    </form>
  )
}

export function AdminPagesList() {
  const state = useApi<AdminPageList>((signal) => fetchAdminPages(signal), [])
  const templatesState = useApi((signal) => fetchTemplates(signal), [])
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set())
  const [creating, setCreating] = useState(false)

  const rows = (state.data?.items ?? []).filter((item) => !removed.has(item.key))

  const onDelete = async (item: PageMeta) => {
    const ok = await confirm({
      title: '删除页面',
      message: `确认删除页面「${item.title}」？内置页面不可删除。此操作不可撤销。`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteAdminPage(item.key)
      setRemoved((prev) => new Set(prev).add(item.key))
      toast.success(`已删除「${item.title}」`)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '删除失败')
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHead
        title="页面列表"
        desc="管理站点页面；进入装修器可视化编排区块，支持新建页面。"
        actions={
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setCreating((v) => !v)}>
            {creating ? '收起新建' : '新建页面'}
          </button>
        }
      />

      {creating && (
        <NewPageForm
          templates={templatesState.data?.items ?? []}
          onCreated={(page) => navigate(`/admin/pages/${encodeURIComponent(page.key)}/builder`)}
        />
      )}

      <div className="admin-table-wrap">
        {state.loading && rows.length === 0 ? (
          <div className="admin-skeleton-table" role="status" aria-label="正在加载">
            {Array.from({ length: 5 }).map((_, i) => (
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
              <div className="empty__title">暂无页面</div>
              <p className="empty__desc">点击右上角「新建页面」创建第一个页面。</p>
            </div>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="table admin-table">
              <thead>
                <tr>
                  <th scope="col">页面标题</th>
                  <th scope="col">页面 key</th>
                  <th scope="col">前台路径</th>
                  <th scope="col" style={{ textAlign: 'right' }}>区块数</th>
                  <th scope="col">更新时间</th>
                  <th scope="col" style={{ textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.key}>
                    <td className="admin-cell--title" data-label="页面标题">
                      <strong>{item.title}</strong>
                      {/* 明细模板：一套内容作用于该类型的所有明细页（如产品详情模板作用于全部产品） */}
                      {item.key.startsWith('template-') && (
                        <span
                          className="tag"
                          style={{ marginLeft: 'var(--gh-space-2)' }}
                          title="明细模板：这里的区块作用于该类型的所有明细页，明细数据来自对应集合"
                        >
                          明细模板
                        </span>
                      )}
                    </td>
                    <td data-label="页面 key">
                      <span className="mono">{item.key}</span>
                    </td>
                    <td data-label="前台路径">
                      <span className="mono">{item.path}</span>
                    </td>
                    <td style={{ textAlign: 'right' }} data-label="区块数">
                      <span className="mono">{item.blockCount}</span>
                    </td>
                    <td data-label="更新时间">{formatTime(item.updatedAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="admin-table__actions" style={{ justifyContent: 'flex-end' }}>
                        <Link className="btn btn--primary btn--sm" to={`/admin/pages/${encodeURIComponent(item.key)}/builder`}>
                          装修
                        </Link>
                        <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => onDelete(item)}>
                          删除
                        </button>
                      </div>
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