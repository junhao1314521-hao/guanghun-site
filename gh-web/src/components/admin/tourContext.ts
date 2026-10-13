/**
 * 后台新手引导 · 上下文与纯逻辑（不含 JSX）
 * ============================================================
 * 单独成文件：让 AdminTour.tsx 只导出组件，满足 Fast Refresh 约束（对齐 ./feedback 的拆分）。
 * 使用方从本模块 import useAdminTour / STEPS / 已看过标记等。
 */
import { createContext, useContext } from 'react'

/** 已看过标记（localStorage 键） */
export const ADMIN_TOUR_DONE_KEY = 'gh-admin-tour-done'

/** 一步引导：`target` 为 CSS 选择器，命中即高亮；未命中则居中展示卡片 */
export type TourStep = { target: string; title: string; desc: string }

/** 引导步骤（高亮侧栏导航 / 页面列表与装修器 / 素材库 / 发布与权限 / 样式与模板） */
export const STEPS: TourStep[] = [
  {
    target: '[data-tour="nav"]',
    title: '后台导航',
    desc: '左侧是后台栏目导航，按「产品 / 内容 / 装修 / 服务 / 系统」等分组展示，可搜索、可折叠；点击进入对应管理页。',
  },
  {
    target: '[data-tour="pages"]',
    title: '页面列表与装修器',
    desc: '进入「页面列表」打开可视化装修器：拖拽区块排序、编辑文案与素材、启用/停用区块，并实时预览保存。',
  },
  {
    target: '[data-tour="assets"]',
    title: '素材库',
    desc: '「素材库」集中管理上传的图片与文件：按文件夹与分类整理，点击可复制公开地址或删除不再使用的素材。',
  },
  {
    target: '[data-tour="publish"]',
    title: '发布与权限',
    desc: '「预览与发布」查看发布记录、按版本回滚内容；「角色与权限」查看角色与栏目权限对照表（发布/备份/系统设置仅管理员可用）。',
  },
  {
    target: '[data-tour="styles"]',
    title: '样式与模板',
    desc: '「样式」编辑站点级设计令牌（主色 / 圆角 / 字体等，前台即时生效）；「模板」保存可复用的页面区块快照。',
  },
]

/** 卡片宽度（定位用） */
export const TOUR_CARD_WIDTH = 320

/** 读取「已看过」标记（隐私模式等读取失败回退 false） */
export function readTourDone(): boolean {
  try {
    return window.localStorage.getItem(ADMIN_TOUR_DONE_KEY) === '1'
  } catch {
    return false
  }
}

/** 写入「已看过」标记（隐私模式等写入失败静默忽略） */
export function markTourDone(): void {
  try {
    window.localStorage.setItem(ADMIN_TOUR_DONE_KEY, '1')
  } catch {
    // 忽略隐私模式等写入失败
  }
}

export type AdminTourValue = { start: () => void }

export const AdminTourContext = createContext<AdminTourValue | null>(null)

export function useAdminTour(): AdminTourValue {
  const value = useContext(AdminTourContext)
  if (!value) throw new Error('useAdminTour 必须在 AdminTourProvider 内使用')
  return value
}
