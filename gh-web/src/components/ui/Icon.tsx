/** 站点图标：全部为线性 SVG，颜色继承 currentColor，尺寸由父级控制 */
type IconProps = { size?: number; className?: string }

const box = (size: number) => ({ width: size, height: size, viewBox: `0 0 ${size} ${size}` })

export function IconSearch({ size = 18, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <circle cx={size * 0.42} cy={size * 0.42} r={size * 0.28} stroke="currentColor" strokeWidth="1.5" />
      <path d={`M${size * 0.64} ${size * 0.64} ${size * 0.9} ${size * 0.9}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

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

export function IconSun({ size = 18, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <circle cx={size / 2} cy={size / 2} r={size * 0.21} stroke="currentColor" strokeWidth="1.5" />
      <path
        d={`M${size / 2} ${size * 0.06}v${size * 0.12}M${size / 2} ${size * 0.82}v${size * 0.12}M${size * 0.06} ${size / 2}h${size * 0.12}M${size * 0.82} ${size / 2}h${size * 0.12}M${size * 0.19} ${size * 0.19}l${size * 0.08} ${size * 0.08}M${size * 0.73} ${size * 0.73}l${size * 0.08} ${size * 0.08}M${size * 0.81} ${size * 0.19}l-${size * 0.08} ${size * 0.08}M${size * 0.27} ${size * 0.73}l-${size * 0.08} ${size * 0.08}`}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconMoon({ size = 18, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${size * 0.72} ${size * 0.62}A${size * 0.3} ${size * 0.3} 0 0 1 ${size * 0.38} ${size * 0.28}a${size * 0.31} ${size * 0.31} 0 1 0 ${size * 0.34} ${size * 0.34}Z`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconSupport({ size = 18, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${size * 0.22} ${size * 0.39}a${size * 0.28} ${size * 0.28} 0 0 1 ${size * 0.56} 0v${size * 0.17}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x={size * 0.14} y={size * 0.39} width={size * 0.17} height={size * 0.25} rx={size * 0.07} stroke="currentColor" strokeWidth="1.5" />
      <rect x={size * 0.69} y={size * 0.39} width={size * 0.17} height={size * 0.25} rx={size * 0.07} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function IconAccount({ size = 18, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <circle cx={size / 2} cy={size * 0.33} r={size * 0.17} stroke="currentColor" strokeWidth="1.5" />
      <path d={`M${size * 0.19} ${size * 0.83}c${size * 0.03} -${size * 0.16} ${size * 0.16} -${size * 0.23} ${size * 0.31} -${size * 0.23}s${size * 0.28} ${size * 0.07} ${size * 0.31} ${size * 0.23}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconMenu({ size = 18, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${size * 0.11} ${size * 0.25}h${size * 0.78}M${size * 0.11} ${size * 0.5}h${size * 0.78}M${size * 0.11} ${size * 0.75}h${size * 0.78}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconClose({ size = 18, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${size * 0.22} ${size * 0.22}l${size * 0.56} ${size * 0.56}M${size * 0.78} ${size * 0.22}L${size * 0.22} ${size * 0.78}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconChevronDown({ size = 14, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${size * 0.25} ${size * 0.38}L${size * 0.5} ${size * 0.63}l${size * 0.25} -${size * 0.25}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

export function IconChevronLeft({ size = 16, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${size * 0.63} ${size * 0.19}L${size * 0.31} ${size * 0.5}L${size * 0.63} ${size * 0.81}`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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

export function IconMail({ size = 15, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <rect x={size * 0.09} y={size * 0.19} width={size * 0.82} height={size * 0.63} rx={size * 0.09} stroke="currentColor" strokeWidth="1.3" />
      <path d={`M${size * 0.13} ${size * 0.28}l${size * 0.37} ${size * 0.25} ${size * 0.37} -${size * 0.25}`} stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

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

export function IconDownload({ size = 20, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${size * 0.5} ${size * 0.15}v${size * 0.45}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d={`M${size * 0.32} ${size * 0.43}L${size * 0.5} ${size * 0.61}l${size * 0.18} -${size * 0.18}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${size * 0.2} ${size * 0.78}h${size * 0.6}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconHelp({ size = 20, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <circle cx={size / 2} cy={size / 2} r={size * 0.35} stroke="currentColor" strokeWidth="1.5" />
      <path d={`M${size * 0.4} ${size * 0.4}a${size * 0.1} ${size * 0.1} 0 1 1 ${size * 0.135} ${size * 0.095}c-${size * 0.025} ${size * 0.01} -${size * 0.035} ${size * 0.03} -${size * 0.035} ${size * 0.055}v${size * 0.015}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={size * 0.5} cy={size * 0.7} r={size * 0.045} fill="currentColor" />
    </svg>
  )
}

export function IconChat({ size = 20, className }: IconProps) {
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${size * 0.8} ${size * 0.48}c0 ${size * 0.15} -${size * 0.135} ${size * 0.275} -${size * 0.3} ${size * 0.275} -${size * 0.04} 0 -${size * 0.08} -0.005 -${size * 0.115} -0.02L${size * 0.2} ${size * 0.8}l${size * 0.05} -${size * 0.16}A${size * 0.275} ${size * 0.275} 0 0 1 ${size * 0.2} ${size * 0.48}c0 -${size * 0.15} ${size * 0.135} -${size * 0.275} ${size * 0.3} -${size * 0.275}s${size * 0.3} ${size * 0.125} ${size * 0.3} ${size * 0.275}z`} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

/* —— 服务支持页图标（20px 线性）—— */
export function IconChip({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <rect x={s * 0.275} y={s * 0.275} width={s * 0.45} height={s * 0.45} rx={s * 0.08} stroke="currentColor" strokeWidth="1.5" />
      <path
        d={`M${s * 0.4} ${s * 0.15}v${s * 0.125}M${s * 0.6} ${s * 0.15}v${s * 0.125}M${s * 0.4} ${s * 0.725}v${s * 0.125}M${s * 0.6} ${s * 0.725}v${s * 0.125}M${s * 0.15} ${s * 0.4}h${s * 0.125}M${s * 0.15} ${s * 0.6}h${s * 0.125}M${s * 0.725} ${s * 0.4}h${s * 0.125}M${s * 0.725} ${s * 0.6}h${s * 0.125}`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconShield({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${s * 0.5} ${s * 0.14}L${s * 0.8} ${s * 0.25}v${s * 0.22}c0 ${s * 0.17} -${s * 0.12} ${s * 0.3} -${s * 0.3} ${s * 0.39} -${s * 0.18} -${s * 0.09} -${s * 0.3} -${s * 0.22} -${s * 0.3} -${s * 0.39}V${s * 0.25}L${s * 0.5} ${s * 0.14}Z`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d={`M${s * 0.36} ${s * 0.5}L${s * 0.45} ${s * 0.59}L${s * 0.64} ${s * 0.39}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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

export function IconCheckCircle({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <circle cx={s * 0.5} cy={s * 0.5} r={s * 0.35} stroke="currentColor" strokeWidth="1.5" />
      <path d={`M${s * 0.34} ${s * 0.51}L${s * 0.45} ${s * 0.62}L${s * 0.66} ${s * 0.38}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* —— 商业合作页图标（20px 线性）—— */
export function IconCube({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${s * 0.15} ${s * 0.325}L${s * 0.5} ${s * 0.15}l${s * 0.35} ${s * 0.175}v${s * 0.35}L${s * 0.5} ${s * 0.85}l-${s * 0.35} -${s * 0.175}v-${s * 0.35}Z`} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={`M${s * 0.15} ${s * 0.325}L${s * 0.5} ${s * 0.5}l${s * 0.35} -${s * 0.175}M${s * 0.5} ${s * 0.5}v${s * 0.35}`} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export function IconMonitor({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <rect x={s * 0.15} y={s * 0.2} width={s * 0.7} height={s * 0.5} rx={s * 0.08} stroke="currentColor" strokeWidth="1.5" />
      <path d={`M${s * 0.35} ${s * 0.85}h${s * 0.3}M${s * 0.5} ${s * 0.7}v${s * 0.15}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

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

export function IconCap({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${s * 0.5} ${s * 0.15}L${s * 0.15} ${s * 0.325}l${s * 0.35} ${s * 0.175}l${s * 0.35} -${s * 0.175}L${s * 0.5} ${s * 0.15}Z`} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={`M${s * 0.3} ${s * 0.425}v${s * 0.225}c0 ${s * 0.055} ${s * 0.09} ${s * 0.1} ${s * 0.2} ${s * 0.1}s${s * 0.2} -${s * 0.045} ${s * 0.2} -${s * 0.1}V${s * 0.425}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

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

export function IconSliders({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${s * 0.15} ${s * 0.325}h${s * 0.7}M${s * 0.15} ${s * 0.5}h${s * 0.7}M${s * 0.15} ${s * 0.675}h${s * 0.7}`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d={`M${s * 0.35} ${s * 0.225}v${s * 0.2}M${s * 0.65} ${s * 0.4}v${s * 0.2}M${s * 0.45} ${s * 0.6}v${s * 0.15}`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconRefresh({ size = 20, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path d={`M${s * 0.775} ${s * 0.425}A${s * 0.3} ${s * 0.3} 0 1 0 ${s * 0.8} ${s * 0.55}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d={`M${s * 0.8} ${s * 0.225}v${s * 0.2}h-${s * 0.2}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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

/**
 * 烧瓶 / 量杯（实测实验室）：§1.7 信任条「实测实验室」专用线性图标。
 * 22px、1.5px 描边、圆头圆角、中性色（颜色继承 currentColor，不发光）。
 */
export function IconFlask({ size = 22, className }: IconProps) {
  const s = size
  return (
    <svg {...box(size)} fill="none" aria-hidden="true" className={className}>
      <path
        d={`M${s * 0.36} ${s * 0.14}h${s * 0.28}M${s * 0.44} ${s * 0.14}v${s * 0.2}L${s * 0.22} ${s * 0.76}a${s * 0.1} ${s * 0.1} 0 0 0 ${s * 0.09} ${s * 0.14}h${s * 0.38}a${s * 0.1} ${s * 0.1} 0 0 0 ${s * 0.09} -${s * 0.14}L${s * 0.56} ${s * 0.34}v-${s * 0.2}`}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={`M${s * 0.33} ${s * 0.56}h${s * 0.34}`}
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