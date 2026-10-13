/**
 * 18. html 模块（自定义模块 · 自由内容区块）
 * props: { html: string; note?: string }
 *
 * 允许更完整的静态 HTML（表格 / 分块 / 内联样式等）；仍经白名单净化，
 * 剔除 script / iframe / form / 事件属性 / javascript:（标签集比 richText 更宽）。
 * `note` 仅作后台备注，不在前台渲染。
 */
import { useMemo } from 'react'
import { asString } from './blockUtils'
import { sanitizeHtmlBlock } from './sanitize'

export function HtmlBlock({ props }: { props: Record<string, unknown> }) {
  const html = asString(props.html)
  const safeHtml = useMemo(() => sanitizeHtmlBlock(html), [html])
  return <div className="blk-html" dangerouslySetInnerHTML={{ __html: safeHtml }} />
}
