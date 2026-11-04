/** 首屏：信号矩阵 + 像素放大镜（方案 C 为主，吸收 B 的硬件质感） */
import { useRef, useState } from 'react'
import { ArrowIcon, DownloadIcon } from './Icons'
import { CenterHorizon } from './CenterHorizon'
import { WaveCanvas } from './WaveCanvas'
import type { CenterDownload } from './data'

// 首屏 Hero：渲染标题与下载入口，并实现跟随指针的镜头与亮度对比度预览
export function CenterHero({ download }: { download: CenterDownload }) {
  const heroRef = useRef<HTMLElement>(null)
  const lensRef = useRef<HTMLDivElement>(null)
  const [brightness, setBrightness] = useState(80)
  const [contrast, setContrast] = useState(50)

  const handlePointer = (event: React.PointerEvent<HTMLElement>) => {
    const lens = lensRef.current
    const hero = heroRef.current
    if (!lens || !hero || event.pointerType === 'touch') return
    const rect = hero.getBoundingClientRect()
    lens.style.setProperty('--lens-x', `${event.clientX - rect.left}px`)
    lens.style.setProperty('--lens-y', `${event.clientY - rect.top}px`)
    lens.style.setProperty('--lens-opacity', '1')
  }

  return (
    <section
      className="center-hero"
      ref={heroRef}
      onPointerMove={handlePointer}
      onPointerLeave={() => lensRef.current?.style.setProperty('--lens-opacity', '0')}
      aria-labelledby="center-hero-title"
    >
      <div className="center-hero__grid" aria-hidden="true" />
      <CenterHorizon className="center-hero__horizon" />
      <WaveCanvas className="center-hero__wave" level={brightness / 100} frequency={0.42} />
      <div className="center-hero__lens" ref={lensRef} aria-hidden="true">
        <span />
      </div>

      <div className="center-wrap center-hero__inner">
        <div className="center-hero__copy">
          <span className="center-eyebrow">SVDC CENTER · 显示器控制中心</span>
          <h1 id="center-hero-title">
            把显示器的控制权
            <br />
            交还给你
          </h1>
          <p className="center-hero__lead">
            亮度、色彩、刷新率、固件，一个窗口全部接管。
            <br />
            不用再摸显示器背后的按键。
          </p>

          <div className="center-hero__meta">
            <span>Windows 10 / 11</span>
            <span>{download.version}</span>
            <span>{download.size}</span>
            <span>{download.date}</span>
          </div>

          <div className="center-hero__actions">
            <a className="center-btn center-btn--primary" href={download.url} download>
              <DownloadIcon className="center-btn__icon" />
              下载 Windows 版
            </a>
            <a className="center-btn center-btn--ghost" href="#console">
              先在网页里试
              <ArrowIcon className="center-btn__icon" />
            </a>
          </div>

          <dl className="center-hero__stats">
            <div>
              <dt>功能模块</dt>
              <dd>6</dd>
            </div>
            <div>
              <dt>预设模式</dt>
              <dd>8</dd>
            </div>
            <div>
              <dt>固件升级</dt>
              <dd>OTA</dd>
            </div>
          </dl>
        </div>

        <div className="center-hero__panel">
          <header className="center-panel__head">
            <span className="center-panel__dot" aria-hidden="true" />
            <b>SVDC CENTER</b>
            <span>{download.version} · CONNECTED</span>
          </header>

          <div className="center-panel__readings">
            <div>
              <em>RESOLUTION</em>
              <b>3840×2160</b>
            </div>
            <div>
              <em>REFRESH</em>
              <b>
                165<i>HZ</i>
              </b>
            </div>
            <div>
              <em>COLOR</em>
              <b>
                10<i>BIT</i>
              </b>
            </div>
          </div>

          <WaveCanvas className="center-panel__wave" level={brightness / 100} frequency={0.6} />

          <div className="center-panel__sliders">
            <label className="center-panel__slider">
              <span>
                亮度 <b>{brightness}</b>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={brightness}
                aria-label="演示亮度"
                onChange={(event) => setBrightness(Number(event.target.value))}
              />
            </label>
            <label className="center-panel__slider">
              <span>
                对比度 <b>{contrast}</b>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={contrast}
                aria-label="演示对比度"
                onChange={(event) => setContrast(Number(event.target.value))}
              />
            </label>
          </div>

          <footer className="center-panel__foot">
            <span>
              <i className="is-on" /> HDR 开启
            </span>
            <span>
              <i className="is-on" /> VRR 开启
            </span>
            <span>DP 2.1 · 39.2 Gbps</span>
          </footer>
        </div>
      </div>

      <a className="center-hero__scroll" href="#capability" aria-label="向下浏览">
        <span />
        SCROLL
      </a>
    </section>
  )
}
