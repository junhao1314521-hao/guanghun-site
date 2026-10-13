import { useEffect, useState } from 'react'
import type { Theme } from './theme'
import { getTheme, subscribeTheme } from './theme'

/** 订阅当前主题，主题变化时触发重渲染 */
export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(getTheme)
  useEffect(() => subscribeTheme(() => setTheme(getTheme())), [])
  return theme
}