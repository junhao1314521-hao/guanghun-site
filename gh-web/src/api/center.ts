/** 接口层 · Center 软件页资源：页面通过本模块取数，不直接 import data/center */
import { transport } from './client'
import {
  CAPABILITIES,
  CENTER_FAQS,
  CENTER_VERSION,
  CHANGELOG,
  DEVICE_SUPPORT,
  DOWNLOADS,
  FEATURES,
  INSTALL_STEPS,
  REQUIREMENTS,
} from '../data/center'

export type CenterPayload = {
  CENTER_VERSION: typeof CENTER_VERSION
  CAPABILITIES: typeof CAPABILITIES
  FEATURES: typeof FEATURES
  DEVICE_SUPPORT: typeof DEVICE_SUPPORT
  DOWNLOADS: typeof DOWNLOADS
  INSTALL_STEPS: typeof INSTALL_STEPS
  REQUIREMENTS: typeof REQUIREMENTS
  CHANGELOG: typeof CHANGELOG
  CENTER_FAQS: typeof CENTER_FAQS
}

/** Center 页数据：一次返回版本、能力、功能、设备支持、下载、安装、日志与 FAQ 等全部区块 */
export function fetchCenter(signal?: AbortSignal): Promise<CenterPayload> {
  return transport({ path: '/api/center', signal }, () => ({
    CENTER_VERSION,
    CAPABILITIES,
    FEATURES,
    DEVICE_SUPPORT,
    DOWNLOADS,
    INSTALL_STEPS,
    REQUIREMENTS,
    CHANGELOG,
    CENTER_FAQS,
  }))
}