/**
 * 媒体型区块的高度档位工具（R3 全屏视觉 / 海报共用）。
 *
 * 档位口径与海报一致：满屏 / 21:9 宽幅 / 矮一档 / 自定义。
 * 通过 prefix 生成不同区块的类名，避免两套映射逻辑漂移。
 */
import type { CSSProperties } from 'react'

/** 高度档位 → 区块类名（prefix 如 blk-hero / fs-visual） */
export function heightClass(prefix: string, height: unknown): string {
  if (height === 'short') return `${prefix}--h-short`
  if (height === 'r219') return `${prefix}--h-r219`
  if (height === 'custom') return `${prefix}--h-custom`
  return `${prefix}--h-full`
}

/** 自定义高度 → 内联 min-height（其余档位由类名控制） */
export function heightStyle(height: unknown, value: unknown): CSSProperties | undefined {
  if (height !== 'custom') return undefined
  const px = Number(value)
  return { minHeight: `${Number.isFinite(px) && px > 0 ? px : 720}px` }
}
