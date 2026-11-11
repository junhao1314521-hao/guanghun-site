#!/usr/bin/env bash
# 光魂官网 · 一键部署 / 升级（可重复执行）
# 用法：sudo bash deploy/install.sh
# 可选：FORCE_INSTALL=1 sudo bash deploy/install.sh   # 强制重装后端依赖
set -euo pipefail

APP=/opt/website/app
DATA=/opt/website/data
LOGS=/opt/website/logs
BKP=/opt/website/backups
PKG="$(cd "$(dirname "$0")/.." && pwd)"

[ "$(id -u)" -eq 0 ] || { echo "请用 root 执行"; exit 1; }
command -v node >/dev/null || { echo "缺少 node"; exit 1; }
command -v npm >/dev/null || { echo "缺少 npm"; exit 1; }

mkdir -p "$APP" "$DATA/uploads" "$DATA/backups" "$LOGS" "$BKP"

# 1) 备份旧代码（不动数据；排除 node_modules）
if [ -d "$APP/gh-server" ]; then
  TS=$(date +%Y%m%d-%H%M%S)
  tar -czf "$BKP/app-$TS.tar.gz" --exclude='gh-server/node_modules' -C "$APP" gh-server gh-web deploy .env 2>/dev/null || true
  # 只保留最近 3 份代码备份
  ls -1t "$BKP"/app-*.tar.gz 2>/dev/null | tail -n +4 | xargs -r rm -f
  echo "[1/7] 旧代码已备份：$BKP/app-$TS.tar.gz"
else
  echo "[1/7] 首次部署，无旧代码"
fi

# 2) 同步新代码，保留 node_modules 以加速重复部署
TMP_MODULES=""
if [ -d "$APP/gh-server/node_modules" ]; then
  TMP_MODULES="/tmp/website_modules_$$"
  mv "$APP/gh-server/node_modules" "$TMP_MODULES"
fi
rm -rf "$APP/gh-server" "$APP/gh-web" "$APP/deploy"
cp -a "$PKG/app/gh-server" "$APP/"
cp -a "$PKG/app/gh-web" "$APP/"
cp -a "$PKG/deploy" "$APP/"
if [ -n "$TMP_MODULES" ] && [ -d "$TMP_MODULES" ]; then
  mv "$TMP_MODULES" "$APP/gh-server/node_modules"
fi
echo "[2/7] 代码已同步"

# 3) 生成 .env（仅首次；已有则保留）
if [ ! -f "$APP/.env" ]; then
  ADMIN_PW=$(openssl rand -hex 10)
  OPER_PW=$(openssl rand -hex 10)
  sed -e "s|__ADMIN_PASSWORD__|$ADMIN_PW|" \
      -e "s|__OPERATOR_PASSWORD__|$OPER_PW|" \
      "$PKG/.env.example" > "$APP/.env"
  chmod 640 "$APP/.env"
  chown root:www-data "$APP/.env"
  echo "[3/7] 已生成 .env（后台随机口令，见 /opt/website/app/.env）"
else
  echo "[3/7] 已存在 .env，保留原配置"
fi

# 4) 安装后端依赖（不在服务器构建前端）
cd "$APP/gh-server"
LOCK_HASH=$(sha256sum package-lock.json | awk '{print $1}')
if [ ! -d node_modules ] \
   || [ "$(cat node_modules/.lock-hash 2>/dev/null || true)" != "$LOCK_HASH" ] \
   || [ "${FORCE_INSTALL:-0}" = "1" ]; then
  echo "[4/7] 安装后端依赖（npm ci）"
  npm ci --no-audit --no-fund
  echo "$LOCK_HASH" > node_modules/.lock-hash
else
  echo "[4/7] 依赖未变化，跳过安装"
fi

# 5) 权限：代码只读，数据与日志归 www-data，并收紧到最小可见范围
chown -R www-data:www-data "$DATA" "$LOGS"
chmod -R a+rX "$APP/gh-server" "$APP/gh-web"
mkdir -p "$DATA/uploads" "$DATA/backups" "$BKP" "$LOGS"
chmod 750 "$DATA" "$DATA/uploads" "$DATA/backups" "$LOGS" "$BKP"
find "$DATA/uploads" -type d -exec chmod 750 {} + 2>/dev/null || true
find "$DATA/uploads" -type f -exec chmod 640 {} + 2>/dev/null || true
if [ -f "$DATA/gh.sqlite" ]; then chmod 640 "$DATA/gh.sqlite"; fi
# 旧站直链映射：不存在时创建空表（空表不产生任何跳转），后续按清单填充
if [ ! -f "$DATA/legacy-redirects.json" ]; then
  echo '{}' > "$DATA/legacy-redirects.json"
  echo "     已创建空映射表 $DATA/legacy-redirects.json（参考 deploy/legacy-redirects.example.json）"
fi
chown www-data:www-data "$DATA/legacy-redirects.json"
chmod 640 "$DATA/legacy-redirects.json"
touch "$LOGS/website.log"
chown www-data:www-data "$LOGS/website.log"
chmod 640 "$LOGS/website.log"
if [ -f "$APP/.env" ]; then
  chown root:www-data "$APP/.env"
  chmod 640 "$APP/.env"
fi
echo "[5/7] 权限已设置（数据/上传/备份 750，数据库与 .env 640）"

# 6) systemd + 日志轮转 + 每日数据库备份
install -m 644 "$PKG/deploy/website.service" /etc/systemd/system/website.service
install -m 644 "$PKG/deploy/logrotate-website" /etc/logrotate.d/website
install -m 644 "$PKG/deploy/website-backup.service" /etc/systemd/system/website-backup.service
install -m 644 "$PKG/deploy/website-backup.timer" /etc/systemd/system/website-backup.timer
systemctl daemon-reload
systemctl enable website >/dev/null
systemctl restart website
systemctl enable --now website-backup.timer >/dev/null
echo "[6/7] systemd 已启动（含每日 03:30 数据库备份定时器）"

# 7) 健康检查
for _ in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/healthz || true)
  if [ "$code" = "200" ]; then
    echo "[7/7] 健康检查通过：http://127.0.0.1:3002/healthz"
    exit 0
  fi
  sleep 1
done

echo "[7/7] 健康检查失败，最近日志："
tail -n 40 "$LOGS/website.log" || true
exit 1
