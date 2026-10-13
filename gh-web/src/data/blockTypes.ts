/**
 * 内容库区块类型（契约 §3 / §4 的前端镜像入口）。
 *
 * 逐字镜像《光魂官网 · 内容库与装修契约 v1》§3（BlockType / BlockStyle / Block /
 * Page / PageMeta）与 §6.3（BlockFieldMeta / BlockTypeMeta），字段名即契约，不得自创或改名。
 * 契约 §4 的 16 类区块 props 类型见 `src/blocks/types.ts`。
 *
 * 说明：类型定义落在同目录 `contentTypes.ts`（与后端真源
 * `gh-server/src/data/contentTypes.ts` 逐字一致），本文件将其统一再导出，作为「区块类型」
 * 的单一入口——区块组件、页面与接口层均从本文件取类型，避免契约在两处漂移。
 */
export type {
  Block,
  BlockFieldMeta,
  BlockStyle,
  BlockType,
  BlockTypeMeta,
  Page,
  PageMeta,
  SiteConfig,
  SiteFooterGroup,
  SiteLink,
} from './contentTypes'