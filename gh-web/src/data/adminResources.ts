/**
 * 后台管理系统 · 资源呈现配置（单一真源）
 * ============================================================
 * 一处定义「每个栏目长什么样」：表格列 / 筛选器 / 新建-编辑表单 / 能力开关。
 * 通用页面组件（AdminResourceListPage / AdminResourceFormPage）据此渲染，
 * 避免 40+ 后台页重复样板。后端只负责按 `key` 提供数据。
 *
 * 新增栏目：在此登记 → 侧边栏 / 路由 / 列表 / 表单自动生效。
 */

export type AdminColumnType =
  | 'text'
  | 'strong'
  | 'mono'
  | 'tag'
  | 'status'
  | 'number'
  | 'date'
  | 'bool'
  /** 字符串数组：以顿号连接展示（如 specs / models / points） */
  | 'list'
  /** 对象数组：列表列展示条目数（如 3 条）；亦作 records 表单字段的条目描述 */
  | 'records'
  /** 文件地址：列表列展示「有 / 无」（如 downloads.fileUrl） */
  | 'file'
  /* --- 以下为 records 条目（recordFields）可用的原子类型 --- */
  /** 开关（布尔） */
  | 'switch'
  /** 下拉选择（配合 options） */
  | 'select'
  /** 多行文本 */
  | 'textarea'

export type AdminColumn = {
  key: string
  label: string
  type?: AdminColumnType
  /** 右对齐（数字列常用） */
  align?: 'right'
  /** 是否可排序（默认 true；显式 false 关闭） */
  sortable?: boolean
  /** records 条目中 select 类型的候选项 */
  options?: string[]
}

export type AdminFilter = { key: string; label: string; options: string[] }

export type AdminFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'number'
  | 'switch'
  | 'date'
  /** 字符串数组：textarea 每行一项，保存时按行 split/trim/去空 */
  | 'list'
  /** 对象 { level, text }：状态文案 + 级别色调（success / warning / info / muted） */
  | 'status'
  /** 只读展示（如 id），不参与编辑 */
  | 'readonly'
  /** 对象数组（记录列表）：按 recordFields 渲染可增删改的子卡片 */
  | 'records'
  /** 图片地址：地址输入 + 上传 + 从素材库选择（见 components/admin/ImageField） */
  | 'image'
  /** 富文本：复用装修器 RichTextField（contentEditable 编辑器，存 HTML 原文） */
  | 'rich'
  /** 文件地址：上传任意允许类型文件 + 从素材库选择（见 components/admin/FileField） */
  | 'file'
  /** 多图相册：逐张上传 / 从素材库选择 + 排序（见 components/admin/MultiImageField），值为地址数组 */
  | 'images'

export type AdminField = {
  key: string
  label: string
  type: AdminFieldType
  options?: string[]
  hint?: string
  placeholder?: string
  /** 必填：失焦与提交时逐字段校验，错误内联显示在字段下方 */
  required?: boolean
  /** 表单栅格占宽：1（半行）| 2（整行），默认 1 */
  span?: 1 | 2
  /** records 类型的条目字段描述（复用 AdminColumn，支持 text/number/switch/select/list/textarea/date 等原子类型） */
  recordFields?: AdminColumn[]
}

export type AdminFormSection = { title: string; fields: AdminField[] }

/** 列表视图形态：表格 / 素材宫格 / 内容库页面（自定义，进装修器）/ 站点配置（自定义编辑器）/ 素材库（真实上传数据）/ 组件库（区块类型目录）/ 模板（页面快照）/ 样式（设计令牌）/ 备份（快照管理）/ 发布（发布记录与回滚）/ 角色（角色 CRUD）/ 回收站（软删除记录）/ 看板（迭代需求池：列表 + 看板 + 影响×成本四象限） */
export type AdminResourceView =
  | 'table'
  | 'gallery'
  | 'pages'
  | 'site'
  | 'uploads'
  | 'components'
  | 'templates'
  | 'styles'
  | 'backups'
  | 'publish'
  | 'roles'
  | 'trash'
  /** 迭代需求池专用：列表 / 看板 / 四象限三视图（见 components/admin/AdminRequirementsView.tsx） */
  | 'board'

export type AdminResource = {
  /** 路由段与接口 key，如 products */
  key: string
  /** 侧边栏与面包屑名称 */
  label: string
  /** 图标键（见 components/admin/AdminIcon.tsx） */
  icon: string
  /** 页面标题 */
  title: string
  /** 页面描述 */
  desc: string
  view?: AdminResourceView
  creatable?: boolean
  editable?: boolean
  deletable?: boolean
  /** 搜索参与字段（前端本地过滤） */
  searchKeys?: string[]
  columns: AdminColumn[]
  filters?: AdminFilter[]
  form?: AdminFormSection[]
}

export type AdminNavItem =
  | { kind: 'resource'; key: string }
  | { kind: 'link'; to: string; label: string; icon: string }

export type AdminNavGroup = { key: string; label: string; items: AdminNavItem[] }

/* ============================================================
   资源定义
   ============================================================ */

export const ADMIN_RESOURCES: AdminResource[] = [
  /* ---------- 产品与评测 ---------- */
  {
    key: 'products',
    label: '产品列表',
    icon: 'cube',
    title: '产品列表',
    desc: '管理在售与草稿产品的基础信息、定价与库存状态。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['name', 'model'],
    columns: [
      { key: 'name', label: '产品名称', type: 'strong' },
      { key: 'model', label: '型号', type: 'mono' },
      { key: 'category', label: '分类', type: 'tag' },
      { key: 'connection', label: '接口' },
      { key: 'specs', label: '核心参数', type: 'list' },
      { key: 'status', label: '状态', type: 'status' },
      { key: 'price', label: '价格', type: 'mono', align: 'right' },
      { key: 'releasedAt', label: '上新时间', type: 'date' },
    ],
    filters: [
      { key: 'category', label: '分类', options: ['OLED旗舰', '双模高刷', '电竞IPS', '周边'] },
      { key: 'connection', label: '接口', options: ['DP 2.1', 'HDMI 2.1', 'USB-C'] },
    ],
    form: [
      {
        title: '基本信息',
        fields: [
          { key: 'id', label: 'ID', type: 'readonly', hint: '记录唯一标识，新建时留空由后端生成' },
          { key: 'name', label: '产品名称', type: 'text', span: 2, required: true, hint: '对外展示的完整名称' },
          { key: 'model', label: '型号', type: 'text', placeholder: '54027X1QE-W54' },
          { key: 'category', label: '分类', type: 'select', options: ['OLED旗舰', '双模高刷', '电竞IPS', '周边'] },
          { key: 'connection', label: '接口', type: 'select', options: ['DP 2.1', 'HDMI 2.1', 'USB-C'] },
          { key: 'variant', label: '设备形态', type: 'select', options: ['monitor', 'mouse', 'keyboard', 'headset', 'pad'] },
          { key: 'flag', label: '标记', type: 'text', placeholder: '旗舰 / 联名' },
          { key: 'status', label: '状态', type: 'status', hint: '状态文案 + 级别色调' },
          { key: 'price', label: '价格', type: 'text', placeholder: '¥899' },
          { key: 'priceValue', label: '价格数值（元）', type: 'number', hint: '用于排序与价格区间筛选' },
          { key: 'releasedAt', label: '上新时间', type: 'date' },
          {
            key: 'buyUrl',
            label: '购买链接',
            type: 'text',
            span: 2,
            placeholder: 'https://… 或 /inquiry',
            hint: '详情页 / 对比页主按钮「立即购买」取此链接；留空则回退到区块配置的链接',
          },
        ],
      },
      {
        title: '参数',
        fields: [
          { key: 'specs', label: '核心参数', type: 'list', span: 2, hint: '每行一项，如：26.5 英寸 2K 540Hz' },
        ],
      },
      {
        title: '详情信息（前台展示）',
        fields: [
          { key: 'features', label: '产品亮点', type: 'list', span: 2, hint: '每行一项，如：满速 DP 2.1 · 80Gbps' },
          {
            key: 'attributes',
            label: '结构化参数',
            type: 'records',
            span: 2,
            hint: '按「参数名 + 取值」逐项维护（面板 / 分辨率 / 刷新率 / 接口等）；可增删改与上下移动',
            recordFields: [
              { key: 'label', label: '参数名', type: 'text' },
              { key: 'value', label: '取值', type: 'text' },
            ],
          },
          { key: 'os', label: '兼容系统', type: 'list', span: 2, hint: '每行一项，如：Windows 10 / 11' },
          { key: 'weight', label: '整机重量（克）', type: 'number' },
          { key: 'warranty', label: '保修政策', type: 'text', span: 2 },
          { key: 'inBox', label: '包装清单', type: 'list', span: 2, hint: '每行一项，如：显示器 × 1、电源线 × 1' },
          {
            key: 'gallery',
            label: '相册图片',
            type: 'images',
            span: 2,
            hint: '按产品单独上传 / 从素材库选择，可排序（不设上限，建议 ≤ 20 张）；留空则前台回退内置 4 视角图',
          },
          {
            key: 'detailHtml',
            label: '详情富文本',
            type: 'rich',
            span: 2,
            hint: '长图 / 图文混排（HTML 原文）；前台详情页「产品详情图文」区块渲染，渲染前经白名单净化，留空则不展示',
          },
        ],
      },
    ],
  },
  {
    key: 'product-categories',
    label: '分类与参数',
    icon: 'venn',
    title: '分类与参数管理',
    desc: '维护产品分类树与可选参数项，供产品编辑与前台筛选引用。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['name', 'code'],
    columns: [
      { key: 'name', label: '分类名称', type: 'strong' },
      { key: 'code', label: '编码', type: 'mono' },
      { key: 'count', label: '关联产品', type: 'number', align: 'right' },
      { key: 'order', label: '排序', type: 'number', align: 'right' },
      { key: 'status', label: '状态', type: 'status' },
    ],
    filters: [{ key: 'status', label: '状态', options: ['启用', '停用'] }],
    form: [
      {
        title: '分类信息',
        fields: [
          { key: 'name', label: '分类名称', type: 'text', required: true },
          { key: 'code', label: '编码', type: 'text' },
          { key: 'order', label: '排序', type: 'number' },
          { key: 'status', label: '状态', type: 'select', options: ['启用', '停用'] },
        ],
      },
    ],
  },
  {
    key: 'test-records',
    label: '测试记录',
    icon: 'trophy',
    title: '测试记录',
    desc: '登记各产品的实测数据与测试方法，作为天梯榜的数据来源。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['title', 'product'],
    columns: [
      { key: 'title', label: '测试标题', type: 'strong' },
      { key: 'product', label: '产品', type: 'mono' },
      { key: 'metric', label: '指标' },
      { key: 'value', label: '实测值', type: 'mono' },
      { key: 'method', label: '方法' },
      { key: 'status', label: '状态', type: 'status' },
      { key: 'date', label: '测试日期', type: 'date' },
    ],
    filters: [
      { key: 'status', label: '状态', options: ['已发布', '审核中', '草稿'] },
      { key: 'metric', label: '指标', options: ['综合', '色准', '峰值亮度', '响应时间'] },
    ],
    form: [
      {
        title: '测试信息',
        fields: [
          { key: 'title', label: '测试标题', type: 'text', span: 2, required: true },
          { key: 'product', label: '产品', type: 'text' },
          { key: 'metric', label: '指标', type: 'select', options: ['综合', '色准', '峰值亮度', '响应时间'] },
          { key: 'value', label: '实测值', type: 'text' },
          { key: 'method', label: '测试方法', type: 'select', options: ['示波器采样', '高速相机', '电子秤', '综合评估'] },
          { key: 'status', label: '状态', type: 'select', options: ['已发布', '审核中', '草稿'] },
          { key: 'date', label: '测试日期', type: 'date' },
          { key: 'conclusion', label: '结论说明', type: 'textarea', span: 2 },
        ],
      },
    ],
  },
  {
    key: 'rankings',
    label: '榜单配置',
    icon: 'grid',
    title: '榜单配置',
    desc: '配置天梯榜的范围、指标与条目上限，控制前台榜单呈现。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['label', 'unit'],
    columns: [
      { key: 'label', label: '榜单名称', type: 'strong' },
      { key: 'unit', label: '单位', type: 'tag' },
      { key: 'pending', label: '待测数量', type: 'number', align: 'right' },
      { key: 'id', label: 'ID', type: 'mono' },
    ],
    filters: [{ key: 'unit', label: '单位', options: ['分', 'ms', 'h'] }],
    form: [
      {
        title: '榜单信息',
        fields: [
          { key: 'id', label: 'ID', type: 'readonly', hint: '记录唯一标识，新建时留空由后端生成' },
          { key: 'label', label: '榜单名称', type: 'text', required: true },
          { key: 'unit', label: '单位', type: 'text', placeholder: '分 / ms / h' },
          { key: 'pending', label: '待测数量', type: 'number', hint: '尚未完成该项测试的型号数量' },
        ],
      },
      {
        title: '榜单条目',
        fields: [
          {
            key: 'rows',
            label: '榜单行',
            type: 'records',
            span: 2,
            hint: '按名次排列；可增删改与上下移动',
            recordFields: [
              { key: 'rank', label: '名次', type: 'number' },
              { key: 'model', label: '型号', type: 'text' },
              { key: 'name', label: '名称', type: 'text' },
              { key: 'productId', label: '关联产品 ID', type: 'text' },
              { key: 'score', label: '得分', type: 'number' },
              { key: 'tied', label: '并列', type: 'switch' },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'methods',
    label: '测评方法',
    icon: 'doc',
    title: '测评方法管理',
    desc: '维护公开的测试方法条目，供榜单与文章引用，保证数据可复现。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['name'],
    columns: [
      { key: 'name', label: '方法名称', type: 'strong' },
      { key: 'category', label: '分类', type: 'tag' },
      { key: 'version', label: '版本', type: 'mono' },
      { key: 'owner', label: '负责人' },
      { key: 'status', label: '状态', type: 'status' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
    filters: [{ key: 'category', label: '分类', options: ['延迟', '续航', '手感', '稳定性'] }],
    form: [
      {
        title: '方法信息',
        fields: [
          { key: 'name', label: '方法名称', type: 'text', required: true },
          { key: 'category', label: '分类', type: 'select', options: ['延迟', '续航', '手感', '稳定性'] },
          { key: 'version', label: '版本', type: 'text' },
          { key: 'owner', label: '负责人', type: 'text' },
          { key: 'status', label: '状态', type: 'select', options: ['已发布', '草稿'], hint: '仅「已发布」的方法会在前台天梯榜展示' },
          { key: 'updatedAt', label: '更新时间', type: 'date' },
          { key: 'detail', label: '方法说明', type: 'textarea', span: 2 },
        ],
      },
    ],
  },

  /* ---------- 内容与资源 ---------- */
  {
    key: 'articles',
    label: '文章列表',
    icon: 'book',
    title: '文章列表',
    desc: '管理评测、教程、技术与资讯文章的发布状态。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['title', 'tag', 'author'],
    columns: [
      { key: 'title', label: '标题', type: 'strong' },
      { key: 'categoryLabel', label: '分类', type: 'tag' },
      { key: 'tags', label: '标签', type: 'list' },
      { key: 'author', label: '作者' },
      { key: 'status', label: '状态', type: 'status' },
      { key: 'accent', label: '强调', type: 'bool' },
      { key: 'date', label: '发布时间', type: 'date' },
      { key: 'readingMin', label: '阅读时长（分）', type: 'number', align: 'right' },
    ],
    filters: [
      { key: 'categoryLabel', label: '分类', options: ['评测', '教程', '技术', '资讯'] },
      { key: 'status', label: '发布状态', options: ['已发布', '审核中', '草稿'] },
    ],
    form: [
      {
        title: '文章信息',
        fields: [
          { key: 'id', label: 'ID', type: 'readonly', hint: '记录唯一标识，新建时留空由后端生成' },
          { key: 'title', label: '标题', type: 'text', span: 2, required: true },
          { key: 'category', label: '分类编码', type: 'select', options: ['review', 'guide', 'tech', 'news'] },
          { key: 'categoryLabel', label: '分类名称', type: 'select', options: ['评测', '教程', '技术', '资讯'] },
          { key: 'tag', label: '主标签', type: 'text', hint: '卡片上展示的首个标签' },
          { key: 'tags', label: '全部标签', type: 'list', span: 2, hint: '每行一个标签，支持多标签' },
          { key: 'author', label: '作者', type: 'text', placeholder: '光魂测试实验室' },
          { key: 'status', label: '发布状态', type: 'select', options: ['已发布', '审核中', '草稿'] },
          { key: 'accent', label: '强调', type: 'switch' },
          { key: 'date', label: '发布时间', type: 'date' },
          { key: 'readingMin', label: '阅读时长（分）', type: 'number' },
          { key: 'cover', label: '封面素材键', type: 'text', placeholder: 'lab / software / brand …' },
          { key: 'coverImage', label: '真实封面图', type: 'image', span: 2, hint: '上传或从素材库选择；填写后优先于封面素材键，留空则用素材键占位图' },
          { key: 'meta', label: '元信息', type: 'text', placeholder: '实测 · 方法 v2' },
          { key: 'desc', label: '摘要', type: 'textarea', span: 2 },
          { key: 'body', label: '正文', type: 'rich', span: 2, hint: '富文本正文（HTML 原文）；前台文章详情经白名单净化后渲染，留空则回退小节展示' },
        ],
      },
    ],
  },
  {
    key: 'taxonomy',
    label: '分类与标签',
    icon: 'venn',
    title: '分类与标签管理',
    desc: '维护内容分类与标签，供文章编辑与前台筛选引用。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['name'],
    columns: [
      { key: 'name', label: '名称', type: 'strong' },
      { key: 'type', label: '类型', type: 'tag' },
      { key: 'count', label: '关联内容', type: 'number', align: 'right' },
      { key: 'status', label: '状态', type: 'status' },
    ],
    filters: [{ key: 'type', label: '类型', options: ['分类', '标签'] }],
    form: [
      {
        title: '分类信息',
        fields: [
          { key: 'name', label: '名称', type: 'text', required: true },
          { key: 'type', label: '类型', type: 'select', options: ['分类', '标签'] },
          { key: 'status', label: '状态', type: 'select', options: ['启用', '停用'], hint: '仅「启用」的分类会出现在前台文章筛选' },
          { key: 'order', label: '排序', type: 'number' },
          { key: 'desc', label: '描述', type: 'textarea', span: 2 },
        ],
      },
    ],
  },
  {
    key: 'downloads',
    label: '下载资源',
    icon: 'download',
    title: '下载资源列表',
    desc: '管理驱动、固件、说明书与工具的版本与下载数据。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['name', 'category'],
    columns: [
      { key: 'name', label: '资源名称', type: 'strong' },
      { key: 'category', label: '分类', type: 'tag' },
      { key: 'type', label: '类型', type: 'tag' },
      { key: 'version', label: '版本', type: 'mono' },
      { key: 'size', label: '大小', type: 'mono' },
      { key: 'fileUrl', label: '文件', type: 'file' },
      { key: 'models', label: '适用型号', type: 'list' },
      { key: 'date', label: '更新时间', type: 'date' },
    ],
    filters: [
      { key: 'category', label: '分类', options: ['软件', 'OLED 旗舰', '双模高刷', '电竞 IPS', '周边'] },
      { key: 'type', label: '类型', options: ['manual', 'firmware', 'driver', 'software', 'calibration'] },
    ],
    form: [
      {
        title: '资源信息',
        fields: [
          { key: 'id', label: 'ID', type: 'readonly', hint: '记录唯一标识，新建时留空由后端生成' },
          { key: 'name', label: '资源名称', type: 'text', span: 2, required: true },
          { key: 'category', label: '分类', type: 'select', options: ['软件', 'OLED 旗舰', '双模高刷', '电竞 IPS', '周边'] },
          { key: 'type', label: '类型', type: 'select', options: ['manual', 'firmware', 'driver', 'software', 'calibration'] },
          { key: 'version', label: '版本', type: 'text' },
          { key: 'size', label: '文件大小', type: 'text' },
          { key: 'platform', label: '适用平台', type: 'text', placeholder: 'Windows / macOS', hint: '约定字段：填「Windows」或「macOS」。前台软件下载按钮据此显示系统图标与「下载 Windows 版 / 下载 macOS 版」文案；留空时回退按资源名称识别，识别不到则退化为通用文件按钮' },
          { key: 'fileUrl', label: '文件', type: 'file', span: 2, hint: '固件升级包与适配器／说明书（pdf / zip / bin / 图片 / txt / md）可上传或从素材库选择；安装包（exe / dmg / msi）不在素材库白名单内，请直接填对象存储 / CDN 的外链地址；前台下载按钮指向该地址' },
          { key: 'date', label: '更新时间', type: 'date' },
          { key: 'models', label: '适用型号', type: 'list', span: 2, hint: '每行一项，如：54027X1QE-W54' },
          { key: 'note', label: '说明', type: 'textarea', span: 2 },
        ],
      },
    ],
  },
  {
    key: 'brand-assets',
    label: '品牌资料',
    icon: 'download',
    title: '品牌资料',
    desc: '面向 B 端（渠道 / 媒体 / 合作方）的品牌规范、Logo、产品图与送测物料；与 C 端下载中心数据分开。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['name', 'category'],
    columns: [
      { key: 'name', label: '资料名称', type: 'strong' },
      { key: 'category', label: '分类', type: 'tag' },
      { key: 'format', label: '格式', type: 'tag' },
      { key: 'size', label: '大小', type: 'mono' },
      { key: 'fileUrl', label: '文件', type: 'file' },
      { key: 'requireLead', label: '需留资', type: 'bool' },
      { key: 'date', label: '更新日期', type: 'date' },
    ],
    filters: [{ key: 'category', label: '分类', options: ['规范', 'Logo', '图片', '送测'] }],
    form: [
      {
        title: '资料信息',
        fields: [
          { key: 'id', label: 'ID', type: 'readonly', hint: '记录唯一标识，新建时留空由后端生成' },
          { key: 'name', label: '资料名称', type: 'text', span: 2, required: true },
          { key: 'desc', label: '说明', type: 'textarea', span: 2 },
          { key: 'category', label: '分类', type: 'select', options: ['规范', 'Logo', '图片', '送测'] },
          { key: 'format', label: '格式', type: 'text', placeholder: 'PDF / ZIP / AI / PNG' },
          { key: 'size', label: '文件大小', type: 'text', placeholder: '如：12.4 MB' },
          { key: 'date', label: '更新日期', type: 'date' },
          {
            key: 'requireLead',
            label: '需留资 / 申请授权',
            type: 'switch',
            hint: '打开后，前台点击该资料给出留资提示（引导至 /inquiry 提交咨询）',
          },
          {
            key: 'fileUrl',
            label: '文件',
            type: 'file',
            span: 2,
            hint: '上传或从素材库选择文件，也可直接填外链 / 对象存储地址；前台下载按钮指向该地址',
          },
        ],
      },
    ],
  },
  {
    key: 'assets',
    label: '素材库',
    icon: 'grid',
    title: '素材库',
    desc: '集中管理上传的图片与文件；点击卡片复制公开地址，或删除不再使用的素材。',
    // 自定义视图：由 AdminUploadsList 承载（数据源为 /api/admin/uploads，真实上传文件）
    view: 'uploads',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['name', 'kind'],
    columns: [
      { key: 'name', label: '素材名称', type: 'strong' },
      { key: 'kind', label: '类型', type: 'tag' },
      { key: 'size', label: '大小', type: 'mono' },
      { key: 'usage', label: '使用位置' },
      { key: 'uploadedBy', label: '上传人' },
      { key: 'uploadedAt', label: '上传时间', type: 'date' },
    ],
    filters: [{ key: 'kind', label: '类型', options: ['图片', '视频', '文档'] }],
    form: [
      {
        title: '素材信息',
        fields: [
          { key: 'name', label: '素材名称', type: 'text', span: 2, required: true },
          { key: 'kind', label: '类型', type: 'select', options: ['图片', '视频', '文档'] },
          { key: 'usage', label: '使用位置', type: 'text' },
          { key: 'source', label: '来源地址', type: 'text', span: 2, hint: '留空则按素材类型生成占位图' },
          { key: 'tags', label: '标签', type: 'text', span: 2 },
        ],
      },
    ],
  },

  /* ---------- 网站与装修 ---------- */
  {
    key: 'pages',
    label: '页面列表',
    icon: 'doc',
    title: '页面列表',
    desc: '管理站点页面与发布状态，进入装修器可视化编辑区块。',
    // 自定义视图：由 AdminPagesList 承载（数据源为内容库 /api/admin/pages，非通用资源接口）
    view: 'pages',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['title', 'path'],
    columns: [
      { key: 'title', label: '页面标题', type: 'strong' },
      { key: 'path', label: '路径', type: 'mono' },
      { key: 'status', label: '状态', type: 'status' },
      { key: 'updatedBy', label: '更新人' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
      { key: 'views', label: '访问量', type: 'number', align: 'right' },
    ],
    filters: [{ key: 'status', label: '状态', options: ['已发布', '草稿', '待审核'] }],
    form: [
      {
        title: '页面信息',
        fields: [
          { key: 'title', label: '页面标题', type: 'text', required: true },
          { key: 'path', label: '路径', type: 'text' },
          { key: 'status', label: '状态', type: 'select', options: ['已发布', '草稿', '待审核'] },
          { key: 'seoTitle', label: 'SEO 标题', type: 'text', span: 2 },
          { key: 'seoDesc', label: 'SEO 描述', type: 'textarea', span: 2 },
        ],
      },
    ],
  },
  {
    key: 'site',
    label: '站点配置',
    icon: 'grid',
    title: '站点配置',
    desc: '维护全局导航与页脚分组的标题、链接与顺序，保存后前台刷新即生效。',
    // 自定义视图：由 AdminSiteConfigPage 承载（数据源为内容库 /api/content/site，非通用资源接口）
    view: 'site',
    editable: true,
    searchKeys: ['label', 'href'],
    columns: [
      { key: 'label', label: '名称', type: 'strong' },
      { key: 'href', label: '链接', type: 'mono' },
    ],
  },
  {
    key: 'legal',
    label: '法律条款',
    icon: 'doc',
    title: '法律条款管理',
    desc: '维护隐私政策 / 服务条款 / Cookie 声明 / 备案信息等法律页文案，保存后前台 /legal/:slug 即时生效。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['title', 'slug', 'eyebrow'],
    columns: [
      { key: 'title', label: '标题', type: 'strong' },
      { key: 'slug', label: '路由标识', type: 'mono' },
      { key: 'eyebrow', label: '眉标', type: 'tag' },
      { key: 'sections', label: '段落数', type: 'records' },
      { key: 'updated', label: '更新日期', type: 'date' },
    ],
    form: [
      {
        title: '文档信息',
        fields: [
          { key: 'id', label: 'ID', type: 'readonly', hint: '记录唯一标识，新建时留空由后端生成' },
          { key: 'title', label: '标题', type: 'text', span: 2, required: true },
          { key: 'slug', label: '路由标识（slug）', type: 'text', required: true, hint: '前台地址为 /legal/{slug}，如 privacy / terms' },
          { key: 'eyebrow', label: '眉标', type: 'text', placeholder: 'LEGAL / PRIVACY' },
          { key: 'updated', label: '更新日期', type: 'date' },
          { key: 'intro', label: '导语', type: 'textarea', span: 2 },
        ],
      },
      {
        title: '正文段落',
        fields: [
          {
            key: 'sections',
            label: '段落',
            type: 'records',
            span: 2,
            hint: '按「小标题 + 正文」逐段维护；可增删改与上下移动',
            recordFields: [
              { key: 'heading', label: '小标题', type: 'text' },
              { key: 'body', label: '正文', type: 'textarea' },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'components',
    label: '组件库',
    icon: 'cube',
    title: '组件库',
    desc: '区块类型目录（共 26 类）：查看类型、分组、字段数与启用状态，可启用 / 停用；停用后不再出现在装修器「新增区块」选择器。',
    // 自定义视图：由 AdminComponentsList 承载（数据源 /api/content/blocks/types + PUT /api/admin/blocks/enabled）
    view: 'components',
    columns: [
      { key: 'name', label: '组件名称', type: 'strong' },
      { key: 'group', label: '分组', type: 'tag' },
    ],
  },
  {
    key: 'templates',
    label: '模板',
    icon: 'cap',
    title: '模板',
    desc: '可复用的页面区块快照；从页面新建模板，新建页面时可从模板起步一键初始化区块。',
    // 自定义视图：由 AdminTemplatesList 承载（数据源 /api/admin/templates）
    view: 'templates',
    columns: [
      { key: 'name', label: '模板名称', type: 'strong' },
      { key: 'scope', label: '适用范围', type: 'tag' },
    ],
  },
  {
    key: 'styles',
    label: '样式',
    icon: 'sliders',
    title: '样式',
    desc: '站点级设计令牌编辑（主色 / 圆角 / 字体 / 内容宽度 / 区块留白），仅白名单内变量生效，双主题等价。',
    // 自定义视图：由 AdminStylesPage 承载（数据源 /api/content/site + PUT /api/admin/theme）
    view: 'styles',
    columns: [
      { key: 'label', label: '令牌', type: 'strong' },
      { key: 'value', label: '取值', type: 'mono' },
    ],
  },
  {
    key: 'publish',
    label: '预览与发布',
    icon: 'cloud',
    title: '预览与发布',
    desc: '查看站点的发布记录（内容版本快照），可立即发布、按版本回滚内容或删除记录。',
    // 自定义视图：由 AdminPublishList 承载（数据源 /api/admin/publish，需 publish 权限）
    view: 'publish',
    editable: false,
    searchKeys: ['version'],
    columns: [
      { key: 'at', label: '时间', type: 'date' },
      { key: 'actor', label: '操作者' },
      { key: 'contentVersion', label: '内容版本', type: 'mono' },
      { key: 'pageCount', label: '页面数', type: 'number', align: 'right' },
      { key: 'blockCount', label: '区块数', type: 'number', align: 'right' },
      { key: 'collectionCount', label: '集合数', type: 'number', align: 'right' },
      { key: 'note', label: '备注' },
    ],
  },

  /* ---------- 客户与服务 ---------- */
  {
    key: 'customers',
    label: '客户列表',
    icon: 'account',
    title: '客户列表',
    desc: '查看注册客户、名下设备与工单概况。',
    editable: true,
    searchKeys: ['name', 'account'],
    columns: [
      { key: 'name', label: '客户', type: 'strong' },
      { key: 'account', label: '账号', type: 'mono' },
      { key: 'level', label: '等级', type: 'tag' },
      { key: 'devices', label: '设备数', type: 'number', align: 'right' },
      { key: 'tickets', label: '工单数', type: 'number', align: 'right' },
      { key: 'joinedAt', label: '注册时间', type: 'date' },
      { key: 'status', label: '状态', type: 'status' },
    ],
    filters: [
      { key: 'level', label: '等级', options: ['普通', '白银', '黄金', '黑金'] },
      { key: 'status', label: '状态', options: ['正常', '冻结'] },
    ],
    form: [
      {
        title: '客户信息',
        fields: [
          { key: 'name', label: '客户姓名', type: 'text', required: true },
          { key: 'account', label: '账号', type: 'text' },
          { key: 'level', label: '等级', type: 'select', options: ['普通', '白银', '黄金', '黑金'] },
          { key: 'status', label: '状态', type: 'select', options: ['正常', '冻结'] },
          { key: 'note', label: '内部备注', type: 'textarea', span: 2 },
        ],
      },
    ],
  },
  {
    key: 'inquiries',
    label: '咨询工单',
    icon: 'chat',
    title: '咨询列表',
    desc: '处理客户提交的咨询与售后工单，可指派处理人并回复。',
    editable: true,
    deletable: true,
    searchKeys: ['title', 'name', 'topic', 'tag', 'contact', 'model'],
    columns: [
      { key: 'title', label: '主题', type: 'strong' },
      { key: 'name', label: '称呼' },
      { key: 'topic', label: '主题分类', type: 'tag' },
      { key: 'tag', label: '状态', type: 'status' },
      { key: 'contact', label: '联系方式', type: 'mono' },
      { key: 'model', label: '型号', type: 'mono' },
      { key: 'message', label: '问题描述' },
      { key: 'date', label: '日期', type: 'date' },
      { key: 'accent', label: '强调', type: 'bool' },
      { key: 'status', label: '状态级别', type: 'mono' },
    ],
    filters: [
      { key: 'tag', label: '状态', options: ['处理中', '等待补充', '已解决', '已关闭'] },
      { key: 'topic', label: '主题分类', options: ['产品咨询', '保修与售后', '驱动与下载', '商务合作', '预约到店'] },
    ],
    form: [
      {
        title: '工单信息',
        fields: [
          { key: 'id', label: 'ID', type: 'readonly', hint: '记录唯一标识，新建时留空由后端生成' },
          { key: 'title', label: '主题', type: 'text', span: 2, required: true },
          { key: 'name', label: '称呼', type: 'text' },
          { key: 'topic', label: '主题分类', type: 'text', placeholder: '产品咨询 / 保修与售后 / 预约到店 …' },
          { key: 'contact', label: '联系方式', type: 'text', placeholder: '邮箱 / 手机号' },
          { key: 'model', label: '型号', type: 'text', placeholder: '54027X1QE-W54' },
          { key: 'message', label: '问题描述', type: 'textarea', span: 2 },
          { key: 'tag', label: '状态文案', type: 'text', placeholder: '处理中 / 已解决 …' },
          { key: 'date', label: '日期', type: 'date' },
          { key: 'accent', label: '强调', type: 'switch' },
          { key: 'status', label: '状态级别', type: 'select', options: ['info', 'warning', 'success', 'muted'], hint: '对应前台 .status--*；当前存储为字符串级别' },
        ],
      },
    ],
  },
  {
    key: 'reservations',
    label: '预约管理',
    icon: 'clock',
    title: '到店预约',
    desc: '查看与跟进前台提交的到店预约（体验点 / 时间 / 人数），独立于咨询工单。',
    editable: true,
    deletable: true,
    searchKeys: ['name', 'contact', 'venueName', 'visitTime'],
    columns: [
      { key: 'venueName', label: '体验点', type: 'strong' },
      { key: 'name', label: '预约人' },
      { key: 'contact', label: '联系方式', type: 'mono' },
      { key: 'visitTime', label: '期望到店' },
      { key: 'people', label: '人数', type: 'number', align: 'right' },
      { key: 'status', label: '状态', type: 'status' },
      { key: 'createdAt', label: '提交日期', type: 'date' },
      { key: 'note', label: '备注' },
    ],
    filters: [{ key: 'status', label: '状态', options: ['待确认', '已确认', '已完成', '已取消'] }],
    form: [
      {
        title: '预约信息',
        fields: [
          { key: 'id', label: 'ID', type: 'readonly', hint: '记录唯一标识，新建时留空由后端生成' },
          { key: 'venueName', label: '体验点', type: 'text' },
          { key: 'name', label: '预约人', type: 'text' },
          { key: 'contact', label: '联系方式', type: 'text' },
          { key: 'visitTime', label: '期望到店时间', type: 'text', placeholder: '如：本周六下午 / 2026-10-18 14:00' },
          { key: 'people', label: '人数', type: 'number' },
          { key: 'status', label: '状态', type: 'select', options: ['待确认', '已确认', '已完成', '已取消'] },
          { key: 'note', label: '备注', type: 'textarea', span: 2 },
        ],
      },
    ],
  },
  {
    key: 'devices',
    label: '设备管理',
    icon: 'keyboard',
    title: '设备管理',
    desc: '管理客户登记的设备与保修状态。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['serial', 'model', 'owner'],
    columns: [
      { key: 'serial', label: '序列号', type: 'mono' },
      { key: 'model', label: '型号', type: 'mono' },
      { key: 'owner', label: '所有人' },
      { key: 'warranty', label: '保修', type: 'tag' },
      { key: 'registeredAt', label: '登记时间', type: 'date' },
      { key: 'status', label: '状态', type: 'status' },
    ],
    filters: [
      { key: 'warranty', label: '保修', options: ['保修中', '已过保', '待激活'] },
      { key: 'status', label: '状态', options: ['正常', '维修中', '已注销'] },
    ],
    form: [
      {
        title: '设备信息',
        fields: [
          { key: 'serial', label: '序列号', type: 'text', required: true },
          { key: 'model', label: '型号', type: 'text' },
          { key: 'owner', label: '所有人', type: 'text' },
          { key: 'warranty', label: '保修状态', type: 'select', options: ['保修中', '已过保', '待激活'] },
          { key: 'registeredAt', label: '登记时间', type: 'date' },
          { key: 'status', label: '状态', type: 'select', options: ['正常', '维修中', '已注销'] },
        ],
      },
    ],
  },
  {
    key: 'subscribers',
    label: '订阅者',
    icon: 'chat',
    title: '邮件订阅者',
    desc: '来自首页 / 页脚「邮件订阅」表单的邮箱，用于新品与固件更新通知。',
    // 仅由公开表单写入：后台可查看与删除，不手工新建 / 编辑
    creatable: false,
    editable: false,
    deletable: true,
    searchKeys: ['email', 'source'],
    columns: [
      { key: 'email', label: '邮箱', type: 'mono' },
      { key: 'source', label: '来源', type: 'tag' },
      { key: 'createdAt', label: '提交日期', type: 'date' },
    ],
    filters: [{ key: 'source', label: '来源', options: ['home', 'footer'] }],
    form: [
      {
        title: '订阅信息',
        fields: [
          { key: 'email', label: '邮箱', type: 'text', required: true },
          { key: 'source', label: '来源', type: 'text', hint: 'home / footer' },
          { key: 'createdAt', label: '提交日期', type: 'date' },
        ],
      },
    ],
  },
  {
    key: 'faqs',
    label: '问答管理',
    icon: 'doc',
    title: '问答管理',
    desc: '维护常见问题条目，供服务与支持页与型号与兼容页引用。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['q'],
    columns: [
      { key: 'q', label: '问题', type: 'strong' },
      { key: 'category', label: '分类', type: 'tag' },
      { key: 'a', label: '答案' },
    ],
    filters: [{ key: 'category', label: '分类', options: ['安装', '连接', 'HDR', '售后'] }],
    form: [
      {
        title: '问答信息',
        fields: [
          { key: 'id', label: 'ID', type: 'readonly', hint: '记录唯一标识，新建时留空由后端生成' },
          { key: 'q', label: '问题', type: 'text', span: 2, required: true },
          { key: 'category', label: '分类', type: 'select', options: ['安装', '连接', 'HDR', '售后'] },
          { key: 'a', label: '答案', type: 'textarea', span: 2 },
          { key: 'steps', label: '操作步骤', type: 'list', span: 2, hint: '每行一步；详情页「操作步骤」按此展示' },
        ],
      },
    ],
  },
  {
    key: 'service-info',
    label: '服务信息',
    icon: 'support',
    title: '服务信息管理',
    desc: '维护体验点与授权服务网点的地址、电话与营业时间。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['name', 'city'],
    columns: [
      { key: 'name', label: '网点名称', type: 'strong' },
      { key: 'city', label: '城市', type: 'tag' },
      { key: 'type', label: '类型', type: 'tag' },
      { key: 'phone', label: '电话', type: 'mono' },
      { key: 'hours', label: '营业时间' },
      { key: 'status', label: '状态', type: 'status' },
    ],
    filters: [
      { key: 'type', label: '类型', options: ['体验点', '服务网点'] },
      { key: 'status', label: '状态', options: ['营业中', '暂停'] },
    ],
    form: [
      {
        title: '网点信息',
        fields: [
          { key: 'name', label: '网点名称', type: 'text', required: true },
          { key: 'city', label: '城市', type: 'text' },
          { key: 'type', label: '类型', type: 'select', options: ['体验点', '服务网点'] },
          { key: 'status', label: '状态', type: 'select', options: ['营业中', '暂停'] },
          { key: 'address', label: '地址', type: 'text', span: 2 },
          { key: 'phone', label: '电话', type: 'text' },
          { key: 'hours', label: '营业时间', type: 'text' },
        ],
      },
    ],
  },
  {
    key: 'models',
    label: '型号与兼容',
    icon: 'keyboard',
    title: '型号与兼容',
    desc: '维护各型号的支持信息：常见问答与使用指南。该型号的可下载资料统一在「下载资源」里按「适用型号」维护，避免两处重复。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['model', 'line', 'summary'],
    columns: [
      { key: 'model', label: '型号', type: 'strong' },
      { key: 'line', label: '产品线', type: 'tag' },
      { key: 'summary', label: '摘要' },
      { key: 'faqs', label: '问答', type: 'records' },
      { key: 'guides', label: '指南', type: 'records' },
    ],
    filters: [{ key: 'line', label: '产品线', options: ['OLED 旗舰', '双模高刷', '电竞 IPS', '周边'] }],
    form: [
      {
        title: '型号信息',
        fields: [
          { key: 'id', label: 'ID', type: 'readonly', hint: '记录唯一标识，新建时留空由后端生成' },
          { key: 'model', label: '型号', type: 'text', required: true },
          { key: 'line', label: '产品线', type: 'text', placeholder: 'OLED 旗舰 / 双模高刷 / 电竞 IPS / 周边' },
          { key: 'summary', label: '摘要', type: 'textarea', span: 2 },
        ],
      },
      {
        title: '常见问答',
        fields: [
          {
            key: 'faqs',
            label: '问答',
            type: 'records',
            span: 2,
            hint: '该型号的常见问题；可增删改与上下移动',
            recordFields: [
              { key: 'q', label: '问题', type: 'textarea' },
              { key: 'a', label: '答案', type: 'textarea' },
              { key: 'category', label: '分类', type: 'select', options: ['安装', '连接', 'HDR', '售后'] },
            ],
          },
        ],
      },
      {
        title: '使用指南',
        fields: [
          {
            key: 'guides',
            label: '指南',
            type: 'records',
            span: 2,
            hint: '快速上手与使用说明；可增删改与上下移动',
            recordFields: [
              { key: 'title', label: '标题', type: 'text' },
              { key: 'desc', label: '说明', type: 'textarea' },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'notifications',
    label: '通知管理',
    icon: 'chat',
    title: '通知管理',
    desc: '管理站内信、邮件与短信通知的受众与发送状态。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['title'],
    columns: [
      { key: 'title', label: '通知标题', type: 'strong' },
      { key: 'channel', label: '渠道', type: 'tag' },
      { key: 'audience', label: '受众', type: 'tag' },
      { key: 'sentAt', label: '发送时间', type: 'date' },
      { key: 'status', label: '状态', type: 'status' },
      { key: 'openRate', label: '打开率', type: 'mono' },
    ],
    filters: [
      { key: 'channel', label: '渠道', options: ['站内信', '邮件', '短信'] },
      { key: 'status', label: '状态', options: ['已发送', '草稿', '定时'] },
    ],
    form: [
      {
        title: '通知信息',
        fields: [
          { key: 'title', label: '通知标题', type: 'text', span: 2, required: true },
          { key: 'channel', label: '渠道', type: 'select', options: ['站内信', '邮件', '短信'] },
          { key: 'audience', label: '受众', type: 'select', options: ['全部客户', '已购客户', '订阅用户'] },
          { key: 'status', label: '状态', type: 'select', options: ['已发送', '草稿', '定时'] },
          { key: 'sentAt', label: '发送时间', type: 'date' },
          { key: 'content', label: '通知内容', type: 'textarea', span: 2 },
        ],
      },
    ],
  },

  /* ---------- 商业合作 ---------- */
  {
    key: 'biz-content',
    label: '合作内容',
    icon: 'cube',
    title: '合作内容管理',
    desc: '管理渠道、媒体、赛事与校园合作的内容与进度。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['title', 'slug'],
    columns: [
      { key: 'title', label: '标题', type: 'strong' },
      { key: 'eyebrow', label: '眉标', type: 'tag' },
      { key: 'slug', label: '标识', type: 'mono' },
      { key: 'points', label: '要点', type: 'list' },
      { key: 'cover', label: '封面' },
    ],
    filters: [{ key: 'eyebrow', label: '眉标', options: ['电竞对战', '内容创作', '商用办公'] }],
    form: [
      {
        title: '合作内容',
        fields: [
          { key: 'id', label: 'ID', type: 'readonly', hint: '记录唯一标识，新建时留空由后端生成' },
          { key: 'title', label: '标题', type: 'text', span: 2, required: true },
          { key: 'slug', label: '标识（slug）', type: 'text' },
          { key: 'eyebrow', label: '眉标', type: 'text' },
          { key: 'cover', label: '封面地址', type: 'image', span: 2 },
          { key: 'desc', label: '描述', type: 'textarea', span: 2 },
          { key: 'points', label: '要点', type: 'list', span: 2, hint: '每行一项' },
          {
            key: 'products',
            label: '关联产品',
            type: 'records',
            span: 2,
            hint: '引用产品的 id 与名称；可增删改与上下移动',
            recordFields: [
              { key: 'id', label: '产品 ID', type: 'text' },
              { key: 'name', label: '产品名称', type: 'text' },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'biz-cases',
    label: '案例管理',
    icon: 'trophy',
    title: '案例管理',
    desc: '管理对外展示的合作案例，供前台案例页引用。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['title', 'partner'],
    columns: [
      { key: 'title', label: '案例标题', type: 'strong' },
      { key: 'partner', label: '合作方' },
      { key: 'category', label: '分类', type: 'tag' },
      { key: 'year', label: '年份', type: 'mono' },
      { key: 'cover', label: '封面' },
    ],
    filters: [{ key: 'category', label: '分类', options: ['赛事合作', '渠道合作', '品牌联名'] }],
    form: [
      {
        title: '案例信息',
        fields: [
          { key: 'id', label: 'ID', type: 'readonly', hint: '记录唯一标识，新建时留空由后端生成' },
          { key: 'title', label: '案例标题', type: 'text', span: 2, required: true },
          { key: 'partner', label: '合作方', type: 'text' },
          { key: 'category', label: '分类', type: 'select', options: ['赛事合作', '渠道合作', '品牌联名'] },
          { key: 'year', label: '年份', type: 'text' },
          { key: 'cover', label: '封面地址', type: 'image', span: 2 },
          { key: 'summary', label: '案例概述', type: 'textarea', span: 2 },
          { key: 'background', label: '项目背景', type: 'textarea', span: 2, hint: '详情页「项目背景」；留空则不展示' },
          { key: 'solution', label: '解决方案', type: 'list', span: 2, hint: '每行一项，详情页逐条展示' },
          {
            key: 'results',
            label: '合作成果',
            type: 'records',
            span: 2,
            hint: '按「指标 + 数值」逐项维护，如：场均参与人数 / 300+；可增删改与上下移动',
            recordFields: [
              { key: 'label', label: '指标', type: 'text' },
              { key: 'value', label: '数值', type: 'text' },
            ],
          },
          { key: 'gallery', label: '案例图集', type: 'list', span: 2, hint: '每行一个图片地址（/uploads/… 或外链）' },
        ],
      },
    ],
  },
  {
    key: 'biz-venues',
    label: '体验点管理',
    icon: 'support',
    title: '体验点管理',
    desc: '管理商业合作体验点的位置与状态。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['name', 'city'],
    columns: [
      { key: 'name', label: '体验点名称', type: 'strong' },
      { key: 'province', label: '省份', type: 'tag' },
      { key: 'city', label: '城市', type: 'tag' },
      { key: 'area', label: '区域' },
      { key: 'type', label: '类型', type: 'tag' },
      { key: 'status', label: '状态', type: 'status' },
      { key: 'ok', label: '正常营业', type: 'bool' },
      { key: 'address', label: '地址' },
    ],
    filters: [
      { key: 'province', label: '省份', options: ['广东', '上海', '北京', '四川'] },
      { key: 'city', label: '城市', options: ['深圳', '上海', '北京', '成都', '广州'] },
      { key: 'type', label: '类型', options: ['flagship', 'experience', 'service'] },
      { key: 'status', label: '状态', options: ['营业中', '调整中', '筹备中'] },
    ],
    form: [
      {
        title: '体验点信息',
        fields: [
          { key: 'id', label: 'ID', type: 'readonly', hint: '记录唯一标识，新建时留空由后端生成' },
          { key: 'name', label: '体验点名称', type: 'text', span: 2, required: true },
          { key: 'province', label: '省份', type: 'text', hint: '如：广东 / 上海' },
          { key: 'city', label: '城市', type: 'text' },
          { key: 'area', label: '区域', type: 'text' },
          { key: 'type', label: '类型', type: 'select', options: ['flagship', 'experience', 'service'] },
          { key: 'status', label: '状态', type: 'select', options: ['营业中', '调整中', '筹备中'] },
          { key: 'ok', label: '正常营业', type: 'switch' },
          { key: 'address', label: '地址', type: 'text', span: 2 },
          { key: 'cover', label: '封面地址', type: 'image', span: 2 },
          { key: 'hours', label: '营业时间', type: 'text', placeholder: '每日 10:00–21:00' },
          { key: 'phone', label: '门店电话', type: 'text', placeholder: '0755-0000-0000' },
          { key: 'transport', label: '交通指引', type: 'text', span: 2 },
          { key: 'products', label: '在售型号', type: 'list', span: 2, hint: '每行一项，门店可体验的型号' },
          { key: 'services', label: '服务项目', type: 'list', span: 2, hint: '每行一项，如：现场调参' },
          { key: 'note', label: '预约说明', type: 'textarea', span: 2, hint: '详情页「到店预约」上方说明' },
        ],
      },
    ],
  },

  /* ---------- 系统设置 ---------- */
  {
    key: 'reviews',
    label: '服务评价',
    icon: 'trophy',
    title: '服务评价',
    desc: '汇总客户对咨询与售后服务的评价：评分、渠道与处理状态，便于跟进未处理反馈。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['customer', 'model', 'ticket', 'summary'],
    columns: [
      { key: 'customer', label: '客户', type: 'strong' },
      { key: 'model', label: '型号', type: 'mono' },
      { key: 'ticket', label: '来源工单' },
      { key: 'rating', label: '评分', type: 'number', align: 'right' },
      { key: 'summary', label: '评价摘要' },
      { key: 'channel', label: '渠道', type: 'tag' },
      { key: 'date', label: '时间', type: 'date' },
      { key: 'status', label: '状态', type: 'status' },
    ],
    filters: [
      // 评分筛选：值以字符串与记录的 number 评分比对（见列表页 String(row[key]) 过滤口径）
      { key: 'rating', label: '评分', options: ['5', '4', '3', '2', '1'] },
      { key: 'status', label: '状态', options: ['待处理', '已回访', '已忽略'] },
    ],
    form: [
      {
        title: '评价信息',
        fields: [
          { key: 'id', label: 'ID', type: 'readonly', hint: '记录唯一标识，新建时留空由后端生成' },
          { key: 'customer', label: '客户', type: 'text', required: true, hint: '提交评价的客户称呼' },
          { key: 'model', label: '型号', type: 'text', placeholder: '54027X1QE-W54' },
          { key: 'ticket', label: '来源工单', type: 'text', hint: '关联的咨询工单编号或主题' },
          { key: 'rating', label: '评分（1–5）', type: 'number', hint: '1 分最低、5 分最高' },
          { key: 'channel', label: '渠道', type: 'select', options: ['在线工单', '电话', '到店体验', '邮件'] },
          { key: 'date', label: '评价时间', type: 'date' },
          { key: 'status', label: '处理状态', type: 'select', options: ['待处理', '已回访', '已忽略'] },
          { key: 'summary', label: '评价摘要', type: 'textarea', span: 2, hint: '客户原话要点；留空则不展示' },
        ],
      },
    ],
  },
  {
    key: 'requirements',
    label: '迭代需求池',
    icon: 'venn',
    title: '迭代需求池',
    desc: '收集与排期迭代需求：MoSCoW 优先级、版本 Roadmap，以及「影响×成本」四象限与看板视图。',
    // 自定义视图：由 AdminRequirementsView 承载（列表 / 看板 / 四象限；数据源 /api/admin/resources/requirements）
    view: 'board',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['title', 'category', 'source', 'owner'],
    columns: [
      { key: 'title', label: '需求', type: 'strong' },
      { key: 'category', label: '分类', type: 'tag' },
      { key: 'priority', label: '优先级', type: 'tag' },
      { key: 'version', label: '版本', type: 'mono' },
      { key: 'impact', label: '影响', type: 'number', align: 'right' },
      { key: 'cost', label: '成本', type: 'number', align: 'right' },
      { key: 'source', label: '来源', type: 'tag' },
      { key: 'status', label: '状态', type: 'status' },
      { key: 'createdAt', label: '提出时间', type: 'date' },
    ],
    filters: [
      // 分类固定六类（功能 / 体验 / 内容 / 渠道对接 / 数据合规 / 其他）
      { key: 'category', label: '分类', options: ['功能', '体验', '内容', '渠道对接', '数据合规', '其他'] },
      // MoSCoW 优先级
      { key: 'priority', label: '优先级', options: ['Must', 'Should', 'Could', "Won't"] },
      { key: 'status', label: '状态', options: ['待评审', '已排期', '进行中', '已完成', '暂缓'] },
    ],
    form: [
      {
        title: '需求信息',
        fields: [
          { key: 'id', label: 'ID', type: 'readonly', hint: '记录唯一标识，新建时留空由后端生成' },
          { key: 'title', label: '需求标题', type: 'text', span: 2, required: true, hint: '一句话描述需求目标' },
          {
            key: 'category',
            label: '分类',
            type: 'select',
            options: ['功能', '体验', '内容', '渠道对接', '数据合规', '其他'],
            hint: '六类之一，便于按维度汇总',
          },
          {
            key: 'priority',
            label: 'MoSCoW 优先级',
            type: 'select',
            options: ['Must', 'Should', 'Could', "Won't"],
            hint: 'Must 必须做 / Should 应该做 / Could 可以做 / Won’t 本期不做',
          },
          { key: 'version', label: '目标版本', type: 'text', placeholder: 'v1.1 / 2026Q4', hint: 'Roadmap 版本或迭代批次' },
          { key: 'impact', label: '影响（1–5）', type: 'number', hint: '对业务 / 用户的价值，越大越优先' },
          { key: 'cost', label: '成本（1–5）', type: 'number', hint: '开发与协作成本，越小越容易落地' },
          {
            key: 'source',
            label: '来源',
            type: 'select',
            options: ['本次改版', '手动新增', '一键转入', '用户反馈', '运营提报'],
            hint: '一键转入为后续能力，先按来源登记',
          },
          { key: 'owner', label: '负责人', type: 'text' },
          { key: 'status', label: '状态', type: 'select', options: ['待评审', '已排期', '进行中', '已完成', '暂缓'] },
          { key: 'createdAt', label: '提出时间', type: 'date' },
          { key: 'note', label: '说明', type: 'textarea', span: 2, hint: '背景 / 验收要点；留空则不展示' },
        ],
      },
    ],
  },
  {
    key: 'staff',
    label: '工作人员',
    icon: 'account',
    title: '工作人员管理',
    desc: '管理后台账号、角色与启用状态。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['name', 'account'],
    columns: [
      { key: 'name', label: '姓名', type: 'strong' },
      { key: 'account', label: '账号', type: 'mono' },
      { key: 'role', label: '角色', type: 'tag' },
      { key: 'dept', label: '部门' },
      { key: 'lastLogin', label: '最近登录', type: 'date' },
      { key: 'status', label: '状态', type: 'status' },
    ],
    filters: [
      { key: 'role', label: '角色', options: ['超级管理员', '内容运营', '客服', '数据分析'] },
      { key: 'status', label: '状态', options: ['启用', '停用'] },
    ],
    form: [
      {
        title: '账号信息',
        fields: [
          { key: 'name', label: '姓名', type: 'text', required: true },
          { key: 'account', label: '账号', type: 'text' },
          { key: 'role', label: '角色', type: 'select', options: ['超级管理员', '内容运营', '客服', '数据分析'] },
          { key: 'dept', label: '部门', type: 'text' },
          { key: 'status', label: '状态', type: 'select', options: ['启用', '停用'] },
        ],
      },
    ],
  },
  {
    key: 'roles',
    label: '角色与权限',
    icon: 'shield',
    title: '角色与权限',
    desc: '管理后台角色与权限集（可新建 / 编辑 / 删除；内置角色不可删除）。',
    // 自定义视图：由 AdminRolesView 承载（数据源 /api/admin/roles，角色真源落库 admin_roles）
    view: 'roles',
    editable: true,
    searchKeys: ['name'],
    columns: [
      { key: 'name', label: '角色名称', type: 'strong' },
      { key: 'scopes', label: '权限集' },
      { key: 'desc', label: '说明' },
    ],
  },
  {
    key: 'languages',
    label: '语言管理',
    icon: 'globe',
    title: '语言管理',
    desc: '管理站点语言与翻译进度；英文内容为待补能力（见交接文档）。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['name', 'code'],
    columns: [
      { key: 'name', label: '语言', type: 'strong' },
      { key: 'code', label: '代码', type: 'mono' },
      { key: 'progress', label: '翻译进度', type: 'mono' },
      { key: 'status', label: '状态', type: 'status' },
    ],
    filters: [{ key: 'status', label: '状态', options: ['已上线', '翻译中', '未开始'] }],
    form: [
      {
        title: '语言信息',
        fields: [
          { key: 'name', label: '语言名称', type: 'text', required: true },
          { key: 'code', label: '语言代码', type: 'text' },
          { key: 'status', label: '状态', type: 'select', options: ['已上线', '翻译中', '未开始'] },
          { key: 'note', label: '备注', type: 'textarea', span: 2 },
        ],
      },
    ],
  },
  {
    key: 'integrations',
    label: '接入配置',
    icon: 'cloud',
    title: '接入配置',
    desc: '管理第三方服务接入（邮件、统计、存储等）的开关与配置。',
    creatable: true,
    editable: true,
    deletable: true,
    searchKeys: ['name'],
    columns: [
      { key: 'name', label: '服务名称', type: 'strong' },
      { key: 'type', label: '类型', type: 'tag' },
      { key: 'status', label: '状态', type: 'status' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
      { key: 'desc', label: '说明' },
    ],
    filters: [
      { key: 'type', label: '类型', options: ['邮件', '统计', '存储', '支付'] },
      { key: 'status', label: '状态', options: ['已接入', '未接入'] },
    ],
    form: [
      {
        title: '接入信息',
        fields: [
          { key: 'name', label: '服务名称', type: 'text', required: true },
          { key: 'type', label: '类型', type: 'select', options: ['邮件', '统计', '存储', '支付'] },
          { key: 'status', label: '状态', type: 'select', options: ['已接入', '未接入'] },
          { key: 'desc', label: '说明', type: 'textarea', span: 2 },
        ],
      },
    ],
  },
  {
    key: 'logs',
    label: '操作日志',
    icon: 'clock',
    title: '操作日志',
    desc: '记录后台关键写操作与登录事件，供审计追溯（真实数据，来自服务端审计日志）。',
    editable: false,
    searchKeys: ['actor', 'action', 'target'],
    columns: [
      { key: 'at', label: '时间', type: 'date' },
      { key: 'actor', label: '操作者' },
      { key: 'action', label: '动作', type: 'mono' },
      { key: 'target', label: '对象' },
      { key: 'ip', label: 'IP', type: 'mono' },
    ],
  },
  {
    key: 'trash',
    label: '回收站',
    icon: 'refresh',
    title: '回收站',
    desc: '查看已删除的内容类资源与集合记录，可恢复或彻底删除（真实软删除数据）。',
    // 自定义视图：由 AdminTrashList 承载（数据源 /api/admin/resources/trash，含恢复 / 彻底删除行内动作）
    view: 'trash',
    editable: false,
    searchKeys: ['name'],
    columns: [
      { key: 'name', label: '名称', type: 'strong' },
      { key: 'key', label: '原栏目', type: 'tag' },
      { key: 'recordId', label: '记录标识', type: 'mono' },
      { key: 'deletedBy', label: '删除人' },
      { key: 'deletedAt', label: '删除时间', type: 'date' },
    ],
  },
  {
    key: 'backups',
    label: '备份',
    icon: 'cloud',
    title: '备份',
    desc: '创建、下载、恢复站点数据备份；也可将全部数据重置为初始状态（会丢弃改动）。',
    // 自定义视图：由 AdminBackupsList 承载（数据源 /api/admin/backups + /api/admin/reset）
    view: 'backups',
    editable: false,
    searchKeys: ['name'],
    columns: [
      { key: 'name', label: '备份名称', type: 'strong' },
      { key: 'size', label: '大小', type: 'mono' },
      { key: 'at', label: '时间', type: 'date' },
    ],
  },
]

/* ============================================================
   侧边导航（分组）
   ============================================================ */

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    key: 'workbench',
    label: '工作台',
    items: [{ kind: 'link', to: '/admin', label: '工作台首页', icon: 'grid' }],
  },
  {
    key: 'product',
    label: '产品与评测',
    items: [
      { kind: 'resource', key: 'products' },
      { kind: 'resource', key: 'product-categories' },
      { kind: 'resource', key: 'test-records' },
      { kind: 'resource', key: 'rankings' },
      { kind: 'resource', key: 'methods' },
    ],
  },
  {
    key: 'content',
    label: '内容与资源',
    items: [
      { kind: 'resource', key: 'articles' },
      { kind: 'resource', key: 'taxonomy' },
      { kind: 'resource', key: 'downloads' },
      { kind: 'resource', key: 'assets' },
    ],
  },
  {
    key: 'site',
    label: '网站与装修',
    items: [
      { kind: 'resource', key: 'pages' },
      { kind: 'resource', key: 'site' },
      { kind: 'resource', key: 'legal' },
      { kind: 'resource', key: 'components' },
      { kind: 'resource', key: 'templates' },
      { kind: 'resource', key: 'styles' },
      { kind: 'resource', key: 'publish' },
    ],
  },
  {
    key: 'service',
    label: '客户与服务',
    items: [
      { kind: 'resource', key: 'customers' },
      { kind: 'resource', key: 'inquiries' },
      { kind: 'resource', key: 'reservations' },
      { kind: 'resource', key: 'devices' },
      { kind: 'resource', key: 'subscribers' },
      { kind: 'resource', key: 'faqs' },
      { kind: 'resource', key: 'service-info' },
      { kind: 'resource', key: 'models' },
      { kind: 'resource', key: 'notifications' },
    ],
  },
  {
    key: 'business',
    label: '商业合作',
    items: [
      { kind: 'resource', key: 'biz-content' },
      { kind: 'resource', key: 'biz-cases' },
      { kind: 'resource', key: 'biz-venues' },
      { kind: 'resource', key: 'brand-assets' },
    ],
  },
  {
    key: 'analytics',
    label: '数据分析',
    items: [
      { kind: 'link', to: '/admin/analytics/traffic', label: '访问分析', icon: 'monitor' },
      { kind: 'link', to: '/admin/analytics/products', label: '产品评测分析', icon: 'trophy' },
      { kind: 'link', to: '/admin/analytics/downloads', label: '下载服务分析', icon: 'download' },
      { kind: 'link', to: '/admin/analytics/content', label: '内容合作分析', icon: 'book' },
    ],
  },
  {
    key: 'system',
    label: '系统设置',
    items: [
      { kind: 'resource', key: 'reviews' },
      { kind: 'resource', key: 'requirements' },
      { kind: 'resource', key: 'staff' },
      { kind: 'resource', key: 'roles' },
      { kind: 'resource', key: 'languages' },
      { kind: 'resource', key: 'integrations' },
      { kind: 'resource', key: 'logs' },
      { kind: 'resource', key: 'trash' },
      { kind: 'resource', key: 'backups' },
    ],
  },
]

/** 数据分析栏目（scope → 标题），用于路由与侧边栏高亮 */
export const ANALYTICS_SCOPES: Array<{ scope: string; label: string }> = [
  { scope: 'traffic', label: '访问分析' },
  { scope: 'products', label: '产品评测分析' },
  { scope: 'downloads', label: '下载服务分析' },
  { scope: 'content', label: '内容合作分析' },
]

/** 按 key 取资源定义；未登记返回 undefined（路由层据此 404） */
export function adminResource(key: string): AdminResource | undefined {
  return ADMIN_RESOURCES.find((r) => r.key === key)
}