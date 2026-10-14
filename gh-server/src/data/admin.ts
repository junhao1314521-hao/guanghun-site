/**
 * 后台账号、会话与业务数据。
 *
 * 鉴权（阶段 5b 加固）：账号存于 SQLite `admin_users` 表，密码以 **scrypt 加盐哈希** 存储
 * （`salt` + 派生密钥），登录用 **timing-safe** 比较；首次建库时把种子明文哈希后写入。
 * 会话为内存表（token → userId + 过期时间），登录成功后由路由签发 httpOnly Cookie。
 *
 * 数据形状与前端 `gh-web/src/data/admin.ts` 契约一致：
 * 列表统一 `{ items, total }`、详情 `{ item }`，行记录为「字段名 → 值」。
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { getDb, runInTransaction } from './db'
import { normalizeRole, roleName, scopesForRole, type RoleKey } from './roles'

/* ============================================================
   账号与会话
   ============================================================ */

export type AdminUser = {
  id: string
  username: string
  name: string
  /** 角色键（admin / operator）；展示名见 `roleName` */
  role: RoleKey
  /** 由角色派生的权限集（见 roles.ts）；`'*'` 表示全部 */
  scopes: string[]
}

/**
 * 种子账号（仅作为**首次建库时的哈希来源**，明文不落库）：
 * admin / admin123（超级管理员 / role=admin）、operator / oper123（内容运营 / role=operator）。
 * 前端提示的演示凭据与此一致，保持不变。
 */
const ADMIN_USER_SEEDS: Array<{ id: string; username: string; name: string; role: RoleKey; password: string }> = [
  { id: 'u-admin', username: 'admin', name: '管理员', role: 'admin', password: 'admin123' },
  { id: 'u-operator', username: 'operator', name: '运营专员', role: 'operator', password: 'oper123' },
]

/** 会话 Cookie 名 */
export const SESSION_COOKIE = 'gh_admin'

/** scrypt 派生密钥长度（字节） */
const SCRYPT_KEYLEN = 64

/** 生成密码哈希：随机 salt + scrypt 派生密钥（均以 hex 存储） */
export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): { salt: string; hash: string } {
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex')
  return { salt, hash }
}

/** 定时安全比较（长度不等直接判否，避免 timingSafeEqual 抛错） */
export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN)
  const expected = Buffer.from(hash, 'hex')
  if (expected.length !== derived.length) return false
  return timingSafeEqual(derived, expected)
}

/**
 * 对外返回的用户信息（不含密码）。
 * 新增 `roleName`（角色中文名）并保留 `role`（角色键）/ `scopes`（权限集），供前端做菜单显隐。
 */
export type AdminProfile = {
  id: string
  username: string
  name: string
  /** 角色键：admin / operator */
  role: RoleKey
  /** 角色中文展示名 */
  roleName: string
  /** 权限集（由角色派生）；`'*'` 表示全部 */
  scopes: string[]
}

export function toProfile(user: AdminUser): AdminProfile {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    roleName: roleName(user.role),
    scopes: user.scopes,
  }
}

/** 数据库中的账号行 */
type UserRow = { id: string; username: string; salt: string; hash: string; name: string | null; role: string | null; scopes: string | null }

/**
 * 行 → 领域对象：
 * - `role` 归一化为角色键（兼容历史中文展示名；未知按最小权限）；
 * - `scopes` 由角色**派生**（roles.ts 为单一真源），不依赖历史列值，避免前后端权限口径分歧。
 */
function rowToUser(row: UserRow): AdminUser {
  const role = normalizeRole(row.role)
  return { id: row.id, username: row.username, name: row.name ?? '', role, scopes: scopesForRole(role) }
}

/**
 * 初始化后台账号（幂等）：表为空时用种子账号**哈希后**写入。
 * 这同时承担「已存在的明文账号 → 哈希」的一次性迁移：种子明文只在建库时用于派生，
 * 派生结果（salt + hash）落库，明文不再持久化。
 */
export function initAdminUsers(): void {
  const db = getDb()
  const count = (db.prepare('SELECT COUNT(*) AS n FROM admin_users').get() as { n: number }).n
  if (count > 0) return
  runInTransaction((tx) => {
    const insert = tx.prepare(
      'INSERT OR REPLACE INTO admin_users(id, username, salt, hash, name, role, scopes, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)',
    )
    for (const seed of ADMIN_USER_SEEDS) {
      const { salt, hash } = hashPassword(seed.password)
      // role 存角色键，scopes 冗余存派生权限集（真相仍在 roles.ts）
      insert.run(
        seed.id,
        seed.username,
        salt,
        hash,
        seed.name,
        seed.role,
        JSON.stringify(scopesForRole(seed.role)),
        new Date().toISOString(),
      )
    }
  })
}

/** 按用户名取账号行（不存在返回 undefined） */
function findUserByUsername(username: string): UserRow | undefined {
  initAdminUsers()
  return getDb()
    .prepare('SELECT id, username, salt, hash, name, role, scopes FROM admin_users WHERE username = ?')
    .get(username) as UserRow | undefined
}

/** 按 id 取账号行 */
function findUserById(id: string): UserRow | undefined {
  initAdminUsers()
  return getDb()
    .prepare('SELECT id, username, salt, hash, name, role, scopes FROM admin_users WHERE id = ?')
    .get(id) as UserRow | undefined
}

/** 会话条目：userId + 过期时间（毫秒时间戳） */
type Session = { userId: string; expiresAt: number }

/** 内存会话表：token → 会话（重启即失效；过期由这里判定） */
const SESSIONS = new Map<string, Session>()

/** 会话存活时长（毫秒）；SESSION_TTL_MS 可覆盖，默认 8 小时 */
export function sessionTtlMs(): number {
  const raw = Number(process.env.SESSION_TTL_MS)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 8 * 60 * 60 * 1000
}

/** 按账号密码校验并签发会话；失败返回 null */
export function loginAdmin(username: string, password: string): { token: string; user: AdminUser } | null {
  const row = findUserByUsername(username)
  if (!row) return null
  if (!verifyPassword(password, row.salt, row.hash)) return null
  const token = randomBytes(20).toString('hex')
  SESSIONS.set(token, { userId: row.id, expiresAt: Date.now() + sessionTtlMs() })
  return { token, user: rowToUser(row) }
}

/** 按 token 取用户；无效 / 过期返回 undefined（过期条目顺带清理） */
export function getSessionUser(token: string | undefined): AdminUser | undefined {
  if (!token) return undefined
  const session = SESSIONS.get(token)
  if (!session) return undefined
  if (session.expiresAt <= Date.now()) {
    SESSIONS.delete(token)
    return undefined
  }
  const row = findUserById(session.userId)
  return row ? rowToUser(row) : undefined
}

/** 注销会话 */
export function logoutAdmin(token: string | undefined): void {
  if (token) SESSIONS.delete(token)
}

/** 后台资源行（字段名 → 值） */
export type AdminRow = Record<string, string | number | boolean>

/* ============================================================
   资源数据（key 与前端 data/adminResources.ts 对齐）
   ============================================================ */

export const ADMIN_RESOURCE_DATA: Record<string, AdminRow[]> = {
  products: [
    { id: 'p-001', name: 'GH-M900 PRO 无线电竞鼠标', model: 'GH-M900 PRO', line: '电竞鼠标', price: 699, stock: 1280, status: '已上架', updatedAt: '2026-09-12', scene: '电竞对战', featured: true, tagline: '58 g 轻量机身 · 26,000 DPI 光学引擎', desc: '面向电竞对战优化的轻量化无线电竞鼠标。', cover: '' },
    { id: 'p-002', name: 'GH-K870 三模机械键盘', model: 'GH-K870', line: '机械键盘', price: 899, stock: 640, status: '已上架', updatedAt: '2026-09-08', scene: '商用办公', featured: true, tagline: '三模连接 · 全键热插拔', desc: '支持有线 / 蓝牙 / 2.4G 三模连接的机械键盘。', cover: '' },
    { id: 'p-003', name: 'GH-H500 无线游戏耳机', model: 'GH-H500', line: '游戏耳机', price: 599, stock: 420, status: '已上架', updatedAt: '2026-08-30', scene: '内容创作', featured: false, tagline: '低延迟 2.4G · 可拆卸麦克风', desc: '兼顾游戏与创作的无线耳机。', cover: '' },
    { id: 'p-004', name: 'GH-P300 大尺寸鼠标垫', model: 'GH-P300', line: '鼠标垫配件', price: 199, stock: 2100, status: '已上架', updatedAt: '2026-08-15', scene: '电竞对战', featured: false, tagline: '900×400 · 细面顺滑', desc: '大尺寸细面鼠标垫。', cover: '' },
    { id: 'p-005', name: 'GH-M700 无线鼠标（标准版）', model: 'GH-M700', line: '电竞鼠标', price: 399, stock: 0, status: '已下架', updatedAt: '2026-07-20', scene: '移动与差旅', featured: false, tagline: '轻量无线 · 长续航', desc: '上一代无线鼠标，已下架。', cover: '' },
    { id: 'p-006', name: 'GH-K680 客制化键盘', model: 'GH-K680', line: '机械键盘', price: 1099, stock: 60, status: '草稿', updatedAt: '2026-10-02', scene: '内容创作', featured: false, tagline: 'Gasket 结构 · 铝坨坨', desc: '客制化套件，草稿待发布。', cover: '' },
  ],
  'product-categories': [
    { id: 'c-001', name: '电竞鼠标', code: 'mouse', count: 12, order: 1, status: '启用' },
    { id: 'c-002', name: '机械键盘', code: 'keyboard', count: 10, order: 2, status: '启用' },
    { id: 'c-003', name: '游戏耳机', code: 'headset', count: 8, order: 3, status: '启用' },
    { id: 'c-004', name: '鼠标垫配件', code: 'accessory', count: 9, order: 4, status: '启用' },
    { id: 'c-005', name: '键帽与配件', code: 'keycap', count: 7, order: 5, status: '停用' },
  ],
  'test-records': [
    { id: 'tr-001', title: 'GH-M900 PRO 端到端延迟实测', product: 'GH-M900 PRO', metric: '端到端延迟', value: '0.6 ms', method: '示波器采样', status: '已发布', date: '2026-09-12', conclusion: '在 2.4G 模式下端到端延迟稳定在 0.6 ms 以内。' },
    { id: 'tr-002', title: 'GH-K870 蓝牙续航实测', product: 'GH-K870', metric: '续航', value: '78 h', method: '综合评估', status: '已发布', date: '2026-09-09', conclusion: '关闭背光、蓝牙模式下续航达 78 小时。' },
    { id: 'tr-003', title: 'GH-M900 PRO 重量实测', product: 'GH-M900 PRO', metric: '重量', value: '58 g', method: '电子秤', status: '已发布', date: '2026-09-12', conclusion: '不含线材净重 58 g。' },
    { id: 'tr-004', title: 'GH-M900 PRO 8K 回报率延迟', product: 'GH-M900 PRO', metric: '回报率', value: '0.29 ms', method: '高速相机', status: '审核中', date: '2026-10-01', conclusion: '待复核采样数据后发布。' },
    { id: 'tr-005', title: 'GH-H500 佩戴重量', product: 'GH-H500', metric: '重量', value: '268 g', method: '电子秤', status: '草稿', date: '2026-09-28', conclusion: '' },
  ],
  rankings: [
    { id: 'rk-001', name: '综合榜 · 端到端延迟', scope: '综合榜', metric: '端到端延迟', entries: 10, status: '已发布', updatedAt: '2026-09-20', note: '综合鼠标 / 键盘 / 耳机实测数据。' },
    { id: 'rk-002', name: '鼠标榜 · 续航', scope: '鼠标榜', metric: '续航', entries: 10, status: '已发布', updatedAt: '2026-09-18', note: '' },
    { id: 'rk-003', name: '键盘榜 · 延迟', scope: '键盘榜', metric: '端到端延迟', entries: 10, status: '已发布', updatedAt: '2026-09-15', note: '' },
    { id: 'rk-004', name: '耳机榜 · 重量', scope: '耳机榜', metric: '重量', entries: 10, status: '草稿', updatedAt: '2026-09-10', note: '待补全条目。' },
  ],
  methods: [
    { id: 'm-001', name: '端到端延迟测试方法', category: '延迟', version: 'v2.1', owner: '林知远', status: '已发布', updatedAt: '2026-09-01', detail: '以示波器同步触发，记录输入到屏幕响应的端到端时延。' },
    { id: 'm-002', name: '无线续航测试方法', category: '续航', version: 'v1.4', owner: '周予安', status: '已发布', updatedAt: '2026-08-22', detail: '统一亮度与回报率条件下，循环任务直至电量耗尽。' },
    { id: 'm-003', name: '重量与手感评估方法', category: '手感', version: 'v1.2', owner: '沈牧', status: '已发布', updatedAt: '2026-08-10', detail: '电子秤称重 + 盲测手感评分。' },
    { id: 'm-004', name: '连接稳定性压力测试', category: '稳定性', version: 'v1.0', owner: '林知远', status: '草稿', updatedAt: '2026-09-30', detail: '多干扰源环境下的丢包与重连统计。' },
  ],
  articles: [
    { id: 'a-001', title: '无线鼠标延迟实测：从回报率到端到端', category: '评测', author: '林知远', status: '已发布', publishedAt: '2026-08-25', views: 18420, tags: '延迟,实测,无线', summary: '用示波器与高速相机对比三种无线方案。', body: '' },
    { id: 'a-002', title: '三模键盘续航横评：三种连接方式的真实差距', category: '评测', author: '周予安', status: '已发布', publishedAt: '2026-09-02', views: 12630, tags: '续航,三模', summary: '有线 / 蓝牙 / 2.4G 三种连接下的续航对比。', body: '' },
    { id: 'a-003', title: 'Center v2.4 固件更新说明', category: '教程', author: '客服组', status: '已发布', publishedAt: '2026-09-18', views: 7420, tags: 'Center,固件', summary: '固件更新与常见问题处理。', body: '' },
    { id: 'a-004', title: '2026 电竞外设趋势观察', category: '行业观察', author: '沈牧', status: '审核中', publishedAt: '2026-10-05', views: 0, tags: '趋势', summary: '轻量化与无线化的下一步。', body: '' },
    { id: 'a-005', title: '光魂秋季新品预告', category: '品牌动态', author: '品牌组', status: '草稿', publishedAt: '2026-10-08', views: 0, tags: '新品', summary: '秋季新品信息，待发布。', body: '' },
  ],
  taxonomy: [
    { id: 'tx-001', name: '评测', type: '分类', count: 18, status: '启用', order: 1, desc: '产品评测类文章。' },
    { id: 'tx-002', name: '教程', type: '分类', count: 12, status: '启用', order: 2, desc: '使用教程类文章。' },
    { id: 'tx-003', name: '行业观察', type: '分类', count: 9, status: '启用', order: 3, desc: '行业趋势观察。' },
    { id: 'tx-004', name: '品牌动态', type: '分类', count: 7, status: '启用', order: 4, desc: '品牌与活动动态。' },
    { id: 'tx-005', name: '三模', type: '标签', count: 14, status: '启用', order: 1, desc: '' },
    { id: 'tx-006', name: '轻量化', type: '标签', count: 11, status: '启用', order: 2, desc: '' },
  ],
  downloads: [
    { id: 'd-001', name: 'Center 驱动 3.2.1（Windows）', type: '驱动', version: '3.2.1', platform: 'Windows', size: '48.2 MB', downloads: 3240, status: '已发布', updatedAt: '2026-09-18', url: '', changelog: '支持 GH-K680 预览版配置。' },
    { id: 'd-002', name: 'GH-M900 PRO 固件 1.0.7', type: '固件', version: '1.0.7', platform: '通用', size: '6.4 MB', downloads: 5120, status: '已发布', updatedAt: '2026-09-18', url: '', changelog: '修复低电量下偶发断连。' },
    { id: 'd-003', name: 'Center 驱动 3.2.1（macOS）', type: '驱动', version: '3.2.1', platform: 'macOS', size: '46.8 MB', downloads: 1180, status: '已发布', updatedAt: '2026-09-18', url: '', changelog: '' },
    { id: 'd-004', name: 'GH-K870 说明书', type: '说明书', version: 'v1.0', platform: '通用', size: '3.1 MB', downloads: 860, status: '已发布', updatedAt: '2026-08-28', url: '', changelog: '' },
    { id: 'd-005', name: '固件刷新工具', type: '工具', version: '2.0.4', platform: 'Windows', size: '9.7 MB', downloads: 640, status: '草稿', updatedAt: '2026-10-01', url: '', changelog: '待验证后发布。' },
  ],
  assets: [
    { id: 'as-001', name: '首页主视觉 · 秋季', kind: '图片', size: '2.4 MB', usage: '首页首屏', uploadedBy: '品牌组', uploadedAt: '2026-09-28', source: '', tags: '主视觉,秋季' },
    { id: 'as-002', name: 'GH-M900 PRO 产品图', kind: '图片', size: '1.8 MB', usage: '产品详情', uploadedBy: '品牌组', uploadedAt: '2026-09-12', source: '', tags: '产品图' },
    { id: 'as-003', name: 'Center 功能演示视频', kind: '视频', size: '86 MB', usage: 'Center 页', uploadedBy: '品牌组', uploadedAt: '2026-09-05', source: '', tags: '演示' },
    { id: 'as-004', name: '合作案例图集', kind: '图片', size: '12 MB', usage: '商业合作案例', uploadedBy: '运营组', uploadedAt: '2026-08-30', source: '', tags: '案例' },
    { id: 'as-005', name: '品牌 VI 规范文档', kind: '文档', size: '5.6 MB', usage: '商务资料', uploadedBy: '品牌组', uploadedAt: '2026-08-12', source: '', tags: 'VI' },
  ],
  pages: [
    { id: 'pg-001', title: '首页', path: '/', status: '已发布', updatedBy: '管理员', updatedAt: '2026-10-11', views: 98620, seoTitle: '光魂 · 电竞外设官网', seoDesc: '以实测数据定义电竞装备性能。' },
    { id: 'pg-002', title: '产品列表', path: '/products', status: '已发布', updatedBy: '运营专员', updatedAt: '2026-10-09', views: 42180, seoTitle: '全部产品 · 光魂', seoDesc: '按产品线、场景与新品筛选。' },
    { id: 'pg-003', title: '秋季专题页', path: '/campaign/autumn', status: '草稿', updatedBy: '运营专员', updatedAt: '2026-10-08', views: 0, seoTitle: '秋季专题 · 光魂', seoDesc: '秋季新品与活动。' },
    { id: 'pg-004', title: '商业合作首页', path: '/business', status: '已发布', updatedBy: '运营专员', updatedAt: '2026-09-30', views: 12640, seoTitle: '商业合作 · 光魂', seoDesc: '渠道、赛事与内容合作。' },
    { id: 'pg-005', title: '关于光魂', path: '/about', status: '已发布', updatedBy: '管理员', updatedAt: '2026-09-25', views: 8420, seoTitle: '关于光魂 · 品牌与实验室', seoDesc: '品牌理念与光魂实验室。' },
  ],
  nav: [
    { id: 'nv-001', label: '产品', to: '/products', location: '主导航', order: 1, visible: true },
    { id: 'nv-002', label: 'Center', to: '/center', location: '主导航', order: 2, visible: true },
    { id: 'nv-003', label: '天梯榜', to: '/ladder', location: '主导航', order: 3, visible: true },
    { id: 'nv-004', label: '服务支持', to: '/support', location: '主导航', order: 5, visible: true },
    { id: 'nv-005', label: '隐私政策', to: '/legal/privacy', location: '页脚', order: 1, visible: true },
    { id: 'nv-006', label: '产品入口', to: '/products', location: '移动端', order: 1, visible: true },
  ],
  components: [
    { id: 'cp-001', name: '首屏 Banner', type: '首屏', version: 'v2.0', usage: 6, status: '启用', desc: '全屏首屏区块，支持轮播。' },
    { id: 'cp-002', name: '产品横向轨道', type: '产品', version: 'v1.3', usage: 4, status: '启用', desc: '一排两卡的产品横滑区块。' },
    { id: 'cp-003', name: '数据榜单条', type: '内容', version: 'v1.1', usage: 3, status: '启用', desc: '带渐变条的数据展示。' },
    { id: 'cp-004', name: '转化 CTA 区块', type: '转化', version: 'v1.0', usage: 5, status: '启用', desc: '引导下载 / 咨询的转化区块。' },
  ],
  templates: [
    { id: 'tp-001', name: '营销落地页模板', scope: '营销页', pages: 3, status: '启用', updatedAt: '2026-09-20', desc: '适合专题与活动页。' },
    { id: 'tp-002', name: '产品详情模板', scope: '详情页', pages: 12, status: '启用', updatedAt: '2026-09-14', desc: '产品详情标准布局。' },
    { id: 'tp-003', name: '列表页模板', scope: '列表页', pages: 6, status: '启用', updatedAt: '2026-09-08', desc: '带筛选的列表页布局。' },
  ],
  styles: [
    { id: 'st-001', name: '全局设计令牌', scope: '全局', tokens: 186, status: '启用', updatedAt: '2026-09-01', desc: '颜色 / 间距 / 字号等原子令牌。' },
    { id: 'st-002', name: '组件样式', scope: '组件', tokens: 74, status: '启用', updatedAt: '2026-09-01', desc: '按钮 / 输入 / 卡片等组件样式。' },
    { id: 'st-003', name: '首页专属样式', scope: '页面', tokens: 28, status: '启用', updatedAt: '2026-09-28', desc: '首页皮肤层样式。' },
  ],
  publish: [
    { id: 'pb-001', version: 'v2026.10.11-1', env: '生产', by: '管理员', at: '2026-10-11 09:10', status: '已发布' },
    { id: 'pb-002', version: 'v2026.10.10-3', env: '预发', by: '运营专员', at: '2026-10-10 18:40', status: '待发布' },
    { id: 'pb-003', version: 'v2026.10.08-2', env: '生产', by: '管理员', at: '2026-10-08 14:20', status: '已发布' },
    { id: 'pb-004', version: 'v2026.10.05-1', env: '生产', by: '管理员', at: '2026-10-05 11:05', status: '已回滚' },
  ],
  customers: [
    { id: 'cu-001', name: '陈屿', account: 'chenyu', level: '黄金', devices: 3, tickets: 4, joinedAt: '2025-11-02', status: '正常', note: '' },
    { id: 'cu-002', name: '林墨', account: 'linmo', level: '白银', devices: 2, tickets: 1, joinedAt: '2026-01-18', status: '正常', note: '' },
    { id: 'cu-003', name: '苏晚', account: 'suwan', level: '普通', devices: 1, tickets: 2, joinedAt: '2026-03-09', status: '正常', note: '' },
    { id: 'cu-004', name: '周航', account: 'zhouhang', level: '黑金', devices: 5, tickets: 6, joinedAt: '2025-06-21', status: '正常', note: '核心用户，优先响应。' },
    { id: 'cu-005', name: '顾一', account: 'guyi', level: '普通', devices: 1, tickets: 0, joinedAt: '2026-08-30', status: '冻结', note: '异常登录，已冻结。' },
  ],
  inquiries: [
    { id: 'iq-001', subject: '固件升级后连接偶发中断', customer: '陈屿', model: 'GH-M900 PRO', priority: '高', status: '处理中', assignee: '技术支持', createdAt: '2026-10-10', reply: '' },
    { id: 'iq-002', subject: '蓝牙模式续航偏短', customer: '林墨', model: 'GH-K870', priority: '中', status: '待处理', assignee: '未指派', createdAt: '2026-10-09', reply: '' },
    { id: 'iq-003', subject: '耳机麦克风有底噪', customer: '苏晚', model: 'GH-H500', priority: '中', status: '已解决', assignee: '客服组', createdAt: '2026-10-05', reply: '已指导更换降噪设置，问题解决。' },
    { id: 'iq-004', subject: '发票与保修咨询', customer: '周航', model: 'GH-M900 PRO', priority: '低', status: '已关闭', assignee: '客服组', createdAt: '2026-09-28', reply: '已提供发票与保修说明。' },
    { id: 'iq-005', subject: '键帽更换购买渠道', customer: '顾一', model: 'GH-K680', priority: '低', status: '待处理', assignee: '未指派', createdAt: '2026-10-08', reply: '' },
  ],
  devices: [
    { id: 'dv-001', serial: 'GH-M9P-2026-000128', model: 'GH-M900 PRO', owner: '陈屿', warranty: '保修中', registeredAt: '2026-09-12', status: '正常' },
    { id: 'dv-002', serial: 'GH-K87-2026-000451', model: 'GH-K870', owner: '林墨', warranty: '保修中', registeredAt: '2026-08-28', status: '正常' },
    { id: 'dv-003', serial: 'GH-H50-2026-000233', model: 'GH-H500', owner: '苏晚', warranty: '保修中', registeredAt: '2026-07-30', status: '维修中' },
    { id: 'dv-004', serial: 'GH-M9P-2025-000902', model: 'GH-M900 PRO', owner: '周航', warranty: '已过保', registeredAt: '2025-11-20', status: '正常' },
    { id: 'dv-005', serial: 'GH-K68-2026-000015', model: 'GH-K680', owner: '顾一', warranty: '待激活', registeredAt: '2026-10-02', status: '正常' },
  ],
  faqs: [
    { id: 'fq-001', question: '如何升级固件？', category: '使用', views: 3240, status: '已发布', updatedAt: '2026-09-18', answer: '打开 Center → 设备 → 固件更新，按提示完成。' },
    { id: 'fq-002', question: '保修期是多久？', category: '保修', views: 5120, status: '已发布', updatedAt: '2026-08-30', answer: '整机保修 12 个月，配件 6 个月，具体以随附保修卡为准。' },
    { id: 'fq-003', question: '鼠标无法被 Center 识别？', category: '安装', views: 2860, status: '已发布', updatedAt: '2026-09-05', answer: '请更换 USB 接口并以有线模式连接后重试。' },
    { id: 'fq-004', question: '如何申请售后？', category: '售后', views: 1980, status: '已发布', updatedAt: '2026-08-12', answer: '在服务支持页提交咨询工单，或拨打 400 客服热线。' },
    { id: 'fq-005', question: '支持哪些操作系统？', category: '安装', views: 1420, status: '草稿', updatedAt: '2026-09-28', answer: '' },
  ],
  'service-info': [
    { id: 'si-001', name: '光魂深圳旗舰体验店', city: '深圳', type: '体验点', phone: '400-000-0000', hours: '10:00–21:00', status: '营业中', address: '南山区科技园光魂大厦 1F' },
    { id: 'si-002', name: '光魂北京授权服务网点', city: '北京', type: '服务网点', phone: '400-000-0001', hours: '09:30–18:30', status: '营业中', address: '海淀区中关村大街 88 号' },
    { id: 'si-003', name: '光魂上海授权服务网点', city: '上海', type: '服务网点', phone: '400-000-0002', hours: '09:30–18:30', status: '营业中', address: '徐汇区漕溪北路 100 号' },
    { id: 'si-004', name: '光魂成都体验点', city: '成都', type: '体验点', phone: '400-000-0003', hours: '11:00–20:00', status: '暂停', address: '高新区天府大道 66 号' },
  ],
  notifications: [
    { id: 'nt-001', title: 'GH-M900 PRO 固件 1.0.7 发布', channel: '站内信', audience: '已购客户', sentAt: '2026-09-18', status: '已发送', openRate: '62%', content: '' },
    { id: 'nt-002', title: '秋季新品预告', channel: '邮件', audience: '全部客户', sentAt: '2026-10-08', status: '定时', openRate: '—', content: '' },
    { id: 'nt-003', title: '国庆服务时间调整', channel: '短信', audience: '全部客户', sentAt: '2026-09-28', status: '已发送', openRate: '78%', content: '' },
    { id: 'nt-004', title: '满意度回访', channel: '站内信', audience: '已购客户', sentAt: '2026-09-20', status: '草稿', openRate: '—', content: '' },
  ],
  'biz-content': [
    { id: 'bc-001', title: '华东地区渠道合作', type: '渠道', contact: '王经理', status: '已合作', createdAt: '2026-08-20', desc: '' },
    { id: 'bc-002', title: '电竞媒体送测合作', type: '媒体', contact: '李编辑', status: '洽谈中', createdAt: '2026-09-15', desc: '' },
    { id: 'bc-003', title: '城市赛赞助合作', type: '赛事', contact: '赵赛事', status: '已合作', createdAt: '2026-07-10', desc: '' },
    { id: 'bc-004', title: '高校电竞社团合作', type: '校园', contact: '孙同学', status: '洽谈中', createdAt: '2026-09-28', desc: '' },
    { id: 'bc-005', title: '品牌联名企划', type: '媒体', contact: '周品牌', status: '已结束', createdAt: '2026-05-02', desc: '' },
  ],
  'biz-cases': [
    { id: 'bca-001', title: '2026 城市电竞联赛官方外设', partner: '星耀电竞', category: '赛事', status: '已发布', createdAt: '2026-09-10', summary: '' },
    { id: 'bca-002', title: '高校电竞实验室共建', partner: '东南大学', category: '高校', status: '已发布', createdAt: '2026-08-15', summary: '' },
    { id: 'bca-003', title: '联名键帽系列', partner: '某潮牌', category: '品牌联名', status: '草稿', createdAt: '2026-09-30', summary: '' },
  ],
  'biz-venues': [
    { id: 'bv-001', name: '光魂旗舰体验点 · 深圳', city: '深圳', type: '旗舰体验点', address: '南山区科技园', status: '运营中' },
    { id: 'bv-002', name: '光魂合作体验点 · 上海', city: '上海', type: '合作体验点', address: '徐汇区漕溪北路', status: '运营中' },
    { id: 'bv-003', name: '光魂合作体验点 · 成都', city: '成都', type: '合作体验点', address: '高新区天府大道', status: '筹备中' },
  ],
  staff: [
    { id: 'sf-001', name: '管理员', account: 'admin', role: '超级管理员', dept: '运营中心', lastLogin: '2026-10-11', status: '启用' },
    { id: 'sf-002', name: '运营专员', account: 'operator', role: '内容运营', dept: '内容组', lastLogin: '2026-10-11', status: '启用' },
    { id: 'sf-003', name: '客服小光', account: 'support01', role: '客服', dept: '客服组', lastLogin: '2026-10-10', status: '启用' },
    { id: 'sf-004', name: '数据助理', account: 'analyst01', role: '数据分析', dept: '数据组', lastLogin: '2026-10-09', status: '停用' },
  ],
  roles: [
    { id: 'ro-001', name: '超级管理员', users: 1, scopes: '*', status: '启用', desc: '拥有全部栏目权限。' },
    { id: 'ro-002', name: '内容运营', users: 1, scopes: 'content,site', status: '启用', desc: '内容与装修相关栏目。' },
    { id: 'ro-003', name: '客服', users: 1, scopes: 'service', status: '启用', desc: '客户与服务栏目。' },
    { id: 'ro-004', name: '数据分析', users: 1, scopes: 'analytics', status: '停用', desc: '仅查看数据分析。' },
  ],
  languages: [
    { id: 'lg-001', name: '简体中文', code: 'zh-CN', progress: '100%', status: '已上线', note: '默认语言。' },
    { id: 'lg-002', name: '繁体中文', code: 'zh-TW', progress: '0%', status: '未开始', note: '待排期。' },
    { id: 'lg-003', name: 'English', code: 'en-US', progress: '12%', status: '翻译中', note: '前台已提示英文内容待补。' },
  ],
  integrations: [
    { id: 'ig-001', name: '邮件推送服务', type: '邮件', status: '已接入', updatedAt: '2026-09-20', desc: '用于找回密码与通知邮件。' },
    { id: 'ig-002', name: '站点统计分析', type: '统计', status: '已接入', updatedAt: '2026-09-18', desc: '访问分析数据来源。' },
    { id: 'ig-003', name: '对象存储', type: '存储', status: '已接入', updatedAt: '2026-09-10', desc: '素材库文件存储。' },
    { id: 'ig-004', name: '在线支付', type: '支付', status: '未接入', updatedAt: '2026-08-01', desc: '预留能力。' },
  ],
  logs: [
    { id: 'log-001', at: '2026-10-11 09:42', who: '运营专员', action: '更新', target: '文章 · 三模键盘续航横评', ip: '10.0.12.31' },
    { id: 'log-002', at: '2026-10-11 09:10', who: '管理员', action: '发布', target: '页面 · 首页 · 秋季专题', ip: '10.0.12.10' },
    { id: 'log-003', at: '2026-10-10 18:20', who: '客服小光', action: '更新', target: '工单 · INQ-2026-004', ip: '10.0.12.44' },
    { id: 'log-004', at: '2026-10-10 16:05', who: '管理员', action: '新增', target: '产品 · GH-K680', ip: '10.0.12.10' },
    { id: 'log-005', at: '2026-10-10 09:00', who: '管理员', action: '登录', target: '后台', ip: '10.0.12.10' },
  ],
  trash: [
    { id: 'tl-001', name: '旧版首页草稿', type: '页面', deletedBy: '管理员', deletedAt: '2026-10-01' },
    { id: 'tl-002', name: '下架产品 GH-M700', type: '产品', deletedBy: '运营专员', deletedAt: '2026-09-28' },
    { id: 'tl-003', name: '过时文章 · 2024 回顾', type: '文章', deletedBy: '运营专员', deletedAt: '2026-09-20' },
    { id: 'tl-004', name: '重复素材 · 封面图', type: '素材', deletedBy: '品牌组', deletedAt: '2026-09-15' },
  ],
}

/* ============================================================
   数据分析
   ============================================================ */

export type AdminAnalytics = {
  title: string
  desc: string
  summary: Array<{ key: string; label: string; value: number; delta: string; trend: 'up' | 'down' }>
  series: Array<{ label: string; value: number }>
  tableTitle: string
  columns: string[]
  rows: Array<Array<string | number>>
}

/**
 * 注：`ADMIN_ANALYTICS` 静态占位常量已移除。`GET /api/admin/analytics/:scope` 现由
 * `data/analytics.ts` 的 `buildAnalytics(scope)` 依据**真实统计**（埋点事件 + 集合计数）构造，
 * 响应形状仍为本文件 `AdminAnalytics`。
 */
