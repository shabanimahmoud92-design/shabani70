# Deploy shift app to tiiny.site (short URL, no shabani in domain)
$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$zip = Join-Path $env:TEMP "shift-site.zip"

$files = @(
    "index.html",
    "app.js",
    "auth.js",
    "holidays.js",
    "jalaali.js",
    "styles.css",
    ".nojekyll"
)

Compress-Archive -Path ($files | ForEach-Object { Join-Path $project $_ }) -DestinationPath $zip -Force

$response = curl.exe -s -X POST "https://ext.tiiny.host/v1/upload" `
    -H "x-email: Shabani.Mahmoud@okco.ir" `
    -F "files=@$zip"

Write-Host $response
$json = $response | ConvertFrom-Json
if ($json.success) {
    Write-Host ""
    Write-Host "Live URL: https://$($json.data.link)" -ForegroundColor Green
} else {
    Write-Host "Deploy failed: $($json.message)" -ForegroundColor Red
    exit 1
}
