import { Router } from 'express'
import {
  backupFilePath,
  type BackupSnapshot,
  createBackup,
  deleteBackup,
  listBackups,
  readBackup,
  restoreSnapshot,
  snapshot,
} from '../data/backupStore'
import { resetContentToSeed } from '../data/contentStore'
import { isCollectionKey, resetAllCollections, resetCollection } from '../data/collectionStore'
import { resetAdminResources } from '../data/adminResourceStore'
import { readParam, requireSession } from '../middleware/adminAuth'
import { requireScope } from '../middleware/rbac'
import { auditWrite } from '../middleware/audit'

/**
 * 后台「备份 / 恢复 / 重置」端点（挂载于 /api/admin，均需会话）。
 *
 * 契约：
 *   GET    /admin/backups                    → { items, total }（文件名 / 大小 / 时间）
 *   POST   /admin/backups                    → 立即生成一份备份 → { item }
 *   GET    /admin/backups/:id/download       → 下载该备份（application/json）
 *   POST   /admin/backups/:id/restore        → 覆盖恢复（先自动生成恢复前快照）→ { ok: true }
 *   DELETE /admin/backups/:id                → 删除 → { ok: true }（未命中 404）
 *   POST   /admin/reset                      → 重置为初始 seed（body：{ scope, key? }）→ { ok: true }
 *
 * 恢复前快照标签 `pre-restore`；恢复为整表覆盖（单事务）。
 */
export const backupsRouter = Router()

/** 读取字符串字段并去除首尾空白 */
function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

backupsRouter.get('/backups', requireSession, requireScope('backups'), (_req, res) => {
  const items = listBackups()
  res.json({ items, total: items.length })
})

backupsRouter.post(
  '/backups',
  requireSession,
  requireScope('backups'),
  auditWrite('backup', () => 'backups'),
  (_req, res) => {
    res.status(201).json({ item: createBackup() })
  },
)

backupsRouter.get('/backups/:id/download', requireSession, requireScope('backups'), (req, res) => {
  const id = readParam(req, 'id')
  const file = backupFilePath(id)
  if (!file) {
    res.status(404).json({ error: '未找到该备份' })
    return
  }
  res.type('application/json')
  res.download(file, id)
})

backupsRouter.post(
  '/backups/:id/restore',
  requireSession,
  requireScope('backups'),
  auditWrite('restore', (req) => readParam(req, 'id')),
  (req, res) => {
    const id = readParam(req, 'id')
    const payload = readBackup(id)
    if (!payload) {
      res.status(404).json({ error: '未找到该备份' })
      return
    }
    // 覆盖前自动留一份「恢复前快照」，便于回退
    createBackup('pre-restore')
    restoreSnapshot(payload)
    res.json({ ok: true })
  },
)

backupsRouter.delete(
  '/backups/:id',
  requireSession,
  requireScope('backups'),
  auditWrite('delete-backup', (req) => readParam(req, 'id')),
  (req, res) => {
    if (!deleteBackup(readParam(req, 'id'))) {
      res.status(404).json({ error: '未找到该备份' })
      return
    }
    res.json({ ok: true })
  },
)

backupsRouter.post(
  '/reset',
  requireSession,
  requireScope('system'),
  auditWrite('reset', (req) => readString((req.body as Record<string, unknown>)?.scope) || 'all'),
  (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>
    const scope = readString(body.scope) || 'all'
    const key = readString(body.key)
    switch (scope) {
      case 'all':
        resetContentToSeed()
        resetAllCollections()
        resetAdminResources()
        break
      case 'pages':
        resetContentToSeed()
        break
      case 'collections':
        if (key) {
          if (!isCollectionKey(key)) {
            res.status(400).json({ error: '未知的集合 key' })
            return
          }
          resetCollection(key)
        } else {
          resetAllCollections()
        }
        break
      case 'admin':
        resetAdminResources(key || undefined)
        break
      default:
        res.status(400).json({ error: '未知的重置范围（scope 应为 all | pages | collections | admin）' })
        return
    }
    res.json({ ok: true })
  },
)

/**
 * 内容导出 / 导入（工程运营 ⑨E4）：在既有备份模块上扩展的「一键导出 JSON / 导入还原」。
 *
 *   GET  /admin/content/export  → 直接回传当前全站内容快照（content_pages / site_config /
 *                                 collections / admin_resources），作为附件下载；无需先建备份。
 *   POST /admin/content/import  → body 为快照 JSON；校验结构后先自动留一份 `pre-import`
 *                                 备份，再整表覆盖还原（失败不落库）。
 *
 * 导出沿用 `backups` 读权限；导入等同「整体覆盖」，故按 `system` 权限收紧。
 */
backupsRouter.get('/content/export', requireSession, requireScope('backups'), (_req, res) => {
  const payload = snapshot()
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  res.setHeader('Content-Disposition', `attachment; filename="guanghun-content-${ts}.json"`)
  res.type('application/json')
  res.send(JSON.stringify(payload))
})

backupsRouter.post(
  '/content/import',
  requireSession,
  requireScope('system'),
  auditWrite('import-content', () => 'all'),
  (req, res) => {
    const payload = req.body as BackupSnapshot
    if (!payload || typeof payload !== 'object' || !payload.data) {
      res.status(400).json({ error: '导入内容结构不合法：缺少 data 字段' })
      return
    }
    try {
      // 覆盖前自动留一份「导入前快照」，便于回退
      createBackup('pre-import')
      restoreSnapshot(payload)
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '导入失败' })
      return
    }
    res.json({ ok: true })
  },
)
