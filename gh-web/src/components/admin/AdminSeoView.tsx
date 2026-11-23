/**
 * 后台「SEO 元信息」栏目。
 * ============================================================
 * 真实数据源：`GET /api/admin/seo`（静态路由默认值 + 当前覆盖）。
 * 保存写 `seo_overrides` 表，服务端注入 head 与前端路由元信息同时生效；
 * 「恢复默认」删除覆盖记录，回落到 `data/seoDefaults.ts`。
 *
 * 详情页（产品 / 文章 / 下载 / FAQ 等）标题由内容数据自动生成，不在本页编辑。
 */
import { useEffect, useMemo, useState } from 'react'
import { fetchSeoAdmin, resetSeoOverride, saveSeoOverride } from '../../api/seo'
import type { SeoAdminItem } from '../../api/seo'
import { useApi } from '../../hooks/useApi'
import { AdminPageHead } from '../../components/admin/AdminPageHead'
import { ErrorState } from '../../components/admin/states'
import { useConfirm, useToast } from '../../components/admin/feedback'

/** 简短时间展示（ISO → YYYY-MM-DD HH:mm） */
function formatTime(iso: string): string {
  if (!iso) return ''
  return iso.slice(0, 16).replace('T', ' ')
}

export function AdminSeoView() {
  const state = useApi(fetchSeoAdmin, [])
  const [items, setItems] = useState<SeoAdminItem[]>([])
  const [selected, setSelected] = useState('')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState({ title: '', description: '', indexable: true, image: '' })
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const confirm = useConfirm()

  // 取数成功后同步本地列表，默认选中第一条
  useEffect(() => {
    const data = state.data
    if (!data) return
    setItems(data)
    if (data.length === 0) return
    setSelected((prev) => prev || data[0].path)
  }, [state.data])

  const current = useMemo(() => items.find((item) => item.path === selected), [items, selected])

  // 选中项变化时重置草稿
  useEffect(() => {
    setDraft({
      title: current?.title ?? '',
      description: current?.description ?? '',
      indexable: current?.indexable ?? true,
      image: current?.image ?? '',
    })
    // 仅在切换路由或保存后（items 更新）同步草稿
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, current?.updatedAt, current?.title, current?.description, current?.indexable, current?.image])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return items
    return items.filter(
      (item) =>
        item.path.toLowerCase().includes(keyword) || item.title.toLowerCase().includes(keyword),
    )
  }, [items, query])

  const dirty = Boolean(
    current &&
      (draft.title !== current.title ||
        draft.description !== current.description ||
        draft.indexable !== current.indexable ||
        draft.image !== current.image),
  )

  const onSave = async () => {
    if (!current) return
    setSaving(true)
    try {
      const saved = await saveSeoOverride({
        path: current.path,
        title: draft.title,
        description: draft.description,
        indexable: draft.indexable,
        image: draft.image,
      })
      setItems((prev) => prev.map((item) => (item.path === saved.path ? saved : item)))
      toast.success('已保存：服务端注入即时生效，前台刷新页面即可看到新标题与描述。')
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  const onReset = async () => {
    if (!current) return
    const ok = await confirm({
      title: '恢复默认元信息',
      message: `将删除「${current.path}」的 SEO 覆盖，恢复为代码内置的默认值。确定继续？`,
      confirmText: '恢复默认',
      danger: true,
    })
    if (!ok) return
    setSaving(true)
    try {
      const saved = await resetSeoOverride(current.path)
      setItems((prev) => prev.map((item) => (item.path === saved.path ? saved : item)))
      toast.success('已恢复默认元信息。')
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '恢复失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  if (state.loading && !state.data) {
    return (
      <div className="admin-page">
        <AdminPageHead title="SEO 元信息" desc="静态路由的标题、描述与收录开关" />
        <p className="admin-page__desc" role="status">
          正在加载路由元信息…
        </p>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="admin-page">
        <AdminPageHead title="SEO 元信息" desc="静态路由的标题、描述与收录开关" />
        <ErrorState message={state.error.message} />
      </div>
    )
  }

  return (
    <div className="admin-page">
      <AdminPageHead
        title="SEO 元信息"
        desc="编辑静态页面的标题、描述与收录开关；保存后服务端注入立即生效，前台刷新即可看到。"
        actions={
          <button
            type="button"
            className={`btn btn--primary btn--sm${saving ? ' btn--loading' : ''}`}
            onClick={onSave}
            disabled={saving || !current || !dirty}
          >
            {saving ? (
              <>
                <span className="spinner" aria-hidden="true" />
                保存中…
              </>
            ) : (
              '保存'
            )}
          </button>
        }
      />

      <p className="admin-page__desc">
        详情页（产品 / 文章 / 下载 / FAQ / 体验点等）的标题与描述由内容数据自动生成，不在此编辑。
        关闭「允许收录」会输出 noindex,follow，页面仍可被访问。
      </p>

      <div className="seo-page">
        <aside className="seo-nav" aria-label="静态路由列表">
          <input
            className="input seo-nav__search"
            type="search"
            placeholder="搜索路径或标题"
            aria-label="搜索路径或标题"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ul className="seo-nav__list">
            {filtered.map((item) => (
              <li key={item.path}>
                <button
                  type="button"
                  className={`seo-nav__item${item.path === selected ? ' is-active' : ''}`}
                  onClick={() => setSelected(item.path)}
                >
                  <span className="seo-nav__path">{item.path}</span>
                  <span className="seo-nav__title">{item.title}</span>
                  {item.override && <span className="seo-nav__badge">已改</span>}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="seo-nav__empty">没有匹配的路由</li>}
          </ul>
        </aside>

        {current ? (
          <form
            className="seo-editor admin-form__section"
            onSubmit={(event) => {
              event.preventDefault()
              void onSave()
            }}
          >
            <h2 className="admin-form__section-title">
              <code>{current.path}</code>
            </h2>
            <p className="admin-page__desc">
              {current.override
                ? `当前已覆盖默认值（更新于 ${formatTime(current.updatedAt)}）。`
                : '当前使用代码内置默认值。'}
            </p>

            <div className="field">
              <label className="field__label" htmlFor="seo-title">
                页面标题
              </label>
              <input
                id="seo-title"
                className="input"
                type="text"
                maxLength={80}
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              />
              <span className="field__hint">
                建议 30 字以内；浏览器标签、搜索结果与分享卡片均使用此标题。默认：{current.defaultTitle}
              </span>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="seo-description">
                页面描述
              </label>
              <textarea
                id="seo-description"
                className="input"
                rows={3}
                maxLength={200}
                value={draft.description}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, description: event.target.value }))
                }
              />
              <span className="field__hint">
                建议 80–120 字；默认：{current.defaultDescription}
              </span>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="seo-image">
                分享图地址
              </label>
              <input
                id="seo-image"
                className="input"
                type="text"
                maxLength={300}
                placeholder="/og-cover.jpg 或 https://…"
                value={draft.image}
                onChange={(event) => setDraft((prev) => ({ ...prev, image: event.target.value }))}
              />
              <span className="field__hint">
                用于微信 / 社交分享卡片（1200×630 最佳）；留空使用站点默认分享图。
              </span>
            </div>

            <div className="field">
              <span className="field__label">搜索引擎收录</span>
              <label className="switch" style={{ gap: 'var(--gh-space-2)' }}>
                <input
                  type="checkbox"
                  checked={draft.indexable}
                  aria-label={draft.indexable ? '关闭收录' : '允许收录'}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, indexable: event.target.checked }))
                  }
                />
                <span className="switch__track" />
                <span>{draft.indexable ? '允许收录' : '不允许收录（noindex）'}</span>
              </label>
              <span className="field__hint">默认：{current.defaultIndexable ? '允许收录' : '不允许收录'}。</span>
            </div>

            <div className="seo-editor__actions">
              <button
                type="submit"
                className={`btn btn--primary btn--sm${saving ? ' btn--loading' : ''}`}
                disabled={saving || !dirty}
              >
                {saving ? '保存中…' : '保存修改'}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => void onReset()}
                disabled={saving || !current.override}
              >
                恢复默认
              </button>
              {dirty && <span className="seo-editor__dirty">有未保存修改</span>}
            </div>
          </form>
        ) : (
          <div className="seo-editor admin-form__section">
            <p className="admin-page__desc">请选择左侧路由开始编辑。</p>
          </div>
        )}
      </div>
    </div>
  )
}
