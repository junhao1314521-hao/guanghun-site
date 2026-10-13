/**
 * 16. layout 布局容器（契约 §4 / §9）
 * props: columns:1|2|3 / gap:'sm'|'md'|'lg' / children:Block[][]（长度 = columns；只允许一层嵌套）
 *
 * 本身不产生内容，只按列分组渲染子区块；子区块由 `render` 回调（BlockRenderer）分派，
 * 避免组件间循环依赖。契约限定一层嵌套，故子列内不再出现 layout。
 */
import type { ReactNode } from 'react'
import type { Block } from './types'
import { asArray, asNumber, asString } from './blockUtils'

export function LayoutBlock({
  props,
  render,
}: {
  props: Record<string, unknown>
  render: (blocks: Block[]) => ReactNode
}) {
  const columns = asNumber(props.columns, 1)
  const gap = asString(props.gap, 'md')
  const rawChildren = asArray<unknown>(props.children)

  // children 长度对齐 columns：缺列补空，多列按 columns 截断
  const groups: Block[][] = Array.from({ length: columns }, (_, index) => {
    const group = rawChildren[index]
    return Array.isArray(group) ? (group as Block[]) : []
  })

  return (
    <div className={`blk-layout blk-layout--${columns} blk-layout--gap-${gap}`}>
      {groups.map((blocks, index) => (
        <div className="blk-layout__col" key={index}>
          {render(blocks)}
        </div>
      ))}
    </div>
  )
}