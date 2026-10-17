# AGENTS.md · 光魂官网协作与交接说明

> 任何 AI 会话或新协作者接手本项目，先读本文件，再读根目录 `README.md` 的权威文档索引。
> 本文件记录：怎么跑、改哪里、怎么上线、每次必须交付什么、打总包时哪些文件不能漏。
> 与代码冲突时，以「代码实现 + 《内容库与装修契约》」为准。

---

## 一、项目坐标

| 项 | 值 |
|---|---|
| 工作区 | `/workspace`（monorepo） |
| 前台 + 后台 | `gh-web/` · React 19 + Vite，开发端口 `5180`，后台路由 `/admin` |
| 后端 API | `gh-server/` · Express 5 + SQLite，端口 `8787` |
| 线上地址 | `https://guanghun-site.onrender.com`（push `main` 后 Render 自动部署，约 60–90s） |
| 仓库 | `https://github.com/junhao1314521-hao/guanghun-site.git` |
| 数据目录 | `gh-server/data/`（SQLite `gh.sqlite` + `uploads/` + `backups/`），**不入 git** |
| 后台账号 | 种子 `admin / admin123`（若环境变量设过 `ADMIN_PASSWORD`，以实际设置为准） |

**始终在 `/workspace` 内改代码，不要只凭截图改样式。**

---

## 二、启动 / 构建 / 测试

```bash
# 后端（API）
cd /workspace/gh-server && npm ci && npm start          # http://localhost:8787

# 前台 + 后台（/api、/uploads 已代理到 8787）
cd /workspace/gh-web && npm ci && npm run dev           # http://localhost:5180

# 上线前必过
cd /workspace/gh-web && npm run build                   # tsc -b && vite build
cd /workspace/gh-server && npm run typecheck
cd /workspace/gh-server && npm test
cd /workspace/gh-web && npm test

# 同源生产模式（构建后由 Express 托管前端）
cd /workspace/gh-server && npm run serve
```

---

## 三、数据与内容（最容易踩坑）

1. **seed ≠ 线上内容**
   - `gh-server/src/data/contentSeed.ts` 只在**空库**时生成初始页面；线上已存内容在 SQLite 里。
   - 改 seed 不会覆盖线上已有页面。要改线上内容：走后台 `/admin` 或 admin API；要重置：后台「系统设置 → 备份 / 重置」。
2. **内容 / 数据不进 git**
   - `gh-server/data/`、`uploads/`、`backups/` 均被 gitignore。
   - 交付内容状态时，需单独打包 `gh.sqlite`（含 `-wal` / `-shm`）+ `uploads/`，并说明这是**数据包**，不是代码包。
3. **Render 免费层没有持久磁盘**
   - 重启/重新部署后 `gh.sqlite`、`uploads/`、`backups/` 会回到种子状态。
   - 重要内容要么写回 seed，要么给 Render 挂 Persistent Disk，并把 `DB_PATH` / `UPLOAD_DIR` / `BACKUP_DIR` 指过去。
4. **静态素材 vs 后台上传**
   - 前台固定素材：`gh-web/public/media/`、`gh-web/public/posters/`，新增后要在 `gh-web/src/data/media.ts` 注册。
   - 后台上传：落 `gh-server/data/uploads/`，通过 `/uploads/<文件名>` 访问，不入 git。
   - 占位判断：`/media/` 下只有 `.svg` 视为占位图，真实图片用 jpg/png/webp。

---

## 四、修改规范

- 改页面内容结构：同步 `gh-server/src/data/contentSeed.ts`（种子）与 `gh-server/src/data/blockCatalog.ts`（后台字段名称 / 说明），否则后台无法配置。
- 改区块渲染：`gh-web/src/blocks/*`；样式在 `gh-web/src/styles/`（`site.css` 页面层、`blocks.css` 区块层、`tokens.css` 令牌）。
- 改接口：`gh-server/src/routes/*`，并同步《后端接口契约 v1.0》。
- 需求变化：先改 `文档/光魂官网_PRD_v1.0.md`，再同步 `AC核对表` / `接口契约` / `设计规格` / `页面组件清单`。
- 不擅自改无关模块；一次会话只做一个阶段，便于定位回归。

---

## 五、提交与发布

本机未配置全局 git 身份，提交时用环境变量：

```bash
cd /workspace
git add <具体文件>            # 不要 git add -A；禁止提交 data/、.uploads/、凭据
GIT_AUTHOR_NAME='guanghun-dev' GIT_AUTHOR_EMAIL='dev@guanghun.local' \
GIT_COMMITTER_NAME='guanghun-dev' GIT_COMMITTER_EMAIL='dev@guanghun.local' \
git commit -m "<一句话说明为什么改>"

# 推送（凭据文件已存在且已 gitignore）
git -c credential.helper='store --file=/workspace/.git-credentials' push origin main
```

发布后验证：
1. 等待 60–90s；
2. 打开线上页面，确认 CSS/JS 资产哈希已变化；
3. 检查关键断点（桌面 / 平板 / 手机）与按钮文案；
4. 截图或记录关键计算值（列数、卡片尺寸、接口返回）。

---

## 六、每次交付必须输出

- **改动文件清单**（绝对路径或仓库相对路径）
- **构建 / 类型检查 / 测试结果**
- **commit hash + push 结果**
- **线上验证结论**（URL、截图路径、关键数值）
- 若改了数据模型或需求：同步更新了哪些文档

---

## 七、新会话交接模板（复制给新的 agent）

```text
项目：光魂官网 monorepo，路径 /workspace；先读 /workspace/AGENTS.md 与 README.md
前台+后台：gh-web（React19+Vite，:5180，/admin）；后端：gh-server（Express5+SQLite，:8787）
线上：https://guanghun-site.onrender.com（push main 自动部署）

本次目标：<改哪个页面/区块，附参考图或截图>
范围：<只改前台样式 / 含后台字段 / 含内容 seed>
约束：<不动数据库、不动无关模块、保持响应式、文案保持…>
验收：<桌面列数 / 移动端 / 具体断点与文案>
完成：build + 测试 → commit → push → 等 90s 验证线上 → 输出改动清单与截图

禁止：提交 gh-server/data/、.git-credentials、.uploads/；执行 reset/清库；force push
```

---

## 八、总包清单（打包时逐项核对）

### 8.1 代码包（进 git，必须完整）

```text
README.md
AGENTS.md
Dockerfile
.dockerignore
.gitignore
render.yaml
start.sh
交付包说明.md
文档/                          # 权威文档集（PRD / AC / 契约 / 设计规格 / 部署 Runbook 等）
gh-web/
  package.json
  package-lock.json
  tsconfig.json / tsconfig.app.json / tsconfig.node.json
  vite.config.ts
  index.html
  .oxlintrc.json
  src/                        # 页面、区块、组件、样式、数据、hooks、api
  public/                     # 字体、media、posters、icons、robots、sitemap
  scripts/
  test/
gh-server/
  package.json
  package-lock.json
  tsconfig.json
  src/                        # routes / data / middleware / lib
  test/
```

### 8.2 明确排除

```text
node_modules/  dist/  *.tsbuildinfo
gh-server/data/            # 数据库、上传、备份（如需交付内容，另打数据包）
.uploads/  .screenshots/  .bin/  .csb-site/  .trae-html-share-packages/
.gh-token  .git-credentials  .env  .env.*
*.zip  .git/
```

### 8.3 数据包（按需，单独加密传输）

```text
gh-server/data/gh.sqlite（含 -wal / -shm，建议先停服或 wal_checkpoint）
gh-server/data/uploads/
gh-server/data/backups/
```

### 8.4 打包时记录

- `git rev-parse HEAD`（对应版本）
- 打包日期
- 当前线上 URL 与后台入口
- 凭据**不要写进包内**，通过私密渠道单独传递

---

## 九、禁止事项

- 禁止提交或外发 `.git-credentials`、`.gh-token`、`.env*`、数据库与上传文件
- 禁止 `git push --force`、禁止直接改 `main` 历史
- 禁止在未备份时执行后台「重置 / 清库」
- 禁止把 `gh-server/data/` 当代码改动提交
- 禁止用占位图/假数据冒充已完成功能
