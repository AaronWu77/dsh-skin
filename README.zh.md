---
kind: package-bundle
description: "为定制 RC2 Host 提供可选的 AW/STUDIO 品牌及极光玻璃与墨色外观。"
---
# dsh-skin

[English](README.md) | 中文

## 概述

可撤销的浏览器皮肤插件，提供 AW/STUDIO 品牌、极光配色、玻璃表面、易读的墨色代码卡及共享 StateDot 运行图标。不修改模型、工具、鉴权、权限、Session 数据或会话首页图案。

## 安装

运行 `pnpm install --frozen-lockfile --ignore-scripts` 和 `pnpm run build` 构建。作为 profile bundle 安装，不修改上游 bundle。首次迁移 Host 请遵循 [DEPLOY.md](DEPLOY.md) 中的停服步骤；直接加载到旧定制 Host 会产生重复样式及不同的品牌尺寸。Host 已迁移且已安装本 bundle 时，使用该文档的日常更新说明；不要重复运行首次迁移安装器或重装其他插件。

本包面向带配套 Host 迁移的 DSH `0.2.1-rc.2`。原版 RC2 有品牌插槽和主题 token，但缺少部分组件选择器，因此不承诺在原版上完全还原。选择器要求由 [style-contract.spec.ts](tests/style-contract.spec.ts) 覆盖。

## 所有权与卸载

浏览器入口持有一个 `style[data-dsh-skin-style]` 节点、`html[data-dsh-skin="aaron"]` 标记、两个侧栏品牌插槽贡献及一个 `conversation.chat.flow.running.icon` 贡献，优先级均为 -100。运行图标注入独立于品牌声明；等待 Host 声明，并随声明消失或重建而清理或重新注册。禁用时清除资源，恢复 Host 优先级为 100 的官方鲸鱼；若其他所有者未更改标记，则恢复原值。重复加载会失败，不会堆积 CSS。同一个 single 插槽中同优先级的其他贡献会冲突，请禁用或调整优先级。

规则使用语义 token 和属性，不依赖 CSS Modules hash、复制的上游组件、DOM 类名发现或逐消息观察器。图标返回 Host 共享的 `StateDot`，传入 `state="ongoing"` 及所有者提供的 `className`；该类保留随内容字号变化的宽高，插槽作用域规则让图标继承文字颜色。不增加时钟、状态 Hook、观察器或手工 DOM。Chat 仍持有运行状态、计时、本地化文本、无障碍播报及挂载生命周期。共享旋转动画和减少动态效果行为仍由 ui-primitives 提供。原生拖拽区、底部布局、浮层安全、滚动条、浮动面板折叠和全屏几何仍由 Host 持有。

npm 发布版 RC2 ui-chat 没有声明这个定制 Host 插槽，因此 [companion-host.ts](src/client/companion-host.ts) 仅镜像其精确的纯类型 `SlotMap` 成员：`{ kind: 'single'; scope: 'session'; owner: { readonly className: string | undefined } }`。它不创建运行时声明、不导入庞大的 Chat 实现，也不使用不安全的注册类型断言。镜像必须与配套 Host 保持一致；[companion-host-types.ts](tests/companion-host-types.ts) 验证两份声明可合并且所有者类型精确。ui-primitives 是固定版本的构建依赖，也是由 Host 提供的浏览器 external，不会把私有旋转器副本打包进去。

## 开发与热更新

安装后运行 `pnpm run watch` 构建浏览器 bundle。无需刷新地替换插件，还要求 Web HMR 接收器处于活动状态，并从同一个配套 Host checkout 运行 `pnpm run dev:web` 来重建 client-plugin bundle。仅保存源码而没有成功构建不会更新界面。插件自己的 React 状态可能重置。Host shell 或静态包修改仍需要构建并刷新页面，有时需要重启。

## 模型体验

不增加提示词、工具、事件、token 统计或模型可见数据。模型 token 消耗与 KV-cache 输入不变。

## 验证

- `pnpm run typecheck`：严格检查产品和测试类型。
- `pnpm test`：真实发布版 SlotRegistry 生命周期、延迟声明、声明消失与重建、品牌独立性、默认优先级与回退、反复清理、CSS 作用域、级联及渲染安全。仅模拟 Host external StateDot 来验证委托；真实原子组件与浏览器组合由配套 Host 验收。
- `pnpm run build && pnpm run lint`：独立浏览器工厂和发布内容检查。
- `pnpm run test:browser`：在系统分配端口启动无真实密钥的全新 Web profile，通过正式 CLI 安装，验证启停清理及源码 watch 到浏览器更新。用 `DSH_HOST_PATH` 指定已构建的配套 Host；`DSH_BROWSER_CHANNEL` 默认为 `chrome`。不使用活动 home 或 3080 端口。诊断保留在忽略的 `.local/`。

## 已知限制与后续工作

AppFrame 结构包裹、原生顶栏集成、浮层功能修复、ToolRow 展开状态及运行图标插槽和默认鲸鱼仍属于配套 Host 改动。原版 RC2 没有运行图标声明，此贡献在那里保持休眠。禁用后恢复该定制 Host 的中性布局，不是逐字等同于上游应用。原生 macOS/Windows 顶栏及全部第三方插件组合需单独验收。后续 Host 可能改变 token 或选择器；声明兼容前须重跑组合和浏览器验证。
