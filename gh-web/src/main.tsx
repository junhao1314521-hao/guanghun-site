import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/components.css'
import './styles/site.css'
import './styles/admin.css'
import App from './App'
import { initTheme } from './lib/theme'

// JS 可用标记：.reveal 的初始隐藏依赖 .js（无 JS 时兜底显示）
document.documentElement.classList.add('js')
// 主题：手动设置优先，其次跟随系统
initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
