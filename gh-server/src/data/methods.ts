/**
 * 测评方法（后台「测评方法」+ 前台天梯榜「测试方法」共用）。
 * 自 v? 起纳入结构化集合 `methods`，后台改动即时反映到前台。
 */

export type TestMethod = {
  id: string
  name: string
  category: string
  version: string
  owner: string
  status: string
  updatedAt: string
  detail?: string
}

export const TEST_METHODS: TestMethod[] = [
  {
    id: 'm-001',
    name: '端到端延迟测试方法',
    category: '延迟',
    version: 'v2.1',
    owner: '林知远',
    status: '已发布',
    updatedAt: '2026-09-01',
    detail: '以示波器同步触发，记录输入到屏幕响应的端到端时延。',
  },
  {
    id: 'm-002',
    name: '无线续航测试方法',
    category: '续航',
    version: 'v1.4',
    owner: '周予安',
    status: '已发布',
    updatedAt: '2026-08-22',
    detail: '统一亮度与回报率条件下，循环任务直至电量耗尽。',
  },
  {
    id: 'm-003',
    name: '重量与手感评估方法',
    category: '手感',
    version: 'v1.2',
    owner: '沈牧',
    status: '已发布',
    updatedAt: '2026-08-10',
    detail: '电子秤称重 + 盲测手感评分。',
  },
  {
    id: 'm-004',
    name: '连接稳定性压力测试',
    category: '稳定性',
    version: 'v1.0',
    owner: '林知远',
    status: '草稿',
    updatedAt: '2026-09-30',
    detail: '多干扰源环境下的丢包与重连统计。',
  },
]
