import { PageView } from '../blocks/PageView'
import '../styles/support.css'

/**
 * 服务与支持：整页由内容库 `support` 驱动。
 * 页头（标题 / 搜索 / 热门词 / 登录引导）已改为 `supportHero` 区块，
 * 设备选择、任务卡、下载、FAQ、咨询均可由后台装修器维护。
 */
export function SupportPage() {
  return <PageView pageKey="support" hideSeoTitle />
}
