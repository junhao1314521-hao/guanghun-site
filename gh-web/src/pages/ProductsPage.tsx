import { PageView } from '../blocks/PageView'

/**
 * 产品列表（一级页面）：由内容库页面 key `products` 驱动渲染其区块序列
 * （text 区块 + productGrid 数据源区块）。
 *
 * 通过 `blockDefaults` 为 productGrid 区块注入 `showFilter`，在区块内保留原产品列表页的
 * 类别 / 连接 / 价格 / 库存筛选、排序、分页与对比选择，装修化后交互能力不回归。
 * 页头已取消，「产品对比」入口由 productGrid 区块内的对比浮条承载。
 */
export function ProductsPage() {
  return <PageView pageKey="products" blockDefaults={{ productGrid: { showFilter: true } }} />
}
