/**
 * 后台「样式」栏目（站点级设计令牌编辑）。
 * ============================================================
 * 不再是假数据表，而是**站点级令牌编辑**：编辑少量安全令牌（见 lib/siteTheme.ts 白名单），
 * 保存到站点配置 `theme` 字段（`PUT /api/admin/theme`）。
 * 前台加载站点配置后由 `applyThemeTokens` 通过 document.documentElement 注入覆盖（仅白名单内变量）。
 *
 * 「重置为默认」= 保存空 theme，前台随即移除全部已注入变量、回落到样式表默认值。
 * 双主题：内联覆盖对明/暗同时生效，故令牌均为与明暗无关的几何/排版项（或需用户自保证对比度的主色实底）。
 */
import { useMemo, useState } from 'react'
import { fetchAdminSite, saveDefaultTheme, saveTheme } from '../../api/adminPages'
import type { SiteConfig } from '../../api/adminPages'
import { useApi } from '../../hooks/useApi'
import { AdminPageHead } from '../../components/admin/AdminPageHead'
import { ErrorState } from '../../components/admin/states'
import { Select } from '../../components/admin/Select'
import { useConfirm, useToast } from '../../components/admin/feedback'
import { THEME_TOKEN_META } from '../../lib/siteTheme'

/** 站点默认主题取值 */
type DefaultTheme = 'auto' | 'light' | 'dark'

/** 默认主色回退（取色器需要合法 hex 初值） */
const COLOR_FALLBACK = '#2040ED'
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function StylesEditor({ initial }: { initial: SiteConfig }) {
  const [theme, setTheme] = useState<Record<string, string>>(initial.theme ?? {})
  const [saving, setSaving] = useState(false)
  const [defaultTheme, setDefaultTheme] = useState<DefaultTheme>(initial.defaultTheme ?? 'auto')
  const [savingDefaultTheme, setSavingDefaultTheme] = useState(false)
  const toast = useToast()
  const confirm = useConfirm()

  const dirty = useMemo(() => JSON.stringify(theme) !== JSON.stringify(initial.theme ?? {}), [theme, initial.theme])

  /** 切换默认主题即保存（复用同一套后台控件与反馈） */
  const onDefaultThemeChange = async (value: string) => {
    const next = value as DefaultTheme
    if (next === defaultTheme) return
    setSavingDefaultTheme(true)
    try {
      await saveDefaultTheme(next)
      setDefaultTheme(next)
      toast.success('已保存默认主题；新访客（无本地记录）将按此主题渲染。')
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '保存默认主题失败，请稍后重试')
    } finally {
      setSavingDefaultTheme(false)
    }
  }

  const setValue = (key: string, value: string) => {
    setTheme((prev) => {
      const next = { ...prev }
      if (value.trim()) next[key] = value
      else delete next[key]
      return next
    })
  }

  const onSave = async () => {
    setSaving(true)
    try {
      const saved = await saveTheme(theme)
      setTheme(saved)
      toast.success('已保存样式令牌，前台刷新即可生效。')
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  const onReset = async () => {
    const ok = await confirm({
      title: '重置为默认',
      message: '将清除所有站点级令牌覆盖，恢复设计系统默认值。确定继续？',
      confirmText: '重置',
      danger: true,
    })
    if (!ok) return
    setSaving(true)
    try {
      await saveTheme({})
      setTheme({})
      toast.success('已重置为默认样式，前台刷新即可生效。')
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '重置失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHead
        title="样式"
        desc={`站点级设计令牌（仅白名单内变量生效）${dirty ? ' · 有未保存修改' : ''}`}
        actions={
          <>
            <button type="button" className="btn btn--danger-ghost btn--sm" onClick={onReset} disabled={saving}>
              重置为默认
            </button>
            <button
              type="button"
              className={`btn btn--primary btn--sm${saving ? ' btn--loading' : ''}`}
              onClick={onSave}
              disabled={saving}
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

      <div className="admin-form" style={{ maxWidth: 'none' }}>
        <div className="admin-form__section">
          <h2 className="admin-form__section-title">默认主题</h2>
          <p className="admin-page__desc" style={{ marginBottom: 'var(--gh-space-4)' }}>
            新访客（无本地记录）进入站点时按此主题渲染；顶栏手动切换始终优先，并记忆在访客本地。
          </p>
          <div className="admin-form__grid">
            <div className="field">
              <label className="field__label" htmlFor="th-default-theme">
                默认主题
              </label>
              <Select
                id="th-default-theme"
                value={defaultTheme}
                aria-label="默认主题"
                disabled={savingDefaultTheme}
                onChange={(value) => void onDefaultThemeChange(value)}
                options={[
                  { value: 'auto', label: '跟随系统' },
                  { value: 'light', label: '浅色' },
                  { value: 'dark', label: '暗色' },
                ]}
              />
              <span className="field__hint">切换后立即保存；用户手动选择优先于站点默认主题。</span>
            </div>
          </div>
        </div>

        <div className="admin-form__section">
          <h2 className="admin-form__section-title">设计令牌</h2>
          <p className="admin-page__desc" style={{ marginBottom: 'var(--gh-space-4)' }}>
            覆盖值将注入站点的 CSS 变量；留空表示使用默认值（同一取值对明 / 暗两套主题同时生效）。
          </p>
          <div className="admin-form__grid">
            {THEME_TOKEN_META.map((token) => {
              const value = theme[token.key] ?? ''
              return (
                <div className="field" key={token.key} style={{ gridColumn: 'span 2' }}>
                  <label className="field__label" htmlFor={`th-${token.key}`}>
                    {token.label}
                    <span className="mono" style={{ marginLeft: 'var(--gh-space-2)', color: 'var(--color-text-tertiary)' }}>
                      {token.key}
                    </span>
                  </label>
                  <div className="row" style={{ gap: 'var(--gh-space-2)' }}>
                    {token.kind === 'color' && (
                      <input
                        type="color"
                        aria-label={`${token.label}取色器`}
                        value={HEX_RE.test(value) ? value : COLOR_FALLBACK}
                        onChange={(event) => setValue(token.key, event.target.value)}
                        style={{ width: 40, height: 36, padding: 0, border: '1px solid var(--color-border-default)', borderRadius: 'var(--gh-radius-sm)', background: 'transparent' }}
                      />
                    )}
                    <input
                      id={`th-${token.key}`}
                      className="input"
                      type="text"
                      placeholder={token.placeholder}
                      value={value}
                      onChange={(event) => setValue(token.key, event.target.value)}
                    />
                    {value && (
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setValue(token.key, '')}>
                        清除
                      </button>
                    )}
                  </div>
                  <span className="field__hint">{token.hint}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminStylesPage() {
  const state = useApi<SiteConfig>((signal) => fetchAdminSite(signal), [])

  if (state.loading && !state.data) {
    return (
      <div className="admin-page">
        <AdminPageHead title="样式" desc="站点级设计令牌编辑" />
        <p className="admin-page__desc" role="status">
          正在加载样式令牌…
        </p>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="admin-page">
        <AdminPageHead title="样式" desc="站点级设计令牌编辑" />
        <ErrorState message={state.error.message} />
      </div>
    )
  }

  if (!state.data) return null
  return <StylesEditor initial={state.data} />
}
