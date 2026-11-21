/**
 * 首屏启动数据：由服务端写进 HTML（`window.__GH_BOOTSTRAP__`，见 gh-server `injectBootstrap`）。
 * 用途是让「公告条」这类会改变布局的内容在 React 首帧即可渲染，避免配置异步到达后插入
 * 把下方内容整体下移（CLS）。数据仅作首帧初值，接口返回后仍以后台配置为准。
 */
export type BootstrapAnnouncement = { text: string; href?: string; dismissible?: boolean }
export type SiteBootstrap = { announcement: BootstrapAnnouncement | null }

/** 读取并校验启动数据；结构不符时按「无公告」处理，不让脏数据影响首帧 */
export function readSiteBootstrap(): SiteBootstrap | null {
  if (typeof window === 'undefined') return null
  const raw = (window as unknown as { __GH_BOOTSTRAP__?: unknown }).__GH_BOOTSTRAP__
  if (!raw || typeof raw !== 'object') return null
  const value = (raw as { announcement?: unknown }).announcement
  if (!value || typeof value !== 'object') return { announcement: null }
  const record = value as Record<string, unknown>
  if (typeof record.text !== 'string' || !record.text.trim()) return { announcement: null }
  return {
    announcement: {
      text: record.text,
      href: typeof record.href === 'string' && record.href ? record.href : undefined,
      dismissible: record.dismissible === true,
    },
  }
}
