/**
 * 动态页面兜底路由（R10.1）：固定路由均未命中时，按 URL path 反查内容库页面。
 *
 * - 命中 → 交 `PageView` 渲染（与固定页共用同一套区块渲染与加载 / 下线 / 空态）
 * - 未命中 → 渲染传入的 `fallback`（站内 404）
 * - 固定路由在 App.tsx 中优先声明（R10.2），因此 `/products/:id`、`/downloads/:id`
 *   等既有动态路由不会进入本组件。
 */
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { fetchPageByPath } from '../../api/content'
import { PageSkeleton, PageView } from '../../blocks/PageView'
import { useApi } from '../../hooks/useApi'

type Props = {
  /** 路径未命中内容库时渲染的内容（由调用方传入站内 404） */
  fallback: ReactNode
}

export function DynamicPage({ fallback }: Props) {
  const { pathname } = useLocation()
  const { data: page, loading, error } = useApi((signal) => fetchPageByPath(pathname, signal), [pathname])

  // 404（路径不存在）→ 站内 404；其他错误（网络 / 服务异常）给出可重试提示，不误报「页面不存在」
  if (error) {
    const notFound = error instanceof ApiError && error.status === 404
    if (notFound) return <>{fallback}</>
    return (
      <div className="container section">
        <div className="empty">
          <div className="empty__title">页面加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
        </div>
      </div>
    )
  }
  if (loading || !page) return <PageSkeleton />
  return <PageView pageKey={page.key} />
}
