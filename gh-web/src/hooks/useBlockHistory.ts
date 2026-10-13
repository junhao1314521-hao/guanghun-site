/**
 * 装修器 · 区块文档历史（撤销 / 重做 / 历史版本）。
 * ============================================================
 * 维护「草稿区块树」的历史栈，覆盖区块增删 / 排序 / 复制 / 启停 / 字段编辑 / 样式编辑：
 * - 所有变更经 `apply(fn, group)`：`fn` 为纯不可变变换，`group` 相同的连续编辑会**合并为一步**
 *   （用于字段连续输入，避免每敲一个字都进历史栈）；
 * - 撤销 / 重做在 blocks 与 history 之间搬运快照，栈上限 `HISTORY_LIMIT`（超出丢弃最旧）；
 * - 所有更新均为「单一状态对象的纯 reducer 式」更新，无副作用，严格模式安全。
 *
 * 只负责区块树本身；选中态 / 未保存标记由调用方（装修器）另行维护。
 */
import { useCallback, useState } from 'react'
import type { Block } from '../data/contentTypes'

/** 历史栈上限（最多可撤销 30 步） */
export const HISTORY_LIMIT = 30

/** 历史快照：某一步之前的区块树 + 记录时间（供「历史版本」下拉展示） */
export type BlockSnapshot = { blocks: Block[]; at: number }

type HistoryState = {
  blocks: Block[]
  past: BlockSnapshot[]
  future: BlockSnapshot[]
  /** 上一步合并组键（用于字段连续输入合并为一步） */
  lastGroup: string | null
}

export type BlockHistory = {
  /** 当前区块树 */
  blocks: Block[]
  /** 应用一次变更并入栈；group 相同且连续时合并为一步 */
  apply: (fn: (blocks: Block[]) => Block[], group?: string) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  /** 可撤销步数（历史栈长度） */
  undoCount: number
  /** 历史快照（旧 → 新），供「历史版本」下拉展示与恢复 */
  snapshots: BlockSnapshot[]
  /** 恢复到某个历史快照（作为一步入栈，可再撤销） */
  restore: (blocks: Block[]) => void
  /** 重置文档（载入 / 保存后调用）；clearHistory=true 时清空历史栈 */
  reset: (blocks: Block[], clearHistory?: boolean) => void
}

const snap = (blocks: Block[]): BlockSnapshot => ({ blocks, at: Date.now() })

const trim = (list: BlockSnapshot[]): BlockSnapshot[] =>
  list.length > HISTORY_LIMIT ? list.slice(list.length - HISTORY_LIMIT) : list

export function useBlockHistory(initial: Block[]): BlockHistory {
  const [state, setState] = useState<HistoryState>({ blocks: initial, past: [], future: [], lastGroup: null })

  const apply = useCallback((fn: (blocks: Block[]) => Block[], group?: string) => {
    setState((prev) => {
      const next = fn(prev.blocks)
      if (next === prev.blocks) return prev
      const coalesce = group !== undefined && group === prev.lastGroup
      return {
        blocks: next,
        past: coalesce ? prev.past : trim([...prev.past, snap(prev.blocks)]),
        future: coalesce ? prev.future : [],
        lastGroup: group ?? null,
      }
    })
  }, [])

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.past.length === 0) return prev
      const target = prev.past[prev.past.length - 1]
      return {
        blocks: target.blocks,
        past: prev.past.slice(0, -1),
        future: trim([snap(prev.blocks), ...prev.future]),
        lastGroup: null,
      }
    })
  }, [])

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.future.length === 0) return prev
      const target = prev.future[0]
      return {
        blocks: target.blocks,
        past: trim([...prev.past, snap(prev.blocks)]),
        future: prev.future.slice(1),
        lastGroup: null,
      }
    })
  }, [])

  const restore = useCallback((blocks: Block[]) => {
    setState((prev) => {
      if (blocks === prev.blocks) return prev
      return { blocks, past: trim([...prev.past, snap(prev.blocks)]), future: [], lastGroup: null }
    })
  }, [])

  const reset = useCallback((blocks: Block[], clearHistory = false) => {
    setState((prev) =>
      clearHistory
        ? { blocks, past: [], future: [], lastGroup: null }
        : { blocks, past: prev.past, future: prev.future, lastGroup: null },
    )
  }, [])

  return {
    blocks: state.blocks,
    apply,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    undoCount: state.past.length,
    snapshots: state.past,
    restore,
    reset,
  }
}
