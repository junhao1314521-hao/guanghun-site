import { useCallback, useEffect, useState } from 'react'

/**
 * 演示环境反馈条：点击尚未接入后端的操作时给出明确提示，
 * 避免出现「点了没反应」的死按钮（符合「不提供失效交互」的约束）。
 * 接入后端后，把各触发点换成真实调用即可，本组件可整体移除。
 */
export function useDemoToast() {
  const [action, setAction] = useState<string | null>(null)
  const notify = useCallback((label: string) => setAction(label), [])
  const dismiss = useCallback(() => setAction(null), [])
  return { action, notify, dismiss }
}

export function DemoToast({ action, onDismiss }: { action: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!action) return
    const timer = window.setTimeout(onDismiss, 4200)
    return () => window.clearTimeout(timer)
  }, [action, onDismiss])

  if (!action) return null

  return (
    <div className="toast demo-toast" role="status" aria-live="polite">
      「{action}」为演示操作，尚未接入后端；上线后将执行真实操作。
    </div>
  )
}
