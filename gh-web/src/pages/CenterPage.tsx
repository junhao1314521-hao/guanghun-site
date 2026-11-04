/** 光魂 Center 软件介绍页：全部视觉与交互由代码构建，软件信息取自下载中心真实条目 */
import { useEffect, useState } from 'react'
import { fetchDownloads } from '../api/support-extra'
import { isDownloadable } from '../data/support-extra'
import { CenterConsole } from './center/CenterConsole'
import { CenterHero } from './center/CenterHero'
import {
  CapabilityGrid,
  ChangelogSection,
  DeviceSection,
  DownloadSection,
  FaqSection,
  FeatureBlocks,
  FooterCta,
} from './center/CenterSections'
import { CENTER_FALLBACK } from './center/data'
import type { CenterDownload } from './center/data'
import '../styles/center.css'

// 光魂中心页：拉取下载信息（失败回退默认值），依次渲染首屏、能力、控制台、下载、FAQ 等区块
export function CenterPage() {
  const [download, setDownload] = useState<CenterDownload>(CENTER_FALLBACK)

  useEffect(() => {
    const controller = new AbortController()
    fetchDownloads(controller.signal)
      .then((payload) => {
        const item = payload.items.find((entry) => entry.id === 'center-win')
        if (!item) return
        setDownload({
          version: item.version || CENTER_FALLBACK.version,
          size: item.size || CENTER_FALLBACK.size,
          date: item.date || CENTER_FALLBACK.date,
          os: item.os || item.platform || CENTER_FALLBACK.os,
          url: isDownloadable(item) && item.fileUrl ? item.fileUrl : '/downloads/center-win',
          sha256: CENTER_FALLBACK.sha256,
        })
      })
      .catch(() => {
        // 接口不可用时保留兜底值，页面不出现空态
      })
    return () => controller.abort()
  }, [])

  return (
    <div className="center-page">
      <CenterHero download={download} />
      <CapabilityGrid />
      <CenterConsole />
      <FeatureBlocks />
      <DeviceSection />
      <DownloadSection download={download} />
      <ChangelogSection download={download} />
      <FaqSection />
      <FooterCta download={download} />
    </div>
  )
}
