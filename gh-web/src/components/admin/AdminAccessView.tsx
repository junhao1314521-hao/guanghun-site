/**
 * 后台「成员与权限」合并页。
 * ============================================================
 * 原「工作人员」（演示集合）与「角色与权限」两处入口合并为一个页面，三个 Tab：
 *   成员        → AdminStaffView（真实 admin_users：新建 / 编辑 / 重置 / 下线 / 删除）
 *   角色        → AdminRolesView section="roles"（角色 CRUD 与权限集）
 *   权限矩阵    → AdminRolesView section="matrix"（栏目 / 端点 → 所需权限对照）
 */
import { useState } from 'react'
import { AdminPageHead } from './AdminPageHead'
import { AdminStaffView } from './AdminStaffView'
import { AdminRolesView } from './AdminRolesView'

type AccessTab = 'members' | 'roles' | 'matrix'

const TABS: Array<{ key: AccessTab; label: string }> = [
  { key: 'members', label: '成员' },
  { key: 'roles', label: '角色' },
  { key: 'matrix', label: '权限矩阵' },
]

/** 组件：成员与权限合并页（Tab 切换） */
export function AdminAccessView() {
  const [tab, setTab] = useState<AccessTab>('members')

  return (
    <div className="admin-page">
      <AdminPageHead
        title="成员与权限"
        desc="管理可登录后台的真实账号、角色与接口权限；成员数据落库 admin_users，删除与降级受保护规则约束。"
      />

      <div className="access-tabs" role="tablist" aria-label="成员与权限分类">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={`access-tab${tab === item.key ? ' is-active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'members' && <AdminStaffView />}
      {tab === 'roles' && <AdminRolesView section="roles" />}
      {tab === 'matrix' && <AdminRolesView section="matrix" />}
    </div>
  )
}
