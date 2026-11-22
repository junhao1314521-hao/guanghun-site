/**
 * 产品参数目录（后台「结构化参数」下拉数据源）。
 *
 * 只影响后台录入控件的可选项；存储仍是 `attributes: [{ group, label, value }]`，
 * 不改接口、不改前台渲染、不迁移既有数据。
 *
 * 规则：
 * - 常见参数给出固定选项（如面板 / 刷新率 / 接口），运营直接选，避免同一含义多种写法；
 * - `parts` 表示组合参数（如「尺寸 / 分辨率」），保存时用「 · 」连接；
 * - 没有的选项走「其他（手动填写）」，不牺牲灵活性。
 */

/** 组合参数中的一个分项 */
export type ParamPart = {
  key: string
  label: string
  options: string[]
}

/** 单个参数定义 */
export type ParamDef = {
  group: string
  label: string
  /** 单选值（与 parts 二选一） */
  options?: string[]
  /** 组合值（如尺寸 + 分辨率） */
  parts?: ParamPart[]
  /** 手动填写时的示例 */
  placeholder?: string
}

export type ParamCatalog = {
  label: string
  params: ParamDef[]
}

const SIZE_OPTIONS = ['24.5 英寸', '26.5 英寸', '27 英寸', '31.5 英寸', '34 英寸', '49 英寸']
const RESOLUTION_OPTIONS = ['1920×1080', '2560×1440', '3440×1440', '3840×2160', '5120×1440']
const REFRESH_OPTIONS = ['60 Hz', '120 Hz', '144 Hz', '165 Hz', '180 Hz', '240 Hz', '280 Hz', '330 Hz', '360 Hz', '480 Hz', '540 Hz', '720 Hz']
const RESPONSE_OPTIONS = ['0.03 ms (GTG)', '0.1 ms (GTG)', '0.5 ms (GTG)', '1 ms (GTG)', '1 ms (MPRT)', '2 ms (GTG)', '5 ms (GTG)']
const CONNECTION_OPTIONS = ['有线', '2.4G 无线', '蓝牙', '三模']

export const PRODUCT_PARAM_CATALOG: Record<string, ParamCatalog> = {
  monitor: {
    label: '显示器',
    params: [
      {
        group: '显示',
        label: '面板',
        options: ['第四代 W-OLED', '第三代 W-OLED', 'META OLED', 'QD-OLED', 'OLED', 'Fast IPS', 'IPS', 'VA', 'TN', 'Mini LED'],
      },
      {
        group: '显示',
        label: '尺寸 / 分辨率',
        parts: [
          { key: 'size', label: '尺寸', options: SIZE_OPTIONS },
          { key: 'resolution', label: '分辨率', options: RESOLUTION_OPTIONS },
        ],
        placeholder: '如 26.5 英寸 · 2560×1440',
      },
      {
        group: '显示',
        label: '刷新率',
        options: [...REFRESH_OPTIONS, '4K@165 Hz / FHD@330 Hz（双模）'],
      },
      { group: '显示', label: '响应时间', options: RESPONSE_OPTIONS },
      { group: '显示', label: '峰值亮度', options: ['250 nit', '300 nit', '400 nit', '500 nit', '1000 nit', '1500 nit'] },
      { group: '显示', label: '对比度', options: ['1000:1', '1500:1', '3000:1', '1,000,000:1', '1,500,000:1'] },
      { group: '显示', label: '色域', options: ['99% DCI-P3 · 原生 10bit', '98% DCI-P3', '95% DCI-P3', '100% sRGB'] },
      { group: '显示', label: '曲率', options: ['平面', '1500R', '1800R', '1000R'] },
      {
        group: '接口',
        label: '接口',
        options: [
          'DP 2.1 (UHBR20) · HDMI 2.1 · USB-C',
          'DP 2.1 · HDMI 2.1',
          'DP 1.4 · HDMI 2.0',
          'HDMI 2.1 × 2 · DP 1.4',
          'USB-C (DP Alt Mode)',
        ],
      },
      {
        group: '接口',
        label: '同步技术',
        options: ['G-SYNC 兼容 · FreeSync · VRR+', 'G-SYNC Compatible', 'FreeSync Premium', 'FreeSync Premium Pro', 'Adaptive-Sync'],
      },
      { group: '接口', label: 'USB Hub', options: ['USB 3.0 × 2', 'USB 3.2 × 4', '无'] },
      { group: '电源', label: '功耗', options: ['典型 38 W / 峰值 72 W', '典型 30 W / 峰值 65 W', '典型 25 W', '≤ 30 W'] },
      { group: '电源', label: '电源输入', options: ['100–240V AC', '内置电源', '外置适配器'] },
      {
        group: '机械',
        label: '支架',
        options: [
          'VESA 100×100 · 升降 130 mm · 俯仰 -5°~20°',
          'VESA 100×100 · 升降 / 旋转 / 俯仰',
          'VESA 100×100 · 升降 100 mm · 俯仰 -5°~15°',
          'VESA 75×75 · 俯仰 -5°~15°',
          '固定支架',
        ],
      },
      { group: '机械', label: '背板', options: ['CNC 阳极氧化铝 · 石墨烯散热', 'CNC 铝合金', '塑料背板'] },
      { group: '物理尺寸', label: '净重', options: ['6.5 kg（含支架）', '5.8 kg（含支架）', '4.2 kg（含支架）', '3.0 kg（不含支架）'] },
      { group: '物理尺寸', label: '尺寸', placeholder: '如 615 × 525 × 240 mm' },
      { group: '认证', label: 'HDR 认证', options: ['DisplayHDR True Black 400', 'DisplayHDR True Black 500', 'DisplayHDR 400', 'DisplayHDR 600', 'DisplayHDR 1000', '无'] },
      { group: '认证', label: '认证', options: ['CE / FCC / CCC', 'CE / FCC', 'CCC'] },
    ],
  },
  mouse: {
    label: '鼠标',
    params: [
      { group: '其他', label: '传感器', options: ['PixArt PAW3950', 'PixArt PAW3395', 'PixArt PAW3370', 'Focus Pro 30K'] },
      { group: '其他', label: 'DPI', options: ['800', '1600', '3200', '6400', '12000', '26000', '30000', '42000'] },
      { group: '其他', label: '回报率', options: ['125 Hz', '500 Hz', '1000 Hz', '2000 Hz', '4000 Hz', '8000 Hz'] },
      { group: '其他', label: '按键数', options: ['5', '6', '7', '8', '9'] },
      { group: '其他', label: '连接方式', options: CONNECTION_OPTIONS },
      { group: '其他', label: '续航', options: ['40 小时', '70 小时', '100 小时', '120 小时'] },
      { group: '机械', label: '材质', options: ['ABS', '磨砂塑料', '镁合金', '碳纤维'] },
      { group: '物理尺寸', label: '尺寸', placeholder: '如 125 × 64 × 40 mm' },
      { group: '物理尺寸', label: '重量', options: ['45 g', '55 g', '60 g', '70 g', '80 g', '90 g'] },
    ],
  },
  keyboard: {
    label: '键盘',
    params: [
      { group: '其他', label: '轴体', options: ['磁轴', '光轴', '机械红轴', '机械茶轴', '机械青轴', '静电容'] },
      { group: '其他', label: '连接方式', options: CONNECTION_OPTIONS },
      { group: '其他', label: '回报率', options: ['1000 Hz', '2000 Hz', '4000 Hz', '8000 Hz'] },
      { group: '其他', label: '键位数', options: ['61', '68', '75', '87', '98', '104'] },
      { group: '其他', label: '背光', options: ['RGB', '单色白光', '无'] },
      { group: '其他', label: '续航', options: ['40 小时', '70 小时', '100 小时', '120 小时'] },
      { group: '机械', label: '键帽材质', options: ['PBT', 'ABS', '铝合金'] },
      { group: '物理尺寸', label: '尺寸', placeholder: '如 355 × 140 × 40 mm' },
      { group: '物理尺寸', label: '重量', placeholder: '如 850 g' },
    ],
  },
  headset: {
    label: '耳机',
    params: [
      { group: '其他', label: '单元', options: ['40 mm', '50 mm', '53 mm'] },
      { group: '其他', label: '阻抗', options: ['16 Ω', '32 Ω', '64 Ω'] },
      { group: '其他', label: '频响', options: ['20 Hz–20 kHz', '10 Hz–40 kHz'] },
      { group: '其他', label: '连接方式', options: ['有线 3.5mm', 'USB', '2.4G 无线', '蓝牙', '三模'] },
      { group: '其他', label: '麦克风', options: ['可拆卸降噪', '伸缩降噪', '无'] },
      { group: '其他', label: '续航', options: ['30 小时', '50 小时', '80 小时'] },
      { group: '机械', label: '材质', options: ['ABS', '铝合金', '记忆海绵'] },
      { group: '物理尺寸', label: '重量', options: ['250 g', '300 g', '350 g'] },
    ],
  },
  pad: {
    label: '鼠标垫 / 周边',
    params: [
      { group: '其他', label: '表面材质', options: ['布面', '树脂', '玻璃', '金属'] },
      { group: '其他', label: '包边', options: ['锁边', '无包边'] },
      { group: '其他', label: '防滑', options: ['天然橡胶', '硅胶', 'PU'] },
      { group: '其他', label: '承重', options: ['3 kg', '5 kg', '9 kg', '15 kg'] },
      { group: '其他', label: '升降范围', options: ['0–130 mm', '0–200 mm', '0–300 mm'] },
      { group: '机械', label: '材质', options: ['铝合金', '钢', '塑料'] },
      { group: '机械', label: '安装方式', options: ['桌夹', '穿孔', '壁挂'] },
      { group: '物理尺寸', label: '尺寸', options: ['900×400 mm', '800×300 mm', '450×400 mm', '360×300 mm'], placeholder: '也可手动填写' },
      { group: '物理尺寸', label: '厚度', options: ['2 mm', '3 mm', '4 mm', '5 mm'] },
      { group: '物理尺寸', label: '重量', placeholder: '如 350 g' },
    ],
  },
}

/** 参数分组固定顺序（新增自定义参数时也用这一组） */
export const PARAM_GROUPS = ['显示', '接口', '电源', '机械', '物理尺寸', '包装', '认证', '其他']

/** 取某设备形态的参数目录；未知形态回退显示器（产品以显示器为主） */
export function paramCatalogOf(variant: unknown): ParamCatalog {
  const key = typeof variant === 'string' ? variant : ''
  return PRODUCT_PARAM_CATALOG[key] ?? PRODUCT_PARAM_CATALOG.monitor
}
