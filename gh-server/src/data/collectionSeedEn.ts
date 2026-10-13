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
  'gh-m900-pro': { name: 'Wireless Gaming Mouse', specs: ['26,000 DPI', '58 g'], flag: 'Flagship' },
  'gh-m700': { name: 'Wired Gaming Mouse', specs: ['20,000 DPI', '62 g'] },
  'gh-m500': { name: 'Lightweight Gaming Mouse', specs: ['18,000 DPI', '48 g'] },
  'gh-k870': { name: 'Tri-mode Mechanical Keyboard', specs: ['87 keys', 'Tri-mode'] },
  'gh-k650': { name: 'Compact Mechanical Keyboard', specs: ['65% layout', 'Wireless'] },
  'gh-h500': { name: 'Gaming Headset', specs: ['50 mm', '2.4 G'] },
  'gh-h300': { name: 'Lightweight Gaming Headset', specs: ['40 mm', 'Wired'] },
  'gh-p400': { name: 'Oversized Mouse Pad', specs: ['900×400', 'Spill-resistant'] },
}

/* ---------------- 天梯榜（仅译指标名与行内产品名；unit/分数保持原样） ---------------- */

const RANKINGS_EN: Record<string, Overlay> = {
  overall: {
    label: 'Overall',
    rows: [
      { rank: '01', model: 'GH-M900 PRO', name: 'Wireless Gaming Mouse', score: 96.4 },
      { rank: '02', model: 'GH-M700', name: 'Wired Gaming Mouse', score: 91.2 },
      { rank: '03', model: 'GH-M500', name: 'Lightweight Gaming Mouse', score: 88.7 },
      { rank: '04', model: 'GH-K870', name: 'Tri-mode Mechanical Keyboard', score: 85.3 },
      { rank: '05', model: 'GH-H500', name: 'Gaming Headset', score: 82.9 },
      { rank: '06', model: 'GH-K650', name: 'Compact Mechanical Keyboard', score: 79.6 },
      { rank: '07', model: 'GH-H300', name: 'Lightweight Gaming Headset', score: 74.1 },
      { rank: '08', model: 'GH-P400', name: 'Oversized Mouse Pad', score: 70.0, tied: true },
      { rank: '08', model: 'GH-P300', name: 'Standard Mouse Pad', score: 70.0 },
      { rank: '—', model: 'GH-M100', name: 'Entry Gaming Mouse', score: null },
    ],
  },
  sensor: {
    label: 'Sensor accuracy',
    rows: [
      { rank: '01', model: 'GH-M900 PRO', name: 'Wireless Gaming Mouse', score: 97.1 },
      { rank: '02', model: 'GH-M700', name: 'Wired Gaming Mouse', score: 92.8 },
      { rank: '03', model: 'GH-M800', name: 'Flagship Wireless Gaming Mouse', score: 89.6 },
      { rank: '04', model: 'GH-M500', name: 'Lightweight Gaming Mouse', score: 86.4, tied: true },
      { rank: '04', model: 'GH-M600', name: 'Lightweight Wireless Gaming Mouse', score: 86.4 },
      { rank: '—', model: 'GH-M100', name: 'Entry Gaming Mouse', score: null },
    ],
  },
  battery: {
    label: 'Battery life',
    rows: [
      { rank: '01', model: 'GH-M900 PRO', name: 'Wireless Gaming Mouse', score: 120 },
      { rank: '02', model: 'GH-K870', name: 'Tri-mode Mechanical Keyboard', score: 96 },
      { rank: '03', model: 'GH-M800', name: 'Flagship Wireless Gaming Mouse', score: 88 },
      { rank: '04', model: 'GH-M600', name: 'Lightweight Wireless Gaming Mouse', score: 58, tied: true },
      { rank: '04', model: 'GH-M500', name: 'Lightweight Gaming Mouse', score: 58 },
      { rank: '05', model: 'GH-H500', name: 'Gaming Headset', score: 42 },
      { rank: '—', model: 'GH-M700', name: 'Wired Gaming Mouse', score: null },
    ],
  },
  latency: {
    label: 'Latency',
    rows: [
      { rank: '01', model: 'GH-M900 PRO', name: 'Wireless Gaming Mouse', score: 0.6 },
      { rank: '02', model: 'GH-M700', name: 'Wired Gaming Mouse', score: 0.9 },
      { rank: '03', model: 'GH-M800', name: 'Flagship Wireless Gaming Mouse', score: 1.2 },
      { rank: '04', model: 'GH-K870', name: 'Tri-mode Mechanical Keyboard', score: 1.8 },
      { rank: '05', model: 'GH-M600', name: 'Lightweight Wireless Gaming Mouse', score: 2.4, tied: true },
      { rank: '05', model: 'GH-H300', name: 'Lightweight Gaming Headset', score: 2.4 },
      { rank: '06', model: 'GH-H500', name: 'Gaming Headset', score: 12.4 },
      { rank: '—', model: 'GH-M100', name: 'Entry Gaming Mouse', score: null },
    ],
  },
}

/* ---------------- 文章 / 新闻 ---------------- */

const ARTICLES_EN: Record<string, Overlay> = {
  'latency-end-to-end': {
    title: 'Wireless mouse end-to-end latency: three flagships compared',
    categoryLabel: 'Review',
    tag: 'Latency test',
    desc: 'Measuring end-to-end latency segment by segment on three wireless mice under identical conditions, reporting both median and 95th percentile.',
    meta: 'Tested · Method v2',
    body:
      '<h2>Purpose & environment</h2>' +
      '<p>This test quantifies the end-to-end latency of three wireless mice — from physical click to system response — under identical conditions, and breaks the total into explainable segments.</p>' +
      '<ul><li>Room held at 22–24 °C;</li><li>Receiver fixed 30 cm from the mouse;</li><li>Polling rate set to the highest level.</li></ul>' +
      '<h2>What latency is made of</h2>' +
      '<p>End-to-end latency combines sensor sampling, main-controller processing, wireless transmission, receiver solving and OS scheduling. A single total cannot locate the bottleneck.</p>' +
      '<h2>Conclusion</h2>' +
      '<p>In competitive play, a <em>stable high percentile</em> matters more than an occasional single-lowest value. Full raw data is available on the rankings page.</p>',
  },
  'tri-mode-keyboard-latency': {
    title: 'Tri-mode keyboard latency: 2.4G vs Bluetooth vs wired',
    categoryLabel: 'Review',
    tag: 'Connection test',
    desc: 'Typing the same tri-mode keyboard across three connection modes to compare typing latency, jitter and battery life.',
    meta: 'Tested · Method v2',
    body:
      '<h2>How the modes differ</h2>' +
      '<p>The same keyboard was used in <strong>wired / 2.4G / Bluetooth</strong> modes to compare typing latency, jitter and battery life.</p>' +
      '<h2>Typing latency</h2>' +
      '<p>Each mode logged 1,000 valid samples with median and jitter range; differences widen with long runs and fast key combos.</p>' +
      '<h2>How to choose</h2>' +
      '<p>Bluetooth for office and creation, 2.4G for competitive play, and wired as the primary choice at a fixed desk.</p>',
  },
  'driver-firmware-guide': {
    title: 'Driver & firmware upgrade guide: from detection to rollback',
    categoryLabel: 'Guide',
    tag: 'Firmware guide',
    desc: 'A step-by-step walkthrough of identifying the device, verifying the firmware version, upgrading, and safely rolling back if something goes wrong.',
    meta: 'Guide · Illustrated',
    body:
      '<h2>Before you start</h2>' +
      '<p>Confirm the model and current firmware version in the driver, and keep the device charged or use a wired connection.</p>' +
      '<ol><li>Close other devices sharing the receiver;</li><li>Do not unplug the receiver during the upgrade;</li><li>Do not power off the host mid-upgrade.</li></ol>' +
      '<h2>Upgrade & rollback</h2>' +
      '<p>Confirm the prompt and wait for the write to finish; the device restarts automatically. To roll back, get the historical firmware from the download center and write it the same way.</p>' +
      '<blockquote><p>Historical versions are not removed when a new version ships, so you can roll back at any time.</p></blockquote>',
  },
  'test-methodology': {
    title: 'Why we publish our test methodology: the value of reproducibility',
    categoryLabel: 'Insight',
    tag: 'Methodology',
    desc: 'Publishing devices, environment, sample size and criteria lets any lab reproduce our numbers instead of just trusting the conclusion.',
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
    title: 'Report rate vs sample rate: the real-world difference',
    categoryLabel: 'Insight',
    tag: 'Specs explained',
    desc: 'Report rate and sample rate are often conflated; this piece separates their definitions, measurement and real impact.',
    meta: 'Explained · Data',
    body:
      '<h2>What the terms mean</h2>' +
      '<p>Report rate is how often the device reports its position to the host; sample rate is how often the sensor captures a frame. Related, but not the same.</p>' +
      '<h2>Impact on experience</h2>' +
      '<p>A higher report rate gives denser position tracks during fast movement, with diminishing returns; <em>stability</em> often matters more than the rated ceiling.</p>' +
      '<h2>Practical advice</h2>' +
      '<p>Start from the vendor default, then adjust to feel and evaluate after sustained use.</p>',
  },
  'brand-2026-roadmap': {
    title: 'Guanghun 2026 roadmap: from latency to ecosystem',
    categoryLabel: 'Brand',
    tag: 'Roadmap',
    desc: 'Three threads — low latency, multi-device connectivity and software ecosystem — and the trade-offs for the next generation.',
    meta: 'Brand · Roadmap',
    body:
      '<h2>Portfolio overview</h2>' +
      '<p>2026 centers on three threads: lower end-to-end latency, more reliable multi-device connectivity, and a more complete software ecosystem.</p>' +
      '<h2>Latency & connectivity</h2>' +
      '<p>On latency we move from chasing a single lowest value to improving <strong>high-percentile stability</strong>; on connectivity we harden multi-device switching.</p>' +
      '<h2>Next steps</h2>' +
      '<p>Specific requirements and timings follow the official final announcement; progress is tracked through the news and articles pages.</p>',
  },
}

/* ---------------- 下载中心 ---------------- */

const DOWNLOADS_EN: Record<string, Overlay> = {
  'center-win': { name: 'Center Software · Windows installer', note: 'Supports Windows 10 / 11 (64-bit)' },
  'center-mac': { name: 'Center Software · macOS installer', note: 'Supports macOS 12 and later' },
  'm900-driver': { name: 'GH-M900 PRO driver', note: 'Includes DPI, polling rate and macro tuning' },
  'm900-firmware': { name: 'GH-M900 PRO firmware update', note: 'Improves wireless connection stability' },
  'm700-driver': { name: 'GH-M700 driver', note: 'Also tunes GH-M500 parameters' },
  'k870-driver': { name: 'GH-K870 driver', note: 'Supports key remapping and macros' },
  'k870-firmware': { name: 'GH-K870 firmware update', note: 'Fixes rare disconnects after wake' },
  'k870-manual': { name: 'GH-K870 user manual', note: 'Covers tri-mode connection and pairing' },
  'h500-manual': { name: 'GH-H500 user manual', note: 'Covers 2.4G pairing and microphone' },
  'p400-manual': { name: 'GH-P400 user manual', note: 'Includes cleaning and care tips' },
}

/* ---------------- 常见问题 ---------------- */

const FAQS_EN: Record<string, Overlay> = {
  'faq-download-login': {
    q: 'Do I need an account to download files?',
    a: 'No. Public drivers, firmware and manuals are open to guests; only account-related config sync and ticket tracking require sign-in.',
  },
  'faq-download-old': {
    q: 'After a new version is uploaded, can I still download the old one?',
    a: 'Yes. Publishing a new version does not remove the old one; history stays on record until an operator withdraws it.',
  },
  'faq-download-slow': {
    q: 'The download is slow or interrupted — what should I do?',
    a: 'Try another network and retry; for large installers avoid switching networks mid-download. If it keeps failing, submit a ticket with the file name.',
  },
  'faq-driver-install': {
    q: 'Should I uninstall the old driver before installing a new one?',
    a: 'Usually not needed. The new driver overwrites in place and keeps your settings; if the device is not detected, uninstall the old version first, then reinstall.',
  },
  'faq-pair-24g': {
    q: 'My wireless device will not enter 2.4G mode — what now?',
    a: 'Make sure the receiver is plugged in and the device is in wired mode, then press the mode switch to pair. If the indicator does not blink, charge it first and retry.',
  },
  'faq-pair-multi': {
    q: 'How do I switch a tri-mode keyboard between devices?',
    a: 'The keyboard stores multiple Bluetooth pairings; use the key combo to switch between paired devices. Center shows the active channel.',
  },
  'faq-pair-notfound': {
    q: 'Center cannot find my device — what should I check?',
    a: 'Connect directly by USB (no hub) and confirm wired mode; for wireless devices, finish pairing first, then refresh the device list in Center.',
  },
  'faq-fw-fail': {
    q: 'Can I still use the device after a failed firmware update?',
    a: 'Yes. An interrupted update does not erase the original firmware; the device keeps working and Center will prompt a retry.',
  },
  'faq-fw-check': {
    q: 'How do I know if new firmware is available?',
    a: 'Open Center → Firmware update to see the current version and available updates; new versions are listed with change notes.',
  },
  'faq-warranty-period': {
    q: 'How do I check whether my product is still under warranty?',
    a: 'Find the serial number on the bottom label or the box, then use “Warranty status” to see the remaining period. If it fails, submit a ticket with proof of purchase.',
  },
  'faq-warranty-serial': {
    q: 'Where can I find the serial number?',
    a: 'It is usually on the bottom label or the box barcode; some wireless devices also show it on the device info page in Center.',
  },
  'faq-warranty-repair': {
    q: 'What should I prepare before sending a unit in for repair?',
    a: 'First submit a ticket with the model and symptom, attaching photos or a video. After the reply, ship as instructed and keep the tracking number.',
  },
}

/* ---------------- 型号支持 ---------------- */

const MODELS_EN: Record<string, Overlay> = {
  'gh-m900-pro': {
    summary: 'Flagship wireless gaming mouse with Center tuning and over-the-air firmware updates.',
    guides: [
      { title: 'Quick start', desc: 'Unboxing, charging and 2.4G pairing.' },
      { title: 'Center tuning', desc: 'Adjust DPI, polling rate and macros, including presets.' },
      { title: 'Connection troubleshooting', desc: 'Steps for device not found, disconnects and high latency.' },
    ],
  },
  'gh-k870': {
    summary: 'Tri-mode mechanical keyboard with key remapping, macros and multi-device switching.',
    guides: [
      { title: 'Connection & pairing', desc: 'Switching between wired, Bluetooth and 2.4G.' },
      { title: 'Keys & macros', desc: 'Per-key remapping and macro recording basics.' },
      { title: 'Firmware update', desc: 'Firmware upgrade via Center, including retry after failure.' },
    ],
  },
  'gh-h500': {
    summary: 'Wireless gaming headset with 2.4G low-latency connection and microphone tuning.',
    guides: [
      { title: 'Quick start', desc: 'Charging, power and 2.4G pairing basics.' },
      { title: 'Microphone tuning', desc: 'Volume, monitoring and noise-reduction settings.' },
      { title: 'Connection troubleshooting', desc: 'Path for no sound, dropouts and device not found.' },
    ],
  },
  'gh-p400': {
    summary: 'Oversized mouse pad with cleaning and care guidance.',
    guides: [
      { title: 'Cleaning & care', desc: 'Routine cleaning and pitfalls to avoid.' },
      { title: 'Size & fit', desc: 'Desk size reference and common pairings.' },
    ],
  },
}

/* ---------------- 商业合作：场景 ---------------- */

const BIZ_SCENES_EN: Record<string, Overlay> = {
  'esports-room': {
    eyebrow: 'Esports',
    title: 'Esports arena bundle',
    desc: 'Peripherals bundled by seat count and budget for team training rooms and arena battle zones, balancing low latency and long-session comfort.',
    points: [
      'Configure keyboards, mice and headsets per seat with unified firmware and parameter profiles',
      'Central storage and charging for wireless gear to cut desk cable clutter',
      'Reserve trial and backup seats for quick swaps before matches',
    ],
    products: [
      { id: 'gh-m900-pro', name: 'GH-M900 PRO Wireless Gaming Mouse' },
      { id: 'gh-k870', name: 'GH-K870 Tri-mode Mechanical Keyboard' },
      { id: 'gh-h500', name: 'GH-H500 Gaming Headset' },
    ],
  },
  'creator-desk': {
    eyebrow: 'Content creation',
    title: 'Creator desk bundle',
    desc: 'For editing and streaming desks, balancing key feel with silence and zoning the desk around the creation workflow.',
    points: [
      'Separate main and hotkey zones to reduce mis-taps and switching cost',
      'Low-noise switches and a quiet headset for long recording sessions',
      'A large mouse pad to unify the desk look and aid device placement',
    ],
    products: [
      { id: 'gh-k870', name: 'GH-K870 Tri-mode Mechanical Keyboard' },
      { id: 'gh-m900-pro', name: 'GH-M900 PRO Wireless Gaming Mouse' },
      { id: 'gh-p400', name: 'GH-P400 Oversized Mouse Pad' },
    ],
  },
  'office-desk': {
    eyebrow: 'Enterprise',
    title: 'Enterprise office desk bundle',
    desc: 'For bulk corporate purchases, unifying key layout and connectivity for centralized IT management and asset tracking.',
    points: [
      'Unified models and colors to lower spare-part and training cost',
      'Multi-mode connectivity for meeting rooms and desk switching',
      'Bulk firmware delivery and device-list templates',
    ],
    products: [
      { id: 'gh-k650', name: 'GH-K650 Compact Mechanical Keyboard' },
      { id: 'gh-m500', name: 'GH-M500 Lightweight Gaming Mouse' },
      { id: 'gh-h300', name: 'GH-H300 Lightweight Gaming Headset' },
    ],
  },
}

/* ---------------- 商业合作：案例 ---------------- */

const BIZ_CASES_EN: Record<string, Overlay> = {
  'campus-esports-2026': {
    title: 'Campus esports event partnership',
    partner: 'South China Campus Esports Alliance',
    summary: 'Providing match PCs and on-site experience zones for campus and regional leagues, unifying peripheral specs to reduce home/away differences.',
  },
  'venue-experience-2025': {
    title: 'Co-built experience zone in an esports venue',
    partner: 'Shenzhen Jingjie Esports Arena',
    summary: 'Co-building a trial zone with unified display materials and trial-seat setups, supporting foot traffic and trial sign-ups.',
  },
  'cobrand-series-2026': {
    title: 'Co-branded peripherals program',
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
