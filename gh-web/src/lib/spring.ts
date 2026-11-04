/**
 * 极简弹簧引擎：单标量、阻尼趋近目标，所有指针跟随类特效共用一套 ticker。
 * 迁移自页面稿脚本的 makeSpring / springTo，行为与参数保持一致。
 */
export interface Spring {
  state: { value: number; target: number; vel: number }
  update: () => boolean
}

const jobs: Spring[] = []
let running = false

// 全局动画帧循环：逐个推进弹簧任务，全部收敛后停止
function tick(): void {
  let alive = false
  for (const job of jobs) alive = job.update() || alive
  running = alive
  if (alive) requestAnimationFrame(tick)
}

// 创建弹簧动画任务：按刚度 / 阻尼趋近目标值并回传当前值，返回可 update 的对象
export function makeSpring(
  render: (value: number) => void,
  stiffness: number,
  damping: number,
): Spring {
  const state = { value: 0, target: 0, vel: 0 }
  return {
    state,
    update() {
      const accel = (state.target - state.value) * stiffness
      state.vel = (state.vel + accel) * damping
      state.value += state.vel
      const done = Math.abs(state.target - state.value) < 0.002 && Math.abs(state.vel) < 0.002
      if (done) {
        state.value = state.target
        state.vel = 0
      }
      render(state.value)
      return !done
    },
  }
}

// 设置弹簧目标值，循环未启动时启动 requestAnimationFrame
export function springTo(job: Spring, target: number): void {
  job.state.target = target
  if (!running) {
    running = true
    requestAnimationFrame(tick)
  }
}