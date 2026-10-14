/**
 * 服务信息（后台「服务信息」+ 前台服务支持页「服务网点与体验点」共用）。
 * 自 v? 起纳入结构化集合 `service-info`，后台改动即时反映到前台。
 */

export type ServiceSpot = {
  id: string
  name: string
  city: string
  /** 体验点 | 服务网点 */
  type: string
  phone: string
  hours: string
  status: string
  address: string
}

export const SERVICE_SPOTS: ServiceSpot[] = [
  {
    id: 'si-001',
    name: '光魂深圳旗舰体验店',
    city: '深圳',
    type: '体验点',
    phone: '400-000-0000',
    hours: '10:00–21:00',
    status: '营业中',
    address: '南山区科技园光魂大厦 1F',
  },
  {
    id: 'si-002',
    name: '光魂北京授权服务网点',
    city: '北京',
    type: '服务网点',
    phone: '400-000-0001',
    hours: '09:30–18:30',
    status: '营业中',
    address: '海淀区中关村大街 88 号',
  },
  {
    id: 'si-003',
    name: '光魂上海授权服务网点',
    city: '上海',
    type: '服务网点',
    phone: '400-000-0002',
    hours: '09:30–18:30',
    status: '营业中',
    address: '徐汇区漕溪北路 100 号',
  },
  {
    id: 'si-004',
    name: '光魂成都体验点',
    city: '成都',
    type: '体验点',
    phone: '400-000-0003',
    hours: '11:00–20:00',
    status: '暂停',
    address: '高新区天府大道 66 号',
  },
]
