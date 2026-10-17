/**
 * 视觉素材层：产品主图用本地静态实拍图，其余视觉位用本地确定性 SVG 占位。
 *
 * 背景：软件截图、场景图等正式素材尚未到位；**产品主图**已采用品牌实拍图
 * （合成后存于 `gh-web/public/media/products/`，走 `/media/**` 本地路径渲染）。
 * 其余视觉位由本文件的 `art()` 生成**本地确定性 SVG**（data URI）：
 *  - 离线可用、始终渲染，不存在「破图 / 生成中 / 占位字样」；
 *  - 按语义给出统一暗色影棚基调（产品剪影、场景透视、软件界面、品牌光带等），视觉完整；
 *  - 全部为 data URI 或本地 `/media/**` 路径，绝不使用需鉴权的外链。
 *
 * 每个视觉位都带一条**交付风格描述**（`art()` 的第 4 个参数），一行讲清最终应替换成的素材：
 *   `交付物｜主体｜构图｜光线｜色调｜背景｜比例`
 * 该描述写入占位 SVG 的 `<title>`，使占位图自解释、可访问，并可直接作为拍摄 / 设计 /
 * 采购的替换依据（与《接口对接与素材替换清单》§四·B 一一对应）。
 *
 * 上线替换方式（任选其一，均无需改动组件）：
 *  1. 把下列返回值换成正式素材地址（CDN / 自有静态资源）；
 *  2. 或改为由后端接口返回图片字段（如 `Product.image`），组件按字段渲染。
 */
import type { DeviceVariant } from '../components/ui/DeviceArt'

type Kind = 'monitor' | 'mouse' | 'keyboard' | 'headset' | 'pad' | 'scene' | 'software' | 'brand' | 'lab' | 'case'

const BG0 = '#101538'
const BG1 = '#07080d'
const ACCENT = '#5b75f5'
const ACCENT2 = '#22d3ee'
const STROKE = '#8b93a7'
const BODY = '#1b2033'

/** XML 文本转义（风格描述写入 SVG `<title>` 时使用） */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 将 120×90 坐标系的设备图形等比居中缩放到画布 */
function fit(w: number, h: number, frac: number): string {
  const s = (Math.min(w, h) * frac) / 90
  const tx = (w - 120 * s) / 2
  const ty = (h - 90 * s) / 2
  return `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${s.toFixed(4)})`
}

/** 产品剪影（与 DeviceArt 同构，但内联样式，因其渲染于 <img> 隔离文档中） */
function device(kind: 'monitor' | 'mouse' | 'keyboard' | 'headset' | 'pad', w: number, h: number): string {
  const g = `<g transform="${fit(w, h, 0.5)}" fill="none" stroke="${STROKE}" stroke-width="2">`
  if (kind === 'monitor') {
    return `${g}
      <ellipse cx="60" cy="82" rx="30" ry="6" fill="${ACCENT}" opacity="0.3" stroke="none"/>
      <rect x="12" y="14" width="96" height="58" rx="7" fill="${BODY}"/>
      <rect x="18" y="20" width="84" height="46" rx="3" fill="${ACCENT}" opacity="0.16" stroke="none"/>
      <rect x="54" y="72" width="12" height="8" rx="1.5" fill="${ACCENT2}" stroke="none"/>
      <rect x="38" y="80" width="44" height="4" rx="2" fill="${BODY}"/>
    </g>`
  }
  if (kind === 'mouse') {
    return `${g}
      <ellipse cx="60" cy="70" rx="34" ry="9" fill="${ACCENT}" opacity="0.3" stroke="none"/>
      <path d="M60 10c12 0 20 11 20 28v18c0 13-8 20-20 20s-20-7-20-20V38c0-17 8-28 20-28Z" fill="${BODY}"/>
      <path d="M60 10v24"/>
      <rect x="55" y="17" width="10" height="14" rx="5" fill="${ACCENT}" stroke="none"/>
    </g>`
  }
  if (kind === 'keyboard') {
    return `${g}
      <ellipse cx="60" cy="74" rx="42" ry="8" fill="${ACCENT}" opacity="0.3" stroke="none"/>
      <rect x="8" y="30" width="104" height="40" rx="8" fill="${BODY}"/>
      <path d="M18 42h84M18 52h84M18 62h72" stroke-dasharray="6 5"/>
      <rect x="92" y="60" width="12" height="6" rx="3" fill="${ACCENT}" stroke="none"/>
    </g>`
  }
  if (kind === 'headset') {
    return `${g}
      <ellipse cx="60" cy="76" rx="34" ry="7" fill="${ACCENT}" opacity="0.3" stroke="none"/>
      <path d="M30 62V46a30 30 0 0 1 60 0v16" stroke-width="8" stroke-linecap="round"/>
      <rect x="22" y="48" width="16" height="28" rx="8" fill="${BODY}"/>
      <rect x="82" y="48" width="16" height="28" rx="8" fill="${BODY}"/>
      <rect x="26" y="62" width="8" height="3" rx="1.5" fill="${ACCENT}" stroke="none"/>
    </g>`
  }
  return `${g}
    <ellipse cx="60" cy="52" rx="44" ry="18" fill="${ACCENT}" opacity="0.25" stroke="none"/>
    <rect x="12" y="30" width="96" height="42" rx="6" fill="${BODY}"/>
    <rect x="12" y="66" width="96" height="5" rx="2.5" fill="${ACCENT2}" opacity="0.85" stroke="none"/>
  </g>`
}

/** 场景：地平线 + 透视栅格 + 顶光 */
function scene(w: number, h: number): string {
  const hy = h * 0.6
  let grid = ''
  for (let i = -6; i <= 6; i++) {
    const x = w / 2 + i * (w / 7)
    grid += `<line x1="${w / 2}" y1="${hy}" x2="${x}" y2="${h}" stroke="${ACCENT}" stroke-opacity="0.14"/>`
  }
  for (let j = 1; j <= 6; j++) {
    const y = hy + (h - hy) * Math.pow(j / 6, 1.7)
    grid += `<line x1="0" y1="${y.toFixed(1)}" x2="${w}" y2="${y.toFixed(1)}" stroke="${ACCENT}" stroke-opacity="0.09"/>`
  }
  return `<line x1="0" y1="${hy}" x2="${w}" y2="${hy}" stroke="${ACCENT2}" stroke-opacity="0.4"/>${grid}`
}

/** 软件界面：窗口框 + 侧栏 + 面板 + 折线 */
function software(w: number, h: number): string {
  const mx = w * 0.08
  const my = h * 0.12
  const bw = w - mx * 2
  const bh = h - my * 2
  const barH = bh * 0.13
  const sideW = bw * 0.22
  const dot = barH * 0.42
  const dy = my + barH / 2
  let rows = ''
  for (let i = 0; i < 5; i++) {
    const ry = my + barH + bh * 0.14 + i * (bh * 0.13)
    rows += `<rect x="${mx + sideW + bw * 0.06}" y="${ry.toFixed(1)}" width="${(bw * 0.5).toFixed(1)}" height="${(bh * 0.05).toFixed(1)}" rx="4" fill="${STROKE}" opacity="0.22"/>`
  }
  const pts = Array.from({ length: 7 }, (_, i) => {
    const x = mx + sideW + bw * 0.1 + i * (bw * 0.62 / 6)
    const y = my + bh * 0.82 - Math.sin(i * 1.1) * bh * 0.16 - i * bh * 0.02
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return `
    <rect x="${mx}" y="${my}" width="${bw}" height="${bh}" rx="18" fill="#11162e" stroke="#2a3152"/>
    <rect x="${mx}" y="${my}" width="${bw}" height="${barH}" rx="18" fill="#171d38"/>
    <rect x="${mx}" y="${my + barH - 18}" width="${bw}" height="18" fill="#171d38"/>
    <rect x="${mx}" y="${my + barH}" width="${sideW}" height="${bh - barH}" fill="#0e1330"/>
    <circle cx="${mx + 26}" cy="${dy}" r="${dot}" fill="#ef4444" opacity="0.7"/>
    <circle cx="${mx + 26 + dot * 3}" cy="${dy}" r="${dot}" fill="#f59e0b" opacity="0.7"/>
    <circle cx="${mx + 26 + dot * 6}" cy="${dy}" r="${dot}" fill="${ACCENT2}" opacity="0.7"/>
    <line x1="${mx + sideW}" y1="${my + barH}" x2="${mx + sideW}" y2="${my + bh}" stroke="#2a3152"/>
    ${rows}
    <polyline points="${pts}" fill="none" stroke="${ACCENT}" stroke-width="3" stroke-linejoin="round"/>
  `
}

/** 品牌：斜向光带 + 深度 */
function brand(w: number, h: number): string {
  let streaks = ''
  for (let i = 0; i < 5; i++) {
    const x = w * (0.06 + i * 0.2)
    const wid = w * (0.05 + (i % 2) * 0.05)
    streaks += `<polygon points="${x},0 ${x + wid},0 ${x + wid * 0.4 + h * 0.5},${h} ${x + h * 0.5},${h}" fill="${i % 2 ? ACCENT2 : ACCENT}" opacity="${i % 2 ? 0.12 : 0.2}"/>`
  }
  return streaks
}

/** 实验室：栅格 + 量测框 + 虚线基准 */
function lab(w: number, h: number): string {
  let grid = ''
  for (let x = 0; x <= w; x += w / 12) grid += `<line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${h}" stroke="${ACCENT}" stroke-opacity="0.07"/>`
  for (let y = 0; y <= h; y += h / 8) grid += `<line x1="0" y1="${y.toFixed(1)}" x2="${w}" y2="${y.toFixed(1)}" stroke="${ACCENT}" stroke-opacity="0.07"/>`
  const bx = w * 0.16
  const by = h * 0.26
  const bw = w * 0.42
  const bh = h * 0.34
  return `${grid}
    <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="10" fill="${BODY}" opacity="0.65" stroke="${STROKE}"/>
    <path d="M${bx} ${by + bh / 2}h${bw}" stroke="${ACCENT2}" stroke-opacity="0.6" stroke-dasharray="7 6"/>
    <rect x="${bx + bw * 0.18}" y="${by + bh * 0.2}" width="${bw * 0.64}" height="${bh * 0.16}" rx="4" fill="${ACCENT}" opacity="0.5"/>
    <rect x="${bx + bw * 0.18}" y="${by + bh * 0.5}" width="${bw * 0.4}" height="${bh * 0.14}" rx="4" fill="${STROKE}" opacity="0.35"/>
    <circle cx="${bx + bw * 0.82}" cy="${by + bh * 0.62}" r="${bh * 0.1}" fill="none" stroke="${ACCENT2}" stroke-opacity="0.7"/>
  `
}

/** 案例：舞台视线汇聚 + 顶灯 + 观众席 */
function showcase(w: number, h: number): string {
  const hy = h * 0.46
  let rays = ''
  for (let i = -3; i <= 3; i++) {
    rays += `<polygon points="${w / 2},${hy * 0.1} ${w / 2 + i * (w / 6) - w / 12},${h} ${w / 2 + i * (w / 6) + w / 12},${h}" fill="${ACCENT}" opacity="0.06"/>`
  }
  let crowd = ''
  for (let i = 0; i < 14; i++) {
    const x = w * (0.06 + (i * 0.9) / 14)
    const y = h * (0.74 + (i % 3) * 0.06)
    crowd += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(h * 0.035).toFixed(1)}" fill="${STROKE}" opacity="0.3"/>`
  }
  return `${rays}
    <line x1="0" y1="${hy}" x2="${w}" y2="${hy}" stroke="${ACCENT2}" stroke-opacity="0.35"/>
    <rect x="0" y="${hy}" width="${w}" height="${h - hy}" fill="#0c1130" opacity="0.5"/>
    ${crowd}
  `
}

/**
 * 生成一张占位 SVG 的 data URI。
 * @param desc 该视觉位的「交付风格描述」，写入 `<title>` 使占位图自解释。
 */
function art(kind: Kind, w: number, h: number, desc: string): string {
  const accent = kind === 'case' ? ACCENT2 : ACCENT
  const bodyMarkup =
    kind === 'monitor' || kind === 'mouse' || kind === 'keyboard' || kind === 'headset' || kind === 'pad'
      ? device(kind, w, h)
      : kind === 'scene'
        ? scene(w, h)
        : kind === 'software'
          ? software(w, h)
          : kind === 'brand'
            ? brand(w, h)
            : kind === 'lab'
              ? lab(w, h)
              : showcase(w, h)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<title>${esc(desc)}</title>` +
    `<desc>${esc(desc)}</desc>` +
    `<defs>` +
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${BG0}"/><stop offset="1" stop-color="${BG1}"/></linearGradient>` +
    `<radialGradient id="g1" cx="74%" cy="16%" r="62%"><stop offset="0" stop-color="${accent}" stop-opacity="0.5"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="g2" cx="12%" cy="88%" r="58%"><stop offset="0" stop-color="${ACCENT2}" stop-opacity="0.24"/><stop offset="1" stop-color="${ACCENT2}" stop-opacity="0"/></radialGradient>` +
    `</defs>` +
    `<rect width="${w}" height="${h}" fill="url(#bg)"/>` +
    `<rect width="${w}" height="${h}" fill="url(#g1)"/>` +
    `<rect width="${w}" height="${h}" fill="url(#g2)"/>` +
    bodyMarkup +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/** 16/9 */
const W169 = 1600
const H169 = 900
/** 4/3 */
const W43 = 1200
const H43 = 900
/** 16/10 */
const W1610 = 1280
const H1610 = 800
/** 1/1 */
const SQ = 1000

/**
 * 设备类素材的交付风格描述（产品实拍方向）。
 * 格式：交付物｜主体与机位｜构图｜光线｜色调｜背景｜比例。
 * 产品列表 / 重点产品卡（4:3）与详情页相册（1:1）共用此基调，仅加注用途 / 视角。
 */
const DEVICE_DESC: Record<'monitor' | 'mouse' | 'keyboard' | 'headset' | 'pad', string> = {
  monitor:
    'OLED 电竞显示器 · 产品实拍｜暗色影棚哑光台面，正面略俯视展露窄边框与支架｜居中、下身柔投影与轻微倒影｜顶侧逆光 + 屏幕微光｜深蓝黑底 + 品牌蓝 / 青高光｜无缝影棚背景',
  mouse:
    'OLED 电竞显示器 · 产品实拍（3/4 侧视）｜暗色影棚哑光台面，侧视置于台面｜居中、下身柔投影与轻微倒影｜顶侧逆光 + 屏幕微光｜深蓝黑底 + 品牌蓝 / 青高光｜无缝影棚背景',
  keyboard:
    'OLED 电竞显示器 · 产品实拍（45° 俯视）｜暗色影棚哑光台面，俯视展露窄边框与支架｜居中、下身柔投影｜顶部柔光 + 屏面微光｜深蓝黑底 + 品牌蓝点缀｜无缝影棚背景',
  headset:
    'OLED 电竞显示器 · 场景实拍｜暗色影棚台面，侧逆光勾出机身轮廓与屏面反光｜居中、柔和接地阴影｜侧逆光 + 屏幕高光｜深蓝黑底 + 品牌蓝高光｜无缝影棚背景',
  pad:
    '显示器悬臂支架 · 周边实拍｜暗色影棚台面，斜俯视呈现铝合金臂与底座｜居中、边缘阴影｜顶部均匀柔光｜深蓝黑底 + 青色包边光｜无缝影棚背景',
}

/** 详情页相册的四个机位 */
const VIEW_ANGLES = ['主图 · 3/4 侧视', '正侧轮廓', '俯视全貌', '按键 / 接口特写']

/**
 * 占位素材地址解析：内容库（服务端 seed）以 `/media/...` 逻辑地址记录占位素材，
 * 而正式素材尚未到位；已知占位地址在此映射到内置 MEDIA（data URI，离线可渲染、
 * 不出现破图 / 「生成中」）。未命中的地址（正式素材 / `/uploads/...` 上传素材）
 * 原样返回，交由 `<img>` / `<video>` 自行加载。
 */
export function resolveMedia(src: string): string {
  if (!src) return src
  const scene = src.match(/^\/media\/home\/scenes\/([^/]+)\.svg$/)
  if (scene && MEDIA.scene[scene[1]]) return MEDIA.scene[scene[1]]
  const product = src.match(/^\/media\/products\/([^/]+)\.svg$/)
  if (product && MEDIA.product[product[1]]) return MEDIA.product[product[1]]
  return src
}

export const MEDIA = {
  /**
   * 首屏海报（图片 / 动画两张；Canvas 那张由代码实时渲染，无需素材）。
   * 比例 16:9，随首屏容器 object-fit: cover。
   */
  hero: {
    s0: art(
      'scene',
      W169,
      H169,
      '首页首屏主视觉（静态图片）｜暗色影棚 + 舞台透视 · 旗舰显示器置于台面｜产品偏右 1/3、左侧留白放标题｜顶侧逆光 + 边缘勾光｜深蓝黑底 + 品牌蓝勾光｜无线影棚、地面反光｜16:9',
    ),
    s1: art(
      'case',
      W169,
      H169,
      '首页首屏主视觉（动画 / 视频，2–5s 无缝循环）｜舞台视线汇聚 · 产品由暗部推出｜主体居中、光线向中心收束｜顶灯扫光 + 轮廓高光｜深蓝黑底 + 青色光晕｜无边界暗场｜16:9',
    ),
  },
  /** 首屏右侧产品主视觉（1:1，与海报分栏） */
  heroProduct: art(
    'monitor',
    1200,
    1200,
    '首页右侧旗舰产品主视觉｜纯影棚 · 54027X1QE-W54 3/4 仰角｜居中、底部柔投影｜双灯勾边 + 顶光｜近黑底 + 品牌蓝勾勒｜无缝深色背景｜1:1',
  ),

  /** 场景卡（按场景选择，16:9） */
  scene: {
    'scene-01': art(
      'scene',
      W169,
      H169,
      '场景卡 · 电竞对战｜真实场景实拍 · 玩家桌面视角｜产品前景、屏幕为画面主光｜冷调暗场 + 屏幕蓝青反光｜电竞房暗色环境｜16:9',
    ),
    'scene-02': art(
      'software',
      W169,
      H169,
      '场景卡 · 内容创作｜真实场景实拍 · 剪辑工位｜显示器前景、调色软件界面在屏｜侧窗柔光 + 屏幕冷光｜中性偏暖室内 + 蓝调屏幕｜工作室桌面｜16:9',
    ),
    'scene-03': art(
      'lab',
      W169,
      H169,
      '场景卡 · 商用办公｜真实场景实拍 · 混合办公桌面｜笔记本与显示器、键鼠同框｜顶部均匀柔光｜明亮中性色 + 品牌蓝点缀｜简洁办公环境｜16:9',
    ),
    'scene-04': art(
      'headset',
      W169,
      H169,
      '场景卡 · 影音娱乐｜真实场景实拍 · 影音桌面｜显示器与音响同框、屏幕为画面主光｜侧向柔光 + 屏幕冷光｜冷调暗场 + 品牌蓝青反光｜居家影音环境｜16:9',
    ),
  } as Record<string, string>,

  /** 产品列表 / 重点产品卡（按产品 id，4:3） */
  /**
   * 产品主图：本地静态素材（由品牌实拍图合成，存于 gh-web/public/media/products）。
   * 未配置的型号由调用方回退到 DeviceArt 占位。
   */
  product: {
    'gh-54027x1qe': '/media/products/gh-54027x1qe.jpg',
    'gh-28027x1qe': '/media/products/gh-28027x1qe.jpg',
    'gh-32x1ue': '/media/products/gh-32x1ue.jpg',
    'gh-27x1u': '/media/products/gh-27x1u.jpg',
    'gh-27q1f': '/media/products/gh-27q1f.jpg',
    'gh-24h1': '/media/products/gh-24h1.jpg',
    'gh-25s1fp': '/media/products/gh-25s1fp.jpg',
    'gh-arm01': art('pad', W43, H43, `${DEVICE_DESC.pad}｜产品卡 4:3`),
  } as Record<string, string>,

  /** 产品卡白底图：由主图去底后合成纯白背景（仅产品网格使用，详情/矩阵仍用深色主图） */
  productWhite: {
    'gh-54027x1qe': '/media/products/white/gh-54027x1qe.jpg',
    'gh-28027x1qe': '/media/products/white/gh-28027x1qe.jpg',
    'gh-32x1ue': '/media/products/white/gh-32x1ue.jpg',
    'gh-27x1u': '/media/products/white/gh-27x1u.jpg',
    'gh-27q1f': '/media/products/white/gh-27q1f.jpg',
    'gh-24h1': '/media/products/white/gh-24h1.jpg',
    'gh-25s1fp': '/media/products/white/gh-25s1fp.jpg',
  } as Record<string, string>,

  /** 产品详情相册（按设备类型给 4 个机位，1:1） */
  views: {
    monitor: [1, 2, 3, 4].map((i) => `/media/products/views/monitor-${i}.jpg`),
    mouse: VIEW_ANGLES.map((a) => art('mouse', SQ, SQ, `${DEVICE_DESC.mouse}｜相册机位：${a}｜1:1`)),
    keyboard: VIEW_ANGLES.map((a) => art('keyboard', SQ, SQ, `${DEVICE_DESC.keyboard}｜相册机位：${a}｜1:1`)),
    headset: VIEW_ANGLES.map((a) => art('headset', SQ, SQ, `${DEVICE_DESC.headset}｜相册机位：${a}｜1:1`)),
    pad: VIEW_ANGLES.map((a) => art('pad', SQ, SQ, `${DEVICE_DESC.pad}｜相册机位：${a}｜1:1`)),
  } as Record<DeviceVariant, string[]>,

  /** Center 软件界面截图（首屏 + 两个功能深读，16:10） */
  center: {
    hero: art(
      'software',
      W1610,
      H1610,
      'Center 软件首屏截图（研发提供）｜真实软件 UI · 主界面｜窗口居中、四周留 8% 边距｜屏幕自发光、无外部光｜深色 UI + 品牌蓝 / 青点缀｜纯界面、无环境背景｜16:10',
    ),
    feature1: art(
      'software',
      W1610,
      H1610,
      'Center 功能截图 · 性能参数调节｜真实软件 UI · 参数面板特写｜面板占屏约 60%、居中｜屏幕自发光｜深色 UI + 蓝色滑杆｜纯界面、无环境背景｜16:10',
    ),
    feature2: art(
      'software',
      W1610,
      H1610,
      'Center 功能截图 · 配置云同步｜真实软件 UI · 同步状态面板｜面板居中｜屏幕自发光｜深色 UI + 青色状态光｜纯界面、无环境背景｜16:10',
    ),
  },

  /** 关于页：品牌形象图 + 实验室实拍图（4:3） */
  about: {
    brand: art(
      'brand',
      W43,
      H43,
      '品牌形象图（实拍 / 授权）｜品牌主视觉 · 斜向光带与空间深度｜抽象几何、不含具体产品｜斜射光 + 渐变层次｜深蓝黑底 + 品牌蓝 / 青光带｜极简暗场｜4:3',
    ),
    lab: art(
      'lab',
      W43,
      H43,
      '实验室实拍图（实拍）｜测试实验室 · 仪器与量测工位｜设备居中、含栅格与基准线示意｜冷白顶光 + 屏幕光｜中性灰 + 品牌蓝标注｜整洁实验室环境｜4:3',
    ),
  },

  /** 商业合作案例图（按案例顺序，16:9） */
  businessCase: [
    art(
      'case',
      W169,
      H169,
      '合作案例图 · 电竞赛事（合作方授权）｜舞台视线汇聚 · 大屏与观众席｜舞台居中、观众作虚化前景｜顶灯 + 舞台扫光｜深蓝暗场 + 青色高光｜赛事现场｜16:9',
    ),
    art(
      'scene',
      W169,
      H169,
      '合作案例图 · 高校电竞馆（合作方授权）｜场馆实拍 · 桌面与屏幕阵列｜透视纵深、产品作前景｜环境顶光 + 屏幕光｜冷调暗场｜电竞馆环境｜16:9',
    ),
    art(
      'case',
      W169,
      H169,
      '合作案例图 · 品牌联名（合作方授权）｜联名产品陈列 · 舞台式布光｜产品居中、背光轮廓｜顶逆光 + 轮廓光｜深蓝暗场 + 品牌蓝｜陈列场景｜16:9',
    ),
  ],
}