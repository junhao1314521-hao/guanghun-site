/**
 * 后台「页面装修器」（契约 §4 / §6.2 / §6.3 / §9）。
 * ============================================================
 * 真正的区块化页面搭建器（桌面三栏，≤1023px 上下堆叠）：
 * - 顶部：页面标题 / key·路径（只读）/ 未保存标记 / 保存 / 重置为初始 / 打开前台 / Toast；
 * - 左栏：区块有序列表（图标 + 类型名 + 摘要；拖拽排序 / 上移 / 下移 / 复制 / 启停 / 删除）+ 新增区块面板；
 * - 中栏：选中区块的字段表单（按 §6.3 元数据自动渲染）+ 样式面板；layout 额外提供布局编排；
 * - 右栏：实时预览（复用前台 BlockRenderer 渲染**当前草稿**，未保存即生效，可折叠）；
 *   预览内可直接拖拽排序 / 悬停操作条 / 「＋ 在此插入」/ 点击选中，并支持宽度档位与辅助线。
 *
 * 交互要点：
 * - 拖拽排序用原生 HTML5 drag & drop（不新增依赖），左列表与预览共享同一套 `reorderBlock` 与同一份顺序状态；
 *   键盘可达替代方案为保留的「↑ / ↓」按钮；
 * - 预览内新增 / 插入：点击落点弹出类型选择器（复用 TypePicker / 目录，含 richText/html/embed），
 *   按落点 `insertAt` 插入到指定位置并选中；layout 列内同样支持下钻插入。
 * - 复制区块会 props 深拷贝并生成全新唯一 id（含 layout 子区块全树重发 id），插入到原区块之后；
 * - 「启用/停用」快捷开关对应 `enabled`，停用区块在预览中不渲染内容（显示占位条）、在列表中置灰。
 * - 所有改动累积在本地状态，点「保存」调用 PUT 提交整页（blocks 全量覆盖）。
 * - 撤销 / 重做（历史栈上限 30 步）：覆盖增删 / 排序 / 复制 / 启停 / 字段编辑 / 样式编辑；
 *   快捷键 Ctrl/Cmd+Z 撤销、Ctrl/Cmd+Shift+Z 或 Ctrl+Y 重做；头部显示「可撤销 N 步」并提供历史版本恢复。
 *   dirty 由「当前草稿 vs 已保存基线」派生，撤销回到已保存态即自动清除未保存标记。
 *
 * 未保存时离开（浏览器刷新/关闭、点击返回）会给出提示。
 */
import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode, type RefObject } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createBlock,
  fetchAdminPage,
  fetchBlockTypeCatalog,
  resetAdminPage,
  saveAdminPage,
} from '../../api/adminPages'
import type { Block, BlockStyle, BlockType, BlockTypeMeta, Page } from '../../api/adminPages'
import { createRelease } from '../../api/adminPublish'
import { ApiError } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { AdminPageHead } from '../../components/admin/AdminPageHead'
import { AdminIcon } from '../../components/admin/AdminIcon'
import { AdminNotFound } from '../../components/admin/AdminNotFound'
import { BlockEditor } from '../../components/admin/BlockEditor'
import { BuilderPreview } from '../../components/admin/BuilderPreview'
import { OverflowMenu } from '../../components/admin/OverflowMenu'
import { IconArrowDown, IconArrowUp, IconChevronLeft, IconChevronRight, IconClose, IconGrip, IconPlus, IconSearch } from '../../components/ui/Icon'
import { useConfirm, useToast } from '../../components/admin/feedback'
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard'
import { useBlockHistory } from '../../hooks/useBlockHistory'
import {
  blockIcon,
  blockListKey,
  blockSummary,
  duplicateBlock,
  findBlock,
  indexTypes,
  insertAt,
  insertBlock,
  insertChild,
  layoutChildren,
  layoutColumns,
  moveBlock,
  normalizeLayouts,
  removeBlock,
  reorderBlock,
  typeName,
  updateBlock,
  type InsertSlot,
} from '../../components/admin/blockBuilderUtils'

/** 分组顺序（契约 §6.3 group） */
const GROUP_ORDER: Array<BlockTypeMeta['group']> = ['内容', '数据', '结构']

/**
 * 数据源区块 → 后台集合：属性面板顶部提示「数据来自…」并提供跳转，
 * 让「前台板块 ↔ 后台集合」一一对上（未列出的区块为纯内容区块，无外部数据源）。
 */
const BLOCK_DATA_SOURCE: Partial<Record<BlockType, { label: string; href: string }>> = {
  productGrid: { label: '产品集合（产品 / 分类 / 手动挑选）', href: '/admin/products' },
  articleList: { label: '文章集合（评测 / 教程 / 观察 / 品牌）', href: '/admin/articles' },
  ranking: { label: '天梯榜集合', href: '/admin/rankings' },
  downloadList: { label: '下载资源集合', href: '/admin/downloads' },
  faqList: { label: '常见问题集合', href: '/admin/faqs' },
  // 产品详情主体区块：数据来自「当前产品」（同一套模板作用于所有产品）
  productHero: { label: '当前产品（产品集合）', href: '/admin/products' },
  productSpecs: { label: '当前产品 · 参数与实测（产品集合）', href: '/admin/products' },
  productBuy: { label: '当前产品（产品集合）', href: '/admin/products' },
  caseList: { label: '合作案例集合', href: '/admin/biz-cases' },
  venueList: { label: '体验点集合', href: '/admin/biz-venues' },
}

/** 空区块类型目录常量（保持引用稳定，避免每次渲染新建数组） */
const EMPTY_TYPES: BlockTypeMeta[] = []

/** 装修器左右面板收束状态持久化键 */
const BUILDER_PANELS_KEY = 'gh-builder-panels'

/** 读取持久化的面板收束状态（默认左右均展开；损坏 / 隐私模式下回退默认） */
function readPanels(): { left: boolean; right: boolean } {
  try {
    const raw = window.localStorage.getItem(BUILDER_PANELS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { left?: unknown; right?: unknown }
      return { left: parsed.left !== false, right: parsed.right !== false }
    }
  } catch {
    // 忽略解析失败 / 隐私模式写入失败
  }
  return { left: true, right: true }
}

/* ============================================================
   新增区块面板（按 §6.3 分组渲染；layout 列内不允许再加 layout）
   ============================================================ */
function TypePicker({
  types,
  allowLayout,
  onAdd,
}: {
  types: BlockTypeMeta[]
  allowLayout: boolean
  onAdd: (type: BlockType) => void
}) {
  const groups = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({
        group,
        items: types.filter((meta) => meta.group === group && (allowLayout || meta.type !== 'layout')),
      })).filter((entry) => entry.items.length > 0),
    [types, allowLayout],
  )

  if (types.length === 0) {
    return <span className="field__hint">区块类型目录未加载，暂无法新增区块。</span>
  }

  return (
    <div className="builder-addgrid">
      {groups.map((entry) => (
        <div className="builder-addgrid__group" key={entry.group}>
          <div className="builder-addgrid__label">{entry.group}</div>
          <div className="builder-addgrid__items">
            {entry.items.map((meta) => (
              <button type="button" className="builder-typebtn" key={meta.type} onClick={() => onAdd(meta.type)}>
                <span className="builder-typebtn__icon">
                  <AdminIcon name={blockIcon(meta.type)} size={16} />
                </span>
                {meta.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ============================================================
   区块列表项（顶层与 layout 子区块共用）
   ============================================================ */
function BlockRow({
  block,
  index,
  total,
  selected,
  meta,
  dragging,
  dropBefore,
  onSelect,
  onMove,
  onRemove,
  onToggle,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  block: Block
  index: number
  total: number
  selected: boolean
  meta: BlockTypeMeta | undefined
  /** 该项正被拖拽 */
  dragging: boolean
  /** 作为拖拽落点时：true=落点在前 / false=落点在后 / null=非落点 */
  dropBefore: boolean | null
  onSelect: () => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  onToggle: () => void
  onDuplicate: () => void
  onDragStart: (event: DragEvent<HTMLElement>) => void
  onDragOver: (event: DragEvent<HTMLElement>) => void
  onDrop: (event: DragEvent<HTMLElement>) => void
  onDragEnd: () => void
}) {
  const dropState = dropBefore === null ? '' : dropBefore ? ' is-drop-before' : ' is-drop-after'
  return (
    <div
      className={`builder-item${selected ? ' is-selected' : ''}${block.enabled ? '' : ' is-disabled'}${
        dragging ? ' is-dragging' : ''
      }${dropBefore === null ? '' : ' is-drop-target'}${dropState}`}
      data-block-id={block.id}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="builder-item__head">
        <span
          className="builder-item__handle"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title="按住拖拽排序（键盘可用上移 / 下移按钮）"
          aria-hidden="true"
        >
          <IconGrip size={16} />
        </span>
        <button type="button" className="builder-item__main" onClick={onSelect}>
          <span className="builder-item__icon">
            <AdminIcon name={blockIcon(block.type)} size={block.type === 'layout' ? 18 : 16} />
          </span>
          <span className="builder-item__text">
            <span className="builder-item__name">{typeName(block.type, meta)}</span>
            <span className="builder-item__summary">{blockSummary(block)}</span>
          </span>
        </button>
      </div>
      <div className="builder-item__actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={index === 0}
          title="上移"
          aria-label="上移"
          onClick={() => onMove(-1)}
        >
          <IconArrowUp size={16} />
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={index === total - 1}
          title="下移"
          aria-label="下移"
          onClick={() => onMove(1)}
        >
          <IconArrowDown size={16} />
        </button>
        {/* 动作超过 2 个：复制 / 启停 / 删除 收进「⋯」溢出菜单；删除为危险项且需确认 */}
        <OverflowMenu
          label="更多区块操作"
          items={[
            { key: 'duplicate', label: '复制该区块', onClick: onDuplicate },
            { key: 'toggle', label: block.enabled ? '停用该区块' : '启用该区块', onClick: onToggle },
            { key: 'remove', label: '删除该区块', danger: true, onClick: onRemove },
          ]}
        />
      </div>
      {/* 拖拽落点悬浮「＋」提示（配合 .is-drop-before/after 的插线） */}
      {dropBefore !== null && (
        <span className={`builder-item__insert${dropBefore ? ' is-before' : ' is-after'}`} aria-hidden="true">
          <IconPlus size={12} />
        </span>
      )}
    </div>
  )
}

/* ============================================================
   样式面板（契约 §3 BlockStyle）
   ============================================================ */
const STYLE_FIELDS: Array<{ key: keyof BlockStyle; label: string; options: Array<{ label: string; value: string }> }> = [
  {
    key: 'background',
    label: '区块底色',
    options: [
      { label: '默认', value: '' },
      { label: '无', value: 'none' },
      { label: '柔和', value: 'soft' },
      { label: '纯色', value: 'solid' },
      { label: '渐变', value: 'gradient' },
    ],
  },
  {
    key: 'paddingY',
    label: '上下留白',
    options: [
      { label: '默认', value: '' },
      { label: '小', value: 'sm' },
      { label: '中', value: 'md' },
      { label: '大', value: 'lg' },
    ],
  },
  {
    key: 'align',
    label: '对齐',
    options: [
      { label: '默认', value: '' },
      { label: '左对齐', value: 'left' },
      { label: '居中', value: 'center' },
    ],
  },
  {
    key: 'theme',
    label: '强制明暗',
    options: [
      { label: '自动', value: '' },
      { label: '浅色', value: 'light' },
      { label: '深色', value: 'dark' },
    ],
  },
  {
    key: 'container',
    label: '内容宽度',
    options: [
      { label: '默认', value: '' },
      { label: '通栏 / 全宽', value: 'full' },
      { label: '宽', value: 'wide' },
      { label: '常规', value: 'normal' },
      { label: '窄', value: 'narrow' },
    ],
  },
]

function StylePanel({ style, onChange }: { style: BlockStyle | undefined; onChange: (style: BlockStyle) => void }) {
  const current = style ?? {}
  const set = (key: keyof BlockStyle, value: string) => {
    const next = { ...current } as Record<string, unknown>
    if (value === '') delete next[key]
    else next[key] = value
    onChange(next as BlockStyle)
  }
  return (
    <div className="builder-style">
      {STYLE_FIELDS.map((field) => (
        <div className="field" key={field.key}>
          <span className="field__label">{field.label}</span>
          <select
            className="select"
            value={typeof current[field.key] === 'string' ? (current[field.key] as string) : ''}
            onChange={(event) => set(field.key, event.target.value)}
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}

/* ============================================================
   布局编排（layout 一层嵌套子区块的增删排序）
   ============================================================ */
function LayoutChildrenEditor({
  block,
  types,
  renderRow,
  onAdd,
}: {
  block: Block
  types: BlockTypeMeta[]
  /** 复用顶层区块行（含拖拽 / 复制 / 启停 / 删除），保证交互一致 */
  renderRow: (block: Block, index: number, total: number) => ReactNode
  onAdd: (column: number, type: BlockType) => void
}) {
  const columns = layoutColumns(block)
  const children = layoutChildren(block)
  return (
    <div className="builder-layout-cols">
      {Array.from({ length: columns }, (_, column) => (
        <div className="builder-layout-col" key={column}>
          <div className="builder-layout-col__title">第 {column + 1} 列</div>
          {children[column].map((child, index) => renderRow(child, index, children[column].length))}
          <TypePicker types={types} allowLayout={false} onAdd={(type) => onAdd(column, type)} />
        </div>
      ))}
    </div>
  )
}

/* ============================================================
   新增区块抽屉（底部滑出，不占主区）；复用 TypePicker 目录
   ============================================================ */
function AddBlocksDrawer({
  open,
  onClose,
  types,
  insertMode,
  onInsertModeChange,
  hasSelected,
  catalogError,
  onAdd,
  panelRef,
}: {
  open: boolean
  onClose: () => void
  types: BlockTypeMeta[]
  insertMode: 'end' | 'after'
  onInsertModeChange: (mode: 'end' | 'after') => void
  hasSelected: boolean
  catalogError: { message: string } | null
  onAdd: (type: BlockType) => void
  panelRef: RefObject<HTMLDivElement | null>
}) {
  // 打开时聚焦首个可交互项；Esc 关闭（键盘可达）
  useEffect(() => {
    if (!open) return
    panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, panelRef])

  if (!open) return null

  return (
    <div className="builder-drawer" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        className="builder-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="builder-add-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="builder-drawer__head">
          <h2 className="admin-dialog__title" id="builder-add-title">
            新增区块
          </h2>
          <button type="button" className="btn btn--ghost btn--sm" aria-label="关闭" onClick={onClose}>
            <IconClose size={18} />
          </button>
        </div>
        <div className="builder-insertmode">
          <button
            type="button"
            className={`admin-chip${insertMode === 'end' ? ' is-active' : ''}`}
            onClick={() => onInsertModeChange('end')}
          >
            追加到末尾
          </button>
          <button
            type="button"
            className={`admin-chip${insertMode === 'after' ? ' is-active' : ''}`}
            onClick={() => onInsertModeChange('after')}
          >
            插入到选中之后
          </button>
        </div>
        {insertMode === 'after' && !hasSelected && <span className="field__hint">未选中区块，将追加到末尾。</span>}
        {catalogError && (
          <div className="alert alert--warning" role="status" style={{ marginBottom: 'var(--gh-space-3)' }}>
            {catalogError.message}
          </div>
        )}
        <div className="builder-drawer__body">
          <TypePicker types={types} allowLayout onAdd={onAdd} />
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   发布状态与自动保存（本地记忆）
   ============================================================ */
/** 发布签名 storage key（按页面）：用于区分「已发布 / 有未发布变更」 */
const publishedSigKey = (pageKey: string) => `gh-builder-published:${pageKey}`
const AUTOSAVE_KEY = 'gh-builder-autosave'

function readPublishedSig(pageKey: string): string {
  try {
    return window.localStorage.getItem(publishedSigKey(pageKey)) ?? ''
  } catch {
    return ''
  }
}

function writePublishedSig(pageKey: string, sig: string): void {
  try {
    window.localStorage.setItem(publishedSigKey(pageKey), sig)
  } catch {
    // 忽略隐私模式等写入失败
  }
}

/** 自动保存开关（默认开启） */
function readAutoSave(): boolean {
  try {
    return window.localStorage.getItem(AUTOSAVE_KEY) !== '0'
  } catch {
    return true
  }
}

/** 区块库「最近使用」：记录最近新增的区块类型（最多 5 个，最近在前） */
const RECENT_TYPES_KEY = 'gh-builder-recent-types'

function readRecentTypes(): BlockType[] {
  try {
    const raw = window.localStorage.getItem(RECENT_TYPES_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is BlockType => typeof item === 'string') : []
  } catch {
    return []
  }
}

function pushRecentType(type: BlockType): BlockType[] {
  const next = [type, ...readRecentTypes().filter((item) => item !== type)].slice(0, 5)
  try {
    window.localStorage.setItem(RECENT_TYPES_KEY, JSON.stringify(next))
  } catch {
    // 忽略隐私模式等写入失败
  }
  return next
}

/* ============================================================
   装修器主体
   ============================================================ */
function Builder({ pageKey, initial }: { pageKey: string; initial: Page }) {
  const [page, setPage] = useState<Page>(initial)
  // 区块树 + 撤销/重做历史（单一状态源）
  const hist = useBlockHistory(initial.blocks)
  const blocks = hist.blocks
  const [selectedId, setSelectedId] = useState<string | null>(initial.blocks[0]?.id ?? null)
  const [insertMode, setInsertMode] = useState<'end' | 'after'>('end')
  // 预览「＋ 插入」落点：非空时弹出区块类型选择器
  const [insertSlot, setInsertSlot] = useState<InsertSlot | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const addRef = useRef<HTMLDivElement>(null)
  // 已保存基线签名：dirty = 当前草稿与基线不一致（撤销回到已保存态即自动清除 dirty）
  const [savedSig, setSavedSig] = useState(() => JSON.stringify(normalizeLayouts(initial.blocks)))
  const [saving, setSaving] = useState(false)
  // 布局形态：左＝区块结构（可收起）｜中＝大预览（可全屏）｜右＝属性面板（可收起）
  // 左右收束状态持久化（localStorage），刷新后保持
  const [panels, setPanels] = useState(() => readPanels())
  const leftOpen = panels.left
  const rightOpen = panels.right
  const [fullscreen, setFullscreen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [guides, setGuides] = useState(true)
  const toast = useToast()
  const confirm = useConfirm()
  // 左列表拖拽状态：dragId=正在拖拽的区块；dropHint=当前落点（id + 落在前/后）
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropHint, setDropHint] = useState<{ id: string; before: boolean } | null>(null)
  // 右侧面板 Tab：区块库 / 属性 / 样式（信息架构以「页面目标」为中心，而非区块类型平铺）
  const [tab, setTab] = useState<'library' | 'props' | 'style'>('props')
  const [typeQuery, setTypeQuery] = useState('')
  const [publishing, setPublishing] = useState(false)
  // 发布状态（本地记忆）：已发布 / 有未发布变更；草稿自动保存
  const [publishedSig, setPublishedSig] = useState(() => readPublishedSig(pageKey))
  const [autoSave, setAutoSave] = useState(() => readAutoSave())
  const [recentTypes, setRecentTypes] = useState<BlockType[]>(() => readRecentTypes())
  const [autoSaving, setAutoSaving] = useState(false)
  const [autoSavedAt, setAutoSavedAt] = useState<number | null>(null)

  // 与「将发送给服务端的内容」比较，避免布局归一化导致的假 dirty
  // （自动保存只更新基线、不清空撤销历史，故 dirty 用归一化签名）
  const draftSig = useMemo(() => JSON.stringify(normalizeLayouts(blocks)), [blocks])

  const dirty = draftSig !== savedSig

  /** 顶栏状态：有未保存修改 > 有未发布变更 > 已发布 / 已保存 */
  const publishState = dirty
    ? { tone: 'dirty', label: '有未保存修改' }
    : publishedSig && publishedSig === savedSig
      ? { tone: 'published', label: '已发布' }
      : publishedSig
        ? { tone: 'unpublished', label: '有未发布变更' }
        : { tone: 'saved', label: '已保存' }

  // 未保存修改：刷新 / 关闭标签页、以及站内路由离开均拦截（useUnsavedGuard）
  useUnsavedGuard(dirty)

  // 自动保存开关记忆
  useEffect(() => {
    try {
      window.localStorage.setItem(AUTOSAVE_KEY, autoSave ? '1' : '0')
    } catch {
      // 忽略隐私模式等写入失败
    }
  }, [autoSave])

  // 草稿自动保存：停止编辑 2.5s 后静默保存（只更新基线，**不清空撤销历史**，不弹提示）
  useEffect(() => {
    if (!autoSave || !dirty || saving || publishing) return
    const timer = window.setTimeout(() => {
      setAutoSaving(true)
      const sentBlocks = normalizeLayouts(blocks)
      saveAdminPage(pageKey, {
        path: page.path,
        title: page.title,
        description: page.description,
        blocks: sentBlocks,
      })
        .then(() => {
          setSavedSig(JSON.stringify(sentBlocks))
          setAutoSavedAt(Date.now())
        })
        .catch(() => {
          // 自动保存失败保持静默，交由用户手动保存
        })
        .finally(() => setAutoSaving(false))
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [autoSave, dirty, saving, publishing, blocks, pageKey, page.path, page.title, page.description])

  // 记忆左右面板收束状态（刷新后保持）
  useEffect(() => {
    try {
      window.localStorage.setItem(BUILDER_PANELS_KEY, JSON.stringify(panels))
    } catch {
      // 忽略隐私模式等写入失败
    }
  }, [panels])

  const catalog = useApi<BlockTypeMeta[]>((signal) => fetchBlockTypeCatalog(signal), [])
  const types = catalog.data ?? EMPTY_TYPES
  const typeMeta = indexTypes(types)
  // 「新增区块」选择器只列出启用中的类型（组件库停用后不再出现）；已存在区块仍按全量目录显示名称
  const enabledTypes = useMemo(() => types.filter((meta) => meta.enabled !== false), [types])

  // 有效选中：选中 id 失效（被删除 / 撤销）时按渲染派生回退到首个区块，避免在 effect 中同步 state
  const activeId = selectedId && findBlock(blocks, selectedId) ? selectedId : (blocks[0]?.id ?? null)
  const selected = activeId ? findBlock(blocks, activeId) : null
  const selectedMeta = selected ? typeMeta[selected.type] : undefined
  /** 属性面板顶部「数据来自」提示（数据源区块才有） */
  const dataSource = selected ? BLOCK_DATA_SOURCE[selected.type] : undefined
  /** 区块库按名称 / 类型 key 搜索过滤 */
  const libraryTypes = useMemo(() => {
    const query = typeQuery.trim().toLowerCase()
    if (!query) return enabledTypes
    return enabledTypes.filter(
      (meta) => meta.name.toLowerCase().includes(query) || meta.type.toLowerCase().includes(query),
    )
  }, [enabledTypes, typeQuery])

  /** 应用一次区块树变更（入历史栈；group 用于合并同字段的连续编辑为一步） */
  const mutate = (fn: (list: Block[]) => Block[], group?: string) => hist.apply(fn, group)

  const addBlock = (type: BlockType) => {
    const block = createBlock(type)
    const afterId = insertMode === 'after' ? activeId : null
    mutate((list) => insertBlock(list, block, afterId))
    setSelectedId(block.id)
    setRecentTypes(pushRecentType(type))
  }

  const addChild = (parentId: string, column: number, type: BlockType) => {
    const block = createBlock(type)
    mutate((list) => insertChild(list, parentId, column, block))
    setSelectedId(block.id)
    setRecentTypes(pushRecentType(type))
  }

  /** 预览落点 → 打开区块类型选择器 */
  const requestInsert = (slot: InsertSlot) => setInsertSlot(slot)

  /** 选定类型后在落点插入并选中，中栏随之切到该块字段 */
  const confirmInsert = (type: BlockType) => {
    if (!insertSlot) return
    const block = createBlock(type)
    const slot = insertSlot
    hist.apply((list) => insertAt(list, block, slot))
    setSelectedId(block.id)
    setInsertSlot(null)
    setRecentTypes(pushRecentType(type))
  }

  /** 复制：props 深拷贝 + 全新 id，插入到原区块之后并选中副本 */
  const duplicate = (id: string) => {
    const { blocks: next, newId } = duplicateBlock(blocks, id)
    if (!newId) return
    hist.apply(() => next)
    setSelectedId(newId)
  }

  const onSave = async () => {
    setSaving(true)
    try {
      const saved = await saveAdminPage(pageKey, {
        path: page.path,
        title: page.title,
        description: page.description,
        blocks: normalizeLayouts(blocks),
      })
      setPage(saved)
      hist.reset(saved.blocks)
      setSavedSig(JSON.stringify(normalizeLayouts(saved.blocks)))
      toast.success('已保存，前台刷新即可生效。')
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  /** 发布闭环：先保存草稿（如有未保存修改），再生成发布记录（快照当前内容），前台立即生效 */
  const onPublish = async () => {
    setPublishing(true)
    try {
      if (dirty) await onSave()
      await createRelease('后台装修器 · 页面发布')
      const sig = JSON.stringify(normalizeLayouts(blocks))
      setSavedSig(sig)
      setPublishedSig(sig)
      writePublishedSig(pageKey, sig)
      toast.success('已发布，前台立即生效。')
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '发布失败，请稍后重试')
    } finally {
      setPublishing(false)
    }
  }

  const onReset = async () => {
    const ok = await confirm({
      title: '重置为初始版本',
      message: '当前未保存的修改将丢失。确定重置为初始版本？',
      confirmText: '重置',
      danger: true,
    })
    if (!ok) return
    setSaving(true)
    try {
      const reset = await resetAdminPage(pageKey)
      setPage(reset)
      hist.reset(reset.blocks, true)
      setSavedSig(JSON.stringify(reset.blocks))
      setSelectedId(reset.blocks[0]?.id ?? null)
      toast.success('已重置为初始版本。')
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '重置失败')
    } finally {
      setSaving(false)
    }
  }

  /** 删除区块前确认（破坏性操作） */
  const onRemoveBlock = async (id: string) => {
    const ok = await confirm({
      title: '删除区块',
      message: '确认删除该区块？可用「撤销」找回（保存后生效）。',
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    mutate((list) => removeBlock(list, id))
  }

  // 稳定引用，供全局快捷键订阅（避免每次渲染重订阅）
  const historyUndo = hist.undo
  const historyRedo = hist.redo

  // 撤销 / 重做：焦点在可编辑控件内时让位给原生文本撤销
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (insertSlot) return
      if (!(event.ctrlKey || event.metaKey)) return
      const target = event.target as HTMLElement | null
      const editable =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      if (editable) return
      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) historyRedo()
        else historyUndo()
      } else if (key === 'y') {
        event.preventDefault()
        historyRedo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [historyUndo, historyRedo, insertSlot])

  // 选中联动：左列表对应项滚动到可见区（nearest 仅在需要时滚动）
  useEffect(() => {
    if (!activeId) return
    const el = document.querySelector<HTMLElement>(`.builder-items [data-block-id="${activeId}"]`)
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  // 插入选择器：Esc 关闭；打开时聚焦首个类型按钮（键盘可达）
  useEffect(() => {
    if (!insertSlot) return
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setInsertSlot(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [insertSlot])

  // 全屏预览：Esc 退出（键盘可达）
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [fullscreen])

  /* ---------- 拖拽排序（原生 HTML5 drag & drop，仅同层可重排） ---------- */
  const canDrop = (targetId: string) =>
    dragId !== null &&
    dragId !== targetId &&
    blockListKey(blocks, dragId) !== null &&
    blockListKey(blocks, dragId) === blockListKey(blocks, targetId)

  const onRowDragStart = (id: string) => (event: DragEvent<HTMLElement>) => {
    setDragId(id)
    event.dataTransfer.effectAllowed = 'move'
    // Firefox 需 setData 才会触发拖拽
    event.dataTransfer.setData('text/plain', id)
  }

  const onRowDragOver = (id: string) => (event: DragEvent<HTMLElement>) => {
    if (!canDrop(id)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const rect = event.currentTarget.getBoundingClientRect()
    setDropHint({ id, before: event.clientY < rect.top + rect.height / 2 })
  }

  const onRowDrop = (id: string) => (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    if (dragId && dropHint && canDrop(id)) {
      mutate((list) => reorderBlock(list, dragId, dropHint.id, dropHint.before))
    }
    setDragId(null)
    setDropHint(null)
  }

  const onRowDragEnd = () => {
    setDragId(null)
    setDropHint(null)
  }

  /** 顶层与 layout 子区块共用的行渲染 */
  const renderRow = (block: Block, index: number, total: number) => (
    <BlockRow
      key={block.id}
      block={block}
      index={index}
      total={total}
      selected={activeId === block.id}
      meta={typeMeta[block.type]}
      dragging={dragId === block.id}
      dropBefore={dropHint?.id === block.id ? dropHint.before : null}
      onSelect={() => setSelectedId(block.id)}
      onMove={(dir) => mutate((list) => moveBlock(list, block.id, dir))}
      onRemove={() => void onRemoveBlock(block.id)}
      onToggle={() => mutate((list) => updateBlock(list, block.id, (b) => ({ ...b, enabled: !b.enabled })))}
      onDuplicate={() => duplicate(block.id)}
      onDragStart={onRowDragStart(block.id)}
      onDragOver={onRowDragOver(block.id)}
      onDrop={onRowDrop(block.id)}
      onDragEnd={onRowDragEnd}
    />
  )

  // 模板页路径（含 :param）以占位值 1 打开预览
  const previewHref = page.path.replace(/:[A-Za-z0-9_]+/g, '1')

  return (
    <div className="admin-page admin-page--wide builder-page">
      <AdminPageHead
        title={page.title}
        desc={`页面 key：${page.key} · 前台路径：${page.path}${dirty ? ' · 有未保存修改' : ''}`}
        actions={
          <>
            <span className={`builder-status builder-status--${publishState.tone}`} role="status">
              {publishState.label}
            </span>
            {autoSave && (autoSaving || autoSavedAt) && (
              <span className="builder-autosave" role="status">
                {autoSaving
                  ? '自动保存中…'
                  : `已自动保存 ${new Date(autoSavedAt as number).toLocaleTimeString('zh-CN', { hour12: false })}`}
              </span>
            )}
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={hist.undo}
              disabled={!hist.canUndo}
              title="撤销（Ctrl/Cmd+Z）"
            >
              ↶ 撤销
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={hist.redo}
              disabled={!hist.canRedo}
              title="重做（Ctrl/Cmd+Shift+Z 或 Ctrl+Y）"
            >
              ↷ 重做
            </button>
            {hist.canUndo && (
              <span className="builder-history-hint" role="status">
                可撤销 {hist.undoCount} 步
              </span>
            )}
            {hist.snapshots.length > 0 && (
              <OverflowMenu
                label="历史版本"
                items={[...hist.snapshots]
                  .reverse()
                  .slice(0, 10)
                  .map((snapshot, index) => ({
                    key: `snap-${snapshot.at}-${index}`,
                    label: `${new Date(snapshot.at).toLocaleTimeString('zh-CN', { hour12: false })} · ${
                      snapshot.blocks.length
                    } 区块`,
                    onClick: () => hist.restore(snapshot.blocks),
                  }))}
              />
            )}
            <Link className="btn btn--secondary btn--sm" to="/admin/pages">
              返回列表
            </Link>
            <button type="button" className="btn btn--secondary btn--sm" onClick={onReset} disabled={saving}>
              重置为初始
            </button>
            <a className="btn btn--secondary btn--sm" href={previewHref} target="_blank" rel="noreferrer">
              打开前台
            </a>
            <button
              className={`btn btn--secondary btn--sm${saving ? ' btn--loading' : ''}`}
              type="button"
              onClick={onSave}
              disabled={saving || publishing}
            >
              {saving ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  保存中…
                </>
              ) : (
                '保存草稿'
              )}
            </button>
            <button
              className={`btn btn--primary btn--sm${publishing ? ' btn--loading' : ''}`}
              type="button"
              onClick={onPublish}
              disabled={publishing || saving}
              title="保存草稿并发布：快照当前内容，前台立即生效"
            >
              {publishing ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  发布中…
                </>
              ) : (
                '发布'
              )}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              aria-pressed={autoSave}
              title="开启后：停止编辑 2.5 秒自动保存草稿（不清空撤销历史）"
              onClick={() => setAutoSave((value) => !value)}
            >
              自动保存：{autoSave ? '开' : '关'}
            </button>
            <Link className="btn btn--secondary btn--sm" to="/admin/publish">
              定时发布 / 版本
            </Link>
          </>
        }
      />

      <div
        className={`builder-shell${leftOpen ? '' : ' is-left-collapsed'}${rightOpen ? '' : ' is-right-collapsed'}${
          fullscreen ? ' is-fullscreen' : ''
        }`}
      >
        {/* 左：区块结构列表（可收起为窄条） */}
        <aside className="builder-rail builder-rail--left" aria-label="区块结构">
          <div className="builder-rail__head">
            <h2 className="builder-rail__title">区块结构</h2>
            <span className="admin-table__count">{blocks.length}</span>
            <button
              type="button"
              className="btn btn--ghost btn--sm builder-rail__collapse"
              aria-label={leftOpen ? '收起区块结构' : '展开区块结构'}
              aria-expanded={leftOpen}
              title={leftOpen ? '收起区块结构' : '展开区块结构'}
              onClick={() => setPanels((prev) => ({ ...prev, left: !prev.left }))}
            >
              {leftOpen ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />}
            </button>
          </div>
          {leftOpen && (
            <div className="builder-rail__body">
              {blocks.length === 0 ? (
                <span className="field__hint">该页面暂无区块，请点下方「新增区块」，或在预览中插入。</span>
              ) : (
                <div className="builder-items">{blocks.map((block, index) => renderRow(block, index, blocks.length))}</div>
              )}
            </div>
          )}
          <div className="builder-rail__foot">
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAddOpen(true)}>
              <IconPlus size={14} />
              新增区块
            </button>
          </div>
        </aside>

        {/* 中：大预览（占主区，可全屏） */}
        <section className="builder-stage" aria-label="实时预览">
          <BuilderPreview
            blocks={blocks}
            typeMeta={typeMeta}
            selectedId={activeId}
            previewHref={previewHref}
            fullscreen={fullscreen}
            onToggleFullscreen={() => setFullscreen((value) => !value)}
            onRequestAdd={() => setAddOpen(true)}
            onSelect={setSelectedId}
            onReorder={(id, target, before) => mutate((list) => reorderBlock(list, id, target, before))}
            onMove={(id, dir) => mutate((list) => moveBlock(list, id, dir))}
            onToggleBlock={(id) => mutate((list) => updateBlock(list, id, (b) => ({ ...b, enabled: !b.enabled })))}
            onDuplicate={duplicate}
            onRemove={(id) => void onRemoveBlock(id)}
            onRequestInsert={requestInsert}
            guides={guides}
            onToggleGuides={() => setGuides((value) => !value)}
          />
        </section>

        {/* 右：选中区块属性面板（可收起为窄条） */}
        <aside className="builder-rail builder-rail--right" aria-label="属性面板">
          <div className="builder-rail__head">
            <h2 className="builder-rail__title">面板</h2>
            {selected && <span className="tag">{selected.enabled ? '已启用' : '已停用'}</span>}
            <button
              type="button"
              className="btn btn--ghost btn--sm builder-rail__collapse"
              aria-label={rightOpen ? '收起属性面板' : '展开属性面板'}
              aria-expanded={rightOpen}
              title={rightOpen ? '收起属性面板' : '展开属性面板'}
              onClick={() => setPanels((prev) => ({ ...prev, right: !prev.right }))}
            >
              {rightOpen ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
            </button>
          </div>
          {rightOpen && (
            <div className="builder-rail__body">
              {/* 三 Tab：区块库 / 属性 / 样式（把「加区块」「改字段」「调样式」分离，逻辑更清晰） */}
              <div className="builder-tabs" role="tablist" aria-label="面板切换">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'library'}
                  className={`builder-tab${tab === 'library' ? ' is-active' : ''}`}
                  onClick={() => setTab('library')}
                >
                  区块库
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'props'}
                  className={`builder-tab${tab === 'props' ? ' is-active' : ''}`}
                  onClick={() => setTab('props')}
                >
                  属性
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'style'}
                  className={`builder-tab${tab === 'style' ? ' is-active' : ''}`}
                  onClick={() => setTab('style')}
                >
                  样式
                </button>
              </div>

              {tab === 'library' && (
                <section className="admin-panel">
                  <div className="builder-libsearch">
                    <IconSearch size={16} />
                    <input
                      className="input"
                      type="search"
                      placeholder="搜索区块（产品 / 文章 / 卡片 / 数字…）"
                      aria-label="搜索区块类型"
                      value={typeQuery}
                      onChange={(event) => setTypeQuery(event.target.value)}
                    />
                  </div>
                  <div className="builder-addmode">
                    <button
                      type="button"
                      className={`admin-chip${insertMode === 'end' ? ' is-active' : ''}`}
                      onClick={() => setInsertMode('end')}
                    >
                      追加到末尾
                    </button>
                    <button
                      type="button"
                      className={`admin-chip${insertMode === 'after' ? ' is-active' : ''}`}
                      onClick={() => setInsertMode('after')}
                    >
                      插入到选中之后
                    </button>
                  </div>
                  {/* 最近使用：仅无搜索关键字时展示，减少常用区块的查找成本 */}
                  {!typeQuery.trim() && recentTypes.length > 0 && (
                    <div className="builder-addgrid__group">
                      <div className="builder-addgrid__label">最近使用</div>
                      <div className="builder-addgrid__items">
                        {recentTypes.map((type) => {
                          const meta = typeMeta[type]
                          if (!meta || meta.enabled === false) return null
                          return (
                            <button
                              type="button"
                              className="builder-typebtn"
                              key={`recent-${type}`}
                              onClick={() => addBlock(type)}
                            >
                              <span className="builder-typebtn__icon">
                                <AdminIcon name={blockIcon(type)} size={16} />
                              </span>
                              {meta.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <TypePicker types={libraryTypes} allowLayout onAdd={addBlock} />
                  <p className="field__hint">
                    点击类型即新增区块：
                    {insertMode === 'after' ? '插入到当前选中区块之后' : '追加到页面末尾'}。
                  </p>
                </section>
              )}

              {tab === 'props' &&
                (selected ? (
                  <>
                    {dataSource && (
                      <section className="admin-panel builder-datasource">
                        <div className="builder-datasource__row">
                          <span className="builder-datasource__label">数据来自</span>
                          <Link className="builder-datasource__link" to={dataSource.href}>
                            {dataSource.label} →
                          </Link>
                        </div>
                        <p className="field__hint">
                          此区块引用集合数据：内容到对应集合维护，这里只控制「选取范围与呈现方式」。
                        </p>
                      </section>
                    )}
                    <section className="admin-panel">
                      <div className="admin-panel__head">
                        <h3 className="admin-panel__title">
                          <span className="builder-title-icon">
                            <AdminIcon name={blockIcon(selected.type)} size={18} />
                          </span>
                          {typeName(selected.type, selectedMeta)}
                        </h3>
                      </div>
                      <BlockEditor
                        block={selected}
                        meta={selectedMeta}
                        onChange={(next, editKey) =>
                          mutate(
                            (list) => updateBlock(list, selected.id, () => next),
                            editKey ? `field:${selected.id}:${editKey}` : undefined,
                          )
                        }
                      />
                    </section>

                    {selected.type === 'layout' && (
                      <section className="admin-panel">
                        <div className="admin-panel__head">
                          <h3 className="admin-panel__title">布局编排</h3>
                          <span className="admin-table__count">仅支持一层嵌套</span>
                        </div>
                        <LayoutChildrenEditor
                          block={selected}
                          types={enabledTypes}
                          renderRow={renderRow}
                          onAdd={(column, type) => addChild(selected.id, column, type)}
                        />
                      </section>
                    )}
                  </>
                ) : (
                  <section className="admin-panel">
                    <div className="empty">
                      <div className="empty__title">未选中区块</div>
                      <p className="empty__desc">在左侧结构列表或预览中选择一个区块以编辑其字段。</p>
                    </div>
                  </section>
                ))}

              {tab === 'style' &&
                (selected ? (
                  <section className="admin-panel">
                    <div className="admin-panel__head">
                      <h3 className="admin-panel__title">样式</h3>
                    </div>
                    <StylePanel
                      style={selected.style}
                      onChange={(style) => mutate((list) => updateBlock(list, selected.id, (b) => ({ ...b, style })))}
                    />
                  </section>
                ) : (
                  <section className="admin-panel">
                    <div className="empty">
                      <div className="empty__title">未选中区块</div>
                      <p className="empty__desc">在左侧结构列表或预览中选择一个区块以设置样式。</p>
                    </div>
                  </section>
                ))}
            </div>
          )}
        </aside>
      </div>

      {/* 新增区块：底部抽屉（不占主区） */}
      <AddBlocksDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        types={enabledTypes}
        insertMode={insertMode}
        onInsertModeChange={setInsertMode}
        hasSelected={Boolean(selected)}
        catalogError={catalog.error}
        onAdd={(type) => {
          addBlock(type)
          setAddOpen(false)
        }}
        panelRef={addRef}
      />

      {insertSlot && (
        <div className="admin-dialog-overlay" role="presentation" onClick={() => setInsertSlot(null)}>
          <div
            ref={dialogRef}
            className="admin-dialog admin-dialog--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="builder-insert-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="admin-dialog__title" id="builder-insert-title">
              选择要插入的模块类型
            </h2>
            <div className="admin-dialog__body">
              <TypePicker types={enabledTypes} allowLayout={insertSlot.scope === 'root'} onAdd={confirmInsert} />
            </div>
            <div className="admin-dialog__foot">
              <button type="button" className="btn btn--secondary" onClick={() => setInsertSlot(null)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   路由出口：取单页 → 三态 → 渲染装修器
   ============================================================ */
export function AdminPageBuilderPage() {
  const { key = '' } = useParams()
  const state = useApi<Page>((signal) => fetchAdminPage(key, signal), [key])

  if (!key) return <AdminNotFound />

  if (state.loading && !state.data) {
    return (
      <div className="admin-page">
        <AdminPageHead title="页面装修器" desc={`页面 key：${key}`} />
        <p className="admin-page__desc" role="status">
          正在加载页面…
        </p>
      </div>
    )
  }

  if (state.error) {
    const notFound = state.error instanceof ApiError && state.error.status === 404
    return (
      <div className="admin-page">
        <AdminPageHead
          title="页面装修器"
          desc={`页面 key：${key}`}
          actions={
            <Link className="btn btn--secondary btn--sm" to="/admin/pages">
              返回页面列表
            </Link>
          }
        />
        <div className="empty">
          <div className="empty__title">{notFound ? '未找到该页面' : '页面加载失败'}</div>
          <p className="empty__desc">{notFound ? '该页面 key 不存在，请从页面列表进入装修器。' : state.error.message}</p>
        </div>
      </div>
    )
  }

  if (!state.data) return null
  return <Builder key={key} pageKey={key} initial={state.data} />
}
