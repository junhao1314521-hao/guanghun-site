/** mammoth（.docx / .docm / .dotx → HTML）未自带类型声明，此处给出最小可用声明。 */
declare module 'mammoth' {
  export type MammothMessage = { type: string; message: string }
  export function convertToHtml(input: { buffer: Buffer }): Promise<{ value: string; messages: MammothMessage[] }>
  const mammoth: { convertToHtml: typeof convertToHtml }
  export default mammoth
}
