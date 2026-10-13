/**
 * 17. richText 富文本模块（自定义模块 · 自由内容区块）
 * props: { html: string }
 *
 * 存原文、渲染时白名单净化（见 `sanitize.ts`），净化结果再交给
 * `dangerouslySetInnerHTML`。标签集覆盖标题 / 段落 / 加粗 / 斜体 / 列表 /
 * 链接 / 图片 / GIF 等基本排版。
 */
import { useMemo } from 'react'
import { asString } from './blockUtils'
import { sanitizeRichText } from './sanitize'

export function RichTextBlock({ props }: { props: Record<string, unknown> }) {
  const html = asString(props.html)
  const safeHtml = useMemo(() => sanitizeRichText(html), [html])
  return <div className="blk-rich" dangerouslySetInnerHTML={{ __html: safeHtml }} />
}
