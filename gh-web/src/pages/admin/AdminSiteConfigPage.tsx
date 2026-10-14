/**
 * 后台「站点配置」编辑器（契约 §6.1 / §6.2）。
 * ============================================================
 * 维护全局站点配置 `SiteConfig`：
 * - 导航 `nav`：链接列表（`label` / `href`），支持 增 / 删 / 上移 / 下移 / 改字段；
 * - 页脚 `footer`：分组列表（每组 `title` + `links`），分组与组内链接均支持 增 / 删 / 上下移。
 * - 保存：PUT /api/admin/site（整体覆盖）→ 成功 Toast；
 * - 恢复为初始：从服务端重新拉取（GET /api/content/site）覆盖当前编辑
 *   （后端无站点重置端点，故仅重新加载服务端值）。
 * - 令牌失效（401）：传输器抛 ApiError，沿用会话守卫（AdminGuard）行为跳登录页。
 *
 * 字段口径以 `data/contentTypes.ts` 的 `SiteConfig` 类型为准：
 *   `SiteLink = { label, href }`、`SiteFooterGroup = { title, links: SiteLink[] }`、`SiteConfig = { nav, footer }`。
 */
import { useState } from 'react'
import { fetchAdminSite, saveAdminSite } from '../../api/adminPages'
import type { SiteConfig, SiteFooterGroup, SiteLink } from '../../api/adminPages'
import { useApi } from '../../hooks/useApi'
import { AdminPageHead } from '../../components/admin/AdminPageHead'
import { useConfirm, useToast } from '../../components/admin/feedback'
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard'

/** 不可变移动数组项（dir: -1 上移 / 1 下移）；越界则原样返回 */
function move<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir
  if (target < 0 || target >= list.length) return list
  const next = list.slice()
  const tmp = next[index]
  next[index] = next[target]
  next[target] = tmp
  return next
}

/* ============================================================
   链接列表编辑器（导航与页脚组内链接复用）
   ============================================================ */
function LinkListEditor({
  links,
  onChange,
  addLabel,
  showBadge = false,
}: {
  links: SiteLink[]
  onChange: (links: SiteLink[]) => void
  addLabel: string
  /** 是否显示「角标」配置（仅主导航需要） */
  showBadge?: boolean
}) {
  const update = (index: number, patch: Partial<SiteLink>) => {
    const next = links.slice()
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  return (
    <div className="site-links">
      {links.length === 0 && <span className="field__hint">暂无链接，点击下方「{addLabel}」添加。</span>}
      {links.map((link, index) => (
        <div className={`site-link${showBadge ? ' site-link--badge' : ''}`} key={index}>
          <input
            className="input"
            type="text"
            placeholder="名称（如 产品）"
            value={link.label}
            onChange={(event) => update(index, { label: event.target.value })}
          />
          <input
            className="input"
            type="text"
            placeholder="链接（如 /products）"
            value={link.href}
            onChange={(event) => update(index, { href: event.target.value })}
          />
          {showBadge && (
            <span className="site-link__badge">
              <select
                className="select"
                aria-label="入口角标"
                value={link.badge ?? ''}
                onChange={(event) => {
                  const value = event.target.value as '' | 'new' | 'hot'
                  update(index, { badge: value === '' ? undefined : value, ...(value === '' ? { badgeShake: undefined, badgeText: undefined } : {}) })
                }}
              >
                <option value="">无角标</option>
                <option value="new">NEW</option>
                <option value="hot">HOT</option>
              </select>
              <input
                className="input"
                type="text"
                aria-label="角标自定义文案"
                placeholder="角标文案（可留空）"
                style={{ width: 120 }}
                disabled={!link.badge}
                value={link.badgeText ?? ''}
                onChange={(event) => update(index, { badgeText: event.target.value || undefined })}
              />
              <label className="site-link__shake">
                <input
                  type="checkbox"
                  checked={Boolean(link.badgeShake)}
                  disabled={!link.badge}
                  onChange={(event) => update(index, { badgeShake: event.target.checked })}
                />
                摇动
              </label>
            </span>
          )}
          <div className="site-link__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={index === 0}
              title="上移"
              onClick={() => onChange(move(links, index, -1))}
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={index === links.length - 1}
              title="下移"
              onClick={() => onChange(move(links, index, 1))}
            >
              ↓
            </button>
            <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => onChange(links.filter((_, i) => i !== index))}>
              删除
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn--secondary btn--sm" onClick={() => onChange([...links, { label: '', href: '' }])}>
        + {addLabel}
      </button>
    </div>
  )
}

/* ============================================================
   页脚编辑器（分组 + 组内链接）
   ============================================================ */
function FooterEditor({ groups, onChange }: { groups: SiteFooterGroup[]; onChange: (groups: SiteFooterGroup[]) => void }) {
  const updateGroup = (index: number, patch: Partial<SiteFooterGroup>) => {
    const next = groups.slice()
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  return (
    <div className="site-groups">
      {groups.length === 0 && <span className="field__hint">暂无页脚分组，点击下方「新增分组」添加。</span>}
      {groups.map((group, index) => (
        <div className="site-group" key={index}>
          <div className="site-group__head">
            <input
              className="input"
              type="text"
              placeholder="分组标题（如 产品）"
              value={group.title}
              onChange={(event) => updateGroup(index, { title: event.target.value })}
            />
            <div className="site-link__actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={index === 0}
                title="上移分组"
                onClick={() => onChange(move(groups, index, -1))}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={index === groups.length - 1}
                title="下移分组"
                onClick={() => onChange(move(groups, index, 1))}
              >
                ↓
              </button>
              <button
                type="button"
                className="btn btn--danger-ghost btn--sm"
                onClick={() => onChange(groups.filter((_, i) => i !== index))}
              >
                删除分组
              </button>
            </div>
          </div>
          <LinkListEditor
            links={group.links}
            addLabel="新增链接"
            onChange={(links) => updateGroup(index, { links })}
          />
        </div>
      ))}
      <button type="button" className="btn btn--secondary btn--sm" onClick={() => onChange([...groups, { title: '', links: [] }])}>
        + 新增分组
      </button>
    </div>
  )
}

/* ============================================================
   编辑器主体（本地状态累积，点「保存」整体提交）
   ============================================================ */
function SiteConfigEditor({ initial }: { initial: SiteConfig }) {
  const [site, setSite] = useState<SiteConfig>(initial)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reloading, setReloading] = useState(false)
  const toast = useToast()
  const confirm = useConfirm()

  // 未保存修改：刷新 / 关闭 / 站内路由离开均拦截
  useUnsavedGuard(dirty)

  const setNav = (nav: SiteLink[]) => {
    setSite((prev) => ({ ...prev, nav }))
    setDirty(true)
  }

  const setFooter = (footer: SiteFooterGroup[]) => {
    setSite((prev) => ({ ...prev, footer }))
    setDirty(true)
  }

  const onSave = async () => {
    setSaving(true)
    try {
      const saved = await saveAdminSite(site)
      setSite(saved)
      setDirty(false)
      toast.success('已保存站点配置，前台刷新即可生效。')
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  const onReset = async () => {
    const ok = await confirm({
      title: '恢复为初始',
      message: '将从服务端重新加载当前站点配置，未保存的修改会丢失。确定继续？',
      confirmText: '恢复',
      danger: true,
    })
    if (!ok) return
    setReloading(true)
    try {
      const current = await fetchAdminSite()
      setSite(current)
      setDirty(false)
      toast.success('已恢复为服务端当前配置。')
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '重新加载失败')
    } finally {
      setReloading(false)
    }
  }

  const busy = saving || reloading

  return (
    <div className="admin-page">
      <AdminPageHead
        title="站点配置"
        desc={`维护全局导航与页脚（契约 §6.1 SiteConfig）${dirty ? ' · 有未保存修改' : ''}`}
        actions={
          <>
            <button type="button" className="btn btn--danger-ghost btn--sm" onClick={onReset} disabled={busy}>
              恢复为初始
            </button>
            <button
              type="button"
              className={`btn btn--primary btn--sm${saving ? ' btn--loading' : ''}`}
              onClick={onSave}
              disabled={busy}
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
          </>
        }
      />

      <div className="site-config">
        <section className="admin-panel">
          <div className="admin-panel__head">
            <h2 className="admin-panel__title">主导航</h2>
            <span className="admin-table__count">{site.nav.length} 个链接</span>
          </div>
          <p className="admin-page__desc" style={{ marginBottom: 'var(--gh-space-4)' }}>
            顶栏导航链接列表：顺序即展示顺序，「名称」为展示文案，「链接」为前台路径（如 /products）。
            可给入口加 NEW / HOT 角标，并让角标隔几秒摇动一下以吸引注意。
          </p>
          <LinkListEditor links={site.nav} onChange={setNav} addLabel="新增导航链接" showBadge />
        </section>

        <section className="admin-panel">
          <div className="admin-panel__head">
            <h2 className="admin-panel__title">页脚</h2>
            <span className="admin-table__count">{site.footer.length} 个分组</span>
          </div>
          <p className="admin-page__desc" style={{ marginBottom: 'var(--gh-space-4)' }}>
            页脚分组：每组包含一个「分组标题」与一组链接，分组顺序与组内链接顺序均即展示顺序。
          </p>
          <FooterEditor groups={site.footer} onChange={setFooter} />
        </section>
      </div>
    </div>
  )
}

/* ============================================================
   路由出口：取站点配置 → 三态 → 渲染编辑器
   ============================================================ */
export function AdminSiteConfigPage() {
  const state = useApi<SiteConfig>((signal) => fetchAdminSite(signal), [])

  if (state.loading && !state.data) {
    return (
      <div className="admin-page">
        <AdminPageHead title="站点配置" desc="维护全局导航与页脚" />
        <p className="admin-page__desc" role="status">
          正在加载站点配置…
        </p>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="admin-page">
        <AdminPageHead title="站点配置" desc="维护全局导航与页脚" />
        <div className="empty">
          <div className="empty__title">站点配置加载失败</div>
          <p className="empty__desc">{state.error.message}</p>
        </div>
      </div>
    )
  }

  if (!state.data) return null
  return <SiteConfigEditor initial={state.data} />
}