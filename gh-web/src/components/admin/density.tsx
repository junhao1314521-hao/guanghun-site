/**
 * 列表密度偏好（标准 / 紧凑）。
 * ============================================================
 * 只影响列表页的行高与单元格内距，不改变字号、控件高度与信息结构。
 * 选择记在 localStorage，不同栏目共用同一个偏好。
 */
import { useEffect, useState } from 'react'

const DENSITY_KEY = 'gh-admin-density'

export type Density = 'standard' | 'compact'

/** 读取偏好；存储不可用时回落标准 */
function readDensity(): Density {
  try {
    return window.localStorage.getItem(DENSITY_KEY) === 'compact' ? 'compact' : 'standard'
  } catch {
    return 'standard'
  }
}

/** 密度状态 + 持久化 */
export function useDensity(): [Density, (next: Density) => void] {
  const [density, setDensity] = useState<Density>(readDensity)
  useEffect(() => {
    try {
      window.localStorage.setItem(DENSITY_KEY, density)
    } catch {
      // 隐私模式等写入失败时忽略，仅本次会话生效
    }
  }, [density])
  return [density, setDensity]
}

/** 工具栏里的两档切换 */
export function DensityToggle({ density, onChange }: { density: Density; onChange: (next: Density) => void }) {
  return (
    <div className="admin-density" role="group" aria-label="列表密度">
      <button
        type="button"
        className={density === 'standard' ? 'is-active' : ''}
        aria-pressed={density === 'standard'}
        title="标准行高"
        onClick={() => onChange('standard')}
      >
        标准
      </button>
      <button
        type="button"
        className={density === 'compact' ? 'is-active' : ''}
        aria-pressed={density === 'compact'}
        title="紧凑行高，一屏看更多"
        onClick={() => onChange('compact')}
      >
        紧凑
      </button>
    </div>
  )
}
