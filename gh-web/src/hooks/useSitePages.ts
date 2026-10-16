/**
 * 页面停用集合查询 hook（下线级联）。
 *
 * 首次调用时拉取内容库页面列表（全程仅一次，模块级去重），写入 `lib/sitePages` 的
 * 模块级 store，并订阅其变化；返回 `{ pages, disabledPaths, isPathLive, isKeyLive }`，
 * 供导航 / 页脚 / 区块等任意组件在渲染链接前统一过滤死链（`pages` 供页脚按页面层级生成分组）。
 * 内容库不可用时视为「无停用页面」，不阻断页面渲染。
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { fetchPages } from '../api/content'
import type { PageMeta } from '../data/contentTypes'
import {
  getDisabledPaths,
  getSitePages,
  isHrefLive,
  isKeyLive,
  isPathLive,
  setDisabledPages,
  sitePagesVersion,
  subscribeSitePages,
} from '../lib/sitePages'

let loaded = false
let inFlight: Promise<void> | null = null

/** 加载页面列表并写入停用集合（模块级去重；失败不置 loaded，供下次重试） */
function ensureLoaded(): Promise<void> {
  if (loaded) return Promise.resolve()
  if (!inFlight) {
    inFlight = fetchPages()
      .then((res) => {
        setDisabledPages(res.items)
        loaded = true
      })
      .catch(() => {
        // 内容库不可用：视为无停用页面（不阻断导航 / 页脚渲染）
      })
      .finally(() => {
        inFlight = null
      })
  }
  return inFlight
}

export type SitePagesApi = {
  /** 内容库页面列表（含已下线页面；未加载时为空数组） */
  pages: readonly PageMeta[]
  /** 已下线页面的 path 集合（只读） */
  disabledPaths: ReadonlySet<string>
  /** 目标路径是否仍在线 */
  isPathLive: (path: string) => boolean
  /** 页面 key 是否仍在线 */
  isKeyLive: (key: string) => boolean
  /** 任意 href 是否仍可渲染（外链 / 锚点 / 空值放行；站内路径按停用集合判断） */
  isHrefLive: (href: string | undefined) => boolean
}

export function useSitePages(): SitePagesApi {
  const version = useSyncExternalStore(subscribeSitePages, sitePagesVersion, sitePagesVersion)

  useEffect(() => {
    void ensureLoaded()
  }, [])

  return useMemo(
    () => ({
      pages: getSitePages(),
      disabledPaths: getDisabledPaths(),
      isPathLive: (path: string) => isPathLive(path),
      isKeyLive: (key: string) => isKeyLive(key),
      isHrefLive: (href: string | undefined) => isHrefLive(href),
    }),
    [version],
  )
}

/** 供非 React 场景（如数据映射工具）预置停用集合；一般无需直接调用 */
export { setDisabledPages }
