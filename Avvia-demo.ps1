$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$demoNode = Get-Command node -ErrorAction SilentlyContinue
$demoNodePath = if ($demoNode) { $demoNode.Source } else { $null }
if (-not $demoNode) {
  $bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
  if (Test-Path -LiteralPath $bundledNode) { $demoNodePath = $bundledNode }
  else { throw 'Install Node.js 20.9 or newer, then run npm install and npm run dev.' }
}
if (-not (Test-Path -LiteralPath 'node_modules\next\dist\bin\next')) {
  throw 'Dependencies are missing. Run npm install in the project folder.'
}
Write-Host 'Device: http://localhost:3000 | Platform: http://localhost:2001 | Ctrl+C to stop.'
& $demoNodePath 'scripts\serve.cjs'
