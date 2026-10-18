param(
  [string]$HostRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path,
  [string]$HostMigrationRef = 'refactor/dsh-skin',
  [string]$DshHome = $(if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }),
  [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
function Invoke-Checked {
  param([string]$Command, [string[]]$Arguments)
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) { throw ('Command failed: ' + $Command + ' ' + ($Arguments -join ' ')) }
}
$HostRoot = (Resolve-Path -LiteralPath $HostRoot).Path
$PluginRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$ProfileRoot = Join-Path $DshHome 'profiles/web'
if (!(Test-Path -LiteralPath (Join-Path $ProfileRoot 'package.json'))) { throw 'Existing web profile not found; pass -DshHome explicitly.' }
$dirty = @(git -C $HostRoot status --porcelain)
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect Host Git status' }
if ($dirty.Count) { throw 'Host has local edits; preserve them before migration. No files were changed.' }
$oldHead = (git -C $HostRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve Host HEAD' }
$newHead = (git -C $HostRoot rev-parse --verify ($HostMigrationRef + '^{commit}')).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Companion Host migration ref is missing.' }
$common = git -C $HostRoot merge-base $oldHead $newHead
if ($LASTEXITCODE -ne 0 -or !$common) { throw 'Host migration has no common history with this checkout.' }
Write-Output ('Host: ' + $HostRoot)
Write-Output ('Skin: ' + $PluginRoot)
Write-Output ('Profile: ' + $ProfileRoot)
Write-Output ('Migration: ' + $oldHead + ' -> ' + $newHead)
if ($CheckOnly) { Write-Output 'Preflight passed; nothing changed.'; return }
if (@(Get-NetTCPConnection -State Listen -LocalPort 3080 -ErrorAction SilentlyContinue).Count) { throw 'Stop the current Web server first. This script never terminates it.' }
$backup = Join-Path $DshHome ('backups/skin-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $backup | Out-Null
foreach ($name in @('package.json','pnpm-lock.yaml','pnpm-workspace.yaml','cordis.yml','cordis.patch.yml')) {
  $source = Join-Path $ProfileRoot $name
  if (Test-Path -LiteralPath $source -PathType Leaf) { Copy-Item -LiteralPath $source -Destination (Join-Path $backup $name) }
}
$record = @{ hostRoot=$HostRoot; profileRoot=$ProfileRoot; oldHead=$oldHead; migratedHead=$null }
$record | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $backup 'migration.json') -Encoding utf8
Write-Output ('Rollback backup: ' + $backup)
$before = Get-Content -Raw -Encoding utf8 -LiteralPath (Join-Path $ProfileRoot 'package.json') | ConvertFrom-Json
try {
  Invoke-Checked -Command git -Arguments @('-C', $HostRoot, 'merge', '--no-edit', $newHead)
  $record.migratedHead = (git -C $HostRoot rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect merged Host revision.' }
  $record | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $backup 'migration.json') -Encoding utf8
  Push-Location $HostRoot
  try {
    Invoke-Checked -Command pnpm -Arguments @('install','--frozen-lockfile')
    Invoke-Checked -Command pnpm -Arguments @('run','build')
  } finally { Pop-Location }
  Push-Location $PluginRoot
  try {
    Invoke-Checked -Command pnpm -Arguments @('install','--frozen-lockfile')
    Invoke-Checked -Command pnpm -Arguments @('run','build')
  } finally { Pop-Location }
  Push-Location $HostRoot
  try {
    $oldHome = $env:DSH_HOME
    $env:DSH_HOME = $DshHome
    try { Invoke-Checked -Command pnpm -Arguments @('dsh','plugin','--profile','web','add',('link:' + $PluginRoot.Replace('\','/'))) }
    finally { $env:DSH_HOME = $oldHome }
  } finally { Pop-Location }
  $after = Get-Content -Raw -Encoding utf8 -LiteralPath (Join-Path $ProfileRoot 'package.json') | ConvertFrom-Json
  foreach ($bundle in @($before.dsh.profile.bundles)) { if (@($after.dsh.profile.bundles) -notcontains $bundle) { throw ('Original bundle lost: ' + $bundle) } }
  if (@($after.dsh.profile.bundles | Where-Object { $_ -eq 'dsh-skin' }).Count -ne 1) { throw 'dsh-skin must occur exactly once in the web profile.' }
  Write-Output 'Migration installed. Start from the Host directory with: pnpm dsh web --no-open'
} catch {
  Write-Warning ('Migration stopped; do not start until repaired. Backup: ' + $backup)
  Write-Warning 'If Git reported a merge conflict, resolve it or run git merge --abort before any rebuild. No hard reset is performed.'
  Write-Warning ('Rollback: & ' + (Join-Path $PSScriptRoot 'rollback-workspace.ps1') + ' -Backup "' + $backup + '"')
  throw
}
