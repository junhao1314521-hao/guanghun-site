import { useMemo } from 'react'
import { fetchSite } from '../api/content'
import type { SiteConfig, SiteFooterGroup, SiteLink } from '../data/contentTypes'
import { NAV_ITEMS, type NavItem } from '../data/nav'
import { FOOTER_GROUPS } from '../data/site'
import { useApi } from './useApi'

/**
 * 站点配置（导航 / 页脚）：优先读内容库 `GET /api/content/site`（契约 §6.1）。
 * 未就绪或请求失败时返回 null，调用方回退到本地静态数据（data/nav.ts / data/site.ts），
 * 保证站点壳在内容库不可用时仍可访问（三态不回退）。
 */
export function useSiteConfig(): SiteConfig | null {
  const { data } = useApi((signal) => fetchSite(signal), [])
  return data
}

/** 站点配置的页脚兜底：把本地硬编码 FOOTER_GROUPS 映射为契约的 SiteFooterGroup 形态 */
function fallbackFooter(): SiteFooterGroup[] {
  return FOOTER_GROUPS.map((group) => ({
    title: group.title,
    links: group.links.map((link): SiteLink => ({ label: link.label, href: link.to })),
  }))
}

/**
 * 顶栏 / 抽屉的导航项：内容库 `site.nav` 提供 label + href，下拉菜单的关键字
 * （menu / nav）由本地 `NAV_ITEMS` 按 label（其次 href）匹配补齐——后台只维护
 * 一级入口，展开面的内容仍复用本地真源，从而保留原有下拉交互与当前项高亮。
 * 内容库未就绪或为空时整体回退到 NAV_ITEMS，页面永远有导航。
 */
export function useSiteNav(): NavItem[] {
  const site = useSiteConfig()
  return useMemo(() => {
    const links = site?.nav ?? []
    if (links.length === 0) return NAV_ITEMS
    return links.map((link) => {
      const matched =
        NAV_ITEMS.find((item) => item.label === link.label) ??
        NAV_ITEMS.find((item) => item.to === link.href)
      return {
        label: link.label,
        to: link.href,
        menu: matched?.menu ?? '',
        nav: matched?.nav,
        // 角标以后台站点配置为准；未配置时回退本地 NAV_ITEMS 的默认角标
        badge: link.badge ?? matched?.badge,
        badgeText: link.badgeText ?? matched?.badgeText,
        badgeShake: link.badgeShake ?? matched?.badgeShake,
      }
    })
  }, [site])
}

/** 页脚分组：优先内容库 `site.footer`，为空 / 不可用时回退本地硬编码 */
export function useSiteFooterGroups(): SiteFooterGroup[] {
  const site = useSiteConfig()
  return useMemo(() => (site?.footer && site.footer.length > 0 ? site.footer : fallbackFooter()), [site])
}