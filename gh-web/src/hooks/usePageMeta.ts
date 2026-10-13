import { useLayoutEffect } from 'react'
import { BRAND, DEFAULT_OG_IMAGE, LANG_QUERY_KEY, hreflangLinks, pageMetaFor } from '../data/meta'

/** 写入 / 更新 <head> 中的 meta（name / property 二选一） */
export function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** 写入 / 更新 <head> 中的 link（canonical 等） */
export function upsertLink(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/** 写入 / 更新 hreflang alternate（按 hreflang 区分，避免互相覆盖） */
export function upsertAlternate(hreflang: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${hreflang}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'alternate')
    el.setAttribute('hreflang', hreflang)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/** 把当前语言同步到 URL 的 `?lang=`（保留其它查询参数；替换历史记录，不新增历史） */
export function syncUrlLang(lang: string): void {
  try {
    const url = new URL(window.location.href)
    if (lang === 'zh-CN') url.searchParams.delete(LANG_QUERY_KEY)
    else url.searchParams.set(LANG_QUERY_KEY, lang)
    window.history.replaceState(window.history.state, '', url.toString())
  } catch {
    // 非浏览器环境 / 受限环境：忽略
  }
}

/**
 * 按路由注入 SEO 元信息：`<title>`、description、robots、canonical、hreflang 与
 * Open Graph / Twitter 卡片。单一真源为 `data/meta.ts`；未收录页面下发 `noindex,follow`。
 *
 * 双语：canonical 自引用（英文页指向 `?lang=en`），并输出 zh-CN / en / x-default 的
 * `hreflang` alternate；同时把当前语言同步到 URL，保证英文版本有可被抓取、可分享的地址
 * （AC-15：带 SEO 的语言切换）。
 *
 * 使用 `useLayoutEffect`（而非 useEffect）是刻意为之：页面壳层的「基础元信息」必须早于
 * 详情页里的 `useDetailSeo`（被动 effect）落地，后者才能覆盖出真实标题 / 分享图。
 */
export function usePageMeta(pathname: string, lang: string = 'zh-CN'): void {
  useLayoutEffect(() => {
    const meta = pageMetaFor(pathname)
    const { canonical, alternates } = hreflangLinks(pathname, lang)

    // URL 上的语言标签与当前语言保持一致（英文可被抓取 / 分享）
    syncUrlLang(lang)

    document.title = meta.title
    upsertMeta('name', 'description', meta.description)
    upsertMeta('name', 'robots', meta.indexable ? 'index,follow' : 'noindex,follow')
    upsertLink('canonical', canonical)
    for (const alt of alternates) upsertAlternate(alt.hreflang, alt.href)

    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:site_name', BRAND)
    upsertMeta('property', 'og:title', meta.title)
    upsertMeta('property', 'og:description', meta.description)
    upsertMeta('property', 'og:url', canonical)
    upsertMeta('property', 'og:image', DEFAULT_OG_IMAGE)
    upsertMeta('property', 'og:locale', lang === 'en' ? 'en_US' : 'zh_CN')
    upsertMeta('name', 'twitter:card', 'summary')
    upsertMeta('name', 'twitter:title', meta.title)
    upsertMeta('name', 'twitter:description', meta.description)
    upsertMeta('name', 'twitter:image', DEFAULT_OG_IMAGE)
  }, [pathname, lang])
}
