/** Center 页面内联图标：全部为代码绘制的 24×24 线性图标，不依赖图标库 */
import type { TabId } from './data'

type IconProps = { className?: string }

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

// 按 Tab id 渲染对应的线性图标
export function TabIcon({ id, className }: IconProps & { id: TabId }) {
  const props = { ...base, className }
  switch (id) {
    case 'basic':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 21h8M12 17v4" />
          <path d="M7 9h5M7 12.5h10" />
        </svg>
      )
    case 'gaming':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="7.5" />
          <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'pro':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 3.5v17M3.5 12h17" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    case 'image':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.6" />
          <path d="M21 15l-4.5-4.5L6 20" />
        </svg>
      )
    case 'input':
      return (
        <svg {...props}>
          <rect x="3" y="7" width="18" height="10" rx="2" />
          <path d="M8 7V4h8v3M8 12h2M13 12h3" />
        </svg>
      )
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.11a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.11A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.96 4.6 1.7 1.7 0 0 0 10 3.04V3a2 2 0 1 1 4 0v.11a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8.9c.14.63.65 1.1 1.29 1.13H21a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.49 1z" />
        </svg>
      )
  }
}

// 下载箭头图标
export function DownloadIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  )
}

// 向右箭头图标
export function ArrowIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  )
}

// 对勾图标
export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  )
}
