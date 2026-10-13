/**
 * 主题：手动优先，其次跟随系统。
 * data-theme 挂在 <html> 上，令牌在 tokens.css 内按 [data-theme="dark"] 覆盖。
 */
export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'gh-theme'
const listeners = new Set<() => void>()

let current: Theme = 'light'

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function getStoredTheme(): Theme | null {
  const value = localStorage.getItem(STORAGE_KEY)
  return value === 'light' || value === 'dark' ? value : null
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

/** 应用启动时调用一次：恢复手动设置，否则跟随系统，并监听系统变化 */
export function initTheme(): void {
  applyTheme(getStoredTheme() ?? systemTheme())
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (event) => {
      if (!getStoredTheme()) applyTheme(event.matches ? 'dark' : 'light')
    })
}