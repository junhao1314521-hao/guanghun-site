/**
 * FileField 上传预检：超限 / 错误格式必须在调用上传接口前被拦下，并给出明确原因；
 * 合法文件正常上传并回填地址。避免「传完才失败」和「大文件白传一趟」。
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FileField } from '../src/components/admin/FileField'
import { ToastProvider } from '../src/components/admin/ToastProvider'

const uploadImage = vi.fn()
vi.mock('../src/lib/uploadImage', () => ({
  uploadImage: (...args: unknown[]) => uploadImage(...args),
}))

const renderField = (variant: 'image' | 'file' = 'file', onChange = vi.fn()) =>
  render(
    <ToastProvider>
      <FileField value="" onChange={onChange} label="资料文件" variant={variant} />
    </ToastProvider>,
  )

beforeEach(() => {
  uploadImage.mockReset()
})

describe('FileField 上传预检', () => {
  it('51MB 图片在本地被拦下，不上传，并说明类型与上限', async () => {
    renderField()
    const file = new File([new Uint8Array(51 * 1024 * 1024)], 'big.png', { type: '' })
    fireEvent.change(document.querySelector('input[type=file]') as HTMLInputElement, {
      target: { files: [file] },
    })

    expect(uploadImage).not.toHaveBeenCalled()
    const messages = await screen.findAllByText(/图片最大 50\.0MB，当前 51\.0MB/)
    expect(messages.length).toBeGreaterThan(0)
  })

  it('图片字段选择 .js 文件时提示格式不支持且不上传', async () => {
    renderField('image')
    const file = new File(['alert(1)'], 'evil.js', { type: 'text/javascript' })
    fireEvent.change(document.querySelector('input[type=file]') as HTMLInputElement, {
      target: { files: [file] },
    })

    expect(uploadImage).not.toHaveBeenCalled()
    expect((await screen.findAllByText(/仅支持图片文件/)).length).toBeGreaterThan(0)
  })

  it('合法小图正常上传并回填地址', async () => {
    uploadImage.mockResolvedValue({ url: '/uploads/ok.png' })
    const onChange = vi.fn()
    renderField('image', onChange)
    const file = new File(['x'], 'ok.png', { type: 'image/png' })
    fireEvent.change(document.querySelector('input[type=file]') as HTMLInputElement, {
      target: { files: [file] },
    })

    expect(uploadImage).toHaveBeenCalledOnce()
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('/uploads/ok.png'))
  })
})
