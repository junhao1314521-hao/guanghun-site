/**
 * 后台 · 溢出菜单（行内动作超过 2 个时收进「⋯」）
 * ============================================================
 * 键盘可达：按钮 aria-haspopup="menu"/aria-expanded；点外部、Esc 关闭；
 * 支持「跳转项」（Link，如编辑）与「动作项」（button），破坏性项用 danger 呈现。
 */
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

export type OverflowMenuItem = {
  key: string
  label: string
  /** 动作项：点击执行 */
  onClick?: () => void
  /** 跳转项：站内链接 */
  to?: string
  /** 破坏性动作（删除等）→ 危险色 */
  danger?: boolean
  disabled?: boolean
  title?: string
}

export function OverflowMenu({
  items,
  label = '更多操作',
  align = 'end',
}: {
  items: OverflowMenuItem[]
  label?: string
  align?: 'start' | 'end'
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="admin-menu" ref={rootRef}>
      <button
        type="button"
        className="btn btn--ghost btn--sm admin-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        title={label}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {open && (
        <div className={`admin-menu__list${align === 'end' ? ' admin-menu__list--end' : ''}`} role="menu" id={menuId}>
          {items.map((item) =>
            item.to ? (
              <Link
                key={item.key}
                role="menuitem"
                className={`admin-menu__item${item.danger ? ' is-danger' : ''}`}
                to={item.to}
                title={item.title}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                className={`admin-menu__item${item.danger ? ' is-danger' : ''}`}
                title={item.title}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false)
                  item.onClick?.()
                }}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
