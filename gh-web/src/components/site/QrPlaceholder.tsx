import { useMemo } from 'react'
import { useI18n } from '../../i18n'

/**
 * 二维码（视觉仿真，非可扫真码）：白底 + 定位角 + 定时图案 + 伪随机模块，
 * 观感接近真实二维码。正式上线可替换为真实码图（同一尺寸 / 留白规范：正方形、四周留白 ≥ 8%）。
 */

/** 由文案生成稳定的随机种子，保证同一 label 每次渲染一致 */
function seedFrom(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** 生成 25×25 的模块矩阵（含 3 个定位角、定时图案、对齐图案、伪随机数据区） */
function buildMatrix(seed: number, size = 25): Array<{ x: number; y: number }> {
  const dark = new Set<string>()
  let s = seed || 1
  const rand = () => {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  // 定位角（7×7）与分隔带
  const finder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        const edge = x === 0 || x === 6 || y === 0 || y === 6
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4
        if (edge || core) dark.add(`${ox + x},${oy + y}`)
      }
    }
  }
  finder(0, 0)
  finder(size - 7, 0)
  finder(0, size - 7)
  // 定时图案（第 6 行 / 第 6 列隔格）
  for (let i = 8; i < size - 8; i += 1) {
    if (i % 2 === 0) {
      dark.add(`${i},6`)
      dark.add(`6,${i}`)
    }
  }
  // 对齐图案（5×5，右下）
  for (let y = 0; y < 5; y += 1) {
    for (let x = 0; x < 5; x += 1) {
      const edge = x === 0 || x === 4 || y === 0 || y === 4
      const core = x === 2 && y === 2
      if (edge || core) dark.add(`${size - 9 + x},${size - 9 + y}`)
    }
  }
  // 数据区（跳过定位角 / 分隔带 / 定时线 / 对齐图）
  const reserved = (x: number, y: number) => {
    const inFinder = (ox: number, oy: number) => x >= ox && x < ox + 8 && y >= oy && y < oy + 8
    if (inFinder(0, 0) || inFinder(size - 8, 0) || inFinder(0, size - 8)) return true
    if (x === 6 || y === 6) return true
    if (x >= size - 9 && x < size - 4 && y >= size - 9 && y < size - 4) return true
    return false
  }
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (reserved(x, y)) continue
      if (rand() > 0.52) dark.add(`${x},${y}`)
    }
  }
  return Array.from(dark).map((key) => {
    const [x, y] = key.split(',').map(Number)
    return { x, y }
  })
}

/** 二维码图（视觉仿真）；颜色固定白底深模块以保证手机端对比度 */
export function QrBox({ label, className }: { label: string; className?: string }) {
  const { t } = useI18n()
  const modules = useMemo(() => buildMatrix(seedFrom(label)), [label])
  return (
    <div className={className ? `qr__box ${className}` : 'qr__box'}>
      <svg viewBox="0 0 25 25" shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={t('footer.qrAria', { label })}>
        <rect width="25" height="25" fill="#FFFFFF" />
        <g fill="#101014">
          {modules.map((m) => (
            <rect key={`${m.x}-${m.y}`} x={m.x} y={m.y} width="1" height="1" />
          ))}
        </g>
      </svg>
    </div>
  )
}

/** 带标签的二维码（页脚「关注我们」用） */
export function QrPlaceholder({ label }: { label: string }) {
  return (
    <div className="qr">
      <QrBox label={label} />
      <span className="qr__label">{label}</span>
    </div>
  )
}
