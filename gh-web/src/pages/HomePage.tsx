import { PageView } from '../blocks/PageView'

/** 首页：由内容库 `home` 页驱动（首屏轮播 + 场景 / 产品 / 榜单 / 评测 / 品牌 / 服务 / 合作 / 新闻）。
 *  自带首屏轮播，h1 由轮播当前幻灯片提供。 */
export function HomePage() {
  return <PageView pageKey="home" />
}