import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * 旧站直链 → 新地址的 301 映射（零依赖、按 mtime 热加载）。
 *
 * 背景：原官网（xxrsm.com / download.xxrsm.com）存在被二维码、说明书、客户收藏引用的文件直链。
 * 新站不能复刻旧系统，但对**确实在外部传播**的链接要保住可用性，统一 301 到新下载中心或新文件地址。
 *
 * 数据文件：默认与数据库同目录的 `legacy-redirects.json`，可用 `LEGACY_REDIRECTS_PATH` 覆盖。
 * 格式：`{ "/old/path/file.zip": "/downloads/gh-xxx", ... }`（键为旧路径，值为站内路径或绝对 URL）。
 * 未提供文件 / 文件为空 / 键不匹配时，本模块不产生任何影响。
 */
type Cache = { mtimeMs: number; map: Map<string, string> }

let cache: Cache | undefined

/** 解析映射文件路径（数据目录，避免混入代码包） */
function mapFile(): string {
  const env = (process.env.LEGACY_REDIRECTS_PATH ?? '').trim()
  if (env) return env
  const db = (process.env.DB_PATH ?? '').trim()
  const dataDir = db ? path.dirname(db) : path.join(process.cwd(), 'data')
  return path.join(dataDir, 'legacy-redirects.json')
}

function load(): Map<string, string> | undefined {
  const file = mapFile()
  if (!existsSync(file)) return undefined
  let mtimeMs: number
  try {
    mtimeMs = statSync(file).mtimeMs
  } catch {
    return undefined
  }
  if (cache && cache.mtimeMs === mtimeMs) return cache.map
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown
    const map = new Map<string, string>()
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof key !== 'string' || !key.startsWith('/')) continue
        if (typeof value !== 'string' || !value) continue
        // 仅站内绝对路径或 http(s) 绝对地址，避免 javascript: 等危险目标
        if (!value.startsWith('/') && !/^https?:\/\//i.test(value)) continue
        map.set(key, value)
      }
    }
    cache = { mtimeMs, map }
    return map
  } catch {
    return undefined
  }
}

/** 查询旧路径对应的新地址（未命中返回 undefined） */
export function legacyRedirectFor(pathname: string): string | undefined {
  const map = load()
  if (!map || map.size === 0) return undefined
  return map.get(pathname)
}
