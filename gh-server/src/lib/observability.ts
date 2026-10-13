import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'node:crypto'
import { logger } from './logger'

/**
 * 请求可观测性：
 * - 为每个请求分配 / 透传 `X-Request-Id`（便于跨服务排查）；
 * - 请求结束（finish）时输出一条结构化访问日志（方法 / 路径 / 状态 / 耗时 / IP）。
 */
export function requestLog(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id')
  const id = incoming && incoming.length <= 128 ? incoming : randomUUID()
  res.setHeader('X-Request-Id', id)
  const start = process.hrtime.bigint()

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6
    logger.info('request', {
      requestId: id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(ms * 100) / 100,
      ip: req.ip,
    })
  })

  next()
}