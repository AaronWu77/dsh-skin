# 工作区部署与更新

本指南区分已安装工作区的日常更新与旧 Host 的首次迁移。Host 运行时修复和布局归 Host 仓库维护；个人品牌、配色与 StateDot 图案贡献归本皮肤维护。功能与卸载边界见 [README](README.zh.md)。

## 已安装工作区的更新

Host 已完成配套迁移且 Web profile 已安装本 bundle 时，不重复运行首次迁移安装器，也不需要卸载或重装其他插件。

- **只更新文档**：无需构建或重启。
- **更新 Host**：先停止服务，确认工作区干净，再合入已审查的 Host 更新并完成构建；成功后从同一 Host 目录启动，打开新登录链接并刷新页面。构建失败时不要启动。除非依赖或 profile 组合确实变化，否则不重新安装皮肤或其他插件。
- **更新皮肤**：在皮肤仓库保留本地修改并选择已审查版本；构建或依赖变化时按 [README 的安装与开发说明](README.zh.md)处理。不要把旧 feature 分支的合并步骤当成每次更新要求。

Host 与皮肤分别保留更新前版本；若本次还改动 profile，另行备份其文件。下方首次迁移回退脚本不是日常更新的通用回滚工具。

## 首次迁移旧 Host

只适用于尚未完成皮肤迁出的旧定制 Host。不要只关闭浏览器标签；必须停止 DSH Web 服务进程。脚本不会终止进程，3080 仍在监听时会拒绝安装。

主工作区必须干净且与配套迁移 ref 有共同历史。以下显式使用 `refactor/skin-running-icon` 作为包含运行图案插槽的最低迁移基线，不代表最新 Host 布局修复。已经包含该基线的 Host 不必再次迁移。安装脚本省略 `-HostMigrationRef` 时仍默认 `refactor/dsh-skin`，不能用该默认值确认运行图案插槽已具备。皮肤使用已包含运行图案贡献的已审查版本。

其他改动须先由其所有者保存；脚本不会 stash、reset 或替你提交。也可显式选择另一个干净的 `-HostRoot`，之后必须从该目录启动。

先做只读预检：

```powershell
& "D:/deepseek-harness/local-plugins/plugins/dsh-skin/scripts/install-workspace.ps1" -HostRoot "D:/deepseek-harness" -HostMigrationRef "refactor/skin-running-icon" -CheckOnly
```

预检只确认现有 Web profile、Host 工作区状态、迁移 ref 及共同历史，不修改文件，也不证明服务已停止、构建成功或插件运行正常。

停止服务后，在独立 PowerShell 窗口执行：

```powershell
& "D:/deepseek-harness/local-plugins/plugins/dsh-skin/scripts/install-workspace.ps1" -HostRoot "D:/deepseek-harness" -HostMigrationRef "refactor/skin-running-icon"
if (-not $?) { throw "Installation failed; do not start the server." }
Set-Location "D:/deepseek-harness"
pnpm dsh web --no-open
```

脚本备份现有 profile 的 manifest、锁文件和 patch，以普通 merge 保留 Host 两边已有提交（可快进时快进；冲突时停止），安装并构建 Host 与插件，再使用正式 `dsh plugin --profile web add link:...` 安装。它核对原 bundle 全部保留且皮肤只出现一次。不复制凭据、Session、Planner 数据或替换其他插件。其他部署可显式传 `-HostRoot`、`-HostMigrationRef`、`-DshHome`。

## 验收

皮肤启用时显示个人品牌、外观与 StateDot；禁用或卸载后恢复官方品牌回退、中性外观和鲸尾，计时与本地化文本不重置。Host 的收起背景、全屏覆盖、原生拖拽区、底部布局、滚动和独立浮窗行为均不依赖皮肤。原生桌面及未测的第三方插件组合仍需单独验收。

## 首次迁移失败与回退

失败时停止，不执行启动命令。若 Git 报合并冲突，请先由你解决，或执行 `git merge --abort` 返回合并前；脚本不会强制覆盖。合并完成后的构建或安装失败，可使用脚本打印的精确备份目录回退：

```powershell
& "D:/deepseek-harness/local-plugins/plugins/dsh-skin/scripts/rollback-workspace.ps1" -Backup "<exact backup directory printed by installer>"
if (-not $?) { throw "Rollback failed." }
Set-Location "D:/deepseek-harness"
pnpm dsh web --no-open
```

回退在新分支选择原 Host 提交并重建，覆盖恢复备份中存在的 profile 文件，保留迁移分支，不删除工作区或用户修改。它不恢复皮肤仓库版本，也不清除备份中原本没有的新增文件，不是完整环境快照。若迁移后出现新提交或本地修改，须人工检查，脚本拒绝覆盖。

## 开发与热更新

以 [README 的开发与热更新条件](README.zh.md#开发与热更新)为准；仅运行皮肤 watch 不保证当前 GUI 无刷新更新。Host shell 与静态包变化仍须重新构建并刷新，必要时重启。
