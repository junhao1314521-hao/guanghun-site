/**
 * 法律与合规页内容（AC-20③）。
 * 注意：下列正文为**占位示例文本**（由开发按常见结构撰写，非法律意见），
 * 正式条款须经法务审核后替换；备案号与主体信息为格式占位，待取得正式备案后填写。
 */

export type LegalSection = { heading: string; body: string }

export type LegalDoc = {
  /** 集合记录标识（稳定不变，取与 slug 相同值） */
  id: string
  slug: string
  title: string
  eyebrow: string
  updated: string
  intro: string
  sections: LegalSection[]
}

export const LEGAL_DOCS: LegalDoc[] = [
  {
    id: 'privacy',
    slug: 'privacy',
    title: '隐私政策',
    eyebrow: 'LEGAL / PRIVACY',
    updated: '2026-10-11',
    intro: '本页说明光魂在提供网站与账号服务时，如何收集、使用、存储与保护你的个人信息，以及你可以行使的权利。',
    sections: [
      {
        heading: '我们收集哪些信息',
        body: '当你浏览官网、注册账号、绑定设备或提交咨询时，我们可能收集：账号信息（昵称、手机号或邮箱）、设备与日志信息（型号、系统版本、访问时间与 IP 地址），以及你主动提交的表单内容（咨询、售后与商务合作信息）。',
      },
      {
        heading: '信息如何使用',
        body: '我们仅在本政策所述目的范围内使用上述信息，包括：提供并维护账号与保修服务、完成售后与咨询响应、保障账号与服务安全、改进产品与页面体验，以及履行法律法规要求的义务。',
      },
      {
        heading: '共享与委托处理',
        body: '我们不会出售你的个人信息。仅在为完成上述目的所必需时，向经评估并签署保密与数据处理协议的物流、支付与云服务供应商委托处理或共享必要信息，并要求其遵守同等的个人信息保护标准。',
      },
      {
        heading: '你的权利',
        body: '你可以通过账号设置或联系客服，查询、更正、删除你的个人信息，撤回已作出的授权同意，或申请注销账号。我们将在核验你的身份后于 15 个工作日内予以响应。',
      },
      {
        heading: '安全与保留期限',
        body: '我们采用传输加密、访问最小化与操作审计等措施保护你的信息，并在实现收集目的所需的最短期限内保留；超出保留期限后，我们将对相关信息予以删除或匿名化处理。',
      },
    ],
  },
  {
    id: 'terms',
    slug: 'terms',
    title: '服务条款',
    eyebrow: 'LEGAL / TERMS',
    updated: '2026-10-11',
    intro: '本页约定光魂网站与账号服务的使用规则、你的权利与义务，以及责任范围与争议处理方式。',
    sections: [
      {
        heading: '服务说明',
        body: '光魂官网提供产品展示、资料下载、保修查询与账号服务。我们可能根据业务需要调整、升级或中止部分服务，并会在页面显著位置提前告知。',
      },
      {
        heading: '账号与安全',
        body: '你需提供真实、准确的信息注册账号，并妥善保管账号与密码。因你未妥善保管账号信息导致的损失由你自行承担；如发现账号被异常使用，请立即与我们联系。',
      },
      {
        heading: '用户行为规范',
        body: '你不得利用本服务从事违法活动，包括但不限于发布违法信息、侵犯他人合法权益、干扰服务正常运行，或进行未经授权的数据抓取。对违规行为，我们有权限制相关功能或终止服务。',
      },
      {
        heading: '知识产权',
        body: '站内文字、图片、商标、界面与数据等内容的权利，归光魂或相应权利人所有。未经书面许可，任何主体不得复制、转载或将上述内容用于商业用途。',
      },
      {
        heading: '责任限制与争议处理',
        body: '在法律允许的范围内，我们对因不可抗力或非我方原因造成的服务中断不承担责任。因本条款产生的争议，双方应友好协商解决；协商不成的，提交光魂住所地有管辖权的人民法院处理。',
      },
    ],
  },
  {
    id: 'cookies',
    slug: 'cookies',
    title: 'Cookie 声明',
    eyebrow: 'LEGAL / COOKIES',
    updated: '2026-10-14',
    intro: '本页说明光魂网站在何种情况下使用 Cookie 及类似技术、其用途为何，以及你如何进行管理。',
    sections: [
      {
        heading: '我们使用哪些 Cookie',
        body: '本网站仅使用必要的会话 Cookie：用于维持后台管理端与账号的登录状态（分别名为 gh_admin 与 gh_user）。除登录所必需外，我们不设置统计、广告或第三方营销 Cookie。',
      },
      {
        heading: '这些 Cookie 的作用与属性',
        body: '会话 Cookie 中仅存放一个随机生成的会话标识，对应的登录数据保存在服务端。Cookie 采用 httpOnly（页面脚本无法读取）、SameSite=Lax（防范跨站请求伪造）；在生产环境经 HTTPS 传输时附加 Secure 属性。',
      },
      {
        heading: '不属于 Cookie 的本地存储',
        body: '主题（明 / 暗）、界面语言、新手引导与后台界面偏好等，保存在浏览器的本地存储（localStorage）中，不作为 Cookie 发送，也不用于识别个人身份。',
      },
      {
        heading: '访问统计说明',
        body: '我们通过自建的页面与下载埋点统计访问情况，该统计不依赖 Cookie，仅记录页面、来源与时间等汇总信息，不用于识别具体个人。',
      },
      {
        heading: '如何管理',
        body: '你可以通过浏览器设置随时删除或阻止 Cookie。请注意：由于本网站仅使用登录所必需的会话 Cookie，一旦阻止，将无法保持登录状态，账号与后台相关功能将不可用。',
      },
    ],
  },
  {
    id: 'records',
    slug: 'records',
    title: '备案信息',
    eyebrow: 'LEGAL / RECORDS',
    updated: '2026-10-11',
    intro: '本页公示本站的备案与主体信息，便于核验与联系。以下信息以正式备案后公示为准。',
    sections: [
      { heading: 'ICP 备案号', body: '待正式备案后公示' },
      { heading: '网站主办单位', body: '光魂科技（深圳）有限公司' },
      { heading: '公安网备案号', body: '待正式备案后公示' },
      { heading: '联系方式', body: '备案核验联系邮箱 support@guanghun.example；电话 400-000-0000（工作日 9:00–18:00）。' },
    ],
  },
]

export function findLegalDoc(slug?: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((doc) => doc.slug === slug)
}