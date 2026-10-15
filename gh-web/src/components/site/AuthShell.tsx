/**
 * 登录 / 注册页外壳：左右分栏。
 * - 左栏：上下顶满的「可交互代码动画」+ 品牌信息（左上角为正式 LOGO：图形 mark + SVDC 字标）。
 * - 右栏：表单（由调用方传入）。
 * - variant='full' 用于后台登录（整屏、无圆角）；variant='card' 用于站内登录/注册（大卡片、页面内居中）。
 * - 移动端：左栏折叠为顶部背景条，表单优先。
 */
import type { ReactNode } from 'react'
import { BrandMark } from './BrandMark'
import { CodeBackdrop } from './CodeBackdrop'

type Props = {
  children: ReactNode
  /** 'full' 后台整屏；'card' 卡片式；'page' 站内整屏铺满（无描边圆角） */
  variant?: 'full' | 'card' | 'page'
  /** 品牌旁的小标签，如「管理端」「客户中心」 */
  badge?: string
  eyebrow?: string
  headline?: string
  subtitle?: string
  points?: string[]
}

export function AuthShell({
  children,
  variant = 'card',
  badge = '',
  eyebrow = 'SUPER DISPLAY',
  headline = '以实测定义性能',
  subtitle = 'OLED 电竞显示器 · 参数公开、方法公开、来源可查。',
  points = [],
}: Props) {
  return (
    <div className={`auth-shell auth-shell--${variant}`}>
      <aside className="auth-shell__aside">
        <CodeBackdrop className="auth-shell__canvas" />
        <div className="auth-shell__aside-inner">
          <div className="auth-shell__brand">
            <BrandMark className="logo__mark" />
            <span className="logo__word" role="img" aria-label="光魂 · SVDC" />
            {badge && <span className="auth-shell__badge">{badge}</span>}
          </div>
          <div className="auth-shell__pitch">
            <p className="auth-shell__eyebrow">{eyebrow}</p>
            <h2 className="auth-shell__headline">{headline}</h2>
            <p className="auth-shell__subtitle">{subtitle}</p>
            {points.length > 0 && (
              <ul className="auth-shell__points">
                {points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
      <main className="auth-shell__main">
        <div className="auth-shell__form">{children}</div>
      </main>
    </div>
  )
}
