/**
 * 后台图标映射：把 `data/adminResources.ts` 中的图标键解析为站点线性 SVG 图标。
 * 新增栏目只需在配置里写图标键，无需逐个 import 具体组件。
 */
import type { ComponentType } from 'react'
import {
  IconAccount,
  IconBook,
  IconCap,
  IconChat,
  IconClock,
  IconCloud,
  IconCube,
  IconDocSearch,
  IconDownload,
  IconGlobe,
  IconGrid,
  IconKeyboard,
  IconMonitor,
  IconRefresh,
  IconShield,
  IconSliders,
  IconSupport,
  IconTrophy,
  IconVenn,
} from '../ui/Icon'

type IconProps = { size?: number; className?: string }

const MAP: Record<string, ComponentType<IconProps>> = {
  cube: IconCube,
  venn: IconVenn,
  trophy: IconTrophy,
  grid: IconGrid,
  doc: IconDocSearch,
  book: IconBook,
  download: IconDownload,
  cap: IconCap,
  sliders: IconSliders,
  cloud: IconCloud,
  account: IconAccount,
  chat: IconChat,
  keyboard: IconKeyboard,
  support: IconSupport,
  monitor: IconMonitor,
  shield: IconShield,
  globe: IconGlobe,
  clock: IconClock,
  refresh: IconRefresh,
}

export function AdminIcon({ name, size = 18, className }: { name: string } & IconProps) {
  const Cmp = MAP[name] ?? IconGrid
  return <Cmp size={size} className={className} />
}