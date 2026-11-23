/**
 * 内容接口 SWR 测试：命中缓存立即返回旧数据，后台刷新更新缓存；刷新失败不打断调用方。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPage } from '../src/api/content'

let calls = 0
let version = 0

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response
}

beforeEach(() => {
  calls = 0
  version = 1
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      calls += 1
      return jsonResponse({ page: { key: 'swr-test', title: `v${version}`, blocks: [] } })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('内容接口 SWR', () => {
  it('命中缓存先返回旧数据，后台刷新后更新缓存', async () => {
    const key = `swr-${Date.now()}-${Math.random()}`
    const first = await fetchPage(key)
    expect(first.title).toBe('v1')
    expect(calls).toBe(1)

    version = 2
    const second = await fetchPage(key)
    expect(second.title).toBe('v1')

    await vi.waitFor(() => expect(calls).toBe(2))
    await new Promise((resolve) => setTimeout(resolve, 0))
    const third = await fetchPage(key)
    expect(third.title).toBe('v2')
  })

  it('后台刷新失败时保留缓存，不向调用方抛错', async () => {
    const key = `swr-fail-${Date.now()}-${Math.random()}`
    const first = await fetchPage(key)
    expect(first.title).toBe('v1')

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )

    const second = await fetchPage(key)
    expect(second.title).toBe('v1')
    expect(calls).toBe(1)
  })
})
