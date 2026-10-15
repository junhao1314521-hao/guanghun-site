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
import type {
  SiteAnnouncement,
  SiteAuthConfig,
  SiteConfig,
  SiteCta,
  SiteFooterGroup,
  SiteLink,
  SiteSocialConfig,
  SiteWarrantyConfig,
} from '../../api/adminPages'
import { useApi } from '../../hooks/useApi'
import { AdminPageHead } from '../../components/admin/AdminPageHead'
import { Select } from '../../components/admin/Select'
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
              <Select
                aria-label="入口角标"
                value={link.badge ?? ''}
                onChange={(value) => {
                  const next = value as '' | 'new' | 'hot'
                  update(index, { badge: next === '' ? undefined : next, ...(next === '' ? { badgeShake: undefined, badgeText: undefined } : {}) })
                }}
                options={[
                  { value: '', label: '无角标' },
                  { value: 'new', label: 'NEW' },
                  { value: 'hot', label: 'HOT' },
                ]}
              />
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

  // 公告条（缺省补全 enabled/text/dismissible，保证编辑器字段齐全）
  const setAnnouncement = (patch: Partial<SiteAnnouncement>) => {
    setSite((prev) => ({
      ...prev,
      announcement: { enabled: false, text: '', dismissible: true, ...prev.announcement, ...patch },
    }))
    setDirty(true)
  }

  // 顶栏 CTA（primary / secondary 任一为空对象时不下发）
  const setTopCta = (patch: { primary?: SiteCta; secondary?: SiteCta }) => {
    setSite((prev) => ({ ...prev, topCta: { ...prev.topCta, ...patch } }))
    setDirty(true)
  }

  const setAuth = (patch: Partial<SiteAuthConfig>) => {
    setSite((prev) => ({ ...prev, auth: { captcha: true, thirdParty: false, ...prev.auth, ...patch } }))
    setDirty(true)
  }

  const setWarranty = (patch: Partial<SiteWarrantyConfig>) => {
    setSite((prev) => ({ ...prev, warranty: { years: 3, remindDays: 30, snParse: false, ...prev.warranty, ...patch } }))
    setDirty(true)
  }

  const setSocial = (social: SiteSocialConfig) => {
    setSite((prev) => ({ ...prev, social }))
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

        {/* —— 公告条：顶栏上方细条，可定时上下线、可关闭 —— */}
        <section className="admin-panel">
          <div className="admin-panel__head">
            <h2 className="admin-panel__title">顶栏公告条</h2>
            <span className="admin-table__count">{site.announcement?.enabled ? '已开启' : '已关闭'}</span>
          </div>
          <p className="admin-page__desc" style={{ marginBottom: 'var(--gh-space-4)' }}>
            展示在顶栏上方的通知细条。填写起止时间后仅在区间内展示；开启「允许关闭」后访客可自行关掉（本地记忆）。
          </p>
          <div className="site-link">
            <label className="site-link__shake">
              <input
                type="checkbox"
                checked={Boolean(site.announcement?.enabled)}
                onChange={(event) => setAnnouncement({ enabled: event.target.checked })}
              />
              开启公告条
            </label>
            <label className="site-link__shake">
              <input
                type="checkbox"
                checked={Boolean(site.announcement?.dismissible)}
                onChange={(event) => setAnnouncement({ dismissible: event.target.checked })}
              />
              允许访客关闭
            </label>
          </div>
          <input
            className="input"
            type="text"
            placeholder="公告文案（如：新品上市，预约到店体验）"
            value={site.announcement?.text ?? ''}
            onChange={(event) => setAnnouncement({ text: event.target.value })}
          />
          <div className="site-links" style={{ marginTop: 'var(--gh-space-3)' }}>
            <div className="site-link">
              <input
                className="input"
                type="text"
                placeholder="点击跳转（可选，如 /business/venues）"
                value={site.announcement?.href ?? ''}
                onChange={(event) => setAnnouncement({ href: event.target.value || undefined })}
              />
            </div>
            <div className="site-link">
              <input
                className="input"
                type="text"
                aria-label="生效起始时间"
                placeholder="生效起始（可选，如 2026-10-15T00:00）"
                value={site.announcement?.startAt ?? ''}
                onChange={(event) => setAnnouncement({ startAt: event.target.value || undefined })}
              />
              <input
                className="input"
                type="text"
                aria-label="失效时间"
                placeholder="失效时间（可选，如 2026-11-15T23:59）"
                value={site.announcement?.endAt ?? ''}
                onChange={(event) => setAnnouncement({ endAt: event.target.value || undefined })}
              />
            </div>
          </div>
        </section>

        {/* —— 顶栏 CTA：购买 / 预约体验入口 —— */}
        <section className="admin-panel">
          <div className="admin-panel__head">
            <h2 className="admin-panel__title">顶栏行动按钮</h2>
          </div>
          <p className="admin-page__desc" style={{ marginBottom: 'var(--gh-space-4)' }}>
            顶栏右侧按钮（主按钮 + 次按钮）。文案或链接留空即不展示该按钮；窄屏会自动隐藏以免挤压导航。
          </p>
          <div className="site-links">
            <div className="site-link">
              <input
                className="input"
                type="text"
                placeholder="主按钮文案（如 预约体验）"
                value={site.topCta?.primary?.label ?? ''}
                onChange={(event) =>
                  setTopCta({ primary: { label: event.target.value, href: site.topCta?.primary?.href ?? '' } })
                }
              />
              <input
                className="input"
                type="text"
                placeholder="主按钮链接（如 /business/venues）"
                value={site.topCta?.primary?.href ?? ''}
                onChange={(event) =>
                  setTopCta({ primary: { label: site.topCta?.primary?.label ?? '', href: event.target.value } })
                }
              />
            </div>
            <div className="site-link">
              <input
                className="input"
                type="text"
                placeholder="次按钮文案（如 产品总览）"
                value={site.topCta?.secondary?.label ?? ''}
                onChange={(event) =>
                  setTopCta({ secondary: { label: event.target.value, href: site.topCta?.secondary?.href ?? '' } })
                }
              />
              <input
                className="input"
                type="text"
                placeholder="次按钮链接（如 /products）"
                value={site.topCta?.secondary?.href ?? ''}
                onChange={(event) =>
                  setTopCta({ secondary: { label: site.topCta?.secondary?.label ?? '', href: event.target.value } })
                }
              />
            </div>
          </div>
        </section>

        {/* —— 安全与保修：验证码 / 第三方登录开关 / 保修参数 —— */}
        <section className="admin-panel">
          <div className="admin-panel__head">
            <h2 className="admin-panel__title">安全与保修参数</h2>
          </div>
          <p className="admin-page__desc" style={{ marginBottom: 'var(--gh-space-4)' }}>
            控制表单验证码与账号安全（第三方登录仅留开关位，暂不开放外部入口），并维护质保年限与到期提醒天数。
          </p>
          <div className="site-link">
            <label className="site-link__shake">
              <input
                type="checkbox"
                checked={site.auth?.captcha !== false}
                onChange={(event) => setAuth({ captcha: event.target.checked })}
              />
              表单图形验证码
            </label>
            <label className="site-link__shake">
              <input
                type="checkbox"
                checked={Boolean(site.auth?.thirdParty)}
                onChange={(event) => setAuth({ thirdParty: event.target.checked })}
              />
              第三方登录入口（预留）
            </label>
            <label className="site-link__shake">
              <input
                type="checkbox"
                checked={Boolean(site.warranty?.snParse)}
                onChange={(event) => setWarranty({ snParse: event.target.checked })}
              />
              SN 解析出厂日期（预留）
            </label>
          </div>
          <div className="site-links" style={{ marginTop: 'var(--gh-space-3)' }}>
            <div className="site-link">
              <input
                className="input"
                type="number"
                min={1}
                placeholder="质保年限（年，默认 3）"
                value={String(site.warranty?.years ?? 3)}
                onChange={(event) => setWarranty({ years: Number(event.target.value) || 3 })}
              />
              <input
                className="input"
                type="number"
                min={1}
                placeholder="到期前提醒天数（默认 30）"
                value={String(site.warranty?.remindDays ?? 30)}
                onChange={(event) => setWarranty({ remindDays: Number(event.target.value) || 30 })}
              />
            </div>
          </div>
        </section>

        {/* —— 页脚社交与二维码：真实化 —— */}
        <section className="admin-panel">
          <div className="admin-panel__head">
            <h2 className="admin-panel__title">页脚社交与二维码</h2>
          </div>
          <p className="admin-page__desc" style={{ marginBottom: 'var(--gh-space-4)' }}>
            维护页脚社交关注链接（微信 / 微博 / B 站 / 抖音等）与官方二维码图片地址（在「素材库」上传后复制地址填入）。
          </p>
          <p className="admin-page__desc" style={{ margin: '0 0 var(--gh-space-2)' }}>
            社交关注
          </p>
          <LinkListEditor
            links={site.social?.links ?? []}
            addLabel="新增社交入口"
            onChange={(links) => setSocial({ links, qr: site.social?.qr ?? [] })}
          />
          <p className="admin-page__desc" style={{ margin: 'var(--gh-space-4) 0 var(--gh-space-2)' }}>
            官方二维码
          </p>
          <div className="site-links">
            {(site.social?.qr ?? []).map((item, index) => (
              <div className="site-link" key={index}>
                <input
                  className="input"
                  type="text"
                  placeholder="二维码名称（如 官方微信）"
                  value={item.label}
                  onChange={(event) => {
                    const qr = (site.social?.qr ?? []).slice()
                    qr[index] = { ...qr[index], label: event.target.value }
                    setSocial({ links: site.social?.links ?? [], qr })
                  }}
                />
                <input
                  className="input"
                  type="text"
                  placeholder="二维码图片地址（/uploads/…）"
                  value={item.image}
                  onChange={(event) => {
                    const qr = (site.social?.qr ?? []).slice()
                    qr[index] = { ...qr[index], image: event.target.value }
                    setSocial({ links: site.social?.links ?? [], qr })
                  }}
                />
                <div className="site-link__actions">
                  <button
                    type="button"
                    className="btn btn--danger-ghost btn--sm"
                    onClick={() =>
                      setSocial({ links: site.social?.links ?? [], qr: (site.social?.qr ?? []).filter((_, i) => i !== index) })
                    }
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setSocial({ links: site.social?.links ?? [], qr: [...(site.social?.qr ?? []), { label: '', image: '' }] })}
            >
              + 新增二维码
            </button>
          </div>
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