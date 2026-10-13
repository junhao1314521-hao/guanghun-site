/**
 * 接口层 · 后台「备份 / 恢复 / 重置」（后端 /api/admin/backups、/api/admin/reset）。
 * ============================================================
 *   GET    /api/admin/backups              列表 → { items, total }（文件名 / 大小 / 时间）
 *   POST   /api/admin/backups              立即备份 → { item }
 *   GET    /api/admin/backups/:id/download 下载备份（application/json）
 *   POST   /api/admin/backups/:id/restore  覆盖恢复 → { ok: true }
 *   DELETE /api/admin/backups/:id          删除 → { ok: true }
 *   POST   /api/admin/reset                重置为初始 → { ok: true }
 *
 * 全部需后台会话（httpOnly Cookie；兼容 Bearer 分支由传输器处理）。
 * 下载以 fetch + Blob 实现，携带凭证（credentials: include），兼容同源 / 分离部署。
 */
import { ApiError, transport } from './client'
import { getAdminToken } from '../lib/adminAuth'

/** 备份条目（与后端 BackupItem 一致） */
export type BackupItem = {
  id: string
  name: string
  size: number
  at: string
}

export type BackupList = { items: BackupItem[]; total: number }

/** 重置范围 */
export type ResetScope = 'all' | 'pages' | 'collections' | 'admin'

/** 后端基址（与 client.ts 的同源 / 分离部署语义一致） */
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

/** 依基址构造请求 URL：同源用相对路径，分离部署拼绝对地址 */
function endpoint(path: string): string {
  return API_BASE ? new URL(path, API_BASE).toString() : path
}

function adminToken(): string | undefined {
  return getAdminToken() ?? undefined
}

/** 备份列表：GET /api/admin/backups */
export function listBackups(signal?: AbortSignal): Promise<BackupList> {
  return transport<BackupList>({ path: '/api/admin/backups', signal, token: adminToken() }, () => ({ items: [], total: 0 }))
}

/** 立即备份：POST /api/admin/backups */
export function createBackup(): Promise<BackupItem> {
  return transport<{ item: BackupItem }>({ path: '/api/admin/backups', method: 'POST', token: adminToken() }, () => {
    throw new ApiError('备份接口不可用', 503)
  }).then((res) => res.item)
}

/** 恢复：POST /api/admin/backups/:id/restore */
export function restoreBackup(id: string): Promise<{ ok: boolean }> {
  return transport<{ ok: boolean }>(
    { path: `/api/admin/backups/${encodeURIComponent(id)}/restore`, method: 'POST', token: adminToken() },
    () => ({ ok: true }),
  )
}

/** 删除：DELETE /api/admin/backups/:id */
export function deleteBackup(id: string): Promise<{ ok: boolean }> {
  return transport<{ ok: boolean }>(
    { path: `/api/admin/backups/${encodeURIComponent(id)}`, method: 'DELETE', token: adminToken() },
    () => ({ ok: true }),
  )
}

/** 重置为初始：POST /api/admin/reset */
export function resetSite(scope: ResetScope, key?: string): Promise<{ ok: boolean }> {
  return transport<{ ok: boolean }>(
    { path: '/api/admin/reset', method: 'POST', body: key ? { scope, key } : { scope }, token: adminToken() },
    () => ({ ok: true }),
  )
}

/** 下载备份：GET /api/admin/backups/:id/download → 触发浏览器保存 */
export async function downloadBackup(id: string): Promise<void> {
  const token = getAdminToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  let res: Response
  try {
    res = await fetch(endpoint(`/api/admin/backups/${encodeURIComponent(id)}/download`), {
      headers: Object.keys(headers).length ? headers : undefined,
      credentials: 'include',
    })
  } catch {
    throw new ApiError('网络连接失败，请稍后重试', 0)
  }
  if (!res.ok) {
    let message = `下载失败（${res.status}）`
    try {
      const payload = (await res.json()) as { error?: unknown }
      if (typeof payload?.error === 'string' && payload.error.trim()) message = payload.error
    } catch {
      // 响应非 JSON：保留状态码文案
    }
    throw new ApiError(message, res.status)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = id
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
