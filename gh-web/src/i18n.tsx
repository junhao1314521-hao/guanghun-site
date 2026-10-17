import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LANG_LABELS } from './data/site'
import { setActiveLocale } from './lib/locale'

/**
 * 站点语言代码（与 data/site.ts 的 LANG_LABELS 一一对应）。
 * 语言名称本身使用其母语写法（中文 / 繁體中文 / English），故不参与翻译。
 */
export type LangCode = 'zh-CN' | 'zh-HK' | 'en'

/** 默认语言，也是所有文案的回退语言 */
export const DEFAULT_LANG: LangCode = 'zh-CN'

/**
 * 已有完整译文、可直接切换的语言。
 * - zh-CN：默认语言（全部文案的单一真源）；
 * - en：站点外壳文案齐备，页面正文 / 集合由后端 `?locale=en` 提供英文变体（缺变体回退中文）。
 * 其余语言（如 zh-HK）尚无内容，切换时给出明确提示而非用中文冒充（AC-15③）。
 */
export const READY_LANGS: LangCode[] = ['zh-CN', 'en']

/** 语言持久化键：刷新 / 重进后沿用上次选择 */
const LANG_STORAGE_KEY = 'gh-lang'

/**
 * 站点外壳（chrome）文案单一真源：无障碍标签、占位符、通用提示、页脚固定文案。
 *
 * 范围说明：本表只覆盖「组件内硬编码的站点外壳文案」。
 * 页面业务内容（导航/页脚栏目、各页面正文）属「站点级配置 + 内容阶段」，
 * 由后端内容接口 / CMS 提供（双语经 `?locale=en` 切换），不在此重复维护。
 */
const MESSAGES: Record<LangCode, Record<string, string>> = {
  'zh-CN': {
    'brand.name': '光魂',
    'brand.wordmark': 'SVDC',

    // —— 顶栏 ——
    'a11y.mainNav': '主导航',
    'a11y.search': '搜索',
    'a11y.searchSite': '全站搜索',
    'a11y.themeDark': '切换到暗色主题',
    'a11y.themeLight': '切换到浅色主题',
    'a11y.langToggle': '切换语言，当前：{lang}',
    'a11y.langMenu': '选择语言',
    'a11y.support': '客服',
    'a11y.shop': '店铺',
    'a11y.account': '账号',
    'a11y.openDrawer': '打开导航菜单',
    'search.placeholder': '搜索型号 / 文章',

    // —— 移动端抽屉 ——
    'a11y.drawerNav': '站点导航',
    'a11y.drawerMobileNav': '移动端导航',
    'a11y.closeDrawer': '关闭导航菜单',
    'drawer.langHeading': '语言',
    'drawer.shopHeading': '店铺',

    // —— 页脚 ——
    'footer.slogan': '以实测数据定义电竞装备性能。参数公开、方法公开、来源可查。',
    'footer.hotline': '400-000-0000（客服热线）',
    'footer.addr': '广东省深圳市 · 光魂',
    'footer.follow': '关注我们',
    'footer.wechat': '微信公众号',
    'footer.miniapp': '官方小程序',
    'footer.qrAria': '{label}二维码',
    'footer.qrNote': '示意二维码，上线前替换为官方码',
    'footer.terms': '用户协议',
    'footer.privacy': '用户隐私',
    'footer.copyright': '© 2026 保留所有权利',

    // —— 右下角悬浮按钮组 ——
    'fab.top': '返回顶部',
    'fab.message': '在线留言',
    'fab.contact': '联系客服',
    'fab.panelTitle': '联系我们',
    'fab.panelSub': '工作日 9:00–18:00',
    'fab.online': '在线',
    'fab.wechat': '微信公众号',
    'fab.wechatHint': '扫码关注 / 售后咨询',
    'fab.hotline': '客服热线',
    'fab.hotlineValue': '400-000-0000',

    // —— 通用 ——
    'common.loading': '加载中…',
    'a11y.skipToMain': '跳到主要内容',
    'error.title': '页面加载出错',
    'error.desc': '该页面渲染时发生异常，可重试或返回首页。',
    'error.retry': '重试',
    'a11y.closeLangNotice': '关闭语言提示',
    'lang.notice': '「{lang}」版本内容尚在建设中，页面暂以简体中文展示。',
    'articles.title': '「文章」板块建设中',
    'articles.desc': '评测、教程与技术解析将陆续上线，敬请期待。',
    'notFound.title': '页面未找到',
    'notFound.desc': '你访问的页面不存在或已被移动，请从导航重新进入。',
    'notFound.back': '返回首页',

    // —— 区块默认按钮（区块未配置自定义 CTA 时使用）——
    'blocks.allFaq': '全部问答',
    'blocks.downloadCenter': '进入下载中心',
    'blocks.fullRankings': '查看完整榜单',

    // —— 产品详情区块（productHero / productSpecs）——
    'blocks.pd.refPrice': '参考价',
    'blocks.pd.view': '视图 {n}',
    'blocks.pd.missingNote': '缺失与零值含义不同：「未测量」表示尚未完成该测试，不代表零值表现。',
    'blocks.pd.keyMetrics': '关键指标',
    'blocks.pd.summaryTitle': '性能摘要（标称 / 实测）',
    'blocks.pd.specCount': '{n} 项',
    'blocks.pd.colParam': '参数',
    'blocks.pd.colNominal': '标称值',
    'blocks.pd.colMeasured': '实测值',
    'blocks.pd.colNote': '备注',
    'blocks.pd.tabEmptyTitle': '{tab} 暂无内容',
    'blocks.pd.tabEmptyDesc': '{tab}将在上线后随测试与内容排期补充；如需相关数据，可提交咨询由咨询师提供。',
    'blocks.pd.guideDownloads': '下载资料',
    'blocks.pd.guideDownloadsDesc': '驱动、说明书与固件均在此获取，标注适用型号与版本。',
    'blocks.pd.guideHelp': '需要帮助？',
    'blocks.pd.guideHelpDesc': '对参数或适配有疑问，可提交咨询，由咨询师跟进。',
    'blocks.pd.goDownload': '前往下载中心',
    'blocks.pd.submitTicket': '提交咨询',
    'blocks.pd.specTitle': '参数规格',
    'blocks.pd.highlights': '产品亮点',
    'blocks.pd.attributes': '结构化参数',
    'blocks.pd.os': '兼容系统',
    'blocks.pd.weight': '整机重量',
    'blocks.pd.warranty': '保修政策',
    'blocks.pd.inBox': '包装清单',
    'blocks.pd.defaultPrimary': '加入对比',
    'blocks.pd.defaultSecondary': '咨询咨询师',
    'blocks.pd.defaultBuyTitle': '准备入手？',
    'blocks.pd.point1': '全国联保 · 以官方保修政策为准',
    'blocks.pd.point2': '7 天无理由退换（不影响二次销售）',
    'blocks.pd.point3': '参数公开、方法公开，结论可复现',
    // 产品详情四套布局（productDetailLayout）
    'blocks.pd.overview': '概览',
    'blocks.pd.testRecords': '测试记录',
    'blocks.pd.compatTitle': '兼容与保修',
    'blocks.pd.supportTitle': '下载与支持',
    'blocks.pd.richTitle': '图文详情',
    'blocks.pd.buyTitle': '购买咨询',
    'blocks.pd.tocLabel': '本页目录',
    'blocks.pd.readingProgress': '阅读进度',

    // —— 区块外壳：通用 ——
    'blocks.reload': '重新加载',
    'blocks.checkNetwork': '。请检查网络后重试。',
    // —— 产品区块 ——
    'blocks.pg.loadFailed': '产品加载失败',
    'blocks.pg.loading': '产品加载中',
    'blocks.pg.cat': '类别',
    'blocks.pg.conn': '连接',
    'blocks.pg.price': '价格',
    'blocks.pg.more': '更多筛选',
    'blocks.pg.picked': '已选',
    'blocks.pg.clearAll': '清空全部',
    'blocks.pg.sort': '排序方式',
    'blocks.pg.emptyFiltered': '没有符合当前筛选条件的产品，试试调整筛选。',
    'blocks.pg.empty': '暂无可展示的产品。',
    'blocks.pg.addCompare': '加入对比',
    'blocks.pg.inCompare': '对比中',
    'blocks.pg.detail': '查看详情',
    'blocks.pg.prev': '上一页',
    'blocks.pg.next': '下一页',
    'blocks.pg.compareCount': '已选 {n} / {max} 款',
    'blocks.pg.incompatible': '不可直接比较',
    'blocks.pg.incompatibleDesc': '所选产品属不同类别，请仅保留同一类别的产品。',
    'blocks.pg.pickMore': '再选 1 款即可开始对比。',
    'blocks.pg.atLimit': '已达对比上限 {max} 款，如需替换请先移除已选产品。',
    'blocks.pg.clearSel': '清空',
    'blocks.pg.startCompare': '开始对比',
    'blocks.pg.compareLimitToast': '对比最多 {max} 款，请先移除已选产品',
    'blocks.pg.removeAria': '移除 {label}',
    'blocks.pg.addCompareAria': '加入对比 {model}',
    // —— 文章区块 ——
    'blocks.al.loadFailed': '文章加载失败',
    'blocks.al.loading': '文章加载中',
    'blocks.al.catLabel': '分类',
    'blocks.al.count': '共 {n} 篇',
    'blocks.al.reading': '{n} 分钟阅读',
    'blocks.al.emptyFiltered': '没有符合条件的文章',
    'blocks.al.emptyFilteredDesc': '试试切换到其他分类，或查看全部文章。',
    'blocks.al.viewAll': '查看全部',
    'blocks.al.empty': '暂无可展示的文章。',
    // —— 下载区块 ——
    'blocks.dl.loadFailed': '下载资料加载失败',
    'blocks.dl.loading': '下载资料加载中',
    'blocks.dl.colName': '资料名称',
    'blocks.dl.colModels': '适用型号',
    'blocks.dl.colType': '类型',
    'blocks.dl.colVersion': '版本',
    'blocks.dl.colSize': '大小',
    'blocks.dl.colDate': '更新日期',
    'blocks.dl.colAction': '操作',
    'blocks.dl.catLabel': '类别',
    'blocks.dl.typeLabel': '类型',
    'blocks.dl.count': '共 {n} 份',
    'blocks.dl.emptyFiltered': '没有符合条件的资料',
    'blocks.dl.emptyFilteredDesc': '试试调整类别或类型筛选，或查看全部资料。',
    'blocks.dl.viewAll': '查看全部资料',
    'blocks.dl.empty': '暂无可展示的下载资料。',
    'blocks.dl.detail': '查看详情',
    'blocks.dl.download': '下载',
    'blocks.dl.notice': '名称、版本与日期以官方最终公布为准；上传新版后旧版仍可下载。',
    // —— 问答区块 ——
    'blocks.fq.loadFailed': '常见问题加载失败',
    'blocks.fq.loading': '常见问题加载中',
    'blocks.fq.catLabel': '类别',
    'blocks.fq.count': '共 {n} 条',
    'blocks.fq.emptyFiltered': '该类别下暂无问答',
    'blocks.fq.emptyFilteredDesc': '试试切换其他类别，或提交咨询由咨询师跟进。',
    'blocks.fq.viewAll': '查看全部问答',
    'blocks.fq.submit': '提交咨询',
    'blocks.fq.empty': '暂无可展示的问答。',
    'blocks.fq.detail': '查看详情',
    // —— 榜单区块 ——
    'blocks.rk.scope': '范围',
    'blocks.rk.rank': '#',
    'blocks.rk.model': '型号',
    'blocks.rk.group': '归类',
    'blocks.rk.score': '{label}得分',
    'blocks.rk.value': '数值',
    'blocks.rk.untested': '未测试',
    'blocks.rk.tie': '并列',
    'blocks.rk.loadFailed': '榜单加载失败',
    'blocks.rk.loading': '榜单加载中',
    'blocks.rk.tested': '已测试',
    'blocks.rk.pending': '未测试',
    'blocks.rk.items': '款',
    'blocks.rk.testedAt': '测试日期 {date}',
    'blocks.rk.sample': '样本 {n}',
    'blocks.rk.updatedAt': '更新于 {date}',
    'blocks.rk.leader': '榜首',
    // —— 联系/咨询表单 ——
    'blocks.ct.errName': '请填写称呼',
    'blocks.ct.errContact': '请填写联系方式',
    'blocks.ct.errModel': '请填写产品型号',
    'blocks.ct.errMessage': '请描述你遇到的问题',
    'blocks.ct.submitFailed': '提交失败，请稍后重试',
    'blocks.ct.name': '称呼',
    'blocks.ct.namePh': '怎么称呼你',
    'blocks.ct.contact': '联系方式',
    'blocks.ct.contactPh': '手机号或邮箱',
    'blocks.ct.model': '产品型号',
    'blocks.ct.modelPh': '例如 54027X1QE-W54',
    'blocks.ct.topic': '咨询主题',
    'blocks.ct.message': '问题描述',
    'blocks.ct.messagePh': '请描述遇到的现象、发生条件与已尝试的操作',
    'blocks.ct.privacyHint': '请勿填写与本次咨询无关的个人信息。',
    'blocks.ct.submitting': '提交中…',
    'blocks.ct.submit': '提交咨询',
    'blocks.ct.reset': '重置',
    'blocks.ct.successPrefix': '咨询已提交，工单号',
    'blocks.ct.receivedAt': '接收时间：',
    'blocks.ct.toAccount': '去个人中心查看',
    'blocks.ct.again': '再提交一单',
    'blocks.ct.failedPrefix': '提交失败：',
    'blocks.ct.failedSuffix': '。已填内容仍保留，可稍后重试。',
    'blocks.ct.privacyPrefix': '提交即表示同意我们按',
    'blocks.ct.privacyLink': '隐私政策',
    'blocks.ct.privacySuffix': '处理你的联系方式，仅用于回复本次咨询。',
    'blocks.ct.businessApply': '提交合作申请',
    'blocks.ct.faq': '常见问题',

    // —— 新手指引 ——
    'tour.label': '新手指引',
    'tour.title': '快速上手',
    'tour.progress': '第 {current} / {total} 步',
    'tour.step1.title': '顶部导航与搜索',
    'tour.step1.desc': '用顶部导航在产品、天梯榜与支持之间切换；点右侧放大镜可直接全站搜索型号或文章。',
    'tour.step2.title': '场景与重点产品可横向滑动',
    'tour.step2.desc': '首页的「按场景选择」「重点产品」支持左右滑动，鼠标靠近左右边缘会自动推进，也可拖拽。',
    'tour.step3.title': '产品与天梯榜入口',
    'tour.step3.desc': '想对比参数去「产品」，想看实测排名去「天梯榜」——数值、方法与会话来源全部公开。',
    'tour.step4.title': '客服与账号',
    'tour.step4.desc': '遇到问题点客服提交咨询；右上角账号可查看工单进度、绑定设备与收藏内容。',
    'tour.prev': '上一步',
    'tour.next': '下一步',
    'tour.skip': '跳过',
    'tour.never': '不再显示',
    'tour.done': '完成',
    'tour.reopen': '新手指引',
  },
  en: {
    'brand.name': 'Guanghun',
    'brand.wordmark': 'SVDC',

    // —— Header ——
    'a11y.mainNav': 'Main navigation',
    'a11y.search': 'Search',
    'a11y.searchSite': 'Site search',
    'a11y.themeDark': 'Switch to dark theme',
    'a11y.themeLight': 'Switch to light theme',
    'a11y.langToggle': 'Switch language, current: {lang}',
    'a11y.langMenu': 'Select language',
    'a11y.support': 'Support',
    'a11y.shop': 'Shop',
    'a11y.account': 'Account',
    'a11y.openDrawer': 'Open navigation menu',
    'search.placeholder': 'Search models / articles',

    // —— Mobile drawer ——
    'a11y.drawerNav': 'Site navigation',
    'a11y.drawerMobileNav': 'Mobile navigation',
    'a11y.closeDrawer': 'Close navigation menu',
    'drawer.langHeading': 'Language',
    'drawer.shopHeading': 'Shop',

    // —— Footer ——
    'footer.slogan': 'Defining esports gear performance with measured data. Open specs, open methods, traceable sources.',
    'footer.hotline': '400-000-0000 (support hotline)',
    'footer.addr': 'Shenzhen, Guangdong · Guanghun',
    'footer.follow': 'Follow us',
    'footer.wechat': 'WeChat official account',
    'footer.miniapp': 'Official mini program',
    'footer.qrAria': '{label} QR code',
    'footer.qrNote': 'Placeholder QR — replace with the official code',
    'footer.terms': 'Terms',
    'footer.privacy': 'Privacy',
    'footer.copyright': '© 2026 All rights reserved.',

    // —— Floating action buttons (bottom-right) ——
    'fab.top': 'Back to top',
    'fab.message': 'Leave a message',
    'fab.contact': 'Contact support',
    'fab.panelTitle': 'Contact us',
    'fab.panelSub': 'Weekdays 9:00–18:00',
    'fab.online': 'Online',
    'fab.wechat': 'WeChat official account',
    'fab.wechatHint': 'Scan to follow / after-sales',
    'fab.hotline': 'Support hotline',
    'fab.hotlineValue': '400-000-0000',

    // —— Common ——
    'common.loading': 'Loading…',
    'a11y.skipToMain': 'Skip to main content',
    'error.title': 'Failed to load page',
    'error.desc': 'Something went wrong while rendering this page. Retry or go back home.',
    'error.retry': 'Retry',
    'a11y.closeLangNotice': 'Dismiss language notice',
    'lang.notice': 'The “{lang}” version is still under construction; this page is shown in Simplified Chinese for now.',
    'articles.title': 'The “Articles” section is under construction',
    'articles.desc': 'Reviews, guides and industry notes are coming soon.',
    'notFound.title': 'Page not found',
    'notFound.desc': 'The page you are looking for does not exist or has moved. Please use the navigation.',
    'notFound.back': 'Back to home',

    // —— Block default CTAs (used when a block has no custom CTA) ——
    'blocks.allFaq': 'View all FAQ',
    'blocks.downloadCenter': 'Open download center',
    'blocks.fullRankings': 'View full rankings',

    // —— Product detail blocks (productHero / productSpecs) ——
    'blocks.pd.refPrice': 'Reference price',
    'blocks.pd.view': 'View {n}',
    'blocks.pd.missingNote': 'Missing and zero are different: “Not measured” means the test is not finished yet — not a zero result.',
    'blocks.pd.keyMetrics': 'Key metrics',
    'blocks.pd.summaryTitle': 'Performance summary (nominal / measured)',
    'blocks.pd.specCount': '{n} items',
    'blocks.pd.colParam': 'Metric',
    'blocks.pd.colNominal': 'Nominal',
    'blocks.pd.colMeasured': 'Measured',
    'blocks.pd.colNote': 'Note',
    'blocks.pd.tabEmptyTitle': '{tab} — no content yet',
    'blocks.pd.tabEmptyDesc': '{tab} will be added as testing and content are scheduled. Need the data now? Submit a ticket and we will help.',
    'blocks.pd.guideDownloads': 'Downloads',
    'blocks.pd.guideDownloadsDesc': 'Drivers, manuals and firmware — each labelled with supported models and version.',
    'blocks.pd.guideHelp': 'Need help?',
    'blocks.pd.guideHelpDesc': 'Questions about specs or compatibility? Submit a ticket and we will follow up.',
    'blocks.pd.goDownload': 'Go to downloads',
    'blocks.pd.submitTicket': 'Submit a ticket',
    'blocks.pd.specTitle': 'Specifications',
    'blocks.pd.highlights': 'Highlights',
    'blocks.pd.attributes': 'Key specs',
    'blocks.pd.os': 'Compatible systems',
    'blocks.pd.weight': 'Weight',
    'blocks.pd.warranty': 'Warranty',
    'blocks.pd.inBox': 'In the box',
    'blocks.pd.defaultPrimary': 'Add to compare',
    'blocks.pd.defaultSecondary': 'Talk to a specialist',
    'blocks.pd.defaultBuyTitle': 'Ready to buy?',
    'blocks.pd.point1': 'Nationwide warranty per official policy',
    'blocks.pd.point2': '7-day returns (unused, original packaging)',
    'blocks.pd.point3': 'Public params and methods; reproducible results',
    // Product detail layout variants (productDetailLayout)
    'blocks.pd.overview': 'Overview',
    'blocks.pd.testRecords': 'Test records',
    'blocks.pd.compatTitle': 'Compatibility & warranty',
    'blocks.pd.supportTitle': 'Downloads & support',
    'blocks.pd.richTitle': 'Details',
    'blocks.pd.buyTitle': 'Buying & advice',
    'blocks.pd.tocLabel': 'On this page',
    'blocks.pd.readingProgress': 'Reading progress',

    // —— Block chrome: common ——
    'blocks.reload': 'Reload',
    'blocks.checkNetwork': '. Please check your network and try again.',
    // —— Products block ——
    'blocks.pg.loadFailed': 'Failed to load products',
    'blocks.pg.loading': 'Loading products',
    'blocks.pg.cat': 'Category',
    'blocks.pg.conn': 'Connection',
    'blocks.pg.price': 'Price',
    'blocks.pg.more': 'More filters',
    'blocks.pg.picked': 'Selected',
    'blocks.pg.clearAll': 'Clear all',
    'blocks.pg.sort': 'Sort by',
    'blocks.pg.emptyFiltered': 'No products match the current filters. Try adjusting them.',
    'blocks.pg.empty': 'No products to show yet.',
    'blocks.pg.addCompare': 'Add to compare',
    'blocks.pg.inCompare': 'Comparing',
    'blocks.pg.detail': 'View details',
    'blocks.pg.prev': 'Previous page',
    'blocks.pg.next': 'Next page',
    'blocks.pg.compareCount': 'Selected {n} / {max}',
    'blocks.pg.incompatible': 'Not directly comparable',
    'blocks.pg.incompatibleDesc': 'The selected products are of different categories. Keep only one category.',
    'blocks.pg.pickMore': 'Pick 1 more to start comparing.',
    'blocks.pg.atLimit': 'Reached the compare limit of {max}. Remove a product to replace it.',
    'blocks.pg.clearSel': 'Clear',
    'blocks.pg.startCompare': 'Compare now',
    'blocks.pg.compareLimitToast': 'Up to {max} products can be compared. Remove one first.',
    'blocks.pg.removeAria': 'Remove {label}',
    'blocks.pg.addCompareAria': 'Add {model} to compare',
    // —— Articles block ——
    'blocks.al.loadFailed': 'Failed to load articles',
    'blocks.al.loading': 'Loading articles',
    'blocks.al.catLabel': 'Category',
    'blocks.al.count': '{n} articles',
    'blocks.al.reading': '{n} min read',
    'blocks.al.emptyFiltered': 'No articles match this category',
    'blocks.al.emptyFilteredDesc': 'Try another category, or view all articles.',
    'blocks.al.viewAll': 'View all',
    'blocks.al.empty': 'No articles to show yet.',
    // —— Downloads block ——
    'blocks.dl.loadFailed': 'Failed to load downloads',
    'blocks.dl.loading': 'Loading downloads',
    'blocks.dl.colName': 'File',
    'blocks.dl.colModels': 'Models',
    'blocks.dl.colType': 'Type',
    'blocks.dl.colVersion': 'Version',
    'blocks.dl.colSize': 'Size',
    'blocks.dl.colDate': 'Updated',
    'blocks.dl.colAction': 'Action',
    'blocks.dl.catLabel': 'Category',
    'blocks.dl.typeLabel': 'Type',
    'blocks.dl.count': '{n} files',
    'blocks.dl.emptyFiltered': 'No files match the filters',
    'blocks.dl.emptyFilteredDesc': 'Try adjusting the category or type filter, or view all files.',
    'blocks.dl.viewAll': 'View all files',
    'blocks.dl.empty': 'No downloads to show yet.',
    'blocks.dl.detail': 'View details',
    'blocks.dl.download': 'Download',
    'blocks.dl.notice': 'Names, versions and dates are subject to the official final release; older versions stay downloadable after an update.',
    // —— FAQ block ——
    'blocks.fq.loadFailed': 'Failed to load FAQ',
    'blocks.fq.loading': 'Loading FAQ',
    'blocks.fq.catLabel': 'Category',
    'blocks.fq.count': '{n} items',
    'blocks.fq.emptyFiltered': 'No questions in this category',
    'blocks.fq.emptyFilteredDesc': 'Try another category, or submit a ticket and our team will follow up.',
    'blocks.fq.viewAll': 'View all FAQ',
    'blocks.fq.submit': 'Submit a ticket',
    'blocks.fq.empty': 'No questions to show yet.',
    'blocks.fq.detail': 'View details',
    // —— Rankings block ——
    'blocks.rk.scope': 'Scope',
    'blocks.rk.rank': '#',
    'blocks.rk.model': 'Model',
    'blocks.rk.group': 'Line',
    'blocks.rk.score': '{label} score',
    'blocks.rk.value': 'Value',
    'blocks.rk.untested': 'Not tested',
    'blocks.rk.tie': 'Tie',
    'blocks.rk.loadFailed': 'Failed to load rankings',
    'blocks.rk.loading': 'Loading rankings',
    'blocks.rk.tested': 'Tested',
    'blocks.rk.pending': 'Not tested',
    'blocks.rk.items': '',
    'blocks.rk.testedAt': 'Tested on {date}',
    'blocks.rk.sample': 'Sample {n}',
    'blocks.rk.updatedAt': 'Updated {date}',
    'blocks.rk.leader': 'Leader',
    // —— Contact / inquiry form ——
    'blocks.ct.errName': 'Please enter your name',
    'blocks.ct.errContact': 'Please enter your contact',
    'blocks.ct.errModel': 'Please enter the product model',
    'blocks.ct.errMessage': 'Please describe your issue',
    'blocks.ct.submitFailed': 'Submission failed, please try again later',
    'blocks.ct.name': 'Name',
    'blocks.ct.namePh': 'What should we call you',
    'blocks.ct.contact': 'Contact',
    'blocks.ct.contactPh': 'Phone or email',
    'blocks.ct.model': 'Product model',
    'blocks.ct.modelPh': 'e.g. 54027X1QE-W54',
    'blocks.ct.topic': 'Topic',
    'blocks.ct.message': 'Description',
    'blocks.ct.messagePh': 'Describe what happens, when it happens, and what you have tried',
    'blocks.ct.privacyHint': 'Please do not include personal information unrelated to this inquiry.',
    'blocks.ct.submitting': 'Submitting…',
    'blocks.ct.submit': 'Submit',
    'blocks.ct.reset': 'Reset',
    'blocks.ct.successPrefix': 'Submitted. Ticket ID',
    'blocks.ct.receivedAt': 'Received at:',
    'blocks.ct.toAccount': 'View in account center',
    'blocks.ct.again': 'Submit another',
    'blocks.ct.failedPrefix': 'Submission failed: ',
    'blocks.ct.failedSuffix': '. Your input is kept; please try again later.',
    'blocks.ct.privacyPrefix': 'By submitting you agree that we process your contact per the',
    'blocks.ct.privacyLink': 'Privacy Policy',
    'blocks.ct.privacySuffix': ', solely to reply to this inquiry.',
    'blocks.ct.businessApply': 'Submit partnership request',
    'blocks.ct.faq': 'FAQ',

    // —— Guided tour ——
    'tour.label': 'Getting started',
    'tour.title': 'Quick start',
    'tour.progress': 'Step {current} / {total}',
    'tour.step1.title': 'Top navigation & search',
    'tour.step1.desc': 'Switch between products, rankings and support from the top nav; click the magnifier to search the whole site.',
    'tour.step2.title': 'Scenarios & featured products scroll',
    'tour.step2.desc': 'The home page “Choose by scenario” and “Featured products” rails scroll horizontally — hover near an edge to advance, or drag.',
    'tour.step3.title': 'Products & rankings entry',
    'tour.step3.desc': 'Compare specs under “Products” and see measured rankings under “Rankings” — values, methods and sources are all public.',
    'tour.step4.title': 'Support & account',
    'tour.step4.desc': 'Submit an inquiry via Support; the account menu tracks ticket progress, bound devices and favorites.',
    'tour.prev': 'Previous',
    'tour.next': 'Next',
    'tour.skip': 'Skip',
    'tour.never': 'Do not show again',
    'tour.done': 'Done',
    'tour.reopen': 'Getting started',
  },
  // 待译文到位；t() 会回退到 DEFAULT_LANG，切换入口由 READY_LANGS 控制
  'zh-HK': {},
}

function isLangCode(code: string): code is LangCode {
  // 用「已知语言」校验（而非下拉的「可选列表」）：繁体虽已从下拉下线，
  // 但仍需被识别为合法语言码，才能走到下面的「建设中」提示分支（不拿中文冒充）。
  return Object.prototype.hasOwnProperty.call(LANG_LABELS, code)
}

/** 读取持久化语言；非法 / 未就绪一律回退默认（避免记住一个不可用语言） */
function readStoredLang(): LangCode {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LANG_STORAGE_KEY) : null
    if (raw && isLangCode(raw) && READY_LANGS.includes(raw)) return raw
  } catch {
    // 隐私模式 / 存储不可用：静默回退默认
  }
  return DEFAULT_LANG
}

/** 读取 URL 上的语言入口 `?lang=`（英文可被抓取 / 分享）；非法 / 未就绪返回 null */
function readUrlLang(): LangCode | null {
  try {
    const raw = new URLSearchParams(window.location.search).get('lang')
    if (raw && isLangCode(raw) && READY_LANGS.includes(raw)) return raw
  } catch {
    // 非浏览器环境：忽略
  }
  return null
}

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text
  let out = text
  for (const [key, value] of Object.entries(vars)) out = out.replaceAll(`{${key}}`, String(value))
  return out
}

type I18nValue = {
  /** 当前生效语言 */
  lang: LangCode
  /** 切换语言：译文就绪的语言直接切换，否则保留当前语言并给出提示 */
  setLang: (code: string) => void
  /** 取文案；缺省回退到 DEFAULT_LANG，再缺省返回 key 本身 */
  t: (key: string, vars?: Record<string, string | number>) => string
  /** 「内容建设中」提示，无提示时为 null */
  notice: string | null
  dismissNotice: () => void
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  // 懒初始化：在首次渲染（早于子组件）确定初始语言并同步给接口层，
  // 保证「刷新后仍是英文 / 以 ?lang=en 进入」时首个数据请求就带上 `?locale=en`。
  // 优先级：URL 入口 `?lang=` > 持久化 > 默认。
  const [lang, setLangState] = useState<LangCode>(() => {
    const initial = readUrlLang() ?? readStoredLang()
    setActiveLocale(initial)
    return initial
  })
  const [notice, setNotice] = useState<string | null>(null)

  // 语言变化时同步接口层 locale（含持久化恢复）
  useEffect(() => {
    setActiveLocale(lang)
  }, [lang])

  const t = useCallback<I18nValue['t']>(
    (key, vars) => {
      const table = MESSAGES[lang]
      const text = table[key] ?? MESSAGES[DEFAULT_LANG][key] ?? key
      return interpolate(text, vars)
    },
    [lang],
  )

  const setLang = useCallback<I18nValue['setLang']>((code) => {
    if (!isLangCode(code)) return
    if (READY_LANGS.includes(code)) {
      setLangState(code)
      setNotice(null)
      try {
        localStorage.setItem(LANG_STORAGE_KEY, code)
      } catch {
        // 存储不可用：仅内存生效
      }
      return
    }
    const label = LANG_LABELS[code] ?? code
    setNotice(interpolate(MESSAGES[DEFAULT_LANG]['lang.notice'], { lang: label }))
  }, [])

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t, notice, dismissNotice: () => setNotice(null) }),
    [lang, setLang, t, notice],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n 必须在 <I18nProvider> 内使用')
  return ctx
}

/**
 * 读取当前语言（**不抛错**）：供 useApi 等可能在无 Provider 环境下调用的工具使用，
 * 用于把语言纳入请求依赖，实现「切换语言 → 数据重取」。无 Provider 时返回默认语言。
 */
export function useLocale(): LangCode {
  return useContext(I18nContext)?.lang ?? DEFAULT_LANG
}
