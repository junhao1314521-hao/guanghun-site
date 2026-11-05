/** 可操作演示台：真实界面结构 + 纯 WebGL 雨夜画面，五个调色滑杆实时改变画面 */
import { useState } from 'react'
import { CenterScene } from './CenterScene'
import { TabIcon } from './Icons'
import { CROSSHAIRS, GAMUTS, LIGHTING, PRESETS, SOURCES, TABS } from './data'
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
  const [tab, setTab] = useState<TabId>('pro')
  const [tone, setTone] = useState<Tone>(INITIAL_TONE)
  const [preset, setPreset] = useState('玩家1')
  const [gamut, setGamut] = useState('DCI-P3')
  const [crosshair, setCrosshair] = useState('关闭')
  const [source, setSource] = useState('DP')
  const [lighting, setLighting] = useState('呼吸')
  const [hdr, setHdr] = useState(true)

  const set = (key: keyof Tone, value: number) => setTone((prev) => ({ ...prev, [key]: value }))
  const reset = () => {
    setTone(INITIAL_TONE)
    setPreset('玩家1')
    setGamut('DCI-P3')
    setCrosshair('关闭')
    setSource('DP')
    setLighting('呼吸')
    setHdr(true)
  }

  return (
    <section className="cp-section cp-live" id="console" aria-labelledby="cp-live-title">
      <div className="cp-wrap">
        <header className="cp-head">
          <span className="cp-eyebrow">02 / 亲手调一次</span>
          <h2 id="cp-live-title">调校，不必再猜</h2>
          <p className="cp-lead">拖动下面任意一根滑杆，画面、读数和状态栏会同时变化。</p>
        </header>

        <div className="cp-console">
          <div className="cp-console__bar">
            <span className="cp-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <b>光魂 Center</b>
            <span>V1.3.3 · 27X1QE-500</span>
            <em className="cp-live-dot">LIVE</em>
          </div>

          <div className="cp-console__body">
            <nav className="cp-side" role="tablist" aria-label="Center 功能导航">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={`cp-side__item${tab === item.id ? ' is-on' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  <TabIcon id={item.id} />
                  <span>
                    <b>{item.label}</b>
                    <em>{item.en}</em>
                  </span>
                </button>
              ))}
            </nav>

            <div className="cp-main">
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
                <span className="cp-preview__caption">
                  {preset} · {gamut} · {source} · 3840×2160
                </span>
              </div>

              <div className="cp-controls">
                <div className="cp-tone">
                  <Slider label="亮度" value={tone.brightness} onChange={(v) => set('brightness', v)} />
                  <Slider label="对比度" value={tone.contrast} onChange={(v) => set('contrast', v)} />
                  <Slider label="饱和度" value={tone.saturation} onChange={(v) => set('saturation', v)} />
                  <Slider label="色调" value={tone.hue} onChange={(v) => set('hue', v)} />
                  <Slider label="色温" value={tone.temperature} onChange={(v) => set('temperature', v)} />
                </div>

                {tab === 'basic' && (
                  <Chips label="预设模式" options={PRESETS} value={preset} onChange={setPreset} />
                )}
                {tab === 'gaming' && (
                  <Chips
                    label="辅助准心"
                    options={CROSSHAIRS}
                    value={crosshair}
                    onChange={setCrosshair}
                  />
                )}
                {tab === 'pro' && <Chips label="色域空间" options={GAMUTS} value={gamut} onChange={setGamut} />}
                {tab === 'image' && (
                  <button type="button" className="cp-toggle" aria-pressed={hdr} onClick={() => setHdr((v) => !v)}>
                    HDR <i className={hdr ? 'is-on' : ''} />
                  </button>
                )}
                {tab === 'input' && <Chips label="输入源" options={SOURCES} value={source} onChange={setSource} />}
                {tab === 'system' && (
                  <>
                    <Chips label="灯效" options={LIGHTING} value={lighting} onChange={setLighting} />
                    <button type="button" className="cp-reset" onClick={reset}>
                      恢复默认
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="cp-status" aria-live="polite">
            <span><em>分辨率</em><b>3840×2160</b></span>
            <span><em>刷新率</em><b>165 HZ</b></span>
            <span><em>色深</em><b>10-bit</b></span>
            <span><em>预设</em><b>{preset}</b></span>
            <span><em>HDR</em><b>{hdr ? '开启' : '关闭'}</b></span>
            <span><em>VRR</em><b className="is-on">开启</b></span>
            <span><em>带宽</em><b>39.2 Gbps</b></span>
          </div>
        </div>
        <p className="cp-note">画面为代码实时渲染的功能示意，不代表当前设备状态。</p>
      </div>
    </section>
  )
}
