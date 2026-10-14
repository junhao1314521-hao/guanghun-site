/**
 * 结构化集合英文覆盖层（双语：中文为默认 / 回退，英文为只读覆盖）。
 *
 * 与内容库 `__en` 变体思路一致，但集合记录**不落库英文**：读取时按 `id` 叠加本覆盖层
 * （见 `collectionStore.applyEnOverlay`），未覆盖的记录在英文下回退中文。
 * 这样中文 seed / 落库数据 / 中文响应形状完全不变，也不影响后台写入。
 *
 * 覆盖范围（=「主要集合的英文样例」）：
 *   products / rankings / articles / downloads / faqs / models / biz-content / biz-cases / biz-venues
 *
 * 约定：**只覆盖展示用自由文案**（名称、标题、摘要、正文等）；枚举 / 结构性字段
 * （category / connection / status.level / variant / priceValue / unit / ok 等）保持不变，
 * 以免破坏前端按中文枚举值做的筛选与排序逻辑；这些枚举的英文展示由前端 i18n 映射承担。
 */
import type { CollectionKey } from './collectionStore'

/** 单条记录的英文部分覆盖（浅合并进中文记录） */
type Overlay = Record<string, unknown>

/** 构建全部英文覆盖层（进程内常量；由 collectionStore 懒加载并缓存） */
export function buildCollectionEnOverlays(): Partial<Record<CollectionKey, Record<string, Overlay>>> {
  return {
    products: PRODUCTS_EN,
    rankings: RANKINGS_EN,
    articles: ARTICLES_EN,
    downloads: DOWNLOADS_EN,
    faqs: FAQS_EN,
    models: MODELS_EN,
    'biz-content': BIZ_SCENES_EN,
    'biz-cases': BIZ_CASES_EN,
    'biz-venues': BIZ_VENUES_EN,
  }
}

/* ---------------- 产品 ---------------- */

const PRODUCTS_EN: Record<string, Overlay> = {
  'gh-54027x1qe': { name: 'Lightning 540Hz OLED Gaming Monitor', specs: ['2K 540Hz', 'W-OLED'], flag: 'Flagship' },
  'gh-28027x1qe': { name: 'Lightning 280Hz OLED Gaming Monitor', specs: ['2K 280Hz', '1500 nit'] },
  'gh-32x1ue': { name: 'Meta Dual-mode 4K Gaming Monitor', specs: ['4K@165 / FHD@330', 'META OLED'] },
  'gh-27x1u': { name: '27" 2K OLED Monitor', specs: ['2K 240Hz', 'QD-OLED'] },
  'gh-27q1f': { name: '27" 2K Gaming Monitor', specs: ['2K 200Hz', 'Fast IPS'] },
  'gh-24h1': { name: '24" 200Hz Gaming Monitor', specs: ['FHD 200Hz', 'HDR400'] },
  'gh-25s1fp': { name: '24.5" High-refresh Gaming Monitor', specs: ['FHD 240Hz', 'IPS'] },
  'gh-arm01': { name: 'Monitor Arm', specs: ['VESA 75/100', '9 kg'] },
}

/* ---------------- 天梯榜（仅译指标名与行内产品名；unit/分数保持原样） ---------------- */

const RANKINGS_EN: Record<string, Overlay> = {
  overall: {
    label: 'Overall',
    rows: [
      { rank: '01', model: '54027X1QE-W54', name: 'Lightning 540Hz OLED', score: 96.8 },
      { rank: '02', model: '32X1UE-W16', name: 'Meta Dual-mode 4K OLED', score: 94.2 },
      { rank: '03', model: '28027X1QE-W28', name: 'Lightning 280Hz OLED', score: 92.5 },
      { rank: '04', model: '27X1U', name: '27" 2K OLED', score: 89.6 },
      { rank: '05', model: '27Q1F', name: '27" 2K Gaming IPS', score: 85.1 },
      { rank: '06', model: '25S1FP', name: '24.5" FHD 240Hz IPS', score: 82.4 },
      { rank: '07', model: '24H1', name: '24" FHD 200Hz IPS', score: 79.8 },
    ],
  },
  sensor: {
    label: 'Color accuracy',
    rows: [
      { rank: '01', model: '32X1UE-W16', name: 'Meta Dual-mode 4K OLED', score: 0.9 },
      { rank: '02', model: '54027X1QE-W54', name: 'Lightning 540Hz OLED', score: 1.1 },
      { rank: '03', model: '28027X1QE-W28', name: 'Lightning 280Hz OLED', score: 1.3 },
      { rank: '04', model: '27X1U', name: '27" 2K OLED', score: 1.6 },
      { rank: '05', model: '27Q1F', name: '27" 2K Gaming IPS', score: 2.1 },
      { rank: '06', model: '24H1', name: '24" FHD 200Hz IPS', score: 2.8 },
    ],
  },
  battery: {
    label: 'Peak brightness',
    rows: [
      { rank: '01', model: '54027X1QE-W54', name: 'Lightning 540Hz OLED', score: 1320 },
      { rank: '02', model: '32X1UE-W16', name: 'Meta Dual-mode 4K OLED', score: 1180 },
      { rank: '03', model: '28027X1QE-W28', name: 'Lightning 280Hz OLED', score: 1050 },
      { rank: '04', model: '27X1U', name: '27" 2K OLED', score: 960 },
      { rank: '05', model: '27Q1F', name: '27" 2K Gaming IPS', score: 480 },
      { rank: '06', model: '24H1', name: '24" FHD 200Hz IPS', score: 430 },
    ],
  },
  latency: {
    label: 'Response time',
    rows: [
      { rank: '01', model: '54027X1QE-W54', name: 'Lightning 540Hz OLED', score: 0.04 },
      { rank: '02', model: '28027X1QE-W28', name: 'Lightning 280Hz OLED', score: 0.05 },
      { rank: '03', model: '32X1UE-W16', name: 'Meta Dual-mode 4K OLED', score: 0.06 },
      { rank: '04', model: '27X1U', name: '27" 2K OLED', score: 0.08 },
      { rank: '05', model: '27Q1F', name: '27" 2K Gaming IPS', score: 1.2 },
      { rank: '06', model: '25S1FP', name: '24.5" FHD 240Hz IPS', score: 1.8 },
      { rank: '07', model: '24H1', name: '24" FHD 200Hz IPS', score: 2.4 },
    ],
  },
}

/* ---------------- 文章 / 新闻 ---------------- */

const ARTICLES_EN: Record<string, Overlay> = {
  'latency-end-to-end': {
    title: 'OLED gaming monitor response time: three flagships compared',
    categoryLabel: 'Review',
    tag: 'Response test',
    desc: 'Measuring GTG response and motion clarity on three OLED gaming monitors under identical conditions, reporting both median and 95th percentile.',
    meta: 'Tested · Method v2',
    body:
      '<h2>Purpose & environment</h2>' +
      '<p>This test quantifies the <strong>GTG response</strong> of three OLED gaming monitors under identical conditions, and breaks the total into explainable segments.</p>' +
      '<ul><li>Room held at 22–24 °C;</li><li>Monitors warmed up for 30 minutes;</li><li>Overdrive set to «Standard».</li></ul>' +
      '<h2>What response time is made of</h2>' +
      '<p>Response time combines panel grey-to-grey switching, overdrive and pixel light control. A single rated value cannot capture real motion blur.</p>' +
      '<h2>Conclusion</h2>' +
      '<p>In competitive play, a <em>stable high percentile</em> matters more than an occasional single-lowest value. Full raw data is available on the rankings page.</p>',
  },
  'tri-mode-keyboard-latency': {
    title: 'Dual-mode tested: 4K resolution vs FHD high refresh',
    categoryLabel: 'Review',
    tag: 'Dual-mode test',
    desc: 'Running the same dual-mode monitor at 4K@165 and FHD@330 to compare clarity, refresh rate and feel.',
    meta: 'Tested · Method v2',
    body:
      '<h2>How the modes differ</h2>' +
      '<p>The same monitor runs in <strong>4K@165 and FHD@330</strong> modes, trading off clarity, refresh rate and input latency.</p>' +
      '<h2>Dual-mode switch test</h2>' +
      '<p>Each mode logged 1,000 valid frames with median and jitter range; differences widen in fast pans and high-speed footage.</p>' +
      '<h2>How to choose</h2>' +
      '<p>4K for film and creation, FHD high refresh for competitive play, and one-click switching at a fixed desk.</p>',
  },
  'driver-firmware-guide': {
    title: 'Monitor color calibration guide: from OSD to ICC profile',
    categoryLabel: 'Guide',
    tag: 'Calibration guide',
    desc: 'A step-by-step walkthrough of calibrating brightness, color temperature and gamut in the OSD and OS, and exporting a reusable ICC profile.',
    meta: 'Guide · Illustrated',
    body:
      '<h2>Before you start</h2>' +
      '<p>Confirm the current gamut and color temperature in the OSD, warm the monitor up for 30 minutes, and turn off adaptive brightness.</p>' +
      '<ol><li>Close other color-management apps;</li><li>Do not switch inputs during calibration;</li><li>Do not power off the monitor mid-way.</li></ol>' +
      '<h2>Calibrate & export</h2>' +
      '<p>After calibrating brightness, color temperature and gamut, export an ICC profile and load it in the OS. To roll back, get the factory profile from the download center and apply it the same way.</p>' +
      '<blockquote><p>Factory color profiles are not removed when a new version ships, so you can roll back at any time.</p></blockquote>',
  },
  'test-methodology': {
    title: 'Why we publish our monitor test methodology: the value of reproducibility',
    categoryLabel: 'Insight',
    tag: 'Methodology',
    desc: 'Publishing instruments, environment, sample size and criteria lets any lab reproduce our numbers instead of just trusting the conclusion.',
    meta: 'Method · Notes',
    body:
      '<h2>Why publish the method</h2>' +
      '<p>An isolated number is hard to verify. Publishing the method lets conclusions be checked and reproduced, not merely believed.</p>' +
      '<h2>Reproducibility</h2>' +
      '<p>Another lab, another operator, same conditions — the result should be statistically consistent. That requires stating clearly what is a variable and what is a constant.</p>' +
      '<h2>Criteria</h2>' +
      '<p>We prefer the <strong>median</strong> and <strong>95th percentile</strong> over the mean, which is easily skewed by outliers.</p>',
  },
  'report-rate-explained': {
    title: 'HDR and peak brightness explained: the real viewing impact',
    categoryLabel: 'Insight',
    tag: 'Specs explained',
    desc: 'Peak brightness and HDR are often reduced to a single number; this piece separates window size, sustained brightness and dimming.',
    meta: 'Explained · Data',
    body:
      '<h2>What the terms mean</h2>' +
      '<p>Peak brightness is usually measured in a small window — the smaller the window, the higher the reading; sustained brightness is closer to real long-form viewing.</p>' +
      '<h2>Impact on viewing</h2>' +
      '<p>Higher peak brightness gives highlights more punch, but HDR layering also depends on dimming and tone mapping; <em>stability</em> often matters more than the rated ceiling.</p>' +
      '<h2>Practical advice</h2>' +
      '<p>Start from the vendor HDR mode, then fine-tune by content type and evaluate after sustained viewing.</p>',
  },
  'brand-2026-roadmap': {
    title: 'Guanghun 2026 monitor roadmap: from panel to ecosystem',
    categoryLabel: 'Brand',
    tag: 'Roadmap',
    desc: 'Three threads — OLED panels, full-speed connectivity and a color ecosystem — and the trade-offs for the next generation.',
    meta: 'Brand · Roadmap',
    body:
      '<h2>Portfolio overview</h2>' +
      '<p>2026 centers on three threads: more advanced OLED panels, more complete full-speed connectivity, and a more open color and tuning ecosystem.</p>' +
      '<h2>Panels & connectivity</h2>' +
      '<p>On panels we move from chasing a single metric to improving <strong>high-percentile stability</strong>; on connectivity we push DP 2.1 full speed and reliable multi-device switching.</p>' +
      '<h2>Next steps</h2>' +
      '<p>Specific requirements and timings follow the official final announcement; progress is tracked through the news and articles pages.</p>',
  },
}

/* ---------------- 下载中心 ---------------- */

const DOWNLOADS_EN: Record<string, Overlay> = {
  'center-win': { name: 'Center monitor tuning software · Windows installer', note: 'Supports Windows 10 / 11 (64-bit)' },
  'center-mac': { name: 'Center monitor tuning software · macOS installer', note: 'Supports macOS 12 and later' },
  'gh-54027x1qe-firmware': { name: '54027X1QE-W54 firmware update', note: 'Improves full-speed DP 2.1 handshake and HDR tuning' },
  'gh-54027x1qe-icc': { name: '54027X1QE-W54 color profile (ICC)', note: 'Includes sRGB / DCI-P3 profiles' },
  'gh-32x1ue-driver': { name: '32X1UE-W16 driver (INF)', note: 'Includes dual-mode switching and color profile registration' },
  'gh-32x1ue-manual': { name: '32X1UE-W16 user manual', note: 'Covers dual-mode switching and the OSD menu' },
  'gh-27q1f-driver': { name: '27Q1F driver (INF)', note: 'Model recognition and gamut mapping on Windows' },
  'gh-27q1f-manual': { name: '27Q1F user manual', note: 'Covers OSD tuning and HDR setup' },
  'gh-24h1-icc': { name: '24H1 color profile (ICC)', note: 'Includes the factory-calibrated sRGB profile' },
  'gh-arm01-manual': { name: 'GH-ARM01 installation manual', note: 'Covers VESA 75/100 mounting and load limits' },
}

/* ---------------- 常见问题 ---------------- */

const FAQS_EN: Record<string, Overlay> = {
  'faq-download-login': {
    q: 'Do I need an account to download monitor files?',
    a: 'No. Public firmware, manuals, ICC color profiles and tuning software are open to guests; only account-related config sync and ticket tracking require sign-in.',
  },
  'faq-download-old': {
    q: 'After a new firmware is uploaded, can I still download the old one?',
    a: 'Yes. Publishing a new version does not remove the old one; history stays on record until an operator withdraws it.',
  },
  'faq-download-slow': {
    q: 'The download is slow or interrupted — what should I do?',
    a: 'Try another network and retry; for large installers (such as the tuning software) avoid switching networks mid-download. If it keeps failing, submit a ticket with the file name.',
  },
  'faq-driver-install': {
    q: 'Should I uninstall the old version before updating the monitor firmware?',
    a: 'Usually not needed. The new firmware overwrites in place and keeps your settings; if the monitor is not detected, re-scan it in Center, then update.',
  },
  'faq-pair-24g': {
    q: 'Why can’t I reach 540Hz over DP 2.1?',
    a: 'Use the bundled full-speed DP 2.1 (80 Gbps) cable and enable the refresh rate in both the OSD and the GPU driver; cables or adapters with insufficient bandwidth lock to a lower rate. Submit a ticket if it still falls short.',
  },
  'faq-pair-multi': {
    q: 'How do I switch a dual-mode monitor between 4K and high refresh?',
    a: 'Use the OSD menu or the «Dual-mode» switch in Center to pick 4K@165 or FHD@330; the system re-detects resolution and refresh rate, so confirm cable and port bandwidth as well.',
  },
  'faq-pair-notfound': {
    q: 'Center cannot find my monitor — what should I check?',
    a: 'Connect directly by DP or USB-C (no dock) and confirm the monitor is on the matching input; if it still does not respond, get the latest tuning software from Support → Downloads and retry.',
  },
  'faq-fw-fail': {
    q: 'Can I still use the monitor after a failed firmware update?',
    a: 'Yes. An interrupted update does not erase the original firmware; the monitor keeps working and Center will prompt a retry.',
  },
  'faq-fw-check': {
    q: 'How do I know if new firmware is available?',
    a: 'Open Center → Firmware update to see the current version and available updates; new versions are listed with change notes.',
  },
  'faq-warranty-period': {
    q: 'How long is the OLED monitor warranty, and does it cover burn-in?',
    a: 'Three-year warranty including OLED burn-in protection. Find the serial number on the bottom label or the box, then use «Warranty status» to see the remaining period.',
  },
  'faq-warranty-serial': {
    q: 'Where can I find the serial number?',
    a: 'It is usually on the monitor’s bottom label or the box barcode; it is also shown on the device info page in Center.',
  },
  'faq-warranty-repair': {
    q: 'What should I prepare before sending a unit in for repair?',
    a: 'First submit a ticket with the model and symptom, attaching photos or a video. After the reply, ship as instructed and keep the tracking number.',
  },
}

/* ---------------- 型号支持 ---------------- */

const MODELS_EN: Record<string, Overlay> = {
  'gh-54027x1qe': {
    summary: '26.5" 2K@540Hz flagship OLED gaming monitor with full-speed DP 2.1 and Center tuning.',
    guides: [
      { title: 'Quick start', desc: 'Unboxing, stand mounting and full-speed DP 2.1 connection.' },
      { title: 'OSD & color tuning', desc: 'Adjust brightness, gamut and HDR, including presets.' },
      { title: 'Port troubleshooting', desc: 'Steps for not reaching full refresh, no signal and not detected.' },
    ],
  },
  'gh-32x1ue': {
    summary: '31.5" 4K@165 / FHD@330 dual-mode OLED gaming monitor for both quality and competition.',
    guides: [
      { title: 'Dual-mode switching', desc: 'Switching and trade-offs between 4K@165 and FHD@330.' },
      { title: 'OSD & HDR', desc: 'Using HDR tuning and peak brightness settings.' },
      { title: 'Firmware update', desc: 'Firmware upgrade via Center, including retry after failure.' },
    ],
  },
  'gh-27q1f': {
    summary: '27" 2K 200Hz Fast IPS gaming monitor with HDMI 2.1 for daily use and competition.',
    guides: [
      { title: 'Quick start', desc: 'Unboxing, stand mounting and HDMI 2.1 connection basics.' },
      { title: 'Color & eye care', desc: 'Gamut, brightness and low blue light settings.' },
      { title: 'Port troubleshooting', desc: 'Path for no signal, low refresh rate and not detected.' },
    ],
  },
  'gh-arm01': {
    summary: 'Monitor arm supporting VESA 75/100 and 9 kg, with mounting and adjustment guidance.',
    guides: [
      { title: 'Mounting & adjustment', desc: 'VESA 75/100 mounting and gas-spring adjustment.' },
      { title: 'Load & fit', desc: 'Load range and common size pairings.' },
    ],
  },
}

/* ---------------- 商业合作：场景 ---------------- */

const BIZ_SCENES_EN: Record<string, Overlay> = {
  'esports-room': {
    eyebrow: 'Esports',
    title: 'Esports arena bundle',
    desc: 'Monitors bundled by seat count and budget for team training rooms and arena battle zones, balancing high refresh and response.',
    points: [
      'Configure gaming monitors per seat with unified firmware and display profiles',
      'Central monitor management and cable routing to cut desk clutter',
      'Reserve trial and backup seats for quick swaps before matches',
    ],
    products: [
      { id: 'gh-54027x1qe', name: 'Lightning 540Hz OLED Gaming Monitor' },
      { id: 'gh-32x1ue', name: 'Meta Dual-mode 4K Gaming Monitor' },
      { id: 'gh-27q1f', name: '27" 2K Gaming Monitor' },
    ],
  },
  'creator-desk': {
    eyebrow: 'Content creation',
    title: 'Creator desk bundle',
    desc: 'For editing and grading desks, prioritizing color accuracy and wide gamut and zoning the desk around the workflow.',
    points: [
      'Separate main and reference zones to reduce switching cost',
      'Native 10-bit and 99% DCI-P3 for grading needs',
      'A large monitor with an arm to unify the desk look',
    ],
    products: [
      { id: 'gh-32x1ue', name: 'Meta Dual-mode 4K Gaming Monitor' },
      { id: 'gh-54027x1qe', name: 'Lightning 540Hz OLED Gaming Monitor' },
      { id: 'gh-arm01', name: 'Monitor Arm' },
    ],
  },
  'office-desk': {
    eyebrow: 'Enterprise',
    title: 'Enterprise office desk bundle',
    desc: 'For bulk corporate purchases, unifying models and ports for centralized IT management and asset tracking.',
    points: [
      'Unified models and ports to lower spare-part and training cost',
      'HDMI 2.1 / DP 2.1 for meeting rooms and desk switching',
      'Bulk firmware delivery and device-list templates',
    ],
    products: [
      { id: 'gh-27q1f', name: '27" 2K Gaming Monitor' },
      { id: 'gh-24h1', name: '24" 200Hz Gaming Monitor' },
      { id: 'gh-arm01', name: 'Monitor Arm' },
    ],
  },
}

/* ---------------- 商业合作：案例 ---------------- */

const BIZ_CASES_EN: Record<string, Overlay> = {
  'campus-esports-2026': {
    title: 'Campus esports event partnership',
    partner: 'South China Campus Esports Alliance',
    summary: 'Providing match monitors and on-site experience zones for campus and regional leagues, unifying display specs to reduce home/away differences.',
  },
  'venue-experience-2025': {
    title: 'Co-built experience zone in an esports venue',
    partner: 'Shenzhen Jingjie Esports Arena',
    summary: 'Co-building a trial zone with unified display materials and trial-seat display setups, supporting foot traffic and trial sign-ups.',
  },
  'cobrand-series-2026': {
    title: 'Co-branded monitor program',
    partner: 'NOVA Design Studio',
    summary: 'Jointly developing co-branded colorways and packaging visuals, rolled out on-site and online across launch and long-tail phases.',
  },
}

/* ---------------- 商业合作：体验点 ---------------- */

const BIZ_VENUES_EN: Record<string, Overlay> = {
  'sz-flagship': {
    name: 'Guanghun · Shenzhen Flagship Experience Center',
    address: 'Keyuan Avenue, Nanshan, Shenzhen · Guanghun Flagship Center',
  },
  'sh-experience': {
    name: 'Guanghun · Shanghai Nanjing Road Experience Point',
    address: 'East Nanjing Road, Huangpu, Shanghai · Digital Experience Street',
  },
  'bj-service': {
    name: 'Guanghun · Beijing Authorized Service Point',
    address: 'Zhongguancun Street, Haidian, Beijing · Authorized Service Point',
  },
  'cd-experience': {
    name: 'Guanghun · Chengdu Chunxi Road Experience Point',
    address: 'Chunxi Road, Jinjiang, Chengdu · Esports-themed store',
  },
  'gz-service': {
    name: 'Guanghun · Guangzhou Authorized Service Point',
    address: 'Tianhe Road, Tianhe, Guangzhou · Authorized Service Point',
  },
}
