# 工作区切换与重启

本文件是停服迁移步骤。不要只关闭浏览器标签；必须停止 DSH Web 服务进程。脚本不会终止进程，3080 仍在监听时会拒绝安装。

先做只读预检：

```powershell
& "D:/deepseek-harness/local-plugins/plugins/dsh-skin/scripts/install-workspace.ps1" -CheckOnly
```

主工作区必须干净，且与配套 `refactor/dsh-skin` 分支有共同历史。其他进行中的改动须先由其所有者保存；脚本不会 stash、reset 或替你提交。

停止服务后，在独立 PowerShell 窗口执行：

```powershell
& "D:/deepseek-harness/local-plugins/plugins/dsh-skin/scripts/install-workspace.ps1"
if (-not $?) { throw "Installation failed; do not start the server." }
Set-Location "D:/deepseek-harness"
pnpm dsh web --no-open
```

脚本备份现有 profile 的 manifest、锁文件和 patch，以普通 merge 保留 Host 两边已有提交（可快进时快进；冲突时停止），安装并构建 Host 与插件，再使用正式 `dsh plugin --profile web add link:...` 安装。它核对原 bundle 全部保留且皮肤只出现一次。不复制凭据、Session、Planner 数据或替换其他插件。其他部署可显式传 `-HostRoot`、`-HostMigrationRef`、`-DshHome`。

失败时停止，不执行启动命令。若 Git 报合并冲突，请先由你解决，或执行 `git merge --abort` 返回合并前；脚本不会强制覆盖。合并完成后的构建或安装失败，可使用脚本打印的精确备份目录回退：

```powershell
& "D:/deepseek-harness/local-plugins/plugins/dsh-skin/scripts/rollback-workspace.ps1" -Backup "<exact backup directory printed by installer>"
if (-not $?) { throw "Rollback failed." }
Set-Location "D:/deepseek-harness"
pnpm dsh web --no-open
```

回退恢复备份的 profile 文件，在新分支选择原 Host 提交并重建，保留迁移分支，不删除工作区或用户修改。若迁移后出现新提交或本地修改，须人工检查，脚本拒绝覆盖。

首次迁移需要构建和重启。之后只修改皮肤时，在插件目录运行 `pnpm run watch`，构建成功后由 Web HMR 自动替换；插件自己的临时 React 状态可能重置。
