import { PageView } from '../blocks/PageView'
import '../styles/about.css'

/**
 * 探索光魂：由内容库 `about` 页驱动。
 * 初期品牌版：主张 → 我们是谁 → 怎么做事 → 在售产品线 → 怎么测 → 关键事实 → 历程 → 引导。
 * 外层 .about-page 仅用于本页样式微调（不污染其它页面）。
 */
export function AboutPage() {
  return (
    <div className="about-page">
      <PageView pageKey="about" />
    </div>
  )
}