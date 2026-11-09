import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/components.css'
import './styles/site.css'
import './styles/admin.css'
import App from './App'
import { initTheme } from './lib/theme'

// 发版后旧标签页按旧哈希懒加载分包会 404（表现为错误页）：捕获后整页刷新一次，
// 用 sessionStorage 记时间避免刷新死循环。
window.addEventListener('vite:preloadError', (event) => {
  const key = 'gh:preload-reload'
  const last = Number(sessionStorage.getItem(key) ?? 0)
  if (Date.now() - last < 10_000) return
  sessionStorage.setItem(key, String(Date.now()))
  event.preventDefault()
  window.location.reload()
})

// JS 可用标记：.reveal 的初始隐藏依赖 .js（无 JS 时兜底显示）
document.documentElement.classList.add('js')
// 主题：手动设置优先，其次跟随系统
initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
