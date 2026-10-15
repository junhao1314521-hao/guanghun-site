import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AdminAuthProvider, AdminGuard } from './components/admin/AdminAuth'
import { ToastProvider } from './components/admin/ToastProvider'
import { ConfirmProvider } from './components/admin/ConfirmDialog'
import { ErrorBoundary } from './components/site/ErrorBoundary'
import { FloatingActions } from './components/site/FloatingActions'
import { JsonLd } from './components/site/JsonLd'
import { MobileDrawer } from './components/site/MobileDrawer'
import { PageTransition } from './components/site/PageTransition'
import { AmbientBackdrop } from './components/site/AmbientBackdrop'
import { SiteFooter } from './components/site/SiteFooter'
import { SiteHeader } from './components/site/SiteHeader'
import { usePageMeta } from './hooks/usePageMeta'
import { useRipple } from './hooks/useRipple'
import { useSiteConfig } from './hooks/useSiteConfig'
import { applyThemeTokens } from './lib/siteTheme'
import { setSiteDefaultTheme } from './lib/theme'
import { trackView } from './lib/track'
import { I18nProvider, useI18n } from './i18n'
import { pageIdFromPath } from './data/nav'

// 路由级代码分割：页面按需加载，首屏只载「外壳 + 当前页」chunk
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })))
const SupportPage = lazy(() => import('./pages/SupportPage').then((m) => ({ default: m.SupportPage })))
const BusinessPage = lazy(() => import('./pages/BusinessPage').then((m) => ({ default: m.BusinessPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const CenterPage = lazy(() => import('./pages/CenterPage').then((m) => ({ default: m.CenterPage })))
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })))
const ProductDetailPage = lazy(() =>
  import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })),
)
const LadderPage = lazy(() => import('./pages/LadderPage').then((m) => ({ default: m.LadderPage })))
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })))
const LegalPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.LegalPage })))
const ArticlesPage = lazy(() => import('./pages/ArticlesPage').then((m) => ({ default: m.ArticlesPage })))
const NewsPage = lazy(() => import('./pages/NewsPage').then((m) => ({ default: m.NewsPage })))
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage').then((m) => ({ default: m.ArticleDetailPage })))
const DownloadsPage = lazy(() => import('./pages/DownloadsPage').then((m) => ({ default: m.DownloadsPage })))
const DownloadDetailPage = lazy(() => import('./pages/DownloadDetailPage').then((m) => ({ default: m.DownloadDetailPage })))
const FaqPage = lazy(() => import('./pages/FaqPage').then((m) => ({ default: m.FaqPage })))
const FaqDetailPage = lazy(() => import('./pages/FaqDetailPage').then((m) => ({ default: m.FaqDetailPage })))
const ModelSupportPage = lazy(() => import('./pages/ModelSupportPage').then((m) => ({ default: m.ModelSupportPage })))
const ModelSupportIndexPage = lazy(() =>
  import('./pages/ModelSupportIndexPage').then((m) => ({ default: m.ModelSupportIndexPage })),
)
const InquiryPage = lazy(() => import('./pages/InquiryPage').then((m) => ({ default: m.InquiryPage })))
const ContactPage = lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })))
const BusinessScenesPage = lazy(() => import('./pages/BusinessScenesPage').then((m) => ({ default: m.BusinessScenesPage })))
const BusinessCasesPage = lazy(() => import('./pages/BusinessCasesPage').then((m) => ({ default: m.BusinessCasesPage })))
const BusinessCaseDetailPage = lazy(() =>
  import('./pages/BusinessCaseDetailPage').then((m) => ({ default: m.BusinessCaseDetailPage })),
)
const BusinessVenuesPage = lazy(() => import('./pages/BusinessVenuesPage').then((m) => ({ default: m.BusinessVenuesPage })))
const BusinessVenueDetailPage = lazy(() =>
  import('./pages/BusinessVenueDetailPage').then((m) => ({ default: m.BusinessVenueDetailPage })),
)
const ProductSeriesPage = lazy(() => import('./pages/ProductSeriesPage').then((m) => ({ default: m.ProductSeriesPage })))
const ComparePage = lazy(() => import('./pages/ComparePage').then((m) => ({ default: m.ComparePage })))
const LadderMetricPage = lazy(() => import('./pages/LadderMetricPage').then((m) => ({ default: m.LadderMetricPage })))
const BrandPage = lazy(() => import('./pages/BrandPage').then((m) => ({ default: m.BrandPage })))
const StatusPage = lazy(() => import('./pages/StatusPage').then((m) => ({ default: m.StatusPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const ForgotPage = lazy(() => import('./pages/ForgotPage').then((m) => ({ default: m.ForgotPage })))
const MeLayout = lazy(() => import('./components/site/MeLayout').then((m) => ({ default: m.MeLayout })))
const MePage = lazy(() => import('./pages/MePage').then((m) => ({ default: m.MePage })))
const MeInquiriesPage = lazy(() => import('./pages/MeInquiriesPage').then((m) => ({ default: m.MeInquiriesPage })))
const MeInquiryDetailPage = lazy(() =>
  import('./pages/MeInquiryDetailPage').then((m) => ({ default: m.MeInquiryDetailPage })),
)
const MeDevicesPage = lazy(() => import('./pages/MeDevicesPage').then((m) => ({ default: m.MeDevicesPage })))
const MeFavoritesPage = lazy(() => import('./pages/MeFavoritesPage').then((m) => ({ default: m.MeFavoritesPage })))
const MeNotificationsPage = lazy(() => import('./pages/MeNotificationsPage').then((m) => ({ default: m.MeNotificationsPage })))
const MeSettingsPage = lazy(() => import('./pages/MeSettingsPage').then((m) => ({ default: m.MeSettingsPage })))

// 后台管理系统（与前台外壳完全分离，独立路由树与鉴权）
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })))
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })))
const AdminWorkbenchPage = lazy(() => import('./pages/admin/AdminWorkbenchPage').then((m) => ({ default: m.AdminWorkbenchPage })))
const AdminResourceListPage = lazy(() =>
  import('./pages/admin/AdminResourceListPage').then((m) => ({ default: m.AdminResourceListPage })),
)
const AdminResourceFormPage = lazy(() =>
  import('./pages/admin/AdminResourceFormPage').then((m) => ({ default: m.AdminResourceFormPage })),
)
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })))
const AdminPageBuilderPage = lazy(() =>
  import('./pages/admin/AdminPageBuilderPage').then((m) => ({ default: m.AdminPageBuilderPage })),
)
const AdminSiteConfigPage = lazy(() =>
  import('./pages/admin/AdminSiteConfigPage').then((m) => ({ default: m.AdminSiteConfigPage })),
)
const AdminNotFound = lazy(() => import('./components/admin/AdminNotFound').then((m) => ({ default: m.AdminNotFound })))

/** 404 兜底页：未匹配任何路由时展示，避免空白路由；沿用设计系统的 empty 组件。
 *  v2.1：加「搜索引导」——直接把用户引到站内搜索，而不是干巴巴报错。 */
function NotFound() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  return (
    <div className="container section">
      <div className="empty">
        <div className="empty__title">{t('notFound.title')}</div>
        <p className="empty__desc">{t('notFound.desc')}</p>
        {/* 404 搜索引导：输入关键词直达站内搜索 */}
        <form
          className="row"
          style={{ justifyContent: 'center', gap: 'var(--gh-space-3)', marginBottom: 'var(--gh-space-4)' }}
          onSubmit={(event) => {
            event.preventDefault()
            const query = q.trim()
            navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search')
          }}
        >
          <input
            className="input"
            type="search"
            value={q}
            aria-label="站内搜索"
            placeholder="搜索产品 / 评测 / 支持…"
            style={{ maxWidth: 320 }}
            onChange={(event) => setQ(event.target.value)}
          />
          <button className="btn btn--primary btn--sm" type="submit">
            搜索
          </button>
        </form>
        <div className="row" style={{ justifyContent: 'center', gap: 'var(--gh-space-3)', flexWrap: 'wrap' }}>
          <Link className="btn btn--secondary btn--sm" to="/products">
            浏览产品
          </Link>
          <Link className="btn btn--secondary btn--sm" to="/support">
            服务支持
          </Link>
          <Link className="btn btn--secondary btn--sm" to="/">
            {t('notFound.back')}
          </Link>
        </div>
      </div>
    </div>
  )
}

/** 路由 chunk 加载态：纯文本 + role=status，避免「无限转圈」（AC-18） */
function PageLoading() {
  const { t } = useI18n()
  return (
    <div className="container section" role="status" aria-live="polite">
      {t('common.loading')}
    </div>
  )
}

/** 渲染异常兜底：可原地重试，或返回首页 */
function PageError({ reset }: { reset: () => void }) {
  const { t } = useI18n()
  return (
    <div className="container section">
      <div className="empty">
        <div className="empty__title">{t('error.title')}</div>
        <p className="empty__desc">{t('error.desc')}</p>
        <div style={{ display: 'flex', gap: 'var(--gh-space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn--secondary btn--sm" type="button" onClick={reset}>
            {t('error.retry')}
          </button>
          <Link className="btn btn--secondary btn--sm" to="/">
            {t('notFound.back')}
          </Link>
        </div>
      </div>
    </div>
  )
}

/** 站点外壳：顶栏 + 内容 + 页脚 + 移动端抽屉，随路由切换 */
function AppShell() {
  const { pathname, hash } = useLocation()
  const { lang, setLang, t, notice, dismissNotice } = useI18n()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)

  // 站点级设计令牌：加载站点配置后把 theme 白名单变量注入 <html>（仅前台外壳）
  const site = useSiteConfig()
  useEffect(() => {
    applyThemeTokens(site?.theme)
  }, [site])

  // 站点默认主题：站点配置到达后纠正主题（用户本地选择优先，由 setSiteDefaultTheme 内部判定）
  useEffect(() => {
    setSiteDefaultTheme(site?.defaultTheme)
  }, [site])

  useRipple()

  // 路由级 SEO：标题 / 描述 / canonical / hreflang（双语）/ OG（单一真源 data/meta.ts）
  usePageMeta(pathname, lang)

  // 页面浏览埋点：前台路由切换时上报一次（失败静默，不影响页面；后台路由不在此外壳内）
  useEffect(() => {
    trackView(pathname)
  }, [pathname])

  // 页面标识驱动 .mk-page[data-page]，交互形态按页区分
  const page = pageIdFromPath(pathname)

  // 语言与 <html lang> 同步（无障碍与 SEO）
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // 切页回顶；带锚点时滚动到对应分区（顶栏下拉菜单的链接依赖锚点）。
  // 内容库页面（如 /support#warranty）区块为异步加载，锚点元素可能在首帧尚未渲染，
  // 故在短暂窗口内轮询重试，命中即滚动并停止；始终未命中则回退到顶部。
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    const id = hash.slice(1)
    let tries = 0
    const jump = () => {
      const target = document.getElementById(id)
      if (target) {
        target.scrollIntoView()
        return true
      }
      return false
    }
    if (jump()) return
    const timer = window.setInterval(() => {
      tries += 1
      if (jump() || tries >= 15) window.clearInterval(timer)
    }, 100)
    return () => window.clearInterval(timer)
  }, [pathname, hash])

  return (
    <div className="mk-page" data-page={page} ref={pageRef}>
      {/* 环境背景层：网格底纹 + 品牌光晕 + 噪点 + 光标柔光（位于内容之下） */}
      <AmbientBackdrop />
      {/* 跳过导航直达主内容（键盘 / 读屏用户，WCAG 2.4.1） */}
      <a className="skip-link" href="#main">
        {t('a11y.skipToMain')}
      </a>
      <div className="top-stack">
        <SiteHeader lang={lang} onLangChange={setLang} onOpenDrawer={() => setDrawerOpen(true)} />
      </div>

      <JsonLd pathname={pathname} />

      {notice && (
        <div className="container">
          <div className="lang-notice" role="status" aria-live="polite">
            <span>{notice}</span>
            <button
              className="lang-notice__close"
              type="button"
              aria-label={t('a11y.closeLangNotice')}
              onClick={dismissNotice}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 登录 / 注册为整屏铺满页：去掉页脚上方的全局间距，使其与页面底部无缝衔接 */}
      <main
        id="main"
        tabIndex={-1}
        className={pathname === '/login' || pathname === '/register' ? 'main--flush' : undefined}
      >
        <PageTransition pathname={pathname}>
        {/* key=pathname：路由切换时重置错误边界，避免上一页异常「粘住」下一页 */}
        <ErrorBoundary key={pathname} renderFallback={(reset) => <PageError reset={reset} />}>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              {/* 系列页须先于详情页声明（同为二级动态段，取更具体者） */}
              <Route path="/products/series/:slug" element={<ProductSeriesPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/ladder" element={<LadderPage />} />
              <Route path="/ladder/:metric" element={<LadderMetricPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/articles" element={<ArticlesPage />} />
              <Route path="/articles/:id" element={<ArticleDetailPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/support/models" element={<ModelSupportIndexPage />} />
              <Route path="/support/model/:id" element={<ModelSupportPage />} />
              <Route path="/downloads" element={<DownloadsPage />} />
              <Route path="/downloads/:id" element={<DownloadDetailPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/faq/:id" element={<FaqDetailPage />} />
              <Route path="/inquiry" element={<InquiryPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/business" element={<BusinessPage />} />
              <Route path="/business/scenes" element={<BusinessScenesPage />} />
              <Route path="/business/cases" element={<BusinessCasesPage />} />
              <Route path="/business/cases/:id" element={<BusinessCaseDetailPage />} />
              <Route path="/business/venues" element={<BusinessVenuesPage />} />
              <Route path="/business/venues/:id" element={<BusinessVenueDetailPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/brand/:slug" element={<BrandPage />} />
              <Route path="/center" element={<CenterPage />} />
              {/* 旧的「客户中心」已并入个人中心 /me，旧路径做重定向 */}
              <Route path="/account" element={<Navigate to="/me" replace />} />
              <Route path="/legal/:slug" element={<LegalPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot" element={<ForgotPage />} />
              {/* 个人中心：外壳 + 子路由 */}
              <Route path="/me" element={<MeLayout />}>
                <Route index element={<MePage />} />
                <Route path="inquiries" element={<MeInquiriesPage />} />
                <Route path="inquiries/:id" element={<MeInquiryDetailPage />} />
                <Route path="devices" element={<MeDevicesPage />} />
                <Route path="favorites" element={<MeFavoritesPage />} />
                <Route path="notifications" element={<MeNotificationsPage />} />
                <Route path="settings" element={<MeSettingsPage />} />
              </Route>
              <Route path="/403" element={<StatusPage code={403} />} />
              <Route path="/500" element={<StatusPage code={500} />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
        </PageTransition>
      </main>

      <SiteFooter />

      <FloatingActions />

      <MobileDrawer
        open={drawerOpen}
        lang={lang}
        onLangChange={setLang}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}

/** 后台路由树：独立于前台外壳，含会话上下文、全局反馈层与登录守卫。
 *  注意：本组件挂在外层 `/admin/*` 之下，内部路径须为**相对路径**，
 *  否则 React Router 会拼接成 `/admin/admin/...` 而导致空白页。 */
function AdminArea() {
  return (
    <Suspense fallback={<AdminBootLoading />}>
      <AdminAuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Routes>
              <Route path="login" element={<AdminLoginPage />} />
              <Route
                path="/"
                element={
                  <AdminGuard>
                    <AdminLayout />
                  </AdminGuard>
                }
              >
                <Route index element={<AdminWorkbenchPage />} />
                <Route path="analytics/:scope" element={<AdminAnalyticsPage />} />
                {/* 站点配置编辑器：静态段先于通用 `:key` 匹配（取更具体者） */}
                <Route path="site" element={<AdminSiteConfigPage />} />
                {/* 页面装修器：须先于通用 `:key/:id` 声明（三段路径，取更具体者） */}
                <Route path="pages/:key/builder" element={<AdminPageBuilderPage />} />
                <Route path=":key/new" element={<AdminResourceFormPage />} />
                <Route path=":key/:id" element={<AdminResourceFormPage />} />
                <Route path=":key" element={<AdminResourceListPage />} />
                <Route path="*" element={<AdminNotFound />} />
              </Route>
            </Routes>
          </ConfirmProvider>
        </ToastProvider>
      </AdminAuthProvider>
    </Suspense>
  )
}

/** 后台 chunk 加载态：避免路由切换时出现空白 */
function AdminBootLoading() {
  return (
    <div className="admin-root admin-boot" role="status" aria-live="polite">
      正在加载后台…
    </div>
  )
}

function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          {/* 后台优先匹配；其余全部交给前台外壳（其内部再自行分发） */}
          <Route path="/admin/*" element={<AdminArea />} />
          <Route path="/*" element={<AppShell />} />
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  )
}

export default App
