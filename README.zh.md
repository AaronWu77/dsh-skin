---
kind: package-bundle
description: "为定制 rc4 宿主提供可选的 AW/STUDIO 品牌及极光玻璃与墨色外观。"
---
# dsh-skin

[English](README.md) | 中文

<a id="plugin-information"></a>
## 插件信息

应用可撤销的 AW/STUDIO 品牌、Aurora 配色与玻璃质感界面。

| 字段 | 内容 |
|---|---|
| 包名 | `dsh-skin` |
| 当前 checkout 版本 | `0.1.2-rc4.7` |
| 维护仓库 | [AaronWu77/dsh-skin](https://github.com/AaronWu77/dsh-skin) |
| 包许可证 | MIT |

包身份、许可证和上游声明以 [package.json](package.json) 为准。checkout 版本不代表已发布版本或经过验证的兼容性；下文已有的验证范围与部署限制仍然适用。

<a id="source-and-attribution"></a>
## 来源与归属

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — 基于上游改造; MIT; 未记录精确上游基准。 将定制展示样式提取为可撤销的品牌与外观插件。 [详细记录](https://github.com/AaronWu77/dsh-skin/blob/HEAD/THIRD_PARTY_NOTICES.md)。

维护中的 fork 与上游项目属于不同仓库。原作者、版权、许可证与通知声明继续保留；缺失的上游基准不根据本地版本推断。

## 概述

可撤销的浏览器皮肤插件，提供 AW/STUDIO 品牌、极光配色、玻璃表面、易读的墨色代码卡及脉冲运行指示器。不修改模型、工具、鉴权、权限、Session 数据或会话首页图案。

Host 提供 `dsh-skin` 设置时，设置中的 **AW Studio** 页面可控制配色、指针轨迹和轨迹强度。设置控件接受 0.2 到 1 之间的有限轨迹强度。已有的无效值会保留；外观使用 0.62，并提供显式修复操作。Host schema 仍保持宽松，因此直接调用设置 API 仍可能写入无效数值。控件显示 Host 最近接受的值。写入被拒绝时可重试；写入结果无法确认时，控件会停用，直到刷新页面以核对结果。该行在设置导航中使用星形图标。

## 安装

在本包目录运行 `pnpm install --no-frozen-lockfile --ignore-scripts` 和 `pnpm run build` 构建。在获准的更新窗口内作为 profile bundle 部署；见 [DEPLOY.md](DEPLOY.md)。

完整极光玻璃依赖带配套皮肤标记的 DSH `0.2.2-rc.4` 宿主。没有标记的 rc4 保留宿主外框几何、静态极光和现有插槽及组件属性可覆盖的样式，不会显示全部玻璃效果。

## 所有权与卸载

浏览器入口持有一个 `style[data-dsh-skin-style]` 节点、`html[data-dsh-skin="aaron"]` 标记和两项优先级为 -100 的侧栏品牌贡献。设置导航贡献跟随宿主提供的命名空间及插槽声明。禁用入口会移除其样式表与贡献；若其他所有者未更改标记，则恢复原值。重复加载会失败，不叠加第二份样式。

规则使用语义属性，不依赖 CSS Modules 哈希。rc4 下皮肤在同一个图标盒中用圆点替换鲸尾遮罩和 SVG；减少动态效果时圆点不脉冲，强制颜色模式使用宿主图标。Chat 保留时钟、本地化文本、无障碍播报及挂载生命周期。原生拖拽区和安全留白由宿主管理。

兼容旧版的 `conversation.chat.flow.running.icon` 贡献等待该插槽声明。配套 rc4 宿主改用带标记的鲸尾，不声明该插槽，因此 StateDot 贡献保持休眠。

## 窗口圆角

内嵌窗口仅在外露边缘保留圆角。侧栏完全隐藏时，中栏接管左侧圆角；右面板展开时裁剪自身右侧圆角，不裁剪固定定位的浮动面板。底部插槽内容可见时接管下方圆角；空插槽和使用 `hidden` 的内容保留列容器圆角。全屏面板保持视口几何。最外层画布保持直角且不带窗口阴影，仅内窗使用圆弧。侧栏玻璃层与列容器使用相同圆角，避免模糊层在圆弧外给画布染色。

会话标题行直接透出中栏玻璃，不叠加第二层填充。「插件」页顶部静止时采用轻薄玻璃，滚动后提高填充不透明度。减少透明度时，顶部使用不带背景模糊的不透明画布。

构建后运行 `node tests/rc4-artifact.browser.mjs`，用 rc4 DOM 层级和 AppFrame 样式检查发布产物内的 CSS。可通过 `DSH_CHROMIUM_EXECUTABLE` 指定已安装的 Chromium。夹具不连接服务，也不修改 profile。

## 开发与热更新

安装后运行 `pnpm run watch` 构建浏览器 bundle。无需刷新地替换插件，还要求 Web HMR 接收器处于活动状态，并从同一个配套 Host checkout 运行 `pnpm run dev:web` 来重建 client-plugin bundle。仅保存源码而没有成功构建不会更新界面。插件自己的 React 状态可能重置。Host shell 或静态包修改仍需要构建并刷新页面，有时需要重启。

## 模型体验

不增加提示词、工具、事件、token 统计或模型可见数据。模型 token 消耗与 KV-cache 输入不变。

## 验证

- `pnpm run typecheck`：严格检查产品和测试类型。
- 非部署 Vitest 套件检查插槽生命周期、设置、样式作用域、层叠和渲染安全；通过 `DSH_SKIN_TEST_CLIENT` 为设置集成测试指定客户端产物。
- `pnpm run build && pnpm run lint`：独立浏览器工厂和发布内容检查。
- 产物 CSS 夹具检查深浅色、分隔条对齐及有无标记的布局。夹具和包级测试均不覆盖目标 profile 或原生窗口装饰。

## 已知限制与后续工作

展开工具卡、通用模态框及 rc4 运行指示器依赖配套标记。原生 macOS 和 Windows 标题栏、右面板过渡及第三方插件组合需另做部署验收。旧工作区迁移脚本不适用于此版本。
