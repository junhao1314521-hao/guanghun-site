/**
 * Center 可操作控制台：按真实软件 v1.3.3 的 6 个导航复刻。
 * 所有数据都是前端演示状态，不读取硬件；界面明确标注「功能示意」。
 */
import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowIcon, TabIcon } from './Icons'
import { CROSSHAIRS, GAMUTS, LIGHTING, PRESETS, SCENES, SOURCES, TABS, TEMPS } from './data'
import type { Scene, TabId } from './data'

type Settings = {
  preset: string
  brightness: number
  contrast: number
  blackBoost: number
  sharpness: number
  crosshair: number
  refreshDisplay: boolean
  gamut: string
  temp: string
  gamma: number
  sat: number[]
  hue: number[]
  hdr: boolean
  dsc: boolean
  rgb: [number, number, number]
  source: string
  dualMode: boolean
  lighting: string
  volume: number
  language: string
}

const INITIAL: Settings = {
  preset: '玩家1',
  brightness: 80,
  contrast: 50,
  blackBoost: 50,
  sharpness: 50,
  crosshair: 0,
  refreshDisplay: false,
  gamut: 'DCI-P3',
  temp: '冷色温 1',
  gamma: 2,
  sat: [50, 50, 50, 50, 50, 50],
  hue: [50, 50, 50, 50, 50, 50],
  hdr: true,
  dsc: true,
  rgb: [50, 50, 50],
  source: 'DP',
  dualMode: false,
  lighting: '呼吸',
  volume: 30,
  language: '简体中文',
}

const COLOR_AXES = [
  { label: '红色', color: '#ef4444' },
  { label: '黄色', color: '#eab308' },
  { label: '绿色', color: '#22c55e' },
  { label: '青色', color: '#06b6d4' },
  { label: '蓝色', color: '#3b82f6' },
  { label: '品红', color: '#ec4899' },
]

// 由预设场景与初始值合并出完整的控制台设置
function applyScene(scene: Scene): Settings {
  return {
    ...INITIAL,
    preset: scene.preset,
    brightness: scene.brightness,
    contrast: scene.contrast,
    blackBoost: scene.blackBoost,
    crosshair: scene.crosshair,
    hdr: scene.hdr,
    gamut: scene.gamut,
    temp: scene.temp,
    sat: Array.from({ length: 6 }, () => scene.sat),
  }
}

// 数值滑杆控件：展示当前值，拖动时回调最新数值
function Slider({
  label,
  value,
  onChange,
  suffix = '',
  color,
}: {
  label: string
  value: number
  onChange: (next: number) => void
  suffix?: string
  color?: string
}) {
  return (
    <label className="cc-slider">
      <span className="cc-slider__head">
        <span>{label}</span>
        <b>
          {value}
          {suffix}
        </b>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={color ? ({ '--cc-accent': color } as CSSProperties) : undefined}
      />
    </label>
  )
}

// 单选标签组：从给定选项中选中一项并回调
function Chips({
  options,
  value,
  onChange,
  label,
}: {
  options: string[]
  value: string | number
  onChange: (next: string) => void
  label: string
}) {
  return (
    <div className="cc-field" role="group" aria-label={label}>
      <span className="cc-field__label">{label}</span>
      <div className="cc-chips">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`cc-chip${String(value) === option ? ' is-on' : ''}`}
            aria-pressed={String(value) === option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

// 开关控件：切换布尔值并回调，可附带说明文案
function Switch({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
  hint?: string
}) {
  return (
    <div className="cc-switch">
      <span className="cc-switch__text">
        {label}
        {hint && <em>{hint}</em>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`cc-switch__track${checked ? ' is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="cc-switch__thumb" />
      </button>
    </div>
  )
}

// 控制台交互区：Tab 切换并按滑块 / 标签 / 开关调整画面参数，支持套用预设场景
export function CenterConsole() {
  const [tab, setTab] = useState<TabId>('basic')
  const [settings, setSettings] = useState<Settings>(INITIAL)
  const [sceneId, setSceneId] = useState<string>('')

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  const pickScene = (scene: Scene) => {
    setSettings(applyScene(scene))
    setSceneId(scene.id)
  }

  const previewStyle = useMemo(() => {
    const avgSat = settings.sat.reduce((sum, item) => sum + item, 0) / settings.sat.length
    const avgHue = settings.hue.reduce((sum, item) => sum + item, 0) / settings.hue.length
    return {
      filter: [
        `brightness(${(0.45 + settings.brightness / 100) * 0.95})`,
        `contrast(${0.62 + (settings.contrast / 100) * 0.72})`,
        `saturate(${0.45 + (avgSat / 100) * 1.5})`,
        `hue-rotate(${(avgHue - 50) * 0.5}deg)`,
      ].join(' '),
    }
  }, [settings.brightness, settings.contrast, settings.sat, settings.hue])

  const reset = () => {
    setSettings(INITIAL)
    setSceneId('')
  }

  return (
    <section className="center-section center-console" id="console" aria-labelledby="console-title">
      <div className="center-wrap">
        <header className="center-head">
          <span className="center-eyebrow">02 / 可操作控制台</span>
          <h2 id="console-title">不用装软件，先在网页里调一遍</h2>
          <p className="center-lead">
            下面就是一个可以操作的 Center 窗口：切导航、拖滑条、换预设，右侧画面与底部读数会同步变化。
            <em>功能示意，非当前设备实时状态。</em>
          </p>
        </header>

        <div className="cc-scenes" role="group" aria-label="场景预设">
          {SCENES.map((scene) => (
            <button
              key={scene.id}
              type="button"
              className={`cc-scene${sceneId === scene.id ? ' is-on' : ''}`}
              onClick={() => pickScene(scene)}
              aria-pressed={sceneId === scene.id}
            >
              <span className="cc-scene__en">{scene.en}</span>
              <strong>{scene.title}</strong>
              <span className="cc-scene__desc">{scene.desc}</span>
              <ArrowIcon className="cc-scene__arrow" />
            </button>
          ))}
        </div>

        <div className="cc-window">
          <div className="cc-titlebar">
            <span className="cc-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="cc-titlebar__name">光魂 Center</span>
            <span className="cc-titlebar__meta">
              <i className="cc-live" aria-hidden="true" />
              V1.3.3 · 27X1QE-500
            </span>
          </div>

          <div className="cc-body">
            <nav className="cc-side" role="tablist" aria-label="Center 功能导航">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={`cc-side__item${tab === item.id ? ' is-on' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  <TabIcon id={item.id} className="cc-side__icon" />
                  <span className="cc-side__text">
                    <b>{item.label}</b>
                    <em>{item.en}</em>
                  </span>
                </button>
              ))}
            </nav>

            <div className="cc-main">
              <div className="cc-preview" aria-label="显示器画面示意">
                <div className="cc-scene-art" style={previewStyle}>
                  <span className="cc-scene-art__sun" />
                  <span className="cc-scene-art__ridge cc-scene-art__ridge--a" />
                  <span className="cc-scene-art__ridge cc-scene-art__ridge--b" />
                  <span className="cc-scene-art__floor" />
                </div>
                <span className={`cc-preview__temp cc-preview__temp--${settings.temp.includes('暖') ? 'warm' : 'cool'}`} />
                {settings.hdr && <span className="cc-preview__hdr">HDR</span>}
                {settings.crosshair > 0 && (
                  <span className={`cc-crosshair cc-crosshair--${settings.crosshair}`} aria-hidden="true" />
                )}
                {settings.refreshDisplay && <span className="cc-fps">165 FPS · 165 Hz</span>}
                <div className="cc-preview__label">
                  <span>{settings.preset} · {settings.gamut}</span>
                  <span>{settings.source} · 3840×2160</span>
                </div>
              </div>

              <div className="cc-controls" role="tabpanel" aria-label={TABS.find((item) => item.id === tab)?.label}>
                <header className="cc-controls__head">
                  <b>{TABS.find((item) => item.id === tab)?.label}</b>
                  <span>{TABS.find((item) => item.id === tab)?.desc}</span>
                </header>

                {tab === 'basic' && (
                  <>
                    <Chips label="预设模式" options={PRESETS} value={settings.preset} onChange={(value) => update('preset', value)} />
                    <Slider label="亮度" value={settings.brightness} onChange={(value) => update('brightness', value)} />
                    <Slider label="对比度" value={settings.contrast} onChange={(value) => update('contrast', value)} />
                  </>
                )}

                {tab === 'gaming' && (
                  <>
                    <Slider label="暗部增强" value={settings.blackBoost} onChange={(value) => update('blackBoost', value)} />
                    <Chips
                      label="辅助准心"
                      options={CROSSHAIRS}
                      value={CROSSHAIRS[settings.crosshair]}
                      onChange={(value) => update('crosshair', CROSSHAIRS.indexOf(value))}
                    />
                    <Slider label="清晰度" value={settings.sharpness} onChange={(value) => update('sharpness', value)} />
                    <Switch label="刷新率显示" checked={settings.refreshDisplay} onChange={(value) => update('refreshDisplay', value)} />
                  </>
                )}

                {tab === 'pro' && (
                  <>
                    <Chips label="色域空间" options={GAMUTS} value={settings.gamut} onChange={(value) => update('gamut', value)} />
                    <Chips label="色温" options={TEMPS} value={settings.temp} onChange={(value) => update('temp', value)} />
                    <Slider label="伽马" value={settings.gamma} onChange={(value) => update('gamma', value)} />
                    <div className="cc-axis">
                      <span className="cc-field__label">六轴饱和度</span>
                      <div className="cc-axis__grid">
                        {COLOR_AXES.map((axis, index) => (
                          <Slider
                            key={`sat-${axis.label}`}
                            label={axis.label}
                            value={settings.sat[index]}
                            color={axis.color}
                            onChange={(value) =>
                              update('sat', settings.sat.map((item, i) => (i === index ? value : item)))
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <div className="cc-axis">
                      <span className="cc-field__label">六轴色调</span>
                      <div className="cc-axis__grid">
                        {COLOR_AXES.map((axis, index) => (
                          <Slider
                            key={`hue-${axis.label}`}
                            label={axis.label}
                            value={settings.hue[index]}
                            color={axis.color}
                            onChange={(value) =>
                              update('hue', settings.hue.map((item, i) => (i === index ? value : item)))
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {tab === 'image' && (
                  <>
                    <Switch label="HDR" checked={settings.hdr} onChange={(value) => update('hdr', value)} hint="按面板能力开放" />
                    <Switch label="DSC 显示流压缩" checked={settings.dsc} onChange={(value) => update('dsc', value)} />
                    <div className="cc-axis">
                      <span className="cc-field__label">RGB 增益</span>
                      <div className="cc-axis__grid">
                        {(['红', '绿', '蓝'] as const).map((name, index) => (
                          <Slider
                            key={name}
                            label={`${name}色增益`}
                            value={settings.rgb[index]}
                            color={COLOR_AXES[index].color}
                            onChange={(value) =>
                              update('rgb', settings.rgb.map((item, i) => (i === index ? value : item)) as [number, number, number])
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <Slider label="清晰度" value={settings.sharpness} onChange={(value) => update('sharpness', value)} />
                  </>
                )}

                {tab === 'input' && (
                  <>
                    <Chips label="输入源" options={SOURCES} value={settings.source} onChange={(value) => update('source', value)} />
                    <Switch label="双模切换" checked={settings.dualMode} onChange={(value) => update('dualMode', value)} hint="4K@165 / FHD@330" />
                    <p className="cc-tip">切换输入源会重新握手信号，部分设备黑屏数秒属正常现象。</p>
                  </>
                )}

                {tab === 'system' && (
                  <>
                    <Chips label="灯效" options={LIGHTING} value={settings.lighting} onChange={(value) => update('lighting', value)} />
                    <Slider label="音量" value={settings.volume} onChange={(value) => update('volume', value)} />
                    <Chips label="显示器语言" options={['简体中文', '繁體中文', 'English']} value={settings.language} onChange={(value) => update('language', value)} />
                    <button type="button" className="cc-reset" onClick={reset}>
                      恢复出厂设置
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="cc-status" aria-live="polite">
            <span><em>分辨率</em><b>3840×2160</b></span>
            <span><em>刷新率</em><b>165 HZ</b></span>
            <span><em>色深</em><b>10-bit</b></span>
            <span><em>预设模式</em><b>{settings.preset}</b></span>
            <span><em>HDR</em><b>{settings.hdr ? '开启' : '关闭'}</b></span>
            <span><em>VRR</em><b className="is-on">开启</b></span>
            <span><em>画面带宽</em><b>39.2 Gbps</b></span>
          </div>
        </div>
      </div>
    </section>
  )
}
