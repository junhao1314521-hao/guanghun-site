# 光魂官网 · 产品需求文档 PRD v2（唯一权威需求文档）

> **本文档是「光魂」电竞外设官网的唯一权威需求文档（single source of truth）。**
> 之前分散的 v0.9/v1 系列文档（页面清单、修订补充包、AC 核对表、后端契约、设计规格、改版需求梳理、开发进度交接等）均为本文档的**历史输入**，其仍然成立的需求已被合并进本文；不再逐份维护。
> 冲突处理原则：**以「代码实现 + 《内容库与装修契约》」为准**（见 §16）。凡文档与代码不一致，以代码为准，并在本文标注实现状态。
> - 版本：v2 ｜ 基准日期：2026-10-13 ｜ 语言：简体中文
> - 关联权威文档：`光魂官网_PRD可测AC核对表_v3.md`、`光魂官网_后端接口契约_v2.md`、`光魂官网_设计规格说明书_v2.md`、`光魂官网_页面组件清单_v2.md`、`光魂官网_部署Runbook_v1.md`、`README.md`（文档索引）
> - 仓库：单体仓库两子项目 —— `gh-web/`（React 19 + Vite + TS，前台 + 后台同一应用）、`gh-server/`（Express 5 + TS，内容库 + 结构化集合 + 上传 + 后台）

---

## 0. 状态标注约定

本文每条需求/能力均带一个实现状态标签，**以 `gh-web/` + `gh-server/` 代码为准**，不得把占位写成已实现：

| 标签 | 含义 |
|---|---|
| ✅ **已实现** | 代码中已具备可用能力，并有测试或可复现路径 |
| ◐ **部分/占位** | 有界面或骨架，但能力不完整，或后端为占位实现（不落库/返回固定值） |
| ⬜ **未实现** | 代码中尚无该能力 |

---

## 1. 项目背景与目标

### 1.1 背景

「光魂」为电竞外设品牌（鼠标 / 键盘 / 耳机 / 配件），需要一个**官网前台**（对外品牌与销售线索入口）与一个**后台管理系统**（内容运营、数据维护、装修发布）。项目此前经历「设计层 → 静态前端 → 接口层 → 内容驱动 + 后台装修 + 单一数据源」多轮演进，现进入「后台可用性 + 视觉修复 + 装修器升级 + 能力补全」阶段。

### 1.2 目标

| # | 目标 | 说明 |
|---|---|---|
| G-1 | 前台内容**可运营** | 页面内容由后台「页面 → 区块」装修驱动，改动即生效，无需发版 |
| G-2 | 后台**可用** | 后台成为运营可日常使用的工具：列表、表单、装修器、素材库、工单闭环 |
| G-3 | 数据**单一真源** | 后台改数据 → 前台端点立即反映，消除「后台一套、前台一套」 |
| G-4 | 品牌**可感知** | 苹果风骨架 + 电竞感皮肤；双主题等价；关键视觉（通栏海报、浮动磨砂导航）到位 |
| G-5 | 工程**可持续** | 设计令牌单一真源、类型契约冻结、自动化门禁、可部署可回滚 |

### 1.3 范围

- **本期（本文覆盖）**：前台全站、后台全栏目、内容库/结构化集合/上传三类存储、装修系统、站点配置、数据分析。
- **可延后**（用户已确认延后，不在本期交付）：多语言英文正文、定时发布、多断点独立布局、**邮件 / 短信服务**（找回密码与通知的信件投递；前台会员账号体系本身已实现，见 §2 / §8 阶段 5，仅「真实发信」依赖邮件服务，当前以开发态令牌替代）。

---

## 2. 用户角色

| 角色 | 是谁 | 主要诉求 | 现有能力状态 |
|---|---|---|---|
| **访客（游客）** | 未登录的浏览者 | 浏览产品/榜单/文章、提交咨询、下载公开资料 | ✅ 前台可浏览；✅ 可提交咨询（后端**已入库**至 `inquiries` 集合，见 §12）；✅ 可下载公开资料入口 |
| **客户（注册用户）** | 前台注册用户 | 查看我的咨询、设备、收藏、订阅 | ✅ 前台个人中心 `/me` 齐全；**登录 / 注册 / 找回 / 修改密码为真实能力**（账号落 SQLite、密码 scrypt 哈希、会话经独立 Cookie `gh_user`，个人中心数据按用户隔离）；仅找回密码因未接邮件服务在开发环境直出令牌（见 §8 阶段 5 边界） |
| **运营（内容运营）** | 后台日常使用者 | 维护产品/文章/页面装修/工单/素材 | ✅ 后台内容栏目可用（CRUD + 装修器 + 上传）；**服务端 RBAC**：`operator` 仅 `content` 权限，访问系统设置 / 备份 / 发布类栏目 → 403 |
| **评测人员** | 后台测试数据维护者 | 维护测试记录/榜单/测试方法 | ◐ 栏目存在；无独立权限控制 |
| **客服人员** | 后台工单处理者 | 处理咨询工单、客户、设备 | ◐ 栏目存在；无独立权限控制 |
| **管理员（超级管理员）** | 后台全权 | 系统设置、角色、语言、接入、日志、备份、发布 | ✅ 全权；「备份」（5b）、「发布记录与回滚」（5C）、「数据分析」（真实埋点统计）、「回收站」（真软删除）为真实能力；「角色与权限」为服务端 RBAC 真源；「语言 / 接入」等仍为占位栏目 |

> **权限现状**：后台鉴权校验「是否携带有效会话（httpOnly Cookie `gh_admin`，兼容 Bearer 令牌）」(阶段 5b)，并已实现**服务端 RBAC**（阶段 4C）：角色 `admin`（全部权限）/ `operator`（内容类权限，见 `gh-server/src/data/roles.ts`），在会话守卫之后按**栏目 / 操作**鉴权——**未登录 401、无权限 403**。登录与 `GET /auth/me` 返回 `role` / `roleName` / `scopes`，供前端做菜单显隐（前端菜单裁剪由另一路前端任务消费）。角色矩阵扩展（如 `客服` / `数据分析`）仍可后续追加。

---

## 3. 信息架构与站点地图

### 3.1 前台路由（已实现于 `gh-web/src/App.tsx`）

| 分组 | 路由 | 页面组件 | 渲染方式 | 状态 |
|---|---|---|---|---|
| 首页 | `/` | HomePage | 内容库 `PageView('home')` | ✅ |
| 产品 | `/products` | ProductsPage | `PageView('products')` + 数据源区块 | ✅ |
| 产品 | `/products/series/:slug` | ProductSeriesPage | 结构化（数据源）+ 装修区（`template-series`） | ✅ |
| 产品 | `/products/:id` | ProductDetailPage | 结构化主体 + 装修区（`template-product`） | ✅ |
| 产品 | `/compare` | ComparePage | 结构化 + 装修区（`template-compare`） | ✅ |
| 天梯榜 | `/ladder` | LadderPage | `PageView('ladder')` + ranking 区块 | ✅ |
| 天梯榜 | `/ladder/:metric` | LadderMetricPage | 结构化 | ✅ |
| 文章 | `/articles` | ArticlesPage | `PageView('articles')` + articleList 区块 | ✅ |
| 文章 | `/articles/:id` | ArticleDetailPage | 结构化主体 + 装修区（`template-article`） | ✅ |
| 新闻 | `/news` | NewsPage | `PageView('news')` + articleList 区块 | ✅ |
| 服务支持 | `/support` | SupportPage | `PageView('support')` | ✅ |
| 服务支持 | `/support/model/:id` | ModelSupportPage | 结构化主体 + 装修区（`template-model`） | ✅ |
| 下载 | `/downloads` | DownloadsPage | `PageView('downloads')` + downloadList 区块 | ✅ |
| 下载 | `/downloads/:id` | DownloadDetailPage | 结构化主体 + 装修区（`template-download`） | ✅ |
| 问答 | `/faq` | FaqPage | `PageView('faq')` + faqList 区块 | ✅ |
| 问答 | `/faq/:id` | FaqDetailPage | 结构化主体 + 装修区（`template-faq`） | ✅ |
| 咨询 | `/inquiry` | InquiryPage | `PageView('inquiry')`（内嵌表单） | ✅ |
| 联系 | `/contact` | ContactPage | `PageView('contact')` | ✅ |
| 商业合作 | `/business` | BusinessPage | `PageView('business')` | ✅ |
| 商业合作 | `/business/scenes` | BusinessScenesPage | `PageView('business-scenes')` | ✅ |
| 商业合作 | `/business/cases` | BusinessCasesPage | `PageView('business-cases')` | ✅ |
| 商业合作 | `/business/cases/:id` | BusinessCaseDetailPage | 结构化主体 + 装修区（`template-case`） | ✅ |
| 商业合作 | `/business/venues` | BusinessVenuesPage | `PageView('business-venues')` | ✅ |
| 商业合作 | `/business/venues/:id` | BusinessVenueDetailPage | 结构化主体 + 装修区（`template-venue`） | ✅ |
| 关于 | `/about` | AboutPage | `PageView('about')` | ✅ |
| 品牌 | `/brand/:slug` | BrandPage | `PageView('brand-<slug>')` | ✅ |
| Center | `/center` | CenterPage | `PageView('center')` | ✅ |
| 客户中心 | `/account` | AccountPage | 结构化（聚合载荷） | ✅ |
| 个人中心 | `/me`、`/me/inquiries`、`/me/inquiries/:id`、`/me/devices`、`/me/favorites`、`/me/notifications`、`/me/settings` | MeLayout + 7 子页 | 真实会话（未登录跳登录页；数据按用户隔离） | ✅ |
| 账号 | `/login`、`/register`、`/forgot` | Login/Register/Forgot | 真实（注册/登录/找回+令牌重置） | ✅ |
| 法务 | `/legal/:slug` | LegalPage | 结构化（骨架正文） | ◐ |
| 搜索 | `/search` | SearchPage | 结构化（索引） | ✅ |
| 错误 | `/403`、`/500`、`*`(404) | StatusPage / NotFound | 结构化 | ✅ |

> **装修区（模板页）现状**：内容库定义了 9 个 `template-*` 页面（产品/系列/对比/文章/下载/问答/案例/体验点/型号），**9 个明细页均已通过 `TemplateBlocks` 渲染对应装修区**（`gh-web/src/blocks/TemplateBlocks.tsx`；产品详情已实测渲染 `text/productGrid/articleList`）→ 属于**已实现**。

### 3.2 后台栏目组（已实现于 `gh-web/src/data/adminResources.ts` 的 `ADMIN_NAV`）

后台为独立路由树 `/admin/*`，共 **8 个栏目组、37 个页面入口**（工作台 1 + 资源栏目 32 + 数据分析 4）：

| 栏目组 | 栏目（key） | 列表视图 | 存储去向 |
|---|---|---|---|
| 工作台 | 工作台首页（`/admin`） | 概览 | `admin.ts` 常量 |
| 产品与评测 | products、product-categories、test-records、rankings、methods | 表格（rankings 含 records 编辑） | 集合 / 资源 |
| 内容与资源 | articles、taxonomy、downloads、assets（素材库） | 表格 / 上传宫格 | 集合 / 上传 |
| 网站与装修 | pages（内容库页面）、site（站点配置）、components、templates、styles、publish | 页面列表 / 站点编辑器 / 表格 | 内容库 / 资源 |
| 客户与服务 | customers、inquiries、devices、faqs、service-info、models、notifications | 表格 | 集合 / 资源 |
| 商业合作 | biz-content、biz-cases、biz-venues | 表格 | 集合 |
| 数据分析 | traffic、products、downloads、content（4 个 scope） | 分析页 | 埋点 `metrics_events` + 集合真实计数 |
| 系统设置 | staff、roles、languages、integrations、logs、trash、backups | 表格 | 资源（`trash` 为真实软删除视图） |

> **口径说明**：原《页面组件清单》把「列表 + 编辑」各计为独立页面，得「后台 44 页」；本实现用「通用列表页 + 通用表单页」承载，故按**栏目**计为 37 个入口。两者不冲突，§5 与《页面组件清单 v2》给出映射。

### 3.3 后台路由（已实现）

```
/admin/login                        后台登录
/admin                             工作台
/admin/analytics/:scope            数据分析（traffic/products/downloads/content）
/admin/site                        站点配置编辑器
/admin/pages/:key/builder          页面装修器
/admin/:key/new                    资源新建表单
/admin/:key/:id                    资源编辑表单
/admin/:key                        资源列表（含 pages/uploads 自定义视图）
/admin/*                           AdminNotFound
```

---

## 4. 前台：页面 → 区块 渲染模型

### 4.1 模型

- 页面的可渲染内容 = 内容库中的一条 **Page**：`{ key, path, title, description?, blocks[], updatedAt }`。
- 渲染入口：`gh-web/src/blocks/PageView.tsx` —— 取 `GET /api/content/pages/:key` → 三态（loading/error/data）→ `BlockRenderer` 按序渲染 `blocks`。
- `BlockRenderer` 按 `block.type` 分派到 **20 个区块组件**；`enabled === false` 的区块**前台与预览一致地跳过**。
- 每个区块套一层 `.blk` 外壳（由 `BlockStyle` 映射令牌组合类名），内容收进响应式容器 `.blk__container--{wide|normal|narrow}`。
- 数据源区块（productGrid/articleList/ranking/downloadList/faqList）**不存内容**，运行时调用既有结构化端点取数。
- `layout` 区块通过 `children: Block[][]` 递归（**仅允许一层嵌套**）。

**当前接入情况**：**16 个内容页已接入 `PageView`**（首页、关于、Center、商业合作及其 3 个子列表、服务支持、联系、新闻、产品列表、天梯榜、文章列表、下载、常见问题、品牌页）；**9 个明细/模板页（`template-*`）已通过 `TemplateBlocks` 接入装修区**（✅，见 §3.1）。

### 4.2 二十类区块字段表（`props`，字段名即契约）

> 见 `gh-server/src/data/blockCatalog.ts`（后端目录，供后台表单渲染）与 `gh-web/src/blocks/types.ts`（前端 props 类型），两侧字段一致。
> 所有 `image`/`media` 字段值为**资源地址字符串**（可为本地 SVG 路径、`/uploads/...` 上传素材，或外链）。

| # | type | 名称 | 分组 | props 字段 |
|---|---|---|---|---|
| 1 | `hero` | 全宽海报 | 内容 | `eyebrow` `title:string[]` `desc` `mediaTag` `image` `primary:{label,href}` `secondary?:{label,href}` `stats:{value,label}[]` |
| 2 | `carousel` | 轮播 | 内容 | `slides:{eyebrow,title[],desc,mediaTag,image,primary,secondary?,stats[]}[]` `autoplay:boolean` |
| 3 | `video` | 视频 | 内容 | `title` `desc` `url` `poster` |
| 4 | `text` | 标题正文 | 内容 | `eyebrow` `title` `body` `align:'left'\|'center'` |
| 5 | `imageText` | 图文 | 内容 | `image` `title` `body` `side:'left'\|'right'` `cta?:{label,href}` |
| 6 | `imageGrid` | 图片组 | 内容 | `title` `columns:2\|3\|4` `items:{image,caption}[]` |
| 7 | `stats` | 数字展示 | 内容 | `title` `items:{value,label}[]` |
| 8 | `cards` | 卡片组 | 内容 | `title` `desc` `columns:2\|3\|4` `layout?:'grid'\|'rail'` `overlay?:boolean` `ratio?:string` `items:{media?,mediaType?:'image'\|'video'\|'gif',image?,tag?,title,desc?,href?}[]`（`layout:'rail'` 可视区约 2 张、超出即可横滑；≤767px 约 1 张） |
| 9 | `timeline` | 时间轴 | 内容 | `title` `items:{time,title,desc?}[]` |
| 10 | `productGrid` | 产品（数据源） | 数据 | `title` `source:'featured'\|'all'\|'series'` `seriesId?` `limit` `columns:2\|3\|4` `showFilter?` |
| 11 | `articleList` | 文章（数据源） | 数据 | `title` `source:'all'\|'review'\|'tech'\|'method'\|'news'` `limit` `showFilter?` |
| 12 | `ranking` | 榜单（数据源） | 数据 | `title` `metric:'overall'\|'sensor'\|'battery'\|'latency'` `limit` `showFilter?` `teaser?` |
| 13 | `downloadList` | 下载（数据源） | 数据 | `title` `category:'all'\|'mouse'\|'keyboard'\|'headset'` `limit` `showFilter?` |
| 14 | `faqList` | 问答（数据源） | 数据 | `title` `source:'support'\|'center'` `limit` `showFilter?` |
| 15 | `contact` | 联系留言 | 结构 | `title` `desc` `channel:'inquiry'\|'business'` `showForm:boolean` |
| 16 | `layout` | 布局容器 | 结构 | `columns:1\|2\|3` `gap:'sm'\|'md'\|'lg'` `children:Block[][]`（长度=columns；仅一层嵌套） |
| 17 | `richText` | 富文本模块（自定义） | 内容 | `html`（**白名单净化后渲染**：允许 p/br/strong/em/i/u/s/a/h2-h4/ul/ol/li/blockquote/code/pre/img/figure/span/hr；剔除 `script`/`iframe`/`on*`/`javascript:`） |
| 18 | `html` | HTML 模块（自定义） | 内容 | `html` `note?`（白名单比富文本更宽，允许 `table/div/section/style` 等；同样剔除脚本/事件属性/`javascript:`） |
| 19 | `embed` | 代码嵌入模块（自定义·沙箱） | 内容 | `code` `height:number` `allowScripts:boolean` `videoUrl?` `poster?`（渲染进 `<iframe sandbox="allow-scripts">`，**不含 `allow-same-origin`**，与主站隔离） |
| 20 | `showcase` | 通栏产品展示（扩展） | 数据 | `alternate?:boolean` `items:{productId?,media,mediaType?:'image'\|'video'\|'gif',eyebrow?,title,desc?,specs?:string[],cta?:{label,href}}[]`（配合 `style.container:'full'` 通栏，每项占满一屏，图文左右交替） |

**`BlockStyle`（区块样式，全部可选）**：`background:'none'|'soft'|'solid'|'gradient'`、`paddingY:'sm'|'md'|'lg'`、`align:'left'|'center'`、`theme:'auto'|'light'|'dark'`、`container:'wide'|'normal'|'narrow'|'full'`。
> ✅ **通栏已就绪**：`BlockStyle.container:'full'` 已实现 = 破出 `.blk__container` 铺满视口宽度，海报/轮播/视频/`showcase` 等均可由装修器切换通栏（见 §7.2、§9）。

**区块类型目录元信息**（`GET /api/content/blocks/types`）返回 `BlockTypeMeta[]`：`{ type, name, group:'内容'|'数据'|'结构', fields:BlockFieldMeta[], listFields?:BlockFieldMeta[] }`；字段 kind 取值：`text|textarea|number|switch|select|list|image|link`。✅ 已实现。

### 4.3 页面 registry（seed，`gh-server/src/data/contentSeed.ts`）

内置页面 key（禁删）：`home`、`about`、`center`、`business`、`business-scenes`、`business-cases`、`business-venues`、`support`、`contact`、`news`、`brand-guanghun`、`brand-lab`、`brand-esports`、`products`、`ladder`、`articles`、`downloads`、`faq`、`inquiry`。
模板页 key（装修区）：`template-product`、`template-series`、`template-compare`、`template-article`、`template-download`、`template-faq`、`template-case`、`template-venue`、`template-model`。
站点配置：`nav`（7 项）+ `footer`（3 组）。

---

## 5. 后台：装修系统 / 站点配置 / 内容栏目 / 数据分析 / 上传素材库

### 5.1 装修系统（页面装修器）

- **入口**：后台「网站与装修 → 页面」列表 → 进入某页 `/admin/pages/:key/builder`。
- **布局**（Webflow / Shopify Theme Editor 风格）：**左＝区块结构列表（可收起）｜中＝大预览（占主区、可一键全屏）｜右＝选中区块属性面板（可收起）**；「新增区块」改为**底部抽屉**（不占主区）；左右两栏收束状态**持久化**（`localStorage`），收束后主预览区自动变宽；后台全局侧栏亦可折叠为图标模式。≤1023px 堆叠为「预览 → 结构 → 属性」。
- **已实现能力**（`AdminPageBuilderPage.tsx`）：
  - 区块**增 / 删 / 复制 / 上移下移 / 拖拽排序（同层）/ 启用停用** ✅
  - 按区块类型目录**自动渲染字段表单**（`BlockEditor`）✅
  - **样式面板**（底色/留白/对齐/明暗/内容宽度）✅
  - `layout` 一层嵌套子区块的增删排序 ✅
  - **大预览**（`BuilderPreview` 复用前台 `BlockRenderer` 渲染当前草稿）：宽度档位「自适应/桌面 1440/平板 768/手机 390」+ **全屏预览**（Esc 退出）+ 辅助线开关 ✅
  - 预览内**直接拖拽排序 / 直接插入模块**、选中双向联动 ✅
  - 拖拽交互现代化：SVG 手柄 / 落点插线 + 块半透明 + 插入点悬浮「＋」；键盘可达（上移 / 下移）✅
  - **撤销 / 重做 / 历史版本快照**（栈上限 30 步）✅
  - **自定义模块**（富文本 / HTML 安全模块、代码嵌入 iframe 沙箱模块）✅
  - 保存整页 `PUT /api/admin/pages/:key`（blocks 全量覆盖）✅；重置为 seed ✅；打开前台 ✅
  - 未保存修改：`beforeunload` + 离开二次确认 + 未保存标记 ✅
- **未实现能力**（见 §10 阶段 3）：
  - 无（装修器形态与交互已重做完成）
- **并发**：无「后保存者冲突提示」机制（后保存覆盖前者）⬜。

### 5.2 站点配置

- **入口**：后台「网站与装修 → 站点配置」`/admin/site`。
- 维护 `SiteConfig = { nav: SiteLink[], footer: SiteFooterGroup[] }`；导航与页脚分组的**增 / 删 / 上下移 / 字段编辑** ✅；保存 `PUT /api/admin/site`（整体覆盖）✅；「恢复为初始」= 重新拉取 `GET /api/content/site` ✅。
- 前台顶栏主导航由 `useSiteNav()` 读取站点配置（回落本地 `nav.ts` 兜底）；下拉大菜单面板仍为本地 `MEGA_PANELS`（单一真源在 `data/nav.ts`）。
- **已实现**：导航「折叠 + 可搜索」（后台侧边导航折叠到图标模式、栏目标题搜索、分组折叠、拖拽调宽）✅（见 §8 阶段 1.3）。

### 5.3 内容栏目（后台 32 个资源栏目）

每个资源栏目由 `data/adminResources.ts` 的配置驱动「表格列 / 筛选器 / 新建编辑表单 / 能力开关」，通用页面组件据此渲染（新增栏目只需登记配置）。

- **列表页**（`AdminResourceListPage.tsx`）：本地搜索 ✅、筛选 chip ✅、**列排序**✅、**表头/首列吸顶**✅、**长文本省略**✅、**多选批量删除（显示已选数量）**✅、分页（**窗口化页码** 首页/末页/当前±2 + 省略号）✅、**加载骨架屏**✅、**删除（统一确认弹窗 `ConfirmDialog`，非原生 `confirm`）**✅、行内动作（占位）✅。
- **表单页**（`AdminResourceFormPage.tsx`）：按 `form` 配置渲染分组字段；字段类型 text/textarea/select/number/switch/date/list/status/readonly/records/image/**rich（富文本，复用 `RichTextField`：图标工具栏，含撤销/重做、行内、段落、列表、块、插入链接弹窗、清除格式与字数统计）**/**file（任意类型文件上传 + 素材库选择，复用 `FileField`）** ✅；records 子卡片增删移 ✅；`image` 字段支持上传 + 从素材库选择（`ImageField`，由 `FileField` 的 image 模式封装）✅。
  - **表单校验与离开保护**：逐字段校验（`required`）→ **字段下方内联报错** + 提交时**聚焦首个错误字段** + `useUnsavedGuard` **离开提醒**（含 `beforeunload` 与路由拦截）✅。
  - **文章正文**：`articles` 集合新增 `body`（富文本 HTML），后台表单用 `rich` 字段编辑，前台文章详情经 `sanitizeRichText` 净化后渲染（无 `body` 回退原有小节展示）。
  - **下载文件**：`downloads` 集合新增 `fileUrl`（可下载文件地址），后台表单用 `file` 字段上传/选择，前台下载按钮指向该地址（无值保持占位提示，不裂链）；列表新增「文件」列（有/无）。
- **占位栏目**（仅 CRUD，非真实能力）：`staff`（账号管理）、`languages`、`integrations` → ◐/⬜（见 §10 阶段 4/5）。
- **已做成真能力**（非占位）：`components`（组件库 → 区块类型目录，可启用/停用）✅、`templates`（模板 → 页面区块快照集合，删除为软删除）✅、`styles`（样式 → 站点级设计令牌编辑，前台注入生效）✅；`logs`（操作日志，真实审计数据）✅、`trash`（回收站 → **真实软删除视图** `AdminTrashList`：内容类资源 / 集合记录软删除后进入，可恢复 / 彻底删除，`/api/admin/resources/trash*`）✅、`pages`/`site`/`assets`（内容库/站点配置/上传，均为自定义真实视图）✅、`backups`（备份 → 真实快照的创建 / 下载 / 恢复 / 删除 + 重置为初始，阶段 5b）✅、`publish`（预览与发布 → `/api/admin/publish*` 发布记录 + 内容回滚的真实视图 `AdminPublishList`，需 `publish` 权限，越权 403 优雅空态）✅、`roles`（角色与权限 → **只读**视图 `AdminRolesView`，展示服务端 RBAC 的角色/权限集与「栏目 → 所需权限」对照及当前账号，角色真源在服务端，本栏目不提供新建/编辑）✅。

### 5.4 数据分析

- 4 个 scope（`traffic`/`products`/`downloads`/`content`），数据来自真实来源（**不再是静态常量**）→ ✅：
  - 埋点事件：公开端点 `POST /api/track/view`（页面浏览）/ `POST /api/track/download`（下载点击），写入 SQLite `metrics_events`（默认保留最近 20000 条，`TRACK_ENABLED=0` 关闭；单 IP 滑窗限流）。
  - 前台接入：站点外壳路由切换上报浏览；下载按钮点击上报下载（`navigator.sendBeacon` / `fetch keepalive`，**失败静默**）。
  - 聚合：`traffic`（PV / 今日 / 覆盖页面 / 热门页面 + 近 7 日趋势）、`products`（集合计数 + 产品页浏览）、`downloads`（总量 / 今日 / TOP 明细）、`content`（文章分类计数与近期发布）；无数据一律 0。
- 页面 `AdminAnalyticsPage.tsx`：概览卡 + 序列 + 明细表；**响应形状保持不变**，数据真实。✅

### 5.5 回收站（真软删除 · 完整覆盖）

- 内容类资源的删除统一改为**软删除**：删除时写入 `trash` 表（`id, key, record_id, data, deleted_at, deleted_by`）并从原存储移除 / 隐藏，前台不再返回。
- 端点（需后台会话，`system` 权限、默认拒绝、仅 admin）：`GET /api/admin/resources/trash`（列表，行含 `id/key/type/recordId/name/deletedAt/deletedBy`）、`POST /api/admin/resources/trash/:id/restore`（恢复，原标识被占用 → 409）、`DELETE /api/admin/resources/trash/:id`（彻底删除）。
- 审计：软删除（`delete` / `delete-upload`）/ 恢复（`restore`）/ 彻底删除（`purge`）。
- 后台界面：`trash` 为真实视图 `AdminTrashList`（列表含「类型」列 + 恢复 / 彻底删除行内动作，彻底删除走 `ConfirmDialog`）。✅
- **覆盖范围（完整回收站）**：11 个集合（含 `templates`）、全部后台资源栏目、**内容库页面**（`DELETE /api/admin/pages/:key`，非内置页面；内置页面仍禁删 400；恢复按原 key 写回）与**素材库文件**（`DELETE /api/admin/uploads/:id`，含变体元数据；磁盘文件保留至彻底删除，软删除期间列表 / 文件夹计数 / 前台直链不可见；恢复不重复复制文件，彻底删除才删磁盘文件）。（详见接口契约 §2.5 / §2.6）

### 5.6 上传与素材库

- **上传**：`POST /api/admin/uploads`，原始字节流 + `X-File-Name`（URL 编码）头或 `?name=`；扩展名 + MIME 双白名单（图片/PDF/ZIP/TXT/MD，含 SVG 需 `image/svg+xml`）；脚本/HTML 类一律 415；大小上限默认 10MB（`UPLOAD_MAX_SIZE`）；可选目标文件夹（`?folderId=`）。✅
- **素材库（图片空间式）**：`GET /api/admin/uploads`（倒序，支持 `folderId`/`category`/`q`/`type`/`page` 筛选）、`PATCH /api/admin/uploads/:id`（分类 / 文件夹）、`POST /api/admin/uploads/move`（批量移动）、`DELETE /api/admin/uploads/:id`；公开访问 `/uploads/<文件名>`（`Cache-Control: public, max-age=86400`）。✅
- **文件夹与分类**：虚拟文件夹 `upload_folders`（含「全部 / 未分类」）的新建 / 重命名 / 删除（`/api/admin/media/folders*`，非空文件夹删除时文件移入未分类）；分类 `图片/图标/文档/视频/其它` 由 MIME 自动归档并支持手工覆盖；后台界面为「左侧文件夹列表 + 顶部筛选 + 右侧网格（多选批量移动/删除）」。✅
- **元数据**：大小/类型/时间从磁盘派生；文件夹与分类持久化于 SQLite（`upload_folders` / `upload_meta`），尺寸变体持久化于 `upload_variants`；启动时对既有文件补「未分类 + 自动分类」（幂等）。✅
- **图片多尺寸生成 + 前台 srcset 消费**：上传位图（png/jpeg/webp）时由**浏览器端 Canvas** 生成 **320 / 640 / 1280** 三档变体（保持宽高比、按需缩小、不放大原图；输出优先 WebP、质量 0.8；SVG/GIF 跳过），变体作为独立文件上传并经 `POST /api/admin/uploads/:id/variants` 登记；前台 `MediaImg` 经公开端点 `GET /api/media/variants?url=…` 解析多尺寸候选，输出 `srcset/sizes`（`(max-width: 767px) 100vw, 50vw`，可配），未登记 / 非本地素材 / 请求失败则**退化为单张**（不报错）；保留 `loading=lazy` / `decoding=async` / 容器 `aspect-ratio`。✅

---

## 6. 单一数据源模型（内容库 / 结构化集合 / 后台资源）

> 阶段 5a 起三者统一落入 **SQLite 单库** `gh-server/data/gh.sqlite`（`DB_PATH` 可覆盖），随请求**即时落库（事务）**，进程内缓存，重启不丢；库打开/建表失败记结构化日志并抛出（不静默降级），旧 JSON 损坏则跳过迁移、由 seed 回退。

| 存储 | 落库（阶段 5a 起） | 覆盖内容 | 环境变量覆盖 | 状态 |
|---|---|---|---|---|
| **内容库** | SQLite `content_pages` + `site_config`（旧 `content-store.json` 仅迁移来源） | `pages[]`（页面 → 区块）+ `site`（导航/页脚）+ `builtinKeys`（内置页禁删） | `DB_PATH`（旧 `CONTENT_STORE_PATH`） | ✅ |
| **结构化集合** | SQLite `collections`（旧 `collection-store.json` 仅迁移来源） | **11 个集合**（见下表） | `DB_PATH`（旧 `COLLECTION_STORE_PATH`） | ✅ |
| **后台资源** | SQLite `admin_resources`（旧 `admin-resources.json` 仅迁移来源） | 其余后台栏目（通用 `AdminRow[]`） | `DB_PATH`（旧 `ADMIN_RESOURCE_STORE_PATH`） | ✅ |
| **审计日志** | SQLite `audit_log` | 后台关键写操作/登录事件 | `DB_PATH` | ✅ |
| （素材文件） | `gh-server/data/uploads/`（+ SQLite `upload_meta`/`upload_folders`） | 上传的原始文件 + 文件夹/分类元数据 | `UPLOAD_DIR` | ✅ |

### 6.1 结构化集合 ↔ 前台端点 ↔ 后台栏目 ↔ seed 真源

| 集合 key | 前台读端点 | 后台栏目 | seed 真源 | 状态 |
|---|---|---|---|---|
| `products` | `/api/products`、`/products/:id`、`/products/series/:slug`、`/compare` | products | `data/products.ts` | ✅ |
| `rankings` | `/api/ladder`、`/ladder/:metric` | rankings | `data/ladder.ts` | ✅ |
| `articles` | `/api/articles`、`/articles/:id`、`/news` | articles | `data/articles.ts` | ✅ |
| `downloads` | `/api/downloads`、`/downloads/:id` | downloads | `data/support-extra.ts` | ✅ |
| `faqs` | `/api/faq`、`/faq/:id` | faqs | `data/support.ts` | ✅ |
| `models` | `/api/support/model/:id` | models | `data/support-extra.ts` | ✅ |
| `biz-content` | `/api/business/scenes` | biz-content | `data/business.ts` | ✅ |
| `biz-cases` | `/api/business/cases`、`/cases/:id` | biz-cases | `data/business-extra.ts` | ✅ |
| `biz-venues` | `/api/business/venues`、`/venues/:id` | biz-venues | `data/business-extra.ts` | ✅ |
| `inquiries` | `/api/account/inquiries`、`/inquiries/:id` | inquiries | `data/auth.ts` | ✅ |
| `templates` | —（后台专用：`/api/admin/templates`） | templates | 无（运行时创建，seed 为空） | ✅ |

- **写入语义**：`updateCollectionItem` 为**浅合并 patch**（未提交字段保留）；`POST` 自动生成稳定 id；`DELETE` 立即落盘。✅
- **聚合端点已收口到集合**（后台改集合 → 聚合端点立即反映，响应形状不变）：`/api/home`（featuredProducts/ladderTeaserRows/news/techArticles）、`/api/support`（downloads/faqs）、`/api/business`（cases）、`/api/center`（CENTER_VERSION/DOWNLOADS）、`/api/brand/:slug`（products）、`/api/search`（items/counts）、`/api/support/model/:id`。✅
- **仍为静态**（无对应集合，与内容库 seed 同源、形状不变）：`/api/home` 的 heroSlides/scenes/coopTags/spots/brandStats/serviceEntries；`/api/about` 全部；`/api/support` 的 quickEntries/warrantyPoints/spots；`/api/business` 的 directions/releaseSteps/rules/prepare/brandAssets/coopTypeOptions/contacts；`/api/center` 的 CAPABILITIES/FEATURES/DEVICE_SUPPORT/INSTALL_STEPS/REQUIREMENTS/CHANGELOG/CENTER_FAQS。

### 6.2 后台资源存储覆盖的栏目（SQLite `admin_resources`；旧 `admin-resources.json` 为迁移来源）

非集合、非自定义视图的栏目走此存储（通用 `AdminRow[]`，形状不变）：
`product-categories`、`test-records`、`methods`、`taxonomy`、`customers`、`devices`、`service-info`、`notifications`、`staff`、`languages`、`integrations`、`trash`、`nav`。
> 说明：`pages`/`site` 由**内容库**承载；`assets` 由**上传**承载；`components`（区块类型目录）/`templates`（集合）/`styles`（站点令牌）/`publish`（`releases` 表）/`roles`（只读，真源在服务端）/`logs`（`audit_log` 表）/`backups`（`BACKUP_DIR` 快照）为**自定义视图或专用存储**；`inquiries`/`faqs` 等 **11 个 key** 由**集合**承载。资源端点 `/api/admin/resources/:key` 对集合 key 短路到集合存储，其余走资源存储。

---

## 7. 视觉规范（摘要，详见《设计规格说明书 v2》）

### 7.1 视觉方向：苹果骨架 + 电竞皮肤

- **骨架层**（全局）：排版、留白、导航、卡片、表单、表格、后台全部 → **苹果风纪律**。
- **皮肤层**（局部）：首屏海报、产品展示区、天梯榜单区、暗色强调态 → **电竞感**（仅此区域）。
- **硬规则**：皮肤层样式不得被骨架层复用，反之亦然；令牌单一真源（`tokens.css` / `tokens.json`），禁止裸色值/裸 px 字号；双主题**等价**（每组件两套都验证）。

### 7.2 通栏海报 + 浮动磨砂导航（阶段 2 视觉修复）

| 需求 | 目标 | 当前状态 |
|---|---|---|
| 海报**全宽通栏** | 首屏海报破出内容容器，铺满视口宽度（桌面 + 移动） | ✅ 已实现：`BlockStyle.container:'full'`（`BlockRenderer` 命中 `full` 时破出 `.blk__container`，`width:100vw` 避开滚动条），装修器样式面板可切换；海报/轮播/视频/`showcase` 均可通栏 |
| 导航**浮动** | 顶栏脱离文档流、悬浮于内容之上，滚动时保持可见 | ✅ 已实现：顶栏 `sticky` 吸顶浮动（`.top-stack{position:sticky}` + 磨砂），首页顶部 `site-header--over-hero` 透明态浮于海报；滚动离开后恢复磨砂 |
| 磨砂玻璃**微透** | 顶栏半透明 + `backdrop-filter` 模糊 | ✅ 已实现：`.site-header{background:color-mix(...);backdrop-filter:saturate(180%) blur(16px)}` |

> 结论：磨砂玻璃、通栏海报、sticky 浮动导航**均已就位**；「浮动」采用 sticky 语义（是否改为真正 overlay 见 §16 待拍板）。

### 7.3 设计令牌与双主题（摘要）

- 品牌色 `#2040ED`（暗色下强调提亮为 `#5B75F5`），仅作点缀/强调，单屏占比 < 10%。
- 令牌三层：原子层（`--gh-*` 裸值）→ 语义层（`--color-*`，组件只引这层）→ 使用层。禁止跨层引用。
- 断点：`xs<640 / sm640–767 / md768–1023 / lg1024–1439 / xl≥1440`；桌面优先向下降级；容器最大 1440 居中。
- 状态色（浅色对白底 ≥4.5:1）：`--color-success #15803D`、`--color-warning #B45309`、`--color-info #0369A1`（已上收令牌层）。

---

## 8. 后台 UI/UX 规范与改造需求（用户已确认全量推进）

> 本节为**需求全清单**，按阶段 1→5 组织。每条给出目标、验收要点与**当前实现状态**。可勾选验收见《PRD 可测 AC 核对表 v3》。

### 阶段 1 · 后台可用性（整体 ✅ 已实现）

#### 1.1 全局反馈层
- 右下角**浮动 Toast**（统一组件，成功/失败/信息，自动消失）—— ✅ 已实现：`ToastProvider` + `useToast` 全局唯一 Toast（右下角浮动、语义色、自动消失）。
- **统一确认弹窗**（替换原生 `window.confirm`，含危险态红色）—— ✅ 已实现：`ConfirmDialog` 全局统一（危险操作红色），仓库内**已无 `window.confirm`**。
- **后台错误边界兜底**（`ErrorBoundary`，渲染异常不白屏）—— ✅ 已实现：`ErrorBoundary` 已包 `AdminArea`（含重试/返回），管理端渲染异常不白屏。

#### 1.2 布局统一
- 顶栏与内容区**左基线对齐**；统一**宽度档位**；装修器容器**放宽**以解决预览小/挤 —— ✅ 已实现：顶栏与内容容器共用同一左基线；宽度令牌收口；装修器容器放宽、预览区显著加大。

#### 1.3 导航可折叠 + 可搜索
- 后台侧边导航**可折叠**（桌面折叠为图标模式，宽 64px）+ **可搜索**栏目 —— ✅：桌面可折叠为图标模式（复用令牌 `--gh-sidebar-width-collapsed`，hover 出 tooltip，状态持久化于 `localStorage`）；**拖拽右边缘调整侧栏宽度（200–320px，键盘 ←/→ 可调），宽度持久化（`gh-admin-sidebar-width`）**；分组可折叠（持久化）；顶栏搜索实时过滤栏目；≤1023px 收起为抽屉。

#### 1.4 危险操作红色 + 二次确认
- 删除等危险操作**红色 + 二次确认** —— ✅ 已实现：危险按钮采用 `--danger` 语义色 + `ConfirmDialog` 二次确认。

#### 1.5 列表能力
- 排序 / 表头吸顶 / 长文本省略 / 多选批量删除 / 分页省略号 / 加载骨架屏 —— ✅ 已实现：列排序（升降序）、表头与首列吸顶、长文本省略、多选批量删除（显示已选数量）、分页窗口化（首页/末页/当前±2 + 省略号）、加载骨架屏。

#### 1.6 表单能力
- 逐字段校验 + 字段下报错 + 聚焦首个错误 + 离开提醒 —— ✅ 已实现：逐字段校验并在**字段下方**内联报错、提交聚焦首个错误字段、`useUnsavedGuard` 离开保护（`beforeunload` + 路由拦截）。

### 阶段 2 · 视觉修复
- **天梯榜修复**（详见 §9）：首页与榜单页数据同步 ✅；指标选项与数据对齐 ✅；分值条显示与动效 ✅；补充示例数据 ✅。
- **海报全宽通栏 + 导航浮动 + 磨砂玻璃微透**：见 §7.2（通栏 ✅、浮动 ✅、磨砂 ✅）。

### 阶段 3 · 装修器升级与自定义模块（✅ 已实现）
- 预览内**直接拖拽排序**、预览内**新增模块（插入）**、预览区**加大 + 宽度档位（自适应/1440/768/390）+ 全屏**、排版观感**重做** —— ✅。
- **自定义模块**（共 3 类；区块类型目录现共 **26 类** = 契约基础 20 类 + 产品详情主体 3 类 + 商业合作 2 类 + 测评方法 1 类）：
  - 富文本 / HTML **安全模块**（白名单净化）—— ✅（`richText` / `html`，`sanitize.ts` 净化）。
  - 代码嵌入 **iframe 沙箱模块**（`sandbox="allow-scripts"`、**无 `allow-same-origin`**）—— ✅（`embed`）。
  - 支持承载视频 / GIF / 多图 / 富文本 —— ✅。
- 装修器**撤销 / 重做 / 历史版本快照（30 步）** + 区块**复制 / 启停 / 删除** —— ✅。

### 阶段 4 · 能力补全
- 前台表单**真实入库**（咨询/留言/合作 → 写入后台工单集合）—— ✅：前端已 POST `/api/inquiry`，后端写入 `inquiries` 集合（含 `contact/model/message`），后台「咨询工单」与前台「我的咨询」同源可见。
- **组件库 / 模板 / 样式** 从占位做成**真能力** —— ✅：组件库=区块类型目录（26 类，可启用/停用，装修器选择器据此过滤）；模板=页面区块快照集合（`/api/admin/templates`，新建页面可从模板起步）；样式=站点级设计令牌编辑（白名单变量注入 `<html>`，前台生效）。
- **真实角色权限**（角色 × 栏目矩阵，服务端校验）—— ✅（阶段 4C：服务端 RBAC，`admin` / `operator`；按栏目/操作鉴权，无权限 403；`me` 返回 `role`/`scopes`）。
- 后台**操作审计日志**（真实记录操作人/时间/对象/IP）—— ✅：`audit_log` 表 + `logs` 栏目真实视图，关键写操作与登录事件落库可查。
- 后台**暗色主题入口** —— ✅：顶栏主题切换（`data-admin` 作用域，持久化），与前台主题解耦。

### 阶段 5 · 持久化与收口
- 数据持久化升级 **SQLite** —— ✅（阶段 5a：单库 `data/gh.sqlite`，旧 JSON 一次性迁移保留；节点内置 `node:sqlite`）。
- **鉴权加固** —— ✅（阶段 5b：账号密码改 **scrypt 加盐哈希** + timing-safe 比较，落 SQLite `admin_users`；会话令牌改 **httpOnly Cookie（`gh_admin`；SameSite=Lax，`COOKIE_SECURE=1` 追加 Secure）** 并保留 Bearer 兼容、支持过期（默认 8h）；写操作增加 **CSRF 来源校验**）。
- **真实发布能力** —— ✅（阶段 5C：`/api/admin/publish*` 发布记录 + 内容回滚，落 SQLite 表 `releases`；真正部署上线仍由部署环境执行，见《部署 Runbook》§5.2）。
- **备份 / 恢复** —— ✅（阶段 5b：真实端点 `/api/admin/backups*`（列表 / 立即备份 / 下载 / 恢复 / 删除）与 `/api/admin/reset`（重置为初始 seed），后台「备份」栏目为真实视图）。
- **图片资产优化**（压缩 / 多尺寸 / `srcset`）—— ✅（**生成侧**：上传位图时浏览器端 Canvas 生成 320/640/1280 变体并登记，SVG/GIF 跳过；**消费侧**：`MediaImg` 默认 `loading=lazy`+`decoding=async`、容器 `aspect-ratio` 防 CLS、`srcset/sizes`「有则用无则退」，经 `GET /api/media/variants` 按地址解析；对象存储 / CDN 接入待接）。
- **SEO 收口**（sitemap / 结构化数据 / OG）—— ✅ 基本完成（见 §12）；`sitemap.xml` / `robots.txt` 已由后端**动态生成**（数据源 = 内容库 + 集合，域名取 `SITE_ORIGIN`）；详情页补 Product / BlogPosting / FAQPage / SoftwareApplication 结构化数据与 OG/Twitter 卡片（`og:image` 默认分享图）；正式域名替换待做。
- **无障碍通检** —— ◐（**前台 ✅ 阶段 5 收口**：跳过导航 / 焦点归还 / 内阴影焦点环 / 对比度修复 / 标题层级；后台待通检）。
- **响应式补到 1440+ 与移动端主 CTA** —— ◐（前台已覆盖 390/768/1280/1440，并收口 **1600/1920**（无拉伸、无横向溢出）；后台待补）。
- **新手指引**（后台）—— ✅（阶段 5）：首次进入后台自动分步引导（高亮侧栏导航 / 页面列表与装修器 / 素材库 / 发布与权限 / 样式与模板），支持「下一步 / 跳过 / 不再显示 / Esc 关闭」；已看过写入 `localStorage.gh-admin-tour-done` 不再自动弹；顶栏「帮助」入口可随时重开；浮层 `pointer-events:none` 不阻断侧栏交互。前台引导 ✅（见 §13.3）。
- **前台会员账号体系** —— ✅（阶段 5，原「延后项」已转实现）：账号落 SQLite `users`（scrypt 加盐哈希 + timing-safe）、会话落 `user_sessions` 并经**独立 Cookie `gh_user`**（HttpOnly + SameSite=Lax，默认 7 天，`COOKIE_SECURE=1` 追加 Secure）承载，与后台 `gh_admin` **完全隔离**；注册（唯一性 + 密码强度）/ 登录 / 登出 / `me` / 修改密码均真实；个人中心 `/api/account/*`（me / inquiries / devices / favorites / notifications / settings）**按用户隔离**、未登录 401；前台提交咨询在已登录时归属当前用户。前端登录 / 注册 / 找回（含「令牌 + 新密码」重置步）与个人中心 7 页接入真实会话，顶部「账号」入口按登录态显示。
  - **边界（开发态令牌）**：当前**未接入邮件 / 短信服务**，找回密码在**开发环境直出重置令牌**（`NODE_ENV!=='production'` 时响应返回 `devToken` 并写日志），生产环境不返回令牌；正式上线需接入邮件服务、由邮件链接携带令牌。短信 / 邮件通知仍为延后项。注册字段固定为「用户名 + 邮箱 + 密码」，未采集手机号。

### 贯穿
- **每次改动同步更新 PRD**。

---

## 9. 天梯榜规格

| 项 | 规格 | 状态 |
|---|---|---|
| 首页 teaser 与榜单页**数据同步** | 两处均来自 `rankings` 集合（首页 `ladderTeaserRows`←rankings；榜单页 `/api/ladder`←rankings），后台改 → 两处一致 | ✅ |
| 首页 teaser | 底部 `mask-image` 渐变虚化、**不展示完整榜单**、点入看全 | ✅ |
| 分值条显示 | 各行 `--fill-target` 按指标相对占比填充；延迟/续航按该指标内相对占比，不同量纲不混用同一刻度 | ✅ |
| 分值条动效 | `IntersectionObserver` 整组进入视口触发，各行 **90ms 错峰**；`prefers-reduced-motion` 直接终态 | ✅ |
| 未测试项 | `score:null` 与合法 `0` 严格区分；未测试显示「未测试」虚线槽、不参与排名 | ✅ |
| 并列 | 同分标「并列」 | ✅ |
| 范围内排名 | 非综合指标或产品线筛选后，列头「#」→「范围」，名次范围内重算 | ✅ |
| **指标选项与数据对齐** | 区块 `metric` 选项与实际数据指标**一一对齐**为 `overall`/`sensor`/`battery`/`latency`（历史 `weight`/`dpi` 已移除） | ✅ |
| 补充示例数据 | 已补充示例数据，覆盖 4 个指标（`overall`/`sensor`/`battery`/`latency`），榜单行数量足以支撑演示 | ✅ |

---

## 10. 自定义模块规格（阶段 3 · 已实现）

| 模块 | 用途 | 关键约束 | 状态 |
|---|---|---|---|
| **富文本 / HTML 安全模块** | 运营撰写富文本（标题/列表/链接/加粗等）与受限 HTML | **必须白名单净化**（禁 `script`/`on*`/`javascript:`），避免 XSS | ✅（`richText` / `html`；`sanitize.ts`：`sanitizeRichText` / `sanitizeHtmlBlock`） |
| **代码嵌入 iframe 沙箱模块** | 嵌入第三方 widget / 视频 / 自定义 HTML | 以 `<iframe sandbox="allow-scripts">` 隔离，**不含 `allow-same-origin`**；禁同源脚本越权 | ✅（`embed`） |
| 组合媒体 | 视频 / GIF / 多图 / 富文本 | 复用 `video`/`imageGrid`/`text`/`cards(mediaType)` 区块或自定义模块承载 | ✅ |
| 通栏产品展示（扩展） | 首页「重点产品」分段式通栏，每项占满一屏、图文左右交替 | 配合 `style.container:'full'` | ✅（`showcase`） |

> 说明：区块类型目录中，`richText`/`html` 提供富文本与受限 HTML 能力（渲染前白名单净化），`embed` 提供沙箱化的代码嵌入（`sandbox="allow-scripts"`，无 `allow-same-origin`）；`cards(mediaType)`/`showcase` 支持视频 / GIF / 多图。

---

## 11. 功能需求

| # | 功能 | 说明 | 状态 |
|---|---|---|---|
| F-01 | 前台内容由内容库驱动 | 16 内容页 `PageView` 渲染 blocks | ✅ |
| F-02 | 明细页装修区 | 9 个 `template-*` 页的装修区渲染到明细页（`TemplateBlocks`） | ✅ |
| F-03 | 后台装修器（增删排序启停字段样式预览保存） | 见 §5.1 | ✅（升级项见阶段 3） |
| F-04 | 站点配置（导航/页脚） | 见 §5.2 | ✅ |
| F-05 | 后台 32 栏目 CRUD + 分页筛选搜索 | 见 §5.3 | ✅ |
| F-06 | 上传 + 素材库 | 见 §5.6 | ✅ |
| F-07 | 数据分析（4 scope） | 真实统计（埋点 + 集合计数），响应形状不变 | ✅ |
| F-08 | 前台表单提交 | 咨询/留言/合作表单前端真实 POST | ✅ |
| F-09 | 前台表单入库 | 提交写入后台工单集合 | ✅（含 contact/model/message） |
| F-10 | 组件库 / 模板 / 样式真能力 | 从占位到可用 | ✅ |
| F-11 | 权限（角色 × 栏目） | 服务端鉴权与菜单裁剪 | ✅（服务端 RBAC：未登录 401 / 无权限 403；`me` 返回 role/scopes） |
| F-12 | 审计日志 | 真实记录关键操作（操作人/时间/对象/IP） | ✅（`audit_log` 表 + `logs` 真实视图） |
| F-13 | 后台暗色主题 | 独立主题入口（顶栏切换，持久化） | ✅ |
| F-14 | 搜索 | 前台全站搜索（产品/文章/榜单/支持资料） | ✅ |
| F-15 | 法务页 | `/legal/:slug` 四篇（正文为可信占位） | ◐ |
| F-16 | 多语言 | `i18n.tsx` 框架 + 就绪语言门禁；仅 `zh-CN` 就绪，其余提示「建设中」 | ◐ |
| F-17 | 新手指引 | 前台 / 后台分步引导（首见自动、可跳过/不再显示/重开、Esc 关闭） | ✅（前台 `SiteTour` + 后台 `AdminTour`） |

---

## 12. 非功能需求

| # | 类别 | 要求 | 状态 |
|---|---|---|---|
| NFR-01 | **性能** | 路由级代码分割（16+ 页面各自 chunk）、框架 vendor 独立分包、gzip；首屏 gzip 约 112KB；图片优化（生成侧：上传位图浏览器端 Canvas 生成 320/640/1280 变体；消费侧：`MediaImg` 默认 `loading=lazy` + `decoding=async`、容器 `aspect-ratio` 防 CLS、`srcset/sizes`「有则用无则退」） | ✅（对象存储 / CDN 接入待接） |
| NFR-02 | **SEO** | 路由级 meta 单一真源（`data/meta.ts`）、运行时注入 title/description/robots/canonical/OG/Twitter 卡片、JSON-LD（站点级 Organization/WebSite+SearchAction/WebPage/BreadcrumbList；详情页专属 Product / BlogPosting / FAQPage / SoftwareApplication）、`og:image` 默认分享图、`sitemap.xml` 与 `robots.txt` 由后端**动态生成**、`<html lang>` 同步 | ✅（正式域名 / `SITE_ORIGIN` 与 OG 大图待替换） |
| NFR-03 | **无障碍** | 目标 WCAG 2.1 AA：正文对比度 ≥4.5:1、焦点可见、键盘可达（弹窗焦点锁定 + 关闭焦点归还）、表单有 label、图标按钮有可读名、状态不只靠颜色、触控 ≥44px、跳过导航、标题层级不跳级、尊重 `prefers-reduced-motion` | ◐（**前台已通检**：阶段 5 收口；后台待通检） |
| NFR-04 | **响应式** | 断点 xs/sm/md/lg/xl；前台已覆盖 390/768/1280/1440，并收口 **1600/1920**（容器 1440 上限居中、无横向溢出） | ◐（移动端主 CTA、后台阶待补） |
| NFR-05 | **安全** | 无 `{code,data}` 包装、错误为 `{error}`；安全响应头（nosniff / SAMEORIGIN / Referrer-Policy；HSTS 于 `TRUST_PROXY=1`）；CORS 白名单；限流兜底；上传双白名单；日志不外泄敏感信息 | ✅ 已加固（阶段 5b：密码 scrypt 加盐哈希、会话 httpOnly Cookie、写操作 CSRF 来源校验） |
| NFR-06 | **国际化** | 语言入口（简/繁/EN）、语言上下文与 `<html lang>` 同步、就绪语言门禁；英文正文待后台 | ◐ |
| NFR-07 | **可观测性** | 单行 JSON 结构化日志、`X-Request-Id`、访问日志、`/healthz` + `/readyz` | ✅ |
| NFR-08 | **持久化** | SQLite 单库（`data/gh.sqlite`，WAL + 事务）；旧 JSON 一次性迁移保留；损坏回退 seed 不崩溃 | ✅ |

---

## 13. 发布、备份与新手引导

### 13.1 发布
- 前端：`VITE_API_BASE= npm run build`（同源）或填后端域名（分离）；产物 `gh-web/dist`。
- 后端：`gh-server`（`npm start`）；同源托管设 `STATIC_DIR`；详见《部署 Runbook v1》。
- **真实发布能力**（版本化、灰度、回滚）：**版本记录 + 内容回滚已实现**（阶段 5C，`/api/admin/publish*`，落 SQLite 表 `releases`；回滚前自动留 `pre-restore` 备份）。**部署上线本身**（构建 → 托管 → 进程/主机操作）由部署环境执行，见《部署 Runbook v1》§5.2；灰度与审批流当前 ⬜（待产品拍板）。

### 13.2 备份 / 恢复
- ✅ 已实现（阶段 5b）：后台「备份」栏目可**立即备份 / 下载 / 恢复（覆盖式，先自动留 `pre-restore` 快照）/ 删除**，并可**重置为初始 seed**（端点 `/api/admin/backups*`、`/api/admin/reset`；快照落 `BACKUP_DIR`，默认 `data/backups/`）。
- 运维级物理备份仍建议覆盖 **SQLite 库 `data/gh.sqlite`（含 `-wal`/`-shm`）** + `uploads/` 目录（阶段 5a 后数据已统一入库）。

### 13.3 新手指引
- 后台新手引导 ✅ 已实现（轻量浮层组件 `AdminTour` + 上下文 `tourContext`）：首次进入后台自动分步弹出，步骤高亮侧栏导航 / 页面列表与装修器 / 素材库 / 发布与权限 / 样式与模板；「下一步 / 跳过 / 不再显示」与 Esc 关闭均可用，键盘可操作，遮罩层 `pointer-events:none` **不阻断侧栏交互**，双主题不回归。已看过标记 `localStorage.gh-admin-tour-done`，刷新不再自动弹；顶栏「帮助 · 新手引导」入口可随时重开。不触发发布/删除等破坏性动作。
- 前台新手引导 ✅ 已实现（组件 `SiteTour`，无依赖）：首次进入前台自动弹出轻量引导（4 步：顶部导航与搜索 / 场景与重点产品可横向滑动 / 产品与天梯榜入口 / 客服与账号）；支持「上一步 / 下一步 / 跳过 / 不再显示」，Esc 可关、键盘可操作；已看过标记 `localStorage.gh-site-tour-done`，刷新不再自动弹；页脚「新手指引」入口可随时重开。浮层非模态、不参与文档流，不影响首屏可抓取内容，尊重 `prefers-reduced-motion`。

---

## 14. 术语表（UI 文案统一）

| 统一用词 | 禁止混用 | 说明 |
|---|---|---|
| 咨询 | 留言、工单、反馈 | 全站唯一称呼；「合作咨询」亦用此词 |
| 资料 | 资源、文件 | 指可下载内容；「素材」专指后台媒体库 |
| 天梯榜 | 榜单、排名、排行 | 一级导航用「天梯榜」；分指标称「XX 榜」 |
| 前台 / 后台 | 官网、管理端 | 面向用户文案避免出现「前台」 |
| 产品 | 商品（V1 禁用） | V2 引入电商后再区分 |
| 测试记录 | 评测、试验 | 与「评测文章」严格区分 |
| 测试方法 | 测评方法、标准 | 统一为「测试方法」 |
| 体验点 | 门店、网点 | |
| 型号 | 产品名、SKU | |
| 语言 | 多语言、i18n、Locale | 选项：简体中文 / 繁體中文 / English；代码 `zh-CN / zh-HK / en` |
| Center | 软件、客户端、App | 正文保留英文「Center」不译 |
| 区块（Block） | 模块、组件 | 装修最小可编辑单元，共 26 类（契约基础 20 类 + 扩展 6 类） |
| 装修器 | 编辑器、搭建器 | 后台页面区块编排器 |

---

## 15. 待用户拍板的疑问点

1. **导航「浮动」语义**：**已定（阶段 2）**——采用 `sticky` 吸顶浮动（+ 磨砂），已上线；是否进一步改为脱离文档流的 **overlay**（滚动覆盖内容、边缘留白）作为可选增强，非阻塞项，待产品拍板。
2. **通栏海报范围**：**已定（阶段 2）**——通栏能力已实现（`BlockStyle.container:'full'`，桌面 + 移动均全宽）；如后续要求移动端收边，可再调整。
3. **装修器内联编辑形态**：预览内直接编辑采用「点击弹窗编辑」还是「原地输入」？（当前：预览内**拖拽排序 / 插入模块**已实现；字段编辑仍在右侧属性面板）—— 待产品拍板。
4. **天梯榜指标口径**：**已定（阶段 2）**——区块 `metric` 选项与数据对齐为 `overall`/`sensor`/`battery`/`latency`（历史 `weight`/`dpi` 已移除）。
5. **后台暗色**：**已定（阶段 4）**——后台暗色为**独立开关**（顶栏切换，`localStorage` 持久化，与前台主题解耦）。
6. **鉴权加固方案**：**已定（阶段 5b）**——采用 **httpOnly Cookie（`gh_admin`，SameSite=Lax）** 为主、保留短期 Bearer 兼容；会话默认 8 小时过期；暂不引入「刷新令牌」。是否改刷新令牌、会话时长与 `COOKIE_SECURE` 默认值待运维确认。
7. **前台会员账号体系**：**已定（阶段 5）**——纳入本期并已实现（账号 / 会话 / 找回 / 个人中心按用户隔离，见 §2 / §8 阶段 5）；**未决**：注册是否追加手机号字段、是否接入邮件 / 短信服务以完成真实发信（当前找回密码为开发态令牌），待产品/运维拍板。
8. **SQLite 迁移时机**：**已定（阶段 5a）**——与鉴权加固同批推进，单库 `data/gh.sqlite`，旧 JSON 一次性迁移保留。

---

## 16. 冲突与真源说明

| 冲突点 | 旧文档说法 | 现状（代码 + 内容库与装修契约） | 以何为准 |
|---|---|---|---|
| 后台页面数 | 44（列表+编辑分列） | 37 个入口（通用列表/表单承载） | 代码（37），本文 §3.2 并注明口径 |
| 数据落库 | 早期「前台 mock / 演示占位」 | 单一数据源：内容库 + **11 集合** + 后台资源；阶段 5a 起统一落 **SQLite 单库 `gh.sqlite`**（旧 JSON 仅迁移来源） | 代码 + 内容库与装修契约 §11 |
| 明细页装修区 | 契约 §8「明细页渲染 template 区块」 | 9 个明细页**均已接入** `TemplateBlocks`（✅，实测产品详情渲染 text/productGrid/articleList） | 代码（已实现） |
| 通栏海报 | 改版梳理「`style.fullWidth`」 | 已由 `BlockStyle.container:'full'` 实现（破出容器铺满视口），非 `fullWidth` 字段 | 代码（已实现），见 §7.2 / §4.2 |
| 前端取数 | 早期「mock + 预留接口层」 | 已无 mock，`VITE_API_BASE` 未注入即加载期报错 | 代码 |
| 后台鉴权 | PRD 阶段规划「角色矩阵」 | 已实现**服务端 RBAC**：`admin`/`operator` + 栏目/操作 scope 校验，未登录 401、无权限 403 | 代码（已实现，阶段 4C），见 §2 / §5.3 |
| 区块类型数 | 各文档曾记 16 类 / 19 类 / 20 类 | 实际 **26 类**（契约基础 20 类 + 产品详情 3 类 + 商业合作 2 类 + 测评方法 1 类） | 代码（26），见 §4.2 |
| 天梯榜 teaser 数据 | 早期「首页硬编码」 | 已改为 `rankings` 集合派生 | 代码 + 内容库与装修契约 §11.4 |

> 总原则：**以代码实现 + 《内容库与装修契约》为准**；文档仅在「代码尚未实现的需求」处保留目标描述，并明确标注状态。

---

## 17. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| PRD v0.9 | 2026-10-08 | 业务规则与护栏（历史输入，已被取代） |
| PRD v1.0（隐含） | 2026-10-10 | 修订补充包合并（可测 AC、术语、权限矩阵、法律页清单、页面形态） |
| **PRD v2** | **2026-10-13** | 全量重写：合并内容库与装修契约、单一数据源、后台可用性/视觉/装修器/能力补全需求全清单；逐条标注实现状态；确立本文为唯一权威需求文档 |
| PRD v2.1 | 2026-10-13 | 前台上线质量收口：图片消费侧优化（懒加载/防 CLS/srcset 有则用无则退）、SEO 收口（详情页结构化数据 + OG/Twitter 卡片 + canonical 校验）、无障碍通检修复（跳过导航/焦点归还/内阴影焦点环/对比度/标题层级）、超宽屏 1600/1920 收口、前台新手指引（`SiteTour`）；同步更新 §12 / §13.3 状态 |
| PRD v2.2 | 2026-10-13 | **与代码实现状态对账**：将阶段 1–5 及视觉/装修器/自定义模块/天梯榜等已落地能力由 ⬜/◐ 更正为 ✅——后台可用性（Toast / `ConfirmDialog` / 错误边界 / 列表 / 表单校验与离开保护）、装修器（预览内拖拽·插入·撤销历史·宽度档位·全屏·区块复制启停）、自定义模块 3 类（`richText`/`html`/`embed`）与 `showcase`、区块类型统一为 **26 类**、通栏（`container:'full'`）与浮动磨砂导航、天梯榜指标对齐（`overall/sensor/battery/latency`）与示例数据、能力补全（表单真实入库 / 组件库·模板·样式真能力 / RBAC / 审计日志 / 后台暗色）、持久化与收口（SQLite / 鉴权加固 / 发布回滚 / 备份恢复 / SEO / 无障碍 / 新手指引）；明确保留边界（图片压缩与多尺寸、多语言英文正文、定时发布、多断点独立布局、前台真实会员体系、真实部署上线、数据分析静态占位、回收站占位） |
| PRD v2.3 | 2026-10-13 | **补齐图片优化闭环**：图片优化由「消费侧」升级为「含多尺寸生成」——上传位图时浏览器端 Canvas 生成 320/640/1280 变体（WebP 优先、质量 0.8、不放大原图，SVG/GIF 跳过），新增登记端点 `POST /api/admin/uploads/:id/variants` 与公开查询 `GET /api/media/variants`，`MediaItem` 新增 `variants`（只增字段）；前台 `MediaImg` 按地址解析 `srcset/sizes`、无变体则退化单张；同步 §5 / §13 阶段 5 / NFR-01 状态 |
| PRD v2.4 | 2026-10-13 | **「数据分析」「回收站」由占位升级为真能力**：① 数据分析改为真实统计——新增公开埋点 `POST /api/track/view` / `POST /api/track/download`（落 SQLite `metrics_events`，带上限/防刷/开关，前端失败静默上报），`GET /api/admin/analytics/:scope` **响应形状不变**、数据来自埋点与集合真实计数（无数据为 0）；② 回收站改为**真软删除**——内容类资源与集合记录删除时写入 `trash` 表并从原存储移除，新增 `GET /api/admin/resources/trash`、`POST .../trash/:id/restore`、`DELETE .../trash/:id`，软删除/恢复/彻底删除均写审计，后台 `trash` 为真实视图 `AdminTrashList`；SQLite `schema_version` 升至 `5`；同步 §5.4 / §5.5 / §2 / §16 |
