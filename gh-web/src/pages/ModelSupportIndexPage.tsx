import { PageView } from '../blocks/PageView'

/**
 * 型号支持索引（/support/models，T5.5）。
 *
 * 归属内容库、区块驱动：与产品 / 文章列表同一套控件（标题、文案、卡片网格可后台调整），
 * 页面也可整体停用。原手写渲染（硬编码 MODEL_SUPPORTS 网格）已移除，改由内容库页面
 * key `model-support` 的 cards 卡片网格区块渲染（详情页 /support/model/:id 保持不变）。
 */
export function ModelSupportIndexPage() {
  return <PageView pageKey="model-support" />
}
