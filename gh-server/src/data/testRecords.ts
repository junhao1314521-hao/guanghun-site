/**
 * 测试记录（后台「测试记录」+ 前台产品详情「测试记录」分区共用）。
 * 自 v? 起纳入结构化集合 `test-records`，后台改动即时反映到产品详情页。
 */

export type TestRecord = {
  id: string
  title: string
  /** 关联型号（与产品 model 对应） */
  product: string
  metric: string
  value: string
  method: string
  status: string
  date: string
  conclusion?: string
}

export const TEST_RECORDS: TestRecord[] = [
  {
    id: 'tr-001',
    title: '54027X1QE-W54 响应时间实测',
    product: '54027X1QE-W54',
    metric: '响应时间',
    value: '0.04 ms',
    method: '高速相机',
    status: '已发布',
    date: '2026-09-25',
    conclusion: '过驱档位「标准」下 GTG 响应稳定在 0.04 ms 以内。',
  },
  {
    id: 'tr-002',
    title: '32X1UE-W16 HDR 峰值亮度实测',
    product: '32X1UE-W16',
    metric: 'HDR 峰值亮度',
    value: '1180 nit',
    method: '亮度计',
    status: '已发布',
    date: '2026-09-20',
    conclusion: '10% 窗口下 HDR 峰值亮度达 1180 nit。',
  },
  {
    id: 'tr-003',
    title: '54027X1QE-W54 色准实测',
    product: '54027X1QE-W54',
    metric: '色准 ΔE',
    value: '1.1',
    method: '色彩分析仪',
    status: '已发布',
    date: '2026-09-22',
    conclusion: '平均 ΔE 1.1，覆盖 sRGB 与 DCI-P3。',
  },
  {
    id: 'tr-004',
    title: '27X1U 亮度均匀度实测',
    product: '27X1U',
    metric: '亮度均匀度',
    value: '92%',
    method: '9 点采样',
    status: '审核中',
    date: '2026-10-01',
    conclusion: '待复核采样数据后发布。',
  },
  {
    id: 'tr-005',
    title: '28027X1QE-W28 峰值亮度实测',
    product: '28027X1QE-W28',
    metric: 'HDR 峰值亮度',
    value: '1050 nit',
    method: '亮度计',
    status: '草稿',
    date: '2026-09-28',
    conclusion: '',
  },
]
