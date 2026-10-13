/**
 * 极简结构化日志：每行一条 JSON，便于被采集（ELK / Loki / CloudWatch 等）直接解析。
 * 测试环境（NODE_ENV=test）静默，避免污染测试输出。
 */
type Level = 'info' | 'warn' | 'error'

function emit(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  if (process.env.NODE_ENV === 'test') return
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...fields })
  if (level === 'error') console.error(line)
  else console.log(line)
}

export const logger = {
  info: (msg: string, fields?: Record<string, unknown>) => emit('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit('error', msg, fields),
}