/**
 * 产品 / 场景矢量占位图。
 * 素材未到位时替代真实图片，保持视觉完整（非破图）；上线前由真实素材替换。
 */
export type DeviceVariant = 'mouse' | 'keyboard' | 'headset' | 'pad'

type Props = { variant: DeviceVariant; className?: string; label?: string }

export function DeviceArt({ variant, className = 'dev', label = '产品图' }: Props) {
  return (
    <svg className={className} viewBox="0 0 120 90" role="img" aria-label={label}>
      {variant === 'mouse' && (
        <>
          <ellipse className="dev-glow" cx="60" cy="70" rx="34" ry="9" />
          <path className="dev-body" d="M60 10c12 0 20 11 20 28v18c0 13-8 20-20 20s-20-7-20-20V38c0-17 8-28 20-28Z" />
          <path className="dev-seam" d="M60 10v24" />
          <rect className="dev-accent" x="55" y="17" width="10" height="14" rx="5" />
        </>
      )}
      {variant === 'keyboard' && (
        <>
          <ellipse className="dev-glow" cx="60" cy="74" rx="42" ry="8" />
          <rect className="dev-body" x="8" y="30" width="104" height="40" rx="8" />
          <path className="dev-keys" d="M18 42h84M18 52h84M18 62h72" />
          <rect className="dev-accent" x="92" y="60" width="12" height="6" rx="3" />
        </>
      )}
      {variant === 'headset' && (
        <>
          <ellipse className="dev-glow" cx="60" cy="76" rx="34" ry="7" />
          <path className="dev-arc" d="M30 62V46a30 30 0 0 1 60 0v16" />
          <rect className="dev-body" x="22" y="48" width="16" height="28" rx="8" />
          <rect className="dev-body" x="82" y="48" width="16" height="28" rx="8" />
          <rect className="dev-accent" x="26" y="62" width="8" height="3" rx="1.5" />
        </>
      )}
      {variant === 'pad' && (
        <>
          <ellipse className="dev-glow" cx="60" cy="52" rx="44" ry="18" />
          <rect className="dev-body" x="12" y="30" width="96" height="42" rx="6" />
          <rect className="dev-edge" x="12" y="66" width="96" height="5" rx="2.5" />
        </>
      )}
    </svg>
  )
}