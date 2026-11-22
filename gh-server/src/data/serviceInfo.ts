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

/**
 * 服务网点 / 体验点集合的**初始值**。
 * 真实门店数据统一由「体验点」集合（旧站 47 个真实门店）承载；
 * 这里不预置地址与电话，避免用编造的门店充数。后台可在「服务信息」中按实际补充。
 */
export const SERVICE_SPOTS: ServiceSpot[] = []
