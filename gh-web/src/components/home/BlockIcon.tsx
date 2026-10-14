import type { ReactNode } from 'react'
import {
  IconBook,
  IconCap,
  IconChat,
  IconChip,
  IconClock,
  IconCloud,
  IconCube,
  IconDownload,
  IconGrid,
  IconHelp,
  IconMonitor,
  IconRefresh,
  IconShield,
  IconSliders,
  IconTrophy,
} from '../ui/Icon'

/**
 * 区块标题图标：名称 → 线性图标。
 * 名称与后台装修器「标题图标」下拉选项一致（见 gh-server/src/data/blockCatalog.ts 的 TITLE_ICONS）。
 * 未匹配名称时返回 null（不渲染），保证缺省不破坏排版。
 */
const ICONS: Record<string, (props: { size?: number }) => ReactNode> = {
  monitor: IconMonitor,
  trophy: IconTrophy,
  chip: IconChip,
  shield: IconShield,
  clock: IconClock,
  grid: IconGrid,
  sliders: IconSliders,
  refresh: IconRefresh,
  cloud: IconCloud,
  book: IconBook,
  download: IconDownload,
  help: IconHelp,
  chat: IconChat,
  cap: IconCap,
  cube: IconCube,
}

/** 标题图标可用名称（供后台下拉复用） */
export const BLOCK_ICON_NAMES = Object.keys(ICONS)

export function BlockIcon({ name, size = 18 }: { name?: string; size?: number }) {
  if (!name) return null
  const Comp = ICONS[name]
  if (!Comp) return null
  return <Comp size={size} />
}
