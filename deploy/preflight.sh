#!/usr/bin/env bash
# 光魂官网 · 正式服务器迁移前体检（只读，不改任何配置）
# 用法：sudo bash deploy/preflight.sh
set -uo pipefail

fail=0
ok()   { printf '  [OK]   %s\n' "$*"; }
warn() { printf '  [WARN] %s\n' "$*"; }
bad()  { printf '  [FAIL] %s\n' "$*"; fail=1; }

echo "== 系统 =="
if [ -r /etc/os-release ]; then . /etc/os-release; ok "${PRETTY_NAME:-unknown}"; fi
ok "架构 $(uname -m)"
[ "$(uname -m)" = "x86_64" ] || warn "非 x86_64，请确认 Node 安装包匹配"

echo "== 运行时 =="
if command -v node >/dev/null 2>&1; then
  echo "  node $(node -v)"
  if node -e "require('node:sqlite')" >/dev/null 2>&1; then
    ok "node:sqlite 可用（Node 22.5+）"
  else
    bad "Node 版本过低，需要 22.5+"
  fi
else
  bad "未安装 node（需要 22.5+）"
fi
command -v npm >/dev/null 2>&1 && ok "npm $(npm -v)" || bad "未安装 npm"
getent group www-data >/dev/null && ok "www-data 组存在" || warn "www-data 组不存在（install.sh 会自动创建）"

echo "== 端口 =="
for p in 3002 3003; do
  if ss -lntp 2>/dev/null | grep -q ":$p "; then
    warn "端口 $p 已被占用：$(ss -lntp 2>/dev/null | grep ":$p " | head -1 | sed 's/^ *//')"
  else
    ok "端口 $p 空闲"
  fi
done

echo "== 现有服务 =="
if [ -f /etc/systemd/system/website.service ]; then
  if grep -q '/opt/website/app/gh-server' /etc/systemd/system/website.service; then
    ok "website.service 属于本项目"
  else
    bad "website.service 已被其他业务占用：$(grep -m1 '^ExecStart=' /etc/systemd/system/website.service || true)"
  fi
else
  ok "website.service 不存在，可安全创建"
fi
systemctl list-unit-files 2>/dev/null | grep -E '^guanghun\.service' | sed 's/^/  /' || true

echo "== Nginx =="
if command -v nginx >/dev/null 2>&1; then
  nginx -v 2>&1 | sed 's/^/  /'
  if nginx -t >/dev/null 2>&1; then ok "nginx 配置语法通过"; else warn "nginx -t 未通过（可能需 root 或配置本身有误）"; fi
  if nginx -T 2>/dev/null | grep -qi 'server_name.*xxrsm\.com'; then
    ok "找到 xxrsm.com 的 server 块"
    nginx -T 2>/dev/null | grep -nE 'server_name|proxy_pass|root ' | grep -i -B1 -A1 xxrsm | head -12 | sed 's/^/  /'
  else
    warn "未在 nginx 配置中找到 xxrsm.com（可能由建站平台托管）"
  fi
else
  warn "未安装 nginx"
fi

echo "== 磁盘 / 内存 =="
df -h /opt 2>/dev/null | tail -1 | awk '{print "  /opt 可用 "$4" / 共 "$2}'
free -h 2>/dev/null | awk 'NR==2{print "  内存 已用 "$3" / 共 "$2}'

echo "== 目录 =="
[ -e /opt/website ] && warn "/opt/website 已存在，部署会备份后覆盖代码（数据目录保留）" || ok "/opt/website 不存在"

echo "== 时间同步 =="
timedatectl 2>/dev/null | grep -E 'System clock synchronized|NTP service' | sed 's/^/  /' || true

echo
if [ "$fail" -eq 0 ]; then
  echo "结论：未见阻断项，可继续迁移（请再人工确认 WARN 项）。"
else
  echo "结论：存在 [FAIL] 阻断项，请先处理后重跑。"
fi
exit "$fail"
