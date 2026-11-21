#!/usr/bin/env bash
# 光魂官网 · 切换到 HTTPS（域名与证书就绪后在服务器执行）
# ============================================================
# 前置条件（缺一不可）：
#   1. 域名的 A 记录已指向本机公网 IP（www 与裸域都要）
#   2. 安全组 / 防火墙放行 80、443
#   3. Nginx 已按 deploy/nginx-website.conf 提供 80 反代，nginx -t 通过
#   4. 证书：本脚本用 certbot --nginx 自动申请（需要邮箱）；如已有证书，请手工配置 443
#
# 用法：
#   sudo bash deploy/enable-https.sh --domain example.com --email ops@example.com          # 执行切换
#   sudo bash deploy/enable-https.sh --domain example.com --check                          # 只检查，不改任何文件
#   sudo bash deploy/enable-https.sh --domain example.com --email ops@example.com --no-www # 只签裸域
#   加 --force 可跳过「域名解析 IP 与本机公网 IP 不一致」的拦截（CDN / 代理场景）
#
# 切换内容（全部可回滚）：
#   - 备份 .env 与 Nginx 站点配置到 /opt/website/backups/
#   - certbot 申请证书并写入 443 + 80→443 跳转
#   - .env：SITE_ORIGIN=https://<domain>、COOKIE_SECURE=1、TRUST_PROXY=1
#   - 重载 Nginx、重启 website，验证 https 健康检查与 80 跳转
#   任一步失败会自动还原 .env 与 Nginx 配置。
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/website/app}
ENV_FILE=${ENV_FILE:-$APP_DIR/.env}
BACKUP_DIR=${BACKUP_DIR:-/opt/website/backups}
NGINX_AVAILABLE=${NGINX_AVAILABLE:-/etc/nginx/sites-available/website.conf}
NGINX_ENABLED=${NGINX_ENABLED:-/etc/nginx/sites-enabled/website.conf}
PORT=${PORT:-3002}

DOMAIN=''
EMAIL=''
WITH_WWW=1
CHECK_ONLY=0
FORCE=0

fail() { printf '  [FAIL] %s\n' "$*" >&2; exit 1; }
warn() { printf '  [WARN] %s\n' "$*"; }
ok()   { printf '  [OK]   %s\n' "$*"; }
step() { printf '\n== %s ==\n' "$*"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --domain) DOMAIN=${2:-}; shift 2 ;;
    --email) EMAIL=${2:-}; shift 2 ;;
    --no-www) WITH_WWW=0; shift ;;
    --check) CHECK_ONLY=1; shift ;;
    --force) FORCE=1; shift ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) fail "未知参数：$1（--help 查看用法）" ;;
  esac
done

[ -n "$DOMAIN" ] || fail '缺少 --domain'
printf '%s' "$DOMAIN" | grep -Eq '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$' \
  || fail "域名格式不合法：$DOMAIN"
[ "$CHECK_ONLY" = "1" ] || [ -n "$EMAIL" ] || fail '缺少 --email（certbot 申请证书需要）'

# ---------- 1. 运行环境 ----------
step '运行环境'
if [ "$CHECK_ONLY" = "1" ]; then
  [ "$(id -u)" = "0" ] || warn '当前不是 root，部分检查可能不完整（只读检查仍可继续）'
else
  [ "$(id -u)" = "0" ] || fail '执行切换需要 root（sudo bash ...）'
fi
command -v nginx >/dev/null 2>&1 && ok "nginx $(nginx -v 2>&1 | sed 's/^nginx version: //')" || fail '未安装 nginx'
if command -v certbot >/dev/null 2>&1; then
  ok "certbot $(certbot --version 2>&1 | awk '{print $2}')"
else
  fail '未安装 certbot（apt-get install -y certbot python3-certbot-nginx）'
fi
[ -f "$ENV_FILE" ] && ok ".env 存在：$ENV_FILE" || fail "缺少 $ENV_FILE"
[ -f "$NGINX_AVAILABLE" ] && ok "Nginx 站点配置：$NGINX_AVAILABLE" || fail "缺少 $NGINX_AVAILABLE"
nginx -t >/dev/null 2>&1 && ok 'nginx -t 通过' || fail 'nginx -t 未通过，先修好现有配置再切 HTTPS'
systemctl is-active --quiet nginx && ok 'nginx 运行中' || fail 'nginx 未运行'

# ---------- 2. DNS 与端口 ----------
step 'DNS 与端口'
resolved=$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk '{print $1}' | sort -u | tr '\n' ' ' || true)
if [ -z "${resolved// /}" ]; then
  warn "$DOMAIN 未解析到任何 IPv4 地址"
  if [ "$FORCE" = "0" ]; then
    fail "请先把 $DOMAIN 的 A 记录指向本机；确认是 CDN 场景可加 --force"
  fi
else
  ok "$DOMAIN → $resolved"
fi
public_ip=$(curl -4 -s --max-time 6 https://api.ipify.org 2>/dev/null || true)
if [ -n "$public_ip" ]; then
  if printf '%s' "$resolved" | grep -qw "$public_ip"; then
    ok "解析结果包含本机公网 IP $public_ip"
  elif [ "$FORCE" = "1" ]; then
    warn "解析结果不含本机公网 IP（$public_ip），已按 --force 继续"
  else
    fail "解析结果不含本机公网 IP（$public_ip）：可能是 DNS 未生效或经过 CDN；确认无误可加 --force"
  fi
else
  warn '无法获取本机公网 IP（出网受限），跳过 IP 比对，请自行确认 DNS'
fi
ss -lnt 2>/dev/null | grep -q ':80 ' && ok '80 端口已监听' || fail '80 端口未监听，HTTP 验收未完成前不能签证书'
if ss -lnt 2>/dev/null | grep -q ':443 '; then
  ok '443 端口已监听（已有 HTTPS 服务，certbot 会复用）'
else
  ok '443 端口空闲'
fi
ss -lnt 2>/dev/null | grep -q ":$PORT " && ok "后端 $PORT 端口已监听" || fail "后端 $PORT 未监听，先确认 website 服务正常"

# ---------- 3. 当前配置 ----------
step '当前配置'
env_get() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- || true; }
cur_origin=$(env_get SITE_ORIGIN)
cur_secure=$(env_get COOKIE_SECURE)
cur_proxy=$(env_get TRUST_PROXY)
echo "  SITE_ORIGIN=${cur_origin:-未设置}  COOKIE_SECURE=${cur_secure:-未设置}  TRUST_PROXY=${cur_proxy:-未设置}"
grep -qE "^[[:space:]]*server_name[[:space:]]" "$NGINX_AVAILABLE" \
  && ok "现有 server_name：$(grep -m1 -E '^[[:space:]]*server_name' "$NGINX_AVAILABLE" | sed 's/^[[:space:]]*//')" \
  || warn '现有配置没有 server_name，将写入域名'

if [ "$CHECK_ONLY" = "1" ]; then
  step '检查完成（未修改任何文件）'
  echo '  下一步：确认上述 WARN 项后，去掉 --check 并补 --email 再执行。'
  exit 0
fi

# ---------- 4. 备份 ----------
step '备份'
ts=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"
env_bak="$BACKUP_DIR/env-https-$ts.bak"
nginx_bak="$BACKUP_DIR/nginx-https-$ts.tar.gz"
cp -p "$ENV_FILE" "$env_bak"
tar -czf "$nginx_bak" -C /etc/nginx sites-available/website.conf sites-enabled/website.conf 2>/dev/null \
  || tar -czf "$nginx_bak" "$NGINX_AVAILABLE"
ok ".env → $env_bak"
ok "Nginx → $nginx_bak"

restore() {
  warn '回滚：还原 .env 与 Nginx 配置'
  cp -p "$env_bak" "$ENV_FILE" || true
  tar -xzf "$nginx_bak" -C /etc/nginx 2>/dev/null || true
  nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
  systemctl restart website || true
}

# ---------- 5. 申请证书 ----------
step '申请证书并写入 443'
if ! grep -qE "^[[:space:]]*server_name[^;]*\b$DOMAIN\b" "$NGINX_AVAILABLE"; then
  if grep -qE "^[[:space:]]*server_name[[:space:]]" "$NGINX_AVAILABLE"; then
    sed -i -E "0,/^[[:space:]]*server_name[[:space:]][^;]*;/s//    server_name $DOMAIN${WITH_WWW:+ www.$DOMAIN};/" "$NGINX_AVAILABLE"
    ok "已把 server_name 更新为 $DOMAIN$([ "$WITH_WWW" = "1" ] && echo " www.$DOMAIN")"
  else
    warn '现有配置没有 server_name，certbot 仍可按 -d 参数签发，跳过自动改写'
  fi
fi
cert_args=(--nginx --redirect --agree-tos -m "$EMAIL" --non-interactive -d "$DOMAIN")
[ "$WITH_WWW" = "1" ] && cert_args+=(-d "www.$DOMAIN")
if ! certbot "${cert_args[@]}"; then
  restore
  fail 'certbot 申请证书失败（通常是 DNS 未生效 / 80 被拦 / 域名已在他处签发）；已回滚'
fi
ok '证书已签发，Nginx 已写入 443 与 80→443 跳转'

# ---------- 6. 切换应用配置 ----------
step '切换 .env（三项必须一起改）'
set_env() {
  local key=$1 value=$2
  if grep -qE "^$key=" "$ENV_FILE"; then
    sed -i -E "s|^$key=.*|$key=$value|" "$ENV_FILE"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}
set_env SITE_ORIGIN "https://$DOMAIN"
set_env COOKIE_SECURE 1
set_env TRUST_PROXY 1
ok 'SITE_ORIGIN / COOKIE_SECURE / TRUST_PROXY 已更新'

chmod 600 "$ENV_FILE" || true
if ! nginx -t; then
  restore
  fail 'Nginx 配置校验失败；已回滚'
fi
systemctl reload nginx
systemctl restart website
sleep 6

# ---------- 7. 验收 ----------
step '验收'
health=$(curl -fsS --max-time 10 "https://$DOMAIN/healthz" 2>/dev/null || true)
case "$health" in
  *'"ok":true'*) ok "https 健康检查：$health" ;;
  *)
    restore
    fail "https://$DOMAIN/healthz 未返回 ok（实际：${health:-无响应}）；已回滚"
    ;;
esac
http_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://$DOMAIN/" || true)
case "$http_code" in
  301|302|307|308) ok "http → https 跳转：$http_code" ;;
  *) warn "http 根路径返回 $http_code（预期 3xx 跳转），请检查 certbot 是否写入 --redirect" ;;
esac
canonical=$(curl -fsS --max-time 10 "https://$DOMAIN/" 2>/dev/null | grep -o 'rel="canonical" href="[^"]*"' | head -1 || true)
echo "  ${canonical:-未找到 canonical}"
printf '%s' "$canonical" | grep -q "https://$DOMAIN" \
  && ok '服务端 canonical 已使用 https 域名' \
  || warn 'canonical 未包含 https 域名，检查 .env 的 SITE_ORIGIN 与服务是否已重启'

cat <<EOF

切换完成。
- 备份：$env_bak
- 备份：$nginx_bak
- 证书续期：certbot 已注册 systemd timer，可用 systemctl list-timers | grep certbot 查看
- 回滚：
    cp -p $env_bak $ENV_FILE
    tar -xzf $nginx_bak -C /etc/nginx
    systemctl reload nginx && systemctl restart website
- 可选：确认稳定运行一段时间后再评估 HSTS（本脚本不自动开启，避免不可逆）
EOF
