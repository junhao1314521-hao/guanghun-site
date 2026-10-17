/**
 * 装修器纯逻辑工具（区块树操作 + 元数据解析）。
 * ============================================================
 * 与视图解耦，供 `AdminPageBuilderPage` 与 `BlockEditor` 共用：
 * - 区块树的不可变增删改排（含 layout 一层嵌套子区块）；
 * - 区块类型目录（§6.3）到表单的解析：数组型字段的条目字段；
 * - 区块摘要 / 类型名 / 图标键（列表展示用）。
 *
 * 契约对齐：《光魂官网 · 内容库与装修契约 v1》§3 / §4 / §6.3。
 */
import type { Block, BlockFieldMeta, BlockType, BlockTypeMeta } from '../../data/contentTypes'

/** 数值 + 说明条目字段（stats 条目 / hero 数据；镜像后端 STAT_FIELDS） */
export const STAT_ITEM_FIELDS: BlockFieldMeta[] = [
  { name: 'value', label: '数值', kind: 'text' },
  { name: 'label', label: '说明', kind: 'text' },
]

/** 链接条目字段（productMatrix 卡片按钮等嵌套 link 列表；镜像后端 LINK_FIELDS） */
export const LINK_ITEM_FIELDS: BlockFieldMeta[] = [
  { name: 'label', label: '文字', kind: 'text' },
  { name: 'href', label: '链接', kind: 'text' },
]

/** layout 列数（仅接受 1 / 2 / 3，缺省 2） */
export function layoutColumns(block: Block): 1 | 2 | 3 {
  const c = block.props.columns
  return c === 1 || c === 2 || c === 3 ? c : 2
}

/** layout 子区块（长度对齐 columns：缺列补空，多列截断） */
export function layoutChildren(block: Block): Block[][] {
  const raw = block.props.children
  const arr = Array.isArray(raw) ? raw : []
  const cols = layoutColumns(block)
  return Array.from({ length: cols }, (_, index) => (Array.isArray(arr[index]) ? (arr[index] as Block[]) : []))
}

/** 对「根列表 + 所有 layout 列列表」应用同一映射（用于跨层级定位唯一区块） */
function mapAllLists(blocks: Block[], fn: (list: Block[]) => Block[]): Block[] {
  const mapped = fn(blocks)
  return mapped.map((block) => {
    if (block.type !== 'layout') return block
    const nextChildren = layoutChildren(block).map((column) => mapAllLists(column, fn))
    return { ...block, props: { ...block.props, children: nextChildren } }
  })
}

/** 更新指定区块（id 全局唯一） */
export function updateBlock(blocks: Block[], id: string, updater: (block: Block) => Block): Block[] {
  return mapAllLists(blocks, (list) => list.map((block) => (block.id === id ? updater(block) : block)))
}

/** 删除指定区块（含嵌套层） */
export function removeBlock(blocks: Block[], id: string): Block[] {
  return mapAllLists(blocks, (list) => list.filter((block) => block.id !== id))
}

/** 上移 / 下移指定区块（在其所在列表内交换相邻项） */
export function moveBlock(blocks: Block[], id: string, dir: -1 | 1): Block[] {
  return mapAllLists(blocks, (list) => {
    const index = list.findIndex((block) => block.id === id)
    if (index < 0) return list
    const next = index + dir
    if (next < 0 || next >= list.length) return list
    const copy = list.slice()
    const [item] = copy.splice(index, 1)
    copy.splice(next, 0, item)
    return copy
  })
}

/**
 * 拖拽重排：把 dragId 移到 targetId 之前 / 之后。
 * 仅当二者位于同一层列表时生效（跨层不移动，避免 layout 嵌套语义歧义）。
 */
export function reorderBlock(blocks: Block[], dragId: string, targetId: string, before: boolean): Block[] {
  if (dragId === targetId) return blocks
  return mapAllLists(blocks, (list) => {
    const from = list.findIndex((block) => block.id === dragId)
    const hasTarget = list.some((block) => block.id === targetId)
    if (from < 0 || !hasTarget) return list
    const [item] = list.slice(from, from + 1)
    const rest = list.filter((block) => block.id !== dragId)
    const to = rest.findIndex((block) => block.id === targetId)
    rest.splice(before ? to : to + 1, 0, item)
    return rest
  })
}

/** 在 afterId 之后插入新区块；afterId 为 null 时追加到根列表末尾 */
export function insertBlock(blocks: Block[], block: Block, afterId: string | null): Block[] {
  if (!afterId) return [...blocks, block]
  return mapAllLists(blocks, (list) => {
    const index = list.findIndex((item) => item.id === afterId)
    if (index < 0) return list
    const copy = list.slice()
    copy.splice(index + 1, 0, block)
    return copy
  })
}

/** 向指定 layout 的某一列追加子区块 */
export function insertChild(blocks: Block[], parentId: string, column: number, block: Block): Block[] {
  return updateBlock(blocks, parentId, (parent) => {
    const children = layoutChildren(parent)
    const target = children[column] ?? []
    children[column] = [...target, block]
    return { ...parent, props: { ...parent.props, children } }
  })
}

/** 深度优先查找区块（含嵌套层） */
export function findBlock(blocks: Block[], id: string): Block | null {
  for (const block of blocks) {
    if (block.id === id) return block
    if (block.type === 'layout') {
      for (const column of layoutChildren(block)) {
        const found = findBlock(column, id)
        if (found) return found
      }
    }
  }
  return null
}

/**
 * 返回「包含指定区块的那一层列表」（数组引用）；未找到返回 null。
 * 供拖拽判断两个区块是否同层（同层才允许重排）。
 */
export function findList(blocks: Block[], id: string): Block[] | null {
  for (const block of blocks) {
    if (block.id === id) return blocks
    if (block.type === 'layout') {
      for (const column of layoutChildren(block)) {
        const found = findList(column, id)
        if (found) return found
      }
    }
  }
  return null
}

/**
 * 返回区块所在「同层列表」的稳定键：根列表 = `root`，layout 列内 = `layout:<父id>:<列号>`；未找到返回 null。
 * 用于拖拽判定两区块是否同层（同层才允许重排）——按字符串键比较，避免 `findList` 每次重建数组导致引用不等。
 */
export function blockListKey(blocks: Block[], id: string): string | null {
  return listKeyOf(blocks, id, 'root')
}

function listKeyOf(blocks: Block[], id: string, key: string): string | null {
  if (blocks.some((block) => block.id === id)) return key
  for (const block of blocks) {
    if (block.type !== 'layout') continue
    const children = layoutChildren(block)
    for (let column = 0; column < children.length; column += 1) {
      const found = listKeyOf(children[column], id, `layout:${block.id}:${column}`)
      if (found) return found
    }
  }
  return null
}

/** 预览/列表通用的插入落点：根列表第 index 位，或某 layout 列第 index 位 */
export type InsertSlot =
  | { scope: 'root'; index: number }
  | { scope: 'column'; parentId: string; column: number; index: number }

/** 在根列表的 index 处插入区块（index 越界则收敛到两端） */
export function insertBlockAt(blocks: Block[], block: Block, index: number): Block[] {
  const copy = blocks.slice()
  copy.splice(Math.max(0, Math.min(index, copy.length)), 0, block)
  return copy
}

/** 向指定 layout 某一列的第 index 位插入子区块（index 越界则收敛到两端） */
export function insertChildAt(blocks: Block[], parentId: string, column: number, block: Block, index: number): Block[] {
  return updateBlock(blocks, parentId, (parent) => {
    const children = layoutChildren(parent)
    const target = (children[column] ?? []).slice()
    target.splice(Math.max(0, Math.min(index, target.length)), 0, block)
    children[column] = target
    return { ...parent, props: { ...parent.props, children } }
  })
}

/** 按插入落点插入区块（预览「在此插入 / 添加到末尾」统一入口） */
export function insertAt(blocks: Block[], block: Block, slot: InsertSlot): Block[] {
  return slot.scope === 'root'
    ? insertBlockAt(blocks, block, slot.index)
    : insertChildAt(blocks, slot.parentId, slot.column, block, slot.index)
}

/** 生成稳定唯一 id（与接口层一致：优先 crypto.randomUUID） */
function genBlockId(): string {
  const cryptoObj = globalThis.crypto
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') return cryptoObj.randomUUID()
  return `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** props 深拷贝（结构化克隆；运行环境不支持时回退 JSON） */
function deepCloneProps(props: Record<string, unknown>): Record<string, unknown> {
  if (typeof structuredClone === 'function') return structuredClone(props)
  return JSON.parse(JSON.stringify(props)) as Record<string, unknown>
}

/** 克隆区块：props 深拷贝 + 全树（含 layout 子区块）分配全新唯一 id */
export function cloneBlockWithNewIds(block: Block): Block {
  const cloned: Block = { ...block, id: genBlockId(), props: deepCloneProps(block.props) }
  if (block.type === 'layout') {
    const children = layoutChildren(block).map((column) => column.map(cloneBlockWithNewIds))
    cloned.props = { ...cloned.props, children }
  }
  return cloned
}

/** 复制区块（新 id + props 深拷贝）并插入到原区块之后；返回新列表与副本 id */
export function duplicateBlock(blocks: Block[], id: string): { blocks: Block[]; newId: string | null } {
  const source = findBlock(blocks, id)
  if (!source) return { blocks, newId: null }
  const clone = cloneBlockWithNewIds(source)
  return { blocks: insertBlock(blocks, clone, id), newId: clone.id }
}

/** 保存前规整：layout 的 columns 收敛为 1/2/3，children 长度对齐 columns（契约 §3） */
export function normalizeLayouts(blocks: Block[]): Block[] {
  return blocks.map((block) => {
    if (block.type !== 'layout') return block
    const columns = layoutColumns(block)
    const children = layoutChildren(block).map(normalizeLayouts)
    return { ...block, props: { ...block.props, columns, children } }
  })
}

/** 区块类型目录项按 type 建索引 */
export function indexTypes(types: BlockTypeMeta[]): Record<string, BlockTypeMeta> {
  return Object.fromEntries(types.map((meta) => [meta.type, meta]))
}

/** 类型显示名（目录缺失时回退 type 本身） */
export function typeName(type: BlockType, meta?: BlockTypeMeta): string {
  return meta?.name ?? type
}

/** 区块类型 → 后台图标键（AdminIcon） */
const BLOCK_ICON: Record<BlockType, string> = {
  hero: 'cap',
  carousel: 'monitor',
  video: 'monitor',
  text: 'doc',
  imageText: 'book',
  imageGrid: 'grid',
  stats: 'venn',
  cards: 'grid',
  timeline: 'clock',
  productGrid: 'cube',
  articleList: 'book',
  ranking: 'trophy',
  downloadList: 'download',
  faqList: 'doc',
  contact: 'chat',
  layout: 'sliders',
  richText: 'book',
  html: 'doc',
  embed: 'sliders',
  showcase: 'cube',
  // 产品详情主体区块
  productHero: 'cube',
  productSpecs: 'venn',
  productBuy: 'chat',
  // 商业合作数据源区块
  caseList: 'book',
  venueList: 'grid',
  // 测评方法数据源区块
  methodList: 'doc',
  // B2B 采购价值 + 商务联系
  b2bValue: 'cube',
  // 邮件订阅
  subscribe: 'chat',
  // 产品矩阵
  productMatrix: 'grid',
  // 产品详情 · 详情图文
  productDetailRich: 'book',
  // 品牌资料（B 端）
  brandAssetList: 'download',
  // 信任条
  trustBar: 'venn',
  // 全屏视觉模块 / 长图拼接（R3 / R6）
  fullscreenVisual: 'monitor',
  longImage: 'doc',
}

export function blockIcon(type: BlockType): string {
  return BLOCK_ICON[type] ?? 'grid'
}

/** 列表用短摘要（按类型取一处可读信息） */
export function blockSummary(block: Block): string {
  const p = block.props
  const str = (value: unknown) => (typeof value === 'string' ? value : '')
  const len = (value: unknown) => (Array.isArray(value) ? value.length : 0)
  const first = (value: unknown) => (Array.isArray(value) && typeof value[0] === 'string' ? value[0] : '')
  /** HTML 源码 → 纯文本摘要（去标签与多余空白，截断到 40 字） */
  const toPlainText = (value: unknown) =>
    str(value)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40)
  switch (block.type) {
    case 'hero':
      return first(p.title) || str(p.eyebrow) || '未填写标题'
    case 'carousel':
      return `${len(p.slides)} 张幻灯片`
    case 'video':
      return str(p.title) || str(p.url) || '未填写视频'
    case 'text':
      return str(p.title) || '未填写标题'
    case 'imageText':
      return str(p.title) || '未填写标题'
    case 'imageGrid':
      return `${len(p.items)} 张图片`
    case 'stats':
      return `${len(p.items)} 项数据`
    case 'cards':
      return `${len(p.items)} 张卡片`
    case 'timeline':
      return `${len(p.items)} 个节点`
    case 'productGrid':
      return `${str(p.source) || 'featured'} · 最多 ${str(p.limit) || '6'} 项`
    case 'articleList':
      return `${str(p.source) || 'all'} · 最多 ${str(p.limit) || '6'} 篇`
    case 'ranking':
      return `${str(p.metric) || 'overall'} · 最多 ${str(p.limit) || '6'} 项`
    case 'downloadList':
      return `${str(p.category) || 'all'} · 最多 ${str(p.limit) || '6'} 项`
    case 'faqList':
      return `${str(p.source) || 'support'} · 最多 ${str(p.limit) || '6'} 条`
    case 'contact':
      return str(p.title) || (str(p.channel) === 'business' ? '商业合作渠道' : '产品咨询渠道')
    case 'layout':
      return `${layoutColumns(block)} 列布局`
    case 'richText':
      return toPlainText(p.html) || '富文本模块'
    case 'html':
      return toPlainText(p.html) || 'HTML 模块'
    case 'embed':
      return str(p.videoUrl) ? '视频嵌入' : `代码嵌入 · ${str(p.height) || 360}px`
    case 'showcase':
      return `${len(p.items)} 个产品展示`
    case 'b2bValue':
      return str(p.title) || `${len(p.items)} 项采购价值`
    case 'productMatrix':
      return `${str(p.source) === 'manual' ? '手填' : '关联产品'} · ${len(p.items)} 项 · ${str(p.columns) || '2'} 列`
    default:
      return block.type
  }
}

/**
 * 解析数组型字段的「条目字段」。
 * kind==='list' 有两种语义：
 *  - 字符串行列表（契约里带 placeholder，如 hero.title「每行一句」）；
 *  - 对象数组（如 items / slides / stats），条目字段取自目录的 listFields。
 * `stats` 嵌套出现在幻灯片条目内，此时 listFields 描述的是幻灯片，故单列处理。
 */
export function resolveItemFields(meta: BlockTypeMeta | undefined, field: BlockFieldMeta): BlockFieldMeta[] {
  if (field.name === 'stats') return STAT_ITEM_FIELDS
  // 卡片按钮（productMatrix）等嵌套 link 列表：条目为 { 文字, 链接 }
  if (field.name === 'buttons') return LINK_ITEM_FIELDS
  return meta?.listFields ?? []
}

/** 是否为「字符串行列表」字段（用于 list 控件分流） */
export function isStringList(field: BlockFieldMeta, value: unknown): boolean {
  if (Array.isArray(value) && value.length > 0) return value.every((item) => typeof item === 'string')
  return field.placeholder !== undefined
}

/** 按条目字段定义生成一条空条目初值 */
export function emptyItem(fields: BlockFieldMeta[]): Record<string, unknown> {
  const item: Record<string, unknown> = {}
  for (const field of fields) {
    switch (field.kind) {
      case 'switch':
        item[field.name] = false
        break
      case 'select':
        item[field.name] = field.options?.[0]?.value ?? ''
        break
      case 'list':
        item[field.name] = []
        break
      case 'ref':
        // 集合挑选（如海报底部下载按钮）：值为 ID 列表
        item[field.name] = []
        break
      case 'position':
        // 海报文案位置：默认落在左侧居中（后台可再拖拽 / 点九宫格）
        item[field.name] = { x: 8, y: 50 }
        break
      default:
        item[field.name] = ''
    }
  }
  return item
}

/**
 * 新建条目初值：通用字段默认 + 按类型补齐语义化默认。
 * 产品矩阵：卡片默认带 1 个「立即购买」按钮（文字可改、链接待填）。
 */
export function newItem(meta: BlockTypeMeta | undefined, fields: BlockFieldMeta[]): Record<string, unknown> {
  const item = emptyItem(fields)
  if (meta?.type === 'productMatrix' && Array.isArray(item.buttons)) {
    item.buttons = [{ label: '立即购买', href: '' }]
  }
  return item
}