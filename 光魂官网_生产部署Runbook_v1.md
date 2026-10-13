# 光魂官网 · 生产部署 Runbook v1

> **用途**：把「光魂官网」（前端 `gh-web` + 参考后端 `gh-server`）部署到生产环境的**可照做步骤**，含环境变量、同源/分离两种拓扑、HTTPS、域名与备案替换。
> **前置**：内容 / 法务 / 备案真实素材已替换（见《[接口对接与素材替换清单 v1](./光魂官网_接口对接与素材替换清单_v1.md)》§四·A），否则不得对外发布。
> 生成日期：2026-10-11 ｜ 关联：[后端接口契约 v1](./光魂官网_后端接口契约_v1.md) · [V1.0 发布检查单 v1](./光魂官网_V1.0发布检查单_v1.md)

---

## 一、环境要求

| 项 | 要求 |
|---|---|
| Node.js | ≥ 20 LTS（工程以 Node 22 开发验证） |
| 包管理 | npm（仓库含 `package-lock.json`，建议 `npm ci`） |
| 前端构建 | `gh-web`：Vite 8 + React 19，产物 `gh-web/dist` |
| 后端运行 | `gh-server`：Express 5 + tsx（可直接 `tsx` 运行，无需编译步骤） |
| 反向代理 | Nginx / 云负载均衡（同源部署时可选；分离部署时必需） |

---

## 二、环境变量清单

### 2.1 后端 `gh-server`（进程环境变量，运行时读取）

| 变量 | 必填 | 说明 | 示例 |
|---|---|---|---|
| `PORT` | 否 | 监听端口，默认 `8787` | `8787` |
| `STATIC_DIR` | 否 | **同源部署**时指向前端构建目录；设置后即托管前端 + SPA 回退 | `/srv/gh-web/dist` |
| `CORS_ORIGINS` | 否 | 逗号分隔白名单；**分离部署时必填**，未设置则放开（仅供本地联调） | `https://www.gh.com,https://gh.com` |
| `TRUST_PROXY` | 否 | 置 `1` 表示置于 Nginx / CDN 等 TLS 终止之后：正确判定协议与客户端 IP，并**下发 HSTS**；直接裸跑（无前置代理）时留空 | `1` |
| `RATE_LIMIT_MAX` | 否 | 单 IP 每窗口请求上限（内存限流兜底），默认 `300` | `300` |
| `RATE_LIMIT_WINDOW_MS` | 否 | 限流窗口长度（毫秒），默认 `60000`（1 分钟） | `60000` |

> 说明：`gh-server` 直读进程环境变量，不加载 `.env`。用 `export`、systemd `Environment=`、Docker `-e` 或编排平台注入即可。
> ⚠️ 限流为**单实例进程内**实现：多实例部署时各实例独立计数，应改由前置网关 / Redis 承担全局限流；`/healthz` 与 `/readyz` 不参与限流。

### 2.2 前端构建 `gh-web`（**构建期**注入，运行时不可改）

| 变量 | 必填 | 说明 | 示例 |
|---|---|---|---|
| `VITE_API_BASE` | **是** | 后端基地址。**未设置（undefined）会在加载期直接报错**；显式置空字符串 `""` 表示**同源**（请求走相对路径 `/api/...`） | 分离部署：`https://api.gh.com`；同源部署：`""` |

> **同源部署（推荐）**：前后端同域，构建时显式置空 —— `VITE_API_BASE= npm run build`，产物请求相对路径 `/api/...`（兼容反向代理 / 隧道环境，无跨域）。
> **分离部署**：前端静态走 CDN、后端独立域名，必须填后端完整地址（**https**）。
> ⚠️ 注意区分「未设置」与「置空」：**未设置 → 报错**（防静默空白页）；**置空 → 同源相对路径**。
> ⚠️ `VITE_API_BASE` 是**构建期**变量：改了必须**重新构建**，不是改运行时配置。

---

## 三、构建与启动

### 3.1 构建前端

```bash
cd gh-web
npm ci
# 同源部署（推荐）：置空 → 相对路径 /api/...
VITE_API_BASE= npm run build
# 分离部署：填后端域名
# VITE_API_BASE="https://api.gh.com" npm run build
# 产物：gh-web/dist
```

> ⚠️ `VITE_API_BASE` 是**构建期**变量：改了必须**重新构建**，不是改运行时配置。

### 3.2 启动后端

```bash
cd gh-server
npm ci
PORT=8787 CORS_ORIGINS="https://www.gh.com" TRUST_PROXY=1 npm start
```

---

## 四、部署拓扑

### 4.1 【推荐】同源部署（单进程同时托管前端 + API）

一个 `gh-server` 同时提供 API 与前端静态资源，**无跨域**、SPA 深链直达。

```bash
cd gh-server
npm ci
STATIC_DIR=/srv/gh-web/dist PORT=8787 npm start
# 或仓库内置脚本（本地/默认路径）： npm run serve
```

行为：
- `/api/*`、`/healthz` → 走后端逻辑；
- 其余 GET（`Accept: text/html`）→ 回退 `index.html`（支持 `/products/:id` 等深链直开）；
- `assets/*`（带 hash）→ `Cache-Control: public, max-age=31536000, immutable`；`index.html` → `no-cache`（发版即时生效）。

### 4.2 分离部署（CDN/Nginx 静态 + 后端 API）

1. **前端**：把 `gh-web/dist` 上传到 CDN / Nginx 站点根；构建时 `VITE_API_BASE` 填后端域名。
2. **Nginx** 需配置 **history fallback**（否则深链 404）：

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

3. **后端**：`CORS_ORIGINS` 收敛为前端正式域名（否则跨域被拦）。

---

## 五、HTTPS 与域名

1. 为前端域名与（分离部署时）API 域名各签发证书并配置 443。
2. 前端 `VITE_API_BASE` 必须用 **https**（页面为 https 时请求 http 会被浏览器拦截）。
3. **占位域名替换**（上线前必做）：
   - `gh-web/public/robots.txt`：`Sitemap:` 与站点域名 → 正式域名；
   - `gh-web/public/sitemap.xml`：`<loc>` 全部 `www.guanghun.example` → 正式域名；
   - 备案信息：`gh-server/src/data/legal.ts` 的 ICP 备案号、主办单位、公安备案号、核验联系方式 → 真实值。

---

## 六、缓存策略（已内置，无需额外配置）

| 资源 | 策略 | 位置 |
|---|---|---|
| `/api/*` | `Cache-Control: no-cache`（回源校验；ETag 由 express 默认生成） | `gh-server/src/app.ts` |
| `/api/account` | `Cache-Control: no-store`（个人数据不落盘） | 同上 |
| `assets/*` | `public, max-age=31536000, immutable` | 同上 |
| `index.html` | `no-cache` | 同上 |

## 六·补、传输压缩与安全响应头（已内置，无需额外配置）

| 项 | 行为 | 位置 |
|---|---|---|
| gzip 压缩 | 对前端产物（JS/CSS，>1KB）与 JSON 响应按 `Accept-Encoding` 压缩；实测 JS **458 KB → 130 KB（−72%）**、API JSON **2.1 KB → 0.65 KB（−69%）** | `gh-server/src/app.ts`（`compression()`） |
| `X-Content-Type-Options` | `nosniff` | 同上 |
| `X-Frame-Options` | `SAMEORIGIN`（防点击劫持） | 同上 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 同上 |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`，**仅当 `TRUST_PROXY=1`** 时下发 | 同上 |

> 说明：未内置 CSP —— 前端含内联样式与外链图片，CSP 需按实际资源清单单独拟定，避免误伤；如需在 Nginx / CDN 层追加，请以实际资源为准。若前置代理已做 gzip，可自行决定是否保留本层压缩（两者叠加无副作用）。

---

## 六·二、性能基线（本地实测，2026-10-11）

> 用途：上线后对比回归。**本表为 loopback 本地服务端处理基线**（无公网 RTT），不代表真实用户时延；生产以 CDN/边缘节点实测为准。

**首屏关键资源（同源、gzip）**

| 资源 | 传输字节（gzip） | 服务端耗时 |
|---|---|---|
| `index.html` | 627 B | <1 ms |
| JS 主包（`index-*.js`） | 129,773 B | 13.5 ms |
| CSS 主包（`index-*.css`） | 11,533 B | 4.2 ms |
| **合计** | **≈ 139 KB** | — |

> 未压缩合计 ≈ 512 KB → 压缩后 **≈ 139 KB（省约 73%）**。
>
> **更新（阶段 A 路由级分包后）**：首屏 gzip **≈ 112 KB**；入口业务 JS **11.3 KB gzip**，框架 `vendor`（`react` / `react-dom` / `react-router-dom`）**82.1 KB gzip 独立成块**（hash 稳定、跨发版可长期缓存）；各页面按需加载（`HomePage` 8.9 KB gzip 起）。上表 139 KB 为分包前的单包基线，保留作回归参照。

**12 条契约端点（gzip 后响应体）**

| 端点 | 耗时 | 字节 | 端点 | 耗时 | 字节 |
|---|---|---|---|---|---|
| `/api/products` | 2.6 ms | 652 | `/api/home` | 3.1 ms | 2,814 |
| `/api/products/:id` | 1.7 ms | 681 | `/api/support` | 1.3 ms | 1,627 |
| `/api/search` | 1.1 ms | 876 | `/api/business` | 2.0 ms | 1,419 |
| `/api/ladder` | 1.3 ms | 550 | `/api/about` | 1.3 ms | 1,188 |
| `/api/legal` | 1.2 ms | 2,587 | `/api/center` | 1.2 ms | 2,152 |
| `/api/legal/:slug` | 1.3 ms | 1,076 | `/api/account` | 4.8 ms | 1,077 |

`/healthz`：< 1 ms。全部端点均为内存常量读取，无外部依赖。

---

## 六·三、可观测性与加固（已内置，无需额外配置）

| 项 | 行为 | 位置 |
|---|---|---|
| 存活探针 | `GET /healthz` → `{ ok: true, service, time }`；不参与限流 | `gh-server/src/app.ts` |
| 就绪探针 | `GET /readyz` → `{ ok: true, uptimeSec }`；不参与限流，供容器 / LB 健康检查 | 同上 |
| 请求 ID | 每请求分配 `X-Request-Id`（入站值合法则透传），响应头回传；便于跨服务串联排查 | `gh-server/src/lib/observability.ts` |
| 访问日志 | 响应完成时输出**单行 JSON**：`ts` / `level` / `msg:"request"` / `requestId` / `method` / `path` / `status` / `durationMs` / `ip` | `gh-server/src/lib/logger.ts`（`logger`） |
| 异常日志 | 未捕获异常输出单行 JSON（含 `requestId` / `path` / `message`），并返回 500 JSON | `gh-server/src/app.ts` |
| 限流兜底 | `/api/*` 单 IP 固定窗口限流（默认 300/分钟），超限 → **429** + `Retry-After` | `gh-server/src/lib/rateLimit.ts` |
| 日志格式 | 每行一条 JSON，可直接被 ELK / Loki / CloudWatch 采集解析；`NODE_ENV=test` 时静默 | 同上 |

> 建议：把结构化日志投递到日志后端，并对 **5xx 比例**与 **429 突增**设阈值告警。
> 说明：`X-Request-Id` 与访问日志为**纯内存、无副作用**；如需链路追踪（OpenTelemetry 等）可在本层基础上再扩展。

---

## 七、上线冒烟（部署后立即执行）

```bash
BASE=https://www.gh.com
# 1) 健康检查（存活 + 就绪）
curl -sf $BASE/healthz
curl -sf $BASE/readyz
# 2) 12 条契约端点（均应 200）
for p in products products/gh-m900-pro "search?q=GH" ladder home support business about center account legal legal/privacy; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/$p")  /api/$p"
done
# 3) 未命中 → 404
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/products/nope"
# 4) SPA 深链 → 200 且返回 HTML
curl -s -o /dev/null -w '%{http_code}\n' -H 'Accept: text/html' "$BASE/products/gh-m900-pro"
# 5) 压缩生效：应见 Content-Encoding: gzip 与 Vary: Accept-Encoding
curl -s -D - -o /dev/null -H 'Accept-Encoding: gzip' "$BASE/api/products" | grep -iE 'content-encoding|vary'
# 6) 安全头生效：应见 nosniff / SAMEORIGIN / strict-origin-when-cross-origin（https 下另有 HSTS）
curl -s -D - -o /dev/null "$BASE/" | grep -iE 'x-content-type-options|x-frame-options|referrer-policy|strict-transport-security'
# 7) 请求 ID 生效：应见 X-Request-Id（自动分配 / 入站值回传）
curl -s -D - -o /dev/null -H 'X-Request-Id: smoke-1' "$BASE/healthz" | grep -i 'x-request-id'
```

判定：`/healthz` 与 `/readyz` 均 200；12/12 → 200；未命中 → 404；深链 → 200；压缩与安全头均出现在响应头中；`X-Request-Id` 回传 `smoke-1`。

### 7.1 本地实测核对结果（同源实例，2026-10-11）

对 `STATIC_DIR=gh-web/dist` 的同源实例逐条实测，**7/7 全部通过**：

| 项 | 实测结果 |
|---|---|
| 存活 / 就绪 | `healthz 200` · `readyz 200` |
| 12 条契约端点 | **12/12 → 200** |
| 未命中 / 深链 | `/api/products/nope → 404`；`/products/gh-m900-pro（Accept: text/html）→ 200 text/html` |
| 压缩 | `Content-Encoding: gzip` + `Vary: Accept-Encoding` |
| 安全头 | `X-Content-Type-Options: nosniff` · `X-Frame-Options: SAMEORIGIN` · `Referrer-Policy: strict-origin-when-cross-origin`（裸跑无 TLS，HSTS 按设计不下发） |
| 请求 ID | 入站值回传（`X-Request-Id: smoke-1`）；无入站值时**自动分配 UUID** |
| 缓存分阶 | `index.html → no-cache`；`assets/*.js → public, max-age=31536000, immutable`；`/api/* → no-cache`；`/api/account → no-store` |

另以独立实例（`TRUST_PROXY=1` + `CORS_ORIGINS`）验证加固分支：

| 项 | 实测结果 |
|---|---|
| HSTS | `TRUST_PROXY=1` 时下发 `Strict-Transport-Security: max-age=31536000; includeSubDomains` |
| CORS 白名单 | 白名单内 `Origin: https://www.gh.com` → 回 `Access-Control-Allow-Origin`；白名单外 `https://evil.example` → **不回该头**（被拦） |

> ⚠️ 排障提示：若上述项在本机复跑失败，先确认 **8787 端口上运行的是否为最新代码的进程**（`ss -ltnp | grep 8787`）。旧进程会占用端口导致新进程启动即退出，从而表现为「配置未生效」。

---

## 八、回滚

- **前端**：CDN / Nginx 回切上一版 `dist`（`index.html` 为 `no-cache`，回切即时生效）。
- **后端**：`gh-server` 无状态、数据为内存常量，重启即恢复；回滚到上一版代码重启即可。
- 发生跨域/证书类问题优先核对：`CORS_ORIGINS` 是否含前端域名、`VITE_API_BASE` 是否 https。

---

## 九、上线检查清单（勾完即发布）

- [ ] `VITE_API_BASE` 已按部署拓扑正确注入并**重新构建**
- [ ] `CORS_ORIGINS` 已收敛为正式域名（分离部署必填）
- [ ] HTTPS 证书已配置，前端/后端均 https
- [ ] `robots.txt` / `sitemap.xml` 占位域名已替换
- [ ] ICP 备案号、主办单位、公安备案、核验联系方式已替换为真实值
- [ ] 内容 / 法务 / 素材占位已按《素材替换清单》§四 全部替换
- [ ] 自动化门禁全绿：`gh-server` `npm test`（27/27）+ `npm run test:e2e`（9/9）、`gh-web` `npm test`（34/34）
- [ ] 第七节冒烟全部通过（12/12 → 200、无命中 → 404、深链 → 200）
- [ ] 结构化日志已接入日志后端，5xx / 429 已设阈值告警
- [ ] 完成《[V1.0 发布检查单](./光魂官网_V1.0发布检查单_v1.md)》全部条目