#!/usr/bin/env bash
# 本地构建并生成官网部署包（不在服务器执行 Vite）
# 用法：bash deploy/build-package.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
WORK="$(mktemp -d)"
OUT_DIR="$ROOT/交付包"
OUT="$OUT_DIR/website-$STAMP.tar.gz"

echo "[1/4] 构建前端（生产参数）"
(cd "$ROOT/gh-web" && npm run build:prod)

echo "[2/4] 组装部署包"
mkdir -p "$WORK/website/app/gh-server" "$WORK/website/app/gh-web"
cp -a "$ROOT/gh-server/src" "$ROOT/gh-server/package.json" "$ROOT/gh-server/package-lock.json" "$ROOT/gh-server/tsconfig.json" "$WORK/website/app/gh-server/"
cp -a "$ROOT/gh-web/dist" "$WORK/website/app/gh-web/"
cp -a "$ROOT/deploy" "$WORK/website/deploy"
cp "$ROOT/deploy/.env.example" "$WORK/website/.env.example"

echo "[3/4] 打包"
mkdir -p "$OUT_DIR"
tar -czf "$OUT" -C "$WORK" website
rm -rf "$WORK"

echo "[4/4] 完成：$OUT"
sha256sum "$OUT"
