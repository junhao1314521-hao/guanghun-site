import { Router } from 'express'
import {
  CONTACT_PAYLOAD,
  DOWNLOAD_CATEGORIES,
  DOWNLOAD_TYPES,
  FAQ_CATEGORIES,
  getDownloadDetail,
  getFaqDetail,
} from '../data/support-extra'
import { createCollectionItem, getCollectionItem, listCollection } from '../data/collectionStore'
import { getUserSession, USER_SESSION_COOKIE } from '../data/userStore'
import { readLocale } from '../data/locale'
import { checkCaptcha, honeypotHit } from '../lib/formGuard'
import { readCookie } from '../middleware/adminAuth'

/**
 * 服务支持深度线端点（挂载于 /api）：
 * GET  /downloads、/downloads/:id、/faq、/faq/:id、/support/model/:id、/contact
 * POST /inquiry
 *
 * 下载 / 问答 / 型号支持集合均来自集合存储（单一数据源）；分类 / 类型 chip 选项为既有静态配置。
 */

/** 读取字符串字段并去除首尾空白，非字符串一律视为空 */
function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export const supportExtraRouter = Router()

supportExtraRouter.get('/downloads', (req, res) => {
  res.json({ items: listCollection('downloads', readLocale(req)), categories: DOWNLOAD_CATEGORIES, types: DOWNLOAD_TYPES })
})

supportExtraRouter.get('/downloads/:id', (req, res) => {
  const detail = getDownloadDetail(listCollection('downloads', readLocale(req)), req.params.id)
  if (!detail) {
    res.status(404).json({ error: '未找到该资料' })
    return
  }
  res.json(detail)
})

supportExtraRouter.get('/faq', (req, res) => {
  res.json({ items: listCollection('faqs', readLocale(req)), categories: FAQ_CATEGORIES })
})

supportExtraRouter.get('/faq/:id', (req, res) => {
  const detail = getFaqDetail(listCollection('faqs', readLocale(req)), req.params.id)
  if (!detail) {
    res.status(404).json({ error: '未找到该问答' })
    return
  }
  res.json(detail)
})

supportExtraRouter.get('/support/model/:id', (req, res) => {
  const model = getCollectionItem('models', req.params.id, readLocale(req))
  if (!model) {
    res.status(404).json({ error: '未找到该型号的支持资料' })
    return
  }
  res.json(model)
})

supportExtraRouter.post('/inquiry', (req, res) => {
  // 前台「咨询 / 留言」表单真实入库：写入 inquiries 集合（与后台「咨询工单」同一份数据）。
  // 形状严格对齐 inquiries 规范（契约 §11.2）：{ id, date, tag, accent?, title, contact, model, message, status }。
  const body = (req.body ?? {}) as Record<string, unknown>
  // 反垃圾三件套：限流（全局）/ 图形验证码 / 蜜罐字段
  if (!checkCaptcha(body, res)) return
  // 蜜罐命中：按「疑似机器人」静默成功（返回合规回执但**不落库**），不给爬虫可观测信号
  if (honeypotHit(body)) {
    res.json({ ok: true, ticketId: `INQ-${Date.now()}`, receivedAt: new Date().toISOString() })
    return
  }
  const name = readString(body.name)
  const contact = readString(body.contact)
  const model = readString(body.model)
  const topic = readString(body.topic)
  const message = readString(body.message)
  // 服务端校验：缺失必填项返回 400，不写入空记录
  if (!name || !contact || !model || !message) {
    res.status(400).json({ error: '请填写称呼、联系方式、产品型号与问题描述' })
    return
  }
  const id = `inq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  // 若已登录（前台 gh_user 会话），把该条咨询归属到当前用户，供个人中心「我的咨询」按用户隔离查看
  const sessionUser = getUserSession(readCookie(req, USER_SESSION_COOKIE))
  const item = createCollectionItem('inquiries', {
    id,
    date: new Date().toISOString().slice(0, 10),
    tag: '处理中',
    accent: true,
    // title 承载「称呼 + 主题」的可读摘要；称呼 / 主题同时**独立落库**，便于筛选与统计
    title: [name, topic].filter(Boolean).join(' · ') || `${name} 的咨询`,
    name,
    topic,
    contact,
    model,
    message,
    status: 'info',
    // 未登录访客提交的咨询无归属（userId 省略），登录用户归其所有
    ...(sessionUser ? { userId: sessionUser.id } : {}),
  })
  res.json({ ok: true, ticketId: item.id, receivedAt: new Date().toISOString() })
})

supportExtraRouter.post('/reservation', (req, res) => {
  // 前台「预约到店」真实入库：写入 reservations 集合（独立实体，与咨询工单分离）。
  const body = (req.body ?? {}) as Record<string, unknown>
  // 反垃圾三件套：限流（全局）/ 图形验证码 / 蜜罐字段
  if (!checkCaptcha(body, res)) return
  if (honeypotHit(body)) {
    res.json({ ok: true, reservationId: `RS-${Date.now()}`, receivedAt: new Date().toISOString() })
    return
  }
  const name = readString(body.name)
  const contact = readString(body.contact)
  const venueId = readString(body.venueId)
  const venueName = readString(body.venueName)
  const visitTime = readString(body.visitTime)
  const note = readString(body.note)
  const rawPeople = Number(body.people)
  const people = Number.isFinite(rawPeople) && rawPeople > 0 ? Math.floor(rawPeople) : 1
  // 服务端校验：缺失必填项返回 400，不写入空记录
  if (!name || !contact) {
    res.status(400).json({ error: '请填写称呼与联系方式' })
    return
  }
  const id = `rs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const sessionUser = getUserSession(readCookie(req, USER_SESSION_COOKIE))
  const item = createCollectionItem('reservations', {
    id,
    venueId,
    venueName,
    name,
    contact,
    visitTime,
    people,
    note,
    status: '待确认',
    createdAt: new Date().toISOString().slice(0, 10),
    ...(sessionUser ? { userId: sessionUser.id } : {}),
  })
  res.json({ ok: true, reservationId: item.id, receivedAt: new Date().toISOString() })
})

supportExtraRouter.get('/contact', (_req, res) => {
  res.json(CONTACT_PAYLOAD)
})
