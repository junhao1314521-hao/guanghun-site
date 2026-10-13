/**
 * 前台轻量埋点上报（页面浏览 / 下载点击）。
 * ============================================================
 * - 端点：`POST /api/track/view`（`{ path }`）、`POST /api/track/download`（`{ id }`），公开无需登录。
 * - 传输：优先 `navigator.sendBeacon`（不阻塞导航卸载），不可用时回退 `fetch(..., { keepalive: true })`。
 * - **失败静默**：任何异常都不抛出、不 `console`，绝不影响页面渲染与交互。
 * - 基址沿用 `VITE_API_BASE`（同源为空串 → 相对路径；分离部署 → 绝对地址）。
 */
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

/** 依基址构造请求 URL：同源用相对路径，分离部署拼绝对地址 */
function endpoint(path: string): string {
  if (!API_BASE) return path
  try {
    return new URL(path, API_BASE).toString()
  } catch {
    return path
  }
}

/** 发送一次埋点（sendBeacon 优先，fetch keepalive 兜底；全部失败静默） */
function send(path: string, body: Record<string, unknown>): void {
  try {
    const url = endpoint(path)
    const payload = JSON.stringify(body)
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' })
      if (navigator.sendBeacon(url, blob)) return
    }
    if (typeof fetch === 'function') {
      void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // 静默：埋点失败不影响页面
      })
    }
  } catch {
    // 静默：埋点失败不影响页面
  }
}

/** 上报一次页面浏览 */
export function trackView(path: string): void {
  if (!path || !path.startsWith('/')) return
  send('/api/track/view', { path })
}

/** 上报一次下载点击 */
export function trackDownload(id: string): void {
  if (!id) return
  send('/api/track/download', { id })
}
