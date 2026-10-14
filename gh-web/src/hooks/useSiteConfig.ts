import { useMemo } from 'react'
import { fetchSite } from '../api/content'
import type {
  SiteAnnouncement,
  SiteAuthConfig,
  SiteConfig,
  SiteCta,
  SiteFooterGroup,
  SiteLink,
  SiteSocialConfig,
  SiteWarrantyConfig,
} from '../data/contentTypes'
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

/** 页脚社交关注兜底（后台未配置时使用；对齐 data/site.ts 的静态真源） */
const FALLBACK_SOCIAL: SiteSocialConfig = {
  links: [
    { label: '微信', href: '#' },
    { label: '微博', href: '#' },
    { label: 'B 站', href: '#' },
    { label: '抖音', href: '#' },
  ],
  qr: [
    { label: '官方微信', image: '' },
    { label: '公众号', image: '' },
  ],
}

/** 保修参数兜底：三年质保（含烧屏保护），到期前 30 天提醒 */
const FALLBACK_WARRANTY: SiteWarrantyConfig = { years: 3, remindDays: 30, snParse: false }

/** 表单安全开关兜底：默认开启图形验证码，第三方登录关闭 */
const FALLBACK_AUTH: SiteAuthConfig = { captcha: true, thirdParty: false }

/**
 * 顶栏公告条：仅当「开启」且处于生效区间（startAt/endAt，ISO 时间串）内才返回，
 * 否则返回 null（前台不渲染）。缺省（未配置）时不展示。
 */
export function useSiteAnnouncement(): SiteAnnouncement | null {
  const site = useSiteConfig()
  return useMemo(() => {
    const a = site?.announcement
    if (!a || !a.enabled || !a.text) return null
    const now = Date.now()
    if (a.startAt && Date.parse(a.startAt) > now) return null
    if (a.endAt && Date.parse(a.endAt) < now) return null
    return a
  }, [site])
}

/** 顶栏右侧行动按钮（缺省无） */
export function useTopCta(): { primary?: SiteCta; secondary?: SiteCta } {
  const site = useSiteConfig()
  return site?.topCta ?? {}
}

/** 页脚社交与二维码：优先后台配置，缺省回退本地真源 */
export function useSiteSocial(): SiteSocialConfig {
  const site = useSiteConfig()
  return site?.social ?? FALLBACK_SOCIAL
}

/** 保修参数：优先后台配置，缺省三年 / 30 天 */
export function useSiteWarranty(): SiteWarrantyConfig {
  const site = useSiteConfig()
  return site?.warranty ?? FALLBACK_WARRANTY
}

/** 表单安全开关（图形验证码 / 第三方登录）：优先后台配置，缺省开启验证码 */
export function useSiteAuth(): SiteAuthConfig {
  const site = useSiteConfig()
  return site?.auth ?? FALLBACK_AUTH
}