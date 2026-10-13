/**
 * 离开未保存内容保护（SPA）
 * ============================================================
 * 统一处理「有未保存修改时离开」：
 *   1) beforeunload —— 刷新 / 关闭标签页；
 *   2) 捕获阶段拦截站内 <a> 点击 —— 先确认，再 navigate；
 *   3) popstate（浏览器后退）—— 确认放行，取消则前进回原页。
 *
 * 说明：本项目使用声明式 <BrowserRouter>（非 data router）。React Router 的
 * `useBlocker` 依赖数据路由上下文（DataRouterContext），在声明式路由下调用会抛错，
 * 故此处以其等价能力手工实现 SPA 路由拦截，避免为单个功能迁移整棵路由树带来的回归风险。
 * 确认弹窗复用统一 ConfirmDialog（useConfirm）。
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConfirm } from '../components/admin/feedback'

export function useUnsavedGuard(dirty: boolean, message = '有未保存的修改，离开后将会丢失。确定离开吗？') {
  const navigate = useNavigate()
  const confirm = useConfirm()

  // 1) 刷新 / 关闭
  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // 2) 站内链接点击拦截（捕获阶段，先于 react-router 的 Link onClick）
  useEffect(() => {
    if (!dirty) return
    const onClick = async (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target as Element | null
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return
      const raw = anchor.getAttribute('href') ?? ''
      if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return
      let url: URL
      try {
        url = new URL(anchor.href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      const next = url.pathname + url.search + url.hash
      const current = window.location.pathname + window.location.search + window.location.hash
      if (next === current) return
      event.preventDefault()
      event.stopPropagation()
      const ok = await confirm({ title: '离开当前页面？', message, confirmText: '离开', cancelText: '留在本页', danger: true })
      if (ok) navigate(next)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [dirty, message, confirm, navigate])

  // 3) 浏览器后退
  useEffect(() => {
    if (!dirty) return
    let restoring = false
    const onPop = () => {
      if (restoring) {
        restoring = false
        return
      }
      void confirm({ title: '离开当前页面？', message, confirmText: '离开', cancelText: '留在本页', danger: true }).then((ok) => {
        if (!ok) {
          restoring = true
          window.history.go(1)
        }
      })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [dirty, message, confirm])
}
