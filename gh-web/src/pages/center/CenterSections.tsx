/** Center 页后半段：六模块 / 界面拆层 / 功能深读 / 设备 / 下载 / 更新 / FAQ / 页尾 */
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowIcon, CheckIcon, DownloadIcon, TabIcon } from './Icons'
import { CAPABILITIES, DEVICE_MODELS, FAQS, FEATURES } from './data'
import type { CenterDownload } from './data'
import { useScrollProgress } from './useScrollProgress'

/** 六个模块：静态网格，点击跳到演示台；不做花哨动效，保持节奏安静 */
export function CenterModules() {
  return (
    <section className="cp-section cp-modules" id="modules" aria-labelledby="cp-modules-title">
      <div className="cp-wrap">
        <header className="cp-head">
          <h2 id="cp-modules-title">一块屏，六种掌控</h2>
        </header>
        <div className="cp-modules__grid">
          {CAPABILITIES.map((item) => (
            <a key={item.no} className="cp-module" href="#console">
              <span className="cp-module__no">{item.no}</span>
              <TabIcon id={item.tab} />
              <b>{item.title}</b>
              <p>{item.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

/** 界面拆层：真实窗口做轻微 3D 镜头，三处标注随滚动依次出现 */
export function CenterLayers() {
  const ref = useRef<HTMLElement>(null)
  useScrollProgress(ref)

  return (
    <section className="cp-layers" ref={ref} aria-labelledby="cp-layers-title">
      <div className="cp-layers__sticky">
        <div className="cp-layers__copy">
          <h2 id="cp-layers-title">不用重新学一遍</h2>
          <p>六个导航、一组状态读数、一整套调校项。截图来自真实客户端，不是重画的示意图。</p>
        </div>

        <div className="cp-layers__stage">
          <div className="cp-layers__frame">
            <img src="/media/center/app/basic.webp" alt="光魂 Center 基本功能界面" loading="lazy" decoding="async" />
            <span className="cp-callout cp-callout--side" aria-hidden="true">六个导航，一屏直达</span>
            <span className="cp-callout cp-callout--main" aria-hidden="true">参数改动，即时写入</span>
            <span className="cp-callout cp-callout--status" aria-hidden="true">状态栏同步读数</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/** 功能深读：应用联动 / 固件升级；配真实界面截图，避免插画感 */
export function CenterFeatures() {
  return (
    <section className="cp-section cp-features" id="features" aria-labelledby="cp-features-title">
      <div className="cp-wrap">
        <header className="cp-head">
          <h2 id="cp-features-title">设一次，之后不用管</h2>
        </header>

        <div className="cp-feature-list">
          {FEATURES.map((feature, index) => (
            <article className="cp-feature" key={feature.id}>
              <div className="cp-feature__copy">
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
                <ul>
                  {feature.points.map((point) => (
                    <li key={point}>
                      <CheckIcon />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="cp-feature__visual">
                {index === 0 && (
                  <div className="cp-linkflow">
                    <span className="cp-linkflow__app">GAME.EXE</span>
                    <span className="cp-linkflow__line"><i /></span>
                    <span className="cp-linkflow__mode">FPS</span>
                    <em>进入前台 · 自动切换</em>
                  </div>
                )}
                {index === 1 && (
                  <div className="cp-firmware">
                    <svg viewBox="0 0 120 120" aria-hidden="true">
                      <circle cx="60" cy="60" r="50" />
                      <circle cx="60" cy="60" r="50" className="is-progress" />
                    </svg>
                    <b>V1.3.3</b>
                    <span>校验通过 · 升级完成</span>
                  </div>
                )}
                {index === 2 && (
                  <img className="cp-feature__shot" src="/media/center/app/system.webp" alt="Center 系统设置界面" loading="lazy" />
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/** 支持设备 */
export function CenterDevices() {
  return (
    <section className="cp-section" id="devices" aria-labelledby="cp-devices-title">
      <div className="cp-wrap">
        <header className="cp-head">
          <h2 id="cp-devices-title">连上就能认出来</h2>
          <p className="cp-lead">用 DDC/CI 读取型号与面板能力，只显示这台显示器真正支持的调节项。</p>
        </header>
        <div className="cp-devices">
          <div className="cp-devices__panel">
            <span className="cp-devices__label">SUPPORTED MODELS</span>
            <div className="cp-devices__list">
              {DEVICE_MODELS.map((model) => (
                <span key={model} className="cp-device">
                  {model}
                  <i>全面支持</i>
                </span>
              ))}
            </div>
            <p>更多机型持续适配中。未列出的型号仍可读取基础参数。</p>
          </div>
          <div className="cp-devices__hint">
            <span className="cp-devices__badge">DDC/CI</span>
            <b>识别不到？</b>
            <p>在显示器 OSD 里开启 DDC/CI，用 DP 或 USB-C 直连，不要经过转接坞，再回到 Center 刷新。</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/** 下载与安装 */
export function CenterDownload({ download }: { download: CenterDownload }) {
  return (
    <section className="cp-section cp-download" id="download" aria-labelledby="cp-download-title">
      <div className="cp-wrap">
        <header className="cp-head">
          <h2 id="cp-download-title">三步开始</h2>
        </header>
        <div className="cp-download__grid">
          <div className="cp-download__card">
            <span className="cp-download__os">{download.os}</span>
            <b className="cp-download__version">{download.version}</b>
            <dl>
              <div><dt>安装包大小</dt><dd>{download.size}</dd></div>
              <div><dt>更新日期</dt><dd>{download.date}</dd></div>
              <div>
                <dt>SHA-256</dt>
                <dd className="is-mono">{download.sha256.slice(0, 12)}…{download.sha256.slice(-8)}</dd>
              </div>
            </dl>
            <a className="cp-btn cp-btn--primary cp-btn--wide" href={download.url} download>
              <DownloadIcon className="cp-btn__icon" />
              下载 Center {download.version}
            </a>
            <Link className="cp-more" to="/downloads">
              前往下载中心 · 固件与说明书
              <ArrowIcon />
            </Link>
          </div>

          <ol className="cp-steps">
            <li><span>01</span><b>下载并安装</b><p>运行安装包，按提示完成安装。</p></li>
            <li><span>02</span><b>连接显示器</b><p>用 DP 或 USB-C 直连，确认输入源。</p></li>
            <li><span>03</span><b>开始调校</b><p>识别到型号后，参数改动即时写入。</p></li>
          </ol>
        </div>
        <p className="cp-note">暂不提供 macOS 版本。Windows 10 / 11 需为 64 位系统。</p>
      </div>
    </section>
  )
}

/** 更新记录 */
export function CenterChangelog({ download }: { download: CenterDownload }) {
  return (
    <section className="cp-section" id="changelog" aria-labelledby="cp-changelog-title">
      <div className="cp-wrap">
        <header className="cp-head">
          <h2 id="cp-changelog-title">版本历史</h2>
        </header>
        <div className="cp-log">
          <span className="cp-log__dot" aria-hidden="true" />
          <div>
            <div className="cp-log__head">
              <b>{download.version}</b>
              <span>{download.date}</span>
              <i>当前版本</i>
            </div>
            <p>与演示台一致的六个功能模块；固件升级支持校验与中断重试。</p>
          </div>
        </div>
        <p className="cp-note">更早版本与固件更新请在<Link to="/downloads">下载中心</Link>查看。</p>
      </div>
    </section>
  )
}

/** 常见问题 */
export function CenterFaq() {
  return (
    <section className="cp-section" id="faq" aria-labelledby="cp-faq-title">
      <div className="cp-wrap">
        <header className="cp-head">
          <h2 id="cp-faq-title">安装与使用</h2>
        </header>
        <div className="cp-faq">
          {FAQS.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/** 页尾：穹顶余光 + 下载 */
export function CenterFooter({ download }: { download: CenterDownload }) {
  return (
    <section className="cp-cta" aria-labelledby="cp-cta-title">
      <div className="cp-cta__glow" aria-hidden="true" />
      <div className="cp-wrap cp-cta__inner">

        <h2 id="cp-cta-title">现在，开始调校。</h2>
        <p>{download.version} · {download.size} · {download.os}</p>
        <a className="cp-btn cp-btn--primary" href={download.url} download>
          <DownloadIcon className="cp-btn__icon" />
          下载 Windows 版
        </a>
      </div>
    </section>
  )
}
