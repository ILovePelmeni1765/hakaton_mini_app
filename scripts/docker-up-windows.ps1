param(
  [switch]$Detached
)

$ErrorActionPreference = 'Stop'
$source = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$tempRoot = [System.IO.Path]::GetTempPath().TrimEnd('\')
$context = Join-Path $tempRoot ("city-pulse-docker-" + [Guid]::NewGuid().ToString('N'))

$excludedDirectories = @(
  (Join-Path $source '.git'),
  (Join-Path $source '.pnpm-store'),
  (Join-Path $source 'node_modules'),
  (Join-Path $source 'apps\server\node_modules'),
  (Join-Path $source 'apps\web\node_modules'),
  (Join-Path $source 'apps\server\dist'),
  (Join-Path $source 'apps\web\dist'),
  (Join-Path $source 'apps\server\uploads'),
  (Join-Path $source 'apps\web\test-results'),
  (Join-Path $source 'apps\web\playwright-report'),
  (Join-Path $source 'packages\shared\dist'),
  (Join-Path $source 'packages\platform\dist'),
  (Join-Path $source 'packages\ui\dist')
)

New-Item -ItemType Directory -Path $context | Out-Null

try {
  $copyArguments = @($source, $context, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NC', '/NS', '/NP', '/XD') +
    $excludedDirectories + @('/XF', '.env', '.env.local')
  & robocopy @copyArguments | Out-Null
  if ($LASTEXITCODE -gt 7) {
    throw "Robocopy failed with exit code $LASTEXITCODE"
  }

  Push-Location $context
  try {
    $composeArguments = @('compose', 'up', '--build')
    if ($Detached) {
      $composeArguments += '-d'
    }
    & docker @composeArguments
    if ($LASTEXITCODE -ne 0) {
      throw "Docker Compose failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
} finally {
  $resolvedTemp = [System.IO.Path]::GetFullPath($tempRoot).TrimEnd('\') + '\'
  $resolvedContext = [System.IO.Path]::GetFullPath($context)
  if ($resolvedContext.StartsWith($resolvedTemp, [StringComparison]::OrdinalIgnoreCase) -and
      (Split-Path $resolvedContext -Leaf).StartsWith('city-pulse-docker-', [StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $resolvedContext -Recurse -Force -ErrorAction SilentlyContinue
  }
}
