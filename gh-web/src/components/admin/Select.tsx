/**
 * 后台 · 统一下拉选择（替换原生 <select>）
 * ============================================================
 * 为什么自研：原生 <select> 的弹层由操作系统绘制，样式无法与后台控件统一
 * （高度 / 圆角 / hover / 选中态 / 深浅色），是「传统感」的主要来源。
 *
 * 交互与无障碍（对齐 WAI-ARIA combobox 模式）：
 * - 触发器：role=combobox + aria-expanded / aria-controls / aria-activedescendant；
 * - 弹层：role=listbox；选项 role=option + aria-selected；
 * - 键盘：Enter / Space / ↓ 打开；↑ ↓ 移动；Home / End 首尾；Enter 选中；Esc 关闭并回焦；
 * - 点外部关闭；禁用态不响应；打开时把当前项滚进可视区。
 *
 * 定位：与 OverflowMenu 同策略 —— 就地绝对定位（不 portal），弹层贴着触发器展开。
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { IconChevronDown, IconCheck } from '../ui/Icon'

export type SelectOption = { value: string; label: string; disabled?: boolean }

export function Select({
  value,
  onChange,
  options,
  placeholder,
  id,
  className = '',
  disabled,
  invalid,
  title,
  'aria-label': ariaLabel,
}: {
  /** 当前值（受控） */
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  /** 值为空时的占位文案（对应「请选择」） */
  placeholder?: string
  id?: string
  className?: string
  disabled?: boolean
  /** 校验失败态：触发器描边转危险色（等价 .input--error） */
  invalid?: boolean
  title?: string
  'aria-label'?: string
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const baseId = useId()

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  const close = (focusTrigger = false) => {
    setOpen(false)
    if (focusTrigger) triggerRef.current?.focus()
  }

  const openList = () => {
    if (disabled) return
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  const pick = (index: number) => {
    const option = options[index]
    if (!option || option.disabled) return
    onChange(option.value)
    close(true)
  }

  /** 在可选（未禁用）项之间移动，跳过禁用项 */
  const step = (from: number, delta: number) => {
    if (options.length === 0) return from
    let next = from
    for (let i = 0; i < options.length; i += 1) {
      next = (next + delta + options.length) % options.length
      if (!options[next]?.disabled) return next
    }
    return from
  }

  /* 点外部 / Esc 关闭 */
  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  /* 打开时把当前高亮项滚进可视区 */
  useEffect(() => {
    if (!open) return
    const node = listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(`${baseId}-opt-${activeIndex}`)}`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex, baseId])

  const onKeyDown = (event: KeyboardEvent) => {
    if (disabled) return
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!open) openList()
        else setActiveIndex((index) => step(index, 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!open) openList()
        else setActiveIndex((index) => step(index, -1))
        break
      case 'Home':
        if (!open) return
        event.preventDefault()
        setActiveIndex(options.findIndex((option) => !option.disabled))
        break
      case 'End':
        if (!open) return
        event.preventDefault()
        for (let i = options.length - 1; i >= 0; i -= 1) {
          if (!options[i]?.disabled) {
            setActiveIndex(i)
            break
          }
        }
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (open) pick(activeIndex)
        else openList()
        break
      case 'Escape':
        if (!open) return
        event.preventDefault()
        close(true)
        break
      case 'Tab':
        if (open) close()
        break
      default:
        break
    }
  }

  return (
    <div className={`admin-select${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`} ref={rootRef}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`input admin-select__trigger${invalid ? ' input--error' : ''}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${baseId}-list` : undefined}
        aria-activedescendant={open ? `${baseId}-opt-${activeIndex}` : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        title={title}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
      >
        <span className={`admin-select__value${selected ? '' : ' is-placeholder'}`}>{selected ? selected.label : (placeholder ?? '请选择')}</span>
        <IconChevronDown size={14} className="admin-select__caret" aria-hidden="true" />
      </button>

      {open && (
        <div className="admin-select__list" role="listbox" id={`${baseId}-list`} ref={listRef} tabIndex={-1}>
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              id={`${baseId}-opt-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={`admin-select__option${index === activeIndex ? ' is-active' : ''}`}
              disabled={option.disabled}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => pick(index)}
            >
              <span className="admin-select__option-label">{option.label}</span>
              {option.value === value && <IconCheck size={14} className="admin-select__check" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
