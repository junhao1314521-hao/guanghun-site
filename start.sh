#!/usr/bin/env sh
# ============================================================
# 光魂官网 v1.0 · 一键启动（同源部署：Express 同时托管前台与 API）
# ------------------------------------------------------------
# 用法：  sh start.sh              （默认端口 8899）
#         PORT=3000 sh start.sh    （换端口）
#
# 上线前请按《交付包说明.md》第 3 节设置生产环境变量，
# 尤其是 ADMIN_PASSWORD（默认口令不安全）。
# ============================================================
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-8899}"
# 前端产物目录（Express 同源托管；相对路径会按进程 cwd 解析，故用绝对路径）
export STATIC_DIR="$ROOT/gh-web/dist"

# —— 数据落盘：必须指向持久卷，否则容器/机器重建后内容与素材丢失 ——
export DB_PATH="${DB_PATH:-$ROOT/gh-server/data/gh.sqlite}"
export UPLOAD_DIR="${UPLOAD_DIR:-$ROOT/gh-server/data/uploads}"

# —— 生产必改（取消注释并填入真实值）——
# export ADMIN_PASSWORD="<强口令>"          # 后台 admin 口令；仅首次建库生效，务必首次启动前设置
# export ADMIN_OPERATOR_PASSWORD="<强口令>"  # 后台 operator 口令；同上
# export SITE_ORIGIN="https://www.<域名>"    # sitemap.xml / robots.txt 的绝对地址前缀
# export COOKIE_SECURE=1                     # 经 HTTPS 提供时必设（后台会话 Cookie 加 Secure）
# export TRUST_PROXY=1                       # 位于 Nginx / CDN（TLS 终止）之后时，正确取 IP 并下发 HSTS
# export CORS_ORIGINS="https://www.<域名>"   # 仅前后端分离部署时需要

cd "$ROOT/gh-server"
exec npx tsx src/index.ts
