/**
 * 明细页装修区（契约 §2 / §8 / §10）：把 `template-*` 页面的启用区块接到明细页底部。
 *
 * 明细页主体（产品 / 系列 / 文章 / 下载 / 问答 / 案例 / 体验点 / 型号支持 / 对比）
 * 由既有的结构化组件渲染；本组件只负责取该模板页在内容库中配置的「装修区」区块，
 * 并渲染在主体之后，实现「结构化明细 + 可装修区块」的组合。
 */
import { useRef } from 'react'
import { fetchPage } from '../api/content'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'
import { BlockRenderer } from './BlockRenderer'

/**
 * 明细页底部装修区：按 `pageKey` 取内容库单页，仅渲染其中 `enabled === true` 的区块。
 *
 * - 取数：公开端点 `GET /api/content/pages/:key`（复用既有 `fetchPage`，后端未命中返回 404）；
 * - 容错（契约 §8「明细主体不因装修区缺失而受影响」）：加载中 / 404 / 请求失败 / 页面为空 /
 *   区块全部停用，一律返回 `null`，不产生错误态、不占用布局，明细页主体照常渲染；
 * - 页头：不使用 PageView 的页头逻辑（区块内标题已是 h2），避免明细页出现第二个 h1；
 * - 动效：以「数据就绪」为 readyKey 触发一次进入动效（与 PageView / 首页一致），
 *   用一个包裹 div 作为 rootRef，保证装修区区块随站点节奏入场。
 */
export function TemplateBlocks({ pageKey }: { pageKey: string }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { data: page, loading, error } = useApi((signal) => fetchPage(pageKey, signal), [pageKey])

  // 数据到位后区块才挂载，用 readyKey 触发一次动效重绑（与 PageView 一致）
  const readyKey = `${pageKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  // 加载中 / 404 / 请求失败 / 页面缺失 → 不渲染（明细主体不受影响）
  if (loading || error || !page) return null

  // 仅渲染启用区块；全部停用等同空页面 → 不渲染
  const blocks = page.blocks.filter((block) => block.enabled)
  if (blocks.length === 0) return null

  return (
    <div ref={rootRef} data-template-blocks={pageKey}>
      <BlockRenderer blocks={blocks} />
    </div>
  )
}
