/** 可操作演示台：左侧真实客户端截图，右侧代码渲染的画面 + 五个调色滑杆 */
import { useState } from 'react'
import { CenterScene } from './CenterScene'
import { CROSSHAIRS, GAMUTS, PRESETS, TABS } from './data'
import type { TabId } from './data'

type Tone = {
  brightness: number
  contrast: number
  saturation: number
  hue: number
  temperature: number
}

const INITIAL_TONE: Tone = { brightness: 62, contrast: 56, saturation: 58, hue: 50, temperature: 45 }

function Slider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (next: number) => void
}) {
  return (
    <label className="cp-slider">
      <span className="cp-slider__head">
        <span>{label}</span>
        <b>{value}</b>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

/** 单选 chip 组：用于预设、色域、准心等真实选项 */
function Chips({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div className="cp-field" role="group" aria-label={label}>
      <span className="cp-field__label">{label}</span>
      <div className="cp-chips">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`cp-chip${value === option ? ' is-on' : ''}`}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

export function CenterLive() {
  const [tab, setTab] = useState<TabId>('gaming')
  const [tone, setTone] = useState<Tone>(INITIAL_TONE)
  const [preset, setPreset] = useState('玩家1')
  const [gamut, setGamut] = useState('DCI-P3')
  const [crosshair, setCrosshair] = useState('关闭')
  const [hdr, setHdr] = useState(true)

  const set = (key: keyof Tone, value: number) => setTone((prev) => ({ ...prev, [key]: value }))
  const active = TABS.find((item) => item.id === tab) ?? TABS[0]
  const reset = () => {
    setTone(INITIAL_TONE)
    setPreset('玩家1')
    setGamut('DCI-P3')
    setCrosshair('关闭')
    setHdr(true)
  }

  return (
    <section className="cp-section cp-live" id="console" aria-labelledby="cp-live-title">
      <div className="cp-wrap">
        <header className="cp-head">
          <h2 id="cp-live-title">调校，不必再猜</h2>
          <p className="cp-lead">左边是真实客户端，右边是显示器输出。拖动滑杆，画面和读数一起变。</p>
        </header>

        <div className="cp-livetune">
          <div className="cp-livetune__ui">
            <div className="cp-livetune__tabs" role="tablist" aria-label="Center 功能导航">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={`cp-livetune__tab${tab === item.id ? ' is-on' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <figure className="cp-livetune__shot">
              <img
                src={`/media/center/app/${tab}.webp`}
                alt={`光魂 Center ${active.label}真实界面`}
                loading="lazy"
                decoding="async"
              />
              <figcaption>真实客户端 · {active.label}</figcaption>
            </figure>
          </div>

          <div className="cp-livetune__panel">
            <div className="cp-preview">
              <CenterScene
                className="cp-preview__canvas"
                brightness={tone.brightness}
                contrast={tone.contrast}
                saturation={tone.saturation}
                hue={tone.hue}
                temperature={tone.temperature}
              />
              {hdr && <span className="cp-preview__tag">HDR</span>}
              {crosshair !== '关闭' && <span className="cp-crosshair" aria-hidden="true" />}
              <span className="cp-preview__caption">{preset} · {gamut} · 3840×2160</span>
            </div>

            <div className="cp-controls">
              <div className="cp-livetune__sliders">
                <Slider label="亮度" value={tone.brightness} onChange={(v) => set('brightness', v)} />
                <Slider label="对比度" value={tone.contrast} onChange={(v) => set('contrast', v)} />
                <Slider label="饱和度" value={tone.saturation} onChange={(v) => set('saturation', v)} />
                <Slider label="色调" value={tone.hue} onChange={(v) => set('hue', v)} />
                <Slider label="色温" value={tone.temperature} onChange={(v) => set('temperature', v)} />
              </div>

              <div className="cp-livetune__chips">
                <Chips label="预设模式" options={PRESETS} value={preset} onChange={setPreset} />
                <Chips label="色域空间" options={GAMUTS} value={gamut} onChange={setGamut} />
                <Chips label="辅助准心" options={CROSSHAIRS} value={crosshair} onChange={setCrosshair} />
              </div>

              <div className="cp-livetune__actions">
                <button type="button" className="cp-toggle" aria-pressed={hdr} onClick={() => setHdr((v) => !v)}>
                  HDR <i className={hdr ? 'is-on' : ''} />
                </button>
                <button type="button" className="cp-reset" onClick={reset}>
                  恢复默认
                </button>
              </div>
            </div>
          </div>
        </div>
        <p className="cp-note">右侧画面为代码实时渲染的功能示意，不代表当前设备状态。</p>
      </div>
    </section>
  )
}
