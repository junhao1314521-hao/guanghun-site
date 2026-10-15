/**
 * 下线级联版 `<Link>`（`<Link>` 的直接替换）。
 * ============================================================
 * 目标为**已停用的站内页面**时，本组件不渲染任何元素（链接整体消失，避免「看得见点不进」）；
 * 其余情况（在线站内页、外链、`#锚点`、初始态未加载完成）一律按原 `<Link>` 渲染。
 *
 * 判断逻辑复用 `lib/sitePages.isHrefLive`：外链 / 锚点 / 空值放行，站内路径按停用集合匹配。
 * 停用集合尚未加载时默认放行，加载完成后由 `useSitePages` 触发重渲染再收敛。
 * 仅用于「独立链接元素」（按钮 / 文字链 / 箭头）；整卡可点击的场景请改用
 * `useSitePages().isHrefLive` 归一化 href，保留卡片内容为不可点内容。
 */
import { Link, type LinkProps } from 'react-router-dom'
import { useSitePages } from '../../hooks/useSitePages'

export function SafeLink({ to, children, ...rest }: LinkProps) {
  const { isHrefLive } = useSitePages()
  // 仅对字符串 to 做存活判断；对象形式（LocationDescriptor）一律放行
  if (typeof to === 'string' && !isHrefLive(to)) return null
  return (
    <Link to={to} {...rest}>
      {children}
    </Link>
  )
}
