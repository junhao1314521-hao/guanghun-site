# 光魂官网 · 一体化镜像
# ============================================================
# 构建前端（同源部署：VITE_API_BASE 置空 → 请求走相对路径 /api），
# 再由 Express 同源托管前端产物 + 提供 API，最终只暴露一个端口。
#
# 本地验证：
#   docker build -t guanghun-site .
#   docker run -p 3000:3000 guanghun-site
#   open http://localhost:3000/
FROM node:22-slim

WORKDIR /app

# 1) 前端依赖 + 构建
COPY gh-web/package.json gh-web/package-lock.json ./gh-web/
RUN npm --prefix gh-web ci
COPY gh-web ./gh-web
# 后台「免登录」在构建期内联，默认关闭（生产安全：进 /admin 必须登录）。
# 仅用于内部/短期演示时可传 --build-arg VITE_ADMIN_AUTO_LOGIN=on 重新打开。
ARG VITE_ADMIN_AUTO_LOGIN=off
RUN VITE_API_BASE= VITE_ADMIN_AUTO_LOGIN=$VITE_ADMIN_AUTO_LOGIN npm --prefix gh-web run build

# 2) 后端依赖
COPY gh-server/package.json gh-server/package-lock.json ./gh-server/
RUN npm --prefix gh-server ci
COPY gh-server ./gh-server

ENV NODE_ENV=production
ENV PORT=3000
ENV STATIC_DIR=/app/gh-web/dist
EXPOSE 3000

# SQLite 与上传目录：无持久盘的平台上重启会重置，首次访问自动用种子重建
RUN mkdir -p /app/gh-server/data

CMD ["sh", "-c", "cd gh-server && npx tsx src/index.ts"]
