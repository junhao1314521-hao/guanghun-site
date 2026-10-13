import { useEffect, useState } from 'react'
import { useLocale } from '../i18n'

export type AsyncState<T> = {
  data: T | null
  loading: boolean
  error: Error | null
}

/** 判断是否为主动取消（切页 / 依赖变化触发的中止），此类不计入错误态 */
function isAbort(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError'
}

/**
 * 资源取数 hook：统一 loading / error / data 三态。
 * - 依赖变化或卸载时：忽略过期响应，并通过 `AbortSignal` 中止在途请求（省流量、避免竞态）；
 * - 主动取消不作为错误暴露（保持上一次数据，不闪错误态）；
 * - **当前语言自动纳入依赖**：切换语言（中/英）时全部数据重取，配合接口层 `?locale` 透传，
 *   使内容库 / 集合随之切换语种（无 Provider 时语言为默认值，不抛错）。
 */
export function useApi<T>(factory: (signal: AbortSignal) => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null })
  const locale = useLocale()

  useEffect(() => {
    const controller = new AbortController()
    let alive = true
    setState((prev) => ({ data: prev.data, loading: true, error: null }))
    factory(controller.signal)
      .then((data) => {
        if (alive) setState({ data, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (isAbort(error)) return
        if (alive) setState({ data: null, loading: false, error: error instanceof Error ? error : new Error('未知错误') })
      })
    return () => {
      alive = false
      controller.abort()
    }
    // factory 每次渲染都是新函数，故仅以 deps（+ 当前语言）作为触发依据
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, locale])

  return state
}