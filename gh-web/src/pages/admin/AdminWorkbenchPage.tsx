/**
 * 工作台首页：今日焦点 + 关键指标 + 最近动态 / 快捷入口。
 *
 * 信息架构按「先处理、再观察、后进入」排布：
 * 1. 焦点区：只放有数据的待办（最多 4 张），一眼看清今天要做什么，点击直达；
 * 2. 指标区：4 个核心数字，横向紧凑排布；
 * 3. 双栏：左「最近动态」用列表而非表格，右「快捷入口」降低常用操作层级。
 * 目标是一屏内完成主要判断，不依赖长滚动。
 *
 * 数据来自 GET /api/admin/overview。
 */
import { Link } from 'react-router-dom'
import { fetchAdminOverview } from '../../api/admin'
import { useApi } from '../../hooks/useApi'
import { adminResource } from '../../data/adminResources'
import { AdminIcon } from '../../components/admin/AdminIcon'
import { AdminPageHead } from '../../components/admin/AdminPageHead'
import { ErrorState } from '../../components/admin/states'
import { IconChevronRight } from '../../components/ui/Icon'

const TONE_WEIGHT: Record<string, number> = { danger: 0, warning: 1, info: 2 }
const MAX_FOCUS = 4

/** 快捷入口：后台每天最常做的六件事 */
const QUICK_LINKS = [
  { to: '/admin/products/new', label: '新建产品', desc: '上架型号与 SKU', icon: 'cube' },
  { to: '/admin/articles/new', label: '撰写文章', desc: '资讯 / 评测 / 教程', icon: 'book' },
  { to: '/admin/pages', label: '首页装修', desc: '区块与页面结构', icon: 'sliders' },
  { to: '/admin/inquiries', label: '客户咨询', desc: '留言与询价处理', icon: 'chat' },
  { to: '/admin/site', label: '站点配置', desc: '品牌与全局设置', icon: 'globe' },
  { to: '/admin/analytics/traffic', label: '访问分析', desc: '流量与转化趋势', icon: 'monitor' },
]

/** 字节数 → 可读体积（后台健康展示用） */
function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

/** 秒数 → 「X天Y小时 / X小时Y分 / X分钟」 */
function formatUptime(sec: number): string {
  const days = Math.floor(sec / 86400)
  const hours = Math.floor((sec % 86400) / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  if (days > 0) return `${days} 天 ${hours} 小时`
  if (hours > 0) return `${hours} 小时 ${minutes} 分`
  return `${minutes} 分钟`
}

// 后台工作台：拉取概览数据，展示今日焦点待办、关键指标与快捷入口
export function AdminWorkbenchPage() {
  const state = useApi((signal) => fetchAdminOverview(signal), [])
  const overview = state.data

  // 焦点区：只保留有数据的待办，按紧急度排序后取前 4；其余折叠为一行文字
  const focus = overview
    ? [...overview.todos]
        .filter((todo) => todo.count > 0)
        .sort((a, b) => (TONE_WEIGHT[a.tone ?? 'info'] ?? 9) - (TONE_WEIGHT[b.tone ?? 'info'] ?? 9))
    : []
  const focusTop = focus.slice(0, MAX_FOCUS)
  const focusRest = focus.slice(MAX_FOCUS)

  return (
    <div className="admin-page admin-workbench">
      <AdminPageHead
        title="工作台"
        desc="今天需要处理的客户事项、内容维护与站点动态。"
        actions={
          <>
            <Link className="btn btn--secondary btn--sm" to="/admin/pages">
              首页装修
            </Link>
            <Link className="btn btn--primary btn--sm" to="/admin/products/new">
              新建产品
            </Link>
          </>
        }
      />

      {state.loading && !overview && <p className="admin-page__desc" role="status">正在加载概览…</p>}
      {state.error && <ErrorState message={state.error.message} />}

      {overview && (
        <>
          {/* 焦点区：可处理任务 */}
          <section className="admin-focus" aria-label="今日焦点">
            <div className="admin-focus__head">
              <h2 className="admin-focus__title">今日焦点</h2>
              <span className="admin-focus__hint">
                {focus.length > 0 ? `${focus.length} 项待处理` : '全部处理完毕'}
              </span>
            </div>

            {focusTop.length > 0 ? (
              <div className="admin-focus__grid">
                {focusTop.map((item) => (
                  <Link
                    key={item.id}
                    to={item.to}
                    className={`admin-focus__card admin-focus__card--${item.tone ?? 'info'}`}
                  >
                    <span className="admin-focus__icon">
                      <AdminIcon name={item.icon ?? 'grid'} size={18} />
                    </span>
                    <span className="admin-focus__body">
                      <span className="admin-focus__label">{item.label}</span>
                      {item.desc && <span className="admin-focus__desc">{item.desc}</span>}
                    </span>
                    <span className="admin-focus__count">{item.count}</span>
                    <span className="admin-focus__go" aria-hidden="true">
                      <IconChevronRight size={16} />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="admin-focus__clear">
                <span className="admin-focus__clear-icon">
                  <AdminIcon name="trophy" size={20} />
                </span>
                <div>
                  <p className="admin-focus__clear-title">没有待处理事项</p>
                  <p className="admin-focus__clear-desc">可以继续完善产品资料，或检查首页内容的展示效果。</p>
                </div>
              </div>
            )}

            {focusRest.length > 0 && (
              <div className="admin-focus__rest">
                <span>其他待办</span>
                {focusRest.map((item) => (
                  <Link key={item.id} to={item.to} className="admin-chip">
                    {item.label}
                    <span className="admin-focus__rest-count">{item.count}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* 指标区：核心数字 */}
          <div className="admin-kpis" aria-label="核心指标">
            {overview.stats.map((stat) => (
              <div className="admin-kpi admin-kpi--compact" key={stat.key}>
                <span className="admin-kpi__icon">
                  <AdminIcon name={adminResource(stat.key)?.icon ?? 'grid'} size={16} />
                </span>
                <span className="admin-kpi__meta">
                  <span className="admin-kpi__label">{stat.label}</span>
                  <span className="admin-kpi__value">{stat.value.toLocaleString('zh-CN')}</span>
                </span>
              </div>
            ))}
          </div>

          {/* 内容状态 + 站点健康：一眼看到「哪里还欠着」和「服务是否正常」 */}
          {overview.content && (
            <div className="admin-statusbar" aria-label="内容状态与站点健康">
              <Link to="/admin/pages" className="admin-statusbar__item">
                未发布草稿 <b>{overview.content.draftPages}</b>
              </Link>
              <Link to="/admin/downloads" className="admin-statusbar__item">
                资料缺文件 <b>{overview.content.pendingDownloads}</b>
              </Link>
              <Link to="/admin/products" className="admin-statusbar__item">
                产品缺购买链接 <b>{overview.content.missingBuyUrl}</b>
              </Link>
              {overview.health && (
                <span className="admin-statusbar__health">
                  服务运行 {formatUptime(overview.health.uptimeSec)} · 数据库 {formatBytes(overview.health.dbBytes)} · 素材{' '}
                  {formatBytes(overview.health.uploadBytes)}（{overview.health.uploadCount} 个）· 最近备份{' '}
                  {overview.health.lastBackupAt ? overview.health.lastBackupAt.slice(0, 10) : '暂无'}
                </span>
              )}
            </div>
          )}

          {/* 内容与动态：左动态，右快捷入口 */}
          <div className="admin-cols admin-cols--workbench">
            <section className="admin-panel">
              <div className="admin-panel__head">
                <h2 className="admin-panel__title">最近动态</h2>
                <span className="admin-panel__hint">最近 {overview.recent.length} 条操作</span>
              </div>
              {overview.recent.length > 0 ? (
                <ul className="admin-activity">
                  {overview.recent.map((row) => (
                    <li className="admin-activity__item" key={row.id}>
                      <span className="admin-activity__dot" aria-hidden="true" />
                      <span className="admin-activity__main">
                        <span className="admin-activity__who">{row.who}</span>
                        <span className="admin-activity__action">{row.action}</span>
                        <span className="admin-activity__target">{row.target}</span>
                      </span>
                      <time className="admin-activity__at mono">{row.at}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-page__desc">暂无操作记录。</p>
              )}
            </section>

            <section className="admin-panel">
              <div className="admin-panel__head">
                <h2 className="admin-panel__title">快捷入口</h2>
              </div>
              <div className="admin-quick">
                {QUICK_LINKS.map((link) => (
                  <Link key={link.to} to={link.to} className="admin-quick__item">
                    <span className="admin-quick__icon">
                      <AdminIcon name={link.icon} size={16} />
                    </span>
                    <span className="admin-quick__text">
                      <span className="admin-quick__label">{link.label}</span>
                      <span className="admin-quick__desc">{link.desc}</span>
                    </span>
                    <IconChevronRight size={14} className="admin-quick__arrow" />
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
