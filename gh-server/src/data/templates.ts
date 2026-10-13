/**
 * 页面模板（契约 §11 扩展集合 `templates`）。
 *
 * 规范形状：`{ id, name, scope, blockCount, blocks, createdAt }`。
 * `blocks` 为某页面区块的**快照**（深拷贝），供「新建页面从模板起步」时初始化。
 * seed 为空数组（模板由后台运行时创建，非静态内容）。
 */
import type { Block } from './contentTypes'

export type TemplateItem = {
  /** 稳定唯一 id */
  id: string
  /** 模板名称 */
  name: string
  /** 适用范围（自由文案，如 营销页 / 详情页 / 列表页） */
  scope: string
  /** 区块数量（由 blocks 派生，冗余存储便于列表展示） */
  blockCount: number
  /** 区块快照（深拷贝） */
  blocks: Block[]
  /** 创建时间（ISO） */
  createdAt: string
}

/** 模板 seed：空（运行时创建） */
export const TEMPLATES: TemplateItem[] = []
