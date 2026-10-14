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
    { id: 'p-001', name: '闪电 540Hz 电竞OLED显示器', model: '54027X1QE-W54', line: 'OLED旗舰', price: 4999, stock: 320, status: '已上架', updatedAt: '2026-09-20', scene: '电竞对战', featured: true, tagline: '2K@540Hz · 第四代 W-OLED', desc: '面向电竞对战优化的旗舰 OLED 电竞显示器。', cover: '' },
    { id: 'p-002', name: 'Meta 双模 4K 电竞显示器', model: '32X1UE-W16', line: '双模高刷', price: 5499, stock: 260, status: '已上架', updatedAt: '2026-09-05', scene: '内容创作', featured: true, tagline: '4K@165 / FHD@330 · META OLED', desc: '支持 4K 与高刷一键切换的双模 OLED 显示器。', cover: '' },
    { id: 'p-003', name: '27 英寸 2K OLED 显示器', model: '27X1U', line: '双模高刷', price: 2199, stock: 180, status: '已上架', updatedAt: '2026-06-18', scene: '内容创作', featured: false, tagline: '2K 240Hz · QD-OLED', desc: '兼顾画质与电竞的 2K OLED 显示器。', cover: '' },
    { id: 'p-004', name: '27 英寸 2K 电竞显示器', model: '27Q1F', line: '电竞IPS', price: 1299, stock: 540, status: '已上架', updatedAt: '2026-04-10', scene: '商用办公', featured: false, tagline: '2K 200Hz · Fast IPS', desc: '高性价比 2K 高刷电竞显示器。', cover: '' },
    { id: 'p-005', name: '24 英寸 200Hz 电竞显示器', model: '24H1', line: '电竞IPS', price: 799, stock: 0, status: '已下架', updatedAt: '2026-02-26', scene: '商用办公', featured: false, tagline: 'FHD 200Hz · HDR400', desc: '入门级 200Hz 电竞显示器，已下架。', cover: '' },
    { id: 'p-006', name: '显示器悬臂支架', model: 'GH-ARM01', line: '周边', price: 299, stock: 90, status: '草稿', updatedAt: '2026-05-20', scene: '移动与差旅', featured: false, tagline: 'VESA 75/100 · 承重 9 kg', desc: '单臂显示器支架，草稿待发布。', cover: '' },
  ],
  'product-categories': [
    { id: 'c-001', name: 'OLED旗舰', code: 'oled', count: 2, order: 1, status: '启用' },
    { id: 'c-002', name: '双模高刷', code: 'dual', count: 2, order: 2, status: '启用' },
    { id: 'c-003', name: '电竞IPS', code: 'ips', count: 3, order: 3, status: '启用' },
    { id: 'c-004', name: '周边', code: 'accessory', count: 1, order: 4, status: '启用' },
    { id: 'c-005', name: '调校软件', code: 'software', count: 1, order: 5, status: '停用' },
  ],
  'test-records': [
    { id: 'tr-001', title: '54027X1QE-W54 响应时间实测', product: '54027X1QE-W54', metric: '响应时间', value: '0.04 ms', method: '高速相机', status: '已发布', date: '2026-09-25', conclusion: '过驱档位「标准」下 GTG 响应稳定在 0.04 ms 以内。' },
    { id: 'tr-002', title: '32X1UE-W16 HDR 峰值亮度实测', product: '32X1UE-W16', metric: 'HDR 峰值亮度', value: '1180 nit', method: '亮度计', status: '已发布', date: '2026-09-20', conclusion: '10% 窗口下 HDR 峰值亮度达 1180 nit。' },
    { id: 'tr-003', title: '54027X1QE-W54 色准实测', product: '54027X1QE-W54', metric: '色准 ΔE', value: '1.1', method: '色彩分析仪', status: '已发布', date: '2026-09-22', conclusion: '平均 ΔE 1.1，覆盖 sRGB 与 DCI-P3。' },
    { id: 'tr-004', title: '27X1U 亮度均匀度实测', product: '27X1U', metric: '亮度均匀度', value: '92%', method: '9 点采样', status: '审核中', date: '2026-10-01', conclusion: '待复核采样数据后发布。' },
    { id: 'tr-005', title: '28027X1QE-W28 峰值亮度实测', product: '28027X1QE-W28', metric: 'HDR 峰值亮度', value: '1050 nit', method: '亮度计', status: '草稿', date: '2026-09-28', conclusion: '' },
  ],
  rankings: [
    { id: 'rk-001', name: '综合榜 · 响应时间', scope: '综合榜', metric: '响应时间', entries: 10, status: '已发布', updatedAt: '2026-09-25', note: '综合各型号显示器实测数据。' },
    { id: 'rk-002', name: '亮度榜 · HDR 峰值亮度', scope: '亮度榜', metric: '峰值亮度', entries: 10, status: '已发布', updatedAt: '2026-09-20', note: '' },
    { id: 'rk-003', name: '色准榜 · 平均 ΔE', scope: '色准榜', metric: '色准', entries: 10, status: '已发布', updatedAt: '2026-09-15', note: '' },
    { id: 'rk-004', name: '响应榜 · 综合', scope: '响应榜', metric: '响应时间', entries: 10, status: '草稿', updatedAt: '2026-09-10', note: '待补全条目。' },
  ],
  methods: [
    { id: 'm-001', name: '响应时间测试方法', category: '响应', version: 'v2.1', owner: '林知远', status: '已发布', updatedAt: '2026-09-25', detail: '以高速相机同步触发，记录灰阶到灰阶（GTG）的响应时延。' },
    { id: 'm-002', name: '亮度均匀性测试方法', category: '亮度', version: 'v1.4', owner: '周予安', status: '已发布', updatedAt: '2026-08-22', detail: '在统一亮度与色温下，按 9 点采样评估亮度均匀性。' },
    { id: 'm-003', name: '色准测试方法', category: '色准', version: 'v1.2', owner: '沈牧', status: '已发布', updatedAt: '2026-08-10', detail: '色彩分析仪测量 ΔE，覆盖 sRGB 与 DCI-P3 色域。' },
    { id: 'm-004', name: 'HDR 峰值亮度测试方法', category: '亮度', version: 'v1.0', owner: '林知远', status: '草稿', updatedAt: '2026-09-30', detail: '按 10% 窗口测量 HDR 峰值亮度与持续亮度。' },
  ],
  articles: [
    { id: 'a-001', title: 'OLED 电竞显示器响应实测：从面板到像素', category: '评测', author: '林知远', status: '已发布', publishedAt: '2026-09-25', views: 18420, tags: '响应,实测,OLED', summary: '用高速相机对比多款 OLED 的 GTG 响应。', body: '' },
    { id: 'a-002', title: '双模显示器横评：4K 与高刷怎么选', category: '评测', author: '周予安', status: '已发布', publishedAt: '2026-09-06', views: 12630, tags: '双模,4K,高刷', summary: '4K@165 与 FHD@330 两种模式的对比。', body: '' },
    { id: 'a-003', title: 'Center v2.4 固件更新说明', category: '教程', author: '客服组', status: '已发布', publishedAt: '2026-09-18', views: 7420, tags: 'Center,固件', summary: '固件更新与常见问题处理。', body: '' },
    { id: 'a-004', title: '2026 电竞显示器趋势观察', category: '技术', author: '沈牧', status: '审核中', publishedAt: '2026-10-05', views: 0, tags: '趋势', summary: 'OLED 与高刷的下一步。', body: '' },
    { id: 'a-005', title: '光魂秋季新品预告', category: '资讯', author: '品牌组', status: '草稿', publishedAt: '2026-10-08', views: 0, tags: '新品', summary: '秋季新品信息，待发布。', body: '' },
  ],
  taxonomy: [
    { id: 'tx-001', name: '评测', type: '分类', count: 18, status: '启用', order: 1, desc: '产品评测类文章。' },
    { id: 'tx-002', name: '教程', type: '分类', count: 12, status: '启用', order: 2, desc: '使用教程类文章。' },
    { id: 'tx-003', name: '技术', type: '分类', count: 9, status: '启用', order: 3, desc: '面板 / 驱动 / 原理与测试方法。' },
    { id: 'tx-004', name: '资讯', type: '分类', count: 7, status: '启用', order: 4, desc: '品牌动态、新闻与媒体报道。' },
    { id: 'tx-005', name: 'OLED', type: '标签', count: 14, status: '启用', order: 1, desc: '' },
    { id: 'tx-006', name: '高刷', type: '标签', count: 11, status: '启用', order: 2, desc: '' },
  ],
  downloads: [
    { id: 'd-001', name: 'Center 显示器调校软件 3.2.1（Windows）', type: '工具', version: '3.2.1', platform: 'Windows', size: '48.2 MB', downloads: 3240, status: '已发布', updatedAt: '2026-09-18', url: '', changelog: '支持新增显示器型号识别。' },
    { id: 'd-002', name: '54027X1QE-W54 固件 1.6.3', type: '固件', version: '1.6.3', platform: '通用', size: '6.4 MB', downloads: 5120, status: '已发布', updatedAt: '2026-09-15', url: '', changelog: '修复 DP 2.1 满速握手偶发降速。' },
    { id: 'd-003', name: 'Center 显示器调校软件 3.2.1（macOS）', type: '工具', version: '3.2.1', platform: 'macOS', size: '46.8 MB', downloads: 1180, status: '已发布', updatedAt: '2026-09-18', url: '', changelog: '' },
    { id: 'd-004', name: '32X1UE-W16 说明书', type: '说明书', version: 'v1.3', platform: '通用', size: '5.6 MB', downloads: 860, status: '已发布', updatedAt: '2026-09-05', url: '', changelog: '' },
    { id: 'd-005', name: '显示器固件刷新工具', type: '工具', version: '2.0.4', platform: 'Windows', size: '9.7 MB', downloads: 640, status: '草稿', updatedAt: '2026-10-01', url: '', changelog: '待验证后发布。' },
  ],
  assets: [
    { id: 'as-001', name: '首页主视觉 · 秋季', kind: '图片', size: '2.4 MB', usage: '首页首屏', uploadedBy: '品牌组', uploadedAt: '2026-09-28', source: '', tags: '主视觉,秋季' },
    { id: 'as-002', name: '54027X1QE-W54 产品图', kind: '图片', size: '1.8 MB', usage: '产品详情', uploadedBy: '品牌组', uploadedAt: '2026-09-20', source: '', tags: '产品图' },
    { id: 'as-003', name: 'Center 功能演示视频', kind: '视频', size: '86 MB', usage: 'Center 页', uploadedBy: '品牌组', uploadedAt: '2026-09-05', source: '', tags: '演示' },
    { id: 'as-004', name: '合作案例图集', kind: '图片', size: '12 MB', usage: '商业合作案例', uploadedBy: '运营组', uploadedAt: '2026-08-30', source: '', tags: '案例' },
    { id: 'as-005', name: '品牌 VI 规范文档', kind: '文档', size: '5.6 MB', usage: '商务资料', uploadedBy: '品牌组', uploadedAt: '2026-08-12', source: '', tags: 'VI' },
  ],
  pages: [
    { id: 'pg-001', title: '首页', path: '/', status: '已发布', updatedBy: '管理员', updatedAt: '2026-10-11', views: 98620, seoTitle: '光魂 · 电竞显示器官网', seoDesc: '以实测数据定义电竞显示性能。' },
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
    { id: 'iq-001', subject: '升级固件后显示器偶发无信号', customer: '陈屿', model: '54027X1QE-W54', priority: '高', status: '处理中', assignee: '技术支持', createdAt: '2026-10-10', reply: '' },
    { id: 'iq-002', subject: '双模切换后刷新率偏低', customer: '林墨', model: '32X1UE-W16', priority: '中', status: '待处理', assignee: '未指派', createdAt: '2026-10-09', reply: '' },
    { id: 'iq-003', subject: '屏幕局部出现残影', customer: '苏晚', model: '27Q1F', priority: '中', status: '已解决', assignee: '客服组', createdAt: '2026-10-05', reply: '已指导调整过驱档位并开启像素刷新，问题解决。' },
    { id: 'iq-004', subject: '发票与烧屏保修咨询', customer: '周航', model: '54027X1QE-W54', priority: '低', status: '已关闭', assignee: '客服组', createdAt: '2026-09-28', reply: '已提供发票与保修说明。' },
    { id: 'iq-005', subject: '支架安装与承重咨询', customer: '顾一', model: 'GH-ARM01', priority: '低', status: '待处理', assignee: '未指派', createdAt: '2026-10-08', reply: '' },
  ],
  devices: [
    { id: 'dv-001', serial: 'GH-540-2026-000128', model: '54027X1QE-W54', owner: '陈屿', warranty: '保修中', registeredAt: '2026-09-20', status: '正常' },
    { id: 'dv-002', serial: 'GH-321-2026-000451', model: '32X1UE-W16', owner: '林墨', warranty: '保修中', registeredAt: '2026-09-05', status: '正常' },
    { id: 'dv-003', serial: 'GH-27Q-2026-000233', model: '27Q1F', owner: '苏晚', warranty: '保修中', registeredAt: '2026-04-10', status: '维修中' },
    { id: 'dv-004', serial: 'GH-540-2025-000902', model: '54027X1QE-W54', owner: '周航', warranty: '已过保', registeredAt: '2025-11-20', status: '正常' },
    { id: 'dv-005', serial: 'GH-ARM-2026-000015', model: 'GH-ARM01', owner: '顾一', warranty: '待激活', registeredAt: '2026-05-20', status: '正常' },
  ],
  faqs: [
    { id: 'fq-001', question: '如何升级显示器固件？', category: '使用', views: 3240, status: '已发布', updatedAt: '2026-09-18', answer: '打开 Center → 显示器 → 固件更新，按提示完成。' },
    { id: 'fq-002', question: '保修期是多久？', category: '保修', views: 5120, status: '已发布', updatedAt: '2026-08-30', answer: '整机三年质保，含 OLED 烧屏保护，具体以随附保修卡为准。' },
    { id: 'fq-003', question: '显示器无法被 Center 识别？', category: '安装', views: 2860, status: '已发布', updatedAt: '2026-09-05', answer: '请更换 DP / USB-C 接口并确认输入源后重试。' },
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
    { id: 'nt-001', title: '54027X1QE-W54 固件 1.6.3 发布', channel: '站内信', audience: '已购客户', sentAt: '2026-09-15', status: '已发送', openRate: '62%', content: '' },
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
    { id: 'bca-001', title: '2026 城市电竞联赛官方显示器', partner: '星耀电竞', category: '赛事', status: '已发布', createdAt: '2026-09-10', summary: '' },
    { id: 'bca-002', title: '高校电竞实验室共建', partner: '东南大学', category: '高校', status: '已发布', createdAt: '2026-08-15', summary: '' },
    { id: 'bca-003', title: '联名显示器系列', partner: '某潮牌', category: '品牌联名', status: '草稿', createdAt: '2026-09-30', summary: '' },
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
    { id: 'log-001', at: '2026-10-11 09:42', who: '运营专员', action: '更新', target: '文章 · 双模显示器横评', ip: '10.0.12.31' },
    { id: 'log-002', at: '2026-10-11 09:10', who: '管理员', action: '发布', target: '页面 · 首页 · 秋季专题', ip: '10.0.12.10' },
    { id: 'log-003', at: '2026-10-10 18:20', who: '客服小光', action: '更新', target: '工单 · INQ-2026-004', ip: '10.0.12.44' },
    { id: 'log-004', at: '2026-10-10 16:05', who: '管理员', action: '新增', target: '产品 · 显示器悬臂支架', ip: '10.0.12.10' },
    { id: 'log-005', at: '2026-10-10 09:00', who: '管理员', action: '登录', target: '后台', ip: '10.0.12.10' },
  ],
  trash: [
    { id: 'tl-001', name: '旧版首页草稿', type: '页面', deletedBy: '管理员', deletedAt: '2026-10-01' },
    { id: 'tl-002', name: '下架产品 24H1', type: '产品', deletedBy: '运营专员', deletedAt: '2026-09-28' },
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
