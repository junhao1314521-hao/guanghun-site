import { useEffect, useState } from 'react'
import { fetchMe } from '../api/auth'
import type { AuthUser } from '../data/auth'

/**
 * 前台会话状态（进程内共享）。
 *
 * 以 `GET /api/auth/me` 为准（Cookie `gh_user` 承载会话）；同一页面内多处消费共享一次请求，
 * 登录 / 注册 / 登出 / 改密后调用 `invalidateSession()` 刷新缓存与订阅者。
 */

/** undefined = 尚未加载；null = 未登录；AuthUser = 已登录 */
let cache: AuthUser | null | undefined
let inflight: Promise<AuthUser | null> | null = null
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

function load(): Promise<AuthUser | null> {
  if (cache !== undefined) return Promise.resolve(cache)
  if (!inflight) {
    inflight = fetchMe()
      .then((user) => {
        cache = user
        return user
      })
      .catch(() => {
        cache = null
        return null
      })
      .finally(() => {
        inflight = null
        notify()
      })
  }
  return inflight
}

/** 使会话缓存失效并触发订阅者重新取数（登录 / 登出 / 改密后调用） */
export function invalidateSession(): void {
  cache = undefined
  inflight = null
  notify()
}

/** 读取当前会话；多处消费共享同一份结果 */
export function useSession(): { user: AuthUser | null; loading: boolean } {
  const [, setTick] = useState(0)

  useEffect(() => {
    const listener = () => setTick((n) => n + 1)
    listeners.add(listener)
    if (cache === undefined) void load()
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return { user: cache ?? null, loading: cache === undefined }
}
