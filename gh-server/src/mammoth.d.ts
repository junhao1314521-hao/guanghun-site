/** mammoth（.docx / .docm / .dotx → HTML）未自带类型声明，此处给出最小可用声明。 */
declare module 'mammoth' {
  export type MammothMessage = { type: string; message: string }
  /** 把 .docx 缓冲区转换为 HTML，并返回转换过程中的提示信息 */
  export function convertToHtml(input: { buffer: Buffer }): Promise<{ value: string; messages: MammothMessage[] }>
  const mammoth: { convertToHtml: typeof convertToHtml }
  export default mammoth
}
