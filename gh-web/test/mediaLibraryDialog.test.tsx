/**
 * 素材库选择弹窗（MediaLibraryDialog）交互测试。
 * 覆盖：文件夹/搜索框/类型筛选渲染、单选、多选回传、上传按钮、拖拽上传。
 * 上传链路 mock 掉 uploadImage，只验证弹窗是否正确触发上传与回传。
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../src/components/admin/ToastProvider'

const mocks = vi.hoisted(() => {
  const items = [
    {
      id: 'a.png',
      name: 'a.png',
      url: '/uploads/a.png',
      size: 100,
      type: 'image/png',
      uploadedAt: '2026-01-01T00:00:00.000Z',
      folderId: null,
      category: 'image',
      variants: [],
    },
    {
      id: 'b.jpg',
      name: 'b.jpg',
      url: '/uploads/b.jpg',
      size: 200,
      type: 'image/jpeg',
      uploadedAt: '2026-01-02T00:00:00.000Z',
      folderId: null,
      category: 'image',
      variants: [],
    },
  ]
  return {
    items,
    listFolders: vi.fn(async () => ({
      items: [{ id: 'f1', name: '文件夹A', parentId: null, sort: 0, createdAt: '', fileCount: 2 }],
      total: 1,
      uncategorized: 2,
    })),
    queryMedia: vi.fn(async () => ({ items, total: items.length })),
    uploadImage: vi.fn(async () => ({
      id: 'new.png',
      name: 'new.png',
      url: '/uploads/new.png',
      size: 12,
      type: 'image/png',
      uploadedAt: '',
      folderId: null,
      category: 'image',
      variants: [],
    })),
  }
})

vi.mock('../src/api/adminUploads', () => ({
  listFolders: mocks.listFolders,
  queryMedia: mocks.queryMedia,
}))
vi.mock('../src/lib/uploadImage', () => ({ uploadImage: mocks.uploadImage }))
vi.mock('../src/components/ui/mediaSrcSet', () => ({
  useSrcSetFor: () => ({ srcSet: '', sizes: '' }),
}))

import { MediaLibraryDialog } from '../src/components/admin/MediaLibraryDialog'

function renderDialog(overrides: Partial<Parameters<typeof MediaLibraryDialog>[0]> = {}) {
  const props = {
    onClose: vi.fn(),
    onSelect: vi.fn(),
    ...overrides,
  }
  const view = render(
    <ToastProvider>
      <MediaLibraryDialog {...props} />
    </ToastProvider>,
  )
  return { ...view, props }
}

beforeEach(() => {
  mocks.listFolders.mockClear()
  mocks.queryMedia.mockClear()
  mocks.uploadImage.mockClear()
})

describe('素材库选择弹窗', () => {
  it('渲染文件夹、搜索与类型筛选，并能单选回传', async () => {
    const { props } = renderDialog()
    expect(await screen.findByText('文件夹A')).toBeTruthy()
    expect(screen.getByText('未分类')).toBeTruthy()
    expect(screen.getByLabelText('搜索素材名称')).toBeTruthy()
    expect(screen.getByLabelText('类型筛选')).toBeTruthy()

    fireEvent.click(await screen.findByTitle('a.png'))
    expect(props.onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'a.png' }))
  })

  it('多选：勾选两张后一次回传', async () => {
    const onSelectMany = vi.fn()
    renderDialog({ multiple: true, onSelectMany })
    fireEvent.click(await screen.findByTitle('a.png'))
    fireEvent.click(await screen.findByTitle('b.jpg'))
    expect(screen.getByText('已选 2 个')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '添加所选' }))
    expect(onSelectMany).toHaveBeenCalledTimes(1)
    expect(onSelectMany.mock.calls[0][0]).toHaveLength(2)
  })

  it('「上传文件」选择本地文件后调用上传并在单选模式回传', async () => {
    const { props, container } = renderDialog()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    const file = new File(['abc'], 'new.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(mocks.uploadImage).toHaveBeenCalledTimes(1))
    expect(mocks.uploadImage.mock.calls[0][0]).toBe(file)
    await waitFor(() =>
      expect(props.onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'new.png' })),
    )
  })

  it('把本地文件拖进弹窗也会触发上传', async () => {
    renderDialog({ multiple: true, onSelectMany: vi.fn() })
    const dialog = screen.getByRole('dialog')
    const file = new File(['drag'], 'drag.png', { type: 'image/png' })
    fireEvent.drop(dialog, { dataTransfer: { files: [file], types: ['Files'] } })

    await waitFor(() => expect(mocks.uploadImage).toHaveBeenCalledTimes(1))
    expect(mocks.uploadImage.mock.calls[0][0]).toBe(file)
  })
})
