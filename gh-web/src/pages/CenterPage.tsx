import { PageView } from '../blocks/PageView'

/**
 * Center 软件：由内容库 `center` 页驱动（软件首屏 / 核心能力 / 功能深读 / 支持设备 / 更新日志 / FAQ）。
 * 单页展示：标题由首屏海报（hero）承载；PageView 会补一个仅供读屏/SEO 的隐藏 h1，保证页面仍有唯一 h1。
 */
export function CenterPage() {
  return <PageView pageKey="center" />
}