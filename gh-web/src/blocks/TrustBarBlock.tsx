/**
 * 30. trustBar 信任条（需求 §1.7 新建区块）。
 * ============================================================
 * 形式（方案 A）：**分隔线横排**——每项均分、项间竖分割线、上下细线收边、**无卡片底**。
 * 图标：每项配 22px 线性图标（1.5px 描边、圆头圆角、中性色、不发光）：
 *   flask 烧瓶（实测实验室，本模块专用）/ shield 盾牌（质保）/ check 勾选（正品）/ box 包裹（物流）。
 *
 * props: title? / columns?(2|3|4，默认 4) / items:[{ icon, text, href? }]
 */
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { IconCheckCircle, IconCube, IconFlask, IconShield } from '../components/ui/Icon'
import { useSitePages } from '../hooks/useSitePages'
import { asArray, asNumber, asRecord, asString } from './blockUtils'

type TrustItem = { icon: string; text: string; href: string }

function toItem(value: unknown): TrustItem {
  const record = asRecord(value)
  return {
    icon: asString(record.icon, 'check'),
    text: asString(record.text),
    href: asString(record.href),
  }
}

/** 图标名 → 22px 线性图标组件（未知名称回退勾选） */
function TrustIcon({ name }: { name: string }): ReactNode {
  const size = 22
  switch (name) {
    case 'flask':
      return <IconFlask size={size} />
    case 'shield':
      return <IconShield size={size} />
    case 'box':
      return <IconCube size={size} />
    case 'check':
    default:
      return <IconCheckCircle size={size} />
  }
}

export function TrustBarBlock({ props }: { props: Record<string, unknown> }) {
  const { isHrefLive } = useSitePages()
  const rawColumns = asNumber(props.columns, 4)
  const columns = rawColumns === 2 || rawColumns === 3 ? rawColumns : 4
  // 下线级联：条目链接指向已停用页面时归一化为空 → 条目退化为不可点内容（保留文字与图标）
  const items = asArray(props.items)
    .map(toItem)
    .filter((item) => Boolean(item.text || item.icon))
    .map((item) => (item.href && !isHrefLive(item.href) ? { ...item, href: '' } : item))

  if (items.length === 0) return null

  return (
    <div className="blk-trustbar">
      <SectionHeadFromProps props={props} />
      <div className="blk-trustbar__row" style={{ '--trustbar-cols': columns } as CSSProperties}>
        {items.map((item, index) => {
          const inner = (
            <>
              <span className="blk-trustbar__icon" aria-hidden="true">
                <TrustIcon name={item.icon} />
              </span>
              <span className="blk-trustbar__text">{item.text}</span>
            </>
          )
          const key = `${item.text}-${index}`
          return item.href ? (
            <Link className="blk-trustbar__item" to={item.href} key={key}>
              {inner}
            </Link>
          ) : (
            <div className="blk-trustbar__item" key={key}>
              {inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}
