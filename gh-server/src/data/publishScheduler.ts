/**
 * 定时发布调度器（零外部依赖：node:setInterval）。
 *
 * - 周期：默认 60s 一次 tick（`PUBLISH_SCHEDULE_TICK_MS` 可调；最小 5s，避免误配高频）；
 * - 重启补跑：进程启动时立即跑一次（catch-up），把停机期间已到点的 pending 排程补上；
 * - 可重入：单 tick 进行中跳过下一次（避免长任务重叠 / 重复应用）；
 * - fail-safe：单次 tick 内部异常被吞掉并记日志，**绝不让调度器崩溃**进程；
 * - 不阻塞退出：定时器 `unref()`，进程无其他事件时自然退出。
 *
 * 测试隔离：`NODE_ENV=test` 时不自启动（由测试显式调用 `applyPendingSchedules`）。
 */
import { applyPendingSchedules } from './publishScheduleStore'
import { logger } from '../lib/logger'

const DEFAULT_TICK_MS = 60_000
const MIN_TICK_MS = 5_000

let timer: NodeJS.Timeout | null = null
let inFlight = false

function tick(): void {
  if (inFlight) return
  inFlight = true
  try {
    const applied = applyPendingSchedules()
    if (applied > 0) logger.info('调度器本轮已应用定时发布', { applied })
  } catch (err) {
    logger.error('调度器 tick 异常（已吞掉，不中断）', { error: (err as Error).message })
  } finally {
    inFlight = false
  }
}

/**
 * 启动调度器。重复调用安全：已在运行则不重复启动（除非 tick 间隔变化）。
 * 启动时立即补跑一次（catch-up）。
 */
export function startScheduler(): void {
  if (process.env.NODE_ENV === 'test') return
  if (timer) return
  const raw = Number(process.env.PUBLISH_SCHEDULE_TICK_MS ?? DEFAULT_TICK_MS)
  const interval = Number.isFinite(raw) && raw >= MIN_TICK_MS ? raw : DEFAULT_TICK_MS
  // 启动即补跑：进程重启后把停机期间到点的排程追上
  tick()
  timer = setInterval(tick, interval)
  timer.unref()
  logger.info('定时发布调度器已启动', { intervalMs: interval })
}

/** 停止调度器（主要供测试 / 优雅关闭使用） */
export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
