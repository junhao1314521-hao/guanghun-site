/**
 * 装修器 · 实时预览（契约 §9「右＝实时预览」）。
 * ============================================================
 * 复用前台同一套 `BlockRenderer` 渲染**当前草稿**区块（未保存即生效），本组件在其外层按块包裹，
 * 使每个区块成为「可交互单元」，从而在预览中直接完成：
 * - 拖拽排序（块与块之间显示插入线；与左列表共用 reorderBlock，单一状态源）；
 * - 悬停操作条（拖拽手柄 / 上移 / 下移 / 复制 / 启停 / 删除）与点击选中；
 * - 区块之间与列表末尾的「＋ 在此插入 / 添加模块到末尾」落点（点击回调上层弹出类型选择器）；
 * - layout 列内子区块同样可拖拽 / 插入（仅一层嵌套）。
 *
 * 渲染策略（保持「所见即所得」，不另做简化渲染）：
 * - 普通区块：`<BlockRenderer blocks={[block]} />`（沿用其外壳与内容容器）；
 * - layout 区块：由本组件复用 `shellClass`/`containerClass`/`blk-layout` 组合出与前台一致的外壳，
 *   再对每列渲染可交互的子区块（子区块仍走 BlockRenderer）。
 * - 区块内容在预览中 `pointer-events: none`（避免误点链接跳转），交互仅经操作条 / 落点 / 点击选中。
 * - 停用区块渲染为占位条（不渲染内容，但仍可选中 / 启停 / 删除）。
 *
 * 宽度档位：自适应 / 桌面 1440 / 平板 768 / 手机 390 —— 直接设置画布宽度（不缩放），
 * 超出预览框时在框内横向滚动，不撑破三栏布局（取舍见文件内注释）。
 *
 * 预览样式来自 `src/blocks/BlockRenderer.tsx` 内部引入的 `styles/blocks.css`（仅 `.blk-*` 命名空间）；
 * 交互层样式见 `styles/admin.css` 的 `.builder-preview__*`，不污染其它后台页面。
 */
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import type { Block, BlockTypeMeta } from '../../api/adminPages'
import { BlockRenderer } from '../../blocks/BlockRenderer'
import { ProductDetailContext } from '../../blocks/ProductDetailContext'
import { getProductDetail } from '../../data/products'
import { asString, containerClass, shellClass } from '../../blocks/blockUtils'
import { AdminIcon } from './AdminIcon'
import {
  IconArrowDown,
  IconArrowUp,
  IconCollapse,
  IconExpand,
  IconGrip,
  IconPlus,
} from '../ui/Icon'
import {
  blockIcon,
  blockListKey,
  layoutChildren,
  layoutColumns,
  type InsertSlot,
  typeName,
} from './blockBuilderUtils'

/**
 * 预览宽度档位。`width=0` 表示自适应（跟随面板）；其余为真实设备像素宽。
 * 取舍：采用「直接设置画布宽度」而非 `transform: scale()`——文字保持真实可读，实现更贴近真实像素；
 * 代价是宽档位（桌面 1440 / 平板 768）超出预览框时需在框内横向滚动查看全貌（见下方 frame overflow）。
 */
const TIERS = [
  { key: 'fit', label: '自适应', width: 0 },
  { key: 'desktop', label: '桌面 1440', width: 1440 },
  { key: 'tablet', label: '平板 768', width: 768 },
  { key: 'phone', label: '手机 390', width: 390 },
] as const

type PreviewTier = (typeof TIERS)[number]['key']

/**
 * 后台预览用的样例产品：产品详情区块依赖 `ProductDetailContext` 取当前产品。
 * 预览器没有真实路由参数，用一款完整型号做「所见即所得」样例；
 * 非产品页区块不会消费该 context，不受影响。
 */
const PREVIEW_PRODUCT = getProductDetail('gh-54027x1qe')

/** 预览交互回调集合（在组件内组装后透传给各层的包裹组件，避免逐层点对点传参） */
type PreviewApi = {
  typeMeta: Record<string, BlockTypeMeta>
  selectedId: string | null
  dragId: string | null
  dropHint: { id: string; before: boolean } | null
  onSelect: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  onToggleBlock: (id: string) => void
  onDuplicate: (id: string) => void
  onRemove: (id: string) => void
  onRequestInsert: (slot: InsertSlot) => void
  onDragStart: (id: string) => (event: DragEvent<HTMLElement>) => void
  onDragOver: (id: string) => (event: DragEvent<HTMLElement>) => void
  onDrop: (id: string) => (event: DragEvent<HTMLElement>) => void
  onDragEnd: () => void
}

/** 由「父 id + 列号 + 序号」构造插入落点（父为 null 即根列表） */
function slotFor(parentId: string | null, column: number, index: number): InsertSlot {
  return parentId === null ? { scope: 'root', index } : { scope: 'column', parentId, column, index }
}

/** 单个区块的可交互外壳：承载拖拽 / 选中 / 悬停操作条 / 上下插入落点 */
function PreviewBlockUnit({
  block,
  index,
  parentId,
  column,
  api,
}: {
  block: Block
  index: number
  parentId: string | null
  column: number
  api: PreviewApi
}) {
  const selected = api.selectedId === block.id
  const dragging = api.dragId === block.id
  const dropState =
    api.dropHint?.id === block.id ? (api.dropHint.before ? ' is-drop-before' : ' is-drop-after') : ''
  const name = typeName(block.type, api.typeMeta[block.type])

  const classes = [
    'builder-preview__block',
    selected ? 'is-selected' : '',
    block.enabled ? '' : 'is-disabled',
    dragging ? 'is-dragging' : '',
    dropState,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      data-block-id={block.id}
      data-block-type={block.type}
      onClick={(event) => {
        event.stopPropagation()
        api.onSelect(block.id)
      }}
      onDragOver={api.onDragOver(block.id)}
      onDrop={api.onDrop(block.id)}
    >
      {block.enabled ? (
        block.type === 'layout' ? (
          <LayoutPreviewBody block={block} api={api} />
        ) : (
          <div className="builder-preview__content">
            <BlockRenderer blocks={[block]} />
          </div>
        )
      ) : (
        <div className="builder-preview__disabled">
          <AdminIcon name={blockIcon(block.type)} size={16} />
          <span>{name} · 已停用（预览不渲染内容）</span>
        </div>
      )}

      {/* 悬停操作条 */}
      <div
        className="builder-preview__ops"
        role="toolbar"
        aria-label={`${name} 操作`}
        onClick={(event) => event.stopPropagation()}
      >
        <span
          className="builder-preview__handle"
          draggable
          onDragStart={api.onDragStart(block.id)}
          onDragEnd={api.onDragEnd}
          title="按住拖拽排序（键盘可用上移 / 下移按钮）"
          aria-hidden="true"
        >
          <IconGrip size={16} />
        </span>
        <button
          type="button"
          className="builder-preview__opbtn"
          title="上移"
          aria-label={`上移「${name}」`}
          onClick={() => api.onMove(block.id, -1)}
        >
          <IconArrowUp size={15} />
        </button>
        <button
          type="button"
          className="builder-preview__opbtn"
          title="下移"
          aria-label={`下移「${name}」`}
          onClick={() => api.onMove(block.id, 1)}
        >
          <IconArrowDown size={15} />
        </button>
        <button
          type="button"
          className="builder-preview__opbtn"
          title="复制该区块"
          aria-label={`复制「${name}」`}
          onClick={() => api.onDuplicate(block.id)}
        >
          复
        </button>
        <button
          type="button"
          className="builder-preview__opbtn"
          title={block.enabled ? '停用该区块' : '启用该区块'}
          aria-label={block.enabled ? `停用「${name}」` : `启用「${name}」`}
          onClick={() => api.onToggleBlock(block.id)}
        >
          {block.enabled ? '停' : '启'}
        </button>
        <button
          type="button"
          className="builder-preview__opbtn is-danger"
          title="删除该区块"
          aria-label={`删除「${name}」`}
          onClick={() => api.onRemove(block.id)}
        >
          删
        </button>
      </div>

      {/* 悬停出现的插入落点（上 / 下缘各一个） */}
      <button
        type="button"
        className="builder-preview__add builder-preview__add--before"
        title="在此插入模块"
        aria-label={`在「${name}」之前插入模块`}
        onClick={(event) => {
          event.stopPropagation()
          api.onRequestInsert(slotFor(parentId, column, index))
        }}
      >
        ＋
      </button>
      <button
        type="button"
        className="builder-preview__add builder-preview__add--after"
        title="在此插入模块"
        aria-label={`在「${name}」之后插入模块`}
        onClick={(event) => {
          event.stopPropagation()
          api.onRequestInsert(slotFor(parentId, column, index + 1))
        }}
      >
        ＋
      </button>
    </div>
  )
}

/** layout 区块的预览体：复用前台外壳与网格类名，逐列渲染可交互子区块 */
function LayoutPreviewBody({ block, api }: { block: Block; api: PreviewApi }) {
  const columns = layoutColumns(block)
  const children = layoutChildren(block)
  const gap = asString(block.props.gap, 'md')
  const grid = (
    <div className={`blk-layout blk-layout--${columns} blk-layout--gap-${gap}`}>
      {Array.from({ length: columns }, (_, column) => (
        <div className="blk-layout__col" key={column}>
          <PreviewList blocks={children[column]} parentId={block.id} column={column} api={api} />
        </div>
      ))}
    </div>
  )
  return (
    <section className={shellClass(block.style)} data-block={block.type}>
      {block.style?.container === 'full' ? (
        grid
      ) : (
        <div className={`blk__container ${containerClass(block.style?.container)}`}>{grid}</div>
      )}
    </section>
  )
}

/** 有序区块列表（根列表或 layout 某一列）：区块 + 末尾「添加 / 插入」按钮 */
function PreviewList({
  blocks,
  parentId,
  column,
  api,
}: {
  blocks: Block[]
  parentId: string | null
  column: number
  api: PreviewApi
}) {
  return (
    <div className="builder-preview__list">
      {blocks.map((block, index) => (
        <PreviewBlockUnit key={block.id} block={block} index={index} parentId={parentId} column={column} api={api} />
      ))}
      {blocks.length === 0 && (
        <span className="builder-preview__emptyhint">
          {parentId === null ? '该页面暂无区块' : '该列暂无区块'}
        </span>
      )}
      <button
        type="button"
        className="builder-preview__addend"
        onClick={(event) => {
          event.stopPropagation()
          api.onRequestInsert(slotFor(parentId, column, blocks.length))
        }}
      >
        ＋ {parentId === null ? '添加模块到末尾' : '插入到该列'}
      </button>
    </div>
  )
}

export function BuilderPreview({
  blocks,
  typeMeta,
  selectedId,
  previewHref,
  fullscreen,
  onToggleFullscreen,
  onRequestAdd,
  onSelect,
  onReorder,
  onMove,
  onToggleBlock,
  onDuplicate,
  onRemove,
  onRequestInsert,
  guides,
  onToggleGuides,
}: {
  /** 当前草稿区块（未保存状态） */
  blocks: Block[]
  /** 区块类型目录索引（用于展示区块名 / 图标） */
  typeMeta: Record<string, BlockTypeMeta>
  /** 选中区块 id（与左结构列表、右属性面板共享） */
  selectedId: string | null
  /** 前台实际页面地址（模板页已用占位值替换 :param） */
  previewHref: string
  /** 全屏预览态（由上层控制；Esc 退出在本组件内处理） */
  fullscreen: boolean
  onToggleFullscreen: () => void
  /** 打开「新增区块」抽屉（舞台工具栏快捷入口） */
  onRequestAdd: () => void
  onSelect: (id: string) => void
  onReorder: (dragId: string, targetId: string, before: boolean) => void
  onMove: (id: string, dir: -1 | 1) => void
  onToggleBlock: (id: string) => void
  onDuplicate: (id: string) => void
  onRemove: (id: string) => void
  onRequestInsert: (slot: InsertSlot) => void
  /** 显示区块边界辅助线 */
  guides: boolean
  onToggleGuides: () => void
}) {
  const [tier, setTier] = useState<PreviewTier>('fit')
  // 预览内拖拽状态（仅本组件内的瞬时 UI；顺序本身由上层 blocks 单一维护）
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropHint, setDropHint] = useState<{ id: string; before: boolean } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const tierWidth = useMemo(() => TIERS.find((item) => item.key === tier)?.width ?? 0, [tier])

  /** 同层才允许重排（与左结构列表一致；跨层拖拽不支持） */
  const canDrop = (targetId: string) => {
    if (dragId === null || dragId === targetId) return false
    const from = blockListKey(blocks, dragId)
    return from !== null && from === blockListKey(blocks, targetId)
  }

  const onDragStart = (id: string) => (event: DragEvent<HTMLElement>) => {
    setDragId(id)
    event.dataTransfer.effectAllowed = 'move'
    // Firefox 需 setData 才会触发拖拽
    event.dataTransfer.setData('text/plain', id)
  }

  const onDragOver = (id: string) => (event: DragEvent<HTMLElement>) => {
    if (!canDrop(id)) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    const rect = event.currentTarget.getBoundingClientRect()
    setDropHint({ id, before: event.clientY < rect.top + rect.height / 2 })
  }

  const onDrop = (id: string) => (event: DragEvent<HTMLElement>) => {
    if (!canDrop(id)) return
    event.preventDefault()
    event.stopPropagation()
    if (dragId && dropHint) onReorder(dragId, dropHint.id, dropHint.before)
    setDragId(null)
    setDropHint(null)
  }

  const onDragEnd = () => {
    setDragId(null)
    setDropHint(null)
  }

  const api: PreviewApi = {
    typeMeta,
    selectedId,
    dragId,
    dropHint,
    onSelect,
    onMove,
    onToggleBlock,
    onDuplicate,
    onRemove,
    onRequestInsert,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  }

  // 全屏预览：Esc 退出（键盘可达）
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onToggleFullscreen()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [fullscreen, onToggleFullscreen])

  // 选中态（含从左结构列表选中）→ 预览滚动到该块可见区（nearest 仅在需要时滚动）
  useEffect(() => {
    if (!selectedId) return
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-block-id="${selectedId}"]`)
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  const canvasClass = [
    'builder-preview__canvas',
    tierWidth > 0 ? `builder-preview__canvas--${tier}` : '',
    guides ? 'is-guides' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={`builder-preview${fullscreen ? ' is-fullscreen' : ''}`} ref={rootRef}>
      <div className="builder-preview__toolbar">
        <span className="builder-preview__toolbar-label">宽度</span>
        <div className="admin-chipbar" role="group" aria-label="预览宽度">
          {TIERS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`admin-chip${tier === item.key ? ' is-active' : ''}`}
              aria-pressed={tier === item.key}
              onClick={() => setTier(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`admin-chip${guides ? ' is-active' : ''}`}
          aria-pressed={guides}
          title="显示 / 隐藏区块边界辅助线"
          onClick={onToggleGuides}
        >
          辅助线
        </button>
        <span className="builder-preview__spacer" />
        <span className="builder-preview__toolbar-hint">
          {tierWidth === 0 ? '跟随面板宽度' : `按 ${tierWidth}px 渲染，超出时在框内横向滚动`}
        </span>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onRequestAdd}>
          <IconPlus size={14} />
          新增区块
        </button>
        <button type="button" className="admin-chip" aria-pressed={fullscreen} onClick={onToggleFullscreen}>
          {fullscreen ? <IconCollapse size={14} /> : <IconExpand size={14} />}
          {fullscreen ? '退出全屏' : '全屏'}
        </button>
        <a className="btn btn--secondary btn--sm" href={previewHref} target="_blank" rel="noreferrer">
          打开前台
        </a>
      </div>

      <div className="builder-preview__frame">
        <div className={canvasClass}>
          <ProductDetailContext.Provider value={PREVIEW_PRODUCT}>
            <PreviewList blocks={blocks} parentId={null} column={0} api={api} />
          </ProductDetailContext.Provider>
        </div>
      </div>
    </section>
  )
}
