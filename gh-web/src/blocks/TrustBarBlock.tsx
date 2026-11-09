/**
 * 30. trustBar 信任条（需求 §1.7 新建区块）。
 * ============================================================
 * 形式（方案 A）：**分隔线横排**——每项均分、项间竖分割线、上下细线收边、**无卡片底**。
 * 图标：24px 线性图标 + app-icon 式圆角底盘（浅色白瓷 / 深色玻璃两种材质，随主题切换）：
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

type TrustItem = { icon: string; text: string; desc: string; href: string }

/** 把后台原始条目规范化为信任条数据，缺省图标回退为 check */
function toItem(value: unknown): TrustItem {
  const record = asRecord(value)
  return {
    icon: asString(record.icon, 'check'),
    text: asString(record.text),
    desc: asString(record.desc),
    href: asString(record.href),
  }
}

/** 图标名 → 24px 线性图标组件（未知名称回退勾选）；app-icon 底盘统一由 CSS 给色 */
function TrustIcon({ name }: { name: string }): ReactNode {
  const size = 24
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

/** 信任条区块：按列数渲染图标 + 文案条目，链接下线时退化为纯文本 */
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
              <span className="blk-trustbar__text">
                <b className="blk-trustbar__title">{item.text}</b>
                {item.desc && <small className="blk-trustbar__desc">{item.desc}</small>}
              </span>
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
