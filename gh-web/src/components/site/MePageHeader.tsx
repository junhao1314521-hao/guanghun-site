import type { ReactNode } from 'react'

/**
 * 个人中心统一页头：每个页面只有这一个 h1，右侧放该页唯一的主行动。
 * 外壳只负责面包屑与侧栏，标题交给页面，避免子页 h2 与导航同名造成重复。
 */
export function MePageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="me-head">
      <div className="me-head__text">
        <h1 className="section__title">{title}</h1>
        {description ? <p className="section__desc">{description}</p> : null}
      </div>
      {action ? <div className="me-head__action">{action}</div> : null}
    </div>
  )
}
