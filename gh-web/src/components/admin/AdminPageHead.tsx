import type { ReactNode } from 'react'

/** 后台页面统一页头：标题 + 描述 + 右侧动作区 */
export function AdminPageHead({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="admin-page__head">
      <div>
        <h1 className="admin-page__title">{title}</h1>
        {desc && <p className="admin-page__desc">{desc}</p>}
      </div>
      {actions && <div className="admin-page__actions">{actions}</div>}
    </div>
  )
}