import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 0.0.0.0：容器 / 隧道 / 沙箱预览需要从外部访问；端口固定便于预览地址稳定
    host: true,
    port: 5180,
    strictPort: false,
    proxy: {
      // 同源代理：前端以相对路径 /api/... 请求，dev server 转发到后端 gh-server
      '/api': { target: 'http://localhost:8787', changeOrigin: false },
      // 素材库公开文件：/uploads/<文件名>（后端静态目录）同样需转发，否则缩略图在开发环境 404
      '/uploads': { target: 'http://localhost:8787', changeOrigin: false },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // 框架单独成块：发版时 hash 稳定，利于浏览器长期缓存（业务代码变动不失效）
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
            return 'vendor'
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.test.{ts,tsx}'],
  },
})
