/**
 * 共享富文本编辑器（后台装修器 BlockEditor 与通用资源表单 AdminResourceFormPage 共用）。
 * ============================================================
 * 轻量实现（零依赖）：contentEditable + 图标工具栏。
 * - 保存时取 `innerHTML`（存原文；前台渲染时再经白名单净化，见 `blocks/sanitize.ts`）；
 * - 命令使用 `document.execCommand`（已废弃但无需依赖，够用即可），
 *   段落格式走 `formatBlock`，行内代码 / 链接 / 图片用 `insertHTML`；
 * - 所有工具栏按钮 `onMouseDown` 阻止默认，避免点击时丢失编辑区的选区；
 * - 通过 `selectionchange` 持续记忆最近一次编辑区选区，供段落下拉 / 弹窗恢复；仅
 *   在编辑区聚焦时更新，避免弹窗内输入框的选区覆盖它；
 * - 工具栏为**图标按钮**（SVG，见 `ui/Icon.tsx`），按「历史 / 行内 / 段落 / 列表 /
 *   块 / 插入 / 格式」分组并以分隔线区隔，带 `title` / `aria-label` / 激活态；
 * - 快捷键：Ctrl/Cmd+B、I、U、K；粘贴统一转纯文本（去外部样式）；
 * - 底部实时显示字数（去空白字符数）；编辑区可纵向调高，聚焦有焦点环。
 *
 * 从 `BlockEditor.tsx` 抽出，供「区块字段（richText）」与「文章正文（articles.body）」
 * 两处复用，避免复制实现。
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  IconBold,
  IconClearFormat,
  IconCodeBlock,
  IconDivider,
  IconImage,
  IconInlineCode,
  IconItalic,
  IconLink,
  IconListBullet,
  IconListNumber,
  IconQuote,
  IconRedo,
  IconStrikethrough,
  IconUnderline,
  IconUndo,
} from '../ui/Icon'
import { Select } from './Select'

export type RichTextFieldProps = {
  /** 编辑容器 id（用于与 <label> 关联） */
  fieldId: string
  /** 当前 HTML 值（受控） */
  value: string
  /** 空态占位文案 */
  placeholder?: string
  /** 内容变化回调（回传 innerHTML 原文） */
  onChange: (value: string) => void
}

/** 插入弹窗类型：链接（文字 + 地址）/ 图片（地址） */
type InsertMode = 'link' | 'image'

/** 段落格式下拉项 */
const PARAGRAPH_OPTIONS = [
  { value: 'p', label: '正文' },
  { value: 'h2', label: '标题 2' },
  { value: 'h3', label: '标题 3' },
] as const

/** 统计字数：去除标签与空白后的字符数（够用即可，不追求精确分词） */
function countChars(html: string): number {
  const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
  return text.replace(/\s/g, '').length
}

/** 工具栏按钮：图标 + 分组样式 + 激活态 + 保留选区的 onMouseDown */
function ToolButton({
  label,
  shortcut,
  isActive,
  onClick,
  children,
}: {
  label: string
  shortcut?: string
  isActive?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`builder-rich__btn${isActive ? ' is-active' : ''}`}
      title={shortcut ? `${label}（${shortcut}）` : label}
      aria-label={label}
      aria-pressed={isActive}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function RichTextField({ fieldId, value, placeholder, onChange }: RichTextFieldProps) {
  const ref = useRef<HTMLDivElement>(null)
  /** 最近一次编辑区内的选区（供段落下拉 / 弹窗恢复，避免聚焦丢失） */
  const savedRange = useRef<Range | null>(null)
  /** 当前激活的行内 / 列表格式（驱动按钮高亮） */
  const [active, setActive] = useState<Record<string, boolean>>({})
  /** 当前段落格式（正文 / h2 / h3） */
  const [block, setBlock] = useState('p')
  /** 字数：直接由受控 `value` 派生（每次输入 / 外部变化都会随之更新），避免额外 state */
  const count = countChars(value)
  /** 插入弹窗状态 */
  const [insert, setInsert] = useState<InsertMode | null>(null)
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  // 外部值变化时同步到编辑区（正在输入——即元素保持聚焦——时不打断光标）
  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.innerHTML !== value) el.innerHTML = value
  }, [value])

  /** 刷新工具栏激活态（仅在编辑区聚焦时读取，避免误报） */
  const syncActive = useCallback(() => {
    const el = ref.current
    if (!el || document.activeElement !== el) return
    const q = (command: string): boolean => {
      try {
        return document.queryCommandState(command)
      } catch {
        return false
      }
    }
    setActive({
      bold: q('bold'),
      italic: q('italic'),
      underline: q('underline'),
      strikeThrough: q('strikeThrough'),
      insertUnorderedList: q('insertUnorderedList'),
      insertOrderedList: q('insertOrderedList'),
    })
    try {
      const fmt = String(document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, '')
      setBlock(fmt === 'h2' || fmt === 'h3' ? fmt : 'p')
    } catch {
      setBlock('p')
    }
  }, [])

  // 记忆编辑区内的选区 + 刷新激活态（仅当编辑区自身聚焦时）
  useEffect(() => {
    const onSelectionChange = () => {
      const el = ref.current
      if (!el) return
      if (document.activeElement === el) {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0 && selection.anchorNode && el.contains(selection.anchorNode)) {
          savedRange.current = selection.getRangeAt(0).cloneRange()
        }
        syncActive()
      }
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [syncActive])

  /** 提交编辑区内容变化：回传 HTML（字数由 value 派生，无需在此更新） */
  const notify = useCallback(() => {
    const el = ref.current
    if (!el) return
    onChange(el.innerHTML)
  }, [onChange])

  /** 执行命令：先聚焦编辑区，执行后回传 */
  const exec = (command: string, arg?: string) => {
    const el = ref.current
    if (!el) return
    el.focus()
    try {
      document.execCommand(command, false, arg)
    } catch {
      // 忽略个别命令不支持的情况
    }
    notify()
    syncActive()
  }

  /** 恢复编辑区选区（段落下拉提交前调用） */
  const restoreSelection = () => {
    const el = ref.current
    if (el) el.focus()
    const selection = window.getSelection()
    if (savedRange.current && selection) {
      selection.removeAllRanges()
      selection.addRange(savedRange.current)
    }
  }

  /**
   * 用 Range 在编辑区插入节点（链接 / 图片 / 行内代码）。
   * 不用 `execCommand('insertHTML')`：其在不同环境（含无头浏览器）可能返回 false；
   * Range 方案确定性强：有选区则替换选中内容，无选区则插入到光标处。
   */
  const insertNodeAtSelection = (node: Node, caretInside = false) => {
    const el = ref.current
    if (el) el.focus()
    const selection = window.getSelection()
    const range = savedRange.current
    if (range && el && el.contains(range.startContainer)) {
      range.deleteContents()
      range.insertNode(node)
    } else if (el) {
      el.appendChild(node)
    }
    if (selection) {
      const caret = document.createRange()
      if (caretInside && node.firstChild) caret.setStart(node.firstChild, (node.firstChild.textContent ?? '').length)
      else caret.setStartAfter(node)
      caret.collapse(true)
      selection.removeAllRanges()
      selection.addRange(caret)
      savedRange.current = caret.cloneRange()
    }
  }

  /** 段落格式（正文 / h2 / h3） */
  const setParagraph = (tag: string) => {
    restoreSelection()
    exec('formatBlock', `<${tag}>`)
  }

  /** 行内代码：用 <code> 包裹选中文本；无选区则插入空代码位并把光标置于其中 */
  const insertInlineCode = () => {
    const text = savedRange.current?.toString() ?? ''
    const code = document.createElement('code')
    code.textContent = text
    insertNodeAtSelection(code, true)
    notify()
    syncActive()
  }

  /** 打开插入弹窗（记录当前选区，供提交时恢复） */
  const openInsert = (mode: InsertMode) => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) savedRange.current = selection.getRangeAt(0).cloneRange()
    if (mode === 'link') setLinkText(selection?.toString() ?? '')
    setLinkUrl('https://')
    setInsert(mode)
  }

  /** 提交插入（链接 / 图片） */
  const applyInsert = () => {
    const url = linkUrl.trim()
    if (!url) {
      setInsert(null)
      return
    }
    if (insert === 'image') {
      const img = document.createElement('img')
      img.setAttribute('src', url)
      img.setAttribute('alt', linkText.trim() || '图片')
      insertNodeAtSelection(img)
    } else {
      const selected = savedRange.current?.toString() ?? ''
      const label = linkText.trim() || selected || url
      const a = document.createElement('a')
      a.setAttribute('href', url)
      if (/^https?:/i.test(url)) {
        a.setAttribute('target', '_blank')
        a.setAttribute('rel', 'noopener noreferrer')
      }
      a.textContent = label
      insertNodeAtSelection(a)
    }
    notify()
    syncActive()
    setInsert(null)
  }

  /** 粘贴：统一转纯文本，去除外部样式 */
  const onPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    const text = event.clipboardData.getData('text/plain')
    if (text) {
      try {
        document.execCommand('insertText', false, text)
      } catch {
        // 忽略
      }
    }
    notify()
  }

  /** 快捷键：Ctrl/Cmd + B / I / U / K */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return
    const key = event.key.toLowerCase()
    if (key === 'b') {
      event.preventDefault()
      exec('bold')
    } else if (key === 'i') {
      event.preventDefault()
      exec('italic')
    } else if (key === 'u') {
      event.preventDefault()
      exec('underline')
    } else if (key === 'k') {
      event.preventDefault()
      openInsert('link')
    }
  }

  const isLinkMode = insert === 'link'

  return (
    <div className="builder-rich">
      <div className="builder-rich__toolbar" role="toolbar" aria-label="富文本工具栏">
        {/* 历史 */}
        <div className="builder-rich__group">
          <ToolButton label="撤销" shortcut="Ctrl+Z" onClick={() => exec('undo')}>
            <IconUndo />
          </ToolButton>
          <ToolButton label="重做" shortcut="Ctrl+Y" onClick={() => exec('redo')}>
            <IconRedo />
          </ToolButton>
        </div>
        <span className="builder-rich__sep" aria-hidden="true" />

        {/* 行内 */}
        <div className="builder-rich__group">
          <ToolButton label="加粗" shortcut="Ctrl+B" isActive={active.bold} onClick={() => exec('bold')}>
            <IconBold />
          </ToolButton>
          <ToolButton label="斜体" shortcut="Ctrl+I" isActive={active.italic} onClick={() => exec('italic')}>
            <IconItalic />
          </ToolButton>
          <ToolButton label="下划线" shortcut="Ctrl+U" isActive={active.underline} onClick={() => exec('underline')}>
            <IconUnderline />
          </ToolButton>
          <ToolButton label="删除线" isActive={active.strikeThrough} onClick={() => exec('strikeThrough')}>
            <IconStrikethrough />
          </ToolButton>
          <ToolButton label="行内代码" onClick={insertInlineCode}>
            <IconInlineCode />
          </ToolButton>
        </div>
        <span className="builder-rich__sep" aria-hidden="true" />

        {/* 段落 */}
        <div className="builder-rich__group">
          <Select
            className="builder-rich__select"
            aria-label="段落格式"
            title="段落格式"
            value={block}
            onChange={setParagraph}
            options={PARAGRAPH_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          />
        </div>
        <span className="builder-rich__sep" aria-hidden="true" />

        {/* 列表 */}
        <div className="builder-rich__group">
          <ToolButton label="无序列表" isActive={active.insertUnorderedList} onClick={() => exec('insertUnorderedList')}>
            <IconListBullet />
          </ToolButton>
          <ToolButton label="有序列表" isActive={active.insertOrderedList} onClick={() => exec('insertOrderedList')}>
            <IconListNumber />
          </ToolButton>
        </div>
        <span className="builder-rich__sep" aria-hidden="true" />

        {/* 块 */}
        <div className="builder-rich__group">
          <ToolButton label="引用" onClick={() => exec('formatBlock', '<blockquote>')}>
            <IconQuote />
          </ToolButton>
          <ToolButton label="代码块" onClick={() => exec('formatBlock', '<pre>')}>
            <IconCodeBlock />
          </ToolButton>
          <ToolButton label="分割线" onClick={() => exec('insertHorizontalRule')}>
            <IconDivider />
          </ToolButton>
        </div>
        <span className="builder-rich__sep" aria-hidden="true" />

        {/* 插入 */}
        <div className="builder-rich__group">
          <ToolButton label="插入链接" shortcut="Ctrl+K" onClick={() => openInsert('link')}>
            <IconLink />
          </ToolButton>
          <ToolButton label="插入图片地址" onClick={() => openInsert('image')}>
            <IconImage />
          </ToolButton>
        </div>
        <span className="builder-rich__sep" aria-hidden="true" />

        {/* 格式 */}
        <div className="builder-rich__group">
          <ToolButton
            label="清除格式"
            onClick={() => {
              exec('removeFormat')
              exec('formatBlock', '<p>')
            }}
          >
            <IconClearFormat />
          </ToolButton>
        </div>
      </div>

      {insert && (
        <div className="builder-rich__popover" role="dialog" aria-label={isLinkMode ? '插入链接' : '插入图片'}>
          {isLinkMode && (
            <input
              className="input builder-rich__popover-input"
              type="text"
              placeholder="显示文字（留空则用地址）"
              aria-label="链接显示文字"
              value={linkText}
              onChange={(event) => setLinkText(event.target.value)}
            />
          )}
          <input
            className="input builder-rich__popover-input"
            type="text"
            placeholder={isLinkMode ? '链接地址（https:// 或 /路径）' : '图片地址（https:// 或 /media/...）'}
            aria-label={isLinkMode ? '链接地址' : '图片地址'}
            value={linkUrl}
            autoFocus
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                applyInsert()
              } else if (event.key === 'Escape') {
                event.preventDefault()
                setInsert(null)
              }
            }}
          />
          <div className="builder-rich__popover-actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setInsert(null)}>
              取消
            </button>
            <button type="button" className="btn btn--primary btn--sm" onClick={applyInsert}>
              插入
            </button>
          </div>
        </div>
      )}

      <div
        ref={ref}
        id={fieldId}
        className="builder-rich__area"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="富文本内容"
        data-placeholder={placeholder ?? '在此输入富文本…'}
        onInput={(event) => {
          onChange((event.target as HTMLDivElement).innerHTML)
        }}
        onKeyUp={syncActive}
        onMouseUp={syncActive}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />

      <div className="builder-rich__foot">
        <span className="builder-rich__count" aria-live="polite">
          字数 {count}
        </span>
      </div>
    </div>
  )
}
