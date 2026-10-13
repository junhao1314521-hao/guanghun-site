# 光魂官网 · 部署 Runbook v1

> 用途：把「光魂官网」（前端 `gh-web` + 后端 `gh-server`）**构建、部署、验证、回滚**的可照做步骤。
> 前置：内容 / 法务 / 备案真实素材已替换（见 `光魂官网_PRD_v2.md` §13、`光魂官网_接口对接与素材替换清单_v1.md` §四），否则不得对外发布。
> 版本：v1 ｜ 日期：2026-10-13 ｜ 关联：`光魂官网_后端接口契约_v2.md`、`光魂官网_V1.0发布检查单_v1.md`

---

## 一、环境要求

| 项 | 要求 |
|---|---|
| Node.js | ≥ 20 LTS（工程以 Node 22 验证） |
| 包管理 | npm（含 `package-lock.json`，建议 `npm ci`） |
| 前端 | `gh-web`：React 19 + Vite 8 + TS；产物 `gh-web/dist` |
| 后端 | `gh-server`：Express 5 + TS + tsx（直接 `tsx` 运行，无需编译） |
| 反向代理 | 同源部署可选；分离部署必需（Nginx / 云 LB） |

---

## 二、环境变量清单

### 2.1 后端 `gh-server`（进程环境变量，运行时读取；直读，不加载 `.env`）

| 变量 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `PORT` | 否 | `8787` | 监听端口 |
| `STATIC_DIR` | 否 | — | **同源部署**：指向前端构建目录；设置后托管前端 + SPA 回退 |
| `CORS_ORIGINS` | 否 | 放开 | 逗号分隔白名单；**分离部署必填**；未设置放开（仅本地联调） |
| `TRUST_PROXY` | 否 | — | 置 `1`：位于 Nginx/CDN（TLS 终止）之后，正确判定协议/IP 并**下发 HSTS** |
| `RATE_LIMIT_MAX` | 否 | `300` | 单 IP 每窗口请求上限（内存限流兜底） |
| `RATE_LIMIT_WINDOW_MS` | 否 | `60000` | 限流窗口（毫秒） |
| `UPLOAD_DIR` | 否 | `gh-server/data/uploads` | 素材落盘目录 |
| `UPLOAD_MAX_SIZE` | 否 | `10mb` | 单文件上传大小上限 |
| `DB_PATH` | 否 | `gh-server/data/gh.sqlite` | **SQLite 单库文件**（内容库 / 集合 / 后台资源 / 审计四类数据）；阶段 5a 起 |
| `BACKUP_DIR` | 否 | `gh-server/data/backups` | **备份快照目录**（阶段 5b）；后台「备份」栏目读写的 JSON 快照落盘处，需持久化 |
| `SITE_ORIGIN` | 否 | 请求 Host | **SEO 用站点源**（如 `https://www.<domain>`）：动态 `sitemap.xml` / `robots.txt` 的绝对地址前缀；未设置时回退请求 Host |
| `COOKIE_SECURE` | 否 | — | 置 `1`：后台会话 Cookie 追加 `Secure`（**生产经 HTTPS 提供时必设**）；本地 HTTP 联调不设 |
| `SESSION_TTL_MS` | 否 | `28800000`（8 小时） | 后台会话存活时长（毫秒）；过期后需重新登录 |
| `CONTENT_STORE_PATH` | 否 | `gh-server/data/content-store.json` | **仅作旧库迁移来源**（首次启动导入后不再写入） |
| `COLLECTION_STORE_PATH` | 否 | `gh-server/data/collection-store.json` | **仅作旧库迁移来源**（同上） |
| `ADMIN_RESOURCE_STORE_PATH` | 否 | `gh-server/data/admin-resources.json` | **仅作旧库迁移来源**（同上） |
| `AUDIT_LOG_PATH` | 否 | `gh-server/data/audit-log.json` | **仅作旧库迁移来源**（同上） |
| `NODE_ENV` | 否 | — | `test` 时日志静默 |

> ⚠️ 限流为**单实例进程内**实现；多实例部署需改由网关/Redis 承担。`/healthz`、`/readyz` 不限流。

### 2.2 前端 `gh-web`（**构建期**注入，运行时不可改）

| 变量 | 必填 | 说明 |
|---|---|---|
| `VITE_API_BASE` | **是** | **未设置（undefined）→ 加载期报错**（防静默空白页）；显式置空 `""` → **同源**（相对路径 `/api/...`）；填完整地址 → **分离部署** |

> ⚠️ 区分「未设置 → 报错」与「置空 → 同源」。本地开发地址由 `gh-web/.env.development` 提供（生产**不**读取该文件）。

---

## 三、构建与启动

### 3.1 构建前端

```bash
cd gh-web
npm ci
# 同源部署（推荐）：置空 → 相对路径
VITE_API_BASE= npm run build
# 分离部署：填后端域名
# VITE_API_BASE="https://api.<domain>" npm run build
# 产物：gh-web/dist
```

### 3.2 启动后端

```bash
cd gh-server
npm ci
PORT=8787 CORS_ORIGINS="https://www.<domain>" TRUST_PROXY=1 COOKIE_SECURE=1 npm start
```

---

## 四、部署拓扑

### 4.1 【推荐】同源部署（单进程同时托管前端 + API）

```bash
cd gh-server
npm ci
STATIC_DIR=/srv/gh-web/dist PORT=8787 npm start
# 或仓库内置脚本（默认指向 ../gh-web/dist）： npm run serve
```

行为：
- `/api/*`、`/healthz`、`/readyz` → 后端逻辑；
- 其余 GET（`Accept: text/html`）→ **SPA 回退** `index.html`（支持 `/products/:id` 等深链直达）；
- `assets/*`（带 hash）→ `Cache-Control: public, max-age=31536000, immutable`；`index.html` → `no-cache`；
- `/uploads/*` → 素材文件（`max-age=86400`）；`/api/nope` 仍返回 404 JSON（不被回退吞掉）。

### 4.2 分离部署（CDN/Nginx 静态 + 后端 API）

1. `gh-web/dist` 上传到 CDN/Nginx 站点根；构建时 `VITE_API_BASE` 填后端域名（https）。
2. Nginx 配置 **history fallback**：

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

3. 后端 `CORS_ORIGINS` 收敛为前端正式域名。

---

## 五、上传目录与素材库

- 素材落盘：`gh-server/data/uploads/`（`UPLOAD_DIR` 覆盖）；**该目录必须持久化**（容器需挂载卷 / PVC），否则重启丢素材。
- 公开访问：`/uploads/<文件名>`（由 `gh-server` 直接托管，**必须挂载在 SPA 回退之前**，代码已保证）。
- 上传协议：原始字节流 + `X-File-Name`（URL 编码）；扩展名/MIME 双白名单；脚本/HTML 被拒（415）。
- **素材库（文件夹 / 分类）**：虚拟文件夹与分类元数据持久化于 SQLite（`upload_folders` / `upload_meta`），后台支持文件夹增删改、按分类/文件夹筛选、多选批量移动；公开访问路径不变（`/uploads/<文件名>`）。
- **数据持久化（阶段 5a）**：内容库 / 结构化集合 / 其余后台资源 / 审计日志已统一落入 **SQLite 单库** `gh-server/data/gh.sqlite`（`DB_PATH` 覆盖；启用 WAL，伴随 `gh.sqlite-wal` / `gh.sqlite-shm`）。
  - 首次启动会自动把旧的四份 JSON 一次性迁移入库（`meta.migrated_json=1`），**旧 JSON 保留不删**。
  - **备份**：需覆盖 `gh.sqlite`（含 `-wal` / `-shm`；建议先 `PRAGMA wal_checkpoint(TRUNCATE)` 或停服再拷以获一致快照）+ `uploads/` 目录。

### 5.1 应用内备份 / 恢复 / 重置（阶段 5b）

除上面「拷库 + uploads」的运维级备份外，后台提供**应用内快照**能力（落盘 `BACKUP_DIR`，默认 `gh-server/data/backups/`，需持久化）：

- **入口**：后台「系统设置 → 备份」栏目；或直接调用端点（需会话 Cookie）。
- **立即备份**：`POST /api/admin/backups` → 在 `BACKUP_DIR` 生成 `backup-<时间戳>.json`；快照含 `content_pages` / `site_config` / `collections` / `admin_resources` 四类原始行 + `version`/`generatedAt`。
- **下载**：`GET /api/admin/backups/:id/download`（`application/json`）。
- **恢复（覆盖）**：`POST /api/admin/backups/:id/restore` → **整表覆盖**恢复；恢复前自动生成一份 `pre-restore` 快照以便回退。
- **删除**：`DELETE /api/admin/backups/:id`。
- **重置为初始**：`POST /api/admin/reset`，body `{ scope: 'all'|'pages'|'collections'|'admin', key? }` → 将对应数据重置为初始 seed（`all` 覆盖内容库+站点+集合+后台资源）。**替代此前「手动删 `gh.sqlite` 文件」的操作**；重置会丢弃改动，操作前建议先备份。
- 合规：以上写操作均记入操作审计（`logs` 栏目可见），并受 CSRF 来源校验保护。

> ⚠️ `BACKUP_DIR` 与 `DB_PATH`、`uploads/` 一样需挂载持久卷，否则容器重建后备份丢失。
> ⚠️ 应用内备份为**逻辑快照**（数据行），不等于物理库文件；灾难恢复仍建议同时保留 `gh.sqlite`（含 `-wal`/`-shm`）+ `uploads/` 的物理备份。

### 5.2 应用内发布记录与回滚（阶段 5C）

后台「发布」能力提供**版本记录 + 内容回滚**（端点 `/api/admin/publish*`，需 `publish` 权限，落 SQLite 表 `releases`）：

- **记录一次发布**：`POST /api/admin/publish`（body `{ note? }`）→ 快照当前内容（同备份结构）并生成版本号 `vYYYYMMDD-N`，返回 `{ item }`。
- **列表**：`GET /api/admin/publish` → `{ items, total }`（倒序）。
- **回滚**：`POST /api/admin/publish/:id/restore` → 整表覆盖恢复至该发布时内容；**回滚前自动生成 `pre-restore` 备份**（落 `BACKUP_DIR`），可再次回退。
- **删除记录**：`DELETE /api/admin/publish/:id`。

> ⚠️ 本能力只做「版本记录与**内容**回滚」，**不做**构建 / 托管 / 进程与主机操作。真正「上线」仍按本 Runbook 的构建 + 托管步骤执行：发布前调 `POST /api/admin/publish` 留档 → 构建前端 + 重启后端 → 若异常则用 `/publish/:id/restore` 回滚内容并按 §八 回滚前后端产物。

### 5.3 角色权限（RBAC，阶段 4C）

- 角色服务端单一真源：`gh-server/src/data/roles.ts`；`admin`（全部权限）、`operator`（仅 `content`：页面 / 站点 / 装修 / 模板 / 上传 / 内容类集合与栏目）。
- 越权栏目返回 **403**（如 `operator` 访问 `roles` / `backups` / `publish` / `reset`）；未登录仍为 **401**。
- 登录与 `GET /api/admin/auth/me` 返回 `role` / `roleName` / `scopes`，前端据此显隐菜单（前端侧由另一任务消费）。

---

## 六、健康检查与缓存策略（已内置，无需额外配置）

| 项 | 行为 |
|---|---|
| 存活探针 | `GET /healthz` → `{ ok, service, time }`；不限流 |
| 就绪探针 | `GET /readyz` → `{ ok, uptimeSec }`；不限流，供容器/LB 检查 |
| 请求 ID | 每请求 `X-Request-Id`（入站合法值透传），响应头回传 |
| 访问日志 | 响应完成输出单行 JSON：`ts/level/msg/requestId/method/path/status/durationMs/ip` |
| 异常日志 | 未捕获异常单行 JSON + 500 JSON |
| 缓存 | `/api/*` → `no-cache`；`/api/account` → `no-store`；`assets/*` → `immutable`；`index.html` → `no-cache` |
| 压缩 | gzip（按 `Accept-Encoding`）；JS/JSON 显著降体积 |
| 安全头 | `nosniff` / `SAMEORIGIN` / `Referrer-Policy`；`TRUST_PROXY=1` 时 HSTS |

> 结构化日志建议投递到 ELK/Loki/CloudWatch，并对 **5xx 比例**与 **429 突增**设阈值告警。

---

## 七、上线冒烟（部署后立即执行）

```bash
BASE=https://www.<domain>
# 1) 探针
curl -sf $BASE/healthz && curl -sf $BASE/readyz
# 2) 基础 12 端点（均应 200）
for p in products products/gh-m900-pro "search?q=GH" ladder home support business about center account legal legal/privacy; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/$p")  /api/$p"
done
# 3) 内容库 / 结构集合（抽验）
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/content/pages"
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/content/site"
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/content/blocks/types"
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/downloads"
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/faq"
# 4) 后台鉴权：未带令牌 → 401；带令牌 → 200
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/admin/pages"
curl -s -o /dev/null -w '%{http_code}\n' -H 'Authorization: Bearer <token>' "$BASE/api/admin/pages"
# 5) 未命中 → 404；深链 → 200 HTML
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/products/nope"
curl -s -o /dev/null -w '%{http_code}\n' -H 'Accept: text/html' "$BASE/products/gh-m900-pro"
# 6) 压缩 / 安全头 / 请求 ID
curl -s -D - -o /dev/null -H 'Accept-Encoding: gzip' "$BASE/api/products" | grep -iE 'content-encoding|vary'
curl -s -D - -o /dev/null "$BASE/" | grep -iE 'x-content-type-options|x-frame-options|referrer-policy|strict-transport-security'
curl -s -D - -o /dev/null -H 'X-Request-Id: smoke-1' "$BASE/healthz" | grep -i 'x-request-id'
# 7) SEO：sitemap / robots（应 200，sitemap 含首页与详情 URL）
curl -sf "$BASE/sitemap.xml" | head -n 3
curl -sf "$BASE/robots.txt" | grep -E 'Disallow: /admin|Sitemap:'
# 8) 发布记录（admin）：创建 → 列表（operator 应 403）
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Authorization: Bearer <admin-token>' "$BASE/api/admin/publish"
curl -s -o /dev/null -w '%{http_code}\n' -H 'Authorization: Bearer <operator-token>' "$BASE/api/admin/publish"
```

判定：探针 200；基础 12/12 → 200；内容库/集合端点 200；后台未授权 → 401、授权 → 200；未命中 → 404；深链 → 200；压缩与安全头出现；`X-Request-Id` 回传 `smoke-1`；sitemap/robots 200；发布创建 201、operator 访问发布 403。

---

## 八、回滚

- **前端**：CDN/Nginx 回切上一版 `dist`（`index.html` 为 `no-cache`，回切即时生效）。
- **后端**：回滚到上一版代码重启；**数据**（SQLite 库 `gh.sqlite`〔含 `-wal`/`-shm`〕+ uploads）随发布前备份一并回滚。回滚到阶段 5a 之前版本时，仍可读取保留的旧 JSON。
- 跨域/证书类问题优先核对：`CORS_ORIGINS` 是否含前端域名、`VITE_API_BASE` 是否 https。
- ⚠️ 排障：确认端口上运行的是**最新代码的进程**（`ss -ltnp | grep 8787`），旧进程占用端口会导致新进程启动即退出。

---

## 九、待接入项（发布前必须处理）

| # | 项 | 现状 | 待办 |
|---|---|---|---|
| 1 | **正式域名** | `sitemap.xml` / `robots.txt` 已**动态生成**（域名取 `SITE_ORIGIN`，缺省请求 Host）；`data/meta.ts` 的 `SITE_URL` 仍为占位 `www.guanghun.example` | 生产设 `SITE_ORIGIN=https://www.<domain>`；替换 `SITE_URL` 为正式域名 |
| 2 | **HTTPS** | 未配置 | 前端域名与（分离时）API 域名签发证书、配置 443；`VITE_API_BASE` 用 https |
| 3 | **数据库** | ✅ 已升级 **SQLite 单库** `data/gh.sqlite`（阶段 5a）；旧 JSON 一次性迁移保留 | 多实例部署时改为外部 DB / 客户端-服务器模式（当前为单进程 `node:sqlite`） |
| 4 | **对象存储** | 素材落本地磁盘 `data/uploads/` | 接入对象存储（OSS/S3）+ CDN（PRD 阶段 5） |
| 5 | 鉴权加固 | ✅ 已完成：scrypt 加盐哈希 + httpOnly Cookie（兼容 Bearer）+ CSRF 来源校验 + 服务端 **RBAC**（阶段 4C） | 可选：会话改短时令牌 + 刷新令牌 |
| 6 | 法务/备案 | 占位正文与占位备案号 | 法务正式条款 + 真实 ICP / 主办单位 / 公安备案 / 核验联系方式 |
| 7 | 图片资产 | 消费侧已优化（`MediaImg` lazy/async/防 CLS/`srcset` 登记表「有则用无则退」） | 上传管线侧：压缩 / 多尺寸 / 生成 `srcset` |
| 8 | 日志采集 | 仅 stdout | 接入日志后端 + 5xx/429 告警 |

---

## 十、上线检查清单（勾完即发布）

- [ ] `VITE_API_BASE` 按拓扑正确注入并**重新构建**
- [ ] `CORS_ORIGINS` 收敛为正式域名（分离部署必填）
- [ ] HTTPS 证书已配置，前后端均 https
- [ ] `SITE_ORIGIN` 已设为正式域名；`SITE_URL` 占位域名已替换（`sitemap.xml` / `robots.txt` 由后端动态生成）
- [ ] ICP 备案号、主办单位、公安备案、核验联系方式已替换为真实值
- [ ] 内容 / 法务 / 素材占位已全部替换
- [ ] `uploads/` 已挂载持久卷；备份覆盖 **`gh.sqlite`（含 `-wal`/`-shm`）+ `uploads/`**
- [ ] 自动化门禁全绿：`gh-server` `npm test` + `npm run test:e2e`、`gh-web` `npm test`、`npm run build`、`npm run lint`
- [ ] 第七节冒烟全部通过
- [ ] 结构化日志已接入并设 5xx / 429 告警
- [ ] 完成《V1.0 发布检查单》全部条目
