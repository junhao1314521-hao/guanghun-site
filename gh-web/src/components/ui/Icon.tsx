/** 站点图标：全部为线性 SVG，颜色继承 currentColor，尺寸由父级控制
 *  accent：双色机制开关 —— 开启后，图标内参与强调的「一笔 / 一个局部」会带上 .ic-accent 类，
 *  由样式统一改用品牌色（--color-accent-solid）；主体笔画仍继承 currentColor（中性色）。
 *  同一套机制被「固件与驱动」条目图标与「信任条」图标复用，不写两份。 */
type IconProps = { size?: number; className?: string; accent?: boolean }

const box = (size: number) => ({ width: size, height: size, viewBox: `0 0 ${size} ${size}` })

/**
 * 把坐标对齐到 0.5px 网格（顶栏右侧这组图标专用，配合 1.5px 描边使用）。
 * 因为 box(size) 已保证「渲染尺寸 == viewBox」，1.5px 描边本就按 1:1 渲染（实际线宽 1.5px）；
 * 进一步把中心点落在 0.5 网格上，可让描边呈「1px 实心芯 + 淡边」，比落在任意小数上更锐利、粗细更匀。
 */
const snap = (v: number) => Math.round(v * 2) / 2

/** 搜索图标（放大镜）。 */
export function IconSearch({ size = 18, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <circle cx={snap(size * 0.42)} cy={snap(size * 0.42)} r={snap(size * 0.28)} stroke="currentColor" strokeWidth="1.5" />
      <path d={`M${snap(size * 0.6)} ${snap(size * 0.6)}L${snap(size * 0.86)} ${snap(size * 0.86)}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 地球图标（语言/地区）。 */
export function IconGlobe({ size = 18, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <circle cx={size / 2} cy={size / 2} r={size * 0.36} stroke="currentColor" strokeWidth="1.5" />
      <path
        d={`M${size * 0.14} ${size / 2}h${size * 0.72}M${size / 2} ${size * 0.14}c${size * 0.1} ${size * 0.11} ${size * 0.1} ${size * 0.61} 0 ${size * 0.72}M${size / 2} ${size * 0.14}c-${size * 0.1} ${size * 0.11} -${size * 0.1} ${size * 0.61} 0 ${size * 0.72}`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** 太阳图标（浅色主题）。 */
export function IconSun({ size = 18, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <circle cx={size / 2} cy={size / 2} r={snap(size * 0.21)} stroke="currentColor" strokeWidth="1.5" />
      {/* 八向光芒：统一 1.5px（此前为 1.4px，与其他图标粗细不匀） */}
      <path
        d={
          `M${size / 2} ${snap(size * 0.06)}V${snap(size * 0.18)}` +
          `M${size / 2} ${snap(size * 0.82)}V${snap(size * 0.94)}` +
          `M${snap(size * 0.06)} ${size / 2}H${snap(size * 0.18)}` +
          `M${snap(size * 0.82)} ${size / 2}H${snap(size * 0.94)}` +
          `M${snap(size * 0.19)} ${snap(size * 0.19)}L${snap(size * 0.27)} ${snap(size * 0.27)}` +
          `M${snap(size * 0.73)} ${snap(size * 0.73)}L${snap(size * 0.81)} ${snap(size * 0.81)}` +
          `M${snap(size * 0.81)} ${snap(size * 0.19)}L${snap(size * 0.73)} ${snap(size * 0.27)}` +
          `M${snap(size * 0.27)} ${snap(size * 0.73)}L${snap(size * 0.19)} ${snap(size * 0.81)}`
        }
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** 月亮图标（深色主题）。 */
export function IconMoon({ size = 18, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${snap(size * 0.72)} ${snap(size * 0.62)}A${snap(size * 0.3)} ${snap(size * 0.3)} 0 0 1 ${snap(size * 0.38)} ${snap(size * 0.28)}a${snap(size * 0.31)} ${snap(size * 0.31)} 0 1 0 ${snap(size * 0.34)} ${snap(size * 0.34)}Z`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 客服耳机图标。 */
export function IconSupport({ size = 18, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${snap(size * 0.22)} ${snap(size * 0.39)}a${snap(size * 0.28)} ${snap(size * 0.28)} 0 0 1 ${snap(size * 0.56)} 0v${snap(size * 0.17)}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x={snap(size * 0.14)} y={snap(size * 0.39)} width={snap(size * 0.17)} height={snap(size * 0.25)} rx={snap(size * 0.07)} stroke="currentColor" strokeWidth="1.5" />
      <rect x={snap(size * 0.69)} y={snap(size * 0.39)} width={snap(size * 0.17)} height={snap(size * 0.25)} rx={snap(size * 0.07)} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

/** 用户头像图标。 */
export function IconAccount({ size = 18, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <circle cx={size / 2} cy={snap(size * 0.33)} r={snap(size * 0.17)} stroke="currentColor" strokeWidth="1.5" />
      <path d={`M${snap(size * 0.19)} ${snap(size * 0.83)}c${snap(size * 0.03)} -${snap(size * 0.16)} ${snap(size * 0.16)} -${snap(size * 0.23)} ${snap(size * 0.31)} -${snap(size * 0.23)}s${snap(size * 0.28)} ${snap(size * 0.07)} ${snap(size * 0.31)} ${snap(size * 0.23)}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 店铺 / 购物袋（顶栏「商城」入口与渠道浮层 / 抽屉用）：梯形袋身 + 提手，1.5px 描边、圆头圆角 */
export function IconShop({ size = 18, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${snap(size * 0.26)} ${snap(size * 0.37)}h${snap(size * 0.48)}l${snap(size * 0.06)} ${snap(size * 0.45)}a${snap(size * 0.06)} ${snap(size * 0.06)} 0 0 1 -${snap(size * 0.06)} ${snap(size * 0.07)}h-${snap(size * 0.48)}a${snap(size * 0.06)} ${snap(size * 0.06)} 0 0 1 -${snap(size * 0.06)} -${snap(size * 0.07)}Z`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d={`M${snap(size * 0.37)} ${snap(size * 0.37)}v-${snap(size * 0.07)}a${snap(size * 0.13)} ${snap(size * 0.13)} 0 0 1 ${snap(size * 0.26)} 0v${snap(size * 0.07)}`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 汉堡菜单图标。 */
export function IconMenu({ size = 18, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${size * 0.11} ${size * 0.25}h${size * 0.78}M${size * 0.11} ${size * 0.5}h${size * 0.78}M${size * 0.11} ${size * 0.75}h${size * 0.78}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 关闭（叉号）图标。 */
export function IconClose({ size = 18, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${size * 0.22} ${size * 0.22}l${size * 0.56} ${size * 0.56}M${size * 0.78} ${size * 0.22}L${size * 0.22} ${size * 0.78}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 向下折叠箭头图标。 */
export function IconChevronDown({ size = 14, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${snap(size * 0.25)} ${snap(size * 0.38)}L${snap(size * 0.5)} ${snap(size * 0.63)}l${snap(size * 0.25)} -${snap(size * 0.25)}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 勾选（下拉选中态 / 复选项） */
export function IconCheck({ size = 14, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${size * 0.22} ${size * 0.52}L${size * 0.42} ${size * 0.72}L${size * 0.78} ${size * 0.31}`} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 左箭头图标。 */
export function IconChevronLeft({ size = 16, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${size * 0.63} ${size * 0.19}L${size * 0.31} ${size * 0.5}L${size * 0.63} ${size * 0.81}`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 右箭头图标。 */
export function IconChevronRight({ size = 16, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${size * 0.38} ${size * 0.19}L${size * 0.69} ${size * 0.5}L${size * 0.38} ${size * 0.81}`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 拖拽手柄（六点网格），用于区块排序拖动，替代文字符号 ⠿ */
export function IconGrip({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="currentColor" aria-hidden="true" className={className}>
      <circle cx={s * 0.38} cy={s * 0.3} r={s * 0.075} />
      <circle cx={s * 0.62} cy={s * 0.3} r={s * 0.075} />
      <circle cx={s * 0.38} cy={s * 0.5} r={s * 0.075} />
      <circle cx={s * 0.62} cy={s * 0.5} r={s * 0.075} />
      <circle cx={s * 0.38} cy={s * 0.7} r={s * 0.075} />
      <circle cx={s * 0.62} cy={s * 0.7} r={s * 0.075} />
    </svg>
  )
}

/** 上移（箭头向上），替代文字符号 ↑ */
export function IconArrowUp({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${s / 2} ${s * 0.82}V${s * 0.22}M${s * 0.3} ${s * 0.42}L${s / 2} ${s * 0.22}l${s * 0.2} ${s * 0.2}`}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 下移（箭头向下），替代文字符号 ↓ */
export function IconArrowDown({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${s / 2} ${s * 0.18}v${s * 0.6}M${s * 0.3} ${s * 0.58}L${s / 2} ${s * 0.78}l${s * 0.2} -${s * 0.2}`}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 加号（新增区块 / 插入落点） */
export function IconPlus({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${s / 2} ${s * 0.2}v${s * 0.6}M${s * 0.2} ${s / 2}h${s * 0.6}`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/** 进入全屏（四角向外） */
export function IconExpand({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${s * 0.16} ${s * 0.4}V${s * 0.16}h${s * 0.24}M${s * 0.6} ${s * 0.16}h${s * 0.24}v${s * 0.24}M${s * 0.84} ${s * 0.6}v${s * 0.24}h-${s * 0.24}M${s * 0.4} ${s * 0.84}H${s * 0.16}v-${s * 0.24}`}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 退出全屏（四角向内） */
export function IconCollapse({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${s * 0.4} ${s * 0.16}v${s * 0.24}H${s * 0.16}M${s * 0.84} ${s * 0.4}h-${s * 0.24}V${s * 0.16}M${s * 0.6} ${s * 0.84}v-${s * 0.24}h${s * 0.24}M${s * 0.16} ${s * 0.6}h${s * 0.24}v${s * 0.24}`}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 电话图标。 */
export function IconPhone({ size = 15, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${size * 0.22} ${size * 0.16}h${size * 0.13}l${size * 0.06} ${size * 0.16} -${size * 0.08} ${size * 0.08}a${size * 0.6} ${size * 0.6} 0 0 0 ${size * 0.28} ${size * 0.28}l${size * 0.08} -${size * 0.08} ${size * 0.16} ${size * 0.06}v${size * 0.13}a${size * 0.09} ${size * 0.09} 0 0 1 -${size * 0.1} ${size * 0.09}C${size * 0.44} ${size * 0.9} ${size * 0.09} ${size * 0.56} ${size * 0.09} ${size * 0.26}A${size * 0.1} ${size * 0.1} 0 0 1 ${size * 0.22} ${size * 0.16}z`}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 邮件图标。 */
export function IconMail({ size = 15, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <rect x={size * 0.09} y={size * 0.19} width={size * 0.82} height={size * 0.63} rx={size * 0.09} stroke="currentColor" strokeWidth="1.3" />
      <path d={`M${size * 0.13} ${size * 0.28}l${size * 0.37} ${size * 0.25} ${size * 0.37} -${size * 0.25}`} stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

/** 定位图钉图标。 */
export function IconPin({ size = 15, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${size * 0.5} ${size * 0.91}s${size * 0.31} -${size * 0.27} ${size * 0.31} -${size * 0.53}a${size * 0.31} ${size * 0.31} 0 0 0 -${size * 0.62} 0c0 ${size * 0.26} ${size * 0.31} ${size * 0.53} ${size * 0.31} ${size * 0.53}z`} stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx={size * 0.5} cy={size * 0.37} r={size * 0.11} stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

/** 复制（两张叠放圆角矩形） */
export function IconCopy({ size = 15, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <rect x={size * 0.3} y={size * 0.12} width={size * 0.5} height={size * 0.5} rx={size * 0.09} stroke="currentColor" strokeWidth="1.3" />
      <path d={`M${size * 0.2} ${size * 0.42}v${size * 0.36}a${size * 0.09} ${size * 0.09} 0 0 0 ${size * 0.09} ${size * 0.09}h${size * 0.36}`} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

/** 导航（指向箭头） */
export function IconNavigate({ size = 15, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${size * 0.5} ${size * 0.14}L${size * 0.82} ${size * 0.84}L${size * 0.5} ${size * 0.68}L${size * 0.18} ${size * 0.84}Z`} stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

/* —— 服务入口卡图标（20px 线性）—— */
export function IconModel({ size = 20, className }: IconProps) {
  return <IconSearch size={size} className={className} />
}

/** 下载图标。 */
export function IconDownload({ size = 20, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${size * 0.5} ${size * 0.15}v${size * 0.45}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d={`M${size * 0.32} ${size * 0.43}L${size * 0.5} ${size * 0.61}l${size * 0.18} -${size * 0.18}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${size * 0.2} ${size * 0.78}h${size * 0.6}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 帮助（问号）图标。 */
export function IconHelp({ size = 20, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <circle cx={size / 2} cy={size / 2} r={size * 0.35} stroke="currentColor" strokeWidth="1.5" />
      <path d={`M${size * 0.4} ${size * 0.4}a${size * 0.1} ${size * 0.1} 0 1 1 ${size * 0.135} ${size * 0.095}c-${size * 0.025} ${size * 0.01} -${size * 0.035} ${size * 0.03} -${size * 0.035} ${size * 0.055}v${size * 0.015}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={size * 0.5} cy={size * 0.7} r={size * 0.045} fill="currentColor" />
    </svg>
  )
}

/** 对话气泡图标。 */
export function IconChat({ size = 20, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${size * 0.8} ${size * 0.48}c0 ${size * 0.15} -${size * 0.135} ${size * 0.275} -${size * 0.3} ${size * 0.275} -${size * 0.04} 0 -${size * 0.08} -0.005 -${size * 0.115} -0.02L${size * 0.2} ${size * 0.8}l${size * 0.05} -${size * 0.16}A${size * 0.275} ${size * 0.275} 0 0 1 ${size * 0.2} ${size * 0.48}c0 -${size * 0.15} ${size * 0.135} -${size * 0.275} ${size * 0.3} -${size * 0.275}s${size * 0.3} ${size * 0.125} ${size * 0.3} ${size * 0.275}z`} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

/* —— 服务支持页图标（20px 线性）—— */
export function IconChip({ size = 20, className, accent }: IconProps) {
  const s = size
  const ac = accent ? 'ic-accent' : undefined
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <rect x={s * 0.275} y={s * 0.275} width={s * 0.45} height={s * 0.45} rx={s * 0.08} stroke="currentColor" strokeWidth="1.5" />
      <path
        d={`M${s * 0.6} ${s * 0.15}v${s * 0.125}M${s * 0.4} ${s * 0.725}v${s * 0.125}M${s * 0.6} ${s * 0.725}v${s * 0.125}M${s * 0.15} ${s * 0.4}h${s * 0.125}M${s * 0.15} ${s * 0.6}h${s * 0.125}M${s * 0.725} ${s * 0.4}h${s * 0.125}M${s * 0.725} ${s * 0.6}h${s * 0.125}`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* 强调笔画：左上引脚用品牌色 */}
      <path d={`M${s * 0.4} ${s * 0.15}v${s * 0.125}`} className={ac} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 安全盾牌图标。 */
export function IconShield({ size = 20, className, accent }: IconProps) {
  const s = size
  const ac = accent ? 'ic-accent' : undefined
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${s * 0.5} ${s * 0.14}L${s * 0.8} ${s * 0.25}v${s * 0.22}c0 ${s * 0.17} -${s * 0.12} ${s * 0.3} -${s * 0.3} ${s * 0.39} -${s * 0.18} -${s * 0.09} -${s * 0.3} -${s * 0.22} -${s * 0.3} -${s * 0.39}V${s * 0.25}L${s * 0.5} ${s * 0.14}Z`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d={`M${s * 0.36} ${s * 0.5}L${s * 0.45} ${s * 0.59}L${s * 0.64} ${s * 0.39}`} className={ac} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 文档搜索图标。 */
export function IconDocSearch({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <rect x={s * 0.15} y={s * 0.275} width={s * 0.5} height={s * 0.5} rx={s * 0.08} stroke="currentColor" strokeWidth="1.5" />
      <path d={`M${s * 0.26} ${s * 0.425}h${s * 0.2}M${s * 0.26} ${s * 0.55}h${s * 0.12}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={s * 0.7} cy={s * 0.35} r={s * 0.16} stroke="currentColor" strokeWidth="1.5" />
      <path d={`M${s * 0.815} ${s * 0.465}L${s * 0.925} ${s * 0.575}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 带勾选的圆形图标。 */
export function IconCheckCircle({ size = 20, className, accent }: IconProps) {
  const s = size
  const ac = accent ? 'ic-accent' : undefined
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <circle cx={s * 0.5} cy={s * 0.5} r={s * 0.35} stroke="currentColor" strokeWidth="1.5" />
      <path d={`M${s * 0.34} ${s * 0.51}L${s * 0.45} ${s * 0.62}L${s * 0.66} ${s * 0.38}`} className={ac} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* —— 商业合作页图标（20px 线性）—— */
export function IconCube({ size = 20, className, accent }: IconProps) {
  const s = size
  const ac = accent ? 'ic-accent' : undefined
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${s * 0.15} ${s * 0.325}L${s * 0.5} ${s * 0.15}l${s * 0.35} ${s * 0.175}v${s * 0.35}L${s * 0.5} ${s * 0.85}l-${s * 0.35} -${s * 0.175}v-${s * 0.35}Z`} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={`M${s * 0.15} ${s * 0.325}L${s * 0.5} ${s * 0.5}l${s * 0.35} -${s * 0.175}M${s * 0.5} ${s * 0.5}v${s * 0.35}`} className={ac} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

/** 显示器图标。 */
export function IconMonitor({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <rect x={s * 0.15} y={s * 0.2} width={s * 0.7} height={s * 0.5} rx={s * 0.08} stroke="currentColor" strokeWidth="1.5" />
      <path d={`M${s * 0.35} ${s * 0.85}h${s * 0.3}M${s * 0.5} ${s * 0.7}v${s * 0.15}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 奖杯图标。 */
export function IconTrophy({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${s * 0.4} ${s * 0.15}h${s * 0.2}v${s * 0.16}l${s * 0.16} ${s * 0.32}A${s * 0.1} ${s * 0.1} 0 0 1 ${s * 0.67} ${s * 0.8}H${s * 0.33}a${s * 0.1} ${s * 0.1} 0 0 1 -${s * 0.09} -${s * 0.17}L${s * 0.4} ${s * 0.31}V${s * 0.15}Z`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d={`M${s * 0.25} ${s * 0.6}h${s * 0.5}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 学士帽图标。 */
export function IconCap({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${s * 0.5} ${s * 0.15}L${s * 0.15} ${s * 0.325}l${s * 0.35} ${s * 0.175}l${s * 0.35} -${s * 0.175}L${s * 0.5} ${s * 0.15}Z`} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={`M${s * 0.3} ${s * 0.425}v${s * 0.225}c0 ${s * 0.055} ${s * 0.09} ${s * 0.1} ${s * 0.2} ${s * 0.1}s${s * 0.2} -${s * 0.045} ${s * 0.2} -${s * 0.1}V${s * 0.425}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 书籍图标。 */
export function IconBook({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${s * 0.2} ${s * 0.75}V${s * 0.25}a${s * 0.08} ${s * 0.08} 0 0 1 ${s * 0.08} -${s * 0.08}H${s * 0.8}V${s * 0.65}H${s * 0.28}A${s * 0.08} ${s * 0.08} 0 0 0 ${s * 0.2} ${s * 0.73}`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d={`M${s * 0.375} ${s * 0.375}h${s * 0.25}M${s * 0.375} ${s * 0.5}h${s * 0.15}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 双圆交集图标。 */
export function IconVenn({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <circle cx={s * 0.375} cy={s * 0.5} r={s * 0.2} stroke="currentColor" strokeWidth="1.5" />
      <circle cx={s * 0.625} cy={s * 0.5} r={s * 0.2} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

/* —— 关于光魂页图标（20px 线性）—— */
export function IconClock({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <circle cx={s * 0.5} cy={s * 0.5} r={s * 0.35} stroke="currentColor" strokeWidth="1.5" />
      <path d={`M${s * 0.5} ${s * 0.325}v${s * 0.2}l${s * 0.125} ${s * 0.075}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* —— Center 软件页图标（20px 线性）—— */
export function IconGrid({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <rect x={s * 0.175} y={s * 0.175} width={s * 0.275} height={s * 0.275} rx={s * 0.06} stroke="currentColor" strokeWidth="1.5" />
      <rect x={s * 0.55} y={s * 0.175} width={s * 0.275} height={s * 0.275} rx={s * 0.06} stroke="currentColor" strokeWidth="1.5" />
      <rect x={s * 0.175} y={s * 0.55} width={s * 0.275} height={s * 0.275} rx={s * 0.06} stroke="currentColor" strokeWidth="1.5" />
      <rect x={s * 0.55} y={s * 0.55} width={s * 0.275} height={s * 0.275} rx={s * 0.06} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

/** 键盘图标。 */
export function IconKeyboard({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <rect x={s * 0.125} y={s * 0.275} width={s * 0.75} height={s * 0.45} rx={s * 0.1} stroke="currentColor" strokeWidth="1.5" />
      <path
        d={`M${s * 0.3} ${s * 0.45}h${s * 0.005}M${s * 0.45} ${s * 0.45}h${s * 0.005}M${s * 0.6} ${s * 0.45}h${s * 0.005}M${s * 0.75} ${s * 0.45}h${s * 0.005}M${s * 0.325} ${s * 0.625}h${s * 0.35}`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** 调节滑块图标。 */
export function IconSliders({ size = 20, className, accent }: IconProps) {
  const s = size
  const ac = accent ? 'ic-accent' : undefined
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${s * 0.15} ${s * 0.325}h${s * 0.7}M${s * 0.15} ${s * 0.5}h${s * 0.7}M${s * 0.15} ${s * 0.675}h${s * 0.7}`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d={`M${s * 0.65} ${s * 0.4}v${s * 0.2}M${s * 0.45} ${s * 0.6}v${s * 0.15}`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* 强调笔画：顶部滑块用品牌色 */}
      <path d={`M${s * 0.35} ${s * 0.225}v${s * 0.2}`} className={ac} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 刷新/循环箭头图标。 */
export function IconRefresh({ size = 20, className, accent }: IconProps) {
  const s = size
  const ac = accent ? 'ic-accent' : undefined
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${s * 0.775} ${s * 0.425}A${s * 0.3} ${s * 0.3} 0 1 0 ${s * 0.8} ${s * 0.55}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d={`M${s * 0.8} ${s * 0.225}v${s * 0.2}h-${s * 0.2}`} className={ac} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 云图标。 */
export function IconCloud({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${s * 0.325} ${s * 0.725}A${s * 0.175} ${s * 0.175} 0 0 1 ${s * 0.31} ${s * 0.38}A${s * 0.25} ${s * 0.25} 0 0 1 ${s * 0.78} ${s * 0.42}a${s * 0.16} ${s * 0.16} 0 0 1 -${s * 0.03} ${s * 0.305}H${s * 0.325}Z`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 心形图标。 */
export function IconHeart({ size = 18, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${s / 2} ${s * 0.86}S${s * 0.14} ${s * 0.64} ${s * 0.14} ${s * 0.4}A${s * 0.2} ${s * 0.2} 0 0 1 ${s / 2} ${s * 0.28}a${s * 0.2} ${s * 0.2} 0 0 1 ${s * 0.36} ${s * 0.12}c0 ${s * 0.24} -${s * 0.36} ${s * 0.46} -${s * 0.36} ${s * 0.46}Z`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* —— 页脚社交平台图标：官方 LOGO 路径复刻（simple-icons 官方源，单色 currentColor）——
   统一 24×24 viewBox、实心填充，随浅色 / 深色主题自动反色；小尺寸下比自绘线性图标更易辨识。 */

/** 微信：官方双气泡 LOGO 复刻（品牌官方路径，单色 currentColor，随主题明暗自适应） */
export function IconWeChat({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z" />
    </svg>
  )
}

/** 小红书：官方「小红书」字标 LOGO 复刻（品牌官方路径，单色 currentColor） */
export function IconXiaohongshu({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M22.405 9.879c.002.016.01.02.07.019h.725a.797.797 0 0 0 .78-.972.794.794 0 0 0-.884-.618.795.795 0 0 0-.692.794c0 .101-.002.666.001.777zm-11.509 4.808c-.203.001-1.353.004-1.685.003a2.528 2.528 0 0 1-.766-.126.025.025 0 0 0-.03.014L7.7 16.127a.025.025 0 0 0 .01.032c.111.06.336.124.495.124.66.01 1.32.002 1.981 0 .01 0 .02-.006.023-.015l.712-1.545a.025.025 0 0 0-.024-.036zM.477 9.91c-.071 0-.076.002-.076.01a.834.834 0 0 0-.01.08c-.027.397-.038.495-.234 3.06-.012.24-.034.389-.135.607-.026.057-.033.042.003.112.046.092.681 1.523.787 1.74.008.015.011.02.017.02.008 0 .033-.026.047-.044.147-.187.268-.391.371-.606.306-.635.44-1.325.486-1.706.014-.11.021-.22.03-.33l.204-2.616.022-.293c.003-.029 0-.033-.03-.034zm7.203 3.757a1.427 1.427 0 0 1-.135-.607c-.004-.084-.031-.39-.235-3.06a.443.443 0 0 0-.01-.082c-.004-.011-.052-.008-.076-.008h-1.48c-.03.001-.034.005-.03.034l.021.293c.076.982.153 1.964.233 2.946.05.4.186 1.085.487 1.706.103.215.223.419.37.606.015.018.037.051.048.049.02-.003.742-1.642.804-1.765.036-.07.03-.055.003-.112zm3.861-.913h-.872a.126.126 0 0 1-.116-.178l1.178-2.625a.025.025 0 0 0-.023-.035l-1.318-.003a.148.148 0 0 1-.135-.21l.876-1.954a.025.025 0 0 0-.023-.035h-1.56c-.01 0-.02.006-.024.015l-.926 2.068c-.085.169-.314.634-.399.938a.534.534 0 0 0-.02.191.46.46 0 0 0 .23.378.981.981 0 0 0 .46.119h.59c.041 0-.688 1.482-.834 1.972a.53.53 0 0 0-.023.172.465.465 0 0 0 .23.398c.15.092.342.12.475.12l1.66-.001c.01 0 .02-.006.023-.015l.575-1.28a.025.025 0 0 0-.024-.035zm-6.93-4.937H3.1a.032.032 0 0 0-.034.033c0 1.048-.01 2.795-.01 6.829 0 .288-.269.262-.28.262h-.74c-.04.001-.044.004-.04.047.001.037.465 1.064.555 1.263.01.02.03.033.051.033.157.003.767.009.938-.014.153-.02.3-.06.438-.132.3-.156.49-.419.595-.765.052-.172.075-.353.075-.533.002-2.33 0-4.66-.007-6.991a.032.032 0 0 0-.032-.032zm11.784 6.896c0-.014-.01-.021-.024-.022h-1.465c-.048-.001-.049-.002-.05-.049v-4.66c0-.072-.005-.07.07-.07h.863c.08 0 .075.004.075-.074V8.393c0-.082.006-.076-.08-.076h-3.5c-.064 0-.075-.006-.075.073v1.445c0 .083-.006.077.08.077h.854c.075 0 .07-.004.07.07v4.624c0 .095.008.084-.085.084-.37 0-1.11-.002-1.304 0-.048.001-.06.03-.06.03l-.697 1.519s-.014.025-.008.036c.006.01.013.008.058.008 1.748.003 3.495.002 5.243.002.03-.001.034-.006.035-.033v-1.539zm4.177-3.43c0 .013-.007.023-.02.024-.346.006-.692.004-1.037.004-.014-.002-.022-.01-.022-.024-.005-.434-.007-.869-.01-1.303 0-.072-.006-.071.07-.07l.733-.003c.041 0 .081.002.12.015.093.025.16.107.165.204.006.431.002 1.153.001 1.153zm2.67.244a1.953 1.953 0 0 0-.883-.222h-.18c-.04-.001-.04-.003-.042-.04V10.21c0-.132-.007-.263-.025-.394a1.823 1.823 0 0 0-.153-.53 1.533 1.533 0 0 0-.677-.71 2.167 2.167 0 0 0-1-.258c-.153-.003-.567 0-.72 0-.07 0-.068.004-.068-.065V7.76c0-.031-.01-.041-.046-.039H17.93s-.016 0-.023.007c-.006.006-.008.012-.008.023v.546c-.008.036-.057.015-.082.022h-.95c-.022.002-.028.008-.03.032v1.481c0 .09-.004.082.082.082h.913c.082 0 .072.128.072.128V11.19s.003.117-.06.117h-1.482c-.068 0-.06.082-.06.082v1.445s-.01.068.064.068h1.457c.082 0 .076-.006.076.079v3.225c0 .088-.007.081.082.081h1.43c.09 0 .082.007.082-.08v-3.27c0-.029.006-.035.033-.035l2.323-.003c.098 0 .191.02.28.061a.46.46 0 0 1 .274.407c.008.395.003.79.003 1.185 0 .259-.107.367-.33.367h-1.218c-.023.002-.029.008-.028.033.184.437.374.871.57 1.303a.045.045 0 0 0 .04.026c.17.005.34.002.51.003.15-.002.517.004.666-.01a2.03 2.03 0 0 0 .408-.075c.59-.18.975-.698.976-1.313v-1.981c0-.128-.01-.254-.034-.38 0 .078-.029-.641-.724-.998z" />
    </svg>
  )
}

/** 微博（眼睛外廓 + 瞳孔 + 右上两道信号弧）
 *  图元：1 个椭圆（眼）+ 1 个圆（瞳孔）+ 2 条弧（信号）。 */
export function IconWeibo({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <ellipse cx={s * 0.45} cy={s * 0.57} rx={s * 0.32} ry={s * 0.23} stroke="currentColor" strokeWidth="1.8" />
      <circle cx={s * 0.45} cy={s * 0.57} r={s * 0.1} stroke="currentColor" strokeWidth="1.8" />
      <path d={`M${s * 0.88} ${s * 0.22}a${s * 0.22} ${s * 0.22} 0 0 0 -${s * 0.22} -${s * 0.12}`} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d={`M${s * 0.95} ${s * 0.31}a${s * 0.32} ${s * 0.32} 0 0 0 -${s * 0.32} -${s * 0.18}`} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/** B 站：官方小电视 LOGO 复刻（圆角机身 + 天线 + 双眼，品牌官方路径） */
export function IconBilibili({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.920-.373.347 0 .653.124.920.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .160-.213l2.853-2.747c.267-.249.573-.373.920-.373.347 0 .662.151.929.400.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.880.773-.506.498-.769 1.130-.786 1.894v7.52c.017.764.280 1.395.786 1.893.507.498 1.134.756 1.880.773h13.334c.746-.017 1.373-.275 1.880-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.280-1.396-.786-1.894-.507-.497-1.134-.755-1.880-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.400.960v1.173c-.017.391-.150.711-.400.960-.249.250-.560.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.400-.960V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.400.960v1.173c-.017.391-.150.711-.400.960-.249.250-.560.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.400-.960V12.44c.017-.391.150-.711.400-.960.249-.249.560-.373.933-.373Z" />
    </svg>
  )
}

/** 抖音：官方音符 LOGO 复刻（品牌官方路径，单色 currentColor） */
export function IconDouyin({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  )
}

/**
 * 烧瓶 / 量杯（实测实验室）：§1.7 信任条「实测实验室」专用线性图标。
 * 22px、1.5px 描边、圆头圆角、中性色（颜色继承 currentColor，不发光）。
 * accent：液面一条线改用品牌色（双色机制，与固件驱动图标共用 .ic-accent）。
 */
export function IconFlask({ size = 22, className, accent }: IconProps) {
  const s = size
  const ac = accent ? 'ic-accent' : undefined
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${s * 0.36} ${s * 0.14}h${s * 0.28}M${s * 0.44} ${s * 0.14}v${s * 0.2}L${s * 0.22} ${s * 0.76}a${s * 0.1} ${s * 0.1} 0 0 0 ${s * 0.09} ${s * 0.14}h${s * 0.38}a${s * 0.1} ${s * 0.1} 0 0 0 ${s * 0.09} -${s * 0.14}L${s * 0.56} ${s * 0.34}v-${s * 0.2}`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 强调笔画：液面用品牌色 */}
      <path
        d={`M${s * 0.33} ${s * 0.56}h${s * 0.34}`}
        className={ac}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/* ============================================================
   富文本编辑器工具栏图标（16px 线性，颜色继承 currentColor）
   ============================================================ */

/** 撤销（左弧 + 箭头） */
export function IconUndo({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${s * 0.18} ${s * 0.44}a${s * 0.32} ${s * 0.32} 0 1 1 ${s * 0.08} ${s * 0.32}`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d={`M${s * 0.18} ${s * 0.52}V${s * 0.34}h${s * 0.18}`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 重做（右弧 + 箭头） */
export function IconRedo({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${s * 0.82} ${s * 0.44}a${s * 0.32} ${s * 0.32} 0 1 0 -${s * 0.08} ${s * 0.32}`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d={`M${s * 0.82} ${s * 0.52}V${s * 0.34}h-${s * 0.18}`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 加粗（B） */
export function IconBold({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${s * 0.33} ${s * 0.22}v${s * 0.56}M${s * 0.33} ${s * 0.22}h${s * 0.19}a${s * 0.14} ${s * 0.14} 0 0 1 0 ${s * 0.28}h-${s * 0.19}M${s * 0.33} ${s * 0.5}h${s * 0.23}a${s * 0.15} ${s * 0.15} 0 0 1 0 ${s * 0.28}h-${s * 0.23}`}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 斜体（I） */
export function IconItalic({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${s * 0.42} ${s * 0.22}h${s * 0.26}M${s * 0.32} ${s * 0.78}h${s * 0.26}M${s * 0.58} ${s * 0.22}L${s * 0.42} ${s * 0.78}`} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 下划线（U） */
export function IconUnderline({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${s * 0.32} ${s * 0.18}v${s * 0.3}a${s * 0.18} ${s * 0.18} 0 0 0 ${s * 0.36} 0V${s * 0.18}`} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${s * 0.27} ${s * 0.82}h${s * 0.46}`} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

/** 删除线（S + 横线） */
export function IconStrikethrough({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${s * 0.62} ${s * 0.32}c-${s * 0.02} -${s * 0.08} -${s * 0.1} -${s * 0.12} -${s * 0.16} -${s * 0.12}s-${s * 0.16} ${s * 0.05} -${s * 0.16} ${s * 0.13}c0 ${s * 0.09} ${s * 0.08} ${s * 0.12} ${s * 0.16} ${s * 0.15}s${s * 0.16} ${s * 0.06} ${s * 0.16} ${s * 0.16}c0 ${s * 0.1} -${s * 0.08} ${s * 0.16} -${s * 0.17} ${s * 0.16}s-${s * 0.15} -${s * 0.04} -${s * 0.17} -${s * 0.12}`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={`M${s * 0.2} ${s * 0.5}h${s * 0.6}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 行内代码（</>） */
export function IconInlineCode({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${s * 0.42} ${s * 0.32}L${s * 0.26} ${s * 0.5}l${s * 0.16} ${s * 0.18}`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${s * 0.58} ${s * 0.32}L${s * 0.74} ${s * 0.5}l-${s * 0.16} ${s * 0.18}`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${s * 0.55} ${s * 0.24}L${s * 0.45} ${s * 0.76}`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/** 无序列表（圆点 + 文本线） */
export function IconListBullet({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${s * 0.4} ${s * 0.28}h${s * 0.4}M${s * 0.4} ${s * 0.5}h${s * 0.4}M${s * 0.4} ${s * 0.72}h${s * 0.4}`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx={s * 0.24} cy={s * 0.28} r={s * 0.055} fill="currentColor" />
      <circle cx={s * 0.24} cy={s * 0.5} r={s * 0.055} fill="currentColor" />
      <circle cx={s * 0.24} cy={s * 0.72} r={s * 0.055} fill="currentColor" />
    </svg>
  )
}

/** 有序列表（序号 + 文本线） */
export function IconListNumber({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${s * 0.4} ${s * 0.28}h${s * 0.4}M${s * 0.4} ${s * 0.5}h${s * 0.4}M${s * 0.4} ${s * 0.72}h${s * 0.4}`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d={`M${s * 0.19} ${s * 0.22}v${s * 0.12}M${s * 0.17} ${s * 0.34}h${s * 0.05}`} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d={`M${s * 0.17} ${s * 0.44}h${s * 0.07}v${s * 0.06}h-${s * 0.07}v${s * 0.06}h${s * 0.07}`} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${s * 0.17} ${s * 0.66}h${s * 0.07}v${s * 0.06}h-${s * 0.07}h${s * 0.07}v${s * 0.06}h-${s * 0.07}`} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 引用（左侧竖条 + 文本线） */
export function IconQuote({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${s * 0.28} ${s * 0.24}v${s * 0.52}`} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d={`M${s * 0.44} ${s * 0.3}h${s * 0.3}M${s * 0.44} ${s * 0.44}h${s * 0.3}M${s * 0.44} ${s * 0.58}h${s * 0.22}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 代码块（框 + < >） */
export function IconCodeBlock({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <rect x={s * 0.14} y={s * 0.21} width={s * 0.72} height={s * 0.58} rx={s * 0.08} stroke="currentColor" strokeWidth="1.5" />
      <path d={`M${s * 0.42} ${s * 0.37}L${s * 0.31} ${s * 0.5}l${s * 0.11} ${s * 0.13}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${s * 0.59} ${s * 0.37}L${s * 0.7} ${s * 0.5}l-${s * 0.11} ${s * 0.13}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 分割线 */
export function IconDivider({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${s * 0.18} ${s * 0.5}h${s * 0.64}`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx={s * 0.11} cy={s * 0.5} r={s * 0.045} fill="currentColor" />
      <circle cx={s * 0.89} cy={s * 0.5} r={s * 0.045} fill="currentColor" />
    </svg>
  )
}

/** 插入链接（链环） */
export function IconLink({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${s * 0.44} ${s * 0.56}l${s * 0.12} -${s * 0.12}`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d={`M${s * 0.54} ${s * 0.3}a${s * 0.14} ${s * 0.14} 0 0 1 ${s * 0.2} ${s * 0.2}l-${s * 0.13} ${s * 0.13}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d={`M${s * 0.46} ${s * 0.7}a${s * 0.14} ${s * 0.14} 0 0 1 -${s * 0.2} -${s * 0.2}l${s * 0.13} -${s * 0.13}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 插入图片（画框 + 山 + 太阳） */
export function IconImage({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <rect x={s * 0.16} y={s * 0.22} width={s * 0.68} height={s * 0.56} rx={s * 0.08} stroke="currentColor" strokeWidth="1.5" />
      <circle cx={s * 0.38} cy={s * 0.39} r={s * 0.07} stroke="currentColor" strokeWidth="1.4" />
      <path d={`M${s * 0.2} ${s * 0.72}l${s * 0.19} -${s * 0.22} ${s * 0.15} ${s * 0.16} ${s * 0.16} -${s * 0.19} ${s * 0.22} ${s * 0.25}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 插入表格（田字格） */
export function IconTable({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <rect x={s * 0.16} y={s * 0.2} width={s * 0.68} height={s * 0.6} rx={s * 0.06} stroke="currentColor" strokeWidth="1.5" />
      <path d={`M${s * 0.16} ${s * 0.4}h${s * 0.68}M${s * 0.16} ${s * 0.6}h${s * 0.68}M${s * 0.39} ${s * 0.2}v${s * 0.6}M${s * 0.61} ${s * 0.2}v${s * 0.6}`} stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

/** 清除格式（橡皮擦 + 基线） */
export function IconClearFormat({ size = 16, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <rect x={s * 0.24} y={s * 0.4} width={s * 0.36} height={s * 0.22} rx={s * 0.06} transform={`rotate(-45 ${s * 0.42} ${s * 0.51})`} stroke="currentColor" strokeWidth="1.5" />
      <path d={`M${s * 0.26} ${s * 0.84}h${s * 0.48}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}