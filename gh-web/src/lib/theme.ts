/**
 * 主题：用户手动选择 > 站点默认主题（'auto' 时跟随系统）。
 * data-theme 挂在 <html> 上，令牌在 tokens.css 内按 [data-theme="dark"] 覆盖。
 */
export type Theme = 'light' | 'dark'

/** 站点默认主题（后台「样式」栏目配置）；'auto' = 跟随系统 */
export type SiteDefaultTheme = 'auto' | 'light' | 'dark'

const STORAGE_KEY = 'gh-theme'
const listeners = new Set<() => void>()

let current: Theme = 'light'
/** 站点默认主题（异步到达；null 视为 'auto'） */
let siteDefault: SiteDefaultTheme | null = null

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function getStoredTheme(): Theme | null {
  const value = localStorage.getItem(STORAGE_KEY)
  return value === 'light' || value === 'dark' ? value : null
}

/**
 * 解析当前应生效的主题（优先级）：
 * 1. 用户本地选择（localStorage）；
 * 2. 站点默认主题（非 'auto' 时）；
 * 3. 跟随系统。
 */
function resolveTheme(): Theme {
  const stored = getStoredTheme()
  if (stored) return stored
  if (siteDefault === 'light' || siteDefault === 'dark') return siteDefault
  return systemTheme()
}

export function getTheme(): Theme {
  return current
}

export function applyTheme(theme: Theme): void {
  current = theme
  document.documentElement.setAttribute('data-theme', theme)
  listeners.forEach((notify) => notify())
}

export function toggleTheme(): void {
  const next: Theme = current === 'dark' ? 'light' : 'dark'
  localStorage.setItem(STORAGE_KEY, next)
  applyTheme(next)
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * 应用启动时调用一次：先按「localStorage / 系统」渲染（站点默认主题此时尚未到达，
 * 避免等待接口造成闪烁），并监听系统变化。
 * 站点配置异步到达后由 `setSiteDefaultTheme` 纠正（仅当用户无本地选择时）。
 */
export function initTheme(): void {
  applyTheme(resolveTheme())
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (event) => {
      // 仅在「无用户本地选择」且「站点默认主题为 auto / 未配置」时跟随系统
      if (getStoredTheme()) return
      if (siteDefault === 'light' || siteDefault === 'dark') return
      applyTheme(event.matches ? 'dark' : 'light')
    })
}

/**
 * 站点默认主题到达 / 变更时调用（站点配置异步加载）。
 * - 用户已有本地选择（localStorage）→ 不覆盖，用户选择优先；
 * - 否则按站点默认（'auto' 时跟随系统）纠正当前主题。
 */
export function setSiteDefaultTheme(value: SiteDefaultTheme | undefined): void {
  const next: SiteDefaultTheme | null = value ?? null
  if (next === siteDefault) return
  siteDefault = next
  if (!getStoredTheme()) applyTheme(resolveTheme())
}