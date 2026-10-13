/**
 * 后台全局反馈层 · 统一确认对话框（提供者 + 对话框）
 * ============================================================
 * 以 Promise 形式提供命令式确认：`const ok = await confirm({...})`（useConfirm 见 ./feedback）。
 * 复用 ImageField 弹窗的「遮罩 + 对话框」样式骨架（本文件在 admin.css 中补充 .admin-dialog-*）。
 * 无障碍：role="alertdialog" + aria-modal，Esc 关闭，Tab 焦点陷阱，关闭后焦点归还触发器。
 * 破坏性操作（删除 / 重置）传 danger: true → 主按钮为红色实心。
 */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from './feedback'

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<{ options: ConfirmOptions; resolve: (value: boolean) => void } | null>(null)

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setPending({ options, resolve })),
    [],
  )

  const settle = useCallback((value: boolean) => {
    setPending((current) => {
      current?.resolve(value)
      return null
    })
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && <ConfirmDialog options={pending.options} onResolve={settle} />}
    </ConfirmContext.Provider>
  )
}

function ConfirmDialog({ options, onResolve }: { options: ConfirmOptions; onResolve: (value: boolean) => void }) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // 破坏性操作默认聚焦「取消」，避免误触
    ;(options.danger ? cancelRef.current : confirmRef.current)?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onResolve(false)
        return
      }
      if (event.key !== 'Tab') return
      // 焦点陷阱：在对话框内循环
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables || focusables.length === 0) return
      const list = Array.from(focusables)
      const first = list[0]
      const last = list[list.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      restoreRef.current?.focus?.()
    }
  }, [onResolve, options.danger])

  return (
    <div className="admin-dialog-overlay" role="presentation" onClick={() => onResolve(false)}>
      <div
        ref={dialogRef}
        className="admin-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="admin-dialog__title" id={titleId}>
          {options.title ?? '请确认'}
        </h2>
        <div className="admin-dialog__body">{options.message}</div>
        <div className="admin-dialog__foot">
          <button ref={cancelRef} type="button" className="btn btn--secondary" onClick={() => onResolve(false)}>
            {options.cancelText ?? '取消'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${options.danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={() => onResolve(true)}
          >
            {options.confirmText ?? '确认'}
          </button>
        </div>
      </div>
    </div>
  )
}
