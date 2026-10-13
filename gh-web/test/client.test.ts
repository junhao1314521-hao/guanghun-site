/**
 * 接口层传输器测试：路径构造（同源相对路径 / 分离绝对地址）与错误映射。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createHttpTransport } from '../src/api/client'

const jsonRes = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response

afterEach(() => vi.restoreAllMocks())

describe('createHttpTransport · 路径构造', () => {
  it('同源部署（baseUrl 为空）→ 使用相对路径', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ items: [], total: 0 }))
    vi.stubGlobal('fetch', fetchMock)

    await createHttpTransport('')({ path: '/api/products' }, () => ({ items: [], total: 0 }))

    expect(fetchMock).toHaveBeenCalledWith('/api/products', expect.anything())
  })

  it('查询参数：拼接且忽略 undefined', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ items: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await createHttpTransport('')({ path: '/api/products', query: { line: 'mouse', tag: undefined } }, () => ({}))

    expect(fetchMock).toHaveBeenCalledWith('/api/products?line=mouse', expect.anything())
  })

  it('分离部署（baseUrl 非空）→ 构造绝对 URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({}))
    vi.stubGlobal('fetch', fetchMock)

    await createHttpTransport('https://api.example.com')({ path: '/api/home' }, () => ({}))

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/home', expect.anything())
  })
})

describe('createHttpTransport · 错误映射', () => {
  it('非 2xx → ApiError 且携带状态码', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonRes({ error: '未找到' }, 404)))

    await expect(createHttpTransport('')({ path: '/api/products/nope' }, () => null)).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    })
  })

  it('主动取消（AbortError）原样抛出，不降级为「网络失败」', async () => {
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortErr))

    await expect(createHttpTransport('')({ path: '/api/home' }, () => null)).rejects.toBe(abortErr)
  })

  it('网络异常 → ApiError(status 0)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))

    const err = await createHttpTransport('')({ path: '/api/home' }, () => null).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(0)
  })
})