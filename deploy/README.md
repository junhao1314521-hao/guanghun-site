# 光魂官网 · 部署包说明

适用：阿里云 ECS（Ubuntu 24.04）正式环境，端口 **3002**，与商城 `guanghun`（3001）完全隔离。

## 1. 包内容

```
website/
├── app/
│   ├── gh-server/          # 后端源码（运行时用 tsx，服务器不构建前端）
│   └── gh-web/dist/        # 本地已构建的前端产物
├── deploy/
│   ├── install.sh          # 一键部署 / 升级（可重复执行）
│   ├── rollback.sh         # 回滚到指定备份
│   ├── website.service     # systemd 单元
│   └── logrotate-website   # 日志轮转
└── .env.example            # 环境变量模板（不含真实口令）
```

## 2. 部署 / 升级

```bash
# 上传后在服务器执行（root）
tar -xzf website-*.tar.gz -C /tmp
bash /tmp/website/deploy/install.sh
```

首次执行会：

1. 创建 `/opt/website/{app,data,logs,backups}`
2. 同步代码（前端产物直接使用，不在服务器执行 Vite）
3. 生成 `/opt/website/app/.env`（含随机后台口令，权限 640）
4. 安装后端依赖（`npm ci`，仅首次或 lock 变化时）
5. 注册并启动 `website.service`（启动自启、崩溃自动重启）
6. 配置 `/etc/logrotate.d/website`
7. 检查 `http://127.0.0.1:3002/healthz`

升级时重复执行即可；旧代码自动备份到 `/opt/website/backups/app-<时间戳>.tar.gz`，`.env` 与数据目录保持不变。

## 3. 目录与端口

| 项 | 值 |
|---|---|
| 应用目录 | `/opt/website/app` |
| 数据库 | `/opt/website/data/gh.sqlite` |
| 上传目录 | `/opt/website/data/uploads` |
| 备份目录 | `/opt/website/data/backups` |
| 日志 | `/opt/website/logs/website.log` |
| 端口 | `3002`（不占用 3001） |
| 健康检查 | `http://127.0.0.1:3002/healthz` |
| 首页 | `/` |
| 后台 | `/admin` |

## 4. 常用命令

```bash
systemctl status website
systemctl restart website
journalctl -u website --since "10 min ago"
tail -f /opt/website/logs/website.log
```

## 5. 环境变量

见 `.env.example`。真实配置在服务器 `/opt/website/app/.env`：

- 第一阶段 HTTP：`COOKIE_SECURE=0`、`TRUST_PROXY=0`
- 切到 Nginx + HTTPS 后：改为 `COOKIE_SECURE=1`、`TRUST_PROXY=1`，并更新 `SITE_ORIGIN`
- 后台口令仅首次建库生效；已有库需在后台修改或清库重建

## 6. 回滚

```bash
ls -lt /opt/website/backups/
bash /opt/website/app/deploy/rollback.sh /opt/website/backups/app-YYYYmmdd-HHMMSS.tar.gz
```

数据目录不回滚，避免覆盖业务数据；如需回滚数据，单独恢复 `gh.sqlite`。

## 7. 与商城隔离

- 不修改、不重启 `guanghun.service`
- 不占用 3001
- 不使用 `/opt/guanghun` 下的数据库与上传目录
- 端口冲突检查：`ss -lntp | grep 3002`
