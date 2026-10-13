/**
 * 后台全局反馈层 · 上下文与 hooks（纯逻辑，不含 JSX）
 * ============================================================
 * 单独成文件：让 ToastProvider / ConfirmDialog 只导出组件，满足 Fast Refresh 约束。
 * 使用方从本模块 import useToast / useConfirm。
 */
import { createContext, useContext, type ReactNode } from 'react'

/* ---------- Toast ---------- */
export type ToastTone = 'success' | 'danger' | 'info'

export type ToastApi = {
  /** 通用：默认信息类 */
  toast: (message: string, tone?: ToastTone) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast 必须在 ToastProvider 内使用')
  return value
}

/* ---------- Confirm ---------- */
export type ConfirmOptions = {
  title?: string
  message: ReactNode
  confirmText?: string
  cancelText?: string
  /** 破坏性操作：主按钮用 .btn--danger，且默认聚焦「取消」更安全 */
  danger?: boolean
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

export const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const value = useContext(ConfirmContext)
  if (!value) throw new Error('useConfirm 必须在 ConfirmProvider 内使用')
  return value
}
