/** 首屏：弧形穹顶 + 真实 Center 界面 + 滚动镜头归正（方案 A） */
import { useRef } from 'react'
import { CenterDome } from './CenterDome'
import { SlotNumber } from './SlotNumber'
import { useScrollProgress } from './useScrollProgress'
import { ArrowIcon, DownloadIcon } from './Icons'
import type { CenterDownload } from './data'

export function CenterHero({ download }: { download: CenterDownload }) {
  const heroRef = useRef<HTMLElement>(null)
  useScrollProgress(heroRef)

  return (
    <section className="cp-hero" ref={heroRef} aria-labelledby="cp-hero-title">
      <CenterDome className="cp-hero__dome" />
      <div className="cp-wrap cp-hero__inner">
        <div className="cp-hero__copy">
          <span className="cp-eyebrow">CENTER 1.3 · 显示控制中心</span>
          <h1 id="cp-hero-title">
            全新升级 <span>Center</span>
          </h1>
          <p className="cp-hero__lead">把亮度、色彩、刷新率和固件，收进一个窗口。</p>

          <div className="cp-hero__meta">
            <span>Windows 10 / 11</span>
            <span>{download.version}</span>
            <span>{download.size}</span>
            <span>{download.date}</span>
          </div>

          <div className="cp-hero__actions">
            <a className="cp-btn cp-btn--primary" href={download.url} download>
              <DownloadIcon className="cp-btn__icon" />
              下载 Windows 版
            </a>
            <a className="cp-link-arrow" href="#changelog">
              查看更新记录
              <ArrowIcon />
            </a>
          </div>

          <dl className="cp-hero__stats">
            <div>
              <dt>功能模块</dt>
              <dd>
                <SlotNumber value="6" />
              </dd>
            </div>
            <div>
              <dt>预设模式</dt>
              <dd>
                <SlotNumber value="8" />
              </dd>
            </div>
            <div>
              <dt>可调参数</dt>
              <dd>
                <SlotNumber value="40+" />
              </dd>
            </div>
          </dl>
        </div>

        <div className="cp-hero__stage" aria-hidden="true">
          <div className="cp-window">
            <img src="/media/center/app/basic.webp" alt="" loading="eager" decoding="async" />
            <span className="cp-window__glare" />
          </div>
          <div className="cp-float">
            <span>应用联动</span>
            <b>GAME.EXE</b>
            <i>→ FPS</i>
          </div>
        </div>
      </div>
    </section>
  )
}
