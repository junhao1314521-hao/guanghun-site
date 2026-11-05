/** Center 页后半段：能力总览 / 功能深读 / 支持设备 / 下载 / 更新日志 / FAQ / 页尾 */
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowIcon, CheckIcon, DownloadIcon, TabIcon } from './Icons'
import { CAPABILITIES, DEVICE_MODELS, FAQS, FEATURES } from './data'
import type { CenterDownload } from './data'
import { observeResize, prefersReducedMotion } from './canvasEnv'

// 能力总览区：渲染六张模块卡片，点击跳到下方控制台对应 Tab
export function CapabilityGrid() {
  return (
    <section className="center-section" id="capability" aria-labelledby="capability-title">
      <div className="center-wrap">
        <header className="center-head">
          <span className="center-eyebrow">01 / 六个模块</span>
          <h2 id="capability-title">六件事，一个窗口做完</h2>
          <p className="center-lead">真实软件里的六个导航，对应六类调校。点任意一张卡，直接跳到下面的控制台。</p>
        </header>

        <div className="center-caps">
          {CAPABILITIES.map((item) => (
            <a key={item.no} className="center-cap" href="#console">
              <span className="center-cap__no">CH {item.no}</span>
              <span className="center-cap__icon">
                <TabIcon id={item.tab} />
              </span>
              <b>{item.title}</b>
              <p>{item.desc}</p>
              <ArrowIcon className="center-cap__arrow" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

// 卖点区：逐条说明产品相较传统调节方式的优势
export function FeatureBlocks() {
  return (
    <section className="center-section center-features" id="features" aria-labelledby="features-title">
      <div className="center-wrap">
        <header className="center-head">
          <span className="center-eyebrow">03 / 为什么用它</span>
          <h2 id="features-title">省掉的不是几步操作，是每次换场景的折腾</h2>
        </header>

        <div className="center-feature-list">
          {FEATURES.map((feature, index) => (
            <article className="center-feature" key={feature.id}>
              <div className="center-feature__copy">
                <span className="center-eyebrow">{feature.eyebrow}</span>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
                <ul>
                  {feature.points.map((point) => (
                    <li key={point}>
                      <CheckIcon className="center-feature__check" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={`center-feature__visual is-${feature.id}`} aria-hidden="true">
                {index === 0 && (
                  <div className="cf-sliders">
                    {[
                      ['亮度', 82, '#60a5fa'],
                      ['对比度', 56, '#38bdf8'],
                      ['饱和度', 68, '#22d3ee'],
                      ['伽马', 44, '#a78bfa'],
                    ].map(([label, value, color]) => (
                      <div className="cf-slider" key={String(label)}>
                        <span>{label}</span>
                        <i style={{ width: `${value}%`, background: String(color) }} />
                        <b>{value}</b>
                      </div>
                    ))}
                  </div>
                )}

                {index === 1 && (
                  <div className="cf-link">
                    <span className="cf-link__app">GAME.EXE</span>
                    <span className="cf-link__line">
                      <i />
                    </span>
                    <span className="cf-link__mode">FPS</span>
                    <span className="cf-link__note">进入前台 · 自动切换</span>
                  </div>
                )}

                {index === 2 && (
                  <div className="cf-firmware">
                    <svg viewBox="0 0 120 120" className="cf-firmware__ring">
                      <circle cx="60" cy="60" r="50" />
                      <circle cx="60" cy="60" r="50" className="is-progress" />
                    </svg>
                    <b>V1.3.3</b>
                    <span>校验通过 · 升级完成</span>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// 支持设备区：介绍可识别且可调节的显示器与面板能力
export function DeviceSection() {
  return (
    <section className="center-section" id="devices" aria-labelledby="devices-title">
      <div className="center-wrap">
        <header className="center-head">
          <span className="center-eyebrow">04 / 支持的设备</span>
          <h2 id="devices-title">连上就能认出来</h2>
          <p className="center-lead">连接后用 DDC/CI 读取型号与能力，按面板实际支持的项目开放调节，不支持的项不会出现在界面里。</p>
        </header>

        <div className="center-devices">
          <div className="center-devices__panel">
            <span className="center-devices__label">SUPPORTED MODELS</span>
            <div className="center-devices__list">
              {DEVICE_MODELS.map((model) => (
                <span key={model} className="center-device">
                  {model}
                  <i>全面支持</i>
                </span>
              ))}
            </div>
            <p className="center-devices__note">更多机型持续适配中。未列出的型号仍可通过通用 DDC/CI 读取基础参数。</p>
          </div>
          <div className="center-devices__hint">
            <span className="center-devices__badge">DDC/CI</span>
            <b>识别不到？</b>
            <p>在显示器 OSD 菜单里开启 DDC/CI，用 DP 或 USB-C 直连，不要经过转接坞，然后回到 Center 点刷新。</p>
            <a href="#faq">
              查看排查步骤
              <ArrowIcon />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// 下载区：展示三步安装流程与当前版本下载入口
export function DownloadSection({ download }: { download: CenterDownload }) {
  return (
    <section className="center-section center-download" id="download" aria-labelledby="download-title">
      <div className="center-wrap">
        <header className="center-head">
          <span className="center-eyebrow">05 / 下载与安装</span>
          <h2 id="download-title">三步开始</h2>
        </header>

        <div className="center-download__grid">
          <div className="center-download__card">
            <span className="center-download__os">{download.os}</span>
            <b className="center-download__version">{download.version}</b>
            <dl>
              <div>
                <dt>安装包大小</dt>
                <dd>{download.size}</dd>
              </div>
              <div>
                <dt>更新日期</dt>
                <dd>{download.date}</dd>
              </div>
              <div>
                <dt>SHA-256</dt>
                <dd className="is-mono">{download.sha256.slice(0, 12)}…{download.sha256.slice(-8)}</dd>
              </div>
            </dl>
            <a className="center-btn center-btn--primary center-btn--wide" href={download.url} download>
              <DownloadIcon className="center-btn__icon" />
              下载 Center {download.version}
            </a>
            <Link className="center-download__more" to="/downloads">
              前往下载中心 · 固件与说明书
              <ArrowIcon />
            </Link>
          </div>

          <ol className="center-steps">
            <li>
              <span>01</span>
              <b>下载并安装</b>
              <p>运行安装包，按提示完成安装，首次启动会自动读取显示器。</p>
            </li>
            <li>
              <span>02</span>
              <b>连接显示器</b>
              <p>用 DP 或 USB-C 直连，确认显示器处于对应输入源。</p>
            </li>
            <li>
              <span>03</span>
              <b>开始调校</b>
              <p>识别到型号后进入对应调校页，参数改动即时写入显示器。</p>
            </li>
          </ol>
        </div>

        <p className="center-download__tip">
          暂不提供 macOS 版本。Windows 10 / 11 需为 64 位系统。
        </p>
      </div>
    </section>
  )
}

// 更新记录区：按版本渲染更新日志时间线
export function ChangelogSection({ download }: { download: CenterDownload }) {
  return (
    <section className="center-section" id="changelog" aria-labelledby="changelog-title">
      <div className="center-wrap">
        <header className="center-head">
          <span className="center-eyebrow">06 / 更新记录</span>
          <h2 id="changelog-title">版本历史</h2>
        </header>

        <div className="center-log">
          <div className="center-log__item">
            <span className="center-log__dot" aria-hidden="true" />
            <div className="center-log__head">
              <b>{download.version}</b>
              <span>{download.date}</span>
              <i>当前版本</i>
            </div>
            <p>配合本页控制台展示的六个功能模块；固件升级链路支持校验与中断重试。</p>
          </div>
        </div>

        <p className="center-log__note">
          更早版本与固件更新请在
          <Link to="/downloads">下载中心</Link>
          查看。
        </p>
      </div>
    </section>
  )
}

// 常见问题区：渲染可展开的安装与使用问答列表
export function FaqSection() {
  return (
    <section className="center-section" id="faq" aria-labelledby="faq-title">
      <div className="center-wrap">
        <header className="center-head">
          <span className="center-eyebrow">07 / 常见问题</span>
          <h2 id="faq-title">安装与使用</h2>
        </header>

        <div className="center-faq">
          {FAQS.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
        <p className="center-faq__more">
          没找到答案？
          <Link to="/inquiry">提交咨询</Link>
          ，工作日会尽快回复。
        </p>
      </div>
    </section>
  )
}

/** 页尾：深空星场收尾（方案 A 的元素只留在这里） */
function StarCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let ctx: CanvasRenderingContext2D | null = null
    try {
      ctx = canvas.getContext('2d')
    } catch {
      return
    }
    if (!ctx) return
    const reduce = prefersReducedMotion()
    let raf = 0
    let width = 0
    let height = 0
    let stars: { x: number; y: number; r: number; a: number; v: number }[] = []

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      stars = Array.from({ length: 120 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.4 + 0.3,
        a: Math.random() * 0.6 + 0.2,
        v: Math.random() * 0.12 + 0.03,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      for (const star of stars) {
        if (!reduce) star.y = star.y > height ? 0 : star.y + star.v
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(180, 220, 255, ${star.a})`
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }

    const stopResize = observeResize(canvas, resize)
    draw()
    return () => {
      cancelAnimationFrame(raf)
      stopResize()
    }
  }, [])

  return <canvas ref={ref} className="center-cta__stars" aria-hidden="true" />
}

// 页尾行动区：星空背景 + 当前版本信息与下载按钮
export function FooterCta({ download }: { download: CenterDownload }) {
  return (
    <section className="center-cta" aria-labelledby="cta-title">
      <StarCanvas />
      <div className="center-cta__glow" aria-hidden="true" />
      <div className="center-wrap center-cta__inner">
        <span className="center-eyebrow">READY TO TUNE</span>
        <h2 id="cta-title">现在下载，五分钟调完</h2>
        <p>{download.version} · {download.size} · {download.os}</p>
        <a className="center-btn center-btn--primary" href={download.url} download>
          <DownloadIcon className="center-btn__icon" />
          下载 Windows 版
        </a>
      </div>
    </section>
  )
}
