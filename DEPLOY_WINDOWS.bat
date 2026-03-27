@echo off
title LHS Inventory - GitHub Deploy
color 0A
echo.
echo ================================================
echo   LHS Inventory - Deploying to GitHub Pages
echo ================================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed.
    echo.
    echo Please download and install Git from:
    echo   https://git-scm.com/download/win
    echo.
    echo After installing, run this file again.
    pause
    exit /b 1
)

REM Check index.html exists
if not exist "index.html" (
    echo ERROR: index.html not found.
    echo Make sure this .bat file is in the same folder as index.html
    pause
    exit /b 1
)

echo Setting up repository...

REM Initialize git if needed
if not exist ".git" (
    git init
    git remote add origin https://TOKEN_REMOVED@github.com/LifetimeServices/lhs-inventory.git
) else (
    git remote set-url origin https://TOKEN_REMOVED@github.com/LifetimeServices/lhs-inventory.git
)

echo Uploading files to GitHub...
git add -A
git commit -m "LHS App update - %date% %time%"
git branch -M main
git push -u origin main --force

echo.
echo ================================================
echo   SUCCESS! Your app is live at:
echo   https://LifetimeServices.github.io/lhs-inventory
echo.
echo   Changes appear within 60 seconds.
echo ================================================
echo.
pause
