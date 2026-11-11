#!/usr/bin/env node
/**
 * SQLite 每日备份（systemd timer 调用）。
 *
 * - 使用 `VACUUM INTO` 生成一致性快照（等价于 `sqlite3 .backup`，且无需安装 sqlite3 CLI）；
 * - 源库以只读方式打开，不影响正在运行的 website 服务；
 * - 保留策略：最近 7 天每日快照 + 更早的每周 1 份（最多 4 周）。
 *
 * 环境变量：DB_PATH（默认 /opt/website/data/gh.sqlite）、BACKUP_DIR（默认同级 backups）。
 */
import { DatabaseSync } from 'node:sqlite'
import { copyFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import path from 'node:path'

const src = process.env.DB_PATH || '/opt/website/data/gh.sqlite'
const dir = process.env.BACKUP_DIR || path.join(path.dirname(src), 'backups')
mkdirSync(dir, { recursive: true })

const d = new Date()
const p2 = (n) => String(n).padStart(2, '0')
const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`
const dst = path.join(dir, `gh-${stamp}.sqlite`)

const db = new DatabaseSync(src, { readOnly: true })
db.exec(`VACUUM INTO '${dst.replace(/'/g, "''")}'`)
db.close()
console.log(`[backup] ${dst}`)

// 异地副本：配置 BACKUP_MIRROR_DIR（如挂载的另一块盘 / NAS）后，每次快照同步复制一份
const mirror = (process.env.BACKUP_MIRROR_DIR || '').trim()
if (mirror) {
  try {
    mkdirSync(mirror, { recursive: true })
    copyFileSync(dst, path.join(mirror, path.basename(dst)))
    console.log(`[backup] 已复制到镜像目录 ${mirror}`)
  } catch (error) {
    console.error(`[backup] 镜像复制失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

/** 文件名 → ISO 周键（用于每周保留 1 份） */
function isoWeekKey(name) {
  const y = Number(name.slice(3, 7))
  const m = Number(name.slice(7, 9))
  const day = Number(name.slice(9, 11))
  const dt = new Date(Date.UTC(y, m - 1, day))
  const weekday = dt.getUTCDay() || 7
  dt.setUTCDate(dt.getUTCDate() + 4 - weekday)
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((dt - yearStart) / 86400000 + 1) / 7)
  return `${dt.getUTCFullYear()}-W${p2(week)}`
}

/** 保留策略：最近 7 天全部保留 + 更早的每周保留最新 1 份（最多 4 周） */
function prune(targetDir) {
  const names = readdirSync(targetDir)
    .filter((f) => /^gh-\d{8}-\d{6}\.sqlite$/.test(f))
    .sort()
  const nowMs = Date.now()
  const keep = new Set()
  for (const f of names) {
    if (nowMs - statSync(path.join(targetDir, f)).mtimeMs < 8 * 86400000) keep.add(f)
  }
  const weeks = new Map()
  for (const f of [...names].reverse()) {
    if (keep.has(f)) continue
    const key = isoWeekKey(f)
    if (!weeks.has(key)) weeks.set(key, f)
  }
  for (const f of [...weeks.values()].slice(0, 4)) keep.add(f)
  for (const f of names) {
    if (!keep.has(f)) {
      unlinkSync(path.join(targetDir, f))
      console.log(`[backup] 清理过期快照 ${f}`)
    }
  }
}

prune(dir)
if (mirror) {
  try {
    prune(mirror)
  } catch (error) {
    console.error(`[backup] 镜像目录清理失败：${error instanceof Error ? error.message : String(error)}`)
  }
}
