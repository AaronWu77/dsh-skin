---
kind: package-reference
description: "为定制 RC2 Host 提供可选的 AW/STUDIO 品牌及极光玻璃与墨色外观。"
---
# dsh-skin

[English](README.md) | 中文

## 概述

可撤销的浏览器皮肤插件，提供 AW/STUDIO 品牌、极光配色、玻璃表面和易读的墨色代码卡。不修改模型、工具、鉴权、权限、Session 数据或会话首页图案。

## 安装

运行 `pnpm install --frozen-lockfile` 和 `pnpm run build` 构建。作为 profile bundle 安装，不修改上游 bundle。首次迁移 Host 请遵循 [DEPLOY.md](DEPLOY.md) 中的停服步骤；直接加载到旧定制 Host 会产生重复样式及不同的品牌尺寸。

本包面向带配套 Host 迁移的 DSH `0.2.1-rc.2`。原版 RC2 有品牌插槽和主题 token，但缺少部分组件选择器，因此不承诺在原版上完全还原。选择器要求由 [style-contract.spec.ts](tests/style-contract.spec.ts) 覆盖。

## 所有权与卸载

浏览器入口持有一个 `style[data-dsh-skin-style]` 节点、`html[data-dsh-skin="aaron"]` 标记和两个优先级为 -100 的侧栏品牌插槽贡献。禁用时清除资源；若其他所有者未更改标记，则恢复原值。重复加载会失败，不会堆积 CSS。同优先级的其他品牌会冲突，请禁用或调整优先级。

规则使用语义 token 和属性，不依赖 CSS Modules hash、复制的上游组件、DOM 类名发现或逐消息观察器。原生拖拽区、底部布局、浮层安全、滚动条、浮动面板折叠和全屏几何仍由 Host 持有。

## 开发与热更新

安装后运行 `pnpm run watch` 构建浏览器 bundle；运行中的 Web HMR 接收器随后替换插件，无需重启 Host 或刷新页面。仅保存源码而没有成功构建不会更新界面。插件自己的 React 状态可能重置。Host shell 或静态包修改仍需要构建并刷新页面，有时需要重启。

## 模型体验

不增加提示词、工具、事件、token 统计或模型可见数据。模型 token 消耗与 KV-cache 输入不变。

## 验证

- `pnpm run typecheck`：严格检查产品和测试类型。
- `pnpm test`：发布版 SlotRegistry 生命周期、声明时序、反复清理、CSS 作用域、级联及渲染安全。
- `pnpm run build && pnpm run lint`：独立浏览器工厂和发布内容检查。
- `pnpm run test:browser`：在系统分配端口启动无真实密钥的全新 Web profile，通过正式 CLI 安装，验证启停清理及源码 watch 到浏览器更新。用 `DSH_HOST_PATH` 指定已构建的配套 Host；`DSH_BROWSER_CHANNEL` 默认为 `chrome`。不使用活动 home 或 3080 端口。诊断保留在忽略的 `.local/`。

## 已知限制与后续工作

AppFrame 结构包裹、原生顶栏集成、浮层功能修复、ToolRow 展开状态和 StateDot 仍属于配套 Host 改动。禁用后恢复该定制 Host 的中性布局，不是逐字等同于上游应用。原生 macOS/Windows 顶栏及全部第三方插件组合需单独验收。后续 Host 可能改变 token 或选择器；声明兼容前须重跑组合和浏览器验证。
