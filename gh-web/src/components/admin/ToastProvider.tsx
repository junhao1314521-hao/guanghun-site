/**
 * 后台全局反馈层 · Toast 提供者
 * ============================================================
 * 统一的轻量提示：成功 / 失败 / 信息三类，自动消失，支持多条队列。
 * 固定右下角浮层（对齐前台 .demo-toast 做法），不再由各页在内容末尾各自渲染 + setTimeout。
 * 在后台路由树外层挂载 <ToastProvider>；子组件用 `useToast()`（见 ./feedback）。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { IconClose } from '../ui/Icon'
import { ToastContext, type ToastApi, type ToastTone } from './feedback'

type ToastItem = { id: number; message: string; tone: ToastTone }

/** 自动消失时长（与前台 demo-toast 量级一致） */
const TOAST_DURATION = 3200

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const timersRef = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const push = useCallback(
    (message: string, tone: ToastTone) => {
      idRef.current += 1
      const id = idRef.current
      setItems((prev) => [...prev, { id, message, tone }])
      timersRef.current.set(id, window.setTimeout(() => dismiss(id), TOAST_DURATION))
    },
    [dismiss],
  )

  // 卸载时清理在途定时器
  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
      timersRef.current.clear()
    },
    [],
  )

  const api = useMemo<ToastApi>(
    () => ({
      toast: (message, tone = 'info') => push(message, tone),
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'danger'),
      info: (message) => push(message, 'info'),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="admin-toast-viewport" role="region" aria-label="通知">
        {items.map((item) => (
          <div key={item.id} className={`toast admin-toast admin-toast--${item.tone}`} role="status" aria-live="polite">
            <span className="admin-toast__message">{item.message}</span>
            <button type="button" className="admin-toast__close" aria-label="关闭通知" onClick={() => dismiss(item.id)}>
              <IconClose size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
