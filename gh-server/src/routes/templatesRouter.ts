import { Router } from 'express'
import { createCollectionItem, listCollection } from '../data/collectionStore'
import { softDelete } from '../data/trashStore'
import { getPage } from '../data/contentStore'
import { getBlockTypeMeta } from '../data/blockCatalog'
import type { Block, BlockStyle, BlockType } from '../data/contentTypes'
import type { TemplateItem } from '../data/templates'
import { readParam, requireSession } from '../middleware/adminAuth'
import { requireScope } from '../middleware/rbac'
import { auditWrite } from '../middleware/audit'

/**
 * 后台「模板」端点（挂载于 /api/admin，均需 Bearer 会话）。
 *
 * 集合 `templates` 形状：`{ id, name, scope, blockCount, blocks, createdAt }`；
 * `blocks` 为某页面区块的**快照**，供「新建页面从模板起步」时初始化。
 *
 *   GET    /templates            模板列表 { items, total }
 *   POST   /templates            新建模板（支持从页面快照或直接传 blocks）→ { template }
 *   DELETE /templates/:id        删除模板 → { ok: true }（未命中 404）
 *
 * 读写均走集合存储（collectionStore），写入后立即原子落盘。
 */
export const templatesRouter = Router()

/** 读取字符串字段并去除首尾空白 */
function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** 校验并规整区块数组：非法项直接拒绝（返回 null） */
function parseBlocks(raw: unknown): Block[] | null {
  if (!Array.isArray(raw)) return null
  const blocks: Block[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const entry = item as Record<string, unknown>
    const id = readString(entry.id)
    const type = readString(entry.type) as BlockType
    if (!id || !getBlockTypeMeta(type)) return null
    const props = entry.props && typeof entry.props === 'object' ? (entry.props as Record<string, unknown>) : {}
    const block: Block = { id, type, enabled: entry.enabled !== false, props }
    if (entry.style && typeof entry.style === 'object') block.style = entry.style as BlockStyle
    blocks.push(block)
  }
  return blocks
}

templatesRouter.get('/templates', requireSession, requireScope('content'), (_req, res) => {
  const items = listCollection('templates')
  res.json({ items, total: items.length })
})

templatesRouter.post('/templates', requireSession, requireScope('content'), auditWrite('create-template', (req) => readString((req.body as Record<string, unknown>)?.name) || 'template'), (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const name = readString(body.name)
  if (!name) {
    res.status(400).json({ error: '模板名称必填' })
    return
  }
  const scope = readString(body.scope) || '营销页'

  // 区块来源：优先 pageKey（从页面快照），否则取显式 blocks
  let blocks: Block[] = []
  const pageKey = readString(body.pageKey)
  if (pageKey) {
    const page = getPage(pageKey)
    if (!page) {
      res.status(404).json({ error: '未找到该页面' })
      return
    }
    blocks = JSON.parse(JSON.stringify(page.blocks)) as Block[]
  } else if (body.blocks !== undefined) {
    const parsed = parseBlocks(body.blocks)
    if (!parsed) {
      res.status(400).json({ error: '区块数据不合法' })
      return
    }
    blocks = parsed
  }

  const template = createCollectionItem('templates', {
    name,
    scope,
    blockCount: blocks.length,
    blocks,
    createdAt: new Date().toISOString(),
  }) as TemplateItem
  res.status(201).json({ template })
})

templatesRouter.delete('/templates/:id', requireSession, requireScope('content'), auditWrite('delete-template', (req) => readParam(req, 'id')), (req, res) => {
  // 软删除：模板写入回收站（key=templates），可在「回收站」恢复或彻底删除
  const actor = (res.locals.adminUser as { username?: string } | undefined)?.username ?? 'anonymous'
  if (!softDelete('templates', readParam(req, 'id'), actor)) {
    res.status(404).json({ error: '未找到该模板' })
    return
  }
  res.json({ ok: true })
})
