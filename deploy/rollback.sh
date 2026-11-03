#!/usr/bin/env bash
# 回滚到指定备份（备份文件由 install.sh 自动生成）
# 用法：sudo bash deploy/rollback.sh /opt/website/backups/app-YYYYmmdd-HHMMSS.tar.gz
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "请用 root 执行"; exit 1; }
[ $# -eq 1 ] || { echo "用法：$0 /opt/website/backups/app-YYYYmmdd-HHMMSS.tar.gz"; exit 1; }
[ -f "$1" ] || { echo "备份不存在：$1"; exit 1; }

APP=/opt/website/app
echo "回滚前再备份当前版本..."
TS=$(date +%Y%m%d-%H%M%S)
tar -czf "/opt/website/backups/app-$TS.tar.gz" -C "$APP" gh-server gh-web .env 2>/dev/null || true

echo "解压备份：$1"
tar -xzf "$1" -C "$APP"
chown -R www-data:www-data /opt/website/data /opt/website/logs
chmod -R a+rX "$APP/gh-server" "$APP/gh-web"
systemctl restart website
sleep 2
curl -fsS http://127.0.0.1:3002/healthz >/dev/null && echo "回滚完成，健康检查通过"
