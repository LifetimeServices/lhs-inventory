# LHS Inventory - GitHub Deploy Script
# Run this in PowerShell to push updates live

$GITHUB_TOKEN = "TOKEN_REMOVED"
$GITHUB_USER  = "LifetimeServices"
$REPO_NAME    = "lhs-inventory"
$REMOTE_URL   = "https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"
$LIVE_URL     = "https://${GITHUB_USER}.github.io/${REPO_NAME}"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  LHS Inventory - Deploying to GitHub Pages" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check git
try { git --version | Out-Null }
catch {
    Write-Host "ERROR: Git not installed." -ForegroundColor Red
    Write-Host "Download from: https://git-scm.com/download/win"
    Read-Host "Press Enter to exit"
    exit 1
}

# Check index.html
if (-not (Test-Path "index.html")) {
    Write-Host "ERROR: index.html not found in current folder." -ForegroundColor Red
    Write-Host "Run this script from the lhs-inventory folder."
    Read-Host "Press Enter to exit"
    exit 1
}

# Init or update remote
if (-not (Test-Path ".git")) {
    Write-Host "Initializing repository..." -ForegroundColor Yellow
    git init
    git remote add origin $REMOTE_URL
} else {
    git remote set-url origin $REMOTE_URL
}

# Configure git identity (required for commits)
git config user.email "deploy@lifetimehomeservices.com"
git config user.name "LHS Deploy"

# Stage, commit, push
Write-Host "Uploading to GitHub..." -ForegroundColor Yellow
git add -A
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -m "LHS App update - $timestamp"
git branch -M main
git push -u origin main --force

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  SUCCESS! Live at:" -ForegroundColor Green
Write-Host "  $LIVE_URL" -ForegroundColor White
Write-Host ""
Write-Host "  Refresh in ~60 seconds to see changes." -ForegroundColor Gray
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to close"
