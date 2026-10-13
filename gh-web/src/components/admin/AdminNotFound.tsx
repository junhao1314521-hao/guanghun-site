import { Link } from 'react-router-dom'

/** 后台兜底页：栏目未登记或路径不匹配时展示，避免空白 */
export function AdminNotFound({ title = '未找到该栏目', desc = '该后台栏目不存在或尚未登记。' }: { title?: string; desc?: string }) {
  return (
    <div className="admin-page">
      <div className="empty">
        <div className="empty__title">{title}</div>
        <p className="empty__desc">{desc}</p>
        <Link className="btn btn--secondary btn--sm" to="/admin">
          返回工作台
        </Link>
      </div>
    </div>
  )
}