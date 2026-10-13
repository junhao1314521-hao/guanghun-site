/**
 * useApi 测试：三态流转、主动取消不暴露为错误、卸载时中止在途请求。
 */
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useApi } from '../src/hooks/useApi'

function Probe({ factory }: { factory: (signal: AbortSignal) => Promise<string> }) {
  const { data, loading, error } = useApi(factory, [factory])
  if (loading) return <span>loading</span>
  if (error) return <span>error:{error.message}</span>
  return <span>data:{data}</span>
}

describe('useApi', () => {
  it('成功 → 渲染数据', async () => {
    const factory = vi.fn(() => Promise.resolve('ok'))
    render(<Probe factory={factory} />)
    await waitFor(() => expect(screen.getByText('data:ok')).toBeTruthy())
  })

  it('AbortError 不计入错误态（保持 loading，不退化为错误）', async () => {
    const factory = vi.fn(() => Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    render(<Probe factory={factory} />)
    await waitFor(() => expect(factory).toHaveBeenCalled())

    expect(screen.getByText('loading')).toBeTruthy()
    expect(screen.queryByText(/^error:/)).toBeNull()
  })

  it('卸载时中止在途请求', async () => {
    let captured: AbortSignal | undefined
    const factory = vi.fn((signal: AbortSignal) => {
      captured = signal
      return new Promise<string>(() => {})
    })

    const { unmount } = render(<Probe factory={factory} />)
    await waitFor(() => expect(factory).toHaveBeenCalled())
    expect(captured?.aborted).toBe(false)

    unmount()
    expect(captured?.aborted).toBe(true)
  })

  it('依赖变化 → 中止上一次在途请求', async () => {
    const signals: AbortSignal[] = []
    const factory = (signal: AbortSignal) => {
      signals.push(signal)
      return new Promise<string>(() => {})
    }

    const { rerender } = render(<Probe factory={factory} />)
    await waitFor(() => expect(signals).toHaveLength(1))

    // 更换 factory 触发依赖变化 → 上一请求应被中止
    const nextFactory = (signal: AbortSignal) => {
      signals.push(signal)
      return new Promise<string>(() => {})
    }
    rerender(<Probe factory={nextFactory} />)

    await waitFor(() => expect(signals).toHaveLength(2))
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
  })
})