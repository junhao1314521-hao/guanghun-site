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
    name: '响应时间测试方法',
    category: '响应',
    version: 'v2.1',
    owner: '林知远',
    status: '已发布',
    updatedAt: '2026-09-25',
    detail: '以高速相机同步触发，记录灰阶到灰阶（GTG）的响应时延。',
  },
  {
    id: 'm-002',
    name: '亮度均匀性测试方法',
    category: '亮度',
    version: 'v1.4',
    owner: '周予安',
    status: '已发布',
    updatedAt: '2026-08-22',
    detail: '在统一亮度与色温下，按 9 点采样评估亮度均匀性。',
  },
  {
    id: 'm-003',
    name: '色准测试方法',
    category: '色准',
    version: 'v1.2',
    owner: '沈牧',
    status: '已发布',
    updatedAt: '2026-08-10',
    detail: '色彩分析仪测量 ΔE，覆盖 sRGB 与 DCI-P3 色域。',
  },
  {
    id: 'm-004',
    name: 'HDR 峰值亮度测试方法',
    category: '亮度',
    version: 'v1.0',
    owner: '林知远',
    status: '草稿',
    updatedAt: '2026-09-30',
    detail: '按 10% 窗口测量 HDR 峰值亮度与持续亮度。',
  },
]
