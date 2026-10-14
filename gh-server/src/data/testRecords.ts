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
    title: 'GH-M900 PRO 端到端延迟实测',
    product: 'GH-M900 PRO',
    metric: '端到端延迟',
    value: '0.6 ms',
    method: '示波器采样',
    status: '已发布',
    date: '2026-09-12',
    conclusion: '在 2.4G 模式下端到端延迟稳定在 0.6 ms 以内。',
  },
  {
    id: 'tr-002',
    title: 'GH-K870 蓝牙续航实测',
    product: 'GH-K870',
    metric: '续航',
    value: '78 h',
    method: '综合评估',
    status: '已发布',
    date: '2026-09-09',
    conclusion: '关闭背光、蓝牙模式下续航达 78 小时。',
  },
  {
    id: 'tr-003',
    title: 'GH-M900 PRO 重量实测',
    product: 'GH-M900 PRO',
    metric: '重量',
    value: '58 g',
    method: '电子秤',
    status: '已发布',
    date: '2026-09-12',
    conclusion: '不含线材净重 58 g。',
  },
  {
    id: 'tr-004',
    title: 'GH-M900 PRO 8K 回报率延迟',
    product: 'GH-M900 PRO',
    metric: '回报率',
    value: '0.29 ms',
    method: '高速相机',
    status: '审核中',
    date: '2026-10-01',
    conclusion: '待复核采样数据后发布。',
  },
  {
    id: 'tr-005',
    title: 'GH-H500 佩戴重量',
    product: 'GH-H500',
    metric: '重量',
    value: '268 g',
    method: '电子秤',
    status: '草稿',
    date: '2026-09-28',
    conclusion: '',
  },
]
