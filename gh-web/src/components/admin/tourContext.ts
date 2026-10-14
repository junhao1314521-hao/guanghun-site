/**
 * 后台新手引导 · 上下文与纯逻辑（不含 JSX）
 * ============================================================
 * 单独成文件：让 AdminTour.tsx 只导出组件，满足 Fast Refresh 约束（对齐 ./feedback 的拆分）。
 * 使用方从本模块 import useAdminTour / STEPS / 已看过标记等。
 */
import { createContext, useContext } from 'react'

/** 已看过标记（localStorage 键） */
export const ADMIN_TOUR_DONE_KEY = 'gh-admin-tour-done'

/**
 * 一步引导：`target` 为 CSS 选择器，命中即高亮；未命中则居中展示卡片。
 * `to` 为该步对应的后台路由，卡片上会出现「打开该栏目」按钮，点一下直接过去（真的能按着做）。
 */
export type TourStep = { target: string; title: string; desc: string; to?: string }

/** 引导步骤：按「照着做一遍就能上手」的顺序编排，只保留真正用得上的 6 步。 */
export const STEPS: TourStep[] = [
  {
    target: '[data-tour="nav"]',
    title: '① 先认识左侧导航',
    desc: '后台栏目都在左侧，按「产品与评测 / 内容与资源 / 网站与装修 / 客户与服务 / 商业合作 / 系统设置」分组。点分组标题可折叠，栏目太多时用顶部搜索框按名字找。',
  },
  {
    target: '[data-tour="pages"]',
    title: '② 改页面文案与排版',
    desc: '点「页面列表」→ 选一个页面 →「编辑」，进入可视化装修器：拖拽调整区块顺序，点区块就能改标题与文案，「保存」即生效。日常改文案主要用这里。',
    to: '/admin/pages',
  },
  {
    target: '[data-tour="products"]',
    title: '③ 维护产品与参数',
    desc: '点「产品列表」→「新建」填写型号、分类与参数（刷新率 / 响应时间 / 接口等），或点行内「编辑」改价格与库存状态。产品会即时出现在前台列表与详情页。',
    to: '/admin/products',
  },
  {
    target: '[data-tour="assets"]',
    title: '④ 上传图片与文件',
    desc: '点「素材库」→「上传」图片或 PDF，上传后点素材可复制公开地址，用于装修器配图、产品图或文章封面。',
    to: '/admin/assets',
  },
  {
    target: '[data-tour="publish"]',
    title: '⑤ 发布与版本回滚',
    desc: '改完内容后到「预览与发布」查看发布记录；如改错，可按版本一键回滚（发布 / 备份为管理员权限）。',
    to: '/admin/publish',
  },
  {
    target: '[data-tour="styles"]',
    title: '⑥ 站点样式与模板',
    desc: '「样式」调整站点级主色 / 圆角 / 字体（前台即时生效）；「模板」把一套区块存成快照，复用到其他页面。想再看一遍，点右上角「?」。',
    to: '/admin/styles',
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
