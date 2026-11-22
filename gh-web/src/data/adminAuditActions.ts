/**
 * 后台审计动作码 → 中文标签
 * ============================================================
 * 真源在服务端 `audit_log.action`（login / create / save-page ...）：存储保持原 code，
 * 只在展示层翻译。操作日志列表与工作台「最近动态」共用本表，避免两处口径不一致。
 */
export const ADMIN_ACTION_LABELS: Record<string, string> = {
  login: '登录',
  create: '新建',
  update: '更新',
  delete: '删除',
  'save-page': '保存页面',
  'save-site': '保存站点配置',
  reset: '重置',
  upload: '上传',
  'save-center-backdrop': '保存售后中心背景',
}

/** 取动作码的中文标签；未登记的码原样返回（新增动作不会显示成空白） */
export function actionLabel(action: string): string {
  return ADMIN_ACTION_LABELS[action] ?? action
}
