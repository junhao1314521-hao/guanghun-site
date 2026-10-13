import { createApp } from './app'

const PORT = Number(process.env.PORT ?? 8787)

createApp().listen(PORT, () => {
  console.log(`光魂后端已启动：http://localhost:${PORT}`)
  console.log(`健康检查：http://localhost:${PORT}/healthz`)
})