$authFile1 = "$env:APPDATA\vercel\auth.json"
$authFile2 = "$env:LOCALAPPDATA\vercel\auth.json"

$token = $null
if (Test-Path $authFile1) {
  $token = (Get-Content $authFile1 | ConvertFrom-Json).token
} elseif (Test-Path $authFile2) {
  $token = (Get-Content $authFile2 | ConvertFrom-Json).token
}

if (-not $token) {
  Write-Host "Token nao encontrado. Locais verificados:"
  Write-Host $authFile1
  Write-Host $authFile2
  exit 1
}

Write-Host "Token encontrado: $($token.Substring(0,8))..."

# Get project info
$project = vercel project ls 2>&1 | Out-Null
$projectId = (vercel inspect fleet-gaey9ab5l-joaogabriel0320s-projects.vercel.app 2>&1 | Select-String 'ID:').ToString().Trim()
Write-Host "Project info: $projectId"

# Use Vercel API to add env vars for preview
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type"  = "application/json"
}

$envVars = @(
  @{ key = "NEXT_PUBLIC_SUPABASE_URL";   value = "https://klczprswtgubwopppjpo.supabase.co"; target = @("preview","production") },
  @{ key = "NEXT_PUBLIC_SUPABASE_ANON_KEY"; value = "sb_publishable_yj0cf318ncSKnYz54xwMpw_ryj1Hj_c"; target = @("preview","production") },
  @{ key = "SUPABASE_SERVICE_ROLE_KEY"; value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsY3pwcnN3dGd1YndvcHBwanBvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQxMzQyMCwiZXhwIjoyMDg3OTg5NDIwfQ.iV59qn_GEp5BobGwVBvylB3ydQ0oPwVm_A7L4ABLlKs"; target = @("preview","production") },
  @{ key = "ADMIN_PASSWORD"; value = "fleet@ti2026"; target = @("preview","production") }
)

# Get project ID from Vercel API
$projectsResponse = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/fleet_app" -Headers $headers -Method GET
$projectId = $projectsResponse.id
Write-Host "Project ID: $projectId"

foreach ($env in $envVars) {
  $body = @{
    key    = $env.key
    value  = $env.value
    type   = "plain"
    target = $env.target
  } | ConvertTo-Json

  try {
    $response = Invoke-RestMethod -Uri "https://api.vercel.com/v10/projects/$projectId/env" `
      -Headers $headers -Method POST -Body $body
    Write-Host "✓ $($env.key) adicionado (id: $($response.id))"
  } catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($err.error.code -eq 'ENV_ALREADY_EXISTS') {
      Write-Host "~ $($env.key) ja existe, atualizando..."
      # List env vars to find ID
      $envList = Invoke-RestMethod -Uri "https://api.vercel.com/v10/projects/$projectId/env" -Headers $headers -Method GET
      $existing = $envList.envs | Where-Object { $_.key -eq $env.key -and $_.target -contains "preview" }
      if ($existing) {
        $patchBody = @{ value = $env.value } | ConvertTo-Json
        Invoke-RestMethod -Uri "https://api.vercel.com/v10/projects/$projectId/env/$($existing[0].id)" `
          -Headers $headers -Method PATCH -Body $patchBody | Out-Null
        Write-Host "✓ $($env.key) atualizado"
      }
    } else {
      Write-Host "✗ Erro em $($env.key): $($err.error.message)"
    }
  }
}

Write-Host "`nPronto! Redeploy o PR para testar."
