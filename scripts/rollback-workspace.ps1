param([Parameter(Mandatory=$true)][string]$Backup)
$ErrorActionPreference = 'Stop'
if (@(Get-NetTCPConnection -State Listen -LocalPort 3080 -ErrorAction SilentlyContinue).Count) { throw 'Stop the Web server before rollback.' }
$Backup = (Resolve-Path -LiteralPath $Backup).Path
$record = Get-Content -Raw -Encoding utf8 -LiteralPath (Join-Path $Backup 'migration.json') | ConvertFrom-Json
$HostRoot = (Resolve-Path -LiteralPath $record.hostRoot).Path
$ProfileRoot = (Resolve-Path -LiteralPath $record.profileRoot).Path
$dirty = @(git -C $HostRoot status --porcelain)
if ($LASTEXITCODE -ne 0 -or $dirty.Count) { throw 'Host has local edits; preserve them before rollback.' }
$currentHead = (git -C $HostRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $currentHead -ne $record.migratedHead) { throw 'Host changed after migration; inspect history before rollback.' }
# Preserve both histories; never reset or delete a user revision.
git -C $HostRoot switch -c ('rollback/skin-' + [guid]::NewGuid().ToString('N').Substring(0,8)) $record.oldHead
if ($LASTEXITCODE -ne 0) { throw 'Cannot select the previous Host revision.' }
foreach ($name in @('package.json','pnpm-lock.yaml','pnpm-workspace.yaml','cordis.yml','cordis.patch.yml')) {
  $source = Join-Path $Backup $name
  if (Test-Path -LiteralPath $source -PathType Leaf) { Copy-Item -LiteralPath $source -Destination (Join-Path $ProfileRoot $name) -Force }
}
Push-Location $ProfileRoot
try { pnpm install --frozen-lockfile --ignore-scripts; if ($LASTEXITCODE -ne 0) { throw 'Profile dependency restore failed.' } } finally { Pop-Location }
Push-Location $HostRoot
try {
  pnpm install --frozen-lockfile
  if ($LASTEXITCODE -ne 0) { throw 'Previous Host dependency restore failed.' }
  pnpm run build
  if ($LASTEXITCODE -ne 0) { throw 'Previous Host build failed.' }
} finally { Pop-Location }
Write-Output 'Rollback prepared. From the Host directory run: pnpm dsh web --no-open'
