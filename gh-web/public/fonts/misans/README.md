# MiSans VF（自托管）

本站中文字体采用 **MiSans 可变字体（Variable Font）**，自托管于本目录，不依赖第三方 CDN。

## 来源与版本

- 包 / 版本：`misans@5.0.0`（npm，取自 jsDelivr）
- 目录：`lib/Normal/`（Normal = 简体中文 SC）
- 字体：`MiSansVF`（可变字体，`font-weight: 150 700`）
- 许可：**Apache License 2.0**，全文见同目录 `LICENSE.txt`

## 分片机制

- 共 **56 个 woff2 分片**，总大小约 **4.5 MB**。
- 每个分片对应 `MiSansVF.min.css` 里一条 `@font-face`，带 `unicode-range` 声明其覆盖的字符区间。
- 浏览器按页面实际出现的字符，**只下载命中的分片**（未用到的分片不会请求），因此首屏通常只加载少数几片。
- CSS 中的 `src` 是同目录**相对路径**（如 `url('MiSansVF.<hash>.0.woff2')`），故本目录内文件名与引用关系必须保持原样，迁移/改名会破坏引用。
- 使用 `font-display: swap`，字体未就绪时先用回退字体渲染，避免文字不可见。

## 如何补字 / 升级

- **升级**：重新从 `https://cdn.jsdelivr.net/npm/misans@<新版本>/lib/Normal/` 下载 `MiSansVF.min.css` 与全部 `*woff2` 覆盖本目录即可（文件名带内容 hash，无需手动改名；若 hash 变化，注意同步 `index.html` 中的 preload 引用）。
- **补字**：换用包含更多字符的 `misans` 版本 / 子集重下；若需自定义子集，请用 `pyftsubset` 等工具按 `unicode-range` 规则重新切片，保持「一 CSS + 多 woff2 + 相对路径」的结构不变。

## 接入位置

- CSS 引入：`gh-web/index.html` 的 `<link rel="stylesheet" href="/fonts/misans/MiSansVF.min.css" />`
- 字体栈：`gh-web/src/styles/tokens.css` 的 `--gh-font-sans` 首位已加入 `"MiSans VF"`。
